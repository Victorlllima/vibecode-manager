/**
 * Roadmap Sync — regenera ROADMAP.md a partir do banco de dados
 *
 * Fonte de verdade: tabela roadmap_items no PostgreSQL
 * Output: ROADMAP.md na raiz do projeto (atualizado automaticamente)
 */

const fs = require('fs').promises
const path = require('path')

const ROADMAP_PATH = path.join(__dirname, '..', 'ROADMAP.md')

// Seções estáticas do roadmap que não são gerenciadas pelo banco
// (stack, arquitetura, ordem de implementação)
const STATIC_HEADER = `# 🦈 RVM — ROADMAP COMPLETO
## RedPro Vibecoding Manager
### Fonte de verdade: PostgreSQL → roadmap_items
### Atualizado automaticamente via Telegram

---

## VISÃO GERAL

O RVM é um SaaS parceiro de desenvolvimento para vibecoders que usam o **Google Antigravity IDE** e o **Método S.H.A.R.K.**

**Comunicação:** MCP (Model Context Protocol) + WebSocket + Telegram Bot
**IDE alvo:** Google Antigravity (agent-first, fork VS Code)
**Público:** Alunos do método SHARK e vibecoders em geral

---

## STACK ATUAL

| Camada | Tecnologia | Status |
|--------|-----------|--------|
| Frontend | Next.js 16 + React 19 + App Router | ✅ Online |
| Auth | NextAuth.js v5 + GitHub OAuth | ✅ Configurado |
| Backend | Express.js — porta 4000 | ✅ Online |
| Banco | PostgreSQL via Tailscale (100.64.77.5:5434) | ✅ Online |
| UI | Tailwind CSS v4 + Radix UI | ✅ Funcionando |
| GitHub API | @octokit/rest + @octokit/webhooks | ✅ Instalado |
| Telegram | node-telegram-bot-api | ✅ Ativo |
| IA | Anthropic Claude (Haiku) | ✅ Configurado |

---

## ROADMAP DE FEATURES

`

const STATIC_FOOTER = `
---

## ORDEM DE IMPLEMENTAÇÃO

\`\`\`
Fase 0: Estabilizar MVP ← EM ANDAMENTO
    ↓
Fase 1: Heartbeat System
    ↓
Fase 2: Dashboard Real + Mapa de Commits
    ↓
Fase 3: Telegram Integration ← ATIVO
    ↓
Fase 4: Jornada SHARK + Health Score
    ↓
Fase 5: MCP Auto-Sync + Integrações
    ↓
Fase 6: Cost Monitor + Memory Bank
    ↓
Fase 7: Mobile PWA + Deploy Produção
\`\`\`

---

## NOTAS DE INFRAESTRUTURA

- **Banco**: porta 5432 interceptada pelo pooler → usar 5434 (rvm-pg-proxy socat)
- **Tailwind v4**: obrigatório \`postcss.config.js\` + valores \`hsl()\` no \`@theme inline\`
- **Telegram**: modo estratégico — só interrupe Red para decisões de alto impacto
- **Linguagem natural**: qualquer mensagem sem / no Telegram vira item no roadmap

---

*Gerado automaticamente por roadmap-sync.js — não edite manualmente*
*Projeto: RVM — RedPro Vibecoding Manager · RedPro AI Academy*
`

const PHASE_ORDER = [
  'fase_0', 'aba_1', 'aba_2', 'aba_3', 'aba_4',
  'aba_5', 'aba_6', 'heartbeat', 'telegram',
  'memory_bank', 'mobile', 'backlog'
]

const STATUS_ICON = { done: '✅', in_progress: '🔵', pending: '⬜' }
const PRIORITY_ICON = { high: '🔴', medium: '🟡', low: '🟢' }
const SOURCE_ICON = { telegram: '📱', ai: '🤖', manual: '📄' }

/**
 * Regenera o ROADMAP.md completo a partir do banco
 */
async function regenerate(pool) {
  const result = await pool.query(
    `SELECT * FROM roadmap_items ORDER BY
       CASE phase
         WHEN 'fase_0' THEN 1 WHEN 'aba_1' THEN 2 WHEN 'aba_2' THEN 3
         WHEN 'aba_3' THEN 4 WHEN 'aba_4' THEN 5 WHEN 'aba_5' THEN 6
         WHEN 'aba_6' THEN 7 WHEN 'heartbeat' THEN 8 WHEN 'telegram' THEN 9
         WHEN 'memory_bank' THEN 10 WHEN 'mobile' THEN 11 ELSE 99
       END,
       CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
       created_at ASC`
  )

  // Agrupa por fase
  const byPhase = {}
  for (const item of result.rows) {
    if (!byPhase[item.phase]) {
      byPhase[item.phase] = { label: item.phase_label, items: [] }
    }
    byPhase[item.phase].items.push(item)
  }

  let sections = ''

  for (const phase of PHASE_ORDER) {
    if (!byPhase[phase]) continue
    const { label, items } = byPhase[phase]

    const doneCount = items.filter(i => i.status === 'done').length
    const total = items.length
    const progressBar = total > 0 ? `[${doneCount}/${total}]` : ''

    sections += `### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    sections += `### ${label} ${progressBar}\n`
    sections += `### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`

    for (const item of items) {
      const status = STATUS_ICON[item.status] || '⬜'
      const priority = PRIORITY_ICON[item.priority] || ''
      const source = item.source !== 'manual' ? ` ${SOURCE_ICON[item.source] || ''}` : ''
      sections += `- ${status} ${priority} **${item.title}**${source}\n`
      if (item.description && item.description !== item.title) {
        sections += `  _${item.description.slice(0, 150)}_\n`
      }
    }
    sections += '\n'
  }

  // Monta o arquivo completo
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const content = STATIC_HEADER +
    `> Última atualização: ${now}\n\n` +
    sections +
    STATIC_FOOTER

  await fs.writeFile(ROADMAP_PATH, content, 'utf8')
  console.log(`[roadmap-sync] ROADMAP.md regenerado (${result.rows.length} items)`)

  return result.rows.length
}

/**
 * Seed inicial — importa os items do ROADMAP.md atual para o banco
 * Só roda se a tabela estiver vazia
 */
async function seedFromRoadmap(pool) {
  const { rows } = await pool.query('SELECT COUNT(*) as count FROM roadmap_items')
  if (parseInt(rows[0].count) > 0) {
    console.log('[roadmap-sync] Seed ignorado — tabela já tem dados')
    return
  }

  const seed = [
    // Fase 0
    { phase: 'fase_0', phase_label: 'Fase 0 — Estabilizar MVP', title: 'Frontend rodando em localhost:5000 sem erros', status: 'done', priority: 'high' },
    { phase: 'fase_0', phase_label: 'Fase 0 — Estabilizar MVP', title: 'Tailwind CSS v4 funcionando com postcss.config.js', status: 'done', priority: 'high' },
    { phase: 'fase_0', phase_label: 'Fase 0 — Estabilizar MVP', title: 'Login page customizada RVM (sem placeholder genérico)', status: 'done', priority: 'high' },
    { phase: 'fase_0', phase_label: 'Fase 0 — Estabilizar MVP', title: 'Dashboard real implementado (sem HeroDemo)', status: 'done', priority: 'high' },
    { phase: 'fase_0', phase_label: 'Fase 0 — Estabilizar MVP', title: 'API Express respondendo em localhost:4000/health', status: 'done', priority: 'high' },
    { phase: 'fase_0', phase_label: 'Fase 0 — Estabilizar MVP', title: 'PostgreSQL conectado via Tailscale (porta 5434)', status: 'done', priority: 'high' },
    { phase: 'fase_0', phase_label: 'Fase 0 — Estabilizar MVP', title: 'Testar login GitHub OAuth end-to-end', status: 'pending', priority: 'high' },
    // Heartbeat
    { phase: 'heartbeat', phase_label: 'Heartbeat System', title: 'Endpoints Express: POST/GET /api/heartbeat/*', status: 'done', priority: 'high' },
    { phase: 'heartbeat', phase_label: 'Heartbeat System', title: 'Heartbeat daemon Python (15min) com self-healing', status: 'pending', priority: 'high' },
    { phase: 'heartbeat', phase_label: 'Heartbeat System', title: 'Widget no Dashboard: último ping + tendência', status: 'pending', priority: 'high' },
    { phase: 'heartbeat', phase_label: 'Heartbeat System', title: 'Alerta Telegram se heartbeat falhar 2+ ciclos', status: 'pending', priority: 'high' },
    // Telegram
    { phase: 'telegram', phase_label: 'Telegram Integration', title: 'Bot ativo com polling e chat_id autorizado', status: 'done', priority: 'high' },
    { phase: 'telegram', phase_label: 'Telegram Integration', title: 'Linguagem natural → roadmap via IA (Claude Haiku)', status: 'done', priority: 'high' },
    { phase: 'telegram', phase_label: 'Telegram Integration', title: 'Modo estratégico: só interrompe para decisões de alto impacto', status: 'done', priority: 'high' },
    { phase: 'telegram', phase_label: 'Telegram Integration', title: 'Notificações: deploy, status change, health score', status: 'pending', priority: 'high' },
    { phase: 'telegram', phase_label: 'Telegram Integration', title: 'Relatório diário automático às 08h', status: 'pending', priority: 'medium' },
    { phase: 'telegram', phase_label: 'Telegram Integration', title: 'Configurar ANTHROPIC_API_KEY para IA completa', status: 'pending', priority: 'high' },
    // Dashboard
    { phase: 'aba_1', phase_label: 'Aba 1: Dashboard', title: 'Cards por projeto com status em tempo real', status: 'pending', priority: 'high' },
    { phase: 'aba_1', phase_label: 'Aba 1: Dashboard', title: 'Heartbeat Widget com último ping e tendência', status: 'pending', priority: 'high' },
    { phase: 'aba_1', phase_label: 'Aba 1: Dashboard', title: 'Telegram Quick Status — 1 clique envia status', status: 'pending', priority: 'medium' },
    // Time Machine
    { phase: 'aba_2', phase_label: 'Aba 2: Time Machine (Commits)', title: 'Heat map de commits estilo GitHub contribution graph', status: 'pending', priority: 'high' },
    { phase: 'aba_2', phase_label: 'Aba 2: Time Machine (Commits)', title: 'Timeline horizontal com bolinhas coloridas', status: 'pending', priority: 'high' },
    { phase: 'aba_2', phase_label: 'Aba 2: Time Machine (Commits)', title: 'One-Click Rollback com alerta de risco', status: 'pending', priority: 'medium' },
    // SHARK Journey
    { phase: 'aba_3', phase_label: 'Aba 3: Jornada SHARK', title: 'Timeline visual dos 5 agentes SHARK', status: 'pending', priority: 'high' },
    { phase: 'aba_3', phase_label: 'Aba 3: Jornada SHARK', title: 'Progresso automático por estado das tasks', status: 'pending', priority: 'high' },
    // Health Score
    { phase: 'aba_6', phase_label: 'Aba 6: Health Score (Kerberos)', title: 'Score 0-10 por projeto com breakdown visual', status: 'pending', priority: 'high' },
    { phase: 'aba_6', phase_label: 'Aba 6: Health Score (Kerberos)', title: 'Alerta Telegram quando score cai abaixo do threshold', status: 'pending', priority: 'high' },
  ]

  for (const item of seed) {
    await pool.query(
      `INSERT INTO roadmap_items (phase, phase_label, title, description, status, priority, source)
       VALUES ($1, $2, $3, $4, $5, $6, 'manual')`,
      [item.phase, item.phase_label, item.title, item.description || null, item.status || 'pending', item.priority]
    )
  }

  console.log(`[roadmap-sync] Seed: ${seed.length} items inseridos`)
  await regenerate(pool)
}

module.exports = { regenerate, seedFromRoadmap }
