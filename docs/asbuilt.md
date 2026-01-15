# VibeCode Manager

## Resumo
SaaS pessoal para gestão centralizada de até 10 projetos de vibecoding simultâneos. Transforma arquivos asbuilt.md do GitHub em dashboard visual e acionável com sincronização automática via webhooks. Elimina perda de contexto ao retomar projetos pausados.

## Stack Técnica
- **Frontend:** Next.js 15 (App Router) + TypeScript
- **UI:** Shadcn/ui + Radix UI
- **CSS:** Tailwind CSS v4
- **State:** TanStack Query + Zustand
- **Backend:** Supabase (PostgreSQL, Auth, RLS)
- **Database:** PostgreSQL com Row Level Security
- **Auth:** GitHub OAuth via Supabase
- **Integração:** GitHub API (@octokit/rest)
- **Deploy:** Vercel
- **Versionamento:** GitHub

## Roadmap Completo

### FASE 1: Fundação (MVP Core)
**Status:** ✅ Completa  
**Conclusão:** 100% (6/6 subtasks)

**Objetivo:** Sistema funcional básico com autenticação e visualização.

**Subtasks:**
- [x] Setup Next.js 15 + TypeScript + estrutura inicial
- [x] Configuração Supabase (database, GitHub OAuth)
- [x] Executar Schema SQL completo (tables + RLS policies)
- [x] Implementar página de login (GitHub OAuth)
- [x] Criar dashboard básico (lista vazia de projetos)
- [x] Componente ProjectCard com informações essenciais

**Notas da Implementação:**
- Autenticação implementada com Supabase SSR e Middleware de proteção de rotas
- Login via GitHub OAuth configurado
- Dashboard estruturado com Empty States e Header dinâmico
- Componente `ProjectCard` criado com suporte a status visual de inatividade (>7 dias)
- Arquivo `supabase/schema.sql` criado com definições completas de tables, RLS policies e triggers

**Último trabalho realizado:**
- Implementação completa do fluxo de autenticação (Login, Callback, Middleware, Logout)
- Criação base do Dashboard (Layout + Page com Empty State)
- Próximo: Criar Componente ProjectCard e finalizar FASE 1
- Data última sessão: 2026-01-12

**Critério de Sucesso:** Usuário consegue fazer login via GitHub e ver lista vazia de projetos.

---

### FASE 2: Conexão e Parsing
**Status:** ✅ Completa  
**Conclusão:** 100% (5/5 subtasks)

**Objetivo:** Conectar repositórios do GitHub e parsear asbuilt.md.

**Subtasks:**
- [x] Página "Add Project" com seletor de repositórios
- [x] Integração GitHub API (listar repos, buscar asbuilt.md)
- [x] Parser de asbuilt.md (extrair estrutura: fases, subtasks, status)
- [x] Criação de project + phases + subtasks no Supabase
- [x] Exibir projetos conectados no dashboard com % correto

**Notas da Implementação:**
- Dashboard implementado com cálculo dinâmico de progresso (soma de subtasks de todas as fases)
- Tratamento de Empty State vs Lista de Projetos reais
- Importação via Server Action com tratamento de erros

**Último trabalho realizado:**
- Finalização da Fase 2 com integração total do Dashboard
- Próximo: Implementar FASE 3 (Detalhes do Projeto)
- Data última sessão: 2026-01-12

**Critério de Sucesso:** Usuário conecta um repo, sistema parseia asbuilt.md e exibe no dashboard com % de conclusão correto.

---

### FASE 3: Visualização Detalhada
**Status:** ✅ Completa  
**Conclusão:** 100% (7/7 subtasks)

**Objetivo:** Página de detalhes completa com roadmap faseado.

**Subtasks:**
- [x] Página de detalhes do projeto (`/projects/[id]`)
- [x] Componente RoadmapView (lista de fases expandíveis)
- [x] Visualização de subtasks com checkboxes (read-only)
- [x] Seção de notas rápidas (CRUD básico)
- [x] Componente de sugestão de próxima ação
- [x] Alerta visual para projetos parados >7 dias
- [x] Botão "Sync Now" para sincronização manual

**Notas da Implementação:**
- Página de detalhes implementada com Layout Grid (2/3 Roadmap, 1/3 Sidebar)
- Componente `RoadmapView` utilizando Accordion do shadcn/ui para renderizar fases aninhadas
- Sistema de Notas Rápidas implementado com Server Actions e Optimistic Updates (via revalidatePath)
- Algoritmo de 'Próxima Ação': Busca primeira subtask pendente da primeira fase ativa

**Último trabalho realizado:**
- Implementação de Notas, Sugestão de Ação e Alertas na página de detalhes
- Próximo: Implementar lógica de Sincronização Manual (Update) e encerrar Fase 3
- Data última sessão: 2026-01-12

**Critério de Sucesso:** Usuário visualiza roadmap completo, adiciona notas e recebe sugestão de próxima ação.

---

### FASE 4: Sincronização Automática
**Status:** ✅ Completa  
**Conclusão:** 100% (7/7 subtasks)

**Objetivo:** Webhook do GitHub para atualização automática.

**Subtasks:**
- [x] API route `/api/webhooks/github`
- [x] Validação de webhook signature (HMAC SHA256)
- [x] Configuração automática de webhook ao conectar projeto
- [x] Re-parsing de asbuilt.md ao receber push
- [x] Atualização automática de project/phases/subtasks
- [x] Log de webhooks (tabela `github_webhooks_log`)
- [x] Implementar botão "Sync Now" funcional (Feature movida para FASE 3 e completa)

**Notas da Implementação:**
*Nenhuma nota ainda - fase não iniciada*

**Último trabalho realizado:**
*Aguardando conclusão da FASE 3*

**Critério de Sucesso:** Push no GitHub atualiza automaticamente dados no dashboard em até 1 minuto.

---

### FASE 5: Polimento e UX
**Status:** ✅ Completa  
**Conclusão:** 100% (7/7 subtasks)

**Objetivo:** Melhorias visuais e experiência do usuário.

**Subtasks:**
- [x] Loading states (skeletons) em todas as páginas
- [x] Error handling global (toast notifications e error.tsx)
- [x] Animações suaves (framer-motion - opcional)
- [x] Responsividade mobile completa
- [x] Landing Page Informativa
- [x] Empty states informativos (Dashboard e Notas)
- [x] Confirmações de ação (deletar projeto, desconectar repo)
- [ ] Dark mode (opcional)

**Notas da Implementação:**
*Nenhuma nota ainda - fase não iniciada*

**Último trabalho realizado:**
*Aguardando conclusão da FASE 4*

**Critério de Sucesso:** Sistema fluido, sem bugs, com feedback claro ao usuário em todas as ações.

---

### FASE 6: Deploy e Monitoramento
**Status:** 🚧 Em Andamento  
**Conclusão:** 10% (Preparação de ambiente)

**Objetivo:** Produção estável com analytics.

**Subtasks:**
- [ ] Deploy Vercel (branch main = produção)
- [ ] Configurar variáveis de ambiente em produção
- [ ] Setup de logs de erro (Sentry - opcional)
- [ ] Analytics básicos (Vercel Analytics)
- [ ] Documentação de uso (README.md completo)

**Notas da Implementação:**
*Nenhuma nota ainda - fase não iniciada*

**Último trabalho realizado:**
*Aguardando conclusão da FASE 5*

**Critério de Sucesso:** Sistema rodando em produção, acessível via URL, com monitoramento ativo.

---

### Sessão 2026-01-15 (15)
**Duração:** 30min
**Trabalho Realizado:**
- Geração de secrets de segurança (GitHub OAuth + Webhook)
- Configuração de ambiente local (.env.local)
- Merge para Main e Deploy inicial

**Próximos Passos:**
- Configuração de Variáveis na Vercel
- Teste em Produção

---

### Sessão 2026-01-12 (14 - FINAL BATCH)
**Duração:** 15min  
**Trabalho Realizado:**
- Ajuste fino de responsividade na página de detalhes
- Finalização da Fase 5 e Preparação do Release Beta
- Projeto 100% Funcional (MVP Completo)

**Próximos Passos:**
- Deploy na Vercel (Fase 6)

---

### Sessão 2026-01-12 (13)
**Duração:** 10min  
**Trabalho Realizado:**
- Landing Page pública (`/`) com Hero Section e Features
- Melhoria na apresentação do produto (substituindo redirect)

---

### Sessão 2026-01-12 (12)
**Duração:** 10min  
**Trabalho Realizado:**
- Error Boundary Global (`error.tsx`)
- Página 404 Personalizada (`not-found.tsx`)
- Refinamento visual de Empty States (Notas)

---

### Sessão 2026-01-12 (11)
**Duração:** 10min  
**Trabalho Realizado:**
- Server Action `deleteProject` com limpeza de Webhooks
- Componente `DeleteProjectButton` com `AlertDialog` para confirmação
- UX mais segura para ações destrutivas

---

### Sessão 2026-01-12 (10)
**Duração:** 15min  
**Trabalho Realizado:**
- Instalação do componente `Skeleton`
- Criação de `loading.tsx` para Dashboard e Project Details
- Melhoria percebida de performance com layouts preemptivos

**Próximos Passos:**
- Implementar Error Boundaries e refinar UX

---

### Sessão 2026-01-12 (9)
**Duração:** 20min  
**Trabalho Realizado:**
- Refatoração da lógica de Sync para serviço reutilizável
- Configuração automática de Webhooks na importação
- Implementação completa do processamento de Webhooks (Push -> Sync)
- Acesso agnóstico a repositórios privados via `auth.identities`

**Próximos Passos:**
- Iniciar FASE 5 (Polimento e UX) ou Deploy

---

### Sessão 2026-01-12 (8)
**Duração:** 10min  
**Trabalho Realizado:**
- Endpoint de recebimento de Webhook (`/api/webhooks/github`)
- Validação de segurança com assinatura HMAC SHA256
- Log de eventos de push no Supabase

**Próximos Passos:**
- Configurar webhook no GitHub e implementar lógica de re-parsing automática

---

### Sessão 2026-01-12 (7)
**Duração:** 15min  
**Trabalho Realizado:**
- Implementação de Notas Rápidas (Backend + Frontend)
- Lógica de "Próxima Ação Sugerida"
- Alertas visuais de inatividade
- Integração de tudo na página de detalhes
- Implementação da lógica de sincronização manual e finalização da Fase 3

**Próximos Passos:**
- Iniciar FASE 4 (Webhooks e Automação)

---

### Sessão 2026-01-12 (6)
**Duração:** 15min  
**Trabalho Realizado:**
- Criação da estrutura de detalhes do projeto (Page + Components)
- Componente `RoadmapView` com Accordion e Status Badges
- Visualização de subtasks com checkboxes
- Layout responsivo (Grid 2/3 + 1/3)

**Próximos Passos:**
- Implementar CRUD de Notas e Botão de Sync

---

### Sessão 2026-01-12 (5)
**Duração:** 15min  
**Trabalho Realizado:**
- Implementação do parser de `asbuilt.md` com `remark`
- Server Action `importProject` para salvar dados no Supabase
- Integração do botão "Conectar" na lista de repositórios
- Tratamento de branches e status via parser
- Finalização da Fase 2. Integração do Dashboard com Supabase e renderização dos cards reais

**Próximos Passos:**
- Iniciar FASE 3 (Visualização Detalhada do Projeto)

---

### Sessão 2026-01-12 (4)
**Duração:** 10min  
**Trabalho Realizado:**
- Início da Fase 2 (Conexão e Parsing)
- Criação do serviço GitHub (`lib/github-service.ts`) com `@octokit/rest`
- Página de listagem de repositórios (`app/projects/add`)
- Listagem renderiza repositórios reais do usuário logado

**Próximos Passos:**
- Implementar ação de conectar (onClick)
- Criar parser de asbuilt.md
- Salvar dados no Supabase

---

### Sessão 2026-01-12 (3)
**Duração:** 30min  
**Trabalho Realizado:**
- Implementação de autenticação com Supabase SSR
- Criação de `lib/supabase` (client, server, middleware)
- Página de Login (`/login`) estilizada
- Dashboard Layout e Page (Empty State)
- Implementação completa do fluxo de Auth (Login/Middleware)
- Criação do Dashboard e componente ProjectCard

**Próximos Passos:**
- Iniciar FASE 2 (Conexão e Parsing)
- Preencher variáveis de ambiente

---

### Sessão 2026-01-12 (2)
**Duração:** 15min  
**Trabalho Realizado:**
- Criação do arquivo de definição de Schema SQL (`supabase/schema.sql`)
- Tables definidas: profiles, projects, phases, subtasks, notes, github_webhooks_log
- RLS policies configuradas para todas as tabelas
- Triggers de updated_at implementados

**Próximos Passos:**
- Criar projeto no dashboard do Supabase
- Aplicar o schema SQL via SQL Editor
- Configurar GitHub OAuth
- Implementar página de login

---

### Sessão 2026-01-12 (1)
**Duração:** 30min  
**Trabalho Realizado:**
- Setup inicial completo do projeto
- Estrutura GitFlow criada (main/hml/dev)
- Next.js 15 + TypeScript inicializado
- Dependências instaladas (Supabase, TanStack Query, Shadcn, Octokit, etc)
- Estrutura de pastas criada
- asbuilt.md completo gerado com 6 fases
- Commit inicial executado

**Próximos Passos:**
- Criar projeto no Supabase
- Configurar GitHub OAuth
- Executar schema SQL (tables + RLS)
- Implementar página de login

---

## Pendências e Bloqueios

**Bloqueios Atuais:**
*Nenhum bloqueio*

**Pendências Técnicas:**
- Preencher `.env.local` com credenciais REAIS do Supabase
- Gerar webhook secret
- Definir URL de produção na Vercel

---

## Notas Técnicas

### Configurações Importantes

**Supabase:**
- Database: PostgreSQL com RLS habilitado
- Auth Provider: GitHub OAuth
- Redirect URLs necessárias:
  - `http://localhost:3000/auth/callback`
  - `https://[producao].vercel.app/auth/callback`

**GitHub Webhook:**
- Event: `push`
- Endpoint: `/api/webhooks/github`
- Secret: (a ser gerado)

### Decisões de Arquitetura

1. **Parser de asbuilt.md:** Utilizar `remark` + `remark-parse` para parsing robusto de markdown
2. **Cálculo de % de conclusão:** Granular por subtasks (completed_subtasks / total_subtasks * 100)
3. **Sincronização:** Webhook-first (automático) + fallback manual (botão "Sync Now")
4. **Status de fases:** 5 estados (pending, in_progress, paused, blocked, completed)
5. **Alerta de inatividade:** Borda vermelha em projetos com `days_inactive > 7`
6. **Parser (Detalhes):** Parser percorre AST para identificar Headings (Fases) e Lists (Tasks).
7. **Estratégia de busca:** Tenta `/docs/asbuilt.md` primeiro, depois `/asbuilt.md`.

### Sincronização
- **Estratégia:** "Wipe & Recreate" - Fases e subtasks são removidas e recriadas baseadas no Markdown atual para garantir consistência total.
- **Automação via Webhooks:** O sistema configura automaticamente o webhook no GitHub durante a importação.
- **Processamento 'Headless':** O webhook utiliza a Service Role Key para acessar o banco e recupera o token OAuth do usuário na tabela `auth.identities` para acessar repositórios privados.

### UX/UI
- **Loading:** Implementado sistema de Skeletons (`loading.tsx`) nativo do Next.js App Router para feedback visual instantâneo.
- **Error Handling:** `error.tsx` (Global Boundary) e `not-found.tsx` para falhas graciosas.
- **Empty States:** Feedback visual amigável quando não há dados (dashboard zerado, sem notas).
- **Segurança:** Implementado `AlertDialog` para ações destrutivas (Disconnect Project), prevenindo perda acidental de dados.
- **Framework UI:** Shadcn/ui para consistência e acessibilidade.

### Integrações

**GitHub API:**
- OAuth via Supabase Auth
- Scopes necessários: `repo`, `user`
- Rate limit: 5000 req/hora (autenticado)
- **Implementação:** Via `@octokit/rest` em `lib/github-service.ts`
- **Auth:** Utiliza `provider_token` extraído da sessão do Supabase

**Supabase:**
- Client-side: `@supabase/supabase-js`
- Server-side: Service Role Key para API routes
- RLS: Policies aplicadas em todas as tabelas

**Vercel:**
- Auto-deploy via Git push
- Environment variables configuradas no dashboard
- Edge Functions para webhooks

### Variáveis de Ambiente
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# GitHub OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# GitHub Webhook
GITHUB_WEBHOOK_SECRET=Configurado (Gerado localmente via PowerShell/OpenSSL)

# App
NEXT_PUBLIC_APP_URL=
```

### Comandos Úteis
```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Lint
npm run lint

# Type check
npx tsc --noEmit

# Supabase (se usar CLI local)
npx supabase start
npx supabase db reset
```

### Schema SQL

**Arquivo:** `supabase/schema.sql` criado com definições completas.

O schema inclui:
- Tabela `profiles` (extensão de dados do usuário)
- Tabela `projects` (repositórios conectados)
- Tabela `phases` (fases do roadmap)
- Tabela `subtasks` (tarefas granulares)
- Tabela `notes` (notas rápidas)
- Tabela `github_webhooks_log` (auditoria de webhooks)
- RLS Policies completas para cada tabela
- Triggers de `updated_at` automáticos

**Como aplicar:**
1. Criar projeto no Supabase Dashboard
2. Ir em SQL Editor
3. Colar conteúdo de `supabase/schema.sql`
4. Executar

---

**Status Atual:** 🚀 Deploy em Andamento  
**Última Atualização:** 2026-01-15 às 09:30  
**Atualizado por:** J.A.R.V.I.S. (automated)
