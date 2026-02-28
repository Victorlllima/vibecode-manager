'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/app-layout'
import { ArrowLeft, ExternalLink, Send, CheckCircle2, Circle, Clock, ChevronRight } from 'lucide-react'
import { useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

type Project = {
  id: number; name: string; description: string; path: string
  status: string; priority: number; github_url: string
  last_activity: string; created_at: string
}
type Task = {
  id: number; title: string; status: string; assigned_agent: string
  priority: number; project_name: string; created_at: string
}
type Milestone = {
  id: number; project_id: number; title: string
  status: 'pending' | 'in_progress' | 'done'
  order: number; notes: string | null; created_at: string; updated_at: string
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  production:  { label: 'Em Produção',        dot: 'bg-green-500',  badge: 'bg-green-500/10 text-green-400 border-green-500/20' },
  development: { label: 'Em Desenvolvimento', dot: 'bg-blue-500',   badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  attention:   { label: 'Atenção',            dot: 'bg-yellow-500', badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  down:        { label: 'Offline',            dot: 'bg-red-500',    badge: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

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
          <p className="text-xs font-mono text-white/40 uppercase tracking-wide">Progresso</p>
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
              {currentStep ? '⚡ Em andamento' : '→ Próxima etapa sugerida'}
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

export default function ProjectDetailPage() {
  const { status } = useSession()
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const qc = useQueryClient()
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  if (status === 'loading') return (
    <div className="flex h-screen w-full items-center justify-center bg-neutral-950">
      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  )
  if (status === 'unauthenticated') { router.push('/login'); return null }

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ['project', id],
    queryFn: () => fetch(`${API}/api/projects/${id}`).then(r => r.json()),
    enabled: !!id,
  })

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: () => fetch(`${API}/api/tasks`).then(r => r.json()),
    enabled: !!id,
  })

  const { data: milestones = [] } = useQuery<Milestone[]>({
    queryKey: ['milestones', id],
    queryFn: () => fetch(`${API}/api/projects/${id}/milestones`).then(r => r.json()),
    enabled: !!id,
  })

  const projectTasks = tasks.filter(t => t.project_name === project?.name)

  const updateStatus = useMutation({
    mutationFn: (newStatus: string) =>
      fetch(`${API}/api/projects/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project', id] }); showToast('Status atualizado') },
  })

  const sendTelegram = async () => {
    if (!project) return
    const done = milestones.filter(m => m.status === 'done').length
    const next = milestones.find(m => m.status === 'pending')?.title || '—'
    await fetch(`${API}/api/telegram/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `📊 *${project.name}*\nStatus: ${project.status}\nProgresso: ${done}/${milestones.length} etapas\nPróximo: ${next}`
      }),
    })
    showToast('Enviado para o Telegram')
  }

  const cfg = STATUS_CONFIG[project?.status || ''] || STATUS_CONFIG.development

  return (
    <AppLayout>
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 bg-neutral-800 border border-white/10 rounded-lg px-4 py-2 text-sm text-white/80 font-mono">
          {toast}
        </div>
      )}

      <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white/40 hover:text-white/80 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xs font-mono text-white/40 uppercase tracking-widest">Projeto</h1>
      </div>

      {isLoading ? (
        <div className="px-6 py-8 space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-white/5 rounded animate-pulse" />)}
        </div>
      ) : !project ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-white/40 font-mono text-sm">Projeto não encontrado</p>
        </div>
      ) : (
        <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />
                <h2 className="text-lg font-semibold text-white">{project.name}</h2>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded border font-mono ${cfg.badge}`}>
                {cfg.label}
              </span>
            </div>
            {project.description && (
              <p className="text-sm text-white/50 mb-4">{project.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-white/30 font-mono">Prioridade P{project.priority}</span>
              <span className="text-xs text-white/30 font-mono">·</span>
              <span className="text-xs text-white/30 font-mono">Ativo {timeAgo(project.last_activity || project.created_at)}</span>
              {project.github_url && (
                <>
                  <span className="text-xs text-white/30 font-mono">·</span>
                  <a href={project.github_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-white/40 hover:text-white/70 font-mono flex items-center gap-1 transition-colors">
                    <ExternalLink className="w-3 h-3" />
                    GitHub
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Status Actions */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_CONFIG).map(([key, c]) => (
              <button
                key={key}
                onClick={() => updateStatus.mutate(key)}
                disabled={project.status === key || updateStatus.isPending}
                className={`text-xs font-mono px-3 py-1.5 rounded border transition-all ${
                  project.status === key
                    ? `${c.badge} cursor-default`
                    : 'border-white/10 text-white/30 hover:border-white/20 hover:text-white/60'
                }`}
              >
                {c.label}
              </button>
            ))}
            <button
              onClick={sendTelegram}
              className="text-xs font-mono px-3 py-1.5 rounded border border-white/10 text-white/30 hover:border-blue-400/30 hover:text-blue-400 transition-all flex items-center gap-1.5"
            >
              <Send className="w-3 h-3" /> Telegram
            </button>
          </div>

          {/* Roadmap Timeline */}
          <div>
            <h3 className="text-xs font-mono text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ChevronRight className="w-3 h-3" />
              Roadmap ({milestones.length} etapas)
            </h3>
            {milestones.length === 0 ? (
              <p className="text-xs text-white/20 font-mono py-4 text-center">Nenhuma etapa cadastrada</p>
            ) : (
              <MilestoneTimeline milestones={milestones} projectId={Number(id)} />
            )}
          </div>

          {/* Tasks */}
          {projectTasks.length > 0 && (
            <div>
              <h3 className="text-xs font-mono text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                <ChevronRight className="w-3 h-3" />
                Tasks ({projectTasks.length})
              </h3>
              <div className="space-y-2">
                {projectTasks.map(task => (
                  <div key={task.id} className="bg-white/5 border border-white/10 rounded px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{task.title}</p>
                      {task.assigned_agent && (
                        <p className="text-xs text-white/30 font-mono mt-0.5">{task.assigned_agent}</p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded font-mono shrink-0 ${
                      task.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                      task.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-white/5 text-white/30'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {project.path && (
            <div className="bg-white/5 border border-white/10 rounded px-4 py-3">
              <p className="text-xs text-white/30 font-mono uppercase tracking-wide mb-1">Path</p>
              <p className="text-xs text-white/60 font-mono">{project.path}</p>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  )
}
