/**
 * CI/CD Monitor Module
 *
 * Polls GitHub Actions workflows for all projects,
 * stores results in ci_builds table,
 * alerts via Telegram on failures with AI-suggested fixes.
 */

const telegram = require('./telegram')

let pool = null
let pollInterval = null

function init(dbPool) {
  pool = dbPool
  // Start polling every 5 minutes
  pollInterval = setInterval(() => pollAllProjects().catch(console.error), 5 * 60 * 1000)
  // Initial poll after 30s (give API time to start)
  setTimeout(() => pollAllProjects().catch(console.error), 30_000)
  console.log('🔄 CI/CD Monitor: polling ativo (cada 5min)')
}

function stop() {
  if (pollInterval) clearInterval(pollInterval)
}

// ── GitHub API helpers ──────────────────────────────────────────────

function parseGithubUrl(url) {
  if (!url) return null
  const match = url.match(/github\.com\/([^\/]+)\/([^\/\.\s]+)/)
  if (!match) return null
  return { owner: match[1], repo: match[2] }
}

function getGithubHeaders() {
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_SECRET
  const headers = { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'RVM-CI-Monitor' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

// ── Poll all projects ───────────────────────────────────────────────

async function pollAllProjects() {
  if (!pool) return
  try {
    const { rows: projects } = await pool.query(
      "SELECT id, name, github_url FROM projects WHERE github_url IS NOT NULL AND github_url != ''"
    )

    for (const project of projects) {
      try {
        await pollProject(project)
      } catch (err) {
        console.error(`[CI Monitor] Erro ao verificar ${project.name}:`, err.message)
      }
    }
  } catch (err) {
    console.error('[CI Monitor] Erro geral:', err.message)
  }
}

// ── Poll a single project ───────────────────────────────────────────

async function pollProject(project) {
  const gh = parseGithubUrl(project.github_url)
  if (!gh) return

  const headers = getGithubHeaders()
  const url = `https://api.github.com/repos/${gh.owner}/${gh.repo}/actions/runs?per_page=10`

  const res = await fetch(url, { headers })
  if (!res.ok) {
    if (res.status === 404) return // repo sem actions
    throw new Error(`GitHub API ${res.status}: ${await res.text()}`)
  }

  const data = await res.json()
  const runs = data.workflow_runs || []

  for (const run of runs) {
    await processRun(project, run)
  }
}

// ── Process a single workflow run ───────────────────────────────────

async function processRun(project, run) {
  // Check if we already have this run
  const existing = await pool.query(
    'SELECT id, conclusion FROM ci_builds WHERE project_id = $1 AND run_id = $2',
    [project.id, run.id]
  )

  const duration = run.updated_at && run.created_at
    ? Math.round((new Date(run.updated_at) - new Date(run.created_at)) / 1000)
    : null

  const buildData = {
    project_id: project.id,
    run_id: run.id,
    run_number: run.run_number,
    workflow_name: run.name,
    branch: run.head_branch,
    commit_sha: run.head_sha,
    commit_message: run.head_commit?.message || null,
    status: run.status,
    conclusion: run.conclusion,
    started_at: run.created_at,
    completed_at: run.updated_at,
    duration_seconds: duration,
    logs_url: run.html_url,
  }

  if (existing.rows.length === 0) {
    // Insert new build
    await pool.query(
      `INSERT INTO ci_builds (project_id, run_id, run_number, workflow_name, branch, commit_sha, commit_message, status, conclusion, started_at, completed_at, duration_seconds, logs_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (project_id, run_id) DO NOTHING`,
      [buildData.project_id, buildData.run_id, buildData.run_number, buildData.workflow_name, buildData.branch, buildData.commit_sha, buildData.commit_message, buildData.status, buildData.conclusion, buildData.started_at, buildData.completed_at, buildData.duration_seconds, buildData.logs_url]
    )

    // Alert on failure (only for newly discovered failures)
    if (run.conclusion === 'failure' || run.conclusion === 'timed_out') {
      await handleBuildFailure(project, run, buildData)
    }
  } else if (existing.rows[0].conclusion !== run.conclusion && run.conclusion) {
    // Update existing build that changed conclusion
    await pool.query(
      `UPDATE ci_builds SET status = $1, conclusion = $2, completed_at = $3, duration_seconds = $4, updated_at = NOW()
       WHERE project_id = $5 AND run_id = $6`,
      [run.status, run.conclusion, run.updated_at, duration, project.id, run.id]
    )

    // Alert on newly failed build
    if (run.conclusion === 'failure' && existing.rows[0].conclusion !== 'failure') {
      await handleBuildFailure(project, run, buildData)
    }
  }
}

// ── Handle build failure ────────────────────────────────────────────

async function handleBuildFailure(project, run, buildData) {
  const commitMsg = buildData.commit_message?.split('\n')[0] || 'sem mensagem'
  const branch = buildData.branch || 'unknown'
  const sha = buildData.commit_sha?.substring(0, 7) || '???'

  // Try to get failure logs for AI analysis
  let errorSummary = ''
  let aiSuggestion = ''

  try {
    const logData = await fetchFailureLogs(project, run.id)
    errorSummary = logData.summary || ''

    if (errorSummary) {
      aiSuggestion = await generateAISuggestion(project.name, errorSummary, commitMsg, branch)
    }
  } catch (err) {
    console.error(`[CI Monitor] Erro ao buscar logs para ${project.name}:`, err.message)
  }

  // Store error summary and AI suggestion
  if (errorSummary || aiSuggestion) {
    await pool.query(
      'UPDATE ci_builds SET error_summary = $1, ai_suggestion = $2, updated_at = NOW() WHERE project_id = $3 AND run_id = $4',
      [errorSummary || null, aiSuggestion || null, project.id, run.id]
    )
  }

  // Send Telegram alert
  const lines = [
    `🔴 *Build falhou!*`,
    ``,
    `*Projeto:* ${project.name}`,
    `*Workflow:* ${buildData.workflow_name || 'CI'}`,
    `*Branch:* \`${branch}\``,
    `*Commit:* \`${sha}\` — ${commitMsg}`,
    `*Duração:* ${buildData.duration_seconds ? `${Math.round(buildData.duration_seconds / 60)}min` : '—'}`,
  ]

  if (errorSummary) {
    lines.push(``, `*Erro:*`, `\`\`\``, errorSummary.substring(0, 500), `\`\`\``)
  }

  if (aiSuggestion) {
    lines.push(``, `💡 *Sugestão de fix:*`, aiSuggestion.substring(0, 800))
  }

  lines.push(``, `[Ver no GitHub](${buildData.logs_url})`)

  await telegram.notify(lines.join('\n'))
}

// ── Fetch failure logs from GitHub Actions ──────────────────────────

async function fetchFailureLogs(project, runId) {
  const gh = parseGithubUrl(project.github_url)
  if (!gh) return { summary: '' }

  const headers = getGithubHeaders()

  // Get failed jobs
  const jobsRes = await fetch(
    `https://api.github.com/repos/${gh.owner}/${gh.repo}/actions/runs/${runId}/jobs`,
    { headers }
  )
  if (!jobsRes.ok) return { summary: '' }

  const jobsData = await jobsRes.json()
  const failedJobs = (jobsData.jobs || []).filter(j => j.conclusion === 'failure')

  if (failedJobs.length === 0) return { summary: '' }

  // Extract error from failed steps
  const errors = []
  for (const job of failedJobs) {
    const failedSteps = (job.steps || []).filter(s => s.conclusion === 'failure')
    for (const step of failedSteps) {
      errors.push(`Job: ${job.name} / Step: ${step.name} (${step.conclusion})`)
    }
  }

  // Try to fetch actual log content (truncated)
  try {
    const logRes = await fetch(
      `https://api.github.com/repos/${gh.owner}/${gh.repo}/actions/jobs/${failedJobs[0].id}/logs`,
      { headers }
    )
    if (logRes.ok) {
      const logText = await logRes.text()
      // Extract last error-like lines
      const lines = logText.split('\n')
      const errorLines = lines.filter(l =>
        /error|fail|exception|cannot|not found|unexpected/i.test(l)
      ).slice(-10)
      if (errorLines.length > 0) {
        errors.push('---', ...errorLines)
      }
    }
  } catch {
    // Log fetching is best-effort
  }

  return { summary: errors.join('\n').substring(0, 2000) }
}

// ── AI-powered fix suggestion ───────────────────────────────────────

async function generateAISuggestion(projectName, errorSummary, commitMessage, branch) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return generateKeywordSuggestion(errorSummary)
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Você é um assistente de CI/CD. Um build falhou no projeto "${projectName}" (branch: ${branch}).

Commit: ${commitMessage}

Erro do build:
${errorSummary.substring(0, 1000)}

Dê uma sugestão curta (máx 3 linhas) de como resolver o problema. Responda em português. Seja direto e prático.`
        }]
      })
    })

    if (!res.ok) return generateKeywordSuggestion(errorSummary)

    const data = await res.json()
    return data.content?.[0]?.text || generateKeywordSuggestion(errorSummary)
  } catch {
    return generateKeywordSuggestion(errorSummary)
  }
}

// Fallback: keyword-based suggestion
function generateKeywordSuggestion(errorSummary) {
  const lower = errorSummary.toLowerCase()

  if (lower.includes('enospc') || lower.includes('no space'))
    return '💾 Disco cheio. Limpe caches ou aumente o storage do runner.'
  if (lower.includes('timeout') || lower.includes('timed out'))
    return '⏱️ Timeout. Verifique testes lentos ou aumente o timeout do workflow.'
  if (lower.includes('module not found') || lower.includes('cannot find module'))
    return '📦 Módulo não encontrado. Verifique package.json e rode `npm install`.'
  if (lower.includes('type error') || lower.includes('typeerror'))
    return '🔧 TypeError no código. Verifique tipos e valores null/undefined.'
  if (lower.includes('syntax error') || lower.includes('syntaxerror'))
    return '📝 Erro de sintaxe. Verifique o código do último commit.'
  if (lower.includes('permission') || lower.includes('eacces'))
    return '🔐 Erro de permissão. Verifique permissões de arquivo e tokens.'
  if (lower.includes('npm err') || lower.includes('npm warn'))
    return '📦 Erro npm. Tente limpar cache: `npm cache clean --force && npm ci`.'
  if (lower.includes('test') && lower.includes('fail'))
    return '🧪 Testes falhando. Rode localmente para investigar: `npm test`.'
  if (lower.includes('lint') || lower.includes('eslint'))
    return '🔍 Lint falhou. Rode `npm run lint -- --fix` localmente.'
  if (lower.includes('build') && lower.includes('fail'))
    return '🏗️ Build falhou. Verifique erros de compilação no último commit.'

  return '🔍 Verifique os logs detalhados no GitHub Actions para mais contexto.'
}

// ── Manual poll trigger ─────────────────────────────────────────────

async function pollProjectById(projectId) {
  if (!pool) throw new Error('CI Monitor não inicializado')
  const { rows } = await pool.query('SELECT id, name, github_url FROM projects WHERE id = $1', [projectId])
  if (rows.length === 0) throw new Error('Projeto não encontrado')
  await pollProject(rows[0])
  return { ok: true, project: rows[0].name }
}

module.exports = { init, stop, pollAllProjects, pollProjectById }
