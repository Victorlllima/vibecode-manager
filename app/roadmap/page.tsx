'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/app-layout'
import { useProject } from '@/contexts/project-context'
import {
  CheckCircle2, Clock, Circle, Map, Plus, Trash2, X,
  ChevronDown, ChevronRight, ListFilter, LayoutList,
  ArrowUpCircle, ArrowRightCircle, ArrowDownCircle,
  Loader2, Inbox, ClipboardList, Tag,
  ExternalLink, Send, Bot
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

// ─── Types ──────────────────────────────────────────────────────────────────

type Task = {
  id: number
  title: string
  description: string | null
  status: 'pending' | 'in_progress' | 'done'
  priority: 'high' | 'medium' | 'low'
  category: string | null
  created_at: string
  updated_at: string
}

type NewTask = {
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  category: string
}

type Milestone = {
  id: number
  project_id: number
  title: string
  status: 'pending' | 'in_progress' | 'done'
  order: number
  notes: string | null
  created_at: string
  updated_at: string
}

// ─── Config ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending:     { icon: Circle,       color: 'text-white/30',  bg: 'bg-white/5',       border: 'border-white/10',     label: 'Pendente',      next: 'in_progress' as const },
  in_progress: { icon: Clock,        color: 'text-blue-400',  bg: 'bg-blue-500/10',   border: 'border-blue-500/20',  label: 'Em andamento',  next: 'done' as const },
  done:        { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10',  border: 'border-green-500/20', label: 'Concluído',     next: 'pending' as const },
}

const PRIORITY_CONFIG = {
  high:   { label: 'Alta',  color: 'text-red-400',    dot: 'bg-red-400',    icon: ArrowUpCircle },
  medium: { label: 'Média', color: 'text-yellow-400', dot: 'bg-yellow-400', icon: ArrowRightCircle },
  low:    { label: 'Baixa', color: 'text-white/30',   dot: 'bg-white/30',   icon: ArrowDownCircle },
}

const STATUS_CYCLE: Task['status'][] = ['pending', 'in_progress', 'done']

const MILESTONE_CONFIG = {
  done:        { icon: CheckCircle2, color: 'text-green-400',  label: 'Concluído',    dot: 'bg-green-500 border-green-400' },
  in_progress: { icon: Clock,        color: 'text-blue-400',   label: 'Em andamento', dot: 'bg-blue-500 border-blue-400' },
  pending:     { icon: Circle,       color: 'text-white/25',   label: 'Pendente',     dot: 'bg-neutral-800 border-white/20' },
}

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

// ─── Milestone Timeline ─────────────────────────────────────────────────────

function MilestoneTimeline({ milestones, projectId }: { milestones: Milestone[]; projectId: number }) {
  const qc = useQueryClient()
  const [updating, setUpdating] = useState<number | null>(null)

  const cycleStatus = async (m: Milestone) => {
    const next = m.status === 'pending' ? 'in_progress' : m.status === 'in_progress' ? 'done' : 'pending'
    setUpdating(m.id)
    await fetch(`${API}/api/milestones/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    qc.invalidateQueries({ queryKey: ['milestones', String(projectId)] })
    setUpdating(null)
  }

  const done = milestones.filter(m => m.status === 'done').length
  const pct = milestones.length === 0 ? 0 : Math.round((done / milestones.length) * 100)
  const nextStep = milestones.find(m => m.status === 'pending')
  const currentStep = milestones.find(m => m.status === 'in_progress')

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-mono text-white/40 uppercase tracking-wide">Progresso dos Milestones</p>
          <p className="text-sm font-mono font-semibold text-white">{pct}%</p>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-white/30 font-mono">{done} / {milestones.length} etapas concluídas</p>

        {(currentStep || nextStep) && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-xs font-mono text-white/30 uppercase tracking-wide mb-1">
              {currentStep ? 'Em andamento' : 'Próxima etapa sugerida'}
            </p>
            <p className="text-xs text-white/70 font-mono">
              {currentStep?.title || nextStep?.title}
            </p>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="relative">
        {milestones.map((m, idx) => {
          const cfg = MILESTONE_CONFIG[m.status]
          const Icon = cfg.icon
          const isLast = idx === milestones.length - 1

          return (
            <div key={m.id} className="flex gap-3 group">
              <div className="flex flex-col items-center">
                <button
                  onClick={() => cycleStatus(m)}
                  disabled={updating === m.id}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all hover:scale-110 ${cfg.dot} ${updating === m.id ? 'opacity-50' : ''}`}
                  title="Clique para mudar status"
                >
                  <Icon className={`w-3 h-3 ${cfg.color}`} />
                </button>
                {!isLast && (
                  <div className={`w-0.5 flex-1 min-h-6 mt-1 ${m.status === 'done' ? 'bg-green-500/40' : 'bg-white/10'}`} />
                )}
              </div>

              <div className="pb-4 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-sm font-mono transition-colors ${
                    m.status === 'done' ? 'line-through text-white/35' :
                    m.status === 'in_progress' ? 'text-white font-medium' :
                    'text-white/60'
                  }`}>
                    {m.title}
                  </p>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-mono shrink-0 ${
                    m.status === 'done' ? 'bg-green-500/10 text-green-400' :
                    m.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400' :
                    'bg-white/5 text-white/25'
                  }`}>
                    {cfg.label}
                  </span>
                </div>
                {m.notes && (
                  <p className="text-xs text-white/30 font-mono mt-0.5">{m.notes}</p>
                )}
                {m.status === 'done' && (
                  <p className="text-xs text-white/20 font-mono mt-0.5">
                    Concluído {timeAgo(m.updated_at)}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Task Item ──────────────────────────────────────────────────────────────

function TaskItem({ task, projectId }: { task: Task; projectId: number }) {
  const queryClient = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<Task>) =>
      fetch(`${API}/api/projects/${projectId}/roadmap/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }).then(r => {
        if (!r.ok) throw new Error('Falha ao atualizar task')
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-roadmap', projectId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () =>
      fetch(`${API}/api/projects/${projectId}/roadmap/${task.id}`, {
        method: 'DELETE',
      }).then(r => {
        if (!r.ok) throw new Error('Falha ao deletar task')
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-roadmap', projectId] })
    },
  })

  const cycleStatus = () => {
    const currentIdx = STATUS_CYCLE.indexOf(task.status)
    const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length]
    updateMutation.mutate({ status: nextStatus })
  }

  const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending
  const pcfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
  const Icon = cfg.icon
  const isUpdating = updateMutation.isPending || deleteMutation.isPending

  return (
    <div className={`group flex items-start gap-3 px-4 py-3 transition-all ${task.status === 'done' ? 'opacity-50' : ''} ${isUpdating ? 'pointer-events-none opacity-40' : ''}`}>
      {/* Status toggle button */}
      <button
        onClick={cycleStatus}
        className={`mt-0.5 shrink-0 transition-all hover:scale-110 ${cfg.color}`}
        title={`Clique para mudar: ${cfg.label} → ${STATUS_CONFIG[cfg.next].label}`}
      >
        {isUpdating
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <Icon className="w-4 h-4" />
        }
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-mono ${task.status === 'done' ? 'line-through text-white/40' : 'text-white/80'}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-white/30 mt-0.5 font-mono line-clamp-2">{task.description}</p>
        )}
        {task.category && (
          <span className="inline-block text-[10px] font-mono text-white/20 mt-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
            {task.category}
          </span>
        )}
      </div>

      {/* Priority + Status badges + Delete */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${pcfg.dot}`} />
          <span className={`text-xs font-mono ${pcfg.color}`}>{pcfg.label}</span>
        </div>
        <span className={`text-xs px-1.5 py-0.5 rounded border font-mono ${cfg.bg} ${cfg.color} ${cfg.border}`}>
          {cfg.label}
        </span>

        {/* Delete */}
        {confirmDelete ? (
          <div className="flex items-center gap-1 ml-1">
            <button
              onClick={() => deleteMutation.mutate()}
              className="text-red-400 hover:text-red-300 transition-colors p-0.5"
              title="Confirmar exclusão"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-white/30 hover:text-white/60 transition-colors p-0.5"
              title="Cancelar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-white/10 group-hover:text-white/30 hover:!text-red-400 transition-colors p-0.5 ml-1"
            title="Excluir task"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Add Task Form ──────────────────────────────────────────────────────────

function AddTaskForm({ projectId, onClose }: { projectId: number; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [category, setCategory] = useState('')

  const createMutation = useMutation({
    mutationFn: (task: NewTask) =>
      fetch(`${API}/api/projects/${projectId}/roadmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      }).then(r => {
        if (!r.ok) throw new Error('Falha ao criar task')
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-roadmap', projectId] })
      setTitle('')
      setDescription('')
      setPriority('medium')
      setCategory('')
      onClose()
    },
  })

  const canSubmit = title.trim().length > 0 && !createMutation.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    createMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      priority,
      category: category.trim() || 'geral',
    })
  }

  return (
    <form onSubmit={handleSubmit} className="border border-white/10 rounded-lg bg-white/[0.02] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <span className="text-xs font-mono text-white/50 uppercase tracking-wider">Nova Task</span>
        <button type="button" onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Título da task..."
          autoFocus
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/10 transition-all"
        />

        {/* Description */}
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Descrição (opcional)..."
          rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/10 transition-all resize-none"
        />

        {/* Priority + Category row */}
        <div className="flex items-center gap-3">
          {/* Priority */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono text-white/30">Prioridade:</span>
            <div className="flex gap-1">
              {(Object.entries(PRIORITY_CONFIG) as [Task['priority'], typeof PRIORITY_CONFIG.high][]).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPriority(key)}
                  className={`text-xs font-mono px-2 py-0.5 rounded border transition-all ${
                    priority === key
                      ? `${cfg.color} bg-white/10 border-white/20`
                      : 'text-white/20 border-white/5 hover:border-white/15'
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div className="flex-1">
            <input
              type="text"
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="Categoria (ex: frontend, api, infra)"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-all"
            />
          </div>
        </div>

        {/* Error */}
        {createMutation.isError && (
          <p className="text-xs font-mono text-red-400">Erro ao criar task. Tente novamente.</p>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-white/5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-mono text-white/30 hover:text-white/60 px-3 py-1.5 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className={`text-xs font-mono px-4 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
            canSubmit
              ? 'bg-white/10 border-white/20 text-white hover:bg-white/15'
              : 'bg-white/5 border-white/5 text-white/20 cursor-not-allowed'
          }`}
        >
          {createMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
          Criar Task
        </button>
      </div>
    </form>
  )
}

// ─── Category Section ───────────────────────────────────────────────────────

function CategorySection({ category, tasks, projectId, expanded, onToggle }: {
  category: string
  tasks: Task[]
  projectId: number
  expanded: boolean
  onToggle: () => void
}) {
  const done = tasks.filter(t => t.status === 'done').length
  const total = tasks.length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  const allDone = done === total && total > 0

  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${
      allDone ? 'border-green-500/20 bg-green-500/5' : 'border-white/10 bg-white/[0.02]'
    }`}>
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 min-w-0">
          {expanded
            ? <ChevronDown className="w-3.5 h-3.5 text-white/40 shrink-0" />
            : <ChevronRight className="w-3.5 h-3.5 text-white/40 shrink-0" />
          }
          <span className={`text-sm font-mono font-medium truncate ${allDone ? 'text-green-400' : 'text-white/80'}`}>
            {category}
          </span>
          {allDone && (
            <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 shrink-0">
              completo
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <div className="flex items-center gap-1.5">
            <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${allDone ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-mono text-white/40 w-14 text-right">{done}/{total}</span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/5 divide-y divide-white/5">
          {tasks.map(task => (
            <TaskItem key={task.id} task={task} projectId={projectId} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Project Status Tags ─────────────────────────────────────────────────────

const PROJECT_STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  production:  { label: 'Em Produção',        dot: 'bg-green-500',  badge: 'bg-green-500/10 text-green-400 border-green-500/20' },
  development: { label: 'Em Desenvolvimento', dot: 'bg-blue-500',   badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  attention:   { label: 'Atenção',             dot: 'bg-yellow-500', badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  down:        { label: 'Offline',             dot: 'bg-red-500',    badge: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

function ProjectStatusSelector({ projectId, currentStatus }: { projectId: number; currentStatus: string }) {
  const queryClient = useQueryClient()
  const { refetch: refetchProjects } = useProject()

  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: string) =>
      fetch(`${API}/api/projects/${projectId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      }).then(r => {
        if (!r.ok) throw new Error('Falha ao atualizar status')
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project', String(projectId)] })
      refetchProjects()
    },
  })

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Tag className="w-3 h-3 text-white/30 shrink-0" />
      {Object.entries(PROJECT_STATUS_CONFIG).map(([key, cfg]) => {
        const isActive = currentStatus === key
        const isUpdating = updateStatusMutation.isPending
        return (
          <button
            key={key}
            onClick={() => { if (!isActive) updateStatusMutation.mutate(key) }}
            disabled={isActive || isUpdating}
            className={`flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded border transition-all ${
              isActive
                ? `${cfg.badge} cursor-default`
                : 'border-white/10 text-white/25 hover:border-white/20 hover:text-white/50'
            } ${isUpdating && !isActive ? 'opacity-40 pointer-events-none' : ''}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? cfg.dot : 'bg-white/20'}`} />
            {cfg.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function RoadmapPage() {
  const { status } = useSession()
  const router = useRouter()
  const { selectedProject, selectedProjectId } = useProject()

  const [showAddForm, setShowAddForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_progress' | 'done'>('all')
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [allExpanded, setAllExpanded] = useState(true)
  const [toast, setToast] = useState('')
  const [agentRunning, setAgentRunning] = useState(false)
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  // Auth guard
  if (status === 'loading') return (
    <div className="flex h-screen w-full items-center justify-center bg-neutral-950">
      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  )
  if (status === 'unauthenticated') { router.push('/login'); return null }

  // Fetch project tasks
  const { data: tasks = [], isLoading, isError } = useQuery<Task[]>({
    queryKey: ['project-roadmap', selectedProjectId],
    queryFn: () =>
      fetch(`${API}/api/projects/${selectedProjectId}/roadmap`)
        .then(r => {
          if (!r.ok) throw new Error('Falha ao buscar roadmap')
          return r.json()
        }),
    enabled: !!selectedProjectId,
    refetchInterval: 30_000,
  })

  // Fetch milestones
  const { data: milestones = [] } = useQuery<Milestone[]>({
    queryKey: ['milestones', String(selectedProjectId)],
    queryFn: () =>
      fetch(`${API}/api/projects/${selectedProjectId}/milestones`)
        .then(r => {
          if (!r.ok) throw new Error('Falha ao buscar milestones')
          return r.json()
        }),
    enabled: !!selectedProjectId,
    refetchInterval: 30_000,
  })

  // Send Telegram summary
  const sendTelegram = async () => {
    if (!selectedProject) return
    const done = milestones.filter(m => m.status === 'done').length
    const next = milestones.find(m => m.status === 'pending')?.title || '—'
    await fetch(`${API}/api/telegram/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `*${selectedProject.name}*\nStatus: ${selectedProject.status}\nProgresso: ${done}/${milestones.length} etapas\nPróximo: ${next}`
      }),
    })
    showToast('Enviado para o Telegram')
  }

  // Trigger Dev Agent
  const runDevAgent = async () => {
    if (!selectedProjectId || agentRunning) return
    setAgentRunning(true)
    showToast('Dev Agent iniciado — acompanhe pelo Telegram')
    try {
      const res = await fetch(`${API}/api/projects/${selectedProjectId}/agent/run`, { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        showToast(`Dev Agent concluiu: ${data.task}`)
      } else {
        showToast(data.reason || data.error || 'Dev Agent: sem tasks pendentes')
      }
    } catch {
      showToast('Erro ao executar Dev Agent')
    }
    setAgentRunning(false)
  }

  // ─── No project selected ─────────────────────────────────────────────────
  if (!selectedProjectId) {
    return (
      <AppLayout>
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-3">
            <Map className="w-10 h-10 text-white/10 mx-auto" />
            <p className="text-sm font-mono text-white/30">Selecione um projeto no menu superior</p>
            <p className="text-xs font-mono text-white/15">O roadmap mostra as tasks por projeto</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  // ─── Filtering ────────────────────────────────────────────────────────────

  const filtered = filterStatus === 'all'
    ? tasks
    : tasks.filter(t => t.status === filterStatus)

  // ─── Grouping by category ────────────────────────────────────────────────

  const byCategory = filtered.reduce<Record<string, Task[]>>((acc, task) => {
    const cat = task.category || 'Sem categoria'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(task)
    return acc
  }, {})

  const sortedCategories = Object.keys(byCategory).sort((a, b) => {
    if (a === 'Sem categoria') return 1
    if (b === 'Sem categoria') return -1
    return a.localeCompare(b, 'pt-BR')
  })

  // ─── Stats ────────────────────────────────────────────────────────────────

  const totalDone = tasks.filter(t => t.status === 'done').length
  const totalInProgress = tasks.filter(t => t.status === 'in_progress').length
  const totalPending = tasks.filter(t => t.status === 'pending').length
  const totalTasks = tasks.length
  const overallPct = totalTasks === 0 ? 0 : Math.round((totalDone / totalTasks) * 100)

  // ─── Expand / Collapse ───────────────────────────────────────────────────

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const isCategoryExpanded = (cat: string) => {
    if (allExpanded && expandedCategories.size === 0) return true
    return expandedCategories.has(cat)
  }

  const expandAll = () => {
    setAllExpanded(true)
    setExpandedCategories(new Set(sortedCategories))
  }

  const collapseAll = () => {
    setAllExpanded(false)
    setExpandedCategories(new Set())
  }

  const projectStatusCfg = PROJECT_STATUS_CONFIG[selectedProject?.status || ''] || PROJECT_STATUS_CONFIG.development

  return (
    <AppLayout>
      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 bg-neutral-800 border border-white/10 rounded-lg px-4 py-2 text-sm text-white/80 font-mono">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Map className="w-4 h-4 text-white/40" />
          <h1 className="text-xs font-mono text-white/40 uppercase tracking-widest">
            Roadmap
          </h1>
          {selectedProject && (
            <>
              <span className="text-white/10">/</span>
              <span className="text-xs font-mono text-white/60">{selectedProject.name}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <button
            onClick={() => setViewMode(v => v === 'grouped' ? 'flat' : 'grouped')}
            className="flex items-center gap-1 text-xs font-mono text-white/30 hover:text-white/60 transition-colors"
            title={viewMode === 'grouped' ? 'Ver lista plana' : 'Agrupar por categoria'}
          >
            {viewMode === 'grouped' ? <LayoutList className="w-3 h-3" /> : <ListFilter className="w-3 h-3" />}
            {viewMode === 'grouped' ? 'lista' : 'agrupar'}
          </button>

          {viewMode === 'grouped' && (
            <>
              <span className="text-white/10">|</span>
              <button onClick={expandAll} className="text-xs font-mono text-white/30 hover:text-white/60 transition-colors">expandir</button>
              <span className="text-white/10">|</span>
              <button onClick={collapseAll} className="text-xs font-mono text-white/30 hover:text-white/60 transition-colors">recolher</button>
            </>
          )}
        </div>
      </div>

      <div className="px-6 py-6 max-w-3xl mx-auto space-y-5">
        {/* Project Status Tag Selector */}
        {selectedProject && (
          <ProjectStatusSelector projectId={selectedProjectId} currentStatus={selectedProject.status} />
        )}

        {/* Project Info Card */}
        {selectedProject && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${projectStatusCfg.dot}`} />
                <h2 className="text-lg font-semibold text-white">{selectedProject.name}</h2>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded border font-mono ${projectStatusCfg.badge}`}>
                {projectStatusCfg.label}
              </span>
            </div>
            {selectedProject.description && (
              <p className="text-sm text-white/50 mb-4">{selectedProject.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-white/30 font-mono">
                Prioridade P{selectedProject.priority}
              </span>
              <span className="text-xs text-white/30 font-mono">·</span>
              <span className="text-xs text-white/30 font-mono">
                Ativo {timeAgo(selectedProject.last_activity || selectedProject.created_at)}
              </span>
              {selectedProject.github_url && (
                <>
                  <span className="text-xs text-white/30 font-mono">·</span>
                  <a
                    href={selectedProject.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-white/40 hover:text-white/70 font-mono flex items-center gap-1 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    GitHub
                  </a>
                </>
              )}
              <span className="text-xs text-white/30 font-mono">·</span>
              <button
                onClick={sendTelegram}
                className="text-xs font-mono text-white/40 hover:text-blue-400 flex items-center gap-1 transition-colors"
              >
                <Send className="w-3 h-3" />
                Telegram
              </button>
            </div>
          </div>
        )}

        {/* Milestone Timeline */}
        {selectedProject && milestones.length > 0 && (
          <div>
            <h3 className="text-xs font-mono text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ChevronRight className="w-3 h-3" />
              Roadmap ({milestones.length} etapas)
            </h3>
            <MilestoneTimeline milestones={milestones} projectId={selectedProjectId} />
          </div>
        )}

        {/* Overall progress */}
        {totalTasks > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-mono text-white/40 uppercase tracking-wide">Progresso Geral</p>
                <p className="text-2xl font-bold text-white mt-0.5">{overallPct}%</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono text-white/30">{totalDone} / {totalTasks} tasks</p>
                <p className="text-xs font-mono text-white/20 mt-0.5">{totalPending + totalInProgress} restantes</p>
              </div>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500"
                style={{ width: `${overallPct}%` }}
              />
            </div>

            {/* Status pills / filters */}
            <div className="flex flex-wrap gap-2 mt-4">
              {([
                { key: 'all' as const, label: 'Todas', count: totalTasks, color: 'text-white/60', bg: 'bg-white/10', border: 'border-white/20' },
                { key: 'pending' as const, label: 'Pendentes', count: totalPending, ...STATUS_CONFIG.pending },
                { key: 'in_progress' as const, label: 'Em andamento', count: totalInProgress, ...STATUS_CONFIG.in_progress },
                { key: 'done' as const, label: 'Concluídas', count: totalDone, ...STATUS_CONFIG.done },
              ]).map(item => {
                const active = filterStatus === item.key
                return (
                  <button
                    key={item.key}
                    onClick={() => setFilterStatus(filterStatus === item.key ? 'all' : item.key)}
                    className={`flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded border transition-all ${
                      active
                        ? `${item.bg} ${item.color} ${item.border}`
                        : 'border-white/10 text-white/30 hover:border-white/20'
                    }`}
                  >
                    {item.label}: {item.count}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Add task + Dev Agent buttons */}
        {showAddForm ? (
          <AddTaskForm projectId={selectedProjectId} onClose={() => setShowAddForm(false)} />
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddForm(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-white/10 text-white/30 hover:text-white/60 hover:border-white/20 hover:bg-white/[0.02] transition-all text-xs font-mono"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Task
            </button>
            {totalPending > 0 && (
              <button
                onClick={runDevAgent}
                disabled={agentRunning}
                className="flex items-center gap-2 px-4 py-3 rounded-lg border border-blue-500/20 bg-blue-500/5 text-blue-400/70 hover:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/30 transition-all text-xs font-mono disabled:opacity-40"
              >
                {agentRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                {agentRunning ? 'Executando...' : 'Dev Agent'}
              </button>
            )}
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-white/5 border border-white/10 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="text-center py-10 space-y-2">
            <p className="text-sm font-mono text-red-400">Erro ao carregar roadmap</p>
            <p className="text-xs font-mono text-white/20">Verifique se a API está acessível</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && totalTasks === 0 && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <Inbox className="w-12 h-12 text-white/10" />
            <div className="text-center space-y-1">
              <p className="text-sm font-mono text-white/40">Nenhuma task neste projeto</p>
              <p className="text-xs font-mono text-white/20">
                Crie a primeira task clicando em &quot;Adicionar Task&quot; acima,
                <br />ou envie tasks pelo Telegram.
              </p>
            </div>
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white/70 hover:text-white hover:bg-white/15 transition-all text-xs font-mono"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                Criar primeira task
              </button>
            )}
          </div>
        )}

        {/* Task list */}
        {!isLoading && !isError && filtered.length > 0 && (
          <>
            {viewMode === 'grouped' ? (
              /* Grouped by category */
              <div className="space-y-2">
                {sortedCategories.map(cat => (
                  <CategorySection
                    key={cat}
                    category={cat}
                    tasks={byCategory[cat]}
                    projectId={selectedProjectId}
                    expanded={isCategoryExpanded(cat)}
                    onToggle={() => {
                      setAllExpanded(false)
                      toggleCategory(cat)
                    }}
                  />
                ))}
              </div>
            ) : (
              /* Flat list */
              <div className="border border-white/10 rounded-lg bg-white/[0.02] divide-y divide-white/5 overflow-hidden">
                {filtered.map(task => (
                  <TaskItem key={task.id} task={task} projectId={selectedProjectId} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Filtered empty state */}
        {!isLoading && !isError && totalTasks > 0 && filtered.length === 0 && (
          <div className="text-center py-10 space-y-2">
            <ListFilter className="w-8 h-8 text-white/10 mx-auto" />
            <p className="text-sm font-mono text-white/30">Nenhuma task com este filtro</p>
            <button
              onClick={() => setFilterStatus('all')}
              className="text-xs font-mono text-blue-400 hover:text-blue-300 transition-colors"
            >
              Limpar filtro
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
