-- =========================================================================
-- ESQUEMA MAESTRO Y POLÍTICAS: WORKER APP (SUPABASE CLOUD)
-- =========================================================================

-- 1. TIPOS ENUM
DO $$ BEGIN
    CREATE TYPE tipo_especialidad AS ENUM ('Estilismo', 'Cosmiatría', 'Jefe Operativo', 'Administración', 'Recepción');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tipo_marca_asistencia AS ENUM ('Ya llegué', 'Voy a comer', 'Regresé de comer', 'Acabó mi día');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tipo_origen_atencion AS ENUM ('Hoy (Borrador)', 'Histórico (OATC)');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABLA TRABAJADORES
CREATE TABLE IF NOT EXISTS public.trabajadores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nickname VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    pin_hash VARCHAR(100),
    especialidad tipo_especialidad NOT NULL DEFAULT 'Estilismo',
    sede VARCHAR(50) NOT NULL DEFAULT 'RD',
    sede_base VARCHAR(50),
    horario_entrada TIME,
    horario_salida TIME,
    dia_descanso VARCHAR(20),
    dni VARCHAR(20),
    celular VARCHAR(30),
    cumpleanos DATE,
    genero VARCHAR(20),
    nfc_tag_uid VARCHAR(100),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA MARCAS DE ASISTENCIA
CREATE TABLE IF NOT EXISTS public.marcas_asistencia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trabajador_id UUID REFERENCES public.trabajadores(id) ON DELETE CASCADE,
    nickname VARCHAR(50) NOT NULL,
    sede VARCHAR(50) NOT NULL,
    tipo_alerta tipo_marca_asistencia NOT NULL,
    auto_nfc BOOLEAN DEFAULT false,
    nfc_tag_read VARCHAR(100),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    sincronizado_sheets BOOLEAN DEFAULT false,
    sheets_synced_at TIMESTAMPTZ
);

-- 4. TABLA ATENCIONES / HISTORIAL
CREATE TABLE IF NOT EXISTS public.atenciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trabajador_id UUID REFERENCES public.trabajadores(id) ON DELETE SET NULL,
    nickname_trabajador VARCHAR(50) NOT NULL,
    sede VARCHAR(50) NOT NULL,
    id_turno_sheets VARCHAR(50) UNIQUE,
    origen tipo_origen_atencion DEFAULT 'Hoy (Borrador)',
    tipo_servicio VARCHAR(100) DEFAULT 'General',
    cliente_nombre VARCHAR(150) DEFAULT 'Anónimo',
    fecha_atencion DATE NOT NULL DEFAULT CURRENT_DATE,
    hora_atencion TIME,
    resolucion VARCHAR(100) DEFAULT 'Pendiente',
    motivo_cancelacion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100),
    dni VARCHAR(20),
    celular VARCHAR(30),
    fecha_registro DATE,
    ultima_visita DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ÍNDICES B-TREE PARA CONSULTAS ULTRA-RÁPIDAS (<15ms)
CREATE INDEX IF NOT EXISTS idx_trabajadores_nickname ON public.trabajadores(nickname);
CREATE INDEX IF NOT EXISTS idx_asistencia_trabajador_fecha ON public.marcas_asistencia (trabajador_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_asistencia_nickname_fecha ON public.marcas_asistencia (nickname, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_atenciones_nickname_fecha ON public.atenciones (nickname_trabajador, fecha_atencion DESC);
CREATE INDEX IF NOT EXISTS idx_atenciones_sede_fecha ON public.atenciones (sede, fecha_atencion DESC);
CREATE INDEX IF NOT EXISTS idx_clientes_busqueda ON public.clientes (nombre, apellido, dni, celular);

-- 6. POLÍTICAS RLS E INSERCIÓN PÚBLICA
ALTER TABLE public.trabajadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marcas_asistencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atenciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo trabajadores" ON public.trabajadores;
DROP POLICY IF EXISTS "Permitir todo marcas_asistencia" ON public.marcas_asistencia;
DROP POLICY IF EXISTS "Permitir todo atenciones" ON public.atenciones;
DROP POLICY IF EXISTS "Permitir todo clientes" ON public.clientes;

CREATE POLICY "Permitir todo trabajadores" ON public.trabajadores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo marcas_asistencia" ON public.marcas_asistencia FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo atenciones" ON public.atenciones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo clientes" ON public.clientes FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.trabajadores TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE public.marcas_asistencia TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE public.atenciones TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE public.clientes TO anon, authenticated, service_role, postgres;
