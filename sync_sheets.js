import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import fs from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54331';
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

// Mapa de Hojas de Cálculo por Sede para Producción y Simulación
const MAPA_SHEETS_SEDE = {
  "SIMULACION": "1ynV5uaVKvk50yBxK9dl2N6WJ4xOauvTkIAClJCsdqO0", // Hoja de prueba actual
  "RD": "ID_HOJA_SEDE_RD_PRODUCCION",
  "LUXURY": "ID_HOJA_SEDE_LUXURY_PRODUCCION",
  "GLOSS": "ID_HOJA_SEDE_GLOSS_PRODUCCION"
};

async function obtenerClienteGoogleSheets() {
  if (!fs.existsSync('./credentials.json')) {
    console.log('⚠️ No se encontró credentials.json en la raíz del proyecto.');
    return null;
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: './credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

/**
 * Servicio en segundo plano que detecta marcas de asistencia sin sincronizar
 * y las enruta automáticamente a la Hoja de Cálculo correspondiente a la Sede del Tag NFC/Trabajador
 */
export async function sincronizarPendientesEnTiempoReal() {
  const sheets = await obtenerClienteGoogleSheets();
  if (!sheets) return;

  // Consultar en Supabase las marcas no sincronizadas
  const { data: pendientes, error } = await supabase
    .from('marcas_asistencia')
    .select('*')
    .eq('sincronizado_sheets', false);

  if (error) {
    console.error('Error consultando marcas pendientes:', error.message);
    return;
  }

  if (!pendientes || pendientes.length === 0) {
    return; // Nada pendiente
  }

  console.log(`📡 Sincronizando ${pendientes.length} marcas pendientes a Google Sheets...`);

  for (const marca of pendientes) {
    const sedeDestino = (marca.sede || "SIMULACION").toUpperCase().trim();
    const sheetId = MAPA_SHEETS_SEDE[sedeDestino] || MAPA_SHEETS_SEDE["SIMULACION"];
    const nombrePestana = sedeDestino === "SIMULACION" ? "Asistencia_Simulacion" : "Alertas";

    const fila = [
      new Date(marca.timestamp).toLocaleString('es-PE'),
      marca.nickname,
      marca.sede,
      marca.tipo_alerta, // 'Ya llegué', 'Voy a comer', 'Regresé de comer', 'Acabó mi día'
      marca.auto_nfc ? `NFC_VALIDADO (${marca.nfc_tag_read || 'TAG'})` : 'MANUAL',
      marca.id
    ];

    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: `${nombrePestana}!A:F`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [fila]
        }
      });

      // Marcar como sincronizado en Supabase
      await supabase
        .from('marcas_asistencia')
        .update({ sincronizado_sheets: true, sheets_synced_at: new Date().toISOString() })
        .eq('id', marca.id);

      console.log(`✅ [ENRUTADO A SEDE: ${sedeDestino}] Marca '${marca.tipo_alerta}' de @${marca.nickname} escrita en Google Sheets.`);
    } catch (err) {
      console.error(`❌ Error enrutando marca ${marca.id} a sede ${sedeDestino}:`, err.message);
    }
  }
}

// Escuchador en bucle de segundo plano cada 5 segundos
console.log('🔄 Servicio de Sincronización en Tiempo Real iniciado (Enrutador por Sede)...');
setInterval(sincronizarPendientesEnTiempoReal, 5000);
