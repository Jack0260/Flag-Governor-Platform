/*
# Flag Governor — RLS Policies

Enables row-level security policies on all tables. All access is scoped to
authenticated users who are members of the organization that owns the row.

Membership check pattern:
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = <table>.org_id)

For child tables (flag_variants, flag_environments, etc.) membership is checked
through the parent flag's org_id.
*/

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
DROP POLICY IF EXISTS "org_select_member" ON organizations;
CREATE POLICY "org_select_member" ON organizations FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members WHERE org_members.user_id = auth.uid() AND org_members.org_id = organizations.id)
);

DROP POLICY IF EXISTS "org_insert_creator" ON organizations;
CREATE POLICY "org_insert_creator" ON organizations FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "org_update_admin" ON organizations;
CREATE POLICY "org_update_admin" ON organizations FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = organizations.id AND om.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = organizations.id AND om.role = 'admin')
);

-- ============================================================
-- ORG MEMBERS
-- ============================================================
DROP POLICY IF EXISTS "members_select_org" ON org_members;
CREATE POLICY "members_select_org" ON org_members FOR SELECT
TO authenticated USING (
  org_id IN (SELECT org_id FROM org_members om WHERE om.user_id = auth.uid())
);

DROP POLICY IF EXISTS "members_insert_self_or_admin" ON org_members;
CREATE POLICY "members_insert_self_or_admin" ON org_members FOR INSERT
TO authenticated WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.user_id = auth.uid() AND om.org_id = org_members.org_id AND om.role = 'admin'
  )
);

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

DROP POLICY IF EXISTS "members_delete_admin_or_self" ON org_members;
CREATE POLICY "members_delete_admin_or_self" ON org_members FOR DELETE
TO authenticated USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.user_id = auth.uid() AND om.org_id = org_members.org_id AND om.role = 'admin'
  )
);

-- ============================================================
-- SERVICES
-- ============================================================
DROP POLICY IF EXISTS "services_select_org" ON services;
CREATE POLICY "services_select_org" ON services FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = services.org_id)
);
DROP POLICY IF EXISTS "services_insert_org" ON services;
CREATE POLICY "services_insert_org" ON services FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = services.org_id)
);
DROP POLICY IF EXISTS "services_update_org" ON services;
CREATE POLICY "services_update_org" ON services FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = services.org_id)
) WITH CHECK (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = services.org_id)
);
DROP POLICY IF EXISTS "services_delete_org" ON services;
CREATE POLICY "services_delete_org" ON services FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = services.org_id)
);

-- ============================================================
-- ENVIRONMENTS
-- ============================================================
DROP POLICY IF EXISTS "env_select_org" ON environments;
CREATE POLICY "env_select_org" ON environments FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = environments.org_id)
);
DROP POLICY IF EXISTS "env_insert_org" ON environments;
CREATE POLICY "env_insert_org" ON environments FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = environments.org_id)
);
DROP POLICY IF EXISTS "env_update_org" ON environments;
CREATE POLICY "env_update_org" ON environments FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = environments.org_id)
) WITH CHECK (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = environments.org_id)
);
DROP POLICY IF EXISTS "env_delete_org" ON environments;
CREATE POLICY "env_delete_org" ON environments FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = environments.org_id)
);

-- ============================================================
-- FLAGS
-- ============================================================
DROP POLICY IF EXISTS "flags_select_org" ON flags;
CREATE POLICY "flags_select_org" ON flags FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = flags.org_id)
);
DROP POLICY IF EXISTS "flags_insert_org" ON flags;
CREATE POLICY "flags_insert_org" ON flags FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = flags.org_id)
);
DROP POLICY IF EXISTS "flags_update_org" ON flags;
CREATE POLICY "flags_update_org" ON flags FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = flags.org_id)
) WITH CHECK (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = flags.org_id)
);
DROP POLICY IF EXISTS "flags_delete_org" ON flags;
CREATE POLICY "flags_delete_org" ON flags FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = flags.org_id)
);

-- ============================================================
-- FLAG VARIANTS
-- ============================================================
DROP POLICY IF EXISTS "variants_select_org" ON flag_variants;
CREATE POLICY "variants_select_org" ON flag_variants FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM flags f JOIN org_members om ON om.org_id = f.org_id WHERE f.id = flag_variants.flag_id AND om.user_id = auth.uid())
);
DROP POLICY IF EXISTS "variants_insert_org" ON flag_variants;
CREATE POLICY "variants_insert_org" ON flag_variants FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM flags f JOIN org_members om ON om.org_id = f.org_id WHERE f.id = flag_variants.flag_id AND om.user_id = auth.uid())
);
DROP POLICY IF EXISTS "variants_update_org" ON flag_variants;
CREATE POLICY "variants_update_org" ON flag_variants FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM flags f JOIN org_members om ON om.org_id = f.org_id WHERE f.id = flag_variants.flag_id AND om.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM flags f JOIN org_members om ON om.org_id = f.org_id WHERE f.id = flag_variants.flag_id AND om.user_id = auth.uid())
);
DROP POLICY IF EXISTS "variants_delete_org" ON flag_variants;
CREATE POLICY "variants_delete_org" ON flag_variants FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM flags f JOIN org_members om ON om.org_id = f.org_id WHERE f.id = flag_variants.flag_id AND om.user_id = auth.uid())
);

-- ============================================================
-- FLAG ENVIRONMENTS
-- ============================================================
DROP POLICY IF EXISTS "flagenv_select_org" ON flag_environments;
CREATE POLICY "flagenv_select_org" ON flag_environments FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM flags f JOIN org_members om ON om.org_id = f.org_id WHERE f.id = flag_environments.flag_id AND om.user_id = auth.uid())
);
DROP POLICY IF EXISTS "flagenv_insert_org" ON flag_environments;
CREATE POLICY "flagenv_insert_org" ON flag_environments FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM flags f JOIN org_members om ON om.org_id = f.org_id WHERE f.id = flag_environments.flag_id AND om.user_id = auth.uid())
);
DROP POLICY IF EXISTS "flagenv_update_org" ON flag_environments;
CREATE POLICY "flagenv_update_org" ON flag_environments FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM flags f JOIN org_members om ON om.org_id = f.org_id WHERE f.id = flag_environments.flag_id AND om.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM flags f JOIN org_members om ON om.org_id = f.org_id WHERE f.id = flag_environments.flag_id AND om.user_id = auth.uid())
);
DROP POLICY IF EXISTS "flagenv_delete_org" ON flag_environments;
CREATE POLICY "flagenv_delete_org" ON flag_environments FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM flags f JOIN org_members om ON om.org_id = f.org_id WHERE f.id = flag_environments.flag_id AND om.user_id = auth.uid())
);

-- ============================================================
-- FLAG DEPENDENCIES
-- ============================================================
DROP POLICY IF EXISTS "deps_select_org" ON flag_dependencies;
CREATE POLICY "deps_select_org" ON flag_dependencies FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM flags f JOIN org_members om ON om.org_id = f.org_id WHERE f.id = flag_dependencies.flag_id AND om.user_id = auth.uid())
);
DROP POLICY IF EXISTS "deps_insert_org" ON flag_dependencies;
CREATE POLICY "deps_insert_org" ON flag_dependencies FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM flags f JOIN org_members om ON om.org_id = f.org_id WHERE f.id = flag_dependencies.flag_id AND om.user_id = auth.uid())
);
DROP POLICY IF EXISTS "deps_delete_org" ON flag_dependencies;
CREATE POLICY "deps_delete_org" ON flag_dependencies FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM flags f JOIN org_members om ON om.org_id = f.org_id WHERE f.id = flag_dependencies.flag_id AND om.user_id = auth.uid())
);

-- ============================================================
-- FLAG CONFLICTS
-- ============================================================
DROP POLICY IF EXISTS "conflicts_select_org" ON flag_conflicts;
CREATE POLICY "conflicts_select_org" ON flag_conflicts FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = flag_conflicts.org_id)
);
DROP POLICY IF EXISTS "conflicts_insert_org" ON flag_conflicts;
CREATE POLICY "conflicts_insert_org" ON flag_conflicts FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = flag_conflicts.org_id)
);
DROP POLICY IF EXISTS "conflicts_update_org" ON flag_conflicts;
CREATE POLICY "conflicts_update_org" ON flag_conflicts FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = flag_conflicts.org_id)
) WITH CHECK (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = flag_conflicts.org_id)
);
DROP POLICY IF EXISTS "conflicts_delete_org" ON flag_conflicts;
CREATE POLICY "conflicts_delete_org" ON flag_conflicts FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = flag_conflicts.org_id)
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
DROP POLICY IF EXISTS "audit_select_org" ON audit_logs;
CREATE POLICY "audit_select_org" ON audit_logs FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = audit_logs.org_id)
);
DROP POLICY IF EXISTS "audit_insert_org" ON audit_logs;
CREATE POLICY "audit_insert_org" ON audit_logs FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = audit_logs.org_id)
);
DROP POLICY IF EXISTS "audit_delete_admin" ON audit_logs;
CREATE POLICY "audit_delete_admin" ON audit_logs FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = audit_logs.org_id AND om.role = 'admin')
);

-- ============================================================
-- EXPERIMENTS
-- ============================================================
DROP POLICY IF EXISTS "exp_select_org" ON experiments;
CREATE POLICY "exp_select_org" ON experiments FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = experiments.org_id)
);
DROP POLICY IF EXISTS "exp_insert_org" ON experiments;
CREATE POLICY "exp_insert_org" ON experiments FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = experiments.org_id)
);
DROP POLICY IF EXISTS "exp_update_org" ON experiments;
CREATE POLICY "exp_update_org" ON experiments FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = experiments.org_id)
) WITH CHECK (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = experiments.org_id)
);
DROP POLICY IF EXISTS "exp_delete_org" ON experiments;
CREATE POLICY "exp_delete_org" ON experiments FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = experiments.org_id)
);

-- ============================================================
-- EXPERIMENT VARIANTS
-- ============================================================
DROP POLICY IF EXISTS "expvar_select_org" ON experiment_variants;
CREATE POLICY "expvar_select_org" ON experiment_variants FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM experiments e JOIN org_members om ON om.org_id = e.org_id WHERE e.id = experiment_variants.experiment_id AND om.user_id = auth.uid())
);
DROP POLICY IF EXISTS "expvar_insert_org" ON experiment_variants;
CREATE POLICY "expvar_insert_org" ON experiment_variants FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM experiments e JOIN org_members om ON om.org_id = e.org_id WHERE e.id = experiment_variants.experiment_id AND om.user_id = auth.uid())
);
DROP POLICY IF EXISTS "expvar_update_org" ON experiment_variants;
CREATE POLICY "expvar_update_org" ON experiment_variants FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM experiments e JOIN org_members om ON om.org_id = e.org_id WHERE e.id = experiment_variants.experiment_id AND om.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM experiments e JOIN org_members om ON om.org_id = e.org_id WHERE e.id = experiment_variants.experiment_id AND om.user_id = auth.uid())
);
DROP POLICY IF EXISTS "expvar_delete_org" ON experiment_variants;
CREATE POLICY "expvar_delete_org" ON experiment_variants FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM experiments e JOIN org_members om ON om.org_id = e.org_id WHERE e.id = experiment_variants.experiment_id AND om.user_id = auth.uid())
);

-- ============================================================
-- API KEYS
-- ============================================================
DROP POLICY IF EXISTS "apikeys_select_org" ON api_keys;
CREATE POLICY "apikeys_select_org" ON api_keys FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = api_keys.org_id)
);
DROP POLICY IF EXISTS "apikeys_insert_org" ON api_keys;
CREATE POLICY "apikeys_insert_org" ON api_keys FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = api_keys.org_id)
);
DROP POLICY IF EXISTS "apikeys_update_org" ON api_keys;
CREATE POLICY "apikeys_update_org" ON api_keys FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = api_keys.org_id)
) WITH CHECK (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = api_keys.org_id)
);
DROP POLICY IF EXISTS "apikeys_delete_org" ON api_keys;
CREATE POLICY "apikeys_delete_org" ON api_keys FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = api_keys.org_id)
);

-- ============================================================
-- SCHEDULED CHANGES
-- ============================================================
DROP POLICY IF EXISTS "sched_select_org" ON scheduled_changes;
CREATE POLICY "sched_select_org" ON scheduled_changes FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = scheduled_changes.org_id)
);
DROP POLICY IF EXISTS "sched_insert_org" ON scheduled_changes;
CREATE POLICY "sched_insert_org" ON scheduled_changes FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = scheduled_changes.org_id)
);
DROP POLICY IF EXISTS "sched_update_org" ON scheduled_changes;
CREATE POLICY "sched_update_org" ON scheduled_changes FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = scheduled_changes.org_id)
) WITH CHECK (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = scheduled_changes.org_id)
);
DROP POLICY IF EXISTS "sched_delete_org" ON scheduled_changes;
CREATE POLICY "sched_delete_org" ON scheduled_changes FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = scheduled_changes.org_id)
);

-- ============================================================
-- RISK ASSESSMENTS
-- ============================================================
DROP POLICY IF EXISTS "risk_select_org" ON risk_assessments;
CREATE POLICY "risk_select_org" ON risk_assessments FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = risk_assessments.org_id)
);
DROP POLICY IF EXISTS "risk_insert_org" ON risk_assessments;
CREATE POLICY "risk_insert_org" ON risk_assessments FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = risk_assessments.org_id)
);
DROP POLICY IF EXISTS "risk_update_org" ON risk_assessments;
CREATE POLICY "risk_update_org" ON risk_assessments FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = risk_assessments.org_id)
) WITH CHECK (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = risk_assessments.org_id)
);
DROP POLICY IF EXISTS "risk_delete_org" ON risk_assessments;
CREATE POLICY "risk_delete_org" ON risk_assessments FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = risk_assessments.org_id)
);