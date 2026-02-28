// Migration v2: project_tasks, project_integrations, project_mcp_servers
require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
})

async function migrate() {
  console.log('🔄 Running migration v2...')

  // project_tasks — per-project roadmap/tasks
  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_tasks (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
      priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
      category VARCHAR(30) DEFAULT 'feature',
      source VARCHAR(20) DEFAULT 'manual',
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  console.log('✅ project_tasks created')

  // project_integrations — per-project integration configs
  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_integrations (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      service VARCHAR(50) NOT NULL,
      config JSONB DEFAULT '{}',
      status VARCHAR(20) DEFAULT 'disconnected',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  console.log('✅ project_integrations created')

  // project_mcp_servers — MCP server configs per project
  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_mcp_servers (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      command VARCHAR(255),
      args JSONB DEFAULT '[]',
      env_vars JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  console.log('✅ project_mcp_servers created')

  // Add db_type column to projects if not exists
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'db_type') THEN
        ALTER TABLE projects ADD COLUMN db_type VARCHAR(50) DEFAULT 'postgresql';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'db_host') THEN
        ALTER TABLE projects ADD COLUMN db_host VARCHAR(255);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'services') THEN
        ALTER TABLE projects ADD COLUMN services JSONB DEFAULT '[]';
      END IF;
    END $$
  `)
  console.log('✅ projects columns updated')

  console.log('🎉 Migration v2 complete!')
  process.exit(0)
}

migrate().catch(err => { console.error('❌ Migration failed:', err); process.exit(1) })
