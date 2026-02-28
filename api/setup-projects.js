/**
 * setup-projects.js
 * Cria a tabela project_milestones, popula os 13 projetos reais do Red,
 * e insere milestones iniciais para cada projeto.
 *
 * Rode com: node api/setup-projects.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const { Pool } = require('pg')

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
})

// ──────────────────────────────────────────────────────────────────────────────
// PROJETOS REAIS
// ──────────────────────────────────────────────────────────────────────────────

const REAL_PROJECTS = [
  {
    name: 'RVM — RedPro Vibecoding Manager',
    description: 'Sistema de gestão centralizada de projetos de vibecoding com IA, heartbeat e Telegram.',
    status: 'production',
    priority: 10,
    github_url: '',
    milestones: [
      { title: 'MVP Base (login, dashboard, API)', status: 'done', order: 1 },
      { title: 'Heartbeat System (daemon Python + alerts)', status: 'done', order: 2 },
      { title: 'Telegram Bot + IA (Claude Haiku)', status: 'done', order: 3 },
      { title: '6 Abas implementadas (Time Machine, SHARK, Cost, Integrations, Health)', status: 'done', order: 4 },
      { title: 'AppLayout compartilhado + Roadmap visual', status: 'done', order: 5 },
      { title: 'rvm-listener (Claude Code local via Tailscale)', status: 'done', order: 6 },
      { title: 'Projetos reais + Timeline por projeto', status: 'in_progress', order: 7 },
      { title: 'Deploy em produção (Vercel + Hetzner)', status: 'pending', order: 8 },
      { title: 'Autenticação multi-usuário', status: 'pending', order: 9 },
    ]
  },
  {
    name: 'Vitalis',
    description: 'Plataforma de saúde e bem-estar com IA para monitoramento e recomendações personalizadas.',
    status: 'development',
    priority: 9,
    github_url: '',
    milestones: [
      { title: 'Definição de escopo e arquitetura', status: 'done', order: 1 },
      { title: 'Modelagem de dados (usuário, métricas, histórico)', status: 'done', order: 2 },
      { title: 'API de ingestão de dados de saúde', status: 'in_progress', order: 3 },
      { title: 'Dashboard de métricas pessoais', status: 'pending', order: 4 },
      { title: 'Motor de recomendações com IA', status: 'pending', order: 5 },
      { title: 'App mobile (React Native)', status: 'pending', order: 6 },
      { title: 'Integração wearables (Fitbit, Apple Health)', status: 'pending', order: 7 },
      { title: 'Beta fechado', status: 'pending', order: 8 },
    ]
  },
  {
    name: 'RedPumpPro',
    description: 'Sistema de gestão para academias e personal trainers com planos de treino e acompanhamento.',
    status: 'development',
    priority: 8,
    github_url: '',
    milestones: [
      { title: 'Prototipagem e wireframes', status: 'done', order: 1 },
      { title: 'Backend: cadastro de alunos e treinos', status: 'done', order: 2 },
      { title: 'Frontend: painel do personal trainer', status: 'in_progress', order: 3 },
      { title: 'App do aluno (visualizar treinos)', status: 'pending', order: 4 },
      { title: 'Progressão automática de cargas com IA', status: 'pending', order: 5 },
      { title: 'Cobrança recorrente (Stripe)', status: 'pending', order: 6 },
      { title: 'Lançamento beta', status: 'pending', order: 7 },
    ]
  },
  {
    name: 'Criação de Conteúdo',
    description: 'Pipeline de criação de conteúdo com IA para redes sociais, artigos e vídeos.',
    status: 'production',
    priority: 7,
    github_url: '',
    milestones: [
      { title: 'Pipeline de geração de posts (Claude + templates)', status: 'done', order: 1 },
      { title: 'Calendário editorial automatizado', status: 'done', order: 2 },
      { title: 'Integração n8n para publicação automática', status: 'done', order: 3 },
      { title: 'Análise de performance por post (engagement)', status: 'in_progress', order: 4 },
      { title: 'Geração de roteiros para vídeo', status: 'pending', order: 5 },
      { title: 'Dashboard de métricas de conteúdo', status: 'pending', order: 6 },
    ]
  },
  {
    name: 'Nexus Agente Studio',
    description: 'Plataforma para criação, orquestração e deploy de agentes de IA especializados.',
    status: 'development',
    priority: 9,
    github_url: '',
    milestones: [
      { title: 'Arquitetura multi-agente (Shiva/Hades/Atlas/Ravena/Kerberos)', status: 'done', order: 1 },
      { title: 'SDK de criação de agentes', status: 'in_progress', order: 2 },
      { title: 'Interface visual de orquestração', status: 'pending', order: 3 },
      { title: 'Marketplace de agentes', status: 'pending', order: 4 },
      { title: 'Deploy one-click em Hetzner/Vercel', status: 'pending', order: 5 },
      { title: 'Billing por uso de tokens', status: 'pending', order: 6 },
      { title: 'Versão pública beta', status: 'pending', order: 7 },
    ]
  },
  {
    name: 'NossoCRM',
    description: 'CRM inteligente para pequenas e médias empresas com automação de follow-up e IA.',
    status: 'development',
    priority: 8,
    github_url: '',
    milestones: [
      { title: 'Definição de produto e público-alvo', status: 'done', order: 1 },
      { title: 'Cadastro de leads e pipeline visual', status: 'done', order: 2 },
      { title: 'Automação de e-mails e WhatsApp', status: 'in_progress', order: 3 },
      { title: 'Score de leads com IA', status: 'pending', order: 4 },
      { title: 'Relatórios de conversão', status: 'pending', order: 5 },
      { title: 'Integração com WhatsApp Business API', status: 'pending', order: 6 },
      { title: 'MVP público', status: 'pending', order: 7 },
    ]
  },
  {
    name: 'Servidor Hetzner',
    description: 'Infraestrutura central: Supabase, APIs, bots, Tailscale VPN, monitoramento.',
    status: 'production',
    priority: 10,
    github_url: '',
    milestones: [
      { title: 'VPS Hetzner configurado (Ubuntu + Docker)', status: 'done', order: 1 },
      { title: 'Tailscale VPN (acesso seguro)', status: 'done', order: 2 },
      { title: 'Supabase self-hosted (PostgreSQL)', status: 'done', order: 3 },
      { title: 'rvm-api (Express) via pm2', status: 'done', order: 4 },
      { title: 'heartbeat-v2.py com auto-trigger', status: 'done', order: 5 },
      { title: 'OpenClaw instalado e configurado', status: 'in_progress', order: 6 },
      { title: 'Backup automático do banco', status: 'pending', order: 7 },
      { title: 'Monitoramento de recursos (CPU/RAM/disco)', status: 'pending', order: 8 },
    ]
  },
  {
    name: 'Vibevoice',
    description: 'Ferramenta de síntese e clonagem de voz com IA para conteúdo de áudio e podcasts.',
    status: 'development',
    priority: 6,
    github_url: '',
    milestones: [
      { title: 'Pesquisa de APIs de TTS (ElevenLabs, Azure, Coqui)', status: 'done', order: 1 },
      { title: 'Proof of concept com clonagem de voz', status: 'done', order: 2 },
      { title: 'Interface web para upload e geração', status: 'in_progress', order: 3 },
      { title: 'Banco de vozes customizadas', status: 'pending', order: 4 },
      { title: 'API pública para integração', status: 'pending', order: 5 },
      { title: 'Modelo de assinatura', status: 'pending', order: 6 },
    ]
  },
  {
    name: 'Shark Method',
    description: 'Metodologia e plataforma de desenvolvimento acelerado com agentes IA especializados.',
    status: 'production',
    priority: 9,
    github_url: '',
    milestones: [
      { title: 'Definição dos 5 agentes (Shiva/Hades/Atlas/Ravena/Kerberos)', status: 'done', order: 1 },
      { title: 'Protocolo S.H.A.R.K. documentado', status: 'done', order: 2 },
      { title: 'Integração com Claude Code (CLAUDE.md)', status: 'done', order: 3 },
      { title: 'Treinamento dos agentes com prompts especializados', status: 'done', order: 4 },
      { title: 'Pipeline de handoff automático entre agentes', status: 'in_progress', order: 5 },
      { title: 'Documentação pública do método', status: 'pending', order: 6 },
      { title: 'Curso / workshop do método', status: 'pending', order: 7 },
    ]
  },
  {
    name: 'OpenClaw',
    description: 'Ferramenta de automação e orquestração de serviços no servidor Hetzner.',
    status: 'development',
    priority: 8,
    github_url: '',
    milestones: [
      { title: 'Instalação e configuração inicial no Hetzner', status: 'in_progress', order: 1 },
      { title: 'Mapeamento de casos de uso (heartbeat, wake, automação)', status: 'in_progress', order: 2 },
      { title: 'Integração com RVM (heartbeat system)', status: 'pending', order: 3 },
      { title: 'Automações pessoais configuradas', status: 'pending', order: 4 },
      { title: 'Dashboard de controle', status: 'pending', order: 5 },
    ]
  },
  {
    name: 'Pontos Livelo',
    description: 'Sistema de monitoramento e maximização de pontos Livelo com alertas e estratégias.',
    status: 'development',
    priority: 5,
    github_url: '',
    milestones: [
      { title: 'Scraper de extrato Livelo', status: 'done', order: 1 },
      { title: 'Cálculo de validade e vencimento de pontos', status: 'done', order: 2 },
      { title: 'Alertas de pontos prestes a vencer', status: 'in_progress', order: 3 },
      { title: 'Sugestões de resgate otimizado com IA', status: 'pending', order: 4 },
      { title: 'Dashboard de histórico e projeções', status: 'pending', order: 5 },
    ]
  },
  {
    name: 'HubControl',
    description: 'Hub de controle central para monitorar e gerenciar todos os projetos e serviços ativos.',
    status: 'development',
    priority: 7,
    github_url: '',
    milestones: [
      { title: 'Definição de escopo (o que controlar)', status: 'done', order: 1 },
      { title: 'Integração com APIs dos projetos ativos', status: 'in_progress', order: 2 },
      { title: 'Dashboard unificado de status', status: 'pending', order: 3 },
      { title: 'Alertas centralizados por Telegram', status: 'pending', order: 4 },
      { title: 'Automações cross-projeto', status: 'pending', order: 5 },
    ]
  },
  {
    name: 'Flowdesk',
    description: 'Ferramenta de gestão de fluxos de trabalho e automação de processos com IA.',
    status: 'development',
    priority: 6,
    github_url: '',
    milestones: [
      { title: 'Mapeamento de processos recorrentes', status: 'done', order: 1 },
      { title: 'Editor visual de fluxos (drag & drop)', status: 'in_progress', order: 2 },
      { title: 'Execução automática de fluxos', status: 'pending', order: 3 },
      { title: 'Integração com n8n e Zapier', status: 'pending', order: 4 },
      { title: 'Templates de fluxos para PMEs', status: 'pending', order: 5 },
      { title: 'Versão SaaS com billing', status: 'pending', order: 6 },
    ]
  },
]

async function run() {
  const client = await pool.connect()
  try {
    console.log('🔧 Iniciando setup de projetos reais...\n')

    // 1. Criar tabela project_milestones
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_milestones (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done')),
        "order" INTEGER DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✅ Tabela project_milestones criada/verificada')

    // 2. Remover projetos antigos de teste (mantém apenas os reais)
    const existing = await client.query('SELECT id, name FROM projects')
    const existingNames = existing.rows.map(r => r.name)

    // Projetos a remover (antigos de teste)
    const toRemove = ['Editorial IA', 'Carrossel Scrapper', 'Família Buenolima']
    for (const name of toRemove) {
      const found = existing.rows.find(r => r.name === name)
      if (found) {
        await client.query('DELETE FROM tasks WHERE project_id = $1', [found.id])
        await client.query('DELETE FROM project_milestones WHERE project_id = $1', [found.id])
        await client.query('DELETE FROM projects WHERE id = $1', [found.id])
        console.log(`🗑️  Removido projeto de teste: ${name}`)
      }
    }

    // 3. Inserir/atualizar projetos reais
    for (const p of REAL_PROJECTS) {
      // Verifica se já existe (pelo nome)
      const ex = await client.query('SELECT id FROM projects WHERE name = $1', [p.name])
      let projectId

      if (ex.rows.length > 0) {
        // Atualiza
        projectId = ex.rows[0].id
        await client.query(
          `UPDATE projects SET description=$1, status=$2, priority=$3, github_url=$4, last_activity=NOW() WHERE id=$5`,
          [p.description, p.status, p.priority, p.github_url, projectId]
        )
        console.log(`♻️  Atualizado: ${p.name} (id=${projectId})`)
      } else {
        // Insere
        const result = await client.query(
          `INSERT INTO projects (name, description, status, priority, github_url)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [p.name, p.description, p.status, p.priority, p.github_url]
        )
        projectId = result.rows[0].id
        console.log(`✨ Criado: ${p.name} (id=${projectId})`)
      }

      // 4. Inserir milestones (limpa e recria)
      await client.query('DELETE FROM project_milestones WHERE project_id = $1', [projectId])
      for (const m of p.milestones) {
        await client.query(
          `INSERT INTO project_milestones (project_id, title, status, "order")
           VALUES ($1, $2, $3, $4)`,
          [projectId, m.title, m.status, m.order]
        )
      }
      console.log(`   └─ ${p.milestones.length} milestones inseridos`)
    }

    console.log('\n✅ Setup completo!')
    console.log(`📊 Total projetos: ${REAL_PROJECTS.length}`)

  } catch (err) {
    console.error('❌ Erro:', err.message)
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
