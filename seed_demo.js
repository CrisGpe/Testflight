import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54331';
// Usar la Service Role Key para bypass de RLS durante la siembra de datos de prueba
const SUPABASE_SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function sembrarDatosPrueba() {
  console.log('🌱 Sembrando datos de prueba en Supabase Local con Service Role...');

  // 1. Insertar Trabajadores
  const trabajadores = [
    { nickname: 'juan.perez', nombre: 'Juan Pérez', especialidad: 'Estilismo', sede: 'RD' },
    { nickname: 'maria.gomez', nombre: 'María Gómez', especialidad: 'Cosmiatría', sede: 'RD' },
    { nickname: 'carlos.jefe', nombre: 'Carlos Ruiz', especialidad: 'Jefe Operativo', sede: 'RD' }
  ];

  for (const t of trabajadores) {
    const { error } = await supabase.from('trabajadores').upsert(t, { onConflict: 'nickname' });
    if (error) console.error('Error insertando trabajador:', error.message);
  }
  console.log('✅ Trabajadores insertados.');

  // 2. Insertar 100 Atenciones Históricas distribuidas en los últimos 90 días
  const servicios = ['Corte de Cabello', 'Manicure Spa', 'Tinte Completo', 'Tratamiento Facial', 'Peinado Evento'];
  const clientes = ['Ana Lucía', 'Valeria Ramos', 'Sofia Mendoza', 'Camila Vega', 'Luciana Silva', 'Fernanda Soto'];
  const resoluciones = ['Finalizado', 'Finalizado', 'Finalizado', 'Pendiente'];

  const atencionesBatch = [];
  const hoy = new Date();

  for (let i = 0; i < 100; i++) {
    const diasAtras = Math.floor(Math.random() * 90);
    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() - diasAtras);
    const fechaStr = fecha.toISOString().split('T')[0];

    atencionesBatch.push({
      nickname_trabajador: 'juan.perez',
      sede: 'RD',
      id_turno_sheets: `TURNO-${1000 + i}`,
      origen: diasAtras === 0 ? 'Hoy (Borrador)' : 'Histórico (OATC)',
      tipo_servicio: servicios[i % servicios.length],
      cliente_nombre: clientes[i % clientes.length],
      fecha_atencion: fechaStr,
      hora_atencion: '14:30:00',
      resolucion: resoluciones[i % resoluciones.length]
    });
  }

  const { error: errAtenciones } = await supabase.from('atenciones').insert(atencionesBatch);
  if (errAtenciones) {
    console.error('Error sembrando atenciones:', errAtenciones.message);
  } else {
    console.log('🚀 100 Atenciones históricas creadas exitosamente.');
  }
}

sembrarDatosPrueba();
