import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://yhujydgejfjasuffyryg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlodWp5ZGdlamZqYXN1ZmZ5cnlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2MzkwMjQsImV4cCI6MjEwMTIxNTAyNH0.FRSYkvNWf1WT5-BPXgaIfaORFKimilqcjxgHoJO8sYA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const dumpDir = path.join(process.cwd(), 'dump_data');

function parsearFechaISO(fechaStr) {
  if (!fechaStr) return null;
  const str = String(fechaStr).trim();
  const partes = str.split('/');
  if (partes.length === 3) {
    const dia = partes[0].padStart(2, '0');
    const mes = partes[1].padStart(2, '0');
    let anio = partes[2].split(' ')[0];
    if (anio.length === 2) anio = `20${anio}`;
    return `${anio}-${mes}-${dia}`;
  }
  return null;
}

async function poblarClientes() {
  console.log('📌 Migrando CLIENTES a Supabase Cloud desde dump_data...');
  
  const archivosClientes = fs.readdirSync(dumpDir).filter(f => f.toLowerCase().includes('clientes'));
  let totalClientes = 0;

  for (const archivo of archivosClientes) {
    const filePath = path.join(dumpDir, archivo);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (content.length <= 1) continue;

    const mapClientes = new Map();

    content.slice(1).forEach(row => {
      const nombre = row[1] ? String(row[1]).trim() : '';
      const apellido = row[2] ? String(row[2]).trim() : '';
      const dni = row[3] ? String(row[3]).trim() : null;
      const celular = row[5] ? String(row[5]).trim() : null;

      if (!nombre && !apellido) return;

      const key = dni || `${nombre.toUpperCase()}-${apellido.toUpperCase()}`;
      if (!mapClientes.has(key)) {
        mapClientes.set(key, {
          nombre: nombre || 'Sin Nombre',
          apellido: apellido || 'Sin Apellido',
          dni: dni || null,
          celular: celular || null,
          fecha_registro: parsearFechaISO(row[0]),
          ultima_visita: parsearFechaISO(row[7])
        });
      }
    });

    const batch = Array.from(mapClientes.values());

    if (batch.length > 0) {
      const { error } = await supabase.from('clientes').upsert(batch, { onConflict: 'dni' });
      if (error) {
        // Si no hay restricción de conflicto en dni, intentar inserción normal
        const { error: errInsert } = await supabase.from('clientes').insert(batch);
        if (errInsert) {
          console.error(`  ❌ Error insertando clientes de ${archivo}:`, errInsert.message);
        } else {
          totalClientes += batch.length;
          console.log(`  ✅ ${batch.length} clientes insertados desde ${archivo}.`);
        }
      } else {
        totalClientes += batch.length;
        console.log(`  ✅ ${batch.length} clientes upsertados desde ${archivo}.`);
      }
    }
  }

  console.log(`🚀 TOTAL CLIENTES REGISTRADOS EN SUPABASE CLOUD: ${totalClientes}\n`);
}

poblarClientes();
