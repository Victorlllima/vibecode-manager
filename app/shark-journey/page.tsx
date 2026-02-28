'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { AppLayout } from '@/components/app-layout'
import { useProject } from '@/contexts/project-context'
import {
  RefreshCw, ChevronRight, ChevronDown, RotateCcw, CheckCircle, Circle
} from 'lucide-react'
import Image from 'next/image'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

// ─── Types ────────────────────────────────────────────────────────────────────

type Task = {
  id: number
  title: string
  description: string | null
  status: 'pending' | 'in_progress' | 'done' | 'completed' | string
  priority: 'high' | 'medium' | 'low' | string
  category: string | null
  source?: string
  assigned_agent?: string
  created_at: string
  updated_at: string
}

type AgentId = 'SHIVA' | 'HADES' | 'ATLAS' | 'RAVENA' | 'KERBEROS'
type AgentStatus = 'active' | 'done' | 'pending' | 'blocked'

type AgentRoadmapItem = {
  title: string
  description: string
}

type Agent = {
  id: AgentId
  name: string
  role: string
  image: string
  color: string
  accent: string
  borderColor: string
  bgColor: string
  glowColor: string
  textColor: string
  badgeColor: string
  keywords: string[]
  roadmap: AgentRoadmapItem[]
}

const AGENTS: Agent[] = [
  {
    id: 'SHIVA',
    name: 'Shiva',
    role: 'Especificação & Design',
    image: '/agents/shiva.png',
    color: 'violet',
    accent: 'bg-violet-500/10',
    borderColor: 'border-violet-500/40',
    bgColor: 'bg-violet-500/5',
    glowColor: 'shadow-violet-500/20',
    textColor: 'text-violet-400',
    badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    keywords: ['spec', 'architecture', 'planning', 'plan', 'design', 'estrutura', 'arquitetura', 'planejamento', 'proposta'],
    roadmap: [
      { title: 'Tipo de Projeto', description: 'Definir se é webpage, web app, mobile ou automação' },
      { title: 'Problema e Público', description: 'Entender quem usa e qual problema resolve' },
      { title: 'Estrutura Completa', description: 'Mapear todas as páginas, telas e seções' },
      { title: 'Componentes', description: 'Listar botões, cards, formulários, modals necessários' },
      { title: 'Dados e Integrações', description: 'Desenhar schema do banco e APIs externas' },
      { title: 'Design System', description: 'Criar paleta de cores, tipografia, espaçamentos' },
      { title: 'Priorização MoSCoW', description: 'Classificar funcionalidades (Must/Should/Could/Won\'t)' },
      { title: 'Documentação', description: 'Gerar especificação técnica e design tokens' },
    ],
  },
  {
    id: 'HADES',
    name: 'Hades',
    role: 'Planejamento & Estratégia',
    image: '/agents/hades.png',
    color: 'orange',
    accent: 'bg-orange-500/10',
    borderColor: 'border-orange-500/40',
    bgColor: 'bg-orange-500/5',
    glowColor: 'shadow-orange-500/20',
    textColor: 'text-orange-400',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    keywords: ['debug', 'debugging', 'error', 'fix', 'bug', 'falha', 'erro', 'corrigir', 'correção', 'crash', 'broken', 'plan', 'roadmap'],
    roadmap: [
      { title: 'Validar Especificação', description: 'Revisar entrega da Shiva antes de planejar' },
      { title: 'Verificar MCPs', description: 'Conferir se Supabase, GitHub e ferramentas estão disponíveis' },
      { title: 'Criar Roadmap Faseado', description: 'Dividir projeto em fases com valor incremental' },
      { title: 'Arquivo asbuilt.md', description: 'Documentar status, progresso e tarefas de cada fase' },
      { title: 'Plano de Tarefas', description: 'Escrever instruções passo-a-passo para Atlas' },
      { title: 'Receitas Reutilizáveis', description: 'Criar SOPs para autenticação, CRUD, integrações' },
      { title: 'GitFlow Seguro', description: 'Garantir branches dev/hml/main com backups' },
      { title: 'Instruir Atlas', description: 'Passar bola para execução com todas as informações' },
    ],
  },
  {
    id: 'ATLAS',
    name: 'Atlas',
    role: 'Implementação & Execução',
    image: '/agents/atlas.png',
    color: 'blue',
    accent: 'bg-blue-500/10',
    borderColor: 'border-blue-500/40',
    bgColor: 'bg-blue-500/5',
    glowColor: 'shadow-blue-500/20',
    textColor: 'text-blue-400',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    keywords: ['implement', 'create', 'build', 'desenvolver', 'criar', 'construir', 'adicionar', 'add', 'feature', 'funcionalidade', 'code'],
    roadmap: [
      { title: 'Validar Instruções', description: 'Ler completamente as ordens de Hades antes de começar' },
      { title: 'Setup Git', description: 'Fazer checkout em dev e pull da branch de trabalho' },
      { title: 'Executar Passo-a-Passo', description: 'Seguir instruções na ordem exata, sem pular' },
      { title: 'Verificar Segurança', description: 'Nunca commitar .env com credenciais reais' },
      { title: 'Atualizar asbuilt.md', description: 'Documentar progresso conforme instruído' },
      { title: 'Criar Backups', description: 'Fazer tags de backup antes de merges para hml/main' },
      { title: 'Relatar Resultados', description: 'Informar sucesso/erro com detalhes completos' },
      { title: 'Redirecionar', description: 'Passar resultado para Hades decidir próximos passos' },
    ],
  },
  {
    id: 'RAVENA',
    name: 'Ravena',
    role: 'Quality Assurance',
    image: '/agents/ravena.png',
    color: 'green',
    accent: 'bg-green-500/10',
    borderColor: 'border-green-500/40',
    bgColor: 'bg-green-500/5',
    glowColor: 'shadow-green-500/20',
    textColor: 'text-green-400',
    badgeColor: 'bg-green-500/20 text-green-300 border-green-500/30',
    keywords: ['review', 'test', 'document', 'revisar', 'testar', 'documentar', 'docs', 'readme', 'verificar', 'check', 'qa'],
    roadmap: [
      { title: 'Testes Automatizados', description: 'Executar build, lint e testes unitários' },
      { title: 'Testes End-to-End', description: 'Navegar pelos fluxos críticos com Playwright' },
      { title: 'Responsividade', description: 'Validar comportamento em mobile, tablet e desktop' },
      { title: 'Design System', description: 'Verificar cores, fontes, espaçamentos e consistência' },
      { title: 'Formulários', description: 'Testar preenchimento, validação e envio de dados' },
      { title: 'Performance', description: 'Medir velocidade de carregamento e renderização' },
      { title: 'Acessibilidade', description: 'Certificar que todos os usuários conseguem usar' },
      { title: 'Análise de Bugs', description: 'Classificar problemas por severidade' },
    ],
  },
  {
    id: 'KERBEROS',
    name: 'Kerberos',
    role: 'Segurança & Auditoria',
    image: '/agents/kerberos.png',
    color: 'yellow',
    accent: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/40',
    bgColor: 'bg-yellow-500/5',
    glowColor: 'shadow-yellow-500/20',
    textColor: 'text-yellow-400',
    badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    keywords: ['security', 'validate', 'audit', 'segurança', 'validar', 'auditoria', 'vulnerabilidade', 'vulnerability', 'pentest', 'hardening'],
    roadmap: [
      { title: 'Secrets Expostos', description: 'Detectar .env, API keys e credenciais no código' },
      { title: 'Injeção de SQL', description: 'Tentar quebrar formulários com comandos maliciosos' },
      { title: 'XSS (Cross-Site Scripting)', description: 'Testar se scripts maliciosos são bloqueados' },
      { title: 'Controle de Acesso', description: 'Verificar se usuários não acessam dados de outros' },
      { title: 'Autenticação e JWT', description: 'Validar login/logout e tokens corretamente' },
      { title: 'RLS (Row-Level Security)', description: 'Garantir que banco bloqueia dados não autorizados' },
      { title: 'Headers de Segurança', description: 'Conferir CORS, CSP e proteção contra ataques' },
      { title: 'Backdoors', description: 'Procurar código malicioso ou funcionalidades secretas' },
    ],
  },
]

const AGENT_ORDER: AgentId[] = ['SHIVA', 'HADES', 'ATLAS', 'RAVENA', 'KERBEROS']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}m atrás`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h atrás`
  return `${Math.floor(hrs / 24)}d atrás`
}

function inferAgent(task: Task, index: number): AgentId {
  if (task.assigned_agent) {
    const upper = task.assigned_agent.toUpperCase()
    if (AGENT_ORDER.includes(upper as AgentId)) return upper as AgentId
  }
  // Check category as agent name
  if (task.category) {
    const catUpper = task.category.toUpperCase()
    if (AGENT_ORDER.includes(catUpper as AgentId)) return catUpper as AgentId
  }
  const text = `${task.title} ${task.description || ''} ${task.category || ''}`.toLowerCase()
  for (const agent of AGENTS) {
    if (agent.keywords.some(kw => text.includes(kw))) return agent.id
  }
  return AGENT_ORDER[index % AGENT_ORDER.length]
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AgentStatusIndicator({ status }: { status: AgentStatus }) {
  const map: Record<AgentStatus, { label: string; cls: string }> = {
    active: { label: 'ATIVO', cls: 'bg-white/20 text-white border-white/30 animate-pulse' },
    done: { label: 'FEITO', cls: 'bg-green-500/20 text-green-300 border-green-500/30' },
    pending: { label: 'AGUARDANDO', cls: 'bg-white/5 text-white/30 border-white/10' },
    blocked: { label: 'BLOQUEADO', cls: 'bg-red-500/20 text-red-300 border-red-500/30' },
  }
  const cfg = map[status]
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono tracking-widest ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function TaskStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    pending: { label: 'pendente', cls: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' },
    in_progress: { label: 'executando', cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
    completed: { label: 'concluído', cls: 'bg-green-500/15 text-green-300 border-green-500/30' },
    done: { label: 'concluído', cls: 'bg-green-500/15 text-green-300 border-green-500/30' },
  }
  const c = cfg[status] || { label: status, cls: 'bg-white/10 text-white/50 border-white/10' }
  return <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${c.cls}`}>{c.label}</span>
}

type AgentNodeProps = {
  agent: Agent
  status: AgentStatus
  tasks: Task[]
  isExpanded: boolean
  onToggle: () => void
  isLast: boolean
}

function AgentNode({ agent, status, tasks, isExpanded, onToggle, isLast }: AgentNodeProps) {
  const completedCount = tasks.filter(t => t.status === 'completed' || t.status === 'done').length
  const totalCount = tasks.length
  const isActive = status === 'active'
  const isDone = status === 'done'
  const isPending = status === 'pending'

  return (
    <div className="flex flex-col items-stretch">
      <div
        className={`
          relative border rounded-xl transition-all duration-300 overflow-hidden
          ${isActive ? `${agent.borderColor} ${agent.bgColor} shadow-lg ${agent.glowColor}` :
            isDone ? 'border-green-500/20 bg-green-500/5' :
            isPending ? 'border-white/5 bg-white/[0.02]' :
            'border-red-500/20 bg-red-500/5'
          }
        `}
      >
        {isActive && (
          <div
            className={`absolute inset-0 rounded-xl border-2 ${agent.borderColor} opacity-0`}
            style={{ animation: 'agentPulse 2s ease-in-out infinite' }}
          />
        )}

        <button onClick={onToggle} className="w-full text-left px-4 py-3 flex items-center gap-3">
          {/* Agent image */}
          <div className={`w-12 h-12 rounded-lg overflow-hidden shrink-0 border ${
            isActive ? agent.borderColor : 'border-white/10'
          } ${isPending ? 'opacity-40' : ''}`}>
            <Image
              src={agent.image}
              alt={agent.name}
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-semibold font-mono ${
                isActive ? agent.textColor : isDone ? 'text-green-400' : isPending ? 'text-white/25' : 'text-red-400'
              }`}>
                {agent.name.toUpperCase()}
              </span>
              <AgentStatusIndicator status={status} />
            </div>
            <p className={`text-[11px] ${isPending ? 'text-white/20' : 'text-white/45'}`}>
              {agent.role}
            </p>
          </div>

          {totalCount > 0 && (
            <div className="text-right shrink-0">
              <p className={`text-xs font-mono ${isPending ? 'text-white/20' : 'text-white/50'}`}>
                {completedCount}/{totalCount}
              </p>
              <p className="text-[10px] text-white/20 font-mono">tasks</p>
            </div>
          )}

          <div className={`shrink-0 ${isPending ? 'text-white/15' : 'text-white/30'}`}>
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </div>
        </button>

        {totalCount > 0 && (
          <div className="mx-4 mb-2 h-0.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isDone ? 'bg-green-500/60' : isActive ? `bg-${agent.color}-500/50` : 'bg-white/10'
              }`}
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        )}

        {isExpanded && (
          <div className="px-4 pb-3 border-t border-white/5 mt-1 pt-2 space-y-3">
            {/* Agent's own roadmap */}
            <div>
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-2">
                Checklist do {agent.name}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {agent.roadmap.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 py-1.5 px-2 rounded bg-white/[0.02]">
                    <Circle className="w-3 h-3 shrink-0 mt-0.5 text-white/15" />
                    <div>
                      <p className="text-xs text-white/60">{item.title}</p>
                      <p className="text-[10px] text-white/25">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Project tasks assigned to this agent */}
            {totalCount > 0 && (
              <div>
                <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-2">
                  Tasks do Projeto
                </p>
                {tasks.map(task => (
                  <div key={task.id} className="flex items-start gap-2.5 py-2 border-b border-white/5 last:border-0">
                    <div className={`w-1 h-full min-h-[1.25rem] rounded-full shrink-0 mt-0.5 ${
                      (task.status === 'completed' || task.status === 'done') ? 'bg-green-500/60' :
                      task.status === 'in_progress' ? 'bg-blue-500/60' : 'bg-white/15'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs leading-snug ${
                          (task.status === 'completed' || task.status === 'done') ? 'text-white/30 line-through' : 'text-white/80'
                        }`}>
                          {task.title}
                        </p>
                        <TaskStatusBadge status={task.status} />
                      </div>
                      {task.description && (
                        <p className="text-[10px] text-white/30 mt-0.5 line-clamp-2">{task.description}</p>
                      )}
                      <p className="text-[10px] text-white/20 font-mono mt-1">{timeAgo(task.updated_at || task.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!isLast && (
        <div className="flex flex-col items-center my-1">
          <div className={`w-px h-4 ${isDone ? 'bg-green-500/40' : 'bg-white/10'}`} />
          <ChevronDown className={`w-3 h-3 ${isDone ? 'text-green-500/50' : 'text-white/15'}`} />
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type CycleRecord = {
  cycleNumber: number
  startedAt: string
  projectId: number
  projectName: string
}

export default function SharkJourneyPage() {
  const { status } = useSession()
  const { selectedProject, selectedProjectId } = useProject()

  const [activePhaseIndex, setActivePhaseIndex] = useState(0)
  const [expandedAgents, setExpandedAgents] = useState<Set<AgentId>>(new Set(['SHIVA']))
  const [cycles, setCycles] = useState<CycleRecord[]>([])

  const { data: allTasks = [], isLoading: loadingTasks, refetch: refetchAll } = useQuery<Task[]>({
    queryKey: ['project-roadmap', selectedProjectId],
    queryFn: () => fetch(`${API}/api/projects/${selectedProjectId}/roadmap`).then(r => {
      if (!r.ok) return []
      return r.json()
    }),
    refetchInterval: 30_000,
    enabled: status === 'authenticated' && !!selectedProjectId,
  })

  useEffect(() => {
    setActivePhaseIndex(0)
    setExpandedAgents(new Set(['SHIVA']))
  }, [selectedProjectId])

  const tasksByAgent = useMemo(() => {
    const map: Record<AgentId, Task[]> = { SHIVA: [], HADES: [], ATLAS: [], RAVENA: [], KERBEROS: [] }
    allTasks.forEach((task, i) => {
      const agentId = inferAgent(task, i)
      map[agentId].push(task)
    })
    return map
  }, [allTasks])

  const agentStatuses = useMemo((): Record<AgentId, AgentStatus> => {
    const result = {} as Record<AgentId, AgentStatus>
    AGENT_ORDER.forEach((id, idx) => {
      if (idx < activePhaseIndex) result[id] = 'done'
      else if (idx === activePhaseIndex) result[id] = 'active'
      else result[id] = 'pending'
    })
    return result
  }, [activePhaseIndex])

  const progressPct = Math.round(((activePhaseIndex) / AGENT_ORDER.length) * 100)

  const toggleAgent = useCallback((id: AgentId) => {
    setExpandedAgents(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleHandoff = useCallback(() => {
    if (activePhaseIndex >= AGENT_ORDER.length - 1) return
    const nextIdx = activePhaseIndex + 1
    setActivePhaseIndex(nextIdx)
    setExpandedAgents(new Set([AGENT_ORDER[nextIdx]]))
  }, [activePhaseIndex])

  const handleCompleteCycle = useCallback(() => {
    if (!selectedProject) return
    const newCycle: CycleRecord = {
      cycleNumber: cycles.filter(c => c.projectId === selectedProject.id).length + 1,
      startedAt: new Date().toISOString(),
      projectId: selectedProject.id,
      projectName: selectedProject.name,
    }
    setCycles(prev => [newCycle, ...prev])
    setActivePhaseIndex(0)
    setExpandedAgents(new Set(['SHIVA']))
  }, [cycles, selectedProject])

  const isLastPhase = activePhaseIndex === AGENT_ORDER.length - 1
  const activeAgent = AGENTS.find(a => a.id === AGENT_ORDER[activePhaseIndex])!
  const projectCycles = cycles.filter(c => c.projectId === selectedProjectId)

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-neutral-950">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <AppLayout>
      <style>{`
        @keyframes agentPulse {
          0%, 100% { opacity: 0; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.015); }
        }
        @keyframes phaseDot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
      `}</style>

      <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-end">
          <button onClick={() => refetchAll()} className="text-white/40 hover:text-white/80 transition-colors" title="Atualizar">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Current Phase Banner */}
        {selectedProjectId && (
          <div className={`relative border rounded-xl px-5 py-4 overflow-hidden ${activeAgent.bgColor} ${activeAgent.borderColor}`}>
            <div className={`absolute inset-0 opacity-10 bg-gradient-to-r from-transparent via-${activeAgent.color}-500 to-transparent pointer-events-none`} />
            <div className="relative flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/20">
                  <Image src={activeAgent.image} alt={activeAgent.name} width={40} height={40} className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-0.5">
                    Fase Ativa — Ciclo #{projectCycles.length + 1}
                  </p>
                  <p className={`text-base font-semibold font-mono ${activeAgent.textColor}`}>
                    {activeAgent.name.toUpperCase()} — {activeAgent.role}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isLastPhase ? (
                  <Button
                    size="sm" variant="ghost"
                    onClick={handleHandoff}
                    className={`font-mono text-xs h-7 px-3 rounded border ${activeAgent.accent} ${activeAgent.borderColor} ${activeAgent.textColor} hover:brightness-125 transition-all`}
                  >
                    Handoff →
                  </Button>
                ) : (
                  <Button
                    size="sm" variant="ghost"
                    onClick={handleCompleteCycle}
                    className="font-mono text-xs h-7 px-3 rounded bg-green-500/20 border border-green-500/30 text-green-300 hover:bg-green-500/30 transition-all"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Novo Ciclo
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-white/30">
                <span>Progresso do Ciclo</span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500/60 via-blue-500/60 to-green-500/60 transition-all duration-700"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                {AGENT_ORDER.map((id, idx) => {
                  const a = AGENTS.find(ag => ag.id === id)!
                  const st = agentStatuses[id]
                  return (
                    <div key={id} className="flex flex-col items-center gap-0.5">
                      <div className="w-6 h-6 rounded-full overflow-hidden border border-white/10">
                        <Image src={a.image} alt={a.name} width={24} height={24} className="w-full h-full object-cover" />
                      </div>
                      <span className={`text-[8px] font-mono ${st === 'pending' ? 'text-white/15' : 'text-white/35'}`}>
                        {a.name.slice(0, 3).toUpperCase()}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Agent Pipeline */}
        {selectedProjectId ? (
          <div className="space-y-1">
            <h2 className="text-xs font-mono text-white/40 uppercase tracking-widest mb-3">Pipeline de Agentes</h2>
            {loadingTasks ? (
              <div className="space-y-2">
                {AGENT_ORDER.map(id => (
                  <div key={id} className="h-16 bg-white/5 border border-white/10 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div>
                {AGENTS.map((agent, idx) => (
                  <AgentNode
                    key={agent.id}
                    agent={agent}
                    status={agentStatuses[agent.id]}
                    tasks={tasksByAgent[agent.id]}
                    isExpanded={expandedAgents.has(agent.id)}
                    onToggle={() => toggleAgent(agent.id)}
                    isLast={idx === AGENTS.length - 1}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-4xl mb-3">🦈</p>
            <p className="text-white/40 text-sm font-mono">Selecione um projeto para iniciar a Jornada SHARK</p>
          </div>
        )}

        {/* Agent Legend with images */}
        <div className="pt-4 border-t border-white/5">
          <h2 className="text-xs font-mono text-white/40 uppercase tracking-widest mb-3">Agentes S.H.A.R.K.</h2>
          <div className="flex flex-wrap gap-2">
            {AGENTS.map(agent => (
              <div key={agent.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-mono ${agent.badgeColor}`}>
                <div className="w-5 h-5 rounded-full overflow-hidden shrink-0">
                  <Image src={agent.image} alt={agent.name} width={20} height={20} className="w-full h-full object-cover" />
                </div>
                <span>{agent.name}</span>
                <span className="text-white/30">—</span>
                <span className="opacity-70">{agent.role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
