'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/app-layout'
import { useProject } from '@/contexts/project-context'
import { useState, useCallback } from 'react'
import {
  Activity, RefreshCw, CheckCircle2, XCircle,
  Clock, GitBranch, ExternalLink, Zap,
  ChevronDown, ChevronRight, AlertTriangle,
  Loader2, Inbox, Lightbulb, Timer,
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

// ─── Types ──────────────────────────────────────────────────────────────────

type Build = {
  id: number
  project_id: number
  project_name?: string
  run_id: number
  run_number: number
  workflow_name: string
  branch: string
  commit_sha: string
  commit_message: string | null
  status: string
  conclusion: string | null
  started_at: string
  completed_at: string | null
  duration_seconds: number | null
  logs_url: string | null
  error_summary: string | null
  ai_suggestion: string | null
  created_at: string
}

type BuildStats = {
  total: number
  success: number
  failure: number
  cancelled: number
  running: number
  avg_duration: number | null
  last_24h: number
  failures_24h: number
  success_rate: number
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function formatDuration(seconds: number | null) {
  if (!seconds) return '—'
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

const CONCLUSION_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; bg: string; border: string; label: string }> = {
  success:   { icon: CheckCircle2,   color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20', label: 'Sucesso' },
  failure:   { icon: XCircle,        color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',   label: 'Falhou' },
  cancelled: { icon: XCircle,        color: 'text-white/30',   bg: 'bg-white/5',       border: 'border-white/10',     label: 'Cancelado' },
  timed_out: { icon: AlertTriangle,  color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', label: 'Timeout' },
  skipped:   { icon: Clock,          color: 'text-white/20',   bg: 'bg-white/5',       border: 'border-white/5',      label: 'Ignorado' },
}

const RUNNING_CONFIG = { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Rodando' }

// ─── Stat Card ──────────────────────────────────────────────────────────────

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

// ─── Build Row ──────────────────────────────────────────────────────────────

function BuildRow({ build, showProject }: { build: Build; showProject?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const isRunning = build.status === 'in_progress' || build.status === 'queued'
  const cfg = isRunning ? RUNNING_CONFIG : (CONCLUSION_CONFIG[build.conclusion || ''] || CONCLUSION_CONFIG.cancelled)
  const Icon = cfg.icon
  const hasSuggestion = !!build.ai_suggestion
  const hasError = !!build.error_summary

  return (
    <div className="border-b border-white/5 last:border-b-0">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left"
      >
        {/* Status icon */}
        <div className={`shrink-0 ${cfg.color}`}>
          <Icon className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {showProject && build.project_name && (
              <span className="text-xs font-mono text-white/40 bg-white/5 px-1.5 py-0.5 rounded">
                {build.project_name}
              </span>
            )}
            <span className="text-sm font-mono text-white/80 truncate">
              {build.commit_message?.split('\n')[0] || `Build #${build.run_number}`}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs font-mono text-white/30 flex items-center gap-1">
              <GitBranch className="w-3 h-3" />
              {build.branch}
            </span>
            <span className="text-xs font-mono text-white/20">
              {build.commit_sha?.substring(0, 7)}
            </span>
            <span className="text-xs font-mono text-white/20">
              {timeAgo(build.started_at)}
            </span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 shrink-0">
          {hasSuggestion && (
            <span title="Tem sugestão de fix"><Lightbulb className="w-3.5 h-3.5 text-yellow-400" /></span>
          )}
          <div className="flex items-center gap-1 text-xs font-mono text-white/30">
            <Timer className="w-3 h-3" />
            {formatDuration(build.duration_seconds)}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded border font-mono ${cfg.bg} ${cfg.color} ${cfg.border}`}>
            {cfg.label}
          </span>
          {build.workflow_name && (
            <span className="text-xs font-mono text-white/20 hidden sm:block">
              {build.workflow_name}
            </span>
          )}
          {expanded ? <ChevronDown className="w-3 h-3 text-white/20" /> : <ChevronRight className="w-3 h-3 text-white/20" />}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3 ml-7">
          {/* Error summary */}
          {hasError && (
            <div className="bg-red-500/5 border border-red-500/15 rounded-lg p-3">
              <p className="text-xs font-mono text-red-400/80 uppercase tracking-wide mb-1">Erro</p>
              <pre className="text-xs font-mono text-white/50 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                {build.error_summary}
              </pre>
            </div>
          )}

          {/* AI suggestion */}
          {hasSuggestion && (
            <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-lg p-3">
              <p className="text-xs font-mono text-yellow-400/80 uppercase tracking-wide mb-1 flex items-center gap-1">
                <Lightbulb className="w-3 h-3" />
                Sugestão de fix
              </p>
              <p className="text-xs font-mono text-white/60 whitespace-pre-wrap leading-relaxed">
                {build.ai_suggestion}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-white/25">
            <span>Run #{build.run_number}</span>
            <span>SHA: {build.commit_sha?.substring(0, 7)}</span>
            {build.started_at && <span>Início: {new Date(build.started_at).toLocaleString('pt-BR')}</span>}
            {build.completed_at && <span>Fim: {new Date(build.completed_at).toLocaleString('pt-BR')}</span>}
          </div>

          {/* GitHub link */}
          {build.logs_url && (
            <a
              href={build.logs_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-white/40 hover:text-white/70 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Ver no GitHub
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function CICDPage() {
  const { status } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { selectedProject, selectedProjectId } = useProject()
  const [viewMode, setViewMode] = useState<'project' | 'global'>('project')
  const [filterConclusion, setFilterConclusion] = useState<string>('all')
  const [polling, setPolling] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }, [])

  // Auth guard
  if (status === 'loading') return (
    <div className="flex h-screen w-full items-center justify-center bg-neutral-950">
      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  )
  if (status === 'unauthenticated') { router.push('/login'); return null }

  // Fetch builds (per project or global)
  const { data: projectBuilds = [], isLoading: loadingProject } = useQuery<Build[]>({
    queryKey: ['project-builds', selectedProjectId, filterConclusion],
    queryFn: () => {
      let url = `${API}/api/projects/${selectedProjectId}/builds?limit=30`
      if (filterConclusion !== 'all') url += `&conclusion=${filterConclusion}`
      return fetch(url).then(r => r.json())
    },
    enabled: viewMode === 'project' && !!selectedProjectId,
    refetchInterval: 60_000,
  })

  const { data: globalBuilds = [], isLoading: loadingGlobal } = useQuery<Build[]>({
    queryKey: ['global-builds'],
    queryFn: () => fetch(`${API}/api/builds/recent?limit=30`).then(r => r.json()),
    enabled: viewMode === 'global',
    refetchInterval: 60_000,
  })

  const { data: stats } = useQuery<BuildStats>({
    queryKey: ['build-stats'],
    queryFn: () => fetch(`${API}/api/builds/stats`).then(r => r.json()),
    refetchInterval: 60_000,
  })

  const builds = viewMode === 'project' ? projectBuilds : globalBuilds
  const isLoading = viewMode === 'project' ? loadingProject : loadingGlobal

  const handlePoll = async () => {
    setPolling(true)
    try {
      if (viewMode === 'project' && selectedProjectId) {
        await fetch(`${API}/api/projects/${selectedProjectId}/builds/poll`, { method: 'POST' })
        queryClient.invalidateQueries({ queryKey: ['project-builds'] })
      } else {
        await fetch(`${API}/api/builds/poll-all`, { method: 'POST' })
        queryClient.invalidateQueries({ queryKey: ['global-builds'] })
      }
      queryClient.invalidateQueries({ queryKey: ['build-stats'] })
      showToast('Builds atualizados')
    } catch {
      showToast('Erro ao atualizar builds')
    }
    setPolling(false)
  }

  return (
    <AppLayout>
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 bg-neutral-800 border border-white/10 rounded-lg px-4 py-2 text-sm text-white/80 font-mono">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-4 h-4 text-white/40" />
          <h1 className="text-xs font-mono text-white/40 uppercase tracking-widest">CI/CD Monitor</h1>
          {viewMode === 'project' && selectedProject && (
            <>
              <span className="text-white/10">/</span>
              <span className="text-xs font-mono text-white/60">{selectedProject.name}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <button
            onClick={() => setViewMode(v => v === 'project' ? 'global' : 'project')}
            className="text-xs font-mono text-white/30 hover:text-white/60 transition-colors"
          >
            {viewMode === 'project' ? 'ver global' : 'ver por projeto'}
          </button>
          <span className="text-white/10">|</span>
          <button
            onClick={handlePoll}
            disabled={polling}
            className="flex items-center gap-1 text-xs font-mono text-white/30 hover:text-white/60 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3 h-3 ${polling ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      <div className="px-6 py-6 max-w-4xl mx-auto space-y-6">
        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              icon={Activity}
              label="Total Builds"
              value={stats.total}
              sub={`${stats.last_24h} nas últimas 24h`}
            />
            <StatCard
              icon={CheckCircle2}
              label="Taxa de Sucesso"
              value={`${stats.success_rate}%`}
              sub={`${stats.success} sucesso / ${stats.failure} falhas`}
              accent={stats.success_rate >= 80 ? 'bg-green-500/10' : stats.success_rate >= 50 ? 'bg-yellow-500/10' : 'bg-red-500/10'}
            />
            <StatCard
              icon={XCircle}
              label="Falhas 24h"
              value={stats.failures_24h}
              sub={stats.failures_24h > 0 ? 'requer atenção' : 'tudo limpo'}
              accent={stats.failures_24h > 0 ? 'bg-red-500/10' : 'bg-green-500/10'}
            />
            <StatCard
              icon={Timer}
              label="Duração Média"
              value={formatDuration(stats.avg_duration)}
              sub={stats.running > 0 ? `${stats.running} rodando agora` : 'nenhum rodando'}
              accent={stats.running > 0 ? 'bg-blue-500/10' : 'bg-white/[0.08]'}
            />
          </div>
        )}

        {/* Filter buttons */}
        {viewMode === 'project' && (
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'Todos', color: 'text-white/60', bg: 'bg-white/10', border: 'border-white/20' },
              { key: 'success', label: 'Sucesso', ...CONCLUSION_CONFIG.success },
              { key: 'failure', label: 'Falhas', ...CONCLUSION_CONFIG.failure },
              { key: 'cancelled', label: 'Cancelados', ...CONCLUSION_CONFIG.cancelled },
            ].map(item => {
              const active = filterConclusion === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => setFilterConclusion(active ? 'all' : item.key)}
                  className={`flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded border transition-all ${
                    active
                      ? `${item.bg} ${item.color} ${item.border}`
                      : 'border-white/10 text-white/30 hover:border-white/20'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        )}

        {/* No project selected (project view) */}
        {viewMode === 'project' && !selectedProjectId && (
          <div className="flex-1 flex items-center justify-center min-h-[40vh]">
            <div className="text-center space-y-3">
              <Activity className="w-10 h-10 text-white/10 mx-auto" />
              <p className="text-sm font-mono text-white/30">Selecione um projeto no menu superior</p>
              <p className="text-xs font-mono text-white/15">Ou alterne para visão global</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-white/5 border border-white/10 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && builds.length === 0 && (viewMode === 'global' || selectedProjectId) && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <Inbox className="w-12 h-12 text-white/10" />
            <div className="text-center space-y-1">
              <p className="text-sm font-mono text-white/40">Nenhum build encontrado</p>
              <p className="text-xs font-mono text-white/20">
                Configure GitHub Actions no projeto e clique em &quot;Atualizar&quot;
              </p>
            </div>
            <button
              onClick={handlePoll}
              disabled={polling}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white/70 hover:text-white hover:bg-white/15 transition-all text-xs font-mono"
            >
              <Zap className="w-3.5 h-3.5" />
              Verificar agora
            </button>
          </div>
        )}

        {/* Build list */}
        {!isLoading && builds.length > 0 && (
          <div className="border border-white/10 rounded-lg bg-white/[0.02] overflow-hidden">
            {builds.map(build => (
              <BuildRow key={build.id} build={build} showProject={viewMode === 'global'} />
            ))}
          </div>
        )}

        {/* Info footer */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-white/5 text-xs font-mono text-white/20">
          <span className="flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            Polling automático a cada 5 minutos
          </span>
          <span>·</span>
          <span>Webhook: POST /api/webhook/github</span>
        </div>
      </div>
    </AppLayout>
  )
}
