import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import fs from 'fs';

// Credenciales de Supabase Cloud de Producción
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yhujydgejfjasuffyryg.supabase.co';
// Usar la Service Role Key para bypass durante la migración de datos inicial
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlodWp5ZGdlamZqYXN1ZmZ5cnlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MjEwMTIxNTAyNH0.FRSYkvNWf1WT5-BPXgaIfaORFKimilqcjxgHoJO8sYA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

// ID de la Hoja de Prueba del usuario (se pueden agregar más IDs de Hojas de Sedes)
const HOJAS_SEDES = {
  "RD": "1ynV5uaVKvk50yBxK9dl2N6WJ4xOauvTkIAClJCsdqO0", // Hoja de prueba actual
};

async function obtenerClienteGoogleSheets() {
  if (!fs.existsSync('./credentials.json')) {
    console.error('❌ Error: No se encontró el archivo credentials.json.');
    return null;
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: './credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

/**
 * 1. Migrar Trabajadores desde la pestaña "Agentes" de la Hoja de Cálculo
 */
async function migrarTrabajadores(sheets, spreadsheetId, sede) {
  console.log(`⏳ Leyendo trabajadores (Agentes) de la Sede ${sede}...`);
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'Agentes!A2:Q100',
    });

    const rows = res.data.values;
    if (!rows || rows.length === 0) {
      console.log('ℹ️ No se encontraron agentes en la hoja.');
      return;
    }

    const trabajadores = rows.map(row => {
      const dbNickname = row[13] ? String(row[13]).trim() : "";
      if (!dbNickname) return null;

      return {
        nickname: dbNickname.toLowerCase(),
        nombre: row[2] ? String(row[2]).trim() : "Trabajador",
        especialidad: row[11] ? String(row[11]).trim() : "Estilismo",
        sede: sede,
        sede_base: row[4] ? String(row[4]).trim() : sede,
        horario_entrada: row[5] ? String(row[5]).trim() : null,
        horario_salida: row[6] ? String(row[6]).trim() : null,
        dia_descanso: row[7] ? String(row[7]).trim() : null,
        dni: row[9] ? String(row[9]).trim() : null,
        celular: row[14] ? String(row[14]).trim() : null,
        pin_hash: row[16] ? String(row[16]).trim() : "0000",
        activo: (row[10] ? String(row[10]).trim().toLowerCase() : "activo") === "activo"
      };
    }).filter(Boolean);

    const { error } = await supabase.from('trabajadores').upsert(trabajadores, { onConflict: 'nickname' });
    if (error) {
      console.error('❌ Error guardando trabajadores en Supabase:', error.message);
    } else {
      console.log(`✅ ${trabajadores.length} trabajadores migrados exitosamente a Supabase Cloud.`);
    }
  } catch (e) {
    console.error('❌ Error migrando agentes:', e.message);
  }
}

/**
 * 2. Migrar Histórico de Atenciones desde la pestaña "OATC"
 */
async function migrarAtencionesOATC(sheets, spreadsheetId, sede) {
  console.log(`⏳ Leyendo historial de atenciones (OATC) de la Sede ${sede}...`);
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'OATC!A2:I5000',
    });

    const rows = res.data.values;
    if (!rows || rows.length === 0) {
      console.log('ℹ️ No se encontraron registros de atenciones en OATC.');
      return;
    }

    const atenciones = rows.map((row, index) => {
      const dbNickname = row[6] ? String(row[6]).trim().toLowerCase() : "";
      if (!dbNickname) return null;

      return {
        id_turno_sheets: row[1] ? String(row[1]).trim() : `OATC-${sede}-${index}`,
        nickname_trabajador: dbNickname,
        sede: sede,
        origen: 'Histórico (OATC)',
        tipo_servicio: row[2] ? String(row[2]).trim() : 'General',
        cliente_nombre: row[4] ? String(row[4]).trim() : 'Anónimo',
        fecha_atencion: new Date().toISOString().split('T')[0],
        hora_atencion: row[0] ? String(row[0]).trim() : '12:00:00',
        resolucion: row[7] ? String(row[7]).trim() : 'Finalizado',
        motivo_cancelacion: row[8] ? String(row[8]).trim() : null
      };
    }).filter(Boolean);

    const { error } = await supabase.from('atenciones').upsert(atenciones, { onConflict: 'id_turno_sheets' });
    if (error) {
      console.error('❌ Error guardando atenciones OATC en Supabase:', error.message);
    } else {
      console.log(`🚀 ${atenciones.length} atenciones históricas OATC migradas exitosamente.`);
    }
  } catch (e) {
    console.error('❌ Error migrando OATC:', e.message);
  }
}

async function ejecutarMigracionInicial() {
  console.log('🌟 Iniciando migración inicial de datos desde Google Sheets a Supabase Cloud...');
  const sheets = await obtenerClienteGoogleSheets();
  if (!sheets) return;

  for (const [sede, idSheet] of Object.entries(HOJAS_SEDES)) {
    await migrarTrabajadores(sheets, idSheet, sede);
    await migrarAtencionesOATC(sheets, idSheet, sede);
  }
}

ejecutarMigracionInicial();
