-- Permitir lectura y escritura a las funciones y clientes en desarrollo
DROP POLICY IF EXISTS "Permitir acceso a trabajadores" ON trabajadores;
DROP POLICY IF EXISTS "Permitir acceso a marcas_asistencia" ON marcas_asistencia;
DROP POLICY IF EXISTS "Permitir acceso a atenciones" ON atenciones;

CREATE POLICY "Permitir todo trabajadores" ON trabajadores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo marcas_asistencia" ON marcas_asistencia FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo atenciones" ON atenciones FOR ALL USING (true) WITH CHECK (true);
