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
  Zap,
  Bell,
  Wine,
  History,
  User,
  ShieldAlert,
  Users,
  PlayCircle,
  Wrench,
  Package,
  Sparkles,
  Send,
  Search,
  UserSearch,
  Plus,
  X,
  ArrowLeft,
  BarChart2,
  FolderOpen,
  UserPlus
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
  nickname_trabajador?: string;
}

interface Cliente {
  id: string;
  nombre: string;
  apellido?: string;
  dni?: string;
  celular?: string;
  fecha_registro?: string;
  ultima_visita?: string;
}

export function App() {
  const [agente, setAgente] = useState<Trabajador | null>(null);
  const [listaTrabajadores, setListaTrabajadores] = useState<Trabajador[]>([]);
  const [sedeSeleccionada, setSedeSeleccionada] = useState<string>('RD');
  const [nicknameInput, setNicknameInput] = useState<string>('');
  const [pinInput, setPinInput] = useState<string>('');
  const [cargandoLogin, setCargandoLogin] = useState<boolean>(false);

  // Estados de Navegación UX/UI (5 Pestañas + FAB Burbujas)
  const [pestanaActiva, setPestanaActiva] = useState<'Inicio' | 'Turno' | 'Clientes' | 'Agenda' | 'Historial' | 'Perfil'>('Inicio');
  const [subToggleTrabajador, setSubToggleTrabajador] = useState<'Alertas' | 'Bar'>('Alertas');
  const [subToggleJefe, setSubToggleJefe] = useState<'Mando' | 'Botonera' | 'Bar'>('Mando');
  const [subTabMandoJefe, setSubTabMandoJefe] = useState<'Cola' | 'EnCurso'>('Cola');
  const [menuBurbujasAbierto, setMenuBurbujasAbierto] = useState<boolean>(false);
  const [modalListaTurnosVisible, setModalListaTurnosVisible] = useState<boolean>(false);
  const [filtroEspecialidadTurnos, setFiltroEspecialidadTurnos] = useState<string>('Todos');

  // Estados de Wizard Nueva Cita (3 Pasos)
  const [wizardCitaVisible, setWizardCitaVisible] = useState<boolean>(false);
  const [wizardCitaPaso, setWizardCitaPaso] = useState<number>(1);
  const [wizardCitaData, setWizardCitaData] = useState({
    servicio: 'Corte',
    fecha: new Date().toISOString().split('T')[0],
    horaSelect: '09',
    minutoSelect: '00',
    clienteNombre: ''
  });

  // Estados de Wizard Nuevo Cliente (3 Pasos)
  const [wizardClienteVisible, setWizardClienteVisible] = useState<boolean>(false);
  const [wizardClientePaso, setWizardClientePaso] = useState<number>(1);
  const [wizardClienteData, setWizardClienteData] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    prefijoCelular: '+51',
    celular: '',
    correo: '',
    cumpleanos: ''
  });

  // Estados de Búsqueda Global de Clientes (Fase A)
  const [busquedaClienteInput, setBusquedaClienteInput] = useState<string>('');
  const [listaClientes, setListaClientes] = useState<Cliente[]>([]);
  const [cargandoClientes, setCargandoClientes] = useState<boolean>(false);

  // Estado del Pedido del Bar
  const [pedidoBar, setPedidoBar] = useState({
    cafe: 0,
    infusion: 0,
    tipoInfusion: 'Manzanilla',
    agua: 0,
    bebidaDia: 0
  });

  // Datos en tiempo real de Mando de Jefe Operativo
  const [colaSede, setColaSede] = useState<Trabajador[]>([]);
  const [atencionesEnCurso, setAtencionesEnCurso] = useState<Atención[]>([]);


  const [alertaSeleccionada, setAlertaSeleccionada] = useState<string | null>(null);
  const [modalNfcVisible, setModalNfcVisible] = useState<boolean>(false);
  const [segundosModal, setSegundosModal] = useState<number>(30);
  const [procesando, setProcesando] = useState<boolean>(false);
  const [mensajeToast, setMensajeToast] = useState<{ texto: string; tipo: 'success' | 'info' | 'error' } | null>(null);
  const [nfcSoportado, setNfcSoportado] = useState<boolean>(false);

  // Cargar lista de trabajadores reales de Supabase según la Sede seleccionada
  useEffect(() => {
    async function cargarAgentesSede() {
      const { data, error } = await supabase
        .from('trabajadores')
        .select('id, nickname, nombre, especialidad, sede')
        .eq('sede', sedeSeleccionada)
        .eq('activo', true)
        .order('nickname', { ascending: true });

      if (!error && data) {
        setListaTrabajadores(data);
        if (data.length > 0) setNicknameInput(data[0].nickname);
      }
    }
    cargarAgentesSede();
  }, [sedeSeleccionada]);


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

  // Auto-detectar toque de Tag NFC en iPhone/Android cuando la PWA se abre mediante la URL del Tag
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nfcSede = params.get('nfc_sede');
    const nfcAction = params.get('action');

    if (nfcSede) {
      mostrarToast(`🏷️ Tag NFC detectado en Sede: ${nfcSede}`, 'success');
      // Si el trabajador venía con una acción seleccionada
      if (nfcAction) {
        procesarMarcajeExitoso(nfcAction, `TAG-URL-${nfcSede}`);
      }
    }
  }, []);

  const mostrarToast = (texto: string, tipo: 'success' | 'info' | 'error' = 'info') => {
    setMensajeToast({ texto, tipo });
    setTimeout(() => setMensajeToast(null), 4000);
  };

  // Búsqueda Global de Clientes en Tiempo Real (Fase A)
  const buscarClientesEnTiempoReal = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setListaClientes([]);
      return;
    }

    setCargandoClientes(true);
    const q = `%${query.trim()}%`;

    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .or(`nombre.ilike.${q},apellido.ilike.${q},dni.ilike.${q},celular.ilike.${q}`)
      .limit(30);

    setCargandoClientes(false);

    if (!error && data) {
      setListaClientes(data);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (busquedaClienteInput) {
        buscarClientesEnTiempoReal(busquedaClienteInput);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [busquedaClienteInput]);

  // Handler para guardar Cita desde el Wizard
  const guardarWizardCita = async () => {
    if (!agente || !wizardCitaData.clienteNombre) return;

    const { error } = await supabase.from('atenciones').insert([{
      nickname_trabajador: agente.nickname,
      sede: agente.sede,
      cliente_nombre: wizardCitaData.clienteNombre,
      tipo_servicio: wizardCitaData.servicio,
      fecha_atencion: wizardCitaData.fecha,
      hora_atencion: `${wizardCitaData.horaSelect}:${wizardCitaData.minutoSelect}:00`,
      origen: 'Cita',
      resolucion: 'Pendiente'
    }]);

    if (error) {
      mostrarToast('Error al registrar la cita.', 'error');
    } else {
      mostrarToast('✨ ¡Cita registrada exitosamente!', 'success');
      setWizardCitaVisible(false);
      setWizardCitaPaso(1);
      cargarHistorialOptimizado(rangoDias);
    }
  };

  // Handler para guardar Cliente desde el Wizard
  const guardarWizardCliente = async () => {
    if (!wizardClienteData.nombre && !wizardClienteData.apellido) return;

    const { error } = await supabase.from('clientes').insert([{
      nombre: wizardClienteData.nombre,
      apellido: wizardClienteData.apellido,
      dni: wizardClienteData.dni || null,
      celular: wizardClienteData.celular ? `${wizardClienteData.prefijoCelular} ${wizardClienteData.celular}` : null,
      fecha_registro: new Date().toISOString().split('T')[0],
      ultima_visita: new Date().toISOString().split('T')[0]
    }]);

    if (error) {
      mostrarToast('Error al registrar cliente.', 'error');
    } else {
      mostrarToast('✨ ¡Cliente registrado con éxito!', 'success');
      setWizardClienteVisible(false);
      setWizardClientePaso(1);
      if (busquedaClienteInput) {
        buscarClientesEnTiempoReal(busquedaClienteInput);
      }
    }
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
      .ilike('nickname_trabajador', agente.nickname)
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

  // Auto-detectar toque de Tag NFC en iPhone/Android cuando la PWA se abre mediante la URL del Tag
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nfcSede = params.get('nfc_sede');
    const nfcAction = params.get('action');

    if (nfcSede) {
      mostrarToast(`🏷️ Presencia presencial verificada vía NFC (${nfcSede})`, 'success');
      if (nfcAction) {
        procesarMarcajeExitoso(nfcAction, `TAG-URL-${nfcSede}`);
      }
    }
  }, []);


  const ejecutarLogin = async () => {
    if (!nicknameInput || !pinInput) {
      mostrarToast('⚠️ Ingresa tu nickname y tu PIN de 4 dígitos.', 'error');
      return;
    }

    setCargandoLogin(true);
    const { data, error } = await supabase
      .from('trabajadores')
      .select('id, nickname, nombre, especialidad, sede, pin_hash, activo')
      .eq('nickname', nicknameInput.toUpperCase())
      .single();

    setCargandoLogin(false);

    if (error || !data) {
      mostrarToast('❌ Nickname o PIN incorrecto.', 'error');
      return;
    }

    if (!data.activo) {
      mostrarToast('⛔ Tu usuario se encuentra Inactivo.', 'error');
      return;
    }

    if (data.pin_hash && data.pin_hash !== pinInput.trim()) {
      mostrarToast('❌ PIN secreto de 4 dígitos incorrecto.', 'error');
      return;
    }

    setAgente({
      id: data.id,
      nickname: data.nickname,
      nombre: data.nombre,
      especialidad: data.especialidad,
      sede: data.sede
    });

    mostrarToast(`👋 Bienvenid@ ${data.nombre}`, 'success');
  };

  const cerrarSesion = () => {
    setAgente(null);
    setPinInput('');
    mostrarToast('🔒 Sesión cerrada correctamente.', 'info');
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-950 text-slate-100 pb-12 shadow-2xl relative">
      {/* VISTA DE LOGIN CUANDO NO HAY SESIÓN ACTIVA */}
      {!agente ? (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
          <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl shadow-2xl w-full max-w-sm backdrop-blur-md space-y-5">
            <div className="text-center space-y-1">
              <span className="text-4xl inline-block animate-bounce">🔑</span>
              <h2 className="text-xl font-black text-white tracking-tight">Control de Acceso</h2>
              <p className="text-xs text-slate-400">Identifícate con tus credenciales de Supabase Cloud</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Sede Operativa</label>
                <select 
                  value={sedeSeleccionada} 
                  onChange={(e) => setSedeSeleccionada(e.target.value)}
                  className="w-full border border-slate-800 rounded-xl px-3 py-2.5 bg-slate-900 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  <option value="RD">Sede RD</option>
                  <option value="Luxury">Sede Luxury</option>
                  <option value="Gloss">Sede Gloss</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Nickname / Colaborador</label>
                <select 
                  value={nicknameInput} 
                  onChange={(e) => setNicknameInput(e.target.value)}
                  className="w-full border border-slate-800 rounded-xl px-3 py-2.5 bg-slate-900 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  {listaTrabajadores.length === 0 ? (
                    <option value="" disabled>Cargando agentes de Supabase...</option>
                  ) : (
                    listaTrabajadores.map((t) => (
                      <option key={t.id} value={t.nickname}>
                        {t.nickname} - {t.nombre}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Código PIN (4 Dígitos)</label>
                <input 
                  type="password" 
                  inputMode="numeric" 
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="••••" 
                  className="w-full border border-slate-800 rounded-xl px-3 py-2.5 text-center bg-slate-900 text-white font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                />
              </div>

              <button 
                onClick={ejecutarLogin}
                disabled={cargandoLogin}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold text-sm py-3 rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-2 h-[46px]"
              >
                {cargandoLogin ? 'Verificando...' : 'Iniciar Sesión'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Header Superior con Botón de Cerrar Sesión */}
          <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-40 px-4 py-3 backdrop-blur-md flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-black text-sm text-white shadow-lg">
                {agente.nombre.charAt(0)}
              </div>
              <div>
                <h2 className="text-xs font-black text-white">{agente.nombre}</h2>
                <p className="text-[10px] text-indigo-400 font-medium">@{agente.nickname} • Sede {agente.sede}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold">
                {agente.especialidad}
              </span>
              <button 
                onClick={cerrarSesion}
                title="Cerrar Sesión"
                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </header>

          {/* Contenido Principal con cambio de pestañas */}
          <main className="p-4 space-y-6 flex-1 pb-24">
            
            {/* SUB-TOGGLES POR ROL (Alertas / Bar / Mando) */}
            {pestanaActiva === 'Inicio' && (
              <div className="space-y-4">
                {/* Toggle para Jefe Operativo */}
                {agente.especialidad === 'Jefe Operativo' && (
                  <div className="bg-slate-900 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-800 shadow-inner">
                    <button 
                      onClick={() => setSubToggleJefe('Mando')} 
                      className={`flex-1 py-2 rounded-xl text-xs font-black tracking-wide transition-all flex items-center justify-center gap-1.5 ${
                        subToggleJefe === 'Mando' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <ShieldAlert className="w-3.5 h-3.5" /> Mando Táctico
                    </button>
                    <button 
                      onClick={() => setSubToggleJefe('Botonera')} 
                      className={`flex-1 py-2 rounded-xl text-xs font-black tracking-wide transition-all flex items-center justify-center gap-1.5 ${
                        subToggleJefe === 'Botonera' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Bell className="w-3.5 h-3.5" /> Botonera
                    </button>
                  </div>
                )}

                {/* Toggle para Trabajador Regular (Estilismo / Cosmiatría) */}
                {['Estilismo', 'Cosmiatría'].includes(agente.especialidad) && (
                  <div className="bg-slate-900 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-800 shadow-inner">
                    <button 
                      onClick={() => setSubToggleTrabajador('Alertas')} 
                      className={`flex-1 py-2 rounded-xl text-xs font-black tracking-wide transition-all flex items-center justify-center gap-1.5 ${
                        subToggleTrabajador === 'Alertas' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Bell className="w-3.5 h-3.5" /> Alertas Inmediatas
                    </button>
                    <button 
                      onClick={() => setSubToggleTrabajador('Bar')} 
                      className={`flex-1 py-2 rounded-xl text-xs font-black tracking-wide transition-all flex items-center justify-center gap-1.5 ${
                        subToggleTrabajador === 'Bar' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Wine className="w-3.5 h-3.5" /> Pedido Bar
                    </button>
                  </div>
                )}

                {/* VISTA MANDO TÁCTICO DE JEFE OPERATIVO */}
                {agente.especialidad === 'Jefe Operativo' && subToggleJefe === 'Mando' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="text-center space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 inline-block mb-1">
                        Mando Operativo Activo
                      </span>
                      <h3 className="text-sm font-black text-white">🚨 Gobernanza Inmediata</h3>
                      <p className="text-xs text-slate-400">Emite un token de alerta directa a la recepción.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => procesarMarcajeExitoso('Soporte Técnico', 'MANDO-JEFE')}
                        className="bg-amber-950/40 hover:bg-amber-900/50 p-4 rounded-2xl border border-amber-500/30 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 shadow-lg min-h-[100px]"
                      >
                        <Wrench className="w-7 h-7 text-amber-400" />
                        <span className="text-xs font-black text-amber-200 uppercase tracking-wide">Soporte</span>
                      </button>

                      <button 
                        onClick={() => procesarMarcajeExitoso('Cliente Listo', 'MANDO-JEFE')}
                        className="bg-emerald-950/40 hover:bg-emerald-900/50 p-4 rounded-2xl border border-emerald-500/30 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 shadow-lg min-h-[100px]"
                      >
                        <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                        <span className="text-xs font-black text-emerald-200 uppercase tracking-wide">Cliente Listo</span>
                      </button>

                      <button 
                        onClick={() => procesarMarcajeExitoso('Supervisor Urgente', 'MANDO-JEFE')}
                        className="bg-rose-950/40 hover:bg-rose-900/50 p-4 rounded-2xl border border-rose-500/30 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 shadow-lg min-h-[100px]"
                      >
                        <AlertTriangle className="w-7 h-7 text-rose-400" />
                        <span className="text-xs font-black text-rose-200 uppercase tracking-wide">Urgencia</span>
                      </button>

                      <button 
                        onClick={() => procesarMarcajeExitoso('Abastecimiento', 'MANDO-JEFE')}
                        className="bg-indigo-950/40 hover:bg-indigo-900/50 p-4 rounded-2xl border border-indigo-500/30 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 shadow-lg min-h-[100px]"
                      >
                        <Package className="w-7 h-7 text-indigo-400" />
                        <span className="text-xs font-black text-indigo-200 uppercase tracking-wide">Insumos</span>
                      </button>
                    </div>

                    {/* MANDO: TABS DE COLA Y ATENCIONES */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                        <div className="flex gap-4">
                          <button 
                            onClick={() => setSubTabMandoJefe('Cola')} 
                            className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 pb-2 -mb-[9px] border-b-2 transition-all ${
                              subTabMandoJefe === 'Cola' ? 'text-indigo-400 border-indigo-500' : 'text-slate-400 border-transparent hover:text-slate-200'
                            }`}
                          >
                            <Users className="w-4 h-4" /> Cola Sede
                          </button>
                          <button 
                            onClick={() => setSubTabMandoJefe('EnCurso')} 
                            className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 pb-2 -mb-[9px] border-b-2 transition-all ${
                              subTabMandoJefe === 'EnCurso' ? 'text-indigo-400 border-indigo-500' : 'text-slate-400 border-transparent hover:text-slate-200'
                            }`}
                          >
                            <Zap className="w-4 h-4" /> En Curso
                          </button>
                        </div>
                      </div>

                      {/* Contenido: COLA GLOBAL */}
                      {subTabMandoJefe === 'Cola' && (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {listaTrabajadores.length === 0 ? (
                            <div className="text-xs text-center text-slate-500 py-4 font-medium italic">No hay agentes disponibles en cola.</div>
                          ) : (
                            listaTrabajadores.slice(0, 8).map((t, idx) => (
                              <div key={t.id} className="flex items-center gap-2 p-2 bg-slate-950 rounded-xl border border-slate-800">
                                <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center font-black text-[10px] text-slate-400">{idx + 1}</div>
                                <span className="font-bold text-xs text-slate-200 truncate flex-1">{t.nombre}</span>
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider bg-slate-900 text-indigo-400 border border-slate-800">{t.especialidad}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* Contenido: ATENCIONES EN CURSO */}
                      {subTabMandoJefe === 'EnCurso' && (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {atenciones.length === 0 ? (
                            <div className="text-xs text-center text-slate-500 py-4 font-medium italic">No hay atenciones activas en la sede actualmente.</div>
                          ) : (
                            atenciones.slice(0, 5).map((item) => (
                              <div key={item.id} className="flex flex-col gap-1 p-2.5 bg-indigo-950/20 rounded-xl border border-indigo-900/40">
                                <div className="flex justify-between items-center">
                                  <span className="font-bold text-xs text-indigo-300 truncate">{item.cliente_nombre}</span>
                                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-indigo-900/40 text-indigo-300 border border-indigo-800 uppercase">{item.tipo_servicio}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                  <span>👤 @{item.nickname_trabajador}</span>
                                  <span>•</span>
                                  <span className="font-mono">🕒 {item.hora_atencion || '12:00'}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* VISTA TRABAJADOR REGULAR / BOTONERA */}
                {((['Estilismo', 'Cosmiatría'].includes(agente.especialidad) && subToggleTrabajador === 'Alertas') || (agente.especialidad === 'Jefe Operativo' && subToggleJefe === 'Botonera')) && (
                  <section className="space-y-3 animate-fadeIn">
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
                )}

                {/* VISTA BAR TRABAJADOR */}
                {['Estilismo', 'Cosmiatría'].includes(agente.especialidad) && subToggleTrabajador === 'Bar' && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl animate-fadeIn">
                    <div className="text-center border-b border-slate-800 pb-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center justify-center gap-1">🍹 Sección Bar</h3>
                      <p className="text-[10px] text-slate-400">Agrega las cantidades deseadas y envía el pedido completo al Bar.</p>
                    </div>

                    <div className="space-y-3">
                      {/* Ítem Café */}
                      <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-2">☕ Café</span>
                        <div className="flex items-center gap-3">
                          <button onClick={() => setPedidoBar(p => ({ ...p, cafe: Math.max(0, p.cafe - 1) }))} className="w-7 h-7 bg-slate-800 rounded-lg font-bold text-slate-300 active:scale-95">-</button>
                          <span className="text-xs font-mono font-black text-white w-4 text-center">{pedidoBar.cafe}</span>
                          <button onClick={() => setPedidoBar(p => ({ ...p, cafe: p.cafe + 1 }))} className="w-7 h-7 bg-slate-800 rounded-lg font-bold text-slate-300 active:scale-95">+</button>
                        </div>
                      </div>

                      {/* Ítem Infusión */}
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200 flex items-center gap-2">🍵 Infusión</span>
                          <div className="flex items-center gap-3">
                            <button onClick={() => setPedidoBar(p => ({ ...p, infusion: Math.max(0, p.infusion - 1) }))} className="w-7 h-7 bg-slate-800 rounded-lg font-bold text-slate-300 active:scale-95">-</button>
                            <span className="text-xs font-mono font-black text-white w-4 text-center">{pedidoBar.infusion}</span>
                            <button onClick={() => setPedidoBar(p => ({ ...p, infusion: p.infusion + 1 }))} className="w-7 h-7 bg-slate-800 rounded-lg font-bold text-slate-300 active:scale-95">+</button>
                          </div>
                        </div>

                        {pedidoBar.infusion > 0 && (
                          <div className="pt-2 border-t border-slate-800 space-y-1">
                            <label className="block text-[9px] font-extrabold uppercase text-slate-400">Variedad de Infusión:</label>
                            <select 
                              value={pedidoBar.tipoInfusion}
                              onChange={(e) => setPedidoBar(p => ({ ...p, tipoInfusion: e.target.value }))}
                              className="w-full bg-slate-900 text-xs font-medium text-slate-200 rounded-lg p-2 border border-slate-800"
                            >
                              <option value="Manzanilla">🌼 Manzanilla</option>
                              <option value="Té">🍃 Té</option>
                              <option value="Anís">🌱 Anís</option>
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Ítem Agua */}
                      <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-2">💧 Agua</span>
                        <div className="flex items-center gap-3">
                          <button onClick={() => setPedidoBar(p => ({ ...p, agua: Math.max(0, p.agua - 1) }))} className="w-7 h-7 bg-slate-800 rounded-lg font-bold text-slate-300 active:scale-95">-</button>
                          <span className="text-xs font-mono font-black text-white w-4 text-center">{pedidoBar.agua}</span>
                          <button onClick={() => setPedidoBar(p => ({ ...p, agua: p.agua + 1 }))} className="w-7 h-7 bg-slate-800 rounded-lg font-bold text-slate-300 active:scale-95">+</button>
                        </div>
                      </div>
                    </div>

                    {(pedidoBar.cafe > 0 || pedidoBar.infusion > 0 || pedidoBar.agua > 0) && (
                      <button 
                        onClick={() => {
                          const resumen = `Pedido Bar: ${pedidoBar.cafe ? `Café: ${pedidoBar.cafe} ` : ''}${pedidoBar.infusion ? `Infusión (${pedidoBar.tipoInfusion}): ${pedidoBar.infusion} ` : ''}${pedidoBar.agua ? `Agua: ${pedidoBar.agua}` : ''}`;
                          procesarMarcajeExitoso(resumen, 'PEDIDO-BAR');
                          setPedidoBar({ cafe: 0, infusion: 0, tipoInfusion: 'Manzanilla', agua: 0, bebidaDia: 0 });
                        }}
                        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-xs uppercase tracking-wider py-3 rounded-xl shadow-lg active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Send className="w-4 h-4" /> Enviar Pedido al Bar
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* PESTAÑA TURNO */}
            {pestanaActiva === 'Turno' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-gradient-to-r from-indigo-600 to-sky-600 rounded-2xl p-4 text-white shadow-xl flex items-center justify-between relative overflow-hidden">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Posición de Turno</h4>
                    <p className="text-sm font-medium mt-1">
                      Estás en la posición <strong className="text-2xl font-black mx-1">#6</strong> de 6 en Todos.
                    </p>
                  </div>
                  <button 
                    onClick={() => setModalListaTurnosVisible(true)}
                    className="bg-white/20 p-3 rounded-xl backdrop-blur-md border border-white/20 active:scale-95 transition-all"
                  >
                    <Users className="w-6 h-6 text-white" />
                  </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
                  <FolderOpen className="w-12 h-12 text-slate-600 mx-auto" />
                  <h4 className="text-xs font-bold text-slate-300">Sin asignaciones</h4>
                  <p className="text-[11px] text-slate-500">No se encontraron tareas registradas para el rango seleccionado.</p>
                </div>
              </div>
            )}

            {/* PESTAÑA CLIENTES */}
            {pestanaActiva === 'Clientes' && (
              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl animate-fadeIn">
                <div className="text-center space-y-1 border-b border-slate-800 pb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center justify-center gap-1.5">
                    <UserSearch className="w-4 h-4 text-indigo-400" /> Buscador Global de Clientes
                  </h3>
                  <p className="text-[10px] text-slate-400">Consulta directa sobre la base general con búsqueda instantánea</p>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={busquedaClienteInput}
                    onChange={(e) => setBusquedaClienteInput(e.target.value)}
                    placeholder="DNI, Nombre, Apellido o Celular..."
                    className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl pl-9 pr-3 py-2.5 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all"
                  />
                </div>

                <button 
                  onClick={() => { setWizardClientePaso(1); setWizardClienteVisible(true); }}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
                >
                  <Sparkles className="w-4 h-4" /> Agregar nuevo cliente
                </button>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {cargandoClientes ? (
                    <div className="text-center py-6 text-xs text-indigo-400 font-bold animate-pulse">
                      🔍 Buscando en Supabase Cloud...
                    </div>
                  ) : !busquedaClienteInput ? (
                    <div className="text-center py-8 text-xs text-slate-500 italic">
                      Escribe un DNI, Nombre o Teléfono para buscar...
                    </div>
                  ) : listaClientes.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500 italic">
                      No se encontraron clientes coincidentes.
                    </div>
                  ) : (
                    listaClientes.map((c) => (
                      <div key={c.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-xs text-slate-100">{c.nombre} {c.apellido || ''}</span>
                          {c.dni && (
                            <span className="text-[9px] font-mono font-black bg-indigo-950 text-indigo-400 border border-indigo-900 px-1.5 py-0.5 rounded">
                              DNI: {c.dni}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400">
                          <span>📱 {c.celular || 'S/Celular'}</span>
                          <span>🕒 Reg: {c.fecha_registro || 'N/A'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}

            {/* PESTAÑA AGENDA */}
            {pestanaActiva === 'Agenda' && (
              <div className="space-y-4 animate-fadeIn">
                <button 
                  onClick={() => { setWizardCitaPaso(1); setWizardCitaVisible(true); }}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black text-xs py-4 rounded-xl shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
                >
                  <Sparkles className="w-5 h-5" /> Registrar Cita
                </button>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider border-b border-slate-800 pb-2">Histórico de Citas</h4>
                  <div className="space-y-2">
                    {[
                      { fecha: '15/02/2026', cliente: 'yolanda', servicio: 'Colorimetría', estado: 'COMPLETADA', hora: '9:00 AM' },
                      { fecha: '27/01/2026', cliente: 'Nelly Flores', servicio: 'Corte y diseño', estado: 'COMPLETADA', hora: '11:00 AM' },
                      { fecha: '09/01/2026', cliente: 'Huadalupe', servicio: 'Colorimetría', estado: 'COMPLETADA', hora: '3:30 PM' }
                    ].map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono font-bold text-slate-400">📅 {item.fecha}</span>
                          <span className="text-[9px] font-black bg-indigo-950 text-indigo-400 border border-indigo-900 px-2 py-0.5 rounded uppercase">{item.estado}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-200">👤 Cliente: {item.cliente}</p>
                        <p className="text-[11px] text-slate-400">💼 {item.servicio}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* PESTAÑA HISTORIAL */}
            {pestanaActiva === 'Historial' && (
              <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-3 shadow-xl animate-fadeIn">
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

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
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
            )}

            {/* PESTAÑA PERFIL */}
            {pestanaActiva === 'Perfil' && (
              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl animate-fadeIn">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-black text-2xl text-white shadow-xl">
                    {agente.nombre.charAt(0)}
                  </div>
                  <h3 className="text-base font-black text-white">{agente.nombre}</h3>
                  <p className="text-xs text-indigo-400 font-bold">@{agente.nickname}</p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-800/60">
                    <span className="text-slate-400 font-medium">Sede Asignada</span>
                    <span className="font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{agente.sede}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-800/60">
                    <span className="text-slate-400 font-medium">Especialidad</span>
                    <span className="font-bold text-indigo-300 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-900/50">{agente.especialidad}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-1.5">
                    <span className="text-slate-400 font-medium">Estado de Servidor</span>
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Supabase Cloud
                    </span>
                  </div>
                </div>

                <button 
                  onClick={cerrarSesion}
                  className="w-full bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-bold text-xs py-3 rounded-xl border border-rose-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Cerrar Sesión
                </button>
              </section>
            )}

          </main>

          {/* MENÚ BURBUJA FLOTANTE (Radial Smartwatch UI) */}
          {menuBurbujasAbierto && (
            <div className="fixed inset-0 z-[49] bg-slate-950/70 backdrop-blur-sm" onClick={() => setMenuBurbujasAbierto(false)}>
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-0 h-0 flex items-center justify-center animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                <button 
                  onClick={() => { setPestanaActiva('Historial'); setMenuBurbujasAbierto(false); }}
                  className="absolute flex flex-col items-center gap-1 -translate-x-24 -translate-y-24 group transition-all"
                >
                  <div className="w-13 h-13 rounded-full bg-slate-900 border-2 border-indigo-500/50 p-3 text-indigo-400 shadow-2xl group-hover:scale-110 active:scale-95 transition-all">
                    <History className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black text-white bg-slate-900/90 px-2 py-0.5 rounded-full border border-slate-800">Historial</span>
                </button>

                <button 
                  onClick={() => { setPestanaActiva('Perfil'); setMenuBurbujasAbierto(false); }}
                  className="absolute flex flex-col items-center gap-1 -translate-y-36 group transition-all"
                >
                  <div className="w-13 h-13 rounded-full bg-slate-900 border-2 border-sky-500/50 p-3 text-sky-400 shadow-2xl group-hover:scale-110 active:scale-95 transition-all">
                    <BarChart2 className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black text-white bg-slate-900/90 px-2 py-0.5 rounded-full border border-slate-800">Métricas</span>
                </button>

                <button 
                  onClick={() => { setPestanaActiva('Perfil'); setMenuBurbujasAbierto(false); }}
                  className="absolute flex flex-col items-center gap-1 translate-x-24 -translate-y-24 group transition-all"
                >
                  <div className="w-13 h-13 rounded-full bg-slate-900 border-2 border-emerald-500/50 p-3 text-emerald-400 shadow-2xl group-hover:scale-110 active:scale-95 transition-all">
                    <User className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black text-white bg-slate-900/90 px-2 py-0.5 rounded-full border border-slate-800">Perfil</span>
                </button>
              </div>
            </div>
          )}

          {/* BARRA DE NAVEGACIÓN INFERIOR (BOTTOM NAV CON 5 PESTAÑAS + FAB) */}
          <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 border-t border-slate-800 max-w-md mx-auto backdrop-blur-md px-2 h-16 flex items-center justify-between">
            <button 
              onClick={() => setPestanaActiva('Inicio')}
              className={`flex flex-col items-center justify-center w-[18%] h-full transition-all ${
                pestanaActiva === 'Inicio' ? 'text-indigo-400 font-bold scale-105' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Bell className="w-5 h-5" />
              <span className="text-[9px] mt-0.5 font-bold">Inicio</span>
            </button>

            <button 
              onClick={() => setPestanaActiva('Turno')}
              className={`flex flex-col items-center justify-center w-[18%] h-full transition-all mr-3 ${
                pestanaActiva === 'Turno' ? 'text-indigo-400 font-bold scale-105' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Zap className="w-5 h-5" />
              <span className="text-[9px] mt-0.5 font-bold">Turno</span>
            </button>

            {/* BOTÓN CENTRAL FAB */}
            <div className="absolute left-1/2 -top-5 -translate-x-1/2 z-10">
              <button 
                onClick={() => setMenuBurbujasAbierto(!menuBurbujasAbierto)}
                className="w-13 h-13 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-2xl shadow-indigo-500/40 flex items-center justify-center active:scale-95 transition-transform"
              >
                <Plus className={`w-7 h-7 transition-transform duration-300 ${menuBurbujasAbierto ? 'rotate-45' : ''}`} />
              </button>
            </div>

            <button 
              onClick={() => setPestanaActiva('Clientes')}
              className={`flex flex-col items-center justify-center w-[18%] h-full transition-all ml-3 ${
                pestanaActiva === 'Clientes' ? 'text-indigo-400 font-bold scale-105' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <UserSearch className="w-5 h-5" />
              <span className="text-[9px] mt-0.5 font-bold">Clientes</span>
            </button>

            <button 
              onClick={() => setPestanaActiva('Agenda')}
              className={`flex flex-col items-center justify-center w-[18%] h-full transition-all ${
                pestanaActiva === 'Agenda' ? 'text-indigo-400 font-bold scale-105' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span className="text-[9px] mt-0.5 font-bold">Agenda</span>
            </button>
          </nav>

          {/* MODAL LISTA DE TURNOS */}
          {modalListaTurnosVisible && (
            <div className="fixed inset-0 z-[10005] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setModalListaTurnosVisible(false)}>
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-xs w-full space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-400" /> Lista de Turnos
                  </h4>
                  <button onClick={() => setModalListaTurnosVisible(false)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                  {['Todos', 'Estilismo', 'Cosmiatría'].map((esp) => (
                    <button
                      key={esp}
                      onClick={() => setFiltroEspecialidadTurnos(esp)}
                      className={`flex-1 py-1 text-[10px] font-black rounded-lg transition-all ${
                        filtroEspecialidadTurnos === esp ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {esp}
                    </button>
                  ))}
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {[
                    { num: 1, nombre: 'Tomás', esp: 'ESTILISMO' },
                    { num: 2, nombre: 'Vilma', esp: 'ESTILISMO' },
                    { num: 3, nombre: 'Felina', esp: 'ESTILISMO' },
                    { num: 4, nombre: 'Eduard', esp: 'ESTILISMO' },
                    { num: 5, nombre: 'Cocó', esp: 'ESTILISMO' },
                    { num: 6, nombre: 'Koko', esp: 'ESTILISMO', esTu: true }
                  ].map((t) => (
                    <div key={t.num} className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                      t.esTu ? 'bg-indigo-950/60 border-indigo-500/60 text-white font-bold' : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-indigo-400 text-xs font-black flex items-center justify-center">{t.num}</span>
                        <span className="font-bold">{t.nombre}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black bg-slate-900 text-slate-400 border border-slate-800 px-1.5 py-0.5 rounded">{t.esp}</span>
                        {t.esTu && <span className="text-[9px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded">TÚ</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* WIZARD 10x REGISTRAR CITA */}
          {wizardCitaVisible && (
            <div className="fixed inset-0 z-[10010] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center" onClick={() => setWizardCitaVisible(false)}>
              <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    {wizardCitaPaso > 1 && (
                      <button onClick={() => setWizardCitaPaso(wizardCitaPaso - 1)} className="text-slate-400 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                    )}
                    <h4 className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 uppercase tracking-wider">
                      Nueva Cita - Paso {wizardCitaPaso} de 3
                    </h4>
                  </div>
                  <button onClick={() => setWizardCitaVisible(false)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all" style={{ width: `${(wizardCitaPaso / 3) * 100}%` }}></div>
                </div>

                {wizardCitaPaso === 1 && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h4 className="text-sm font-black text-white">¿Qué servicio deseas agendar?</h4>
                      <p className="text-[10px] text-slate-400">Selecciona una categoría principal</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {['Corte', 'Colorimetría', 'Manicure', 'Pedicure', 'Masaje', 'Tratamiento Facial', 'Asesoría'].map((s) => (
                        <button
                          key={s}
                          onClick={() => { setWizardCitaData({ ...wizardCitaData, servicio: s }); setWizardCitaPaso(2); }}
                          className={`p-3 rounded-xl border text-xs font-bold transition-all text-center ${
                            wizardCitaData.servicio === s ? 'bg-indigo-950 border-indigo-500 text-indigo-300' : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {wizardCitaPaso === 2 && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h4 className="text-sm font-black text-white">¿Cuándo será la cita?</h4>
                      <p className="text-[10px] text-slate-400">Selecciona fecha y hora</p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Fecha</label>
                        <input 
                          type="date" 
                          value={wizardCitaData.fecha} 
                          onChange={(e) => setWizardCitaData({ ...wizardCitaData, fecha: e.target.value })}
                          className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl p-3 border border-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Hora</label>
                          <select 
                            value={wizardCitaData.horaSelect} 
                            onChange={(e) => setWizardCitaData({ ...wizardCitaData, horaSelect: e.target.value })}
                            className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl p-3 border border-slate-800 font-bold"
                          >
                            {['08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'].map(h => (
                              <option key={h} value={h}>{h}:00 hs</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Minutos</label>
                          <select 
                            value={wizardCitaData.minutoSelect} 
                            onChange={(e) => setWizardCitaData({ ...wizardCitaData, minutoSelect: e.target.value })}
                            className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl p-3 border border-slate-800 font-bold"
                          >
                            {['00', '15', '30', '45'].map(m => (
                              <option key={m} value={m}>{m} min</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => setWizardCitaPaso(3)} 
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase py-3.5 rounded-xl shadow-lg active:scale-95 transition-all"
                    >
                      Continuar al Paso 3 →
                    </button>
                  </div>
                )}

                {wizardCitaPaso === 3 && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h4 className="text-sm font-black text-white">Datos del Cliente</h4>
                      <p className="text-[10px] text-slate-400">Nombre completo del cliente</p>
                    </div>

                    <input 
                      type="text" 
                      placeholder="Escribe el nombre completo del cliente..."
                      value={wizardCitaData.clienteNombre}
                      onChange={(e) => setWizardCitaData({ ...wizardCitaData, clienteNombre: e.target.value })}
                      className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl p-3 border border-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-xs">
                      <p className="text-[10px] font-black uppercase text-indigo-400">Resumen de Cita</p>
                      <p className="text-slate-200 font-bold">✨ {wizardCitaData.servicio}</p>
                      <p className="text-slate-400">📅 {wizardCitaData.fecha} a las {wizardCitaData.horaSelect}:{wizardCitaData.minutoSelect}</p>
                    </div>

                    <button 
                      onClick={guardarWizardCita} 
                      disabled={!wizardCitaData.clienteNombre}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-xs uppercase py-3.5 rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
                    >
                      ✅ Confirmar y Guardar Cita
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* WIZARD 10x REGISTRAR CLIENTE */}
          {wizardClienteVisible && (
            <div className="fixed inset-0 z-[10011] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center" onClick={() => setWizardClienteVisible(false)}>
              <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    {wizardClientePaso > 1 && (
                      <button onClick={() => setWizardClientePaso(wizardClientePaso - 1)} className="text-slate-400 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                    )}
                    <h4 className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 uppercase tracking-wider">
                      Nuevo Cliente - Paso {wizardClientePaso} de 3
                    </h4>
                  </div>
                  <button onClick={() => setWizardClienteVisible(false)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full transition-all" style={{ width: `${(wizardClientePaso / 3) * 100}%` }}></div>
                </div>

                {wizardClientePaso === 1 && (
                  <div className="space-y-3">
                    <div className="text-center">
                      <h4 className="text-sm font-black text-white">Información Personal</h4>
                      <p className="text-[10px] text-slate-400">Ingresa los datos básicos</p>
                    </div>

                    <input 
                      type="text" 
                      placeholder="Nombres (Ej: Ana María)"
                      value={wizardClienteData.nombre}
                      onChange={(e) => setWizardClienteData({ ...wizardClienteData, nombre: e.target.value })}
                      className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl p-3 border border-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />

                    <input 
                      type="text" 
                      placeholder="Apellidos (Ej: García López)"
                      value={wizardClienteData.apellido}
                      onChange={(e) => setWizardClienteData({ ...wizardClienteData, apellido: e.target.value })}
                      className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl p-3 border border-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />

                    <input 
                      type="text" 
                      placeholder="DNI / Documento"
                      value={wizardClienteData.dni}
                      onChange={(e) => setWizardClienteData({ ...wizardClienteData, dni: e.target.value })}
                      className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl p-3 border border-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />

                    <button 
                      onClick={() => setWizardClientePaso(2)} 
                      disabled={!wizardClienteData.nombre && !wizardClienteData.apellido}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase py-3.5 rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
                    >
                      Siguiente al Paso 2 →
                    </button>
                  </div>
                )}

                {wizardClientePaso === 2 && (
                  <div className="space-y-3">
                    <div className="text-center">
                      <h4 className="text-sm font-black text-white">Datos de Contacto</h4>
                      <p className="text-[10px] text-slate-400">Teléfono y Correo</p>
                    </div>

                    <div className="flex gap-2">
                      <select 
                        value={wizardClienteData.prefijoCelular}
                        onChange={(e) => setWizardClienteData({ ...wizardClienteData, prefijoCelular: e.target.value })}
                        className="w-20 bg-slate-950 text-slate-100 text-xs rounded-xl p-3 border border-slate-800 font-bold"
                      >
                        <option value="+51">🇵🇪 +51</option>
                        <option value="+58">🇻🇪 +58</option>
                        <option value="+57">🇨🇴 +57</option>
                      </select>
                      <input 
                        type="tel" 
                        placeholder="Celular (Ej: 987654321)"
                        value={wizardClienteData.celular}
                        onChange={(e) => setWizardClienteData({ ...wizardClienteData, celular: e.target.value })}
                        className="flex-1 bg-slate-950 text-slate-100 text-xs rounded-xl p-3 border border-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <input 
                      type="email" 
                      placeholder="Correo Electrónico (Opcional)"
                      value={wizardClienteData.correo}
                      onChange={(e) => setWizardClienteData({ ...wizardClienteData, correo: e.target.value })}
                      className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl p-3 border border-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />

                    <button 
                      onClick={() => setWizardClientePaso(3)} 
                      className="w-full bg-teal-600 hover:bg-teal-500 text-white font-black text-xs uppercase py-3.5 rounded-xl shadow-lg active:scale-95 transition-all"
                    >
                      Continuar al Resumen →
                    </button>
                  </div>
                )}

                {wizardClientePaso === 3 && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h4 className="text-sm font-black text-white">Confirma los Datos</h4>
                      <p className="text-[10px] text-slate-400">Revisa la información antes de guardar</p>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                      <p className="text-[10px] font-black uppercase text-emerald-400">Perfil de Cliente</p>
                      <p className="text-slate-100 font-bold text-sm">{wizardClienteData.nombre} {wizardClienteData.apellido}</p>
                      <p className="text-slate-400">📱 Celular: {wizardClienteData.prefijoCelular} {wizardClienteData.celular || 'S/C'}</p>
                      {wizardClienteData.dni && <p className="text-slate-400">🆔 DNI: {wizardClienteData.dni}</p>}
                    </div>

                    <button 
                      onClick={guardarWizardCliente} 
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs uppercase py-3.5 rounded-xl shadow-lg active:scale-95 transition-all"
                    >
                      ✨ Guardar Cliente en Supabase
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

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





