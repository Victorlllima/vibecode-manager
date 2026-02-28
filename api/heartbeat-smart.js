/**
 * RVM Heartbeat Inteligente
 *
 * Diferente do heartbeat-v2 (que só pinga serviços), este heartbeat:
 * 1. Busca tasks pendentes de TODOS os projetos ativos no RVM
 * 2. Agrupa por projeto, seleciona as top 3 mais prioritárias
 * 3. Envia mensagem Telegram com botões inline numerados
 * 4. Red responde com os números das tasks que quer executar (ex: "1 3")
 * 5. Para cada task escolhida, faz POST para rvm-listener /execute-task
 *
 * Configurar no crontab do Hetzner:
 *   0 9 * * *  node /root/rvm-api/heartbeat-smart.js   (todo dia 9h)
 *   0 14 * * * node /root/rvm-api/heartbeat-smart.js   (todo dia 14h)
 */

const https = require('https')
const http = require('http')

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID
const API_URL = process.env.API_URL || 'http://localhost:4000'
const LOCAL_LISTENER_URL = process.env.LOCAL_LISTENER_URL || 'http://100.69.142.117:4001'

// ── Helpers HTTP ──────────────────────────────────────────────────────────────

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    const req = lib.get(url, (res) => {
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch { resolve(null) }
      })
    })
    req.on('error', reject)
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

function httpPost(url, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body)
    const parsed = new URL(url)
    const lib = parsed.protocol === 'https:' ? https : http
    const opts = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }
    const req = lib.request(opts, (res) => {
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch { resolve(null) }
      })
    })
    req.on('error', reject)
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')) })
    req.write(payload)
    req.end()
  })
}

function sendTelegram(text) {
  return httpPost(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
    { chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'Markdown', disable_web_page_preview: true }
  )
}

// ── Lógica principal ──────────────────────────────────────────────────────────

async function fetchPendingTasksByProject() {
  // Busca todos os projetos ativos
  const projects = await httpGet(`${API_URL}/api/projects`).catch(() => null)
  if (!Array.isArray(projects)) return []

  const activeProjects = projects.filter(p =>
    p.status === 'development' || p.status === 'attention' || p.status === 'production'
  )

  // Para cada projeto, busca tasks pendentes em paralelo
  const results = await Promise.all(
    activeProjects.map(async (project) => {
      const tasks = await httpGet(
        `${API_URL}/api/projects/${project.id}/roadmap?status=pending`
      ).catch(() => null)

      const pending = Array.isArray(tasks)
        ? tasks
            .filter(t => t.status === 'pending' || t.status === 'in_progress')
            .sort((a, b) => (b.priority || 5) - (a.priority || 5))
            .slice(0, 3)
        : []

      return { project, pending }
    })
  )

  // Remove projetos sem pendências
  return results.filter(r => r.pending.length > 0)
}

function buildHeartbeatMessage(projectGroups) {
  const totalTasks = projectGroups.reduce((sum, g) => sum + g.pending.length, 0)

  let msg = `🔁 *Heartbeat RVM* — ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n`
  msg += `_${totalTasks} pendências em ${projectGroups.length} projeto${projectGroups.length > 1 ? 's' : ''}_\n\n`

  let taskIndex = 1
  const taskMap = []

  for (const { project, pending } of projectGroups) {
    const statusEmoji = { production: '🟢', development: '🔵', attention: '🟡', down: '🔴' }
    msg += `${statusEmoji[project.status] || '⚪'} *${project.name}*\n`

    for (const task of pending) {
      const priorityIcon = task.priority >= 8 ? '🔥' : task.priority >= 5 ? '▸' : '·'
      msg += `  ${priorityIcon} \`[${taskIndex}]\` ${task.title}\n`
      taskMap.push({ index: taskIndex, task, project })
      taskIndex++
    }
    msg += '\n'
  }

  msg += `*Responda com os números* que quer executar agora.\n`
  msg += `_Ex: "1 3" ou "2" ou "0" para pular_`

  return { msg, taskMap }
}

// ── Estado aguardando resposta ────────────────────────────────────────────────
// O bot do Telegram (telegram.js) precisa delegar para cá quando
// receber uma resposta numérica enquanto há heartbeat pendente.
// Este módulo exporta as funções para o telegram.js integrar.

let pendingHeartbeat = null // { taskMap, expiresAt }

function setPendingHeartbeat(taskMap) {
  pendingHeartbeat = {
    taskMap,
    expiresAt: Date.now() + 30 * 60 * 1000, // 30min para responder
  }
}

function getPendingHeartbeat() {
  if (!pendingHeartbeat) return null
  if (Date.now() > pendingHeartbeat.expiresAt) {
    pendingHeartbeat = null
    return null
  }
  return pendingHeartbeat
}

function clearPendingHeartbeat() {
  pendingHeartbeat = null
}

/**
 * Processa a resposta do Red com os números escolhidos.
 * Chamado pelo telegram.js quando detecta uma resposta numérica.
 *
 * @param {string} text — ex: "1 3" ou "2"
 * @returns {Promise<string>} — confirmação do que foi disparado
 */
async function processHeartbeatResponse(text) {
  const hb = getPendingHeartbeat()
  if (!hb) return null

  // Ignora "0" ou "skip"
  const lower = text.trim().toLowerCase()
  if (lower === '0' || lower === 'skip' || lower === 'pular' || lower === 'nenhum') {
    clearPendingHeartbeat()
    return '⏭ Ok, pulando por agora.'
  }

  // Extrai números da resposta
  const chosen = [...text.matchAll(/\d+/g)].map(m => parseInt(m[0]))
  if (chosen.length === 0) return null

  clearPendingHeartbeat()

  const valid = chosen
    .map(n => hb.taskMap.find(t => t.index === n))
    .filter(Boolean)

  if (valid.length === 0) {
    return '❓ Não encontrei tasks com esses números.'
  }

  // Dispara cada task no rvm-listener
  const dispatched = []
  const errors = []

  for (const { task, project } of valid) {
    try {
      await httpPost(`${LOCAL_LISTENER_URL}/execute-task`, {
        projectId: project.id,
        projectName: project.name,
        taskId: task.id,
        taskTitle: task.title,
        taskDescription: task.description || '',
        taskPriority: task.priority || 5,
      })
      dispatched.push(`✅ *${project.name}*: ${task.title}`)
    } catch (err) {
      errors.push(`❌ *${project.name}*: ${task.title} — ${err.message}`)
    }
  }

  let response = `🚀 *Disparando ${dispatched.length} task${dispatched.length > 1 ? 's' : ''}:*\n\n`
  if (dispatched.length) response += dispatched.join('\n') + '\n'
  if (errors.length) response += '\n' + errors.join('\n')
  response += '\n\n_Claude Code Sonnet 4.6 em ação..._'

  return response
}

// ── Execução direta (quando rodado como script standalone) ────────────────────

async function run() {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('[heartbeat-smart] TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não configurados')
    process.exit(1)
  }

  console.log('[heartbeat-smart] Buscando pendências...')

  const projectGroups = await fetchPendingTasksByProject()

  if (projectGroups.length === 0) {
    await sendTelegram('✅ *Heartbeat RVM*\n\nSem pendências nos projetos ativos. Tudo ok!')
    console.log('[heartbeat-smart] Sem pendências. Mensagem enviada.')
    process.exit(0)
  }

  const { msg, taskMap } = buildHeartbeatMessage(projectGroups)
  setPendingHeartbeat(taskMap)

  await sendTelegram(msg)
  console.log(`[heartbeat-smart] Enviado. ${taskMap.length} tasks listadas.`)

  // Salva estado do heartbeat pendente em arquivo (para o bot ler)
  const fs = require('fs')
  const statePath = '/tmp/rvm-heartbeat-pending.json'
  fs.writeFileSync(statePath, JSON.stringify({
    taskMap: taskMap.map(({ index, task, project }) => ({
      index,
      taskId: task.id,
      taskTitle: task.title,
      taskDescription: task.description || '',
      taskPriority: task.priority || 5,
      projectId: project.id,
      projectName: project.name,
    })),
    expiresAt: Date.now() + 30 * 60 * 1000,
  }))

  console.log(`[heartbeat-smart] Estado salvo em ${statePath}`)
  process.exit(0)
}

// Se chamado diretamente como script
if (require.main === module) {
  run().catch(err => {
    console.error('[heartbeat-smart] Erro fatal:', err.message)
    process.exit(1)
  })
}

module.exports = { processHeartbeatResponse, getPendingHeartbeat, clearPendingHeartbeat }
