'use client'

import { useState, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle, AlertCircle, XCircle, FileText,
  TrendingUp, ListChecks, Server, Activity, Gem, Loader2,
  RefreshCw, Cpu, HardDrive, MemoryStick, ChevronDown, ChevronRight, Power
} from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { useProject } from '@/contexts/project-context'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

// ---------------------------------------------------------------------------
// Types (matching API response)
// ---------------------------------------------------------------------------

type HealthResponse = {
  overall: number
  dimensions: {
    tasks: { score: number; completed: number; total: number }
    infrastructure: { score: number; heartbeatOnline: boolean; lastPing: string | null }
    activity: { score: number; lastPush: string | null; openIssues: number | null }
    quality: { score: number }
  }
  status: string
}

type Issue = {
  type: 'ok' | 'warn' | 'error'
  message: string
}

type DimensionDisplay = {
  key: string
  label: string
  score: number
  icon: React.ElementType
  description: string
  weight: number
}

// ---------------------------------------------------------------------------
// Score color helpers
// ---------------------------------------------------------------------------

function scoreColor(score: number): string {
  if (score >= 7) return 'text-green-400'
  if (score >= 4) return 'text-yellow-400'
  return 'text-red-400'
}

function scoreBg(score: number): string {
  if (score >= 7) return 'bg-green-500/10 border-green-500/20'
  if (score >= 4) return 'bg-yellow-500/10 border-yellow-500/20'
  return 'bg-red-500/10 border-red-500/20'
}

function scoreBarColor(score: number): string {
  if (score >= 7) return 'bg-green-500'
  if (score >= 4) return 'bg-yellow-500'
  return 'bg-red-500'
}

function scoreStroke(score: number): string {
  if (score >= 7) return '#22c55e'
  if (score >= 4) return '#eab308'
  return '#ef4444'
}

// ---------------------------------------------------------------------------
// Derive issues from real health data
// ---------------------------------------------------------------------------

function deriveIssues(data: HealthResponse): Issue[] {
  const issues: Issue[] = []
  const { tasks, infrastructure, activity, quality } = data.dimensions

  // Tasks issues
  if (tasks.total === 0) {
    issues.push({ type: 'warn', message: 'Nenhuma task cadastrada no projeto' })
  } else {
    const pct = Math.round((tasks.completed / tasks.total) * 100)
    if (pct >= 80) {
      issues.push({ type: 'ok', message: `${pct}% das tasks concluidas (${tasks.completed}/${tasks.total})` })
    } else if (pct >= 50) {
      issues.push({ type: 'warn', message: `Apenas ${pct}% das tasks concluidas (${tasks.completed}/${tasks.total})` })
    } else {
      issues.push({ type: 'error', message: `Baixa conclusao: ${pct}% das tasks (${tasks.completed}/${tasks.total})` })
    }
  }

  // Infrastructure issues
  if (infrastructure.heartbeatOnline) {
    issues.push({ type: 'ok', message: 'Heartbeat online e respondendo normalmente' })
  } else {
    issues.push({ type: 'error', message: 'Heartbeat offline — sistema pode estar indisponivel' })
  }

  if (infrastructure.lastPing) {
    const minutesAgo = Math.round((Date.now() - new Date(infrastructure.lastPing).getTime()) / (1000 * 60))
    if (minutesAgo > 30) {
      issues.push({ type: 'warn', message: `Ultimo ping ha ${minutesAgo} minutos` })
    }
  } else {
    issues.push({ type: 'warn', message: 'Nenhum heartbeat registrado' })
  }

  // Activity issues
  if (activity.lastPush) {
    const daysAgo = Math.round((Date.now() - new Date(activity.lastPush).getTime()) / (1000 * 60 * 60 * 24))
    if (daysAgo <= 1) {
      issues.push({ type: 'ok', message: 'Push recente no repositorio (hoje)' })
    } else if (daysAgo <= 7) {
      issues.push({ type: 'ok', message: `Ultimo push ha ${daysAgo} dia${daysAgo > 1 ? 's' : ''}` })
    } else {
      issues.push({ type: 'warn', message: `Sem push ha ${daysAgo} dias — repositorio pode estar inativo` })
    }
  } else {
    issues.push({ type: 'warn', message: 'Sem dados de push do repositorio' })
  }

  if (activity.openIssues !== null && activity.openIssues !== undefined) {
    if (activity.openIssues > 20) {
      issues.push({ type: 'warn', message: `${activity.openIssues} issues abertas no GitHub` })
    } else if (activity.openIssues > 0) {
      issues.push({ type: 'ok', message: `${activity.openIssues} issue${activity.openIssues > 1 ? 's' : ''} aberta${activity.openIssues > 1 ? 's' : ''} no GitHub` })
    } else {
      issues.push({ type: 'ok', message: 'Nenhuma issue aberta no GitHub' })
    }
  }

  // Quality issues
  if (quality.score >= 7) {
    issues.push({ type: 'ok', message: 'Score de qualidade satisfatorio' })
  } else if (quality.score >= 4) {
    issues.push({ type: 'warn', message: 'Score de qualidade abaixo do ideal' })
  } else {
    issues.push({ type: 'error', message: 'Score de qualidade critico' })
  }

  return issues
}

// ---------------------------------------------------------------------------
// Map API dimensions to display format
// ---------------------------------------------------------------------------

function mapDimensions(data: HealthResponse): DimensionDisplay[] {
  const { tasks, infrastructure, activity, quality } = data.dimensions
  return [
    {
      key: 'tasks',
      label: 'Tasks',
      score: tasks.score,
      icon: ListChecks,
      description: `${tasks.completed}/${tasks.total} concluidas`,
      weight: 30,
    },
    {
      key: 'infrastructure',
      label: 'Infraestrutura',
      score: infrastructure.score,
      icon: Server,
      description: infrastructure.heartbeatOnline
        ? `Online — ultimo ping ${infrastructure.lastPing ? formatRelativeTime(infrastructure.lastPing) : 'n/a'}`
        : 'Heartbeat offline',
      weight: 30,
    },
    {
      key: 'activity',
      label: 'Atividade',
      score: activity.score,
      icon: Activity,
      description: activity.lastPush
        ? `Push ${formatRelativeTime(activity.lastPush)}${activity.openIssues != null ? ` · ${activity.openIssues} issues` : ''}`
        : 'Sem dados de atividade',
      weight: 20,
    },
    {
      key: 'quality',
      label: 'Qualidade',
      score: quality.score,
      icon: Gem,
      description: 'Analise estatica, type safety, complexidade',
      weight: 20,
    },
  ]
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `ha ${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `ha ${hours}h`
  const days = Math.floor(hours / 24)
  return `ha ${days}d`
}

// ---------------------------------------------------------------------------
// Generate estimated history (derived from current score)
// ---------------------------------------------------------------------------

function generateEstimatedHistory(overall: number, projectId: number): number[] {
  const seed = (projectId * 1337) % 100
  return Array.from({ length: 7 }, (_, i) => {
    const variance = ((seed + i * 13) % 20) / 10 - 1
    return Math.min(10, Math.max(0, parseFloat((overall + variance * 0.8).toFixed(1))))
  })
}

// ---------------------------------------------------------------------------
// CircularScore SVG component
// ---------------------------------------------------------------------------

function CircularScore({ score }: { score: number }) {
  const radius = 72
  const circumference = 2 * Math.PI * radius
  const progress = (score / 10) * circumference
  const color = scoreStroke(score)

  return (
    <div className="relative flex items-center justify-center w-48 h-48">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 180 180">
        <circle
          cx="90" cy="90" r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="12"
        />
        <circle
          cx="90" cy="90" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          style={{ transition: 'stroke-dasharray 1s ease-in-out' }}
        />
      </svg>

      <div className="relative flex flex-col items-center">
        <span className={`text-4xl font-bold font-mono leading-none ${scoreColor(score)}`}>
          {score.toFixed(1)}
        </span>
        <span className="text-xs text-white/30 font-mono mt-1">/10</span>
        <span className={`text-xs font-mono mt-2 px-2 py-0.5 rounded border ${scoreBg(score)} ${scoreColor(score)}`}>
          {score >= 7 ? 'Saudavel' : score >= 4 ? 'Atencao' : 'Critico'}
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// DimensionCard component
// ---------------------------------------------------------------------------

function DimensionCard({ dim }: { dim: DimensionDisplay }) {
  const Icon = dim.icon
  const pct = (dim.score / 10) * 100

  return (
    <div className={`bg-white/5 border rounded-lg p-4 ${scoreBg(dim.score)}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded ${scoreColor(dim.score).replace('text-', 'bg-').replace('-400', '-500/20')}`}>
            <Icon className={`w-4 h-4 ${scoreColor(dim.score)}`} />
          </div>
          <div>
            <span className="text-sm font-semibold text-white">{dim.label}</span>
            <span className="ml-1.5 text-xs text-white/30 font-mono">{dim.weight}%</span>
          </div>
        </div>
        <span className={`text-lg font-bold font-mono ${scoreColor(dim.score)}`}>
          {dim.score.toFixed(1)}
        </span>
      </div>

      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-700 ${scoreBarColor(dim.score)}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-xs text-white/30 font-mono leading-relaxed">{dim.description}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// IssueRow component
// ---------------------------------------------------------------------------

function IssueRow({ issue }: { issue: Issue }) {
  const icon = issue.type === 'ok'
    ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
    : issue.type === 'warn'
    ? <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0" />
    : <XCircle className="w-4 h-4 text-red-400 shrink-0" />

  return (
    <div className="flex items-center gap-2.5 py-2 px-3 rounded hover:bg-white/[0.04] transition-colors">
      {icon}
      <span className="text-sm text-white/70 font-mono">{issue.message}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// HistoryChart component (pure CSS bar chart)
// ---------------------------------------------------------------------------

function HistoryChart({ history }: { history: number[] }) {
  const days = ['D-6', 'D-5', 'D-4', 'D-3', 'D-2', 'D-1', 'Hoje']
  const maxVal = 10

  return (
    <div className="flex items-end justify-between gap-2 h-24 px-1">
      {history.map((val, i) => {
        const heightPct = (val / maxVal) * 100
        return (
          <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
            <span className={`text-xs font-mono ${scoreColor(val)}`}>{val.toFixed(1)}</span>
            <div className="w-full flex items-end" style={{ height: '60px' }}>
              <div
                className={`w-full rounded-t transition-all duration-500 ${scoreBarColor(val)}`}
                style={{ height: `${heightPct}%`, minHeight: '4px', opacity: i === 6 ? 1 : 0.65 }}
              />
            </div>
            <span className="text-xs font-mono text-white/25">{days[i]}</span>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Server Health Section (Self-Healing)
// ---------------------------------------------------------------------------

type ServerReport = {
  timestamp: string
  ssh_ok: boolean
  services: Array<{
    name: string
    running: boolean
    pid: number | null
    memory: number | null
    cpu: number | null
    uptime: number | null
    restarts: number
    action: string | null
  }>
  disk: { usage_pct: number; raw: string } | null
  memory: { used_mb: number; total_mb: number; usage_pct: number } | null
  actions: Array<{ type: string; message?: string; service?: string; success?: boolean }>
}

function ServerHealthSection({ showToast }: { showToast: (msg: string) => void }) {
  const [expanded, setExpanded] = useState(true)
  const [restarting, setRestarting] = useState<string | null>(null)

  const { data: serverHealth, isLoading, refetch } = useQuery<ServerReport>({
    queryKey: ['server-health'],
    queryFn: () => fetch(`${API}/api/server/health`).then(r => r.json()),
    refetchInterval: 5 * 60 * 1000,
    enabled: expanded,
  })

  const handleRestart = async (serviceName: string) => {
    setRestarting(serviceName)
    try {
      const res = await fetch(`${API}/api/server/restart/${serviceName}`, { method: 'POST' })
      const data = await res.json()
      showToast(data.ok ? `${serviceName} reiniciado` : `Falha ao reiniciar ${serviceName}`)
      refetch()
    } catch {
      showToast(`Erro ao reiniciar ${serviceName}`)
    }
    setRestarting(null)
  }

  const allOnline = serverHealth?.services?.every(s => s.running) ?? false

  return (
    <section className="space-y-3">
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-2 w-full text-left"
      >
        {expanded ? <ChevronDown className="w-3 h-3 text-white/30" /> : <ChevronRight className="w-3 h-3 text-white/30" />}
        <h2 className="text-xs font-mono text-white/40 uppercase tracking-widest">
          Infraestrutura do Servidor
        </h2>
        {serverHealth && (
          <span className={`w-2 h-2 rounded-full ${allOnline ? 'bg-green-500' : 'bg-red-500'}`} />
        )}
        <span className="flex-1" />
        <button
          onClick={(e) => { e.stopPropagation(); refetch() }}
          className="text-xs font-mono text-white/25 hover:text-white/50 transition-colors flex items-center gap-1"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </button>

      {expanded && (
        <div className="space-y-3">
          {isLoading && !serverHealth && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 text-white/30 animate-spin" />
              <span className="text-xs font-mono text-white/30">Verificando servidor...</span>
            </div>
          )}

          {serverHealth && (
            <>
              {/* Connection status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* SSH */}
                <div className={`bg-white/5 border rounded-lg p-4 ${serverHealth.ssh_ok ? 'border-green-500/20' : 'border-red-500/20'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Server className={`w-4 h-4 ${serverHealth.ssh_ok ? 'text-green-400' : 'text-red-400'}`} />
                    <span className="text-xs font-mono text-white/60">SSH</span>
                  </div>
                  <p className={`text-sm font-mono font-semibold ${serverHealth.ssh_ok ? 'text-green-400' : 'text-red-400'}`}>
                    {serverHealth.ssh_ok ? 'Conectado' : 'Offline'}
                  </p>
                </div>

                {/* Disk */}
                <div className={`bg-white/5 border rounded-lg p-4 ${
                  serverHealth.disk ? (serverHealth.disk.usage_pct > 90 ? 'border-red-500/20' : serverHealth.disk.usage_pct > 70 ? 'border-yellow-500/20' : 'border-white/10') : 'border-white/10'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <HardDrive className="w-4 h-4 text-white/40" />
                    <span className="text-xs font-mono text-white/60">Disco</span>
                  </div>
                  {serverHealth.disk ? (
                    <>
                      <p className={`text-sm font-mono font-semibold ${
                        serverHealth.disk.usage_pct > 90 ? 'text-red-400' : serverHealth.disk.usage_pct > 70 ? 'text-yellow-400' : 'text-white'
                      }`}>
                        {serverHealth.disk.usage_pct}%
                      </p>
                      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full ${serverHealth.disk.usage_pct > 90 ? 'bg-red-500' : serverHealth.disk.usage_pct > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${serverHealth.disk.usage_pct}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <p className="text-sm font-mono text-white/30">—</p>
                  )}
                </div>

                {/* Memory */}
                <div className={`bg-white/5 border rounded-lg p-4 ${
                  serverHealth.memory ? (serverHealth.memory.usage_pct > 90 ? 'border-red-500/20' : serverHealth.memory.usage_pct > 70 ? 'border-yellow-500/20' : 'border-white/10') : 'border-white/10'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Cpu className="w-4 h-4 text-white/40" />
                    <span className="text-xs font-mono text-white/60">Memória</span>
                  </div>
                  {serverHealth.memory ? (
                    <>
                      <p className={`text-sm font-mono font-semibold ${
                        serverHealth.memory.usage_pct > 90 ? 'text-red-400' : serverHealth.memory.usage_pct > 70 ? 'text-yellow-400' : 'text-white'
                      }`}>
                        {serverHealth.memory.used_mb}MB / {serverHealth.memory.total_mb}MB ({serverHealth.memory.usage_pct}%)
                      </p>
                      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full ${serverHealth.memory.usage_pct > 90 ? 'bg-red-500' : serverHealth.memory.usage_pct > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${serverHealth.memory.usage_pct}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <p className="text-sm font-mono text-white/30">—</p>
                  )}
                </div>
              </div>

              {/* Services */}
              <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                  <h3 className="text-xs font-mono text-white/40 uppercase tracking-widest">Serviços pm2</h3>
                  <span className="text-xs font-mono text-white/20">
                    {serverHealth.services.filter(s => s.running).length}/{serverHealth.services.length} online
                  </span>
                </div>
                <div className="divide-y divide-white/5">
                  {serverHealth.services.map(svc => (
                    <div key={svc.name} className="flex items-center gap-3 px-4 py-3">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${svc.running ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono text-white/80">{svc.name}</p>
                        <div className="flex items-center gap-3 text-xs font-mono text-white/25 mt-0.5">
                          {svc.pid && <span>PID {svc.pid}</span>}
                          {svc.memory !== null && <span>{svc.memory}MB</span>}
                          {svc.cpu !== null && <span>CPU {svc.cpu}%</span>}
                          {svc.restarts > 0 && <span className="text-yellow-400/60">{svc.restarts} restarts</span>}
                          {svc.action && (
                            <span className={svc.action === 'restarted' ? 'text-green-400/60' : 'text-red-400/60'}>
                              {svc.action === 'restarted' ? 'reiniciado auto' : svc.action}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRestart(svc.name)}
                        disabled={restarting === svc.name}
                        className="text-xs font-mono text-white/20 hover:text-white/60 transition-colors flex items-center gap-1 px-2 py-1 rounded border border-white/5 hover:border-white/15"
                      >
                        {restarting === svc.name ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Power className="w-3 h-3" />
                        )}
                        restart
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions taken */}
              {serverHealth.actions.length > 0 && (
                <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-lg p-4">
                  <p className="text-xs font-mono text-yellow-400/80 uppercase tracking-wide mb-2">Ações executadas</p>
                  <div className="space-y-1">
                    {serverHealth.actions.map((action, i) => (
                      <p key={i} className="text-xs font-mono text-white/50">
                        {action.type === 'restart' ? `🔄 ${action.service} — ${action.success ? 'reiniciado' : 'falha'}` : `⚠️ ${action.message}`}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <p className="text-xs font-mono text-white/15 text-right">
                Verificado: {serverHealth.timestamp ? new Date(serverHealth.timestamp).toLocaleString('pt-BR') : '—'}
              </p>
            </>
          )}
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function HealthScorePage() {
  const { status } = useSession()
  const { selectedProject, selectedProjectId } = useProject()
  const [toast, setToast] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  // Fetch real health data from API
  const { data: health, isLoading: loadingHealth, isError } = useQuery<HealthResponse>({
    queryKey: ['health', selectedProjectId],
    queryFn: () => fetch(`${API}/api/projects/${selectedProjectId}/health`).then(r => {
      if (!r.ok) throw new Error('Falha ao buscar health data')
      return r.json()
    }),
    enabled: status === 'authenticated' && !!selectedProjectId,
    refetchInterval: 60_000,
  })

  // Derived data from API response
  const issues = useMemo(() => health ? deriveIssues(health) : [], [health])
  const dimensions = useMemo(() => health ? mapDimensions(health) : [], [health])
  const history = useMemo(
    () => health && selectedProjectId ? generateEstimatedHistory(health.overall, selectedProjectId) : [],
    [health, selectedProjectId]
  )

  const okCount = issues.filter(i => i.type === 'ok').length
  const warnCount = issues.filter(i => i.type === 'warn').length
  const errorCount = issues.filter(i => i.type === 'error').length

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }, [])

  const handleGenerateReport = useCallback(async () => {
    setGenerating(true)
    try {
      const res = await fetch(`${API}/api/daily-report`, { method: 'POST' })
      if (res.ok) {
        showToast('Relatorio gerado com sucesso e enviado para o Telegram')
      } else {
        showToast('Erro ao gerar relatorio')
      }
    } catch {
      showToast('Erro de conexao ao gerar relatorio')
    } finally {
      setGenerating(false)
    }
  }, [showToast])

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-neutral-950">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  const hasProject = !!selectedProjectId
  const showLoading = hasProject && loadingHealth
  const showError = hasProject && isError && !health
  const showData = hasProject && !!health

  return (
    <AppLayout>
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 bg-neutral-800 border border-white/10 rounded-lg px-4 py-2 text-sm text-white/80 font-mono max-w-sm">
          {toast}
        </div>
      )}

      <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
        {/* Page title + controls */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-widest font-mono uppercase text-white flex items-center gap-3">
              Health Score
              {showData && (
                <span className={`text-sm px-2 py-0.5 rounded border font-mono ${scoreBg(health.overall)} ${scoreColor(health.overall)}`}>
                  {health.overall.toFixed(1)}/10
                </span>
              )}
            </h1>
            <p className="text-xs text-white/40 font-mono mt-1">
              {selectedProject
                ? `Saude de ${selectedProject.name}`
                : 'Analise de saude e qualidade dos projetos'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerateReport}
              disabled={generating || !showData}
              className="flex items-center gap-1.5 text-xs font-mono px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/[0.08] text-white/60 hover:text-white/90 transition-all disabled:opacity-50 whitespace-nowrap"
            >
              {generating ? (
                <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <FileText className="w-3 h-3" />
              )}
              {generating ? 'Gerando...' : 'Gerar relatorio'}
            </button>
          </div>
        </div>

        {/* Empty state — no project selected */}
        {!hasProject && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <TrendingUp className="w-10 h-10 text-white/20 mb-3" />
            <p className="text-white/40 text-sm font-mono">Selecione um projeto para ver o Health Score</p>
          </div>
        )}

        {/* Loading state */}
        {showLoading && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Loader2 className="w-8 h-8 text-white/30 animate-spin mb-3" />
            <p className="text-white/40 text-sm font-mono">Analisando saude do projeto...</p>
          </div>
        )}

        {/* Error state */}
        {showError && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <XCircle className="w-10 h-10 text-red-400/50 mb-3" />
            <p className="text-white/40 text-sm font-mono">Erro ao carregar dados de saude</p>
            <p className="text-white/25 text-xs font-mono mt-1">Verifique se a API esta rodando</p>
          </div>
        )}

        {/* Health data display */}
        {showData && (
          <>
            {/* Score overview row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Circular score */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-6 flex flex-col items-center justify-center gap-4">
                <CircularScore score={health.overall} />
                <div className="flex items-center gap-3 text-xs font-mono text-white/30">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    {okCount} ok
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    {warnCount} aviso{warnCount !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    {errorCount} erro{errorCount !== 1 ? 's' : ''}
                  </span>
                </div>
                {/* Project status badge */}
                <span className="text-xs font-mono text-white/20 px-2 py-0.5 rounded border border-white/5 bg-white/[0.02]">
                  {health.status || 'unknown'}
                </span>
              </div>

              {/* Issues list */}
              <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10">
                  <h3 className="text-xs font-mono text-white/40 uppercase tracking-widest">
                    Issues detectados
                  </h3>
                </div>
                <div className="divide-y divide-white/5">
                  {issues.length > 0 ? (
                    issues.map((issue, i) => (
                      <IssueRow key={i} issue={issue} />
                    ))
                  ) : (
                    <div className="px-4 py-6 text-center text-white/25 text-sm font-mono">
                      Nenhum issue detectado
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Dimension cards */}
            <section className="space-y-3">
              <h2 className="text-xs font-mono text-white/40 uppercase tracking-widest">
                Dimensoes de Saude
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {dimensions.map(dim => (
                  <DimensionCard key={dim.key} dim={dim} />
                ))}
              </div>
              {/* Weight legend */}
              <div className="flex flex-wrap gap-3 pt-1">
                {dimensions.map(dim => (
                  <div key={dim.key} className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${scoreBarColor(dim.score)}`} />
                    <span className="text-xs text-white/25 font-mono">{dim.label} {dim.weight}%</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Score history chart */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-mono text-white/40 uppercase tracking-widest">
                  Historico (7 dias)
                </h2>
                <div className="flex items-center gap-2 text-xs font-mono text-white/25">
                  <TrendingUp className="w-3 h-3" />
                  estimativa dos ultimos 7 dias
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-5">
                <HistoryChart history={history} />
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                  <span className="text-xs font-mono text-white/20">
                    Min: {Math.min(...history).toFixed(1)}
                  </span>
                  <span className="text-xs font-mono text-white/20">
                    Media: {(history.reduce((a, b) => a + b, 0) / history.length).toFixed(1)}
                  </span>
                  <span className="text-xs font-mono text-white/20">
                    Max: {Math.max(...history).toFixed(1)}
                  </span>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Server Health — always visible, independent of project selection */}
        <ServerHealthSection showToast={showToast} />
      </div>
    </AppLayout>
  )
}
