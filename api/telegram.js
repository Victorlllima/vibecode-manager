/**
 * RVM Telegram Bot
 *
 * Filosofia:
 * - Toda mensagem passa pelo Kerberos (agente conversacional com memória)
 * - Kerberos entende linguagem natural e decide o que fazer
 * - Conversa contínua — ele lembra do contexto da sessão
 */

const TelegramBot = require('node-telegram-bot-api')
const fs = require('fs')

let bot = null
let authorizedChatId = null

// Fila de decisões estratégicas aguardando resposta
const pendingDecisions = new Map()

// Caminho do estado do heartbeat inteligente (gravado pelo heartbeat-smart.js)
const HEARTBEAT_STATE_PATH = '/tmp/rvm-heartbeat-pending.json'

/**
 * Lê o estado pendente do heartbeat do disco (compatível com o script standalone)
 */
function loadHeartbeatState() {
  try {
    if (!fs.existsSync(HEARTBEAT_STATE_PATH)) return null
    const raw = fs.readFileSync(HEARTBEAT_STATE_PATH, 'utf8')
    const state = JSON.parse(raw)
    if (Date.now() > state.expiresAt) {
      fs.unlinkSync(HEARTBEAT_STATE_PATH)
      return null
    }
    return state
  } catch {
    return null
  }
}

function clearHeartbeatState() {
  try { fs.unlinkSync(HEARTBEAT_STATE_PATH) } catch {}
}

/**
 * Verifica se o texto é uma resposta ao heartbeat (números ou "0"/"pular")
 */
function isHeartbeatResponse(text) {
  return /^[\d\s,]+$/.test(text.trim()) || ['0', 'pular', 'skip', 'nenhum'].includes(text.trim().toLowerCase())
}

async function sendResponse(chatId, text) {
  if (!bot) return
  const chunks = text.match(/[\s\S]{1,4000}/g) || [text]
  for (const chunk of chunks) {
    await bot.sendMessage(chatId, chunk, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    }).catch(() => {
      // Fallback sem Markdown se houver erro de formatação
      return bot.sendMessage(chatId, chunk).catch(() => {})
    })
  }
}

const LOCAL_LISTENER_URL = process.env.LOCAL_LISTENER_URL || 'http://100.69.142.117:4001'

/**
 * Processa resposta numérica ao heartbeat inteligente
 */
async function processHeartbeatResponse(text, heartbeatState, pool) {
  const https = require('https')
  const http = require('http')

  function httpPost(url, body) {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(body)
      const parsed = new URL(url)
      const lib = parsed.protocol === 'https:' ? https : http
      const opts = {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      }
      const req = lib.request(opts, (res) => {
        let data = ''
        res.on('data', c => { data += c })
        res.on('end', () => { try { resolve(JSON.parse(data)) } catch { resolve(null) } })
      })
      req.on('error', reject)
      req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')) })
      req.write(payload)
      req.end()
    })
  }

  const lower = text.trim().toLowerCase()
  if (lower === '0' || lower === 'pular' || lower === 'skip' || lower === 'nenhum') {
    clearHeartbeatState()
    return '⏭ Ok, pulando por agora.'
  }

  const chosen = [...text.matchAll(/\d+/g)].map(m => parseInt(m[0]))
  if (chosen.length === 0) return null

  clearHeartbeatState()

  const valid = chosen
    .map(n => heartbeatState.taskMap.find(t => t.index === n))
    .filter(Boolean)

  if (valid.length === 0) return '❓ Não encontrei tasks com esses números.'

  const dispatched = []
  const errors = []

  for (const item of valid) {
    try {
      await httpPost(`${LOCAL_LISTENER_URL}/execute-task`, {
        projectId: item.projectId,
        projectName: item.projectName,
        taskId: item.taskId,
        taskTitle: item.taskTitle,
        taskDescription: item.taskDescription || '',
        taskPriority: item.taskPriority || 5,
      })
      dispatched.push(`✅ *${item.projectName}*: ${item.taskTitle}`)
    } catch (err) {
      errors.push(`❌ *${item.projectName}*: ${item.taskTitle} — ${err.message}`)
    }
  }

  let response = `🚀 *Disparando ${dispatched.length} task${dispatched.length > 1 ? 's' : ''}:*\n\n`
  if (dispatched.length) response += dispatched.join('\n') + '\n'
  if (errors.length) response += '\n' + errors.join('\n')
  response += '\n\n_Claude Code Sonnet 4.6 ativo..._'

  return response
}

let pool = null // será injetado pelo init

function init(dbPool) {
  pool = dbPool
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token) {
    console.log('⚠️  Telegram: TELEGRAM_BOT_TOKEN não configurado — bot desativado')
    return null
  }

  authorizedChatId = chatId ? String(chatId) : null

  bot = new TelegramBot(token, { polling: true })

  bot.on('message', async (msg) => {
    const incomingChatId = String(msg.chat.id)

    // Setup inicial: captura chat_id na primeira mensagem
    if (!authorizedChatId) {
      bot.sendMessage(incomingChatId,
        `🌟 *Polaris online!*\n\nSeu Chat ID: \`${incomingChatId}\`\n\nAdicione no \`api/.env\`:\n\`\`\`\nTELEGRAM_CHAT_ID=${incomingChatId}\n\`\`\`\nDepois reinicie a API.`,
        { parse_mode: 'Markdown' }
      )
      return
    }

    if (incomingChatId !== authorizedChatId) return

    const text = (msg.text || '').trim()
    if (!text) return

    try {
      // ── Verificar se é resposta a decisão estratégica pendente ──
      if (pendingDecisions.size > 0) {
        const upper = text.toUpperCase()
        if (['SIM', 'S', 'YES', 'Y', '1'].includes(upper)) {
          const [id, decision] = [...pendingDecisions.entries()][0]
          pendingDecisions.delete(id)
          decision.resolve(true)
          bot.sendMessage(authorizedChatId, '✅ Aprovado. Continuando...')
          return
        }
        if (['NÃO', 'NAO', 'N', 'NO', '0'].includes(upper)) {
          const [id, decision] = [...pendingDecisions.entries()][0]
          pendingDecisions.delete(id)
          decision.resolve(false)
          bot.sendMessage(authorizedChatId, '❌ Cancelado.')
          return
        }
      }

      // ── Comandos de sistema ──────────────────────────────────────
      if (text === '/chatid') {
        bot.sendMessage(incomingChatId, `Chat ID: \`${incomingChatId}\``, { parse_mode: 'Markdown' })
        return
      }

      if (text === '/reset' || text === '/start') {
        const agent = require('./ai-agent')
        agent.clearHistory()
        bot.sendMessage(authorizedChatId,
          `🔄 *Polaris reiniciado.*\n\nHistórico de conversa limpo. Pode falar.`,
          { parse_mode: 'Markdown' }
        )
        return
      }

      if (text === '/status') {
        // Atalho rápido para status geral sem passar pelo agente
        bot.sendChatAction(authorizedChatId, 'typing').catch(() => {})
        const agent = require('./ai-agent')
        const response = await agent.processMessage('me dá um resumo rápido do status de todos os projetos', pool)
        await sendResponse(authorizedChatId, response)
        return
      }

      if (text === '/pending') {
        handlePending(incomingChatId)
        return
      }

      if (text === '/heartbeat') {
        // Dispara o heartbeat inteligente manualmente
        bot.sendChatAction(authorizedChatId, 'typing').catch(() => {})
        const { execFile } = require('child_process')
        execFile('node', ['/root/rvm-api/heartbeat-smart.js'], (err) => {
          if (err) bot.sendMessage(authorizedChatId, `❌ Erro ao acionar heartbeat: ${err.message}`)
        })
        bot.sendMessage(authorizedChatId, '⏳ Buscando pendências...')
        return
      }

      if (text === '/micro') {
        // Status micro de todos os projetos — funcionalidades em linguagem humana
        bot.sendChatAction(authorizedChatId, 'typing').catch(() => {})
        const agent = require('./ai-agent')
        const response = await agent.processMessage(
          `Me dá o status micro de todos os projetos ativos. Para cada projeto, descreva em 1 linha o que está funcionando e o que está pendente. Use linguagem de usuário, não técnica. Formato: emoji + nome do projeto + status funcional. Máximo 3 projetos por mensagem se forem muitos.`,
          pool
        )
        await sendResponse(authorizedChatId, response)
        return
      }

      // ── Verifica se é resposta ao heartbeat inteligente ──────────
      if (isHeartbeatResponse(text)) {
        const heartbeatState = loadHeartbeatState()
        if (heartbeatState) {
          const result = await processHeartbeatResponse(text, heartbeatState, pool)
          if (result) {
            await sendResponse(authorizedChatId, result)
            return
          }
        }
      }

      // ── Tudo vai para o Kerberos ─────────────────────────────────
      bot.sendChatAction(authorizedChatId, 'typing').catch(() => {})

      const agent = require('./ai-agent')
      const response = await agent.processMessage(text, pool)

      await sendResponse(authorizedChatId, response)

    } catch (err) {
      console.error('[Telegram handler error]', err)
      bot.sendMessage(authorizedChatId, `❌ Erro interno: ${err.message}`).catch(() => {})
    }
  })

  bot.on('polling_error', (err) => {
    if (err.code !== 'ETELEGRAM') {
      console.error('[Telegram polling]', err.code, err.message)
    }
  })

  console.log('🌟 Polaris (Squad Leader) ativo no Telegram')
  return bot
}

function handlePending(chatId) {
  if (pendingDecisions.size === 0) {
    return bot.sendMessage(chatId, '✅ Nenhuma decisão pendente.')
  }
  const lines = [...pendingDecisions.entries()].map(([, d]) => {
    const mins = Math.floor((Date.now() - d.timestamp) / 60000)
    return `❓ ${d.question}\n_há ${mins}min_`
  })
  bot.sendMessage(chatId,
    `*Decisões aguardando:*\n\n${lines.join('\n\n')}\n\nResponda *SIM* ou *NÃO*`,
    { parse_mode: 'Markdown' }
  )
}

// ── API Pública ───────────────────────────────────────────────────────────────

function notify(message) {
  if (!bot || !authorizedChatId) return Promise.resolve()
  return bot.sendMessage(authorizedChatId, message, { parse_mode: 'Markdown' }).catch(() => {})
}

function askStrategic(question, timeoutMs = 15 * 60 * 1000) {
  if (!bot || !authorizedChatId) {
    console.log(`[STRATEGIC — sem bot, auto-aprovando] ${question}`)
    return Promise.resolve(true)
  }

  return new Promise((resolve) => {
    const id = Date.now().toString()
    pendingDecisions.set(id, { question, resolve, timestamp: Date.now() })

    bot.sendMessage(authorizedChatId,
      `🚨 *DECISÃO ESTRATÉGICA*\n\n${question}\n\nResponda *SIM* para aprovar ou *NÃO* para cancelar.\n_Timeout: ${timeoutMs / 60000}min_`,
      { parse_mode: 'Markdown' }
    ).catch(() => {})

    setTimeout(() => {
      if (pendingDecisions.has(id)) {
        pendingDecisions.delete(id)
        notify(`⏰ Timeout — decisão auto-aprovada:\n_${question.slice(0, 100)}_`)
        resolve(true)
      }
    }, timeoutMs)
  })
}

function notifyStatusChange(projectName, oldStatus, newStatus) {
  const emoji = { production: '🟢', development: '🔵', attention: '🟡', down: '🔴' }
  return notify(`${emoji[newStatus] || '⚪'} *Status alterado*\n*${projectName}*: ${oldStatus} → ${newStatus}`)
}

function notifyAlert(title, details) {
  return notify(`🚨 *ALERTA*\n*${title}*\n\n${details}`)
}

module.exports = { init, notify, askStrategic, notifyStatusChange, notifyAlert }
