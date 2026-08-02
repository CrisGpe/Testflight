import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// Mapa de los 4 Libros de Google Sheets de la Sede RD
const HOJAS_RD_OFICIALES = {
  "RD_idAdmin": "1U0TkAI74Q0Opqs6UcuVxYtqN41UApPorusopaQDk-3E",       // "Agentes"
  "RD_idOperaciones": "1kbj7BGZyIWcXMj2aqNelSkw25ISuFRUY6AArTt8WjzI", // "Borrador", "OATC", "Alertas", "Clientes"
  "RD_idVentas": "1J2efkmlDygvOE9wIK0hsp-WzUevNzP8_kWi_Nz7RYGk",      // "Registro ventas caja"
  "RD_idErp": "1RQpMXqorsIzmMyoYAv0Jp0QS2PL-w5pzDEKBMKugfXc",         // "Ventas_Tickets", "Ventas_Detalle", "BBDD_Productos"
  
  "Luxury_Unificado": "1w2ZiQPfDfUWM6ODpHQoKn14FGBwwNhzIKxe5-RmEfBw",
  "Gloss_Unificado": "1SXuedQigLxVUF2oxn65wEZ5-HnDDiVdy7lY7HaweVC4"
};

async function obtenerClienteGoogleSheets() {
  if (!fs.existsSync('./credentials.json')) {
    console.error('❌ Error: No se encontró credentials.json.');
    return null;
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: './credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

async function extraerTodasLasHojasAJSONLocal() {
  console.log('📥 Conectando con Google Sheets API para extraer los 4 LIBROS de Sede RD...');
  const sheets = await obtenerClienteGoogleSheets();
  if (!sheets) return;

  const dumpDir = path.join(process.cwd(), 'dump_data');

  for (const [etiqueta, spreadsheetId] of Object.entries(HOJAS_RD_OFICIALES)) {
    console.log(`\n📚 ===== PROCESANDO LIBRO: ${etiqueta} (${spreadsheetId}) =====`);
    
    try {
      const meta = await sheets.spreadsheets.get({ spreadsheetId });
      const sheetsMeta = meta.data.sheets || [];
      console.log(`📋 Pestañas encontradas:`, sheetsMeta.map(s => s.properties.title).join(', '));

      for (const s of sheetsMeta) {
        const title = s.properties.title;
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `'${title}'!A1:Z10000`,
        });
        const rows = res.data.values || [];
        const fileName = `${etiqueta.toLowerCase()}_${title.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
        const jsonPath = path.join(dumpDir, fileName);
        
        fs.writeFileSync(jsonPath, JSON.stringify(rows, null, 2));
        console.log(`  ✅ [${rows.length} filas] Guardado en: dump_data/${fileName}`);
      }
    } catch (e) {
      console.error(`  ⚠️ Permiso requerido en el libro ${etiqueta}:`, e.message);
      console.log(`  💡 Comparte este documento en Google Drive con: workerapp-sync@antigravity-erp-2d74a.iam.gserviceaccount.com`);
    }
  }

  console.log('\n✨ Proceso de extracción finalizado.');
}

extraerTodasLasHojasAJSONLocal();
