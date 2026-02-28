require('dotenv').config()
const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const { Pool } = require('pg')
const telegram = require('./telegram')
const roadmapSync = require('./roadmap-sync')
const ciMonitor = require('./ci-monitor')
const selfHealing = require('./self-healing')
const devAgent = require('./dev-agent')

const app = express()
const port = process.env.PORT || 4000

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
})

// Inicializa Telegram, seed do roadmap, e CI/CD Monitor
telegram.init(pool)
roadmapSync.seedFromRoadmap(pool).catch(console.error)
ciMonitor.init(pool)
selfHealing.init(pool)
devAgent.init(pool)

app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

// ──────────────────────────────────────────────
// HEALTH
// ──────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()')
    res.json({
      status: 'ok',
      timestamp: result.rows[0].now,
      service: 'RVM — RedPro Vibecoding Manager API',
      telegram: !!process.env.TELEGRAM_BOT_TOKEN,
      ai: !!process.env.ANTHROPIC_API_KEY,
    })
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message })
  }
})

// ──────────────────────────────────────────────
// PROJETOS
// ──────────────────────────────────────────────
app.get('/api/projects', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM projects ORDER BY priority DESC, last_activity DESC')
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/projects', async (req, res) => {
  const { name, description, path, status, priority, github_url } = req.body
  try {
    const result = await pool.query(
      `INSERT INTO projects (name, description, path, status, priority, github_url)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, description, path, status || 'development', priority || 5, github_url || null]
    )
    await telegram.notify(`🆕 *Novo projeto criado*\n\n*${name}*\nStatus: ${status || 'development'}`)
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.patch('/api/projects/:id', async (req, res) => {
  const { id } = req.params
  const { name, description, github_url, path, status, priority } = req.body
  try {
    const fields = []
    const values = []
    let i = 1
    if (name !== undefined)        { fields.push(`name = $${i++}`);        values.push(name) }
    if (description !== undefined) { fields.push(`description = $${i++}`); values.push(description) }
    if (github_url !== undefined)  { fields.push(`github_url = $${i++}`);  values.push(github_url) }
    if (path !== undefined)        { fields.push(`path = $${i++}`);        values.push(path) }
    if (status !== undefined)      { fields.push(`status = $${i++}`);      values.push(status) }
    if (priority !== undefined)    { fields.push(`priority = $${i++}`);    values.push(priority) }
    if (fields.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' })
    fields.push(`last_activity = NOW()`)
    values.push(id)
    const result = await pool.query(
      `UPDATE projects SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Projeto não encontrado' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.patch('/api/projects/:id/status', async (req, res) => {
  const { id } = req.params
  const { status } = req.body
  try {
    const before = await pool.query('SELECT name, status FROM projects WHERE id = $1', [id])
    const result = await pool.query(
      'UPDATE projects SET status = $1, last_activity = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Projeto não encontrado' })
    const old = before.rows[0]
    if (old.status !== status) await telegram.notifyStatusChange(old.name, old.status, status)
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ──────────────────────────────────────────────
// TASKS
// ──────────────────────────────────────────────
app.get('/api/tasks', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, p.name as project_name
       FROM tasks t JOIN projects p ON t.project_id = p.id
       ORDER BY t.created_at DESC`
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/tasks', async (req, res) => {
  const { project_id, title, description, assigned_agent, priority } = req.body
  try {
    const result = await pool.query(
      `INSERT INTO tasks (project_id, title, description, assigned_agent, priority)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [project_id, title, description, assigned_agent || null, priority || 5]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.patch('/api/tasks/:id/status', async (req, res) => {
  const { id } = req.params
  const { status } = req.body
  try {
    const result = await pool.query(
      'UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task não encontrada' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ──────────────────────────────────────────────
// HEARTBEAT
// ──────────────────────────────────────────────
app.post('/api/heartbeat', async (req, res) => {
  const { status, tasks_processed, system_load, logs } = req.body
  try {
    const result = await pool.query(
      `INSERT INTO heartbeats (status, tasks_processed, system_load, logs)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [status || 'ok', tasks_processed || 0, system_load || null, logs || null]
    )
    if (status === 'critical' || status === 'error') {
      await telegram.notifyAlert('Heartbeat crítico', `Status: ${status}\nLoad: ${system_load || '—'}`)
    }
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/heartbeat/latest', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM heartbeats ORDER BY created_at DESC LIMIT 1')
    res.json(result.rows[0] || null)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/heartbeat/history', async (req, res) => {
  const { limit = 48 } = req.query
  try {
    const result = await pool.query(
      'SELECT * FROM heartbeats ORDER BY created_at DESC LIMIT $1',
      [parseInt(limit)]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ──────────────────────────────────────────────
// ROADMAP
// ──────────────────────────────────────────────
app.get('/api/roadmap', async (req, res) => {
  try {
    const { phase, status } = req.query
    let query = 'SELECT * FROM roadmap_items WHERE 1=1'
    const params = []
    if (phase) { params.push(phase); query += ` AND phase = $${params.length}` }
    if (status) { params.push(status); query += ` AND status = $${params.length}` }
    query += ` ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at DESC`
    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/roadmap', async (req, res) => {
  const { phase, phase_label, title, description, priority, source } = req.body
  try {
    const result = await pool.query(
      `INSERT INTO roadmap_items (phase, phase_label, title, description, priority, source)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [phase, phase_label, title, description, priority || 'medium', source || 'manual']
    )
    await roadmapSync.regenerate(pool)
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.patch('/api/roadmap/:id', async (req, res) => {
  const { id } = req.params
  const { status, title, description, priority } = req.body
  try {
    const sets = []
    const params = []
    if (status) { params.push(status); sets.push(`status = $${params.length}`) }
    if (title) { params.push(title); sets.push(`title = $${params.length}`) }
    if (description) { params.push(description); sets.push(`description = $${params.length}`) }
    if (priority) { params.push(priority); sets.push(`priority = $${params.length}`) }
    sets.push(`updated_at = NOW()`)
    params.push(id)
    const result = await pool.query(
      `UPDATE roadmap_items SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item não encontrado' })
    await roadmapSync.regenerate(pool)
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Adiciona ideia via texto livre (linguagem natural)
app.post('/api/roadmap/idea', async (req, res) => {
  const { text } = req.body
  if (!text) return res.status(400).json({ error: 'text required' })
  try {
    const interpreter = require('./ai-interpreter')
    const item = await interpreter.parseRoadmapItem(text)
    const result = await pool.query(
      `INSERT INTO roadmap_items (phase, phase_label, title, description, priority, source, raw_input)
       VALUES ($1, $2, $3, $4, $5, 'ai', $6) RETURNING *`,
      [item.phase, item.phase_label, item.title, item.description, item.priority, text]
    )
    await roadmapSync.regenerate(pool)
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/heartbeat/status — saúde geral do sistema
app.get('/api/heartbeat/status', async (req, res) => {
  try {
    const latest = await pool.query('SELECT * FROM heartbeats ORDER BY created_at DESC LIMIT 1')
    const count24h = await pool.query(
      "SELECT COUNT(*) FROM heartbeats WHERE created_at > NOW() - INTERVAL '24 hours'"
    )
    const hb = latest.rows[0]
    const isOnline = hb && (Date.now() - new Date(hb.created_at).getTime()) < 20 * 60 * 1000
    res.json({
      online: isOnline,
      last_ping: hb?.created_at || null,
      status: hb?.status || 'unknown',
      system_load: hb?.system_load || 0,
      pings_24h: parseInt(count24h.rows[0].count),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/projects/:id — detalhes de um projeto
app.get('/api/projects/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id])
    if (result.rows.length === 0) return res.status(404).json({ error: 'Projeto não encontrado' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/projects/:id/milestones — timeline/roadmap de um projeto
app.get('/api/projects/:id/milestones', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM project_milestones WHERE project_id = $1 ORDER BY "order" ASC',
      [req.params.id]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/projects/:id/milestones — adiciona milestone
app.post('/api/projects/:id/milestones', async (req, res) => {
  const { title, status, order, notes } = req.body
  try {
    const result = await pool.query(
      `INSERT INTO project_milestones (project_id, title, status, "order", notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.id, title, status || 'pending', order || 0, notes || null]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/milestones/:id — atualiza status de um milestone
app.patch('/api/milestones/:id', async (req, res) => {
  const { status, title, notes } = req.body
  try {
    const sets = ['updated_at = NOW()']
    const params = []
    if (status) { params.push(status); sets.push(`status = $${params.length}`) }
    if (title)  { params.push(title);  sets.push(`title = $${params.length}`) }
    if (notes)  { params.push(notes);  sets.push(`notes = $${params.length}`) }
    params.push(req.params.id)
    const result = await pool.query(
      `UPDATE project_milestones SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Milestone não encontrado' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/daily-report — gera e envia relatório diário
app.post('/api/daily-report', async (req, res) => {
  try {
    const [projects, hb, tasks] = await Promise.all([
      pool.query('SELECT * FROM projects ORDER BY priority DESC'),
      pool.query('SELECT * FROM heartbeats ORDER BY created_at DESC LIMIT 1'),
      pool.query("SELECT * FROM tasks WHERE status IN ('pending','in_progress') ORDER BY created_at DESC LIMIT 10"),
    ])
    const p = projects.rows
    const prod = p.filter(x => x.status === 'production').length
    const dev = p.filter(x => x.status === 'development').length
    const hbOk = hb.rows[0]?.status === 'ok' ? '🟢' : '🔴'
    const lines = [
      `📊 *Relatório Diário RVM*`,
      `_${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}_`,
      ``,
      `*Projetos:* ${p.length} total | ${prod} em produção | ${dev} em dev`,
      `*Heartbeat:* ${hbOk} ${hb.rows[0]?.status || 'offline'} | load ${hb.rows[0]?.system_load ?? '—'}`,
      `*Tasks pendentes:* ${tasks.rows.length}`,
      ``,
      p.slice(0, 5).map(x => `${x.status === 'production' ? '🟢' : x.status === 'development' ? '🔵' : x.status === 'attention' ? '🟡' : '🔴'} *${x.name}*`).join('\n'),
    ]
    await telegram.notify(lines.join('\n'))
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ──────────────────────────────────────────────
// TELEGRAM (REST)
// ──────────────────────────────────────────────
app.post('/api/telegram/send', async (req, res) => {
  const { message } = req.body
  if (!message) return res.status(400).json({ error: 'message required' })
  try {
    await telegram.notify(message)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/telegram/config', (req, res) => {
  res.json({
    configured: !!process.env.TELEGRAM_BOT_TOKEN,
    chat_id_set: !!process.env.TELEGRAM_CHAT_ID,
    ai_configured: !!process.env.ANTHROPIC_API_KEY,
  })
})

// ──────────────────────────────────────────────
// GITHUB COMMITS (real data via GitHub API)
// ──────────────────────────────────────────────

// Helper: extract owner/repo from github_url
function parseGithubUrl(url) {
  if (!url) return null
  const match = url.match(/github\.com\/([^\/]+)\/([^\/\.\s]+)/)
  if (!match) return null
  return { owner: match[1], repo: match[2] }
}

// GET /api/projects/:id/commits — real commits from GitHub
app.get('/api/projects/:id/commits', async (req, res) => {
  try {
    const project = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id])
    if (project.rows.length === 0) return res.status(404).json({ error: 'Projeto não encontrado' })

    const p = project.rows[0]
    const gh = parseGithubUrl(p.github_url)
    if (!gh) return res.json({ commits: [], tags: [], source: 'no_github_url' })

    const token = process.env.GITHUB_TOKEN || process.env.GITHUB_SECRET
    const headers = { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'RVM' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const perPage = Math.min(parseInt(req.query.per_page) || 100, 100)
    const page = parseInt(req.query.page) || 1
    const branch = req.query.branch || ''

    let url = `https://api.github.com/repos/${gh.owner}/${gh.repo}/commits?per_page=${perPage}&page=${page}`
    if (branch) url += `&sha=${branch}`

    const [commitsRes, tagsRes] = await Promise.all([
      fetch(url, { headers }),
      fetch(`https://api.github.com/repos/${gh.owner}/${gh.repo}/tags?per_page=30`, { headers }),
    ])

    if (!commitsRes.ok) {
      const err = await commitsRes.text()
      return res.status(commitsRes.status).json({ error: `GitHub API: ${err}` })
    }

    const commits = await commitsRes.json()
    const tags = tagsRes.ok ? await tagsRes.json() : []

    // Map tag SHAs for stable version detection
    const tagMap = {}
    tags.forEach(t => { tagMap[t.commit.sha] = t.name })

    const mapped = commits.map(c => ({
      sha: c.sha,
      shortSha: c.sha.substring(0, 7),
      message: c.commit.message,
      author: c.commit.author?.name || c.author?.login || 'Unknown',
      authorAvatar: c.author?.avatar_url || null,
      date: c.commit.author?.date || c.commit.committer?.date,
      tag: tagMap[c.sha] || null,
      isStable: !!tagMap[c.sha],
      filesChanged: c.stats?.total || null,
    }))

    res.json({ commits: mapped, tags: tags.map(t => t.name), source: 'github' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/projects/:id/rollback — applies rollback via rvm-listener
app.post('/api/projects/:id/rollback', async (req, res) => {
  const { sha } = req.body
  if (!sha) return res.status(400).json({ error: 'sha required' })
  try {
    const project = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id])
    if (project.rows.length === 0) return res.status(404).json({ error: 'Projeto não encontrado' })

    const p = project.rows[0]
    // Notify via Telegram before rollback
    await telegram.notify(`⚠️ *Rollback solicitado*\n\nProjeto: *${p.name}*\nCommit alvo: \`${sha.substring(0, 7)}\`\n\n_Aguardando confirmação..._`)

    // Ask for confirmation via Telegram (auto-approve after 60s)
    const approved = await telegram.askStrategic(
      `Confirmar rollback de *${p.name}* para \`${sha.substring(0, 7)}\`?`,
      60_000
    )

    if (!approved) {
      return res.json({ ok: false, reason: 'Rollback negado via Telegram' })
    }

    // Trigger rollback via rvm-listener
    const listenerUrl = process.env.LISTENER_URL || 'http://100.69.142.117:4001'
    const listenerRes = await fetch(`${listenerUrl}/claude`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Execute rollback do projeto ${p.name} (path: ${p.path}) para o commit ${sha}. Faça git checkout ${sha} ou git revert conforme necessário. Confirme o resultado.`,
      }),
    })

    const result = listenerRes.ok ? await listenerRes.json() : { error: 'Listener não respondeu' }
    await telegram.notify(`✅ Rollback de *${p.name}* para \`${sha.substring(0, 7)}\` ${result.error ? 'falhou' : 'concluído'}`)
    res.json({ ok: !result.error, result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ──────────────────────────────────────────────
// PROJECT ROADMAP (per-project tasks)
// ──────────────────────────────────────────────

// GET /api/projects/:id/roadmap — roadmap items for a specific project
app.get('/api/projects/:id/roadmap', async (req, res) => {
  try {
    const { status, priority } = req.query
    let query = 'SELECT * FROM project_tasks WHERE project_id = $1'
    const params = [req.params.id]
    if (status) { params.push(status); query += ` AND status = $${params.length}` }
    if (priority) { params.push(priority); query += ` AND priority = $${params.length}` }
    query += ` ORDER BY sort_order ASC, created_at DESC`
    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (err) {
    // If table doesn't exist yet, return empty
    if (err.message.includes('does not exist')) return res.json([])
    res.status(500).json({ error: err.message })
  }
})

// POST /api/projects/:id/roadmap — add task to project roadmap
app.post('/api/projects/:id/roadmap', async (req, res) => {
  const { title, description, priority, category, source } = req.body
  if (!title) return res.status(400).json({ error: 'title required' })
  try {
    const maxOrder = await pool.query(
      'SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM project_tasks WHERE project_id = $1',
      [req.params.id]
    )
    const result = await pool.query(
      `INSERT INTO project_tasks (project_id, title, description, priority, category, source, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.params.id, title, description || null, priority || 'medium', category || 'feature', source || 'manual', maxOrder.rows[0].next_order]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    if (err.message.includes('does not exist')) return res.status(500).json({ error: 'Table project_tasks not found. Run migrations.' })
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/projects/:id/roadmap/:taskId — update task
app.patch('/api/projects/:id/roadmap/:taskId', async (req, res) => {
  const { status, title, description, priority, category, sort_order } = req.body
  try {
    const sets = ['updated_at = NOW()']
    const params = [req.params.id, req.params.taskId]
    let idx = params.length
    if (status !== undefined) { idx++; params.push(status); sets.push(`status = $${idx}`) }
    if (title !== undefined) { idx++; params.push(title); sets.push(`title = $${idx}`) }
    if (description !== undefined) { idx++; params.push(description); sets.push(`description = $${idx}`) }
    if (priority !== undefined) { idx++; params.push(priority); sets.push(`priority = $${idx}`) }
    if (category !== undefined) { idx++; params.push(category); sets.push(`category = $${idx}`) }
    if (sort_order !== undefined) { idx++; params.push(sort_order); sets.push(`sort_order = $${idx}`) }
    const result = await pool.query(
      `UPDATE project_tasks SET ${sets.join(', ')} WHERE id = $2 AND project_id = $1 RETURNING *`,
      params
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task não encontrada' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/projects/:id/roadmap/:taskId — remove task
app.delete('/api/projects/:id/roadmap/:taskId', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM project_tasks WHERE id = $1 AND project_id = $2 RETURNING *',
      [req.params.taskId, req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task não encontrada' })
    res.json({ ok: true, deleted: result.rows[0] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ──────────────────────────────────────────────
// PROJECT INTEGRATIONS & CONFIG
// ──────────────────────────────────────────────

// GET /api/projects/:id/integrations — get project integrations config
app.get('/api/projects/:id/integrations', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM project_integrations WHERE project_id = $1',
      [req.params.id]
    )
    res.json(result.rows)
  } catch (err) {
    if (err.message.includes('does not exist')) return res.json([])
    res.status(500).json({ error: err.message })
  }
})

// POST /api/projects/:id/mcp — add MCP server config
app.post('/api/projects/:id/mcp', async (req, res) => {
  const { name, command, args, env_vars } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  try {
    const result = await pool.query(
      `INSERT INTO project_mcp_servers (project_id, name, command, args, env_vars)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.id, name, command, JSON.stringify(args || []), JSON.stringify(env_vars || {})]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    if (err.message.includes('does not exist')) return res.status(500).json({ error: 'Table project_mcp_servers not found. Run migrations.' })
    res.status(500).json({ error: err.message })
  }
})

// GET /api/projects/:id/mcp — get MCP configs
app.get('/api/projects/:id/mcp', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM project_mcp_servers WHERE project_id = $1 ORDER BY created_at',
      [req.params.id]
    )
    res.json(result.rows)
  } catch (err) {
    if (err.message.includes('does not exist')) return res.json([])
    res.status(500).json({ error: err.message })
  }
})

// ──────────────────────────────────────────────
// HEALTH (per project — real checks)
// ──────────────────────────────────────────────

// GET /api/projects/:id/health — real health data
app.get('/api/projects/:id/health', async (req, res) => {
  try {
    const project = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id])
    if (project.rows.length === 0) return res.status(404).json({ error: 'Projeto não encontrado' })

    const p = project.rows[0]
    const gh = parseGithubUrl(p.github_url)

    // Gather real metrics
    const [tasks, heartbeat, commits] = await Promise.all([
      pool.query("SELECT status, COUNT(*) as count FROM tasks WHERE project_id = $1 GROUP BY status", [p.id]),
      pool.query('SELECT * FROM heartbeats ORDER BY created_at DESC LIMIT 1'),
      gh ? (async () => {
        const token = process.env.GITHUB_TOKEN || process.env.GITHUB_SECRET
        const headers = { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'RVM' }
        if (token) headers['Authorization'] = `Bearer ${token}`
        const r = await fetch(`https://api.github.com/repos/${gh.owner}/${gh.repo}`, { headers })
        return r.ok ? r.json() : null
      })() : Promise.resolve(null),
    ])

    const taskStats = {}
    tasks.rows.forEach(r => { taskStats[r.status] = parseInt(r.count) })

    const totalTasks = Object.values(taskStats).reduce((a, b) => a + b, 0)
    const completedTasks = taskStats.completed || 0
    const taskCompletion = totalTasks > 0 ? (completedTasks / totalTasks) * 10 : 5

    const hb = heartbeat.rows[0]
    const hbOk = hb && (Date.now() - new Date(hb.created_at).getTime()) < 20 * 60 * 1000
    const infraScore = hbOk ? 8.5 : 4.0

    const repoData = commits
    const activityScore = repoData?.pushed_at
      ? Math.max(2, 10 - (Date.now() - new Date(repoData.pushed_at).getTime()) / (1000 * 60 * 60 * 24))
      : 5

    const overall = parseFloat(((taskCompletion * 0.3 + infraScore * 0.3 + activityScore * 0.2 + 6 * 0.2)).toFixed(1))

    res.json({
      overall: Math.min(10, overall),
      dimensions: {
        tasks: { score: parseFloat(taskCompletion.toFixed(1)), completed: completedTasks, total: totalTasks },
        infrastructure: { score: infraScore, heartbeatOnline: hbOk, lastPing: hb?.created_at },
        activity: { score: parseFloat(Math.min(10, activityScore).toFixed(1)), lastPush: repoData?.pushed_at, openIssues: repoData?.open_issues_count },
        quality: { score: 6.0 },
      },
      status: p.status,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ──────────────────────────────────────────────
// CI/CD MONITOR
// ──────────────────────────────────────────────

// GET /api/projects/:id/builds — list CI builds for a project
app.get('/api/projects/:id/builds', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 30, 100)
    const conclusion = req.query.conclusion // filter: success, failure, etc
    let query = 'SELECT * FROM ci_builds WHERE project_id = $1'
    const params = [req.params.id]
    if (conclusion) {
      params.push(conclusion)
      query += ` AND conclusion = $${params.length}`
    }
    query += ' ORDER BY started_at DESC LIMIT $' + (params.length + 1)
    params.push(limit)
    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (err) {
    if (err.message.includes('does not exist')) return res.json([])
    res.status(500).json({ error: err.message })
  }
})

// GET /api/builds/recent — recent builds across all projects
app.get('/api/builds/recent', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50)
    const result = await pool.query(
      `SELECT b.*, p.name as project_name
       FROM ci_builds b
       JOIN projects p ON b.project_id = p.id
       ORDER BY b.started_at DESC
       LIMIT $1`,
      [limit]
    )
    res.json(result.rows)
  } catch (err) {
    if (err.message.includes('does not exist')) return res.json([])
    res.status(500).json({ error: err.message })
  }
})

// GET /api/builds/stats — aggregate build stats
app.get('/api/builds/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE conclusion = 'success') as success,
        COUNT(*) FILTER (WHERE conclusion = 'failure') as failure,
        COUNT(*) FILTER (WHERE conclusion = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE status = 'in_progress' OR status = 'queued') as running,
        AVG(duration_seconds) FILTER (WHERE duration_seconds IS NOT NULL) as avg_duration,
        COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '24 hours') as last_24h,
        COUNT(*) FILTER (WHERE conclusion = 'failure' AND started_at > NOW() - INTERVAL '24 hours') as failures_24h
      FROM ci_builds
    `)
    const stats = result.rows[0]
    const successRate = stats.total > 0
      ? Math.round((parseInt(stats.success) / parseInt(stats.total)) * 100)
      : 0
    res.json({
      ...stats,
      total: parseInt(stats.total),
      success: parseInt(stats.success),
      failure: parseInt(stats.failure),
      cancelled: parseInt(stats.cancelled),
      running: parseInt(stats.running),
      avg_duration: stats.avg_duration ? Math.round(parseFloat(stats.avg_duration)) : null,
      last_24h: parseInt(stats.last_24h),
      failures_24h: parseInt(stats.failures_24h),
      success_rate: successRate,
    })
  } catch (err) {
    if (err.message.includes('does not exist')) {
      return res.json({ total: 0, success: 0, failure: 0, cancelled: 0, running: 0, avg_duration: null, last_24h: 0, failures_24h: 0, success_rate: 0 })
    }
    res.status(500).json({ error: err.message })
  }
})

// POST /api/projects/:id/builds/poll — trigger manual poll for a project
app.post('/api/projects/:id/builds/poll', async (req, res) => {
  try {
    const result = await ciMonitor.pollProjectById(parseInt(req.params.id))
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/builds/poll-all — trigger poll for all projects
app.post('/api/builds/poll-all', async (req, res) => {
  try {
    await ciMonitor.pollAllProjects()
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/webhook/github — GitHub webhook for push/workflow events
app.post('/api/webhook/github', async (req, res) => {
  const event = req.headers['x-github-event']
  if (event === 'workflow_run') {
    const { workflow_run, repository } = req.body
    if (workflow_run && repository) {
      try {
        // Find project by github_url
        const { rows } = await pool.query(
          "SELECT id, name FROM projects WHERE github_url LIKE $1",
          [`%${repository.full_name}%`]
        )
        if (rows.length > 0) {
          const project = rows[0]
          const duration = workflow_run.updated_at && workflow_run.created_at
            ? Math.round((new Date(workflow_run.updated_at) - new Date(workflow_run.created_at)) / 1000)
            : null

          await pool.query(
            `INSERT INTO ci_builds (project_id, run_id, run_number, workflow_name, branch, commit_sha, commit_message, status, conclusion, started_at, completed_at, duration_seconds, logs_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             ON CONFLICT (project_id, run_id) DO UPDATE SET
               status = EXCLUDED.status,
               conclusion = EXCLUDED.conclusion,
               completed_at = EXCLUDED.completed_at,
               duration_seconds = EXCLUDED.duration_seconds,
               updated_at = NOW()`,
            [
              project.id,
              workflow_run.id,
              workflow_run.run_number,
              workflow_run.name,
              workflow_run.head_branch,
              workflow_run.head_sha,
              workflow_run.head_commit?.message || null,
              workflow_run.status,
              workflow_run.conclusion,
              workflow_run.created_at,
              workflow_run.updated_at,
              duration,
              workflow_run.html_url,
            ]
          )

          // Alert on failure via webhook (real-time)
          if (workflow_run.conclusion === 'failure') {
            await telegram.notifyAlert(
              `Build falhou — ${project.name}`,
              `Workflow: ${workflow_run.name}\nBranch: ${workflow_run.head_branch}\nCommit: ${workflow_run.head_sha?.substring(0, 7)}\n\n[Ver no GitHub](${workflow_run.html_url})`
            )
          }
        }
      } catch (err) {
        console.error('[Webhook] Erro:', err.message)
      }
    }
  }
  res.status(200).json({ ok: true })
})

// ──────────────────────────────────────────────
// SELF-HEALING SERVER
// ──────────────────────────────────────────────

// GET /api/server/health — full server health check
app.get('/api/server/health', async (req, res) => {
  try {
    const report = await selfHealing.getStatus()
    res.json(report)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/server/restart/:service — manually restart a service
app.post('/api/server/restart/:service', async (req, res) => {
  try {
    const result = await selfHealing.restartService(req.params.service)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/server/reset-attempts — reset restart attempt counters
app.post('/api/server/reset-attempts', async (req, res) => {
  const { service } = req.body
  selfHealing.resetAttempts(service || null)
  res.json({ ok: true })
})

// GET /api/server/history — health check history from heartbeats
app.get('/api/server/history', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 50)
  try {
    const result = await pool.query(
      `SELECT * FROM heartbeats WHERE status LIKE 'self_heal%' ORDER BY created_at DESC LIMIT $1`,
      [limit]
    )
    res.json(result.rows.map(r => ({
      ...r,
      report: r.logs ? JSON.parse(r.logs) : null,
    })))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ──────────────────────────────────────────────
// DEV AGENT (Autonomous)
// ──────────────────────────────────────────────

// POST /api/projects/:id/agent/run — auto-pick and execute next task
app.post('/api/projects/:id/agent/run', async (req, res) => {
  try {
    const result = await devAgent.autoRun(parseInt(req.params.id))
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/projects/:id/agent/execute/:taskId — execute specific task
app.post('/api/projects/:id/agent/execute/:taskId', async (req, res) => {
  try {
    const result = await devAgent.executeTask(parseInt(req.params.id), parseInt(req.params.taskId))
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/projects/:id/agent/next — preview next task to be picked
app.get('/api/projects/:id/agent/next', async (req, res) => {
  try {
    const task = await devAgent.pickNextTask(parseInt(req.params.id))
    res.json({ task })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/agent/active — list all active agent jobs
app.get('/api/agent/active', (req, res) => {
  res.json(devAgent.getActiveJobs())
})

// GET /api/projects/:id/agent/history — completed tasks history
app.get('/api/projects/:id/agent/history', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50)
    const history = await devAgent.getHistory(parseInt(req.params.id), limit)
    res.json(history)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ──────────────────────────────────────────────
// CLAUDE CODE REMOTE — status da sessao ativa
// ──────────────────────────────────────────────

let claudeRemoteSession = {
  active: false,
  host: null,
  port: null,
  started_at: null,
}

// GET /api/claude-remote/status
app.get('/api/claude-remote/status', (req, res) => {
  res.json(claudeRemoteSession)
})

// POST /api/claude-remote/register — rvm-listener chama ao iniciar sessao remota
app.post('/api/claude-remote/register', (req, res) => {
  const { host, port: remotePort } = req.body
  if (!host || !remotePort) return res.status(400).json({ error: 'host e port sao obrigatorios' })
  claudeRemoteSession = {
    active: true,
    host,
    port: parseInt(remotePort),
    started_at: new Date().toISOString(),
  }
  console.log(`[Claude Remote] Sessao registrada: ${host}:${remotePort}`)
  res.json({ ok: true, session: claudeRemoteSession })
})

// POST /api/claude-remote/unregister — encerra sessao
app.post('/api/claude-remote/unregister', (req, res) => {
  claudeRemoteSession = { active: false, host: null, port: null, started_at: null }
  console.log('[Claude Remote] Sessao encerrada')
  res.json({ ok: true })
})

// ──────────────────────────────────────────────
// START
// ──────────────────────────────────────────────
app.listen(port, () => {
  console.log(`🚀 RVM API em http://localhost:${port}`)
  console.log(`🤖 Telegram: ${process.env.TELEGRAM_BOT_TOKEN ? '✅' : '❌ não configurado'}`)
  console.log(`🧠 IA: ${process.env.ANTHROPIC_API_KEY ? '✅' : '⚠️  sem ANTHROPIC_API_KEY — usando fallback por keywords'}`)
})
