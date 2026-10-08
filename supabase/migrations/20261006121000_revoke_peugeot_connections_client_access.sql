-- Follow-up: JWT roles must not access peugeot_connections at all.
-- Secrets (tokens, vaulted password, otp_state) are service-role only.

revoke all on table public.peugeot_connections from anon, authenticated;
