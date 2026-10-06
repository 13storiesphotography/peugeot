-- App uses the authenticated role via the publishable key + user JWT.
-- peugeot_connections was only granted to service_role, so the UI always
-- saw "not connected" / Demo while vehicle_state (which had grants) still
-- showed the last live snapshot.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.peugeot_connections TO authenticated;

-- Required for upsert onConflict: "user_id" used by connect/persist paths.
CREATE UNIQUE INDEX IF NOT EXISTS peugeot_connections_user_id_key
  ON public.peugeot_connections (user_id);
