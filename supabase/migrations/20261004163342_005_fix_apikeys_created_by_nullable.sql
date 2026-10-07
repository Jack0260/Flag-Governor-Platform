/*
# Flag Governor — Make api_keys.created_by nullable for seed data

Same pattern as scheduled_changes.requested_by — seed data runs without
an authenticated session so auth.uid() returns NULL.
*/
ALTER TABLE api_keys ALTER COLUMN created_by DROP NOT NULL;