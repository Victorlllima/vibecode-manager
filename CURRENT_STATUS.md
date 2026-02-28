# RVM — RedPro Vibecoding Manager
## Status e Versão Estável

**Versão:** v0.4.0-stable
**Data:** 2026-02-26
**Status:** ✅ ESTÁVEL — 13 projetos reais + timeline + GitHub OAuth funcionando

---

## O QUE ESTÁ FUNCIONANDO

### Frontend (Next.js 16 + React 19)
- ✅ Servidor em `http://localhost:5000`
- ✅ Login GitHub OAuth funcional (testado e confirmado)
- ✅ **AppLayout compartilhado** — header + 7 abas de navegação
- ✅ **Aba 1: Dashboard** — 13 ProjectCards clicáveis, HeartbeatWidget, refresh 30s
- ✅ **Aba 2: Time Machine** — heatmap GitHub-style, timeline, rollback modal
- ✅ **Aba 3: Jornada SHARK** — pipeline 5 agentes
- ✅ **Aba 4: Cost Monitor** — monitor de custos
- ✅ **Aba 5: Integrações** — env vars + MCP config
- ✅ **Aba 6: Health Score** — score visual SVG
- ✅ **Roadmap** (`/roadmap`) — visualização completa com filtros
- ✅ **Projetos** — `/projects/add` e `/projects/[id]` com timeline interativa
- ✅ **Timeline por projeto** — roadmap com milestones clicáveis, progresso, próximo passo sugerido

### Backend (Express.js — Hetzner, porta 4000)
- ✅ API no Hetzner: `http://100.64.77.5:4000`
- ✅ PostgreSQL via Tailscale (`100.64.77.5:5434`)
- ✅ **Nova tabela**: `project_milestones` (id, project_id, title, status, order, notes)
- ✅ **Novos endpoints**:
  - `GET /api/projects/:id/milestones` — timeline do projeto
  - `POST /api/projects/:id/milestones` — adicionar etapa
  - `PATCH /api/milestones/:id` — atualizar status (pending→in_progress→done)

### Projetos Cadastrados (13 reais)
1. RVM — RedPro Vibecoding Manager (production, P10)
2. Vitalis (development, P9)
3. RedPumpPro (development, P8)
4. Criação de Conteúdo (production, P7)
5. Nexus Agente Studio (development, P9)
6. NossoCRM (development, P8)
7. Servidor Hetzner (production, P10)
8. Vibevoice (development, P6)
9. Shark Method (production, P9)
10. OpenClaw (development, P8)
11. Pontos Livelo (development, P5)
12. HubControl (development, P7)
13. Flowdesk (development, P6)

### Telegram Bot
- ✅ Bot ativo com polling no Hetzner
- ✅ Linguagem natural → roadmap via Claude Haiku
- ✅ CONTINUE_KEYWORDS → dispara Claude Code local
- ✅ Relatório diário automático às 08h (cron)
- ✅ Notificações de status por projeto com progresso de milestones

### Heartbeat System
- ✅ `heartbeat-v2.py` no Hetzner (ping 15min)
- ✅ Caso A: auto-trigger se roadmap > 120min sem atividade

### rvm-listener (Claude Code local)
- ✅ pm2 porta 4001 no Windows
- ✅ Acessível via Tailscale `100.69.142.117:4001`
- ✅ Busca contexto: roadmap + CURRENT_STATUS.md + git log

### OpenClaw (Hetzner)
- ✅ Versão 2026.2.3-1 instalada em `/usr/bin/openclaw`
- ✅ Workspace: `/root/.openclaw/workspace/`
- ✅ Config: `/root/.openclaw/openclaw.json`
- ✅ Gateway systemd: `openclaw-gateway.service` (inactive - pendente ativação)
- ✅ Mission Control: Convex `savory-manatee-217.convex.cloud`
- ✅ Agente Polaris: `iniciar-polaris.mjs` (heartbeat 15min via cron)
- ✅ Canal: Telegram bot ativo

---

## INFRAESTRUTURA

| Componente | Status | Endereço |
|-----------|--------|----------|
| Frontend (Next.js) | 🟢 Online | http://localhost:5000 |
| API (Express) | 🟢 Online | http://100.64.77.5:4000 |
| PostgreSQL | 🟢 Online | 100.64.77.5:5434 |
| Tailscale VPN | 🟢 Conectado | — |
| GitHub OAuth | 🟢 Funcional | callback: localhost:5000 |
| Telegram Bot | 🟢 Polling ativo | Hetzner |
| Heartbeat daemon | 🟢 15min cycle | Hetzner |
| rvm-listener (pm2) | 🟢 Porta 4001 | Windows local |
| OpenClaw | 🟡 Instalado, gateway parado | Hetzner |
| Mission Control (Polaris) | 🟡 Via cron | Hetzner |

---

## ARQUIVOS-CHAVE

| Arquivo | Estado |
|---------|--------|
| `components/app-layout.tsx` | ✅ 7 abas |
| `app/projects/[id]/page.tsx` | ✅ Timeline interativa com milestones |
| `api/server.js` | ✅ Endpoints de milestones adicionados |
| `api/setup-projects.js` | ✅ Script de seed dos 13 projetos |
| `lib/auth.ts` | ✅ GitHub OAuth (NextAuth v5) |

---

## PRÓXIMOS PASSOS SUGERIDOS

1. Ativar o `openclaw-gateway.service` no Hetzner (`systemctl enable --now openclaw-gateway`)
2. Integrar OpenClaw com RVM (webhook `/hooks/wake` quando heartbeat crítico)
3. Deploy público (Vercel para frontend, domínio personalizado)
4. Autenticação multi-usuário (lista de e-mails autorizados)

---

*Versão estável v0.4.0 — 2026-02-26*
