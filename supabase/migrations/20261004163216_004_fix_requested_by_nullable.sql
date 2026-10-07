/*
# Flag Governor — Make requested_by nullable for seed data

The scheduled_changes.requested_by column was NOT NULL DEFAULT auth.uid(),
but seed data runs without an authenticated session so auth.uid() returns NULL.
Making it nullable allows seed inserts; the app always sets it for real users.
*/
ALTER TABLE scheduled_changes ALTER COLUMN requested_by DROP NOT NULL;