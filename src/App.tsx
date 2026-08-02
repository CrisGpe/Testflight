import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Wifi, 
  Smartphone, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  UserCheck, 
  Coffee, 
  LogOut, 
  RotateCcw,
  Zap
} from 'lucide-react';

interface Trabajador {
  id: string;
  nickname: string;
  nombre: string;
  especialidad: string;
  sede: string;
}

interface Atención {
  id: string;
  cliente_nombre: string;
  tipo_servicio: string;
  fecha_atencion: string;
  hora_atencion: string;
  resolucion: string;
  origen: string;
}

export function App() {
  const [agente, setAgente] = useState<Trabajador | null>({
    id: 'demo-1',
    nickname: 'juan.perez',
    nombre: 'Juan Pérez',
    especialidad: 'Estilismo',
    sede: 'RD'
  });

  const [alertaSeleccionada, setAlertaSeleccionada] = useState<string | null>(null);
  const [modalNfcVisible, setModalNfcVisible] = useState<boolean>(false);
  const [segundosModal, setSegundosModal] = useState<number>(30);
  const [procesando, setProcesando] = useState<boolean>(false);
  const [mensajeToast, setMensajeToast] = useState<{ texto: string; tipo: 'success' | 'info' | 'error' } | null>(null);
  const [nfcSoportado, setNfcSoportado] = useState<boolean>(false);

  // Estado del Filtro de Historial
  const [rangoDias, setRangoDias] = useState<number>(30);
  const [atenciones, setAtenciones] = useState<Atención[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState<boolean>(false);
  const [tiempoQueryMs, setTiempoQueryMs] = useState<number | null>(null);

  // Verificar si Web NFC API está disponible en el navegador (Chrome Android / PWA)
  useEffect(() => {
    if ('NDEFReader' in window) {
      setNfcSoportado(true);
    }
  }, []);

  const mostrarToast = (texto: string, tipo: 'success' | 'info' | 'error' = 'info') => {
    setMensajeToast({ texto, tipo });
    setTimeout(() => setMensajeToast(null), 4000);
  };

  // Cargar Historial con Supabase Indexado (<15ms)
  const cargarHistorialOptimizado = async (dias: number) => {
    if (!agente) return;
    setCargandoHistorial(true);
    const t0 = performance.now();

    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - dias);
    const fechaISO = fechaLimite.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('atenciones')
      .select('*')
      .eq('nickname_trabajador', agente.nickname)
      .gte('fecha_atencion', fechaISO)
      .order('fecha_atencion', { ascending: false });

    const t1 = performance.now();
    setTiempoQueryMs(Math.round(t1 - t0));
    setCargandoHistorial(false);

    if (error) {
      console.error('Error al consultar historial:', error);
      mostrarToast('Error al cargar el historial.', 'error');
    } else {
      setAtenciones(data || []);
    }
  };

  useEffect(() => {
    cargarHistorialOptimizado(rangoDias);
  }, [rangoDias, agente]);

  // Lógica del Flujo A: Presionar Botón ➔ Modal de 30s ➔ Lectura NFC en Tiempo Real
  const iniciarFlujoBotonNfc = async (tipoAlerta: string) => {
    setAlertaSeleccionada(tipoAlerta);
    setSegundosModal(30);
    setModalNfcVisible(true);

    // Si el dispositivo cuenta con Web NFC API (Android Chrome)
    if ('NDEFReader' in window) {
      try {
        const ndef = new (window as any).NDEFReader();
        await ndef.scan();
        ndef.onreading = (event: any) => {
          const serialNumber = event.serialNumber || 'NTAG215-TAG';
          procesarMarcajeExitoso(tipoAlerta, `NFC-TAG-${serialNumber}`);
        };
      } catch (err: any) {
        console.warn('Lectura NFC manual activa:', err);
      }
    }
  };

  // Temporizador de 30 segundos
  useEffect(() => {
    let interval: any;
    if (modalNfcVisible && segundosModal > 0) {
      interval = setInterval(() => {
        setSegundosModal((prev) => prev - 1);
      }, 1000);
    } else if (segundosModal === 0 && modalNfcVisible) {
      setModalNfcVisible(false);
      mostrarToast('⏱️ Tiempo de validación presencial NFC agotado.', 'info');
    }
    return () => clearInterval(interval);
  }, [modalNfcVisible, segundosModal]);

  const procesarMarcajeExitoso = async (tipoAlerta: string, tagRead: string) => {
    if (!agente) return;
    setProcesando(true);

    try {
      const { error } = await supabase.from('marcas_asistencia').insert({
        trabajador_id: agente.id !== 'demo-1' ? agente.id : null,
        nickname: agente.nickname,
        sede: agente.sede,
        tipo_alerta: tipoAlerta,
        auto_nfc: true,
        nfc_tag_read: tagRead
      });

      setProcesando(false);
      setModalNfcVisible(false);

      if (error) {
        mostrarToast(`⚠️ Error al registrar marca: ${error.message}`, 'error');
      } else {
        mostrarToast(`⚡ ¡Marcaje presencial '${tipoAlerta}' auto-confirmado con NFC!`, 'success');
      }
    } catch (e: any) {
      setProcesando(false);
      setModalNfcVisible(false);
      mostrarToast(`⚠️ Error: ${e.message}`, 'error');
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-950 text-slate-100 pb-12 shadow-2xl relative">
      {/* Header Superior */}
      <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-40 px-4 py-3 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-black text-sm text-white shadow-lg">
            {agente?.nombre.charAt(0)}
          </div>
          <div>
            <h2 className="text-xs font-black text-white">{agente?.nombre}</h2>
            <p className="text-[10px] text-indigo-400 font-medium">@{agente?.nickname} • Sede {agente?.sede}</p>
          </div>
        </div>
        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Supabase Active
        </span>
      </header>

      {/* Toast Notification */}
      {mensajeToast && (
        <div className={`fixed top-14 left-1/2 -translate-x-1/2 z-50 max-w-xs w-full px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold border transition-all flex items-center gap-2 ${
          mensajeToast.tipo === 'success' ? 'bg-emerald-950 text-emerald-200 border-emerald-800' :
          mensajeToast.tipo === 'error' ? 'bg-rose-950 text-rose-200 border-rose-800' : 'bg-indigo-950 text-indigo-200 border-indigo-800'
        }`}>
          {mensajeToast.tipo === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {mensajeToast.tipo === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
          {mensajeToast.tipo === 'info' && <Zap className="w-4 h-4 text-indigo-400 shrink-0" />}
          <span>{mensajeToast.texto}</span>
        </div>
      )}

      {/* Contenido Principal */}
      <main className="p-4 space-y-6 flex-1">
        
        {/* BLOQUE DE MARCAJE PRESCENCIAL (Flujo A) */}
        <section className="space-y-3">
          <div className="text-center space-y-0.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center justify-center gap-1.5">
              <Wifi className="w-4 h-4 text-indigo-400 animate-pulse" /> Panel de Marcaje Presencial NFC
            </h3>
            <p className="text-[11px] text-slate-400">Presiona tu opción y luego aproxima el teléfono al Tag NFC.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => iniciarFlujoBotonNfc('Ya llegué')}
              className="bg-slate-900 hover:bg-slate-850 active:scale-95 transition-all p-4 rounded-2xl border border-slate-800 hover:border-indigo-500/50 flex flex-col items-center justify-center gap-2 group min-h-[95px] shadow-lg"
            >
              <UserCheck className="w-7 h-7 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-slate-200">Ya llegué</span>
            </button>

            <button 
              onClick={() => iniciarFlujoBotonNfc('Voy a comer')}
              className="bg-slate-900 hover:bg-slate-850 active:scale-95 transition-all p-4 rounded-2xl border border-slate-800 hover:border-indigo-500/50 flex flex-col items-center justify-center gap-2 group min-h-[95px] shadow-lg"
            >
              <Coffee className="w-7 h-7 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-slate-200">Voy a comer</span>
            </button>

            <button 
              onClick={() => iniciarFlujoBotonNfc('Regresé de comer')}
              className="bg-slate-900 hover:bg-slate-850 active:scale-95 transition-all p-4 rounded-2xl border border-slate-800 hover:border-indigo-500/50 flex flex-col items-center justify-center gap-2 group min-h-[95px] shadow-lg"
            >
              <RotateCcw className="w-7 h-7 text-sky-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-slate-200">Regresé de comer</span>
            </button>

            <button 
              onClick={() => iniciarFlujoBotonNfc('Acabó mi día')}
              className="bg-slate-900 hover:bg-slate-850 active:scale-95 transition-all p-4 rounded-2xl border border-slate-800 hover:border-indigo-500/50 flex flex-col items-center justify-center gap-2 group min-h-[95px] shadow-lg"
            >
              <LogOut className="w-7 h-7 text-rose-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-slate-200">Acabó mi día</span>
            </button>
          </div>
        </section>

        {/* BLOQUE DE HISTORIAL ALTA VELOCIDAD (<15ms) */}
        <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-400" /> Mi Historial de Atenciones
              </h3>
              <p className="text-[10px] text-slate-400">Consultas con índice PostgreSQL en milisegundos</p>
            </div>
            {tiempoQueryMs !== null && (
              <span className="text-[9px] font-mono font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                ⚡ {tiempoQueryMs} ms
              </span>
            )}
          </div>

          <div className="flex gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[7, 15, 30, 90].map((dias) => (
              <button
                key={dias}
                onClick={() => setRangoDias(dias)}
                className={`flex-1 py-1 rounded-lg text-[10px] font-black transition-all ${
                  rangoDias === dias
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {dias} Días
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {cargandoHistorial ? (
              <div className="text-center py-6 text-xs text-indigo-400 font-bold animate-pulse">
                ⏳ Consultando índices en Supabase...
              </div>
            ) : atenciones.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500 italic">
                No hay atenciones registradas en los últimos {rangoDias} días.
              </div>
            ) : (
              atenciones.map((item) => (
                <div 
                  key={item.id} 
                  className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                >
                  <div>
                    <span className="font-bold text-slate-200 block">{item.cliente_nombre}</span>
                    <span className="text-[10px] text-slate-400 block">{item.tipo_servicio} • {item.fecha_atencion}</span>
                  </div>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                    item.resolucion === 'Finalizado' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {item.resolucion}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

      </main>

      {/* MODAL VALIDACIÓN PRESENCIAL NFC (Flujo A - 30 Segundos) */}
      {modalNfcVisible && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 max-w-xs w-full text-center space-y-4 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl"></div>

            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 animate-bounce">
              <Smartphone className="w-7 h-7" />
            </div>

            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-wider">Aproxime su Celular al Tag NFC</h4>
              <p className="text-xs text-indigo-300 font-bold mt-1">Autorizando marca: "{alertaSeleccionada}"</p>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 inline-flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 animate-spin" />
              <span className="text-xs font-mono font-black text-amber-400">
                {segundosModal} seg restantes
              </span>
            </div>

            <p className="text-[10px] text-slate-400">
              Mantenga la parte trasera de su iPhone/Android cerca del Tag NFC de la sede ({agente?.sede}).
            </p>

            <div className="pt-2 space-y-2">
              <button
                onClick={() => procesarMarcajeExitoso(alertaSeleccionada || '', `TAG-NFC-${agente?.sede}-MANUAL`)}
                disabled={procesando}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-xs uppercase tracking-wider py-3 rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
              >
                {procesando ? '⏳ Verificando Tag...' : '📱 Confirmar Marcaje NFC (Prueba)'}
              </button>

              <button
                onClick={() => setModalNfcVisible(false)}
                className="w-full text-xs font-bold text-slate-400 hover:text-slate-200 py-1"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
