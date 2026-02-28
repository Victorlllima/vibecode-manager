'use client'

import { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { AppLayout } from '@/components/app-layout'
import { useProject } from '@/contexts/project-context'
import {
  TrendingUp, AlertTriangle, CheckCircle, DollarSign,
  Zap, Database, RefreshCw, Info, Server, Activity
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

// ─── Types ───────────────────────────────────────────────────────────────────

type ServiceStatus = 'ok' | 'warning' | 'critical'

type ServiceCard = {
  id: string
  name: string
  icon: string
  usageLabel: string
  usageValue: number
  usageMax: number
  usageUnit: string
  costUSD: number
  costLabel: string
  status: ServiceStatus
  detail: string
  estimated: boolean
}

type BurnDay = {
  date: string
  value: number
  label: string
}

type Alert = {
  id: string
  type: 'warning' | 'ok' | 'critical'
  message: string
}

type HistoryRow = {
  id: number
  date: string
  service: string
  amount: string
  costUSD: number
  status: ServiceStatus
  estimated: boolean
}

type HealthData = {
  overall: number
  dimensions: {
    tasks: { score: number; completed: number; total: number }
    infrastructure: { score: number; heartbeatOnline: boolean; lastPing: string | null }
    activity: { score: number; lastPush: string | null; openIssues: number }
    quality: { score: number }
  }
  status: string
}

type HeartbeatEntry = {
  id: number
  status: string
  tasks_processed: number
  system_load: number | null
  logs: string | null
  created_at: string
}

type ProjectIntegration = {
  id: number
  project_id: number
  service: string
  config: Record<string, unknown>
  status: string
  created_at: string
}

type TaskEntry = {
  id: number
  project_id: number
  title: string
  status: string
  priority: string
  assigned_agent: string | null
  created_at: string
}

// ─── Known service metadata ──────────────────────────────────────────────────

const SERVICE_META: Record<string, { icon: string; name: string; freeTier: string; costEstimate: string }> = {
  github:    { icon: '⌥', name: 'GitHub',          freeTier: 'Free tier',    costEstimate: '$0.00/mo' },
  vercel:    { icon: '▲', name: 'Vercel',          freeTier: 'Hobby plan',   costEstimate: '$0.00/mo' },
  supabase:  { icon: '⬡', name: 'Supabase',        freeTier: 'Free tier',    costEstimate: '$0.00/mo' },
  postgresql:{ icon: '⛁', name: 'PostgreSQL',      freeTier: 'Self-hosted',  costEstimate: '$0.00/mo' },
  hetzner:   { icon: '⬢', name: 'Hetzner Cloud',   freeTier: 'VPS',          costEstimate: '~$4.50/mo' },
  anthropic: { icon: 'Ξ', name: 'Anthropic Claude', freeTier: 'Pay-per-use', costEstimate: '~$0.003/1k tokens' },
  telegram:  { icon: '✈', name: 'Telegram Bot',     freeTier: 'Gratuito',     costEstimate: '$0.00/mo' },
  tailscale: { icon: '⊕', name: 'Tailscale',       freeTier: 'Personal plan', costEstimate: '$0.00/mo' },
  copilot:   { icon: '⌥', name: 'GitHub Copilot',  freeTier: 'Individual',   costEstimate: '$10.00/mo' },
  nextjs:    { icon: '▲', name: 'Next.js',          freeTier: 'Open Source',  costEstimate: '$0.00/mo' },
  express:   { icon: '⟐', name: 'Express.js',      freeTier: 'Open Source',  costEstimate: '$0.00/mo' },
}

// ─── Helper utils ─────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return String(n)
}

function fmtUSD(n: number): string {
  return `$${n.toFixed(2)}`
}

function fmtBRL(n: number): string {
  return `R$ ${n.toFixed(2).replace('.', ',')}`
}

function pct(value: number, max: number): number {
  if (max === 0) return 0
  return Math.min(100, Math.round((value / max) * 100))
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min atrás`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h atrás`
  const days = Math.floor(hours / 24)
  return `${days}d atrás`
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function formatShortDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  } catch {
    return dateStr
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<ServiceStatus, { bar: string; badge: string; text: string }> = {
  ok:       { bar: 'bg-green-500',  badge: 'bg-green-500/10 text-green-400 border-green-500/20',  text: 'text-green-400' },
  warning:  { bar: 'bg-orange-500', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20', text: 'text-orange-400' },
  critical: { bar: 'bg-red-500',    badge: 'bg-red-500/10 text-red-400 border-red-500/20',       text: 'text-red-400' },
}

function UsageBar({ value, max, status }: { value: number; max: number; status: ServiceStatus }) {
  const p = pct(value, max)
  return (
    <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${STATUS_COLORS[status].bar}`}
        style={{ width: `${p}%` }}
      />
    </div>
  )
}

function ServiceCardComp({ svc }: { svc: ServiceCard }) {
  const p = pct(svc.usageValue, svc.usageMax)
  const colors = STATUS_COLORS[svc.status]

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/[0.08] hover:border-white/20 transition-all">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl font-mono text-white/70 w-7 text-center leading-none select-none">{svc.icon}</span>
          <span className="text-sm font-medium text-white">{svc.name}</span>
          {svc.estimated && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-mono">
              est.
            </span>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded border font-mono ${colors.badge}`}>
          {svc.costLabel}
        </span>
      </div>

      <div className="mb-2">
        <div className="flex justify-between items-end mb-1">
          <span className="text-xs text-white/40 font-mono">{svc.usageLabel}</span>
          <span className={`text-xs font-mono font-semibold ${p >= 80 ? colors.text : 'text-white/60'}`}>
            {p}%
          </span>
        </div>
        <UsageBar value={svc.usageValue} max={svc.usageMax} status={svc.status} />
      </div>

      <p className="text-xs text-white/30 font-mono mt-2">{svc.detail}</p>
    </div>
  )
}

function SparklineBar({ day, maxValue, avgValue }: { day: BurnDay; maxValue: number; avgValue: number }) {
  const heightPct = maxValue > 0 ? Math.round((day.value / maxValue) * 100) : 0
  const isHigh = day.value > avgValue * 1.1
  const isLow = day.value < avgValue * 0.9

  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <span className="text-[10px] text-white/40 font-mono">{day.label}</span>
      <div className="w-full bg-white/5 rounded-sm overflow-hidden" style={{ height: '48px' }}>
        <div
          className={`w-full rounded-sm transition-all ${
            isHigh ? 'bg-orange-500/70' : isLow ? 'bg-blue-500/50' : 'bg-green-500/60'
          }`}
          style={{ height: `${heightPct}%`, marginTop: `${100 - heightPct}%` }}
        />
      </div>
      <span className="text-[10px] text-white/30 font-mono">{day.date}</span>
    </div>
  )
}

function AlertRow({ alert }: { alert: Alert }) {
  const icon =
    alert.type === 'ok' ? (
      <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
    ) : alert.type === 'critical' ? (
      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
    ) : (
      <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
    )

  const bg =
    alert.type === 'ok'
      ? 'bg-green-500/5 border-green-500/10'
      : alert.type === 'critical'
      ? 'bg-red-500/5 border-red-500/10'
      : 'bg-orange-500/5 border-orange-500/10'

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${bg}`}>
      {icon}
      <span className="text-xs text-white/70 font-mono">{alert.message}</span>
    </div>
  )
}

function StatusPill({ status }: { status: ServiceStatus }) {
  const colors = STATUS_COLORS[status]
  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-mono ${colors.badge}`}>
      {status}
    </span>
  )
}

function EstimatedBanner() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
      <Info className="w-4 h-4 text-yellow-400 shrink-0" />
      <span className="text-xs text-yellow-400/80 font-mono">
        Dados parcialmente estimados — custos derivados de tasks, heartbeat e integrações. Itens marcados com &quot;est.&quot; usam valores aproximados.
      </span>
    </div>
  )
}

function EmptyState() {
  return (
    <AppLayout>
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="rounded-full p-4 bg-white/5 border border-white/10">
            <DollarSign className="w-8 h-8 text-white/20" />
          </div>
          <h2 className="text-lg font-medium text-white/60">Nenhum projeto selecionado</h2>
          <p className="text-sm text-white/30 font-mono max-w-md text-center">
            Selecione um projeto no seletor global acima para visualizar o monitoramento de custos.
          </p>
        </div>
      </div>
    </AppLayout>
  )
}

function LoadingState() {
  return (
    <AppLayout>
      <div className="flex h-[60vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <span className="text-xs text-white/40 font-mono">Carregando dados de custo...</span>
        </div>
      </div>
    </AppLayout>
  )
}

// ─── Data derivation logic ───────────────────────────────────────────────────

function deriveServices(
  projectName: string,
  integrations: ProjectIntegration[],
  projectServices: string[],
  taskCount: number,
  heartbeatOnline: boolean,
): ServiceCard[] {
  const cards: ServiceCard[] = []
  const seenIds = new Set<string>()

  // Derive from project_integrations table
  for (const integ of integrations) {
    const svcKey = integ.service.toLowerCase()
    const meta = SERVICE_META[svcKey]
    if (!meta || seenIds.has(svcKey)) continue
    seenIds.add(svcKey)

    const isConnected = integ.status === 'connected'
    cards.push({
      id: svcKey,
      name: meta.name,
      icon: meta.icon,
      usageLabel: isConnected ? 'Ativo' : 'Configurado',
      usageValue: isConnected ? 80 : 20,
      usageMax: 100,
      usageUnit: '%',
      costUSD: svcKey === 'hetzner' ? 4.5 : svcKey === 'copilot' ? 10 : 0,
      costLabel: meta.costEstimate,
      status: isConnected ? 'ok' : 'warning',
      detail: `${meta.name} · ${integ.status} · ${meta.freeTier}`,
      estimated: true,
    })
  }

  // Derive from project's services JSON array
  for (const svc of projectServices) {
    const svcKey = svc.toLowerCase()
    if (seenIds.has(svcKey)) continue
    seenIds.add(svcKey)

    const meta = SERVICE_META[svcKey] || {
      icon: '◆',
      name: svc,
      freeTier: 'Desconhecido',
      costEstimate: '—',
    }

    cards.push({
      id: svcKey,
      name: meta.name,
      icon: meta.icon,
      usageLabel: 'Registrado',
      usageValue: 50,
      usageMax: 100,
      usageUnit: '%',
      costUSD: svcKey === 'hetzner' ? 4.5 : svcKey === 'copilot' ? 10 : 0,
      costLabel: meta.costEstimate,
      status: 'ok',
      detail: `${meta.name} · ${meta.freeTier}`,
      estimated: true,
    })
  }

  // Always add an "API Usage" card derived from tasks
  if (!seenIds.has('api-usage')) {
    const taskUsageRatio = Math.min(taskCount / 100, 1)
    const estimatedTokens = taskCount * 8_000 // rough estimate: 8k tokens per task interaction
    const estimatedCost = (estimatedTokens / 1000) * 0.003

    cards.push({
      id: 'api-usage',
      name: 'API Usage (Tasks)',
      icon: 'Ξ',
      usageLabel: 'Tasks criadas',
      usageValue: taskCount,
      usageMax: Math.max(taskCount, 100),
      usageUnit: 'tasks',
      costUSD: estimatedCost,
      costLabel: `~${fmtUSD(estimatedCost)}/mo`,
      status: taskUsageRatio > 0.8 ? 'warning' : 'ok',
      detail: `${taskCount} tasks · ~${fmtNum(estimatedTokens)} tokens estimados · $0.003/1k`,
      estimated: true,
    })
  }

  // Heartbeat / Infra card
  if (!seenIds.has('infra')) {
    cards.push({
      id: 'infra',
      name: 'Infraestrutura',
      icon: '⚡',
      usageLabel: 'Heartbeat',
      usageValue: heartbeatOnline ? 95 : 10,
      usageMax: 100,
      usageUnit: '%',
      costUSD: 0,
      costLabel: heartbeatOnline ? 'Online' : 'Offline',
      status: heartbeatOnline ? 'ok' : 'critical',
      detail: heartbeatOnline ? 'Heartbeat ativo · infraestrutura respondendo' : 'Heartbeat offline — verificar servidores',
      estimated: false,
    })
  }

  return cards
}

function deriveBurnDays(heartbeats: HeartbeatEntry[]): BurnDay[] {
  // Group heartbeats by day, use tasks_processed as activity metric
  const dayMap = new Map<string, number>()

  for (const hb of heartbeats) {
    const day = formatShortDate(hb.created_at)
    dayMap.set(day, (dayMap.get(day) || 0) + (hb.tasks_processed || 1))
  }

  // Get last 7 days
  const entries = Array.from(dayMap.entries()).slice(0, 7).reverse()

  return entries.map(([date, value]) => ({
    date,
    value,
    label: String(value),
  }))
}

function deriveAlerts(
  health: HealthData | undefined,
  heartbeatOnline: boolean,
  taskTotal: number,
  taskCompleted: number,
  services: ServiceCard[],
): Alert[] {
  const alerts: Alert[] = []

  // Heartbeat status
  if (heartbeatOnline) {
    alerts.push({ id: 'hb-ok', type: 'ok', message: 'Heartbeat online — infraestrutura saudável' })
  } else {
    alerts.push({ id: 'hb-down', type: 'critical', message: 'Heartbeat offline — verificar servidores imediatamente' })
  }

  // Task completion
  if (taskTotal > 0) {
    const completionRate = taskCompleted / taskTotal
    if (completionRate >= 0.7) {
      alerts.push({ id: 'tasks-ok', type: 'ok', message: `Tasks: ${Math.round(completionRate * 100)}% concluídas (${taskCompleted}/${taskTotal})` })
    } else if (completionRate >= 0.3) {
      alerts.push({ id: 'tasks-warn', type: 'warning', message: `Tasks: apenas ${Math.round(completionRate * 100)}% concluídas — considere priorizar` })
    } else {
      alerts.push({ id: 'tasks-low', type: 'warning', message: `Tasks: ${Math.round(completionRate * 100)}% concluídas — muitas pendentes (${taskTotal - taskCompleted})` })
    }
  }

  // Health score
  if (health) {
    if (health.overall >= 7) {
      alerts.push({ id: 'health-ok', type: 'ok', message: `Health Score: ${health.overall}/10 — projeto saudável` })
    } else if (health.overall >= 5) {
      alerts.push({ id: 'health-warn', type: 'warning', message: `Health Score: ${health.overall}/10 — atenção necessária` })
    } else {
      alerts.push({ id: 'health-crit', type: 'critical', message: `Health Score: ${health.overall}/10 — projeto em risco` })
    }
  }

  // Service-specific warnings
  for (const svc of services) {
    if (svc.status === 'critical') {
      alerts.push({ id: `svc-${svc.id}`, type: 'critical', message: `${svc.name}: ${svc.detail}` })
    } else if (svc.status === 'warning') {
      alerts.push({ id: `svc-${svc.id}`, type: 'warning', message: `${svc.name}: ${svc.detail}` })
    }
  }

  return alerts
}

function deriveHistory(
  tasks: TaskEntry[],
  heartbeats: HeartbeatEntry[],
): HistoryRow[] {
  const rows: HistoryRow[] = []
  let id = 0

  // Recent tasks as "API usage" events
  for (const task of tasks.slice(0, 5)) {
    const estimatedTokens = 8_000
    const estimatedCost = (estimatedTokens / 1000) * 0.003
    rows.push({
      id: ++id,
      date: formatDate(task.created_at),
      service: 'API / Tasks',
      amount: `${task.title.slice(0, 40)}${task.title.length > 40 ? '...' : ''}`,
      costUSD: estimatedCost,
      status: task.status === 'completed' ? 'ok' : task.status === 'failed' ? 'critical' : 'ok',
      estimated: true,
    })
  }

  // Recent heartbeat events
  for (const hb of heartbeats.slice(0, 5)) {
    rows.push({
      id: ++id,
      date: formatDate(hb.created_at),
      service: 'Heartbeat',
      amount: `${hb.tasks_processed || 0} processed · ${hb.status}`,
      costUSD: 0,
      status: hb.status === 'ok' ? 'ok' : hb.status === 'critical' ? 'critical' : 'warning',
      estimated: false,
    })
  }

  // Sort by date descending
  rows.sort((a, b) => {
    const da = a.date.split('/').reverse().join('')
    const db = b.date.split('/').reverse().join('')
    return db.localeCompare(da)
  })

  return rows.slice(0, 10)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CostMonitorPage() {
  const { status } = useSession()
  const { selectedProject, selectedProjectId } = useProject()
  const [lastRefresh, setLastRefresh] = useState<string>('agora')

  // Fetch project health data
  const { data: health, isLoading: loadingHealth, refetch: refetchHealth } = useQuery<HealthData>({
    queryKey: ['project-health', selectedProjectId],
    queryFn: () => fetch(`${API}/api/projects/${selectedProjectId}/health`).then(r => r.json()),
    enabled: !!selectedProjectId,
    refetchInterval: 60_000,
  })

  // Fetch project details (for services JSON field)
  const { data: projectDetail } = useQuery<Record<string, unknown>>({
    queryKey: ['project-detail', selectedProjectId],
    queryFn: () => fetch(`${API}/api/projects/${selectedProjectId}`).then(r => r.json()),
    enabled: !!selectedProjectId,
  })

  // Fetch project integrations
  const { data: integrations = [] } = useQuery<ProjectIntegration[]>({
    queryKey: ['project-integrations', selectedProjectId],
    queryFn: () => fetch(`${API}/api/projects/${selectedProjectId}/integrations`).then(r => {
      if (!r.ok) return []
      return r.json()
    }),
    enabled: !!selectedProjectId,
  })

  // Fetch tasks for this project
  const { data: allTasks = [] } = useQuery<TaskEntry[]>({
    queryKey: ['tasks'],
    queryFn: () => fetch(`${API}/api/tasks`).then(r => r.json()),
    enabled: !!selectedProjectId,
  })

  // Fetch heartbeat history
  const { data: heartbeats = [] } = useQuery<HeartbeatEntry[]>({
    queryKey: ['heartbeat-history'],
    queryFn: () => fetch(`${API}/api/heartbeat/history?limit=48`).then(r => r.json()),
    enabled: !!selectedProjectId,
  })

  // Filter tasks for selected project
  const projectTasks = useMemo(
    () => allTasks.filter(t => t.project_id === selectedProjectId),
    [allTasks, selectedProjectId]
  )

  // Derive project services from JSON field
  const projectServices = useMemo(() => {
    if (!projectDetail) return []
    const svcs = (projectDetail as Record<string, unknown>).services
    if (Array.isArray(svcs)) return svcs as string[]
    return []
  }, [projectDetail])

  // Compute derived data
  const heartbeatOnline = useMemo(() => {
    if (!health?.dimensions?.infrastructure) return false
    return health.dimensions.infrastructure.heartbeatOnline
  }, [health])

  const taskTotal = health?.dimensions?.tasks?.total ?? projectTasks.length
  const taskCompleted = health?.dimensions?.tasks?.completed ?? projectTasks.filter(t => t.status === 'completed').length

  const services = useMemo(
    () => deriveServices(
      selectedProject?.name || '',
      integrations,
      projectServices,
      projectTasks.length,
      heartbeatOnline,
    ),
    [selectedProject, integrations, projectServices, projectTasks.length, heartbeatOnline]
  )

  const burnDays = useMemo(() => deriveBurnDays(heartbeats), [heartbeats])

  const alerts = useMemo(
    () => deriveAlerts(health, heartbeatOnline, taskTotal, taskCompleted, services),
    [health, heartbeatOnline, taskTotal, taskCompleted, services]
  )

  const history = useMemo(
    () => deriveHistory(projectTasks, heartbeats),
    [projectTasks, heartbeats]
  )

  // Derived burn stats
  const dailyAvg = useMemo(() => {
    if (burnDays.length === 0) return 0
    return Math.round(burnDays.reduce((acc, d) => acc + d.value, 0) / burnDays.length)
  }, [burnDays])

  const projectedMonth = dailyAvg * 30
  const maxBurnValue = useMemo(() => Math.max(...burnDays.map(d => d.value), 1), [burnDays])

  // Total costs (summing service cards)
  const totalMonthlyUSD = useMemo(() => services.reduce((acc, s) => acc + s.costUSD, 0), [services])
  const totalMonthlyBRL = totalMonthlyUSD * 5.93 // approximate BRL rate

  // ─── Loading / Auth gates ──────────────────────────────────────────────────

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-neutral-950">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (!selectedProjectId || !selectedProject) {
    return <EmptyState />
  }

  if (loadingHealth) {
    return <LoadingState />
  }

  function handleRefresh() {
    refetchHealth()
    const t = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    setLastRefresh(t)
  }

  return (
    <AppLayout>
      <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">

        {/* ── Page Title + Total ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xs font-mono text-white/40 uppercase tracking-widest mb-1">
              Cost Monitor
              <span className="text-white/20 mx-2">·</span>
              <span className="text-white/50">{selectedProject.name}</span>
            </h1>
            <p className="text-2xl font-bold text-white tracking-tight">
              {fmtBRL(totalMonthlyBRL)}
              <span className="text-sm font-normal text-white/40 font-mono ml-2">/ mês estimado</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="text-white/40 hover:text-white/80 transition-colors"
              title="Atualizar dados"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-xs text-white/30 font-mono">
              <span>atualizado: {lastRefresh}</span>
              <span className="text-white/10">·</span>
              <span>{selectedProject.status}</span>
            </div>
          </div>
        </div>

        {/* ── Estimated data notice ── */}
        <EstimatedBanner />

        {/* ── Summary stat strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center gap-3">
            <div className="rounded-md p-2 bg-green-500/10 shrink-0">
              <DollarSign className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-white/40 font-mono uppercase tracking-wide">Total USD</p>
              <p className="text-lg font-semibold text-white leading-tight">{fmtUSD(totalMonthlyUSD)}</p>
              <p className="text-xs text-white/30 font-mono">mês corrente</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center gap-3">
            <div className="rounded-md p-2 bg-blue-500/10 shrink-0">
              <Zap className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-white/40 font-mono uppercase tracking-wide">Tasks</p>
              <p className="text-lg font-semibold text-white leading-tight">{taskCompleted}/{taskTotal}</p>
              <p className="text-xs text-white/30 font-mono">concluídas</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center gap-3">
            <div className="rounded-md p-2 bg-orange-500/10 shrink-0">
              <Activity className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-white/40 font-mono uppercase tracking-wide">Health</p>
              <p className="text-lg font-semibold text-white leading-tight">{health?.overall ?? '—'}/10</p>
              <p className="text-xs text-white/30 font-mono">score geral</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center gap-3">
            <div className="rounded-md p-2 bg-white/[0.08] shrink-0">
              <Server className="w-4 h-4 text-white/60" />
            </div>
            <div>
              <p className="text-xs text-white/40 font-mono uppercase tracking-wide">Serviços</p>
              <p className="text-lg font-semibold text-white leading-tight">{services.length}</p>
              <p className="text-xs text-white/30 font-mono">monitorados</p>
            </div>
          </div>
        </div>

        {/* ── Service Cards ── */}
        <div>
          <h2 className="text-xs font-mono text-white/40 uppercase tracking-widest mb-3">Serviços do Projeto</h2>
          {services.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-lg p-8 flex flex-col items-center gap-2">
              <Database className="w-6 h-6 text-white/20" />
              <p className="text-xs text-white/30 font-mono text-center">
                Nenhum serviço configurado. Adicione integrações na aba Integrações.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {services.map((svc) => (
                <ServiceCardComp key={svc.id} svc={svc} />
              ))}
            </div>
          )}
        </div>

        {/* ── Activity Burn Rate + Sparkline ── */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-mono text-white/40 uppercase tracking-widest">Activity Burn Rate</h2>
            <span className="text-xs text-white/20 font-mono">
              heartbeat history · {burnDays.length > 0 ? `${burnDays.length} dias` : 'sem dados'}
            </span>
          </div>

          {burnDays.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <TrendingUp className="w-5 h-5 text-white/20" />
              <p className="text-xs text-white/30 font-mono">Sem dados de heartbeat suficientes para gerar o gráfico.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-white/40 font-mono uppercase tracking-wide">Média diária</span>
                  <span className="text-xl font-semibold text-white">{dailyAvg}</span>
                  <span className="text-xs text-white/30 font-mono">ações / dia</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-white/40 font-mono uppercase tracking-wide">Projeção mês</span>
                  <span className="text-xl font-semibold text-white">{fmtNum(projectedMonth)}</span>
                  <span className="text-xs text-white/30 font-mono">ações estimadas</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-white/40 font-mono uppercase tracking-wide">Heartbeat</span>
                  <span className={`text-xl font-semibold ${heartbeatOnline ? 'text-green-400' : 'text-red-400'}`}>
                    {heartbeatOnline ? 'Online' : 'Offline'}
                  </span>
                  <span className="text-xs text-white/30 font-mono">
                    {health?.dimensions?.infrastructure?.lastPing
                      ? timeAgo(health.dimensions.infrastructure.lastPing)
                      : '—'}
                  </span>
                </div>
              </div>

              {/* Sparkline CSS-only chart */}
              <div className="flex items-end gap-1.5">
                {burnDays.map((day) => (
                  <SparklineBar key={day.date} day={day} maxValue={maxBurnValue} avgValue={dailyAvg} />
                ))}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-orange-500/70 shrink-0" />
                  <span className="text-[10px] text-white/30 font-mono">acima da média</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-green-500/60 shrink-0" />
                  <span className="text-[10px] text-white/30 font-mono">normal</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-500/50 shrink-0" />
                  <span className="text-[10px] text-white/30 font-mono">abaixo da média</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Alerts ── */}
        <div>
          <h2 className="text-xs font-mono text-white/40 uppercase tracking-widest mb-3">Alertas</h2>
          {alerts.length === 0 ? (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-white/5 border-white/10">
              <CheckCircle className="w-4 h-4 text-white/20 shrink-0" />
              <span className="text-xs text-white/30 font-mono">Nenhum alerta ativo</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {alerts.map((alert) => (
                <AlertRow key={alert.id} alert={alert} />
              ))}
            </div>
          )}
        </div>

        {/* ── History Table ── */}
        <div>
          <h2 className="text-xs font-mono text-white/40 uppercase tracking-widest mb-3">Histórico</h2>
          {history.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-lg p-8 flex flex-col items-center gap-2">
              <TrendingUp className="w-5 h-5 text-white/20" />
              <p className="text-xs text-white/30 font-mono">Sem histórico de atividade para este projeto.</p>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left px-4 py-2.5 text-white/30 uppercase tracking-wide font-normal">Data</th>
                      <th className="text-left px-4 py-2.5 text-white/30 uppercase tracking-wide font-normal">Serviço</th>
                      <th className="text-left px-4 py-2.5 text-white/30 uppercase tracking-wide font-normal hidden sm:table-cell">Detalhe</th>
                      <th className="text-right px-4 py-2.5 text-white/30 uppercase tracking-wide font-normal">Custo</th>
                      <th className="text-center px-4 py-2.5 text-white/30 uppercase tracking-wide font-normal hidden md:table-cell">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {history.map((row) => (
                      <tr key={row.id} className="hover:bg-white/[0.04] transition-colors">
                        <td className="px-4 py-2.5 text-white/50">{row.date}</td>
                        <td className="px-4 py-2.5 text-white/80">
                          {row.service}
                          {row.estimated && (
                            <span className="ml-1.5 text-[9px] px-1 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                              est.
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-white/50 hidden sm:table-cell">{row.amount}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={row.costUSD > 0 ? 'text-white/80' : 'text-white/30'}>
                            {row.costUSD > 0 ? fmtUSD(row.costUSD) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center hidden md:table-cell">
                          <StatusPill status={row.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer note ── */}
        <div className="flex flex-wrap gap-4 pt-2 border-t border-white/5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-white/30 font-mono">within limits</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-xs text-white/30 font-mono">warning</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs text-white/30 font-mono">over limit</span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="w-2 h-2 rounded bg-yellow-500/40" />
            <span className="text-xs text-white/20 font-mono">est. = valor estimado</span>
          </div>
          <span className="text-xs text-white/20 font-mono">dados derivados de tasks, heartbeat e integrações</span>
        </div>

      </div>
    </AppLayout>
  )
}
