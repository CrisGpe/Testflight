-- OTORGAR PERMISOS EXPLICITOS DE TABLAS A LOS ROLES ANON Y SERVICE_ROLE EN POSTGRES
GRANT ALL ON TABLE trabajadores TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE marcas_asistencia TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE atenciones TO anon, authenticated, service_role, postgres;

ALTER TABLE trabajadores DISABLE ROW LEVEL SECURITY;
ALTER TABLE marcas_asistencia DISABLE ROW LEVEL SECURITY;
ALTER TABLE atenciones DISABLE ROW LEVEL SECURITY;
