-- =========================================================================
-- ESQUEMA INICIAL SUPABASE: WORKER APP
-- =========================================================================

-- 1. ENUMS
CREATE TYPE tipo_especialidad AS ENUM ('Estilismo', 'Cosmiatría', 'Jefe Operativo', 'Administración', 'Recepción');
CREATE TYPE tipo_marca_asistencia AS ENUM ('Ya llegué', 'Voy a comer', 'Regresé de comer', 'Acabó mi día');
CREATE TYPE tipo_origen_atencion AS ENUM ('Hoy (Borrador)', 'Histórico (OATC)');

-- 2. TABLA TRABAJADORES
CREATE TABLE IF NOT EXISTS trabajadores (
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
    nfc_tag_uid VARCHAR(100), -- UID o hash cifrado del Tag NFC asignado o de la sede
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA MARCAS DE ASISTENCIA (NFC & TÁCTIL)
CREATE TABLE IF NOT EXISTS marcas_asistencia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trabajador_id UUID REFERENCES trabajadores(id) ON DELETE CASCADE,
    nickname VARCHAR(50) NOT NULL,
    sede VARCHAR(50) NOT NULL,
    tipo_alerta tipo_marca_asistencia NOT NULL,
    auto_nfc BOOLEAN DEFAULT false, -- True si fue auto-confirmado con Tag NFC
    nfc_tag_read VARCHAR(100),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    sincronizado_sheets BOOLEAN DEFAULT false,
    sheets_synced_at TIMESTAMPTZ
);

-- 4. TABLA ATENCIONES / HISTORIAL (Reemplazo ultra-rápido de OATC y Borrador)
CREATE TABLE IF NOT EXISTS atenciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trabajador_id UUID REFERENCES trabajadores(id) ON DELETE SET NULL,
    nickname_trabajador VARCHAR(50) NOT NULL,
    sede VARCHAR(50) NOT NULL,
    id_turno_sheets VARCHAR(50), -- Columna O de Borrador / ID en OATC
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

-- =========================================================================
-- ÍNDICES B-TREE PARA DESAFÍO DE RENDIMIENTO (<15ms en filtros >7 días)
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_trabajadores_nickname ON trabajadores(nickname);
CREATE INDEX IF NOT EXISTS idx_asistencia_trabajador_fecha ON marcas_asistencia (trabajador_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_asistencia_nickname_fecha ON marcas_asistencia (nickname, timestamp DESC);

-- Índice compuesto para resolver las búsquedas de historial de >7, 30 o 90 días en milisegundos
CREATE INDEX IF NOT EXISTS idx_atenciones_nickname_fecha ON atenciones (nickname_trabajador, fecha_atencion DESC);
CREATE INDEX IF NOT EXISTS idx_atenciones_sede_fecha ON atenciones (sede, fecha_atencion DESC);

-- Habilitar RLS (Row Level Security)
ALTER TABLE trabajadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE marcas_asistencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE atenciones ENABLE ROW LEVEL SECURITY;

-- Políticas de desarrollo (Permitir lectura y escritura autenticada)
CREATE POLICY "Permitir acceso a trabajadores" ON trabajadores FOR ALL USING (true);
CREATE POLICY "Permitir acceso a marcas_asistencia" ON marcas_asistencia FOR ALL USING (true);
CREATE POLICY "Permitir acceso a atenciones" ON atenciones FOR ALL USING (true);
