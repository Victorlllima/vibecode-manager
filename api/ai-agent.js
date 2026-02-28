/**
 * RVM AI Agent — Squad Leader conversacional
 *
 * Um agente de IA com personalidade, memória de conversa e acesso completo
 * ao banco de dados do RVM. Conversa em linguagem natural como um Squad Leader humano.
 */

const Anthropic = require('@anthropic-ai/sdk')

const LOCAL_LISTENER_URL = process.env.LOCAL_LISTENER_URL || 'http://100.69.142.117:4001'

// ── Memória de conversa (persiste enquanto o processo está rodando) ──────────
// Guarda o histórico de mensagens para contexto conversacional
const conversationHistory = []
const MAX_HISTORY = 30 // máximo de mensagens no histórico (15 trocas)

function addToHistory(role, content) {
  conversationHistory.push({ role, content })
  // Remove as mais antigas quando passar do limite (mantém pares)
  while (conversationHistory.length > MAX_HISTORY) {
    conversationHistory.shift()
  }
}

function clearHistory() {
  conversationHistory.length = 0
}

// ── System Prompt — personalidade do Squad Leader ────────────────────────────
const SYSTEM_PROMPT = `Você é o Polaris — Squad Leader de IA do Red (Victor Lima).

Você não é o assistente de um projeto específico. Você é o braço direito inteligente do Red no dia a dia inteiro: projetos de tecnologia, conteúdo, pesquisas, agenda, decisões estratégicas, automações. O RVM (RedPro Vibecoding Manager) é apenas uma das ferramentas que você usa — não o seu escopo.

## Quem é Red:
- Engenheiro de telecomunicações, gestor de tecnologia, empreendedor em IA
- Usa o Método S.H.A.R.K. para construir produtos digitais com velocidade
- Trabalha em múltiplos projetos simultaneamente, precisa de um Squad Leader que navegue entre eles com naturalidade

## Sua personalidade:
- Direto ao ponto — sem rodeios, sem formalidade desnecessária
- Proativo — quando identifica algo importante ou um risco, fala sem precisar ser perguntado
- Confiante — toma posição, dá opiniões, não fica em cima do muro
- Parceiro — trata Red como colega sênior, não como usuário
- Conciso — prefere 3 linhas boas a 10 linhas mediocres
- Criativo quando necessário — se Red pedir conteúdo, copy, ideias, você gera

## Como você responde:
- Português brasileiro, tom de conversa natural
- Emojis com moderação (só quando reforçam o significado)
- Sem listas intermináveis — seja cirúrgico
- Quando Red pede algo ambíguo, interpreta e age (não fica pedindo esclarecimento)
- Quando algo é bloqueante ou crítico, avisa diretamente

## O que você consegue fazer:
**Gestão de projetos (via RVM):**
- Ver status, milestones, tasks de qualquer projeto
- Criar projetos, tasks, atualizar etapas
- Acionar Claude Code no computador do Red para desenvolver

**Conteúdo e pesquisa:**
- Pesquisar qualquer tema e sintetizar
- Gerar roteiros, posts, carrosséis, textos — quando Red pedir
- Acionar o pipeline de Criação de Conteúdo via Claude Code quando necessário

**Gestão pessoal:**
- Ajudar a organizar agenda, prioridades do dia, foco
- Raciocinar junto sobre decisões estratégicas
- Lembrar contexto da conversa atual para dar continuidade natural

**Execução:**
- Acionar Claude Code para qualquer projeto (não só o RVM)
- Registrar ideias, tarefas, novas iniciativas no banco

## Ecossistema do Red:
- **Projetos ativos**: RVM, Vitalis, RedPumpPro, Criação de Conteúdo, Nexus Agente Studio, NossoCRM, Servidor Hetzner, Vibevoice, Shark Method, OpenClaw, Pontos Livelo, HubControl, Flowdesk
- **Infra**: Hetzner VPS (100.64.77.5), Tailscale VPN, pm2, PostgreSQL
- **Stack padrão**: Next.js + React + Express.js + PostgreSQL + Tailwind
- **Método S.H.A.R.K.**: agentes Shiva (arquitetura), Hades (debug), Atlas (implementação), Ravena (docs), Kerberos (validação)
- **OpenClaw**: orquestrador de agentes no Hetzner — você é o Polaris, o Squad Leader do OpenClaw

## Regras absolutas:
- NUNCA invente dados de projetos — use as tools para buscar info real do banco
- Para dados de agenda ou contexto pessoal — Red vai te passar, você organiza
- Para ações destrutivas — peça confirmação explícita
- Para acionar Claude Code — informe Red antes de disparar
- Se uma tool falhar — diga o que tentou e o que deu errado`

// ── Definição das Tools ───────────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'get_projects',
    description: 'Lista projetos cadastrados. Use para dar status geral ou encontrar um projeto específico.',
    input_schema: {
      type: 'object',
      properties: {
        status_filter: {
          type: 'string',
          description: 'Filtrar por status. Deixe vazio para todos.',
          enum: ['production', 'development', 'attention', 'down', '']
        },
        name_search: {
          type: 'string',
          description: 'Busca parcial pelo nome do projeto (case-insensitive)'
        }
      }
    }
  },
  {
    name: 'get_project_milestones',
    description: 'Busca o roadmap/milestones de um projeto específico. Use para mostrar progresso, próximos passos ou status de etapas.',
    input_schema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'number',
          description: 'ID do projeto (use get_projects primeiro para descobrir o ID)'
        },
        status_filter: {
          type: 'string',
          description: 'Filtrar por status: pending, in_progress, done. Vazio = todos.',
          enum: ['pending', 'in_progress', 'done', '']
        }
      },
      required: ['project_id']
    }
  },
  {
    name: 'update_milestone_status',
    description: 'Atualiza o status de um milestone (etapa) de um projeto.',
    input_schema: {
      type: 'object',
      properties: {
        milestone_id: { type: 'number', description: 'ID do milestone' },
        new_status: {
          type: 'string',
          enum: ['pending', 'in_progress', 'done'],
          description: 'Novo status da etapa'
        }
      },
      required: ['milestone_id', 'new_status']
    }
  },
  {
    name: 'get_tasks',
    description: 'Lista tasks pendentes ou em progresso de um ou todos os projetos.',
    input_schema: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'Nome do projeto (parcial, case-insensitive). Vazio = todos os projetos.'
        },
        status: {
          type: 'string',
          description: 'Status das tasks. Vazio = pending+in_progress.',
          enum: ['pending', 'in_progress', 'completed', '']
        }
      }
    }
  },
  {
    name: 'create_task',
    description: 'Cria uma nova task em um projeto. Use quando Red pedir para adicionar algo ao backlog de um projeto.',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'number', description: 'ID do projeto' },
        title: { type: 'string', description: 'Título da task' },
        assigned_agent: {
          type: 'string',
          description: 'Agente responsável: Shiva, Hades, Atlas, Ravena ou Kerberos',
          enum: ['Shiva', 'Hades', 'Atlas', 'Ravena', 'Kerberos']
        },
        priority: {
          type: 'number',
          description: 'Prioridade de 1 (baixa) a 10 (crítica). Padrão: 5'
        }
      },
      required: ['project_id', 'title']
    }
  },
  {
    name: 'create_project',
    description: 'Cria um novo projeto no RVM. Use quando Red mencionar um novo projeto que não está cadastrado.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nome do projeto' },
        description: { type: 'string', description: 'Descrição breve do projeto' },
        status: {
          type: 'string',
          enum: ['development', 'production', 'attention', 'down'],
          description: 'Status inicial (geralmente development)'
        },
        priority: {
          type: 'number',
          description: 'Prioridade de 1 a 10'
        }
      },
      required: ['name', 'description']
    }
  },
  {
    name: 'update_project_status',
    description: 'Atualiza o status de um projeto. Use apenas quando Red pedir explicitamente.',
    input_schema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Nome do projeto (parcial, case-insensitive)' },
        new_status: {
          type: 'string',
          enum: ['production', 'development', 'attention', 'down']
        }
      },
      required: ['project_name', 'new_status']
    }
  },
  {
    name: 'get_heartbeat',
    description: 'Retorna o histórico recente de heartbeats do sistema.',
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'add_roadmap_item',
    description: 'Adiciona um item ao roadmap global do RVM (tabela roadmap_items). Para milestones de projetos, use create_task ou update_milestone_status.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título conciso da feature (max 80 chars)' },
        description: { type: 'string', description: 'Descrição técnica' },
        phase: {
          type: 'string',
          enum: ['fase_0', 'aba_1', 'aba_2', 'aba_3', 'aba_4', 'aba_5', 'aba_6', 'heartbeat', 'telegram', 'memory_bank', 'mobile', 'backlog']
        },
        phase_label: { type: 'string' },
        priority: {
          type: 'string',
          enum: ['high', 'medium', 'low']
        }
      },
      required: ['title', 'phase', 'phase_label', 'priority']
    }
  },
  {
    name: 'trigger_claude_code',
    description: 'Aciona o Claude Code no computador local do Red para executar desenvolvimento. Use quando Red pedir para prosseguir, continuar, implementar, codificar, ou qualquer variação de "execute isso".',
    input_schema: {
      type: 'object',
      properties: {
        instruction: {
          type: 'string',
          description: 'Instrução clara e detalhada para o Claude Code (inclua projeto, contexto e o que deve ser feito)'
        }
      },
      required: ['instruction']
    }
  },
  {
    name: 'clear_conversation',
    description: 'Limpa o histórico de conversa desta sessão. Use quando Red pedir para "esquecer tudo", "recomeçar" ou "limpar contexto".',
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'get_calendar_today',
    description: 'Busca os eventos de hoje no Google Calendar do Red. Use para responder "minha agenda de hoje", "o que tenho hoje", "quais reuniões tenho".',
    input_schema: {
      type: 'object',
      properties: {
        calendar_id: {
          type: 'string',
          description: 'ID do calendário. Deixe vazio para usar o principal (primary).'
        }
      }
    }
  },
  {
    name: 'get_calendar_upcoming',
    description: 'Busca os próximos eventos no Google Calendar. Use para "próxima semana", "próximos dias", "o que vem por aí".',
    input_schema: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Quantos dias à frente buscar (default: 7)'
        },
        calendar_id: {
          type: 'string',
          description: 'ID do calendário. Deixe vazio para o principal.'
        }
      }
    }
  },
  {
    name: 'create_calendar_event',
    description: 'Cria um evento no Google Calendar do Red. Use quando ele pedir para agendar algo, marcar reunião, bloquear tempo.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título do evento' },
        start_datetime: { type: 'string', description: 'Data/hora de início em ISO 8601 com timezone (ex: 2026-02-26T14:00:00-03:00)' },
        end_datetime: { type: 'string', description: 'Data/hora de fim em ISO 8601 com timezone' },
        description: { type: 'string', description: 'Descrição ou pauta do evento (opcional)' },
        location: { type: 'string', description: 'Local ou link do evento (opcional)' }
      },
      required: ['title', 'start_datetime', 'end_datetime']
    }
  },
  {
    name: 'list_calendars',
    description: 'Lista todos os calendários disponíveis na conta do Red. Use quando ele quiser saber quais calendários tem ou especificar um diferente do principal.',
    input_schema: { type: 'object', properties: {} }
  }
]

// ── Executores das Tools ──────────────────────────────────────────────────────
async function executeTool(toolName, input, pool) {
  switch (toolName) {

    case 'get_projects': {
      let query = `SELECT id, name, description, status, priority, last_activity, created_at
                   FROM projects WHERE 1=1`
      const params = []
      if (input.status_filter) {
        params.push(input.status_filter)
        query += ` AND status = $${params.length}`
      }
      if (input.name_search) {
        params.push(`%${input.name_search}%`)
        query += ` AND name ILIKE $${params.length}`
      }
      query += ' ORDER BY priority DESC, last_activity DESC'
      const { rows } = await pool.query(query, params)
      return rows
    }

    case 'get_project_milestones': {
      let query = `SELECT id, title, status, "order", notes, updated_at
                   FROM project_milestones WHERE project_id = $1`
      const params = [input.project_id]
      if (input.status_filter) {
        params.push(input.status_filter)
        query += ` AND status = $${params.length}`
      }
      query += ` ORDER BY "order" ASC`
      const { rows } = await pool.query(query, params)
      return rows
    }

    case 'update_milestone_status': {
      const { rows } = await pool.query(
        `UPDATE project_milestones SET status = $1, updated_at = NOW()
         WHERE id = $2 RETURNING id, title, status`,
        [input.new_status, input.milestone_id]
      )
      if (rows.length === 0) return { error: `Milestone ID ${input.milestone_id} não encontrado` }
      return rows[0]
    }

    case 'get_tasks': {
      let query = `SELECT t.id, t.title, t.status, t.assigned_agent, t.priority, p.name as project_name
                   FROM tasks t JOIN projects p ON t.project_id = p.id WHERE 1=1`
      const params = []
      if (input.project_name) {
        params.push(`%${input.project_name}%`)
        query += ` AND p.name ILIKE $${params.length}`
      }
      if (input.status) {
        params.push(input.status)
        query += ` AND t.status = $${params.length}`
      } else {
        query += ` AND t.status IN ('pending', 'in_progress')`
      }
      query += ' ORDER BY t.priority DESC NULLS LAST, t.created_at DESC LIMIT 25'
      const { rows } = await pool.query(query, params)
      return rows
    }

    case 'create_task': {
      const { rows } = await pool.query(
        `INSERT INTO tasks (project_id, title, status, assigned_agent, priority)
         VALUES ($1, $2, 'pending', $3, $4) RETURNING id, title, status`,
        [input.project_id, input.title, input.assigned_agent || null, input.priority || 5]
      )
      // Atualiza last_activity do projeto
      await pool.query('UPDATE projects SET last_activity = NOW() WHERE id = $1', [input.project_id])
      return rows[0]
    }

    case 'create_project': {
      const { rows } = await pool.query(
        `INSERT INTO projects (name, description, status, priority)
         VALUES ($1, $2, $3, $4) RETURNING id, name, status`,
        [input.name, input.description, input.status || 'development', input.priority || 5]
      )
      return rows[0]
    }

    case 'update_project_status': {
      const find = await pool.query(
        'SELECT id, name, status FROM projects WHERE name ILIKE $1 LIMIT 1',
        [`%${input.project_name}%`]
      )
      if (find.rows.length === 0) return { error: `Projeto "${input.project_name}" não encontrado` }
      const { rows } = await pool.query(
        'UPDATE projects SET status = $1, last_activity = NOW() WHERE id = $2 RETURNING id, name, status',
        [input.new_status, find.rows[0].id]
      )
      return rows[0]
    }

    case 'get_heartbeat': {
      const { rows } = await pool.query(
        'SELECT * FROM heartbeats ORDER BY created_at DESC LIMIT 5'
      )
      return rows
    }

    case 'add_roadmap_item': {
      const { rows } = await pool.query(
        `INSERT INTO roadmap_items (phase, phase_label, title, description, priority, source, raw_input)
         VALUES ($1, $2, $3, $4, $5, 'telegram', $3) RETURNING *`,
        [input.phase, input.phase_label, input.title, input.description || null, input.priority]
      )
      try {
        const sync = require('./roadmap-sync')
        await sync.regenerate(pool)
      } catch (e) {
        console.error('[roadmap-sync]', e.message)
      }
      return rows[0]
    }

    case 'trigger_claude_code': {
      try {
        const payload = JSON.stringify({ message: input.instruction })
        const url = new URL(`${LOCAL_LISTENER_URL}/claude`)
        const mod = url.protocol === 'https:' ? require('https') : require('http')

        await new Promise((resolve, reject) => {
          const options = {
            hostname: url.hostname,
            port: url.port || 4001,
            path: '/claude',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            },
          }
          const req = mod.request(options, (res) => {
            let data = ''
            res.on('data', chunk => { data += chunk })
            res.on('end', () => resolve(data))
          })
          req.on('error', reject)
          req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')) })
          req.write(payload)
          req.end()
        })

        return { triggered: true, message: 'Claude Code acionado. O resultado chegará em breve pelo Telegram.' }
      } catch (err) {
        return { triggered: false, error: `Listener local inacessível: ${err.message}` }
      }
    }

    case 'clear_conversation': {
      clearHistory()
      return { cleared: true, message: 'Histórico de conversa limpo.' }
    }

    case 'get_calendar_today': {
      try {
        const cal = require('./google-calendar')
        const events = await cal.getEvents({ calendarId: input.calendar_id || 'primary' })
        return { date: new Date().toLocaleDateString('pt-BR'), events, total: events.length }
      } catch (err) {
        return { error: err.message }
      }
    }

    case 'get_calendar_upcoming': {
      try {
        const cal = require('./google-calendar')
        const events = await cal.getUpcomingEvents(input.days || 7, input.calendar_id || 'primary')
        return { events, total: events.length }
      } catch (err) {
        return { error: err.message }
      }
    }

    case 'create_calendar_event': {
      try {
        const cal = require('./google-calendar')
        const event = await cal.createEvent({
          title: input.title,
          startDateTime: input.start_datetime,
          endDateTime: input.end_datetime,
          description: input.description,
          location: input.location,
        })
        return event
      } catch (err) {
        return { error: err.message }
      }
    }

    case 'list_calendars': {
      try {
        const cal = require('./google-calendar')
        const calendars = await cal.listCalendars()
        return calendars
      } catch (err) {
        return { error: err.message }
      }
    }

    default:
      return { error: `Tool desconhecida: ${toolName}` }
  }
}

// ── Processador principal ─────────────────────────────────────────────────────
async function processMessage(message, pool) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return '⚠️ ANTHROPIC_API_KEY não configurada no .env da API.'
  }

  const client = new Anthropic({ apiKey })

  // Adiciona mensagem atual ao histórico
  addToHistory('user', message)

  // Monta o array de mensagens com histórico completo
  const messages = [...conversationHistory]

  let iterations = 0
  const MAX_ITERATIONS = 6
  let lastAssistantResponse = ''

  while (iterations < MAX_ITERATIONS) {
    iterations++

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    })

    // Claude respondeu com texto — fim do loop
    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find(b => b.type === 'text')
      const text = textBlock ? textBlock.text : '✅'

      // Salva resposta no histórico
      addToHistory('assistant', response.content)
      lastAssistantResponse = text
      break
    }

    // Claude quer usar tools
    if (response.stop_reason === 'tool_use') {
      // Adiciona a resposta parcial do assistente ao histórico local
      messages.push({ role: 'assistant', content: response.content })

      const toolResults = []
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue

        console.log(`[Polaris] tool: ${block.name}`, JSON.stringify(block.input))
        let result
        try {
          result = await executeTool(block.name, block.input, pool)
        } catch (err) {
          result = { error: err.message }
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        })
      }

      messages.push({ role: 'user', content: toolResults })
      continue
    }

    break
  }

  if (!lastAssistantResponse) {
    return '⚠️ Não consegui processar. Tente novamente.'
  }

  return lastAssistantResponse
}

module.exports = { processMessage, clearHistory }
