-- JWT clients must not access peugeot_connections (tokens/password vault).
-- Re-applies lockdown after an earlier grant_peugeot_connections_authenticated.
-- App uses service-role via peugeotConnections() helper.

revoke all on table public.peugeot_connections from anon, authenticated;
