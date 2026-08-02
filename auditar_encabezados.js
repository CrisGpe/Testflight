import fs from 'fs';
import path from 'path';

const dumpDir = path.join(process.cwd(), 'dump_data');

function analizarEstructuraHojas() {
  console.log('🔍 ===== AUDITORÍA DE ENCABEZADOS Y VALORES ÚNICOS =====\n');

  const archivos = fs.readdirSync(dumpDir).filter(f => f.endsWith('.json'));

  const reporte = [];

  for (const archivo of archivos) {
    const filePath = path.join(dumpDir, archivo);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    if (content.length === 0) continue;

    const encabezados = content[0] || [];
    const totalFilas = content.length - 1;

    // Calcular valores únicos por columna
    const analisisColumnas = encabezados.map((nombreCol, colIdx) => {
      const valoresUnicos = new Set();
      for (let i = 1; i < content.length; i++) {
        const val = content[i][colIdx];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          valoresUnicos.add(String(val).trim());
        }
      }
      
      const arregloUnicos = Array.from(valoresUnicos);
      const muestraValores = arregloUnicos.length > 5 
        ? `${arregloUnicos.slice(0, 5).join(', ')} ... (+${arregloUnicos.length - 5} más)`
        : arregloUnicos.join(', ');

      return {
        columnaIndex: colIdx,
        nombreEncabezado: nombreCol || `(Sin Título Col ${colIdx})`,
        cantidadValoresUnicos: valoresUnicos.size,
        muestraValores: muestraValores
      };
    });

    reporte.push({
      archivo,
      totalFilas,
      columnasCount: encabezados.length,
      analisisColumnas
    });
  }

  // Guardar el informe de auditoría detallado en JSON
  const reportPath = path.join(process.cwd(), 'auditoria_encabezados_unicos.json');
  fs.writeFileSync(reportPath, JSON.stringify(reporte, null, 2));

  console.log(`✅ ¡Auditoría completada! Se analizaron ${reporte.length} pestañas reales.`);
  console.log(`📄 Reporte completo de variaciones y valores únicos guardado en: auditoria_encabezados_unicos.json\n`);

  // Imprimir en consola resumen de las tablas clave
  reporte.filter(r => r.archivo.includes('agentes') || r.archivo.includes('oatc') || r.archivo.includes('asistencia')).forEach(r => {
    console.log(`📌 ARCHIVO: ${r.archivo} (${r.totalFilas} filas)`);
    r.analisisColumnas.forEach(c => {
      console.log(`  └─ [Col ${c.columnaIndex}] "${c.nombreEncabezado}": ${c.cantidadValoresUnicos} valores únicos | Ej: [${c.muestraValores}]`);
    });
    console.log('');
  });
}

analizarEstructuraHojas();
