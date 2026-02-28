/**
 * AI Interpreter — converte linguagem natural em item estruturado do roadmap
 * Usa Claude via Anthropic SDK
 */

const Anthropic = require('@anthropic-ai/sdk')

const PHASES = [
  { id: 'fase_0', label: 'Fase 0 — Estabilizar MVP' },
  { id: 'aba_1', label: 'Aba 1: Dashboard' },
  { id: 'aba_2', label: 'Aba 2: Time Machine (Commits)' },
  { id: 'aba_3', label: 'Aba 3: Jornada SHARK' },
  { id: 'aba_4', label: 'Aba 4: Cost Monitor' },
  { id: 'aba_5', label: 'Aba 5: Integrações + MCP Auto-Sync' },
  { id: 'aba_6', label: 'Aba 6: Health Score (Kerberos)' },
  { id: 'heartbeat', label: 'Heartbeat System' },
  { id: 'telegram', label: 'Telegram Integration' },
  { id: 'memory_bank', label: 'Memory Bank' },
  { id: 'mobile', label: 'RVM Mobile (PWA)' },
  { id: 'backlog', label: 'Backlog' },
]

const SYSTEM_PROMPT = `Você é o assistente de roadmap do RVM (RedPro Vibecoding Manager).

O RVM é um SaaS de gestão de projetos para vibecoders que usam o Método S.H.A.R.K. e o Google Antigravity IDE.

Fases do projeto:
${PHASES.map(p => `- ${p.id}: ${p.label}`).join('\n')}

Sua tarefa: converter uma mensagem em linguagem natural em um item estruturado de roadmap.

Responda APENAS com JSON válido, sem markdown, sem explicação:
{
  "phase": "<phase_id>",
  "phase_label": "<phase_label>",
  "title": "<título conciso da feature, max 80 chars>",
  "description": "<descrição técnica clara do que precisa ser feito, max 300 chars>",
  "priority": "high|medium|low"
}

Regras:
- Se a mensagem mencionar uma nova ideia de feature → identifique a fase mais adequada
- Se mencionar bug ou problema → fase mais relevante, priority high
- Se for uma melhoria pequena → priority medium ou low
- Se não se encaixar em nenhuma fase → use "backlog"
- O título deve ser uma feature/ação, não uma pergunta
- Responda em português`

/**
 * Interpreta texto em linguagem natural e retorna item estruturado de roadmap
 * @param {string} text - Mensagem do usuário
 * @returns {Promise<{phase, phase_label, title, description, priority}>}
 */
async function parseRoadmapItem(text) {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    // Fallback sem API key — extrai o básico do texto
    return fallbackParse(text)
  }

  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: text }],
  })

  const raw = response.content[0].text.trim()

  // Remove markdown caso venha com ```json
  const clean = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim()
  const parsed = JSON.parse(clean)

  // Valida campos mínimos
  if (!parsed.phase || !parsed.title) throw new Error('Resposta inválida da IA')

  // Garante que phase_label está preenchido
  if (!parsed.phase_label) {
    const found = PHASES.find(p => p.id === parsed.phase)
    parsed.phase_label = found ? found.label : 'Backlog'
  }

  return parsed
}

/**
 * Fallback sem API key — classificação simples por keywords
 */
function fallbackParse(text) {
  const lower = text.toLowerCase()

  let phase = 'backlog'
  let phase_label = 'Backlog'

  if (lower.includes('telegram') || lower.includes('bot') || lower.includes('notif')) {
    phase = 'telegram'; phase_label = 'Telegram Integration'
  } else if (lower.includes('heartbeat') || lower.includes('monitor') || lower.includes('ping')) {
    phase = 'heartbeat'; phase_label = 'Heartbeat System'
  } else if (lower.includes('commit') || lower.includes('git') || lower.includes('histórico') || lower.includes('timeline')) {
    phase = 'aba_2'; phase_label = 'Aba 2: Time Machine (Commits)'
  } else if (lower.includes('dashboard') || lower.includes('status') || lower.includes('card')) {
    phase = 'aba_1'; phase_label = 'Aba 1: Dashboard'
  } else if (lower.includes('shark') || lower.includes('shiva') || lower.includes('atlas') || lower.includes('agente')) {
    phase = 'aba_3'; phase_label = 'Aba 3: Jornada SHARK'
  } else if (lower.includes('custo') || lower.includes('token') || lower.includes('burn') || lower.includes('gasto')) {
    phase = 'aba_4'; phase_label = 'Aba 4: Cost Monitor'
  } else if (lower.includes('mcp') || lower.includes('integr') || lower.includes('vercel') || lower.includes('supabase')) {
    phase = 'aba_5'; phase_label = 'Aba 5: Integrações + MCP Auto-Sync'
  } else if (lower.includes('score') || lower.includes('saúde') || lower.includes('kerberos') || lower.includes('segur')) {
    phase = 'aba_6'; phase_label = 'Aba 6: Health Score (Kerberos)'
  } else if (lower.includes('mobile') || lower.includes('celular') || lower.includes('pwa')) {
    phase = 'mobile'; phase_label = 'RVM Mobile (PWA)'
  } else if (lower.includes('memória') || lower.includes('contexto') || lower.includes('sessão')) {
    phase = 'memory_bank'; phase_label = 'Memory Bank'
  }

  const priority = (lower.includes('urgent') || lower.includes('crítico') || lower.includes('bug') || lower.includes('erro'))
    ? 'high'
    : lower.includes('depois') || lower.includes('futuro') || lower.includes('ideia')
    ? 'low'
    : 'medium'

  return {
    phase,
    phase_label,
    title: text.slice(0, 80),
    description: text,
    priority,
  }
}

module.exports = { parseRoadmapItem }
