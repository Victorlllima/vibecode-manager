'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { AppLayout } from '@/components/app-layout'
import { useProject } from '@/contexts/project-context'
import { HeartbeatECG, HeartbeatPulse } from '@/components/heartbeat-ecg'
import {
  Plus, RefreshCw, Activity, FolderOpen,
  CheckSquare, Zap, Send, Clock, Wifi, WifiOff
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

type Project = {
  id: number
  name: string
  description: string
  path: string
  status: string
  priority: number
  github_url: string
  last_activity: string
  created_at: string
}

type Heartbeat = {
  id: number
  status: string
  tasks_processed: number
  system_load: number
  created_at: string
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  production:  { label: 'Em Produção',        dot: 'bg-green-500',  badge: 'bg-green-500/10 text-green-400 border-green-500/20' },
  development: { label: 'Em Desenvolvimento', dot: 'bg-blue-500',   badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  attention:   { label: 'Atenção',            dot: 'bg-yellow-500', badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  down:        { label: 'Offline',            dot: 'bg-red-500',    badge: 'bg-red-500/10 text-red-400 border-red-500/20' },
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

function StatusDot({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.development
  return <span className={`inline-block w-2 h-2 rounded-full ${config.dot} shrink-0 mt-1`} />
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.development
  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-mono ${config.badge}`}>
      {config.label}
    </span>
  )
}

function ProjectCard({ project, onSendStatus, onClick }: { project: Project; onSendStatus: (p: Project) => void; onClick: () => void }) {
  return (
    <div onClick={onClick} className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/[0.08] hover:border-white/20 transition-all group cursor-pointer">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-start gap-2 min-w-0">
          <StatusDot status={project.status} />
          <h3 className="text-sm font-medium text-white truncate">{project.name}</h3>
        </div>
        <StatusBadge status={project.status} />
      </div>
      {project.description && (
        <p className="text-xs text-white/50 mb-3 line-clamp-2">{project.description}</p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/30 font-mono">
          {timeAgo(project.last_activity || project.created_at)}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/30 font-mono">P{project.priority}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onSendStatus(project) }}
            title="Enviar status pelo Telegram"
            className="opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-blue-400"
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      </div>
      {project.github_url && (
        <a
          href={project.github_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block text-xs text-white/30 hover:text-white/60 font-mono truncate transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {project.github_url.replace('https://github.com/', 'github.com/')}
        </a>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; accent?: string
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center gap-3">
      <div className={`rounded-md p-2 shrink-0 ${accent || 'bg-white/[0.08]'}`}>
        <Icon className="w-4 h-4 text-white/60" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-white/40 font-mono uppercase tracking-wide">{label}</p>
        <p className="text-lg font-semibold text-white leading-tight">{value}</p>
        {sub && <p className="text-xs text-white/30 font-mono">{sub}</p>}
      </div>
    </div>
  )
}

function HeartbeatWidget({ heartbeat, isLoading }: { heartbeat: Heartbeat | null; isLoading: boolean }) {
  if (isLoading) return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center gap-3 animate-pulse">
      <div className="bg-white/[0.08] rounded-md p-2"><Activity className="w-4 h-4 text-white/20" /></div>
      <div className="h-8 bg-white/10 rounded w-24" />
    </div>
  )

  const isOnline = heartbeat && (Date.now() - new Date(heartbeat.created_at).getTime()) < 20 * 60 * 1000

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          {isOnline ? <HeartbeatPulse /> : <span className="w-3 h-3 rounded-full bg-red-500" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/40 font-mono uppercase tracking-wide">Heartbeat</p>
            <p className={`text-xs font-mono font-semibold ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
              {isOnline ? heartbeat?.status?.toUpperCase() : 'OFFLINE'}
            </p>
          </div>
          <p className="text-xs text-white/30 font-mono mt-0.5">
            {heartbeat ? `${timeAgo(heartbeat.created_at)} · load ${heartbeat.system_load ?? '—'}` : 'sem dados'}
          </p>
        </div>
      </div>
      {isOnline && <HeartbeatECG className="mx-auto" />}
    </div>
  )
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { setSelectedProjectId } = useProject()
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  const { data: projects = [], isLoading: loadingProjects, refetch: refetchProjects } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => fetch(`${API}/api/projects`).then(r => r.json()),
    refetchInterval: 30_000,
    enabled: status === 'authenticated',
  })

  const { data: heartbeat, isLoading: loadingHeartbeat } = useQuery<Heartbeat>({
    queryKey: ['heartbeat'],
    queryFn: () => fetch(`${API}/api/heartbeat/latest`).then(r => r.json()),
    refetchInterval: 60_000,
    enabled: status === 'authenticated',
  })

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  const sendStatusToTelegram = useCallback(async (project: Project) => {
    try {
      await fetch(`${API}/api/telegram/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `📊 *${project.name}*\nStatus: ${project.status}\n${project.description || ''}`
        }),
      })
      showToast(`"${project.name}" enviado para o Telegram`)
    } catch {
      showToast('Erro ao enviar para o Telegram')
    }
  }, [showToast])

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-neutral-950">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  const byStatus = (s: string) => projects.filter((p) => p.status === s).length

  return (
    <AppLayout>
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 bg-neutral-800 border border-white/10 rounded-lg px-4 py-2 text-sm text-white/80 font-mono">
          {toast}
        </div>
      )}

      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <h1 className="text-xs font-mono text-white/40 uppercase tracking-widest">Dashboard</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => refetchProjects()} className="text-white/40 hover:text-white/80 transition-colors" title="Atualizar">
            <RefreshCw className="w-4 h-4" />
          </button>
          <span className="text-xs text-white/20 font-mono hidden sm:flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={FolderOpen} label="Projetos" value={projects.length} sub="total cadastrados" />
          <StatCard icon={Zap} label="Em Produção" value={byStatus('production')} sub="production ready" accent="bg-green-500/10" />
          <StatCard icon={CheckSquare} label="Em Dev" value={byStatus('development')} sub="in development" accent="bg-blue-500/10" />
          <HeartbeatWidget heartbeat={heartbeat ?? null} isLoading={loadingHeartbeat} />
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-mono text-white/60 uppercase tracking-widest">Projetos</h2>
          <Button
            size="sm"
            className="bg-white text-black hover:bg-white/90 font-mono text-xs h-7 px-3 rounded"
            onClick={() => router.push('/projects/add')}
          >
            <Plus className="w-3 h-3 mr-1" />
            Novo Projeto
          </Button>
        </div>

        {loadingProjects ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-4 animate-pulse h-28" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FolderOpen className="w-10 h-10 text-white/20 mb-3" />
            <p className="text-white/40 text-sm font-mono">Nenhum projeto cadastrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} onSendStatus={sendStatusToTelegram} onClick={() => { setSelectedProjectId(p.id); router.push('/roadmap') }} />
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-4 pt-2 border-t border-white/5">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              <span className="text-xs text-white/30 font-mono">{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
