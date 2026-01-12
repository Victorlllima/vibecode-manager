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
**Status:** ⏳ Aguardando  
**Conclusão:** 0% (0/6 subtasks)

**Objetivo:** Sistema funcional básico com autenticação e visualização.

**Subtasks:**
- [ ] Setup Next.js 15 + TypeScript + estrutura inicial
- [ ] Configuração Supabase (database, GitHub OAuth)
- [ ] Executar Schema SQL completo (tables + RLS policies)
- [ ] Implementar página de login (GitHub OAuth)
- [ ] Criar dashboard básico (lista vazia de projetos)
- [ ] Componente ProjectCard com informações essenciais

**Notas da Implementação:**
*Nenhuma nota ainda - fase não iniciada*

**Último trabalho realizado:**
*Aguardando início*

**Critério de Sucesso:** Usuário consegue fazer login via GitHub e ver lista vazia de projetos.

---

### FASE 2: Conexão e Parsing
**Status:** ⏳ Aguardando  
**Conclusão:** 0% (0/5 subtasks)

**Objetivo:** Conectar repositórios do GitHub e parsear asbuilt.md.

**Subtasks:**
- [ ] Página "Add Project" com seletor de repositórios
- [ ] Integração GitHub API (listar repos, buscar asbuilt.md)
- [ ] Parser de asbuilt.md (extrair estrutura: fases, subtasks, status)
- [ ] Criação de project + phases + subtasks no Supabase
- [ ] Exibir projetos conectados no dashboard com % correto

**Notas da Implementação:**
*Nenhuma nota ainda - fase não iniciada*

**Último trabalho realizado:**
*Aguardando conclusão da FASE 1*

**Critério de Sucesso:** Usuário conecta um repo, sistema parseia asbuilt.md e exibe no dashboard com % de conclusão correto.

---

### FASE 3: Visualização Detalhada
**Status:** ⏳ Aguardando  
**Conclusão:** 0% (0/7 subtasks)

**Objetivo:** Página de detalhes completa com roadmap faseado.

**Subtasks:**
- [ ] Página de detalhes do projeto (`/projects/[id]`)
- [ ] Componente RoadmapView (lista de fases expandíveis)
- [ ] Visualização de subtasks com checkboxes (read-only)
- [ ] Seção de notas rápidas (CRUD básico)
- [ ] Componente de sugestão de próxima ação
- [ ] Alerta visual para projetos parados >7 dias
- [ ] Botão "Sync Now" para sincronização manual

**Notas da Implementação:**
*Nenhuma nota ainda - fase não iniciada*

**Último trabalho realizado:**
*Aguardando conclusão da FASE 2*

**Critério de Sucesso:** Usuário visualiza roadmap completo, adiciona notas e recebe sugestão de próxima ação.

---

### FASE 4: Sincronização Automática
**Status:** ⏳ Aguardando  
**Conclusão:** 0% (0/7 subtasks)

**Objetivo:** Webhook do GitHub para atualização automática.

**Subtasks:**
- [ ] API route `/api/webhooks/github`
- [ ] Validação de webhook signature (HMAC SHA256)
- [ ] Configuração automática de webhook ao conectar projeto
- [ ] Re-parsing de asbuilt.md ao receber push
- [ ] Atualização automática de project/phases/subtasks
- [ ] Log de webhooks (tabela `github_webhooks_log`)
- [ ] Implementar botão "Sync Now" funcional

**Notas da Implementação:**
*Nenhuma nota ainda - fase não iniciada*

**Último trabalho realizado:**
*Aguardando conclusão da FASE 3*

**Critério de Sucesso:** Push no GitHub atualiza automaticamente dados no dashboard em até 1 minuto.

---

### FASE 5: Polimento e UX
**Status:** ⏳ Aguardando  
**Conclusão:** 0% (0/7 subtasks)

**Objetivo:** Melhorias visuais e experiência do usuário.

**Subtasks:**
- [ ] Loading states (skeletons) em todas as páginas
- [ ] Error handling global (toast notifications)
- [ ] Animações suaves (framer-motion - opcional)
- [ ] Responsividade mobile completa
- [ ] Empty states informativos
- [ ] Confirmações de ação (deletar projeto, desconectar repo)
- [ ] Dark mode (opcional)

**Notas da Implementação:**
*Nenhuma nota ainda - fase não iniciada*

**Último trabalho realizado:**
*Aguardando conclusão da FASE 4*

**Critério de Sucesso:** Sistema fluido, sem bugs, com feedback claro ao usuário em todas as ações.

---

### FASE 6: Deploy e Monitoramento
**Status:** ⏳ Aguardando  
**Conclusão:** 0% (0/5 subtasks)

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

## Histórico de Sessões

*Nenhuma sessão registrada ainda - projeto em fase de setup inicial*

---

## Pendências e Bloqueios

**Bloqueios Atuais:**
*Nenhum bloqueio*

**Pendências Técnicas:**
- Criar projeto no Supabase
- Configurar GitHub OAuth no Supabase Dashboard
- Gerar webhook secret para validação
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

### Integrações

**GitHub API:**
- OAuth via Supabase Auth
- Scopes necessários: `repo`, `user`
- Rate limit: 5000 req/hora (autenticado)

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
GITHUB_WEBHOOK_SECRET=

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

O schema completo está definido no PRD Técnico e inclui:
- Tabela `projects` (repositórios conectados)
- Tabela `phases` (fases do roadmap)
- Tabela `subtasks` (tarefas granulares)
- Tabela `notes` (notas rápidas)
- Tabela `github_webhooks_log` (auditoria)
- RLS Policies completas
- Triggers de `updated_at`

---

**Última Atualização:** 2026-01-12 (setup inicial)  
**Atualizado por:** F.R.I.D.A.Y. (manual - projeto em criação)
