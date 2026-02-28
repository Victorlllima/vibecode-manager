# ROADMAP — RVM (RedPro Vibecoding Manager)
> SaaS de gestão de projetos com IA, Telegram, CI/CD e agentes autônomos | Método S.H.A.R.K.
> Atualizado: 2026-02-27

## Stack
- **Frontend:** Next.js 16 + React 19 + TypeScript + Tailwind v4 + shadcn — porta 5000
- **Backend:** Express.js — porta 4000 (Hetzner `49.13.73.197`)
- **DB:** PostgreSQL via Tailscale `100.64.77.5:5434`
- **Auth:** NextAuth.js v5 + GitHub OAuth
- **Telegram Bot:** Polaris (pm2 Hetzner, polling)
- **rvm-listener:** Node.js porta 4001 (Windows local, pm2)
- **RVM Project ID:** próprio

---

## Fase 0 — MVP Base (CONCLUÍDA)
| # | Task | Status | Prioridade | Agente |
|---|------|--------|------------|--------|
| 1 | Frontend Next.js 16 + React 19 rodando em porta 5000 | done | 10 | Atlas |
| 2 | Tailwind CSS v4 + postcss configurado | done | 9 | Atlas |
| 3 | API Express porta 4000 + health check | done | 10 | Atlas |
| 4 | PostgreSQL conectado via Tailscale (workaround socat porta 5434) | done | 10 | Atlas |
| 5 | Schema: projects, tasks, heartbeats, logs | done | 9 | Atlas |
| 6 | Auth NextAuth v5 + GitHub OAuth configurado | done | 9 | Kerberos |

## Fase 1 — Dashboard & Abas Core (CONCLUÍDA)
| # | Task | Status | Prioridade | Agente |
|---|------|--------|------------|--------|
| 7 | Layout 8 abas + seletor global de projeto no header | done | 9 | Atlas |
| 8 | ProjectContext global (persiste no localStorage) | done | 9 | Atlas |
| 9 | Dashboard: StatCards, ProjectCards, HeartbeatWidget (ECG + Pulse) | done | 9 | Atlas |
| 10 | Roadmap editável: CRUD tasks, milestones, Project Info Card | done | 9 | Atlas |
| 11 | Time Machine: dados reais GitHub, rollback com confirmação | done | 8 | Atlas |
| 12 | SHARK Journey: imagens agentes + roadmap por agente | done | 7 | Atlas |
| 13 | Cost Monitor: por projeto, dados derivados API | done | 7 | Atlas |
| 14 | Integrações: ícones SVG reais, MCP, env vars, exportar JSON | done | 8 | Atlas |
| 15 | Health Score: dados reais + seção Infraestrutura | done | 8 | Atlas |

## Fase 2 — Telegram & Heartbeat (CONCLUÍDA)
| # | Task | Status | Prioridade | Agente |
|---|------|--------|------------|--------|
| 16 | Telegram Bot Polaris rodando no Hetzner via pm2 | done | 10 | Atlas |
| 17 | Comandos: /status, /tasks, /heartbeat, /shark, /brief, /micro | done | 9 | Atlas |
| 18 | heartbeat-v2.py rodando a cada 15min no Hetzner | done | 9 | Atlas |
| 19 | heartbeat-smart.js: busca tasks pendentes → envia numerado no Telegram | done | 9 | Shiva |
| 20 | processHeartbeatResponse: Red escolhe números → dispara no rvm-listener | done | 9 | Atlas |

## Fase 3 — CI/CD + Self-Healing + Dev Agent (CONCLUÍDA)
| # | Task | Status | Prioridade | Agente |
|---|------|--------|------------|--------|
| 21 | CI/CD Monitor: polling GitHub Actions + alertas Telegram + sugestão IA | done | 9 | Atlas |
| 22 | Self-Healing: monitor serviços SSH/pm2 + auto-restart + alertas | done | 9 | Kerberos |
| 23 | Dev Agent: pega task → envia rvm-listener → reporta resultado | done | 9 | Shiva |
| 24 | Aba CI/CD no frontend: builds, stats, filtros, sugestões IA | done | 8 | Atlas |
| 25 | Migration v3: ci_builds table | done | 8 | Atlas |

## Fase 4 — Claude Code Remote & rvm-listener
| # | Task | Status | Prioridade | Agente |
|---|------|--------|------------|--------|
| 26 | rvm-listener porta 4001 com PROJECT_DIRS (15 projetos) | done | 9 | Atlas |
| 27 | /execute-task endpoint: recebe task via heartbeat e dispara Claude Code | done | 9 | Atlas |
| 28 | buildTaskPrompt() com contexto por projeto | done | 8 | Atlas |
| 29 | markTaskDone() com PATCH automático no RVM API | done | 8 | Atlas |
| 30 | ClaudeRemoteCard na aba Integrações (polling 30s) | done | 7 | Atlas |
| 31 | Endpoints: /api/claude-remote/status, /register, /unregister | done | 7 | Atlas |

## Fase 5 — Deploy v0.5.0 no Hetzner
| # | Task | Status | Prioridade | Agente |
|---|------|--------|------------|--------|
| 32 | SCP e deploy: heartbeat-smart.js, telegram.js, server.js atualizados | pending | 10 | Atlas |
| 33 | Executar migrate-v3.js no Hetzner (ci_builds table) | pending | 10 | Atlas |
| 34 | pm2 restart rvm-api no Hetzner | pending | 9 | Atlas |
| 35 | pm2 restart rvm-listener no Windows (local) | pending | 9 | Atlas |
| 36 | Configurar crontab no Hetzner: heartbeat-smart às 9h e 14h | pending | 8 | Atlas |
| 37 | Testar login GitHub OAuth end-to-end | pending | 8 | Kerberos |
| 38 | Configurar webhooks GitHub Actions nos repos satélite | pending | 7 | Kerberos |

## Fase 6 — Wizard Onboarding & Multi-Account
| # | Task | Status | Prioridade | Agente |
|---|------|--------|------------|--------|
| 39 | Wizard onboarding multi-account (arquitetado, não implementado) | pending | 8 | Shiva |
| 40 | Tables: project_shark_state + shark_handoffs | pending | 7 | Atlas |
| 41 | Registrar projetos satélite com heartbeat automático | pending | 7 | Atlas |
| 42 | Dashboard móvel PWA otimizado para celular | pending | 6 | Atlas |

## Projetos Satélite Registrados
| ID | Projeto | Status |
|----|---------|--------|
| 17 | Morning Brief | pending deploy |
| 18 | Reddit/YouTube Digest | pending deploy |
| 19 | Research MCP | pending ativação |
