/**
 * RVM Local Listener
 * Recebe webhooks do Hetzner (via Tailscale) e injeta mensagens no Claude Code.
 *
 * Como funciona:
 * 1. Telegram "prossiga com o roadmap"
 * 2. Bot no Hetzner faz POST http://100.69.142.117:4001/claude
 * 3. Este listener:
 *    a. Busca o próximo item pendente do roadmap na API
 *    b. Monta prompt completo com contexto do projeto + próxima tarefa
 *    c. Executa: claude --print "<prompt>" no diretório do projeto
 * 4. Output vai de volta para o Telegram
 *
 * Iniciar:
 *   node rvm-listener.js
 * Manter ativo (com pm2):
 *   npm install -g pm2
 *   pm2 start rvm-listener.js --name rvm-listener
 *   pm2 save && pm2 startup
 */

const http = require('http')
const { spawn } = require('child_process')
const path = require('path')
const https = require('https')

const PORT = 4001
const PROJECT_DIR = path.resolve(__dirname)
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8769895087:AAGMD9dJXZWh9jutpOiGNeyDFELcqSH5rIo'
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8509414578'
const API_URL = 'http://100.64.77.5:4000'
const CLAUDE_MODEL = 'claude-sonnet-4-6'

// Mapa de projetos locais: nome do projeto (lowercase) → diretório local no Windows
const PROJECT_DIRS = {
  'rvm': PROJECT_DIR,
  'vibecode-manager': PROJECT_DIR,
  'redpro vibecoding manager': PROJECT_DIR,
  'vitalis': 'C:/Users/victo_htyd3kj/OneDrive/Desktop/Projetos/Vibecoding/Vitalis',
  'morning-brief': 'C:/Users/victo_htyd3kj/OneDrive/Desktop/Projetos/Vibecoding/morning-brief',
  'morning brief': 'C:/Users/victo_htyd3kj/OneDrive/Desktop/Projetos/Vibecoding/morning-brief',
  'reddit-youtube-digest': 'C:/Users/victo_htyd3kj/OneDrive/Desktop/Projetos/Vibecoding/reddit-youtube-digest',
  'research-mcp': 'C:/Users/victo_htyd3kj/OneDrive/Desktop/Projetos/Vibecoding/research-mcp',
  'openclaw': 'C:/Users/victo_htyd3kj/OneDrive/Desktop/Projetos/Vibecoding/OpenClaw',
  'nossocrm': 'C:/Users/victo_htyd3kj/OneDrive/Desktop/Projetos/Vibecoding/nossocrm',
  'hubcontrol': 'C:/Users/victo_htyd3kj/OneDrive/Desktop/Projetos/Vibecoding/hubcontrol-main',
  'hubcontrol-main': 'C:/Users/victo_htyd3kj/OneDrive/Desktop/Projetos/Vibecoding/hubcontrol-main',
  'flowdesk': 'C:/Users/victo_htyd3kj/OneDrive/Desktop/Projetos/Vibecoding/flowdesk',
  'shark-method': 'C:/Users/victo_htyd3kj/OneDrive/Desktop/Projetos/Vibecoding/shark-method',
  'vibevoice': 'C:/Users/victo_htyd3kj/OneDrive/Desktop/Projetos/Vibecoding/vibevoice',
  'pontos_livelo': 'C:/Users/victo_htyd3kj/OneDrive/Desktop/Projetos/Vibecoding/pontos_livelo',
  'pontos livelo': 'C:/Users/victo_htyd3kj/OneDrive/Desktop/Projetos/Vibecoding/pontos_livelo',
  'nexus-ai-agent': 'C:/Users/victo_htyd3kj/OneDrive/Desktop/Projetos/Vibecoding/nexus-ai-agent',
  'nexus ai agent': 'C:/Users/victo_htyd3kj/OneDrive/Desktop/Projetos/Vibecoding/nexus-ai-agent',
  'nexus': 'C:/Users/victo_htyd3kj/OneDrive/Desktop/Projetos/Vibecoding/nexus-ai-agent',
  'red-pump': 'C:/Users/victo_htyd3kj/OneDrive/Desktop/Projetos/Vibecoding/red-pump',
  'criacao_conteudo': 'C:/Users/victo_htyd3kj/OneDrive/Desktop/Projetos/Vibecoding/criacao_conteudo',
  'criacao de conteudo': 'C:/Users/victo_htyd3kj/OneDrive/Desktop/Projetos/Vibecoding/criacao_conteudo',
  'criação de conteúdo': 'C:/Users/victo_htyd3kj/OneDrive/Desktop/Projetos/Vibecoding/criacao_conteudo',
}

// Contexto fixo do projeto
const BASE_CONTEXT = `Você está trabalhando no projeto RVM (RedPro Vibecoding Manager).
Diretório local: ${PROJECT_DIR}
Stack: Next.js 16 + React 19 + Express.js (porta 4000) + PostgreSQL (100.64.77.5:5434) + Tailwind v4
API rodando no Hetzner (100.64.77.5) via pm2 — atualize os arquivos em: ${PROJECT_DIR}/api/
Frontend Next.js em: ${PROJECT_DIR}/app/
Roadmap completo em: ${PROJECT_DIR}/ROADMAP.md
Status atual em: ${PROJECT_DIR}/CURRENT_STATUS.md`

function sendTelegram(message) {
  const text = encodeURIComponent(message.slice(0, 4000))
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${text}&parse_mode=Markdown`
  https.get(url, () => {}).on('error', () => {})
}

/**
 * Busca os próximos itens pendentes do roadmap na API do Hetzner
 */
function fetchNextRoadmapItems() {
  return new Promise((resolve) => {
    const req = http.get(`${API_URL}/api/roadmap?status=pending`, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          const items = JSON.parse(data)
          resolve(Array.isArray(items) ? items.slice(0, 5) : [])
        } catch {
          resolve([])
        }
      })
    })
    req.on('error', () => resolve([]))
    req.setTimeout(5000, () => { req.destroy(); resolve([]) })
  })
}

/**
 * Lê o CURRENT_STATUS.md local
 */
function readCurrentStatus() {
  try {
    const fs = require('fs')
    return fs.readFileSync(path.join(PROJECT_DIR, 'CURRENT_STATUS.md'), 'utf8').slice(0, 2000)
  } catch {
    return null
  }
}

/**
 * Pega o git log das últimas 5 mudanças (se git disponível)
 */
function getRecentChanges() {
  return new Promise((resolve) => {
    const { exec } = require('child_process')
    exec('git log --oneline -5 2>/dev/null', { cwd: PROJECT_DIR }, (err, stdout) => {
      resolve(err ? null : stdout.trim())
    })
  })
}

/**
 * Monta o prompt completo com contexto + próxima tarefa + instrução do Red
 */
async function buildPrompt(userMessage) {
  const [items, recentChanges] = await Promise.all([
    fetchNextRoadmapItems(),
    getRecentChanges(),
  ])
  const currentStatus = readCurrentStatus()

  // Contexto de estado atual
  let stateContext = ''
  if (currentStatus) {
    // Só inclui as primeiras 800 chars do CURRENT_STATUS
    stateContext = `\n## Estado atual do projeto\n${currentStatus.slice(0, 800)}`
  }
  if (recentChanges) {
    stateContext += `\n\n## Últimas mudanças (git log)\n${recentChanges}`
  }

  // Próximas tarefas do roadmap
  let taskContext = ''
  if (items.length > 0) {
    const next = items[0]
    const upcoming = items.slice(1).map(i => `  - [${i.phase}] ${i.title}`).join('\n')
    taskContext = `
## Próxima tarefa a executar (status: pending)
Fase: ${next.phase_label || next.phase}
Título: ${next.title}
Descrição: ${next.description || 'sem descrição adicional'}
Prioridade: ${next.priority}

${upcoming ? `## Próximas tarefas na fila:\n${upcoming}` : ''}

## Instruções de deploy:
- Arquivos frontend: ${PROJECT_DIR}/app/ e ${PROJECT_DIR}/components/
- Arquivos da API: ${PROJECT_DIR}/api/ → após editar, faça SCP para o Hetzner:
  scp ${PROJECT_DIR}/api/[arquivo] root@100.64.77.5:/root/rvm-api/[arquivo]
  ssh root@100.64.77.5 "pm2 restart rvm-api"
- Ao terminar, atualize ${PROJECT_DIR}/CURRENT_STATUS.md`
  } else {
    taskContext = `\n## Roadmap\nNão há itens pendentes no banco. Consulte ${PROJECT_DIR}/ROADMAP.md.`
  }

  return `${BASE_CONTEXT}
${stateContext}
${taskContext}

---

## Instrução do Red (via Telegram):
${userMessage}

Execute a próxima tarefa pendente do roadmap acima. Seja direto e implemente o código necessário. Não pergunte, apenas execute.`
}

async function runClaude(message, res) {
  console.log(`[listener] Recebido: "${message.slice(0, 80)}"`)

  // Responde ao Hetzner imediatamente (não bloquear o webhook)
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ ok: true, message: 'Claude iniciado' }))

  // Busca contexto e monta prompt
  sendTelegram(`⚙️ *Buscando contexto do roadmap...*`)
  const fullPrompt = await buildPrompt(message)

  const previewLine = fullPrompt.split('\n').find(l => l.startsWith('Título:')) || message.slice(0, 80)
  sendTelegram(`🚀 *Claude Code iniciado*\n_${previewLine}_`)
  console.log(`[listener] Prompt montado (${fullPrompt.length} chars). Iniciando claude...`)

  const claude = spawn('claude', [
    '--print',
    '--dangerously-skip-permissions',
    '--model', CLAUDE_MODEL,
    fullPrompt,
  ], {
    cwd: PROJECT_DIR,
    shell: true,
    env: { ...process.env },
  })

  let output = ''
  let errorOutput = ''

  claude.stdout.on('data', (data) => {
    output += data.toString()
    process.stdout.write(data)
  })

  claude.stderr.on('data', (data) => {
    errorOutput += data.toString()
  })

  claude.on('close', (code) => {
    console.log(`[listener] Claude encerrado (code ${code})`)

    if (code === 0 && output.trim()) {
      const summary = output.trim().slice(0, 3500)
      sendTelegram(`✅ *Claude concluiu:*\n\n${summary}`)
    } else {
      const err = errorOutput.slice(0, 500) || `Código de saída: ${code}`
      sendTelegram(`❌ *Erro no Claude Code:*\n\`\`\`\n${err}\n\`\`\``)
    }
  })

  claude.on('error', (err) => {
    console.error('[listener] Erro ao iniciar claude:', err.message)
    sendTelegram(`❌ Não foi possível iniciar o Claude Code: ${err.message}`)
  })
}

/**
 * Monta prompt focado para uma task específica de qualquer projeto
 */
function buildTaskPrompt({ projectId, projectName, projectDir, taskId, taskTitle, taskDescription, taskPriority }) {
  return `Você está executando uma task específica do projeto "${projectName}" via RVM Heartbeat.

## Contexto do projeto
- Nome: ${projectName}
- Diretório local: ${projectDir}
- API RVM: ${API_URL}

## Task a executar
- ID: ${taskId}
- Título: ${taskTitle}
- Descrição: ${taskDescription || 'sem descrição adicional'}
- Prioridade: ${taskPriority}/10

## Instruções obrigatórias
1. Execute a task acima completamente
2. Ao terminar, chame a API para marcar como concluída:
   POST ${API_URL}/api/projects/${projectId}/roadmap/${taskId}/complete
   Body: { "notes": "breve resumo do que foi feito" }
3. Se for alteração de código: salve todos os arquivos modificados
4. Para projetos no Hetzner (API): faça SCP e reinicie pm2
5. Seja direto — implemente, não explique o que vai fazer

Execute agora.`
}

/**
 * Marca uma task como concluída na API do RVM
 */
function markTaskDone(projectId, taskId) {
  if (!taskId) return Promise.resolve()
  return new Promise((resolve) => {
    const payload = JSON.stringify({ status: 'done' })
    const options = {
      hostname: '100.64.77.5',
      port: 4000,
      path: `/api/projects/${projectId}/roadmap/${taskId}`,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }
    const req = http.request(options, (res) => {
      res.resume()
      resolve()
    })
    req.on('error', () => resolve())
    req.setTimeout(5000, () => { req.destroy(); resolve() })
    req.write(payload)
    req.end()
  })
}

// ──────────────────────────────────────────────
// Servidor HTTP
// ──────────────────────────────────────────────

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ ok: true, service: 'rvm-listener', port: PORT }))
  }

  if (req.method === 'POST' && req.url === '/claude') {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
      try {
        const { message } = JSON.parse(body)
        if (!message) {
          res.writeHead(400)
          return res.end(JSON.stringify({ error: 'message required' }))
        }
        runClaude(message, res)
      } catch (e) {
        res.writeHead(400)
        res.end(JSON.stringify({ error: 'invalid JSON' }))
      }
    })
    return
  }

  // ── /execute-task — disparo via heartbeat inteligente ──────────────────────
  // Body: { projectId, projectName, taskId, taskTitle, taskDescription, taskPriority }
  if (req.method === 'POST' && req.url === '/execute-task') {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body)
        const { projectId, projectName, taskId, taskTitle, taskDescription, taskPriority } = payload

        if (!projectId || !taskTitle) {
          res.writeHead(400)
          return res.end(JSON.stringify({ error: 'projectId e taskTitle são obrigatórios' }))
        }

        // Resolve diretório do projeto
        const projectKey = (projectName || '').toLowerCase()
        const projectDir = PROJECT_DIRS[projectKey] || PROJECT_DIR

        // Responde imediatamente
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, message: `Executando: ${taskTitle}` }))

        // Monta prompt focado na task específica
        const prompt = buildTaskPrompt({ projectId, projectName, projectDir, taskId, taskTitle, taskDescription, taskPriority })

        sendTelegram(`⚙️ *Iniciando task:*\n📁 ${projectName}\n▸ ${taskTitle}`)
        console.log(`[listener] execute-task: [${projectName}] ${taskTitle}`)

        const claude = spawn('claude', [
          '--print',
          '--dangerously-skip-permissions',
          '--model', CLAUDE_MODEL,
          prompt,
        ], {
          cwd: projectDir,
          shell: true,
          env: { ...process.env },
        })

        let output = ''
        let errorOutput = ''

        claude.stdout.on('data', (data) => { output += data.toString(); process.stdout.write(data) })
        claude.stderr.on('data', (data) => { errorOutput += data.toString() })

        claude.on('close', async (code) => {
          console.log(`[listener] Task concluída (code ${code}): ${taskTitle}`)

          if (code === 0 && output.trim()) {
            // Marca task como concluída na API
            await markTaskDone(projectId, taskId)
            const summary = output.trim().slice(0, 3000)
            sendTelegram(`✅ *Task concluída:*\n📁 ${projectName} — ${taskTitle}\n\n${summary}`)
          } else {
            const err = errorOutput.slice(0, 400) || `Código de saída: ${code}`
            sendTelegram(`❌ *Falha na task:*\n📁 ${projectName} — ${taskTitle}\n\`\`\`\n${err}\n\`\`\``)
          }
        })

        claude.on('error', (err) => {
          sendTelegram(`❌ Não foi possível iniciar Claude Code: ${err.message}`)
        })

      } catch (e) {
        res.writeHead(400)
        res.end(JSON.stringify({ error: 'invalid JSON' }))
      }
    })
    return
  }

  res.writeHead(404)
  res.end(JSON.stringify({ error: 'not found' }))
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🔗 RVM Listener ativo em http://0.0.0.0:${PORT}`)
  console.log(`   Tailscale: http://100.69.142.117:${PORT}`)
  console.log(`   Projeto: ${PROJECT_DIR}`)
  console.log(`   API: ${API_URL}`)
  console.log()
  console.log('Aguardando comandos do Telegram...')
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Porta ${PORT} já está em uso. Mate o processo e reinicie.`)
  } else {
    console.error('Erro no servidor:', err)
  }
  process.exit(1)
})
