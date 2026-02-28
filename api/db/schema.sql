-- Database Schema for VibeCode Manager
-- Target: PostgreSQL

CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    path VARCHAR(512),
    status VARCHAR(50) DEFAULT 'development',
    priority INTEGER DEFAULT 5,
    github_url VARCHAR(512),
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, failed
    priority VARCHAR(20) DEFAULT 'medium',
    estimated_hours NUMERIC(5,2),
    assigned_agent VARCHAR(100),
    dispatched_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS heartbeats (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50),
    tasks_processed INTEGER DEFAULT 0,
    system_load NUMERIC(5,2),
    logs TEXT
);

CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    level VARCHAR(20) DEFAULT 'info', -- info, warn, error, critical
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Roadmap items — fonte de verdade operacional
-- Sincronizados com ROADMAP.md via roadmap-sync.js
CREATE TABLE IF NOT EXISTS roadmap_items (
    id SERIAL PRIMARY KEY,
    phase VARCHAR(50) NOT NULL,          -- 'fase_0', 'aba_1', 'heartbeat', 'telegram', etc.
    phase_label VARCHAR(100),            -- Nome legível: 'Fase 0 — Estabilizar MVP'
    title VARCHAR(255) NOT NULL,         -- Título da feature
    description TEXT,                    -- Descrição detalhada
    status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, done
    priority VARCHAR(20) DEFAULT 'high', -- high, medium, low
    source VARCHAR(20) DEFAULT 'manual', -- 'manual', 'telegram', 'ai'
    raw_input TEXT,                      -- mensagem original do Telegram (se vier de lá)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Initial Projects if needed
-- INSERT INTO projects (name, status, priority) VALUES ('RVM — RedPro Vibecoding Manager', 'development', 10);
