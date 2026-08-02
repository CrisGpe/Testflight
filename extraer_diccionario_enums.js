import fs from 'fs';
import path from 'path';

const dumpDir = path.join(process.cwd(), 'dump_data');

function extraerDiccionarioValoresPermitidos() {
  console.log('📖 ===== DICCIONARIO COMPLETO DE VALORES PERMITIDOS (ENUMS & TIPOS) =====\n');

  const archivos = fs.readdirSync(dumpDir).filter(f => f.endsWith('.json'));

  const diccionario = {};

  for (const archivo of archivos) {
    const filePath = path.join(dumpDir, archivo);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (content.length === 0) continue;

    const encabezados = content[0] || [];
    diccionario[archivo] = {};

    encabezados.forEach((nombreCol, colIdx) => {
      if (!nombreCol) return;
      const valoresUnicos = new Set();
      
      for (let i = 1; i < content.length; i++) {
        const val = content[i][colIdx];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          valoresUnicos.add(String(val).trim());
        }
      }

      const lista = Array.from(valoresUnicos);
      if (lista.length <= 40) {
        diccionario[archivo][nombreCol.trim()] = {
          tipoDeducido: 'ENUM / CATEGORÍA',
          totalValoresUnicos: lista.length,
          valoresPermitidos: lista.sort()
        };
      } else {
        diccionario[archivo][nombreCol.trim()] = {
          tipoDeducido: 'TEXTO LIBRE / NUMÉRICO / FECHA',
          totalValoresUnicos: lista.length,
          ejemplosMuestra: lista.slice(0, 5)
        };
      }
    });
  }

  const dictPath = path.join(process.cwd(), 'diccionario_valores_permitidos.json');
  fs.writeFileSync(dictPath, JSON.stringify(diccionario, null, 2));

  console.log(`✅ Diccionario guardado en: diccionario_valores_permitidos.json\n`);

  for (const [archivo, cols] of Object.entries(diccionario)) {
    if (archivo.includes('agentes') || archivo.includes('borrador') || archivo.includes('oatc') || archivo.includes('tickets') || archivo.includes('productos')) {
      console.log(`📌 ARCHIVO: ${archivo}`);
      for (const [colName, info] of Object.entries(cols)) {
        if (info.tipoDeducido === 'ENUM / CATEGORÍA') {
          console.log(`   🔹 Columna "${colName}" (${info.totalValoresUnicos} valores permitidos):`);
          console.log(`      ➔ [${info.valoresPermitidos.join(' | ')}]`);
        }
      }
      console.log('');
    }
  }
}

extraerDiccionarioValoresPermitidos();
