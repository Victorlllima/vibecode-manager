const { Pool } = require('pg')

const pool = new Pool({
  host: '100.64.77.5',
  port: 5434,
  user: 'postgres',
  password: 'fa4f466cbf996321adad1b1f738a3c67',
  database: 'vibecodemanager',
})

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS roadmap_items (
      id SERIAL PRIMARY KEY,
      phase VARCHAR(50) NOT NULL,
      phase_label VARCHAR(100),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      priority VARCHAR(20) DEFAULT 'high',
      source VARCHAR(20) DEFAULT 'manual',
      raw_input TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)
  console.log('✅ Tabela roadmap_items criada')

  // Adiciona coluna created_at em tasks se não existir (para o heartbeat)
  await pool.query(`
    ALTER TABLE heartbeats ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `)
  console.log('✅ Coluna created_at adicionada em heartbeats')

  await pool.query(`
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `)
  console.log('✅ Coluna updated_at adicionada em tasks')

  await pool.end()
}

run().catch(e => { console.error('❌', e.message); process.exit(1) })
