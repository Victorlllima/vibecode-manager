/**
 * Autonomous Dev Agent Module
 *
 * Picks the next pending task from a project's roadmap,
 * sends it to Claude Code via rvm-listener for execution,
 * tracks progress, and reports results via Telegram.
 *
 * Flow:
 *   1. Pick highest-priority pending task
 *   2. Mark task as in_progress
 *   3. Send task to rvm-listener → Claude Code
 *   4. Wait for result
 *   5. If success → mark task as done, commit, notify
 *   6. If failure → mark back as pending, notify with error
 *
 * Safety:
 *   - Only runs when explicitly triggered (no auto-loop)
 *   - Telegram confirmation required for commits
 *   - Max 1 task at a time per project
 *   - Timeout after 10 minutes
 */

const telegram = require('./telegram')

let pool = null

const LISTENER_URL = process.env.LISTENER_URL || 'http://100.69.142.117:4001'
const TASK_TIMEOUT = 10 * 60 * 1000 // 10 minutes

// Track active executions
const activeJobs = new Map()

function init(dbPool) {
  pool = dbPool
  console.log('🤖 Dev Agent: pronto (modo manual)')
}

// ── Pick next task ──────────────────────────────────────────────────────────

async function pickNextTask(projectId) {
  if (!pool) throw new Error('Dev Agent não inicializado')

  // Check if there's already an active job for this project
  if (activeJobs.has(projectId)) {
    throw new Error('Já existe uma task em execução neste projeto')
  }

  // Pick highest priority pending task
  const { rows } = await pool.query(
    `SELECT * FROM project_tasks
     WHERE project_id = $1 AND status = 'pending'
     ORDER BY
       CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
       sort_order ASC,
       created_at ASC
     LIMIT 1`,
    [projectId]
  )

  if (rows.length === 0) return null
  return rows[0]
}

// ── Execute task ────────────────────────────────────────────────────────────

async function executeTask(projectId, taskId) {
  if (!pool) throw new Error('Dev Agent não inicializado')

  // Fetch task
  const { rows: tasks } = await pool.query(
    'SELECT * FROM project_tasks WHERE id = $1 AND project_id = $2',
    [taskId, projectId]
  )
  if (tasks.length === 0) throw new Error('Task não encontrada')
  const task = tasks[0]

  // Fetch project info
  const { rows: projects } = await pool.query(
    'SELECT * FROM projects WHERE id = $1',
    [projectId]
  )
  if (projects.length === 0) throw new Error('Projeto não encontrado')
  const project = projects[0]

  // Mark as in_progress
  await pool.query(
    "UPDATE project_tasks SET status = 'in_progress', updated_at = NOW() WHERE id = $1",
    [taskId]
  )

  // Create job tracker
  const job = {
    projectId,
    taskId,
    projectName: project.name,
    taskTitle: task.title,
    startedAt: new Date(),
    status: 'running',
    result: null,
  }
  activeJobs.set(projectId, job)

  // Notify Telegram
  await telegram.notify(
    `🤖 *Dev Agent: executando task*\n\n` +
    `*Projeto:* ${project.name}\n` +
    `*Task:* ${task.title}\n` +
    `*Prioridade:* ${task.priority}\n` +
    `*Categoria:* ${task.category || 'geral'}\n\n` +
    `${task.description || '_sem descrição_'}`
  )

  // Build the prompt for Claude Code
  const prompt = buildTaskPrompt(project, task)

  try {
    // Send to rvm-listener
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TASK_TIMEOUT)

    const res = await fetch(`${LISTENER_URL}/claude`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) {
      throw new Error(`Listener respondeu com status ${res.status}`)
    }

    const result = await res.json()
    job.status = 'completed'
    job.result = result

    // Ask Telegram for commit confirmation
    const shouldCommit = await telegram.askStrategic(
      `Dev Agent completou:\n*${task.title}*\n\nDeseja commitar as mudanças?`,
      5 * 60 * 1000
    )

    if (shouldCommit && project.path) {
      // Send commit command
      await fetch(`${LISTENER_URL}/claude`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `No projeto ${project.name} (${project.path}), faça git add e git commit com a mensagem: "feat: ${task.title}" — e rode os testes antes de commitar.`
        }),
      })
    }

    // Mark task as done
    await pool.query(
      "UPDATE project_tasks SET status = 'done', updated_at = NOW() WHERE id = $1",
      [taskId]
    )

    // Notify success
    await telegram.notify(
      `✅ *Dev Agent: task concluída*\n\n` +
      `*Projeto:* ${project.name}\n` +
      `*Task:* ${task.title}\n` +
      `${shouldCommit ? '📝 Commit realizado' : '⏸️ Commit pendente (não aprovado)'}`
    )

    return { ok: true, task: task.title, committed: shouldCommit }

  } catch (err) {
    job.status = 'failed'
    job.result = { error: err.message }

    // Revert task to pending
    await pool.query(
      "UPDATE project_tasks SET status = 'pending', updated_at = NOW() WHERE id = $1",
      [taskId]
    )

    // Notify failure
    await telegram.notify(
      `❌ *Dev Agent: task falhou*\n\n` +
      `*Projeto:* ${project.name}\n` +
      `*Task:* ${task.title}\n` +
      `*Erro:* ${err.message.substring(0, 500)}`
    )

    return { ok: false, task: task.title, error: err.message }

  } finally {
    activeJobs.delete(projectId)
  }
}

// ── Auto-pick and execute ───────────────────────────────────────────────────

async function autoRun(projectId) {
  const task = await pickNextTask(projectId)
  if (!task) return { ok: false, reason: 'Nenhuma task pendente' }
  return executeTask(projectId, task.id)
}

// ── Build prompt for Claude Code ────────────────────────────────────────────

function buildTaskPrompt(project, task) {
  const lines = [
    `Você é um agente de desenvolvimento autônomo trabalhando no projeto "${project.name}".`,
    ``,
    `## Contexto do Projeto`,
    `- Nome: ${project.name}`,
    `- Path: ${project.path || 'não especificado'}`,
    `- Status: ${project.status}`,
    `- Descrição: ${project.description || 'sem descrição'}`,
    ``,
    `## Task a Executar`,
    `- Título: ${task.title}`,
    `- Descrição: ${task.description || 'sem descrição adicional'}`,
    `- Prioridade: ${task.priority}`,
    `- Categoria: ${task.category || 'geral'}`,
    ``,
    `## Instruções`,
    `1. Analise o código existente no path do projeto`,
    `2. Implemente a task descrita acima`,
    `3. Siga os padrões já existentes no código`,
    `4. Mantenha o código limpo e legível`,
    `5. Se necessário, crie testes para a funcionalidade`,
    `6. NÃO faça commit — apenas implemente`,
    ``,
    `Comece pela análise do código existente e depois implemente a solução.`,
  ]
  return lines.join('\n')
}

// ── Get active jobs ─────────────────────────────────────────────────────────

function getActiveJobs() {
  return Object.fromEntries(
    [...activeJobs.entries()].map(([projectId, job]) => [
      projectId,
      {
        ...job,
        elapsed: Math.round((Date.now() - job.startedAt.getTime()) / 1000),
      }
    ])
  )
}

// ── Get execution history ───────────────────────────────────────────────────

async function getHistory(projectId, limit = 10) {
  if (!pool) return []
  const { rows } = await pool.query(
    `SELECT * FROM project_tasks
     WHERE project_id = $1 AND status = 'done'
     ORDER BY updated_at DESC
     LIMIT $2`,
    [projectId, limit]
  )
  return rows
}

module.exports = { init, pickNextTask, executeTask, autoRun, getActiveJobs, getHistory }
