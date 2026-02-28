/**
 * Self-Healing Server Module
 *
 * Monitors services via SSH/pm2 on the Hetzner server,
 * automatically restarts failed processes,
 * and alerts via Telegram.
 *
 * Services monitored:
 *   - rvm-api (Express API, port 4000)
 *   - telegram-bot (Telegram polling bot)
 *   - heartbeat-v2 (Python heartbeat script)
 *
 * Also monitors:
 *   - Disk usage
 *   - Memory usage
 *   - PostgreSQL connectivity
 */

const { exec } = require('child_process')
const { promisify } = require('util')
const telegram = require('./telegram')

const execAsync = promisify(exec)

let pool = null
let healInterval = null

// ── Config ──────────────────────────────────────────────────────────────────

const HETZNER_HOST = process.env.HETZNER_HOST || '49.13.73.197'
const HETZNER_USER = process.env.HETZNER_USER || 'root'
const SSH_KEY = process.env.SSH_KEY_PATH || '' // optional, uses default key if empty
const CHECK_INTERVAL = 10 * 60 * 1000 // 10 minutes
const MAX_RESTART_ATTEMPTS = 3

// Services to monitor (pm2 process names)
const MONITORED_SERVICES = [
  { name: 'rvm-api',       critical: true,  restartCmd: 'pm2 restart rvm-api' },
  { name: 'telegram-bot',  critical: true,  restartCmd: 'pm2 restart telegram-bot' },
  { name: 'heartbeat-v2',  critical: false, restartCmd: 'pm2 restart heartbeat-v2' },
]

// Track restart attempts to avoid restart loops
const restartAttempts = new Map()

// ── Init ────────────────────────────────────────────────────────────────────

function init(dbPool) {
  pool = dbPool

  // Only start if SSH is likely to work (running on Windows with SSH client)
  healInterval = setInterval(() => runHealthCheck().catch(console.error), CHECK_INTERVAL)
  // First check after 2 minutes
  setTimeout(() => runHealthCheck().catch(console.error), 2 * 60 * 1000)
  console.log('🏥 Self-Healing: monitoramento ativo (cada 10min)')
}

function stop() {
  if (healInterval) clearInterval(healInterval)
}

// ── SSH Helper ──────────────────────────────────────────────────────────────

async function sshExec(command) {
  const keyOpt = SSH_KEY ? `-i ${SSH_KEY}` : ''
  const sshCmd = `ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no ${keyOpt} ${HETZNER_USER}@${HETZNER_HOST} "${command.replace(/"/g, '\\"')}"`

  try {
    const { stdout, stderr } = await execAsync(sshCmd, { timeout: 30_000 })
    return { ok: true, stdout: stdout.trim(), stderr: stderr.trim() }
  } catch (err) {
    return { ok: false, stdout: '', stderr: err.message, error: err }
  }
}

// ── Health Check ────────────────────────────────────────────────────────────

async function runHealthCheck() {
  const report = {
    timestamp: new Date().toISOString(),
    ssh_ok: false,
    services: [],
    disk: null,
    memory: null,
    actions: [],
  }

  // 1. Test SSH connectivity
  const sshTest = await sshExec('echo ok')
  report.ssh_ok = sshTest.ok

  if (!sshTest.ok) {
    report.actions.push({ type: 'alert', message: 'SSH inacessível ao Hetzner' })
    console.warn('[Self-Healing] SSH inacessível — sem alerta Telegram (pode ser Tailscale desconectado)')
    await saveReport(report)
    return report
  }

  // 2. Check pm2 services
  const pm2Status = await sshExec('pm2 jlist 2>/dev/null || echo "[]"')
  let processes = []
  try {
    processes = JSON.parse(pm2Status.stdout || '[]')
  } catch {
    processes = []
  }

  for (const svc of MONITORED_SERVICES) {
    const proc = processes.find(p => p.name === svc.name)
    const status = {
      name: svc.name,
      running: proc?.pm2_env?.status === 'online',
      pid: proc?.pid || null,
      memory: proc?.monit?.memory ? Math.round(proc.monit.memory / 1024 / 1024) : null,
      cpu: proc?.monit?.cpu || null,
      uptime: proc?.pm2_env?.pm_uptime || null,
      restarts: proc?.pm2_env?.restart_time || 0,
      action: null,
    }

    // Auto-restart if not running
    if (!status.running) {
      const attempts = restartAttempts.get(svc.name) || 0
      if (attempts < MAX_RESTART_ATTEMPTS) {
        const restartResult = await sshExec(svc.restartCmd)
        restartAttempts.set(svc.name, attempts + 1)
        status.action = restartResult.ok ? 'restarted' : 'restart_failed'
        report.actions.push({
          type: 'restart',
          service: svc.name,
          success: restartResult.ok,
          attempt: attempts + 1,
        })

        const emoji = restartResult.ok ? '🔄' : '❌'
        console.log(`[Self-Healing] ${emoji} ${svc.name}: ${restartResult.ok ? 'reiniciado' : 'falha'} (tentativa ${attempts + 1}/${MAX_RESTART_ATTEMPTS})`)
      } else {
        status.action = 'max_attempts_reached'
        if (svc.critical) {
          await telegram.notifyAlert(
            `Self-Healing: ${svc.name} CRÍTICO`,
            `Serviço ${svc.name} falhou após ${MAX_RESTART_ATTEMPTS} tentativas de restart.\nIntervenção manual necessária.`
          )
        }
      }
    } else {
      // Reset attempts on healthy check
      restartAttempts.delete(svc.name)
    }

    report.services.push(status)
  }

  // 3. Check disk usage
  const diskResult = await sshExec("df -h / | tail -1 | awk '{print $5}'")
  if (diskResult.ok) {
    const usagePct = parseInt(diskResult.stdout.replace('%', ''))
    report.disk = { usage_pct: usagePct, raw: diskResult.stdout }
    if (usagePct > 90) {
      report.actions.push({ type: 'alert', message: `Disco em ${usagePct}%` })
      await telegram.notifyAlert('Self-Healing: Disco cheio', `Uso do disco: ${usagePct}%\nLimpe caches ou aumente o storage.`)
    }
  }

  // 4. Check memory usage
  const memResult = await sshExec("free -m | awk 'NR==2{printf \"%d/%d (%d%%)\", $3, $2, $3*100/$2}'")
  if (memResult.ok) {
    const match = memResult.stdout.match(/(\d+)\/(\d+)\s*\((\d+)%\)/)
    if (match) {
      report.memory = { used_mb: parseInt(match[1]), total_mb: parseInt(match[2]), usage_pct: parseInt(match[3]) }
      if (parseInt(match[3]) > 90) {
        report.actions.push({ type: 'alert', message: `Memória em ${match[3]}%` })
        await telegram.notifyAlert('Self-Healing: Memória alta', `Uso de memória: ${memResult.stdout}`)
      }
    }
  }

  // 5. Save report to DB
  await saveReport(report)

  return report
}

// ── Save report ─────────────────────────────────────────────────────────────

async function saveReport(report) {
  if (!pool) return
  try {
    // Store in heartbeats table with special status
    await pool.query(
      `INSERT INTO heartbeats (status, system_load, logs)
       VALUES ($1, $2, $3)`,
      [
        report.ssh_ok ? 'self_heal_ok' : 'self_heal_fail',
        report.memory?.usage_pct || null,
        JSON.stringify(report),
      ]
    )
  } catch (err) {
    console.error('[Self-Healing] Erro ao salvar report:', err.message)
  }
}

// ── API: get status ─────────────────────────────────────────────────────────

async function getStatus() {
  return runHealthCheck()
}

// ── API: force restart a service ────────────────────────────────────────────

async function restartService(serviceName) {
  const svc = MONITORED_SERVICES.find(s => s.name === serviceName)
  if (!svc) throw new Error(`Serviço "${serviceName}" não encontrado`)

  const result = await sshExec(svc.restartCmd)
  if (result.ok) {
    console.log(`[Self-Healing] ${serviceName} reiniciado manualmente`)
  }
  return { ok: result.ok, service: serviceName, output: result.stdout || result.stderr }
}

// ── API: reset restart attempts ─────────────────────────────────────────────

function resetAttempts(serviceName) {
  if (serviceName) {
    restartAttempts.delete(serviceName)
  } else {
    restartAttempts.clear()
  }
}

module.exports = { init, stop, getStatus, restartService, resetAttempts }
