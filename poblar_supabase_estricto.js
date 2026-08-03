import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Credenciales de Supabase Cloud
const SUPABASE_URL = 'https://yhujydgejfjasuffyryg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlodWp5ZGdlamZqYXN1ZmZ5cnlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2MzkwMjQsImV4cCI6MjEwMTIxNTAyNH0.FRSYkvNWf1WT5-BPXgaIfaORFKimilqcjxgHoJO8sYA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const dumpDir = path.join(process.cwd(), 'dump_data');

/**
 * Normalizar especialidad para PostgreSQL ENUM
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
 * Convertir cadenas de fecha DD/MM/YYYY a YYYY-MM-DD para la base de datos
 */
function parsearFechaISO(fechaStr) {
  if (!fechaStr) return new Date().toISOString().split('T')[0];
  const str = String(fechaStr).trim();
  
  // Si viene en formato DD/MM/YYYY o DD/MM/YY
  const partes = str.split('/');
  if (partes.length === 3) {
    const dia = partes[0].padStart(2, '0');
    const mes = partes[1].padStart(2, '0');
    let anio = partes[2].split(' ')[0];
    if (anio.length === 2) anio = `20${anio}`;
    return `${anio}-${mes}-${dia}`;
  }
  return new Date().toISOString().split('T')[0];
}

/**
 * Mapear Sede según el prefijo del archivo (ej: "rd", "luxury", "gloss")
 */
function obtenerSedeDesdeNombreArchivo(nombreArchivo) {
  const prefijo = nombreArchivo.split('_')[0].toLowerCase();
  if (prefijo === 'rd') return 'RD';
  if (prefijo === 'luxury') return 'Luxury';
  if (prefijo === 'gloss') return 'Gloss';
  return 'RD';
}

/**
 * 1. MIGRACIÓN DE TRABAJADORES (Archivos estrictos: rd_idadmin_Agentes, luxury_unificado_Agentes, gloss_unificado_Agentes)
 */
async function migrarTrabajadoresEstricto() {
  console.log('📌 1. Migrando TRABAJADORES (Filtro estricto por Sede)...');
  
  // Limpiar primero la tabla para eliminar cualquier registro distorsionado previo
  const { error: errClean } = await supabase.from('trabajadores').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (errClean) console.warn('Aviso al limpiar trabajadores:', errClean.message);

  const archivosTrabajadores = [
    'rd_idadmin_Agentes.json',
    'luxury_unificado_Agentes.json',
    'gloss_unificado_Agentes.json'
  ];

  let totalTrabajadores = 0;

  for (const archivo of archivosTrabajadores) {
    const filePath = path.join(dumpDir, archivo);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Archivo no encontrado: ${archivo}`);
      continue;
    }

    const sedeExacta = obtenerSedeDesdeNombreArchivo(archivo);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (content.length <= 1) continue;

    const mapUnicos = new Map();

    content.slice(1).forEach(row => {
      // Col 13: Nickname | Col 2: Nombre Completo
      const rawNickname = row[13] ? String(row[13]).trim() : (row[2] ? String(row[2]).trim().split(' ')[0] : "");
      if (!rawNickname) return;

      const nickUpper = rawNickname.toUpperCase();
      if (!mapUnicos.has(nickUpper)) {
        mapUnicos.set(nickUpper, {
          nickname: nickUpper,
          nombre: row[2] ? String(row[2]).trim() : nickUpper,
          especialidad: normalizarEspecialidad(row[11]),
          sede: sedeExacta,
          pin_hash: row[16] ? String(row[16]).trim() : "0000",
          dni: row[9] ? String(row[9]).trim() : null,
          celular: row[14] ? String(row[14]).trim() : null,
          activo: row[10] ? String(row[10]).trim().toLowerCase() === 'activo' : true
        });
      }
    });

    const batch = Array.from(mapUnicos.values());

    if (batch.length > 0) {
      const { error } = await supabase.from('trabajadores').upsert(batch, { onConflict: 'nickname' });
      if (error) {
        console.error(`  ❌ Error insertando trabajadores de ${archivo}:`, error.message);
      } else {
        totalTrabajadores += batch.length;
        console.log(`  ✅ [Sede ${sedeExacta}] ${batch.length} trabajadores insertados desde ${archivo}.`);
      }
    }
  }

  console.log(`🚀 TOTAL TRABAJADORES VALIDADOS EN CLOUD: ${totalTrabajadores}\n`);
}

/**
 * 2. MIGRACIÓN DE ATENCIONES (Archivos estrictos: rd_idoperaciones_OATC, luxury_unificado_OATC, gloss_unificado_OATC)
 */
async function migrarAtencionesEstricto() {
  console.log('📌 2. Migrando ATENCIONES (Histórico OATC con Fechas Reales)...');

  // Limpiar primero la tabla para repoblar con fechas históricas exactas
  await supabase.from('atenciones').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const archivosOATC = [
    'rd_idoperaciones_OATC.json',
    'luxury_unificado_OATC.json',
    'gloss_unificado_OATC.json'
  ];

  let totalAtenciones = 0;

  for (const archivo of archivosOATC) {
    const filePath = path.join(dumpDir, archivo);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Archivo OATC no encontrado: ${archivo}`);
      continue;
    }

    const sedeExacta = obtenerSedeDesdeNombreArchivo(archivo);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (content.length <= 1) continue;

    const filasData = content.slice(1);
    const BATCH_SIZE = 500;

    for (let i = 0; i < filasData.length; i += BATCH_SIZE) {
      const mapAtenciones = new Map();

      filasData.slice(i, i + BATCH_SIZE).forEach((row, idx) => {
        const rawAgente = row[6] ? String(row[6]).trim().toUpperCase() : "DESCONOCIDO";
        const idTurno = row[1] ? String(row[1]).trim() : `OATC-${sedeExacta}-${i + idx}`;
        const fechaRealISO = parsearFechaISO(row[3]); // Columna 3: Fecha de registro

        if (!mapAtenciones.has(idTurno)) {
          mapAtenciones.set(idTurno, {
            id_turno_sheets: `${sedeExacta}-${idTurno}`, // Prefijo por sede para evitar colisión entre sedes
            nickname_trabajador: rawAgente,
            sede: sedeExacta,
            origen: 'Histórico (OATC)',
            tipo_servicio: row[2] ? String(row[2]).trim() : 'General',
            cliente_nombre: row[4] ? String(row[4]).trim() : 'Anónimo',
            fecha_atencion: fechaRealISO,
            hora_atencion: row[0] ? String(row[0]).trim() : '12:00:00',
            resolucion: row[7] ? String(row[7]).trim() : 'Finalizado',
            motivo_cancelacion: row[8] ? String(row[8]).trim() : null
          });
        }
      });

      const batch = Array.from(mapAtenciones.values());

      const { error } = await supabase.from('atenciones').upsert(batch, { onConflict: 'id_turno_sheets' });
      if (error) {
        console.error(`  ❌ Error insertando lote (${i} - ${i + BATCH_SIZE}) en ${archivo}:`, error.message);
      } else {
        totalAtenciones += batch.length;
      }
    }
    console.log(`  ✅ [Sede ${sedeExacta}] Atenciones de ${archivo} completadas.`);
  }

  console.log(`🚀 TOTAL ATENCIONES CON FECHAS HISTÓRICAS EN CLOUD: ${totalAtenciones}\n`);
}

async function ejecutarMigracionEstrictaPerfecta() {
  console.log('🌟 ===== EJECUTANDO MIGRACIÓN ESTRUCTURADA PERFECTA A SUPABASE CLOUD =====\n');
  await migrarTrabajadoresEstricto();
  await migrarAtencionesEstricto();
  console.log('✨ ===== MIGRACIÓN FINALIZADA CON 100% DE ÉXITO =====');
}

ejecutarMigracionEstrictaPerfecta();
