// Migration v3: ci_builds table for CI/CD Monitor
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
  console.log('🔄 Running migration v3 — CI/CD Monitor...')

  // ci_builds — stores CI/CD build results per project
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ci_builds (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      run_id BIGINT,
      run_number INTEGER,
      workflow_name VARCHAR(255),
      branch VARCHAR(255),
      commit_sha VARCHAR(40),
      commit_message TEXT,
      status VARCHAR(30) DEFAULT 'pending',
      conclusion VARCHAR(30),
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      duration_seconds INTEGER,
      logs_url TEXT,
      error_summary TEXT,
      ai_suggestion TEXT,
      source VARCHAR(20) DEFAULT 'github_actions',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  console.log('✅ ci_builds created')

  // Index for fast lookup
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_ci_builds_project_id ON ci_builds(project_id)
  `)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_ci_builds_run_id ON ci_builds(run_id)
  `)
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_ci_builds_unique_run ON ci_builds(project_id, run_id)
  `)
  console.log('✅ indexes created')

  console.log('🎉 Migration v3 complete!')
  process.exit(0)
}

migrate().catch(err => { console.error('❌ Migration failed:', err); process.exit(1) })
