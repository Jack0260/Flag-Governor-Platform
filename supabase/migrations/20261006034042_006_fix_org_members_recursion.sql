/*
# Fix infinite recursion in org_members RLS policies

## Problem
The org_members SELECT policy used a self-referencing subquery:
  org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
This queries org_members itself, which triggers its own RLS policy,
causing infinite recursion and a 500 error on every request.

The organizations SELECT policy also references org_members, which
cascades the same recursion.

## Fix
1. org_members SELECT: changed to `user_id = auth.uid()` — a user can
   always see their own membership rows. This breaks the self-reference.
2. org_members INSERT: simplified — user can insert their own row, OR
   an existing admin can insert. The admin check still uses org_members
   but now the SELECT policy no longer recurses, so the subquery is safe.
3. organizations SELECT: unchanged — it references org_members, but now
   org_members' SELECT policy is non-recursive (user_id = auth.uid()).

## Security
- RLS remains enabled on all tables.
- A user can only see membership rows for themselves.
- Admin checks for insert/update/delete still work because the
  org_members SELECT is now a simple user_id match (no recursion).
*/

-- Fix org_members SELECT policy (breaks the recursion)
DROP POLICY IF EXISTS "members_select_org" ON org_members;
CREATE POLICY "members_select_org" ON org_members FOR SELECT
TO authenticated USING (user_id = auth.uid());

-- Fix org_members INSERT policy (simplified, admin check still works)
DROP POLICY IF EXISTS "members_insert_self_or_admin" ON org_members;
CREATE POLICY "members_insert_self_or_admin" ON org_members FOR INSERT
TO authenticated WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.user_id = auth.uid() AND om.org_id = org_members.org_id AND om.role = 'admin'
  )
);

-- Fix org_members UPDATE policy
DROP POLICY IF EXISTS "members_update_admin" ON org_members;
CREATE POLICY "members_update_admin" ON org_members FOR UPDATE
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.user_id = auth.uid() AND om.org_id = org_members.org_id AND om.role = 'admin'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.user_id = auth.uid() AND om.org_id = org_members.org_id AND om.role = 'admin'
  )
);

-- Fix org_members DELETE policy
DROP POLICY IF EXISTS "members_delete_admin_or_self" ON org_members;
CREATE POLICY "members_delete_admin_or_self" ON org_members FOR DELETE
TO authenticated USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.user_id = auth.uid() AND om.org_id = org_members.org_id AND om.role = 'admin'
  )
);
