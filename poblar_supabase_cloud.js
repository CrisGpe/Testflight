import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Credenciales oficiales de Supabase Cloud
const SUPABASE_URL = 'https://yhujydgejfjasuffyryg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlodWp5ZGdlamZqYXN1ZmZ5cnlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2MzkwMjQsImV4cCI6MjEwMTIxNTAyNH0.FRSYkvNWf1WT5-BPXgaIfaORFKimilqcjxgHoJO8sYA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const dumpDir = path.join(process.cwd(), 'dump_data');

/**
 * Normaliza nombres de especialidades según ENUM
 */
function normalizarEspecialidad(esp) {
  if (!esp) return 'Estilismo';
  const val = String(esp).trim().toLowerCase();
  if (val.includes('cosmiat')) return 'Cosmiatría';
  if (val.includes('jefe') || val.includes('operat')) return 'Jefe Operativo';
  if (val.includes('admin')) return 'Administración';
  if (val.includes('recep')) return 'Recepción';
  return 'Estilismo';
}

/**
 * 1. Poblar Tabla TRABAJADORES desde todos los archivos *_Agentes.json
 */
async function poblarTrabajadores() {
  console.log('📌 1. Procesando y poblando tabla TRABAJADORES...');
  
  const archivosAgentes = fs.readdirSync(dumpDir).filter(f => f.toLowerCase().includes('agentes'));
  let totalTrabajadores = 0;

  for (const archivo of archivosAgentes) {
    const filePath = path.join(dumpDir, archivo);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (content.length <= 1) continue;

    // Determinar la Sede por el nombre del archivo
    let sedePorDefecto = 'RD';
    if (archivo.includes('luxury')) sedePorDefecto = 'Luxury';
    if (archivo.includes('gloss')) sedePorDefecto = 'Gloss';

    // Deduplicar trabajadores por nickname antes del upsert
    const mapUnicos = new Map();
    content.slice(1).forEach(row => {
      const dbNickname = row[13] ? String(row[13]).trim() : (row[2] ? String(row[2]).trim().split(' ')[0] : "");
      if (!dbNickname) return;
      const nickUpper = dbNickname.toUpperCase();
      if (!mapUnicos.has(nickUpper)) {
        mapUnicos.set(nickUpper, {
          nickname: nickUpper,
          nombre: row[2] ? String(row[2]).trim() : dbNickname,
          especialidad: normalizarEspecialidad(row[11]),
          sede: row[4] ? String(row[4]).trim() : sedePorDefecto,
          pin_hash: row[16] ? String(row[16]).trim() : "0000",
          dni: row[9] ? String(row[9]).trim() : null,
          celular: row[14] ? String(row[14]).trim() : null,
          activo: row[10] ? String(row[10]).trim().toLowerCase() === 'activo' : true
        });
      }
    });

    const trabajadoresBatch = Array.from(mapUnicos.values());


    if (trabajadoresBatch.length > 0) {
      const { error } = await supabase.from('trabajadores').upsert(trabajadoresBatch, { onConflict: 'nickname' });
      if (error) {
        console.error(`  ❌ Error insertando trabajadores de ${archivo}:`, error.message);
      } else {
        totalTrabajadores += trabajadoresBatch.length;
        console.log(`  ✅ ${trabajadoresBatch.length} trabajadores procesados de ${archivo}.`);
      }
    }
  }

  console.log(`🚀 Total TRABAJADORES insertados en Supabase Cloud: ${totalTrabajadores}\n`);
}

/**
 * 2. Poblar Tabla ATENCIONES (Histórico OATC + Borrador Táctico)
 */
async function poblarAtenciones() {
  console.log('📌 2. Procesando y poblando tabla ATENCIONES (Histórico OATC)...');

  const archivosOATC = fs.readdirSync(dumpDir).filter(f => f.toLowerCase().includes('oatc'));
  let totalAtenciones = 0;

  for (const archivo of archivosOATC) {
    const filePath = path.join(dumpDir, archivo);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (content.length <= 1) continue;

    let sedePorDefecto = 'RD';
    if (archivo.includes('luxury')) sedePorDefecto = 'Luxury';
    if (archivo.includes('gloss')) sedePorDefecto = 'Gloss';

    // Dividir en lotes de 500 filas para inserción eficiente
    const filasData = content.slice(1);
    const BATCH_SIZE = 500;

    for (let i = 0; i < filasData.length; i += BATCH_SIZE) {
      const mapAtenciones = new Map();
      filasData.slice(i, i + BATCH_SIZE).forEach((row, idx) => {
        const nickAgente = row[6] ? String(row[6]).trim().toUpperCase() : (row[19] ? String(row[19]).trim().toUpperCase() : "DESCONOCIDO");
        const idTurno = row[1] ? String(row[1]).trim() : `OATC-${sedePorDefecto}-${i + idx}`;
        
        if (!mapAtenciones.has(idTurno)) {
          mapAtenciones.set(idTurno, {
            id_turno_sheets: idTurno,
            nickname_trabajador: nickAgente,
            sede: sedePorDefecto,
            origen: 'Histórico (OATC)',
            tipo_servicio: row[2] ? String(row[2]).trim() : 'General',
            cliente_nombre: row[4] ? String(row[4]).trim() : 'Anónimo',
            fecha_atencion: new Date().toISOString().split('T')[0],
            hora_atencion: row[0] ? String(row[0]).trim() : '12:00:00',
            resolucion: row[7] ? String(row[7]).trim() : 'Finalizado',
            motivo_cancelacion: row[8] ? String(row[8]).trim() : null
          });
        }
      });

      const batch = Array.from(mapAtenciones.values());


      const { error } = await supabase.from('atenciones').upsert(batch, { onConflict: 'id_turno_sheets' });
      if (error) {
        console.error(`  ❌ Error insertando lote de atenciones (${i} - ${i + BATCH_SIZE}):`, error.message);
      } else {
        totalAtenciones += batch.length;
      }
    }
    console.log(`  ✅ Lotes de ${archivo} completados.`);
  }

  console.log(`🚀 Total ATENCIONES registradas con Índices B-Tree en Supabase Cloud: ${totalAtenciones}\n`);
}

async function ejecutarPobladoCompleto() {
  console.log('🌟 ===== INICIANDO POBLADO DE SUPABASE CLOUD DE PRODUCCIÓN =====\n');
  await poblarTrabajadores();
  await poblarAtenciones();
  console.log('✨ ===== POBLADO DE BASE DE DATOS FINALIZADO EXITOSAMENTE =====');
}

ejecutarPobladoCompleto();
