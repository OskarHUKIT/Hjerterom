-- Sikre at leietaker-lenken fungerer uten innlogging: anon må kunne kalle RPC-ene.
-- (Lenken åpnes av leietaker som ikke er logget inn.)
GRANT EXECUTE ON FUNCTION public.get_listing_by_tenant_token(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_listing_by_tenant_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_tenant_handover_report(uuid, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_tenant_handover_report(uuid, jsonb) TO authenticated;
