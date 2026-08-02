import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Credenciales de Supabase Cloud
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yhujydgejfjasuffyryg.supabase.co';
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlodWp5ZGdlamZqYXN1ZmZ5cnlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MjEwMTIxNTAyNH0.FRSYkvNWf1WT5-BPXgaIfaORFKimilqcjxgHoJO8sYA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

async function cargarYSubirDatosAuditados() {
  console.log('🚀 PASO 2: Cargando y subiendo datos locales auditados a Supabase Cloud...');

  const dumpDir = path.join(process.cwd(), 'dump_data');

  // Buscar archivos JSON en dump_data
  const archivos = fs.readdirSync(dumpDir).filter(f => f.endsWith('.json'));

  if (archivos.length === 0) {
    console.log('⚠️ No hay archivos JSON en dump_data/ para subir.');
    return;
  }

  for (const archivo of archivos) {
    const filePath = path.join(dumpDir, archivo);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`📄 Procesando ${archivo} (${content.length} filas auditadas)...`);

    // Si es un archivo de Agentes/Trabajadores
    if (archivo.includes('agentes')) {
      const trabajadores = content.slice(1).map(row => ({
        nickname: String(row[13] || '').trim().toLowerCase(),
        nombre: String(row[2] || 'Trabajador').trim(),
        especialidad: String(row[11] || 'Estilismo').trim(),
        sede: String(row[4] || 'RD').trim(),
        pin_hash: String(row[16] || '0000').trim(),
        activo: String(row[10] || 'Activo').trim().toLowerCase() === 'activo'
      })).filter(t => t.nickname);

      if (trabajadores.length > 0) {
        const { error } = await supabase.from('trabajadores').upsert(trabajadores, { onConflict: 'nickname' });
        if (error) console.error('Error insertando trabajadores:', error.message);
        else console.log(`✅ ${trabajadores.length} trabajadores auditados subidos a Supabase.`);
      }
    }
  }

  console.log('\n✨ Proceso de subida de datos auditados finalizado con éxito.');
}

cargarYSubirDatosAuditados();
