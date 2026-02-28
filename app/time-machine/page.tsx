'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { AppLayout } from '@/components/app-layout'
import { useProject } from '@/contexts/project-context'
import {
  GitCommitHorizontal, Clock, Star, RotateCcw, AlertTriangle,
  X, Check, GitBranch, Tag, RefreshCw, Loader2
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

// ─── Types ────────────────────────────────────────────────────────────────────

type Commit = {
  sha: string
  shortSha: string
  message: string
  author: string
  authorAvatar: string | null
  date: string
  tag: string | null
  isStable: boolean
  filesChanged: number | null
}

// ─── Utility: descreve commit em pt-br natural ──────────────────────────────

function describeCommit(message: string): string {
  const first = message.split('\n')[0].trim()

  // Conventional commits → pt-br natural
  const prefixMap: Record<string, string> = {
    'feat': 'Adicionou nova funcionalidade',
    'fix': 'Corrigiu um bug',
    'refactor': 'Refatorou código',
    'docs': 'Atualizou documentação',
    'style': 'Ajustou estilo/formatação',
    'test': 'Adicionou/atualizou testes',
    'chore': 'Tarefa de manutenção',
    'perf': 'Melhorou performance',
    'ci': 'Atualizou CI/CD',
    'build': 'Alterou configuração de build',
    'revert': 'Reverteu alteração anterior',
  }

  const match = first.match(/^(\w+)(?:\(.+?\))?[!]?:\s*(.+)/)
  if (match) {
    const prefix = prefixMap[match[1].toLowerCase()] || match[1]
    return `${prefix}: ${match[2]}`
  }

  // Merge commits
  if (first.toLowerCase().startsWith('merge')) {
    return `Merge de branches: ${first.replace(/^merge\s+(pull request\s+#\d+\s+from\s+)?/i, '')}`
  }

  return first
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}m atrás`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h atrás`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d atrás`
  const months = Math.floor(days / 30)
  return `${months} meses atrás`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Heatmap ────────────────────────────────────────────────────────────────

function getHeatColor(count: number): string {
  if (count === 0) return 'bg-white/5 border-white/5'
  if (count === 1) return 'bg-green-900/60 border-green-800/40'
  if (count === 2) return 'bg-green-700/60 border-green-600/40'
  if (count === 3) return 'bg-green-500/60 border-green-400/40'
  return 'bg-green-400/80 border-green-300/60'
}

function buildHeatmap(commits: Commit[]): Map<string, number> {
  const map = new Map<string, number>()
  commits.forEach(c => {
    const key = new Date(c.date).toISOString().split('T')[0]
    map.set(key, (map.get(key) || 0) + 1)
  })
  return map
}

function buildWeekGrid(): { date: Date; key: string }[][] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - 52 * 7)
  startDate.setDate(startDate.getDate() - startDate.getDay())

  const weeks: { date: Date; key: string }[][] = []
  let current = new Date(startDate)
  while (current <= today) {
    const week: { date: Date; key: string }[] = []
    for (let d = 0; d < 7; d++) {
      week.push({ date: new Date(current), key: current.toISOString().split('T')[0] })
      current.setDate(current.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function ContributionHeatmap({ commits }: { commits: Commit[] }) {
  const heatmap = buildHeatmap(commits)
  const weeks = buildWeekGrid()
  const [tooltip, setTooltip] = useState<{ key: string; count: number; x: number; y: number; commits: string[] } | null>(null)

  const monthPositions: { label: string; colIndex: number }[] = []
  let lastMonth = -1
  weeks.forEach((week, i) => {
    const month = week[0].date.getMonth()
    if (month !== lastMonth) {
      monthPositions.push({ label: MONTH_LABELS[month], colIndex: i })
      lastMonth = month
    }
  })

  // Build commit descriptions per day for tooltip
  const commitsByDay = new Map<string, string[]>()
  commits.forEach(c => {
    const key = new Date(c.date).toISOString().split('T')[0]
    if (!commitsByDay.has(key)) commitsByDay.set(key, [])
    commitsByDay.get(key)!.push(describeCommit(c.message))
  })

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-mono text-white/50 uppercase tracking-widest">Mapa de Contribuições</h3>
        <span className="text-xs font-mono text-white/30">{commits.length} commits</span>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: `${weeks.length * 14}px` }}>
          <div className="flex mb-1 pl-8">
            {weeks.map((_, i) => {
              const found = monthPositions.find(m => m.colIndex === i)
              return (
                <div key={i} className="w-[13px] mr-px shrink-0">
                  {found && <span className="text-[9px] text-white/30 font-mono">{found.label}</span>}
                </div>
              )
            })}
          </div>

          <div className="flex gap-0">
            <div className="flex flex-col gap-px mr-1 shrink-0">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d, i) => (
                <div key={d} className="h-[13px] flex items-center">
                  {i % 2 === 1 ? (
                    <span className="text-[9px] text-white/25 font-mono w-7 text-right pr-1">{d}</span>
                  ) : <span className="w-7" />}
                </div>
              ))}
            </div>

            <div className="flex gap-px relative">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-px">
                  {week.map(day => {
                    const count = heatmap.get(day.key) || 0
                    const isFuture = day.date > new Date()
                    return (
                      <div
                        key={day.key}
                        className={`w-[13px] h-[13px] rounded-sm border transition-transform hover:scale-125 cursor-default ${
                          isFuture ? 'opacity-0' : getHeatColor(count)
                        }`}
                        onMouseEnter={e => {
                          const rect = e.currentTarget.getBoundingClientRect()
                          setTooltip({
                            key: day.key, count, x: rect.left, y: rect.top,
                            commits: commitsByDay.get(day.key) || [],
                          })
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 justify-end">
            <span className="text-[9px] text-white/25 font-mono">Menos</span>
            {[0, 1, 2, 3, 4].map(v => (
              <div key={v} className={`w-[13px] h-[13px] rounded-sm border ${getHeatColor(v)}`} />
            ))}
            <span className="text-[9px] text-white/25 font-mono">Mais</span>
          </div>
        </div>
      </div>

      {/* Tooltip with natural language description */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x + 16, top: tooltip.y - 36 }}
        >
          <div className="bg-neutral-800 border border-white/15 rounded-md px-3 py-2 text-xs font-mono text-white/80 shadow-xl max-w-xs">
            <p className="text-white/50 mb-1">{tooltip.key}</p>
            {tooltip.count > 0 ? (
              <div className="space-y-0.5">
                <p className="text-white/90 font-semibold">{tooltip.count} commit{tooltip.count !== 1 ? 's' : ''}</p>
                {tooltip.commits.slice(0, 3).map((desc, i) => (
                  <p key={i} className="text-white/60 text-[11px]">• {desc}</p>
                ))}
                {tooltip.commits.length > 3 && (
                  <p className="text-white/40 text-[11px]">+{tooltip.commits.length - 3} mais...</p>
                )}
              </div>
            ) : (
              <p className="text-white/50">Sem commits neste dia</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Timeline Strip ─────────────────────────────────────────────────────────

function CommitTimeline({ commits, onSelect }: { commits: Commit[]; onSelect: (c: Commit) => void }) {
  const visible = commits.slice(0, 40).reverse()

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <h3 className="text-xs font-mono text-white/50 uppercase tracking-widest mb-3">Timeline</h3>
      <div className="relative">
        <div className="absolute top-[11px] left-0 right-0 h-px bg-white/10" />
        <div className="flex items-start gap-2 overflow-x-auto pb-2 scroll-smooth">
          {visible.map(commit => (
            <div
              key={commit.sha}
              className="flex flex-col items-center shrink-0 group/dot cursor-pointer"
              onClick={() => onSelect(commit)}
              title={describeCommit(commit.message)}
            >
              <div
                className={`w-[22px] h-[22px] rounded-full border-2 border-neutral-950 relative z-10 flex items-center justify-center transition-transform group-hover/dot:scale-125 ${
                  commit.isStable
                    ? 'bg-yellow-400 ring-2 ring-yellow-400/30'
                    : 'bg-green-400'
                }`}
              >
                {commit.isStable && <Tag className="w-2.5 h-2.5 text-neutral-900" />}
              </div>
              <span className="text-[9px] font-mono text-white/20 mt-1 group-hover/dot:text-white/60 transition-colors whitespace-nowrap">
                {commit.shortSha}
              </span>
              {commit.isStable && (
                <span className="text-[8px] font-mono text-yellow-400/70 whitespace-nowrap">
                  {commit.tag}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-[10px] font-mono text-white/30">commit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-yellow-400" />
          <span className="text-[10px] font-mono text-white/30">versão estável (tag)</span>
        </div>
      </div>
    </div>
  )
}

// ─── Rollback Modal ─────────────────────────────────────────────────────────

function RollbackModal({
  commit, onConfirm, onCancel, isLoading,
}: {
  commit: Commit; onConfirm: () => void; onCancel: () => void; isLoading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 border border-white/10 rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-semibold text-white font-mono">Confirmar Aplicação de Versão</span>
          </div>
          <button onClick={onCancel} className="text-white/40 hover:text-white/80 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <p className="text-yellow-400 text-sm font-mono">
              Isso irá reverter o projeto para esta versão. Uma confirmação será solicitada via Telegram.
            </p>
          </div>

          <div>
            <p className="text-xs text-white/40 font-mono uppercase tracking-wide mb-1">Commit Alvo</p>
            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-white/60">{commit.shortSha}</span>
                {commit.isStable && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 font-mono">
                    {commit.tag}
                  </span>
                )}
              </div>
              <p className="text-sm text-white mt-1">{describeCommit(commit.message)}</p>
              <p className="text-xs text-white/40 font-mono mt-1">{formatDateTime(commit.date)}</p>
              <p className="text-xs text-white/30 font-mono mt-0.5">por {commit.author}</p>
            </div>
          </div>

          <p className="text-xs text-white/30 font-mono">
            O rollback será executado via Claude Code e confirmado pelo Telegram.
          </p>
        </div>

        <div className="flex items-center gap-2 p-4 border-t border-white/10">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/60 hover:bg-white/10 hover:text-white transition-all font-mono disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-sm text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-all font-mono font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Aplicando...
              </>
            ) : (
              'Confirmar Rollback'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Commit Item ────────────────────────────────────────────────────────────

function CommitItem({
  commit, isFavorite, onToggleFavorite, onRollback,
}: {
  commit: Commit; isFavorite: boolean
  onToggleFavorite: (sha: string) => void
  onRollback: (commit: Commit) => void
}) {
  return (
    <div className={`group flex items-start gap-3 p-3 rounded-lg border transition-all ${
      commit.isStable
        ? 'bg-yellow-500/[0.04] border-yellow-500/15 hover:bg-yellow-500/[0.08] hover:border-yellow-500/25'
        : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10'
    }`}>
      {/* Timeline dot */}
      <div className="flex flex-col items-center shrink-0 mt-1">
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
          commit.isStable ? 'bg-yellow-400 ring-2 ring-yellow-400/20' : 'bg-green-400'
        }`} />
      </div>

      {/* Author avatar */}
      {commit.authorAvatar ? (
        <img
          src={commit.authorAvatar}
          alt={commit.author}
          className="w-7 h-7 rounded-full border border-white/10 shrink-0 mt-0.5"
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[9px] font-mono text-white/50">{commit.author.substring(0, 2).toUpperCase()}</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white/90 leading-snug">{describeCommit(commit.message)}</p>
            {commit.message.includes('\n') && (
              <p className="text-[11px] text-white/30 mt-0.5 line-clamp-1">{commit.message.split('\n').slice(1).join(' ').trim()}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {commit.isStable && (
              <span className="text-[10px] px-1.5 py-0.5 rounded border font-mono bg-yellow-500/10 text-yellow-400 border-yellow-500/20 flex items-center gap-1">
                <Tag className="w-2.5 h-2.5" />
                {commit.tag}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className="text-[11px] font-mono text-white/30 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
            {commit.shortSha}
          </span>
          <span className="text-[11px] text-white/30 font-mono">{commit.author}</span>
          <span className="text-[11px] text-white/30 font-mono flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {timeAgo(commit.date)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
        <button
          onClick={() => onToggleFavorite(commit.sha)}
          title={isFavorite ? 'Remover dos favoritos' : 'Favoritar'}
          className={`p-1.5 rounded-md border transition-all ${
            isFavorite
              ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
              : 'bg-white/5 border-white/10 text-white/30 hover:text-yellow-400 hover:bg-yellow-500/10 hover:border-yellow-500/20'
          }`}
        >
          <Star className="w-3 h-3" fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={() => onRollback(commit)}
          title="Aplicar esta versão"
          className="p-1.5 rounded-md bg-white/5 border border-white/10 text-white/30 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TimeMachinePage() {
  const { status } = useSession()
  const router = useRouter()
  const { selectedProject, selectedProjectId } = useProject()

  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [rollbackTarget, setRollbackTarget] = useState<Commit | null>(null)
  const [rollbackLoading, setRollbackLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [showStableOnly, setShowStableOnly] = useState(false)

  // Fetch real commits from GitHub
  const { data, isLoading: loadingCommits, refetch } = useQuery<{ commits: Commit[]; tags: string[]; source: string }>({
    queryKey: ['commits', selectedProjectId],
    queryFn: () => fetch(`${API}/api/projects/${selectedProjectId}/commits?per_page=100`).then(r => r.json()),
    enabled: status === 'authenticated' && !!selectedProjectId,
    refetchInterval: 60_000,
  })

  const commits = data?.commits || []
  const source = data?.source || 'loading'

  // Load favorites
  useEffect(() => {
    try {
      const stored = localStorage.getItem('rvm-commit-favorites')
      if (stored) setFavorites(new Set(JSON.parse(stored)))
    } catch {}
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  const toggleFavorite = useCallback((sha: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(sha)) next.delete(sha)
      else next.add(sha)
      try { localStorage.setItem('rvm-commit-favorites', JSON.stringify([...next])) } catch {}
      return next
    })
  }, [])

  const handleRollback = useCallback((commit: Commit) => {
    setRollbackTarget(commit)
  }, [])

  const confirmRollback = useCallback(async () => {
    if (!rollbackTarget || !selectedProjectId) return
    setRollbackLoading(true)
    try {
      const res = await fetch(`${API}/api/projects/${selectedProjectId}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sha: rollbackTarget.sha }),
      })
      const result = await res.json()
      setRollbackTarget(null)
      if (result.ok) {
        setToast({ type: 'success', message: `Rollback para ${rollbackTarget.shortSha} executado com sucesso!` })
      } else {
        setToast({ type: 'error', message: result.reason || result.error || 'Falha no rollback' })
      }
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Erro de conexão' })
      setRollbackTarget(null)
    } finally {
      setRollbackLoading(false)
      setTimeout(() => setToast(null), 5000)
    }
  }, [rollbackTarget, selectedProjectId])

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-neutral-950">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  // Filtered commits
  const filteredCommits = commits.filter(c => {
    if (showFavoritesOnly && !favorites.has(c.sha)) return false
    if (showStableOnly && !c.isStable) return false
    return true
  })

  return (
    <AppLayout>
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 border rounded-lg px-4 py-2 text-sm font-mono flex items-center gap-2 shadow-2xl ${
          toast.type === 'success'
            ? 'bg-neutral-800 border-green-500/20 text-green-400'
            : 'bg-neutral-800 border-red-500/20 text-red-400'
        }`}>
          {toast.type === 'success' ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
          {toast.message}
        </div>
      )}

      {/* Rollback modal */}
      {rollbackTarget && (
        <RollbackModal
          commit={rollbackTarget}
          onConfirm={confirmRollback}
          onCancel={() => setRollbackTarget(null)}
          isLoading={rollbackLoading}
        />
      )}

      <div className="px-6 py-6 max-w-5xl mx-auto space-y-5">
        {/* Page title */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold text-white tracking-tight">Time Machine</h1>
            <p className="text-xs text-white/40 font-mono mt-0.5">
              {selectedProject?.name || 'Selecione um projeto'} · {commits.length} commits
              {source === 'github' && (
                <span className="ml-2 text-green-400/60">dados reais do GitHub</span>
              )}
              {source === 'no_github_url' && (
                <span className="ml-2 text-yellow-400/60">configure github_url no projeto</span>
              )}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="text-white/40 hover:text-white/80 transition-colors"
            title="Atualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {!selectedProjectId ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <GitBranch className="w-10 h-10 text-white/20 mb-3" />
            <p className="text-white/40 text-sm font-mono">Selecione um projeto no menu acima</p>
          </div>
        ) : loadingCommits ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-white/30 animate-spin mb-3" />
            <p className="text-white/40 text-xs font-mono">Buscando commits do GitHub...</p>
          </div>
        ) : commits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <GitCommitHorizontal className="w-10 h-10 text-white/20 mb-3" />
            <p className="text-white/40 text-sm font-mono">Nenhum commit encontrado</p>
            <p className="text-white/20 text-xs font-mono mt-1">Verifique se o projeto tem github_url configurada</p>
          </div>
        ) : (
          <>
            {/* Heatmap */}
            <ContributionHeatmap commits={commits} />

            {/* Timeline strip */}
            <CommitTimeline commits={commits} onSelect={handleRollback} />

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowStableOnly(v => !v)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border font-mono transition-all ${
                  showStableOnly
                    ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                    : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.06] hover:text-white/70'
                }`}
              >
                <Tag className="w-3 h-3" />
                Versões estáveis
              </button>

              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setShowFavoritesOnly(v => !v)}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border font-mono transition-all ${
                    showFavoritesOnly
                      ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                      : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.06] hover:text-white/70'
                  }`}
                >
                  <Star className="w-3 h-3" fill={showFavoritesOnly ? 'currentColor' : 'none'} />
                  Favoritos
                  {favorites.size > 0 && (
                    <span className={`text-[10px] px-1 rounded ${showFavoritesOnly ? 'bg-yellow-500/20 text-yellow-300' : 'bg-white/10 text-white/50'}`}>
                      {favorites.size}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Commit list */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-mono text-white/50 uppercase tracking-widest">Histórico de Commits</h2>
                <span className="text-xs font-mono text-white/30">
                  {filteredCommits.length} commit{filteredCommits.length !== 1 ? 's' : ''}
                </span>
              </div>

              {filteredCommits.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center bg-white/[0.02] border border-white/[0.06] rounded-xl">
                  <GitCommitHorizontal className="w-8 h-8 text-white/20 mb-3" />
                  <p className="text-white/40 text-sm font-mono">Nenhum commit encontrado</p>
                  <p className="text-white/20 text-xs font-mono mt-1">Ajuste os filtros para ver mais resultados</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredCommits.map(commit => (
                    <CommitItem
                      key={commit.sha}
                      commit={commit}
                      isFavorite={favorites.has(commit.sha)}
                      onToggleFavorite={toggleFavorite}
                      onRollback={handleRollback}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer legend */}
            <div className="flex flex-wrap gap-4 pt-3 border-t border-white/5">
              <div className="flex items-center gap-1.5">
                <Tag className="w-3 h-3 text-yellow-400" />
                <span className="text-xs text-white/30 font-mono">Versão estável (tag release)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="w-3 h-3 text-yellow-400" fill="currentColor" />
                <span className="text-xs text-white/30 font-mono">Commit favoritado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <RotateCcw className="w-3 h-3 text-red-400" />
                <span className="text-xs text-white/30 font-mono">Aplicar esta versão (com confirmação)</span>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
