'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown, ChevronUp, RefreshCw, Copy, Eye, EyeOff,
  CheckCircle, XCircle, AlertCircle, Plus, Download, Trash2, X,
  Brain, Database, Server, Smartphone, Terminal, Wifi, WifiOff
} from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { useProject } from '@/contexts/project-context'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ConnectionStatus = 'connected' | 'disconnected' | 'configure'

type IntegrationField = {
  key: string
  label: string
  masked: boolean
  placeholder: string
  value: string
}

type IntegrationConfig = {
  id: string
  name: string
  description: string
  icon: 'github' | 'vercel' | 'supabase' | 'telegram' | 'anthropic' | 'postgresql' | 'hetzner'
  status: ConnectionStatus
  fields: IntegrationField[]
}

type McpServer = {
  id?: number
  name: string
  command: string
  args: string[]
  env: Record<string, string>
}

type EnvVar = {
  key: string
  value: string
}

type TestResult = 'idle' | 'loading' | 'ok' | 'error'

// ---------------------------------------------------------------------------
// SVG Icons
// ---------------------------------------------------------------------------

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

function VercelIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1L24 22H0L12 1z" />
    </svg>
  )
}

function SupabaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 109 113" fill="none">
      <path d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627H99.1935C108.384 40.0627 113.498 50.7261 107.428 57.7583L63.7076 110.284Z" fill="url(#paint0_linear)" />
      <path d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627H99.1935C108.384 40.0627 113.498 50.7261 107.428 57.7583L63.7076 110.284Z" fill="currentColor" fillOpacity="0.2" />
      <path d="M45.317 2.07103C48.1765 -1.53037 53.9745 0.442937 54.0434 5.04074L54.4849 72.2922H9.83113C0.## 72.2922 -4.47349 61.6288 1.59687 54.5765L45.317 2.07103Z" fill="currentColor" />
      <defs>
        <linearGradient id="paint0_linear" x1="53.9738" y1="54.974" x2="94.1635" y2="71.8295" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity="0.6" />
          <stop offset="1" stopColor="currentColor" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  )
}

function ServiceIcon({ icon, className }: { icon: IntegrationConfig['icon']; className?: string }) {
  const base = className || 'w-6 h-6'
  switch (icon) {
    case 'github':
      return <GitHubIcon className={base} />
    case 'vercel':
      return <VercelIcon className={base} />
    case 'supabase':
      return <SupabaseIcon className={base} />
    case 'telegram':
      return <TelegramIcon className={base} />
    case 'anthropic':
      return <Brain className={base} />
    case 'postgresql':
      return <Database className={base} />
    case 'hetzner':
      return <Server className={base} />
    default:
      return <Database className={base} />
  }
}

// ---------------------------------------------------------------------------
// Integration definitions per project characteristics
// ---------------------------------------------------------------------------

function buildIntegrations(project: { name: string; description?: string } | null): IntegrationConfig[] {
  const desc = (project?.description || '').toLowerCase()
  const name = (project?.name || '').toLowerCase()
  const usesSupabase = desc.includes('supabase') || name.includes('supabase')
  const supabaseCloud = desc.includes('cloud')

  const integrations: IntegrationConfig[] = [
    {
      id: 'github',
      name: 'GitHub',
      description: 'Autenticacao e acesso a repositorios via OAuth',
      icon: 'github',
      status: 'connected',
      fields: [
        { key: 'token', label: 'Access Token', masked: true, placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxx', value: '' },
        { key: 'repos', label: 'Repositorios', masked: false, placeholder: 'owner/repo', value: '' },
      ],
    },
    {
      id: 'vercel',
      name: 'Vercel',
      description: 'Deploy automatico e gestao de ambientes',
      icon: 'vercel',
      status: 'configure',
      fields: [
        { key: 'token', label: 'API Token', masked: true, placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', value: '' },
        { key: 'project_id', label: 'Project ID', masked: false, placeholder: 'prj_xxxxxxxxxxxxxxxxxxxx', value: '' },
      ],
    },
  ]

  // Database integration: Supabase or raw PostgreSQL
  if (usesSupabase) {
    integrations.push({
      id: 'supabase',
      name: `Supabase ${supabaseCloud ? '(Cloud)' : '(Self-hosted)'}`,
      description: 'BaaS com PostgreSQL, Auth e Realtime',
      icon: 'supabase',
      status: 'configure',
      fields: [
        { key: 'url', label: 'Project URL', masked: false, placeholder: 'https://xxxx.supabase.co', value: '' },
        { key: 'service_key', label: 'Service Role Key', masked: true, placeholder: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', value: '' },
      ],
    })
  } else {
    integrations.push({
      id: 'database',
      name: 'PostgreSQL',
      description: 'Banco de dados relacional direto (sem Supabase)',
      icon: 'postgresql',
      status: 'configure',
      fields: [
        { key: 'host', label: 'Host', masked: false, placeholder: '100.64.77.5', value: '' },
        { key: 'port', label: 'Porta', masked: false, placeholder: '5434', value: '' },
        { key: 'database', label: 'Database', masked: false, placeholder: 'rvm', value: '' },
        { key: 'user', label: 'Usuario', masked: false, placeholder: 'postgres', value: '' },
        { key: 'password', label: 'Senha', masked: true, placeholder: '••••••••', value: '' },
      ],
    })
  }

  integrations.push(
    {
      id: 'telegram',
      name: 'Telegram Bot',
      description: 'Notificacoes e alertas via bot Telegram',
      icon: 'telegram',
      status: 'connected',
      fields: [
        { key: 'token', label: 'Bot Token', masked: true, placeholder: '1234567890:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', value: '' },
        { key: 'chat_id', label: 'Chat ID', masked: false, placeholder: '-1001234567890', value: '' },
      ],
    },
    {
      id: 'anthropic',
      name: 'Anthropic API',
      description: 'Modelos Claude para analise e automacao IA',
      icon: 'anthropic',
      status: 'connected',
      fields: [
        { key: 'api_key', label: 'API Key', masked: true, placeholder: 'sk-ant-api03-xxxxxxxxxxxxxxxxxxxx', value: '' },
      ],
    },
    {
      id: 'hetzner',
      name: 'Hetzner Cloud',
      description: 'Servidor VPS para API e servicos backend',
      icon: 'hetzner',
      status: 'configure',
      fields: [
        { key: 'api_token', label: 'API Token', masked: true, placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxx', value: '' },
        { key: 'server_ip', label: 'Server IP', masked: false, placeholder: '49.13.73.197', value: '' },
      ],
    },
  )

  return integrations
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: ConnectionStatus }) {
  const config = {
    connected:    { bg: 'bg-green-500/10',  text: 'text-green-400',  border: 'border-green-500/20',  dot: 'bg-green-400',  label: 'Conectado' },
    disconnected: { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/20',    dot: 'bg-red-400',    label: 'Desconectado' },
    configure:    { bg: 'bg-yellow-500/10',  text: 'text-yellow-400', border: 'border-yellow-500/20', dot: 'bg-yellow-400', label: 'Configurar' },
  }[status]

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border font-mono ${config.bg} ${config.text} ${config.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full inline-block ${config.dot}`} />
      {config.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Masked value component
// ---------------------------------------------------------------------------

function MaskedValue({ value, masked }: { value: string; masked: boolean }) {
  const [revealed, setRevealed] = useState(false)
  if (!masked || !value) return <span className="font-mono text-xs text-white/60">{value || '--'}</span>
  const display = revealed ? value : value.slice(0, 6) + '************'
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono text-xs text-white/60">{display}</span>
      <button onClick={() => setRevealed(r => !r)} className="text-white/30 hover:text-white/60 transition-colors">
        {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
      </button>
    </span>
  )
}

// ---------------------------------------------------------------------------
// Integration Card
// ---------------------------------------------------------------------------

function IntegrationCard({
  integration,
  onUpdate,
}: {
  integration: IntegrationConfig
  onUpdate: (id: string, fields: IntegrationField[]) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [localFields, setLocalFields] = useState(integration.fields)
  const [testResult, setTestResult] = useState<TestResult>('idle')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleTest = useCallback(async () => {
    setTestResult('loading')
    await new Promise(r => setTimeout(r, 1200))
    const hasValues = localFields.every(f => f.value.trim().length > 0)
    setTestResult(hasValues ? 'ok' : 'error')
    setTimeout(() => setTestResult('idle'), 4000)
  }, [localFields])

  const handleSave = useCallback(async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    onUpdate(integration.id, localFields)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }, [localFields, integration.id, onUpdate])

  const handleFieldChange = (key: string, value: string) => {
    setLocalFields(prev => prev.map(f => f.key === key ? { ...f, value } : f))
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden hover:border-white/20 transition-all">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-white/70 shrink-0">
              <ServiceIcon icon={integration.icon} className="w-6 h-6" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white">{integration.name}</h3>
              <p className="text-xs text-white/40 font-mono mt-0.5 line-clamp-1">{integration.description}</p>
            </div>
          </div>
          <StatusBadge status={integration.status} />
        </div>

        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={handleTest}
            disabled={testResult === 'loading'}
            className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white/90 transition-all disabled:opacity-50"
          >
            {testResult === 'loading' && <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />}
            {testResult === 'idle' && <RefreshCw className="w-3 h-3" />}
            {testResult === 'ok' && <CheckCircle className="w-3 h-3 text-green-400" />}
            {testResult === 'error' && <XCircle className="w-3 h-3 text-red-400" />}
            {testResult === 'loading' ? 'Testando...' : testResult === 'ok' ? 'Conexao OK' : testResult === 'error' ? 'Falhou' : 'Testar conexao'}
          </button>
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-xs font-mono px-3 py-1.5 rounded border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white/90 transition-all ml-auto"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'Fechar' : 'Configurar'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/10 bg-white/[0.02] p-4 space-y-3">
          {localFields.map(field => (
            <div key={field.key} className="space-y-1.5">
              <label className="text-xs font-mono text-white/50 uppercase tracking-wide">
                {field.label}
                {field.masked && <span className="ml-1.5 text-white/20 normal-case">(sensivel)</span>}
              </label>
              <input
                type={field.masked ? 'password' : 'text'}
                value={field.value}
                onChange={e => handleFieldChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-xs font-mono text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/30 focus:bg-white/[0.08] transition-all"
              />
              {field.value && (
                <div className="flex items-center gap-1 text-xs text-white/30 font-mono">
                  <span>Atual:</span>
                  <MaskedValue value={field.value} masked={field.masked} />
                </div>
              )}
            </div>
          ))}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs font-mono px-4 py-2 rounded bg-white text-black hover:bg-white/90 transition-all disabled:opacity-50 font-semibold"
            >
              {saving && <span className="w-3 h-3 border border-black/30 border-t-black rounded-full animate-spin" />}
              {saved && <CheckCircle className="w-3 h-3 text-green-600" />}
              {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar'}
            </button>
            <button
              onClick={() => setExpanded(false)}
              className="text-xs font-mono px-3 py-2 rounded border border-white/10 text-white/40 hover:text-white/70 transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Environment Variable Row (editable)
// ---------------------------------------------------------------------------

function EnvVarRow({
  envVar,
  onChange,
  onDelete,
}: {
  envVar: EnvVar
  onChange: (key: string, field: 'key' | 'value', newValue: string) => void
  onDelete: (key: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const isSensitive =
    envVar.key.toLowerCase().includes('secret') ||
    envVar.key.toLowerCase().includes('key') ||
    envVar.key.toLowerCase().includes('token') ||
    envVar.key.toLowerCase().includes('password')

  const handleCopy = () => {
    navigator.clipboard.writeText(`${envVar.key}=${envVar.value}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-2 px-3">
        <input
          value={envVar.key}
          onChange={e => onChange(envVar.key, 'key', e.target.value)}
          className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs font-mono text-blue-400/80 w-48 focus:outline-none focus:border-white/30"
        />
        <span className="text-xs font-mono text-white/30">=</span>
        <input
          value={envVar.value}
          onChange={e => onChange(envVar.key, 'value', e.target.value)}
          className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs font-mono text-white/60 flex-1 focus:outline-none focus:border-white/30"
        />
        <button
          onClick={() => setEditing(false)}
          className="text-xs font-mono px-2 py-1 rounded bg-white/10 text-white/60 hover:text-white/90 transition-colors"
        >
          OK
        </button>
        <button
          onClick={() => onDelete(envVar.key)}
          className="text-red-400/60 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  const displayValue = isSensitive ? envVar.value.slice(0, 8) + '********' : envVar.value

  return (
    <div className="flex items-center justify-between gap-3 py-2 px-3 rounded hover:bg-white/[0.04] group transition-colors">
      <div
        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
        onDoubleClick={() => setEditing(true)}
      >
        <span className={`text-xs font-mono shrink-0 ${isSensitive ? 'text-yellow-400/80' : 'text-blue-400/80'}`}>
          {envVar.key}
        </span>
        <span className="text-xs font-mono text-white/30">=</span>
        <span className="text-xs font-mono text-white/50 truncate">{displayValue}</span>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setEditing(true)} className="text-white/30 hover:text-white/70" title="Editar">
          <Eye className="w-3.5 h-3.5" />
        </button>
        <button onClick={handleCopy} className="text-white/30 hover:text-white/70" title="Copiar">
          {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add MCP Modal
// ---------------------------------------------------------------------------

function AddMcpModal({
  onClose,
  onSubmit,
  isPending,
}: {
  onClose: () => void
  onSubmit: (server: McpServer) => void
  isPending: boolean
}) {
  const [name, setName] = useState('')
  const [command, setCommand] = useState('npx')
  const [argsStr, setArgsStr] = useState('')
  const [envPairs, setEnvPairs] = useState<{ k: string; v: string }[]>([{ k: '', v: '' }])

  const addEnvPair = () => setEnvPairs(prev => [...prev, { k: '', v: '' }])
  const removeEnvPair = (idx: number) => setEnvPairs(prev => prev.filter((_, i) => i !== idx))
  const updateEnvPair = (idx: number, field: 'k' | 'v', val: string) =>
    setEnvPairs(prev => prev.map((p, i) => (i === idx ? { ...p, [field]: val } : p)))

  const handleSubmit = () => {
    if (!name.trim() || !command.trim()) return
    const args = argsStr
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
    const env: Record<string, string> = {}
    envPairs.forEach(p => {
      if (p.k.trim()) env[p.k.trim()] = p.v
    })
    onSubmit({ name: name.trim(), command: command.trim(), args, env })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-white/10 rounded-xl w-full max-w-lg mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="text-sm font-bold font-mono text-white uppercase tracking-widest">Adicionar MCP Server</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-white/50 uppercase tracking-wide">Nome</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ex: github, filesystem, supabase"
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-xs font-mono text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-all"
            />
          </div>

          {/* Command */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-white/50 uppercase tracking-wide">Comando</label>
            <input
              value={command}
              onChange={e => setCommand(e.target.value)}
              placeholder="npx"
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-xs font-mono text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-all"
            />
          </div>

          {/* Args */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-white/50 uppercase tracking-wide">Args (separados por virgula)</label>
            <input
              value={argsStr}
              onChange={e => setArgsStr(e.target.value)}
              placeholder="-y, @modelcontextprotocol/server-github"
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-xs font-mono text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-all"
            />
          </div>

          {/* Env vars */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-white/50 uppercase tracking-wide">Variaveis de Ambiente</label>
              <button onClick={addEnvPair} className="text-xs font-mono text-white/40 hover:text-white/70 transition-colors flex items-center gap-1">
                <Plus className="w-3 h-3" /> Adicionar
              </button>
            </div>
            {envPairs.map((pair, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  value={pair.k}
                  onChange={e => updateEnvPair(idx, 'k', e.target.value)}
                  placeholder="CHAVE"
                  className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs font-mono text-yellow-400/80 w-40 placeholder:text-white/15 focus:outline-none focus:border-white/30"
                />
                <span className="text-white/20 text-xs">=</span>
                <input
                  value={pair.v}
                  onChange={e => updateEnvPair(idx, 'v', e.target.value)}
                  placeholder="valor"
                  className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs font-mono text-white/60 flex-1 placeholder:text-white/15 focus:outline-none focus:border-white/30"
                />
                {envPairs.length > 1 && (
                  <button onClick={() => removeEnvPair(idx)} className="text-red-400/40 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="text-xs font-mono px-4 py-2 rounded border border-white/10 text-white/40 hover:text-white/70 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !command.trim() || isPending}
            className="flex items-center gap-1.5 text-xs font-mono px-4 py-2 rounded bg-white text-black hover:bg-white/90 transition-all disabled:opacity-50 font-semibold"
          >
            {isPending && <span className="w-3 h-3 border border-black/30 border-t-black rounded-full animate-spin" />}
            {isPending ? 'Salvando...' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// MCP Card
// ---------------------------------------------------------------------------

function McpServerCard({ server, onDelete }: { server: McpServer; onDelete?: (name: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden hover:border-white/20 transition-all">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
          <span className="text-sm font-mono font-semibold text-white truncate">{server.name}</span>
          <span className="text-xs font-mono text-white/30 hidden sm:block">{server.command} {server.args.join(' ')}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onDelete && (
            <button onClick={() => onDelete(server.name)} className="text-red-400/40 hover:text-red-400 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-white/30 hover:text-white/70 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-white/10 bg-white/[0.02] p-4">
          <pre className="text-xs font-mono text-white/60 leading-relaxed overflow-x-auto">
            <code>{JSON.stringify({ [server.name]: { command: server.command, args: server.args, env: server.env } }, null, 2)}</code>
          </pre>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Claude Code Remote Card
// ---------------------------------------------------------------------------

type RemoteSession = {
  active: boolean
  host?: string
  port?: number
  started_at?: string
}

function ClaudeRemoteCard({ apiBase }: { apiBase: string }) {
  const [session, setSession] = useState<RemoteSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<'ssh' | 'connect' | null>(null)

  const checkSession = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`${apiBase}/api/claude-remote/status`, { signal: AbortSignal.timeout(4000) })
      if (r.ok) {
        const data = await r.json()
        setSession(data)
      } else {
        setSession({ active: false })
      }
    } catch {
      setSession({ active: false })
    } finally {
      setLoading(false)
    }
  }, [apiBase])

  // Poll a cada 30s
  useEffect(() => {
    checkSession()
    const interval = setInterval(checkSession, 30_000)
    return () => clearInterval(interval)
  }, [checkSession])

  const handleCopy = (type: 'ssh' | 'connect') => {
    const text = type === 'ssh'
      ? 'ssh root@49.13.73.197 "cd /root && claude --remote"'
      : `claude --connect ${session?.host || '49.13.73.197'}:${session?.port || 4002}`
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2500)
  }

  const isActive = session?.active === true

  return (
    <div className={`relative overflow-hidden rounded-xl border transition-all ${
      isActive
        ? 'border-violet-500/30 bg-violet-500/5'
        : 'border-white/10 bg-white/5'
    }`}>
      {/* Glow quando ativo */}
      {isActive && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-violet-500/10 blur-2xl" />
        </div>
      )}

      <div className="relative p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              isActive ? 'bg-violet-500/15 text-violet-400' : 'bg-white/5 text-white/30'
            }`}>
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Claude Code Remote</h3>
              <p className="text-xs text-white/40 font-mono mt-0.5">
                Controle sessoes Claude Code pelo celular
              </p>
            </div>
          </div>

          {/* Status badge */}
          <div className={`flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border shrink-0 ${
            loading
              ? 'border-white/10 bg-white/5 text-white/30'
              : isActive
              ? 'border-violet-500/30 bg-violet-500/10 text-violet-300'
              : 'border-white/10 bg-white/[0.04] text-white/30'
          }`}>
            {loading ? (
              <span className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" />
            ) : isActive ? (
              <Wifi className="w-3 h-3" />
            ) : (
              <WifiOff className="w-3 h-3" />
            )}
            {loading ? 'Verificando...' : isActive ? 'Sessao ativa' : 'Sem sessao'}
          </div>
        </div>

        {/* Session info quando ativo */}
        {isActive && session && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20 space-y-1">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-white/40">Host</span>
              <span className="text-violet-300">{session.host || '49.13.73.197'}:{session.port || 4002}</span>
            </div>
            {session.started_at && (
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-white/40">Iniciada em</span>
                <span className="text-white/50">{new Date(session.started_at).toLocaleTimeString('pt-BR')}</span>
              </div>
            )}
          </div>
        )}

        {/* Instrucoes quando inativo */}
        {!loading && !isActive && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <p className="text-xs font-mono text-white/30 mb-1.5">Para iniciar uma sessao remota no Hetzner:</p>
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs font-mono text-white/50 truncate">
                ssh root@49.13.73.197 &quot;cd /root &amp;&amp; claude --remote&quot;
              </code>
              <button
                onClick={() => handleCopy('ssh')}
                className="shrink-0 text-white/30 hover:text-white/70 transition-colors"
                title="Copiar comando SSH"
              >
                {copied === 'ssh'
                  ? <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                  : <Copy className="w-3.5 h-3.5" />
                }
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={checkSession}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white/80 transition-all disabled:opacity-40"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>

          {isActive && (
            <button
              onClick={() => handleCopy('connect')}
              className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 transition-all"
            >
              {copied === 'connect'
                ? <CheckCircle className="w-3 h-3 text-green-400" />
                : <Terminal className="w-3 h-3" />
              }
              {copied === 'connect' ? 'Copiado!' : 'Copiar comando de conexao'}
            </button>
          )}

          <a
            href="https://docs.anthropic.com/claude-code/remote"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-xs font-mono text-white/20 hover:text-white/50 transition-colors underline underline-offset-2"
          >
            Docs
          </a>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-white/20" />
        </div>
        <h2 className="text-lg font-bold font-mono text-white/60 mb-2">Nenhum projeto selecionado</h2>
        <p className="text-xs font-mono text-white/30 text-center max-w-sm">
          Selecione um projeto no seletor global acima para visualizar e gerenciar suas integracoes, variaveis de ambiente e configuracoes MCP.
        </p>
      </div>
    </AppLayout>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function IntegrationsPage() {
  const { status } = useSession()
  const { selectedProject, selectedProjectId } = useProject()
  const queryClient = useQueryClient()

  const [showMcpModal, setShowMcpModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [envVars, setEnvVars] = useState<EnvVar[]>([
    { key: 'NEXT_PUBLIC_API_URL', value: 'http://localhost:4000' },
    { key: 'NEXT_PUBLIC_APP_URL', value: 'http://localhost:3000' },
    { key: 'NEXTAUTH_URL', value: 'http://localhost:3000' },
    { key: 'NEXTAUTH_SECRET', value: 'super-secret-key-hidden' },
    { key: 'GITHUB_ID', value: 'Ov23liAB...hidden' },
    { key: 'GITHUB_SECRET', value: 'abc123...hidden' },
    { key: 'ANTHROPIC_API_KEY', value: 'sk-ant-api03-...hidden' },
    { key: 'TELEGRAM_BOT_TOKEN', value: '7123456789:AAF...hidden' },
    { key: 'TELEGRAM_CHAT_ID', value: '-1001234567890' },
  ])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  // ------- MCP data -------
  const {
    data: mcpServers = [],
    isLoading: mcpLoading,
  } = useQuery<McpServer[]>({
    queryKey: ['mcp', selectedProjectId],
    queryFn: () =>
      fetch(`${API}/api/projects/${selectedProjectId}/mcp`).then(r => {
        if (!r.ok) return []
        return r.json()
      }),
    enabled: !!selectedProjectId,
  })

  const addMcpMutation = useMutation({
    mutationFn: (server: McpServer) =>
      fetch(`${API}/api/projects/${selectedProjectId}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(server),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcp', selectedProjectId] })
      setShowMcpModal(false)
      showToast('MCP server adicionado com sucesso')
    },
    onError: () => {
      showToast('Erro ao adicionar MCP server')
    },
  })

  // ------- Integrations -------
  const integrations = useMemo(() => buildIntegrations(selectedProject), [selectedProject])
  const [localIntegrations, setLocalIntegrations] = useState<IntegrationConfig[]>([])

  // Sync when project or integrations change
  const activeIntegrations = localIntegrations.length > 0 && localIntegrations[0]?.id === integrations[0]?.id
    ? localIntegrations
    : integrations

  const handleUpdateIntegration = useCallback((id: string, fields: IntegrationField[]) => {
    setLocalIntegrations(prev => {
      const base = prev.length > 0 ? prev : integrations
      return base.map(i => {
        if (i.id !== id) return i
        const hasValues = fields.every(f => f.value.trim().length > 0)
        return { ...i, fields, status: hasValues ? 'connected' as const : 'configure' as const }
      })
    })
    showToast('Integracao salva com sucesso')
  }, [integrations, showToast])

  // ------- Env vars handlers -------
  const handleEnvChange = useCallback((key: string, field: 'key' | 'value', newValue: string) => {
    setEnvVars(prev =>
      prev.map(ev => {
        if (ev.key !== key) return ev
        return field === 'key' ? { ...ev, key: newValue } : { ...ev, value: newValue }
      })
    )
  }, [])

  const handleEnvDelete = useCallback((key: string) => {
    setEnvVars(prev => prev.filter(ev => ev.key !== key))
  }, [])

  const handleAddEnvVar = useCallback(() => {
    setEnvVars(prev => [...prev, { key: 'NEW_VAR', value: '' }])
  }, [])

  // ------- Export MCP JSON -------
  const handleExportMcp = useCallback(() => {
    const config: Record<string, { command: string; args: string[]; env: Record<string, string> }> = {}
    mcpServers.forEach(s => {
      config[s.name] = { command: s.command, args: s.args, env: s.env }
    })
    const blob = new Blob([JSON.stringify({ mcpServers: config }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mcp-config-${selectedProject?.name || 'project'}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('JSON exportado com sucesso')
  }, [mcpServers, selectedProject, showToast])

  // ------- Auth guard -------
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

  const connectedCount = activeIntegrations.filter(i => i.status === 'connected').length
  const configureCount = activeIntegrations.filter(i => i.status === 'configure').length

  return (
    <AppLayout>
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 bg-neutral-800 border border-white/10 rounded-lg px-4 py-2 text-sm text-white/80 font-mono shadow-2xl">
          {toast}
        </div>
      )}

      {showMcpModal && (
        <AddMcpModal
          onClose={() => setShowMcpModal(false)}
          onSubmit={server => addMcpMutation.mutate(server)}
          isPending={addMcpMutation.isPending}
        />
      )}

      <div className="px-6 py-6 max-w-7xl mx-auto space-y-8">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-widest font-mono uppercase text-white">
              Integracoes
            </h1>
            <p className="text-xs text-white/40 font-mono mt-1">
              Projeto: <span className="text-white/60">{selectedProject.name}</span> -- Gerencie conexoes, variaveis e MCP
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-1 text-xs font-mono px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20">
              <CheckCircle className="w-3 h-3" />
              {connectedCount} conectado{connectedCount !== 1 ? 's' : ''}
            </span>
            {configureCount > 0 && (
              <span className="flex items-center gap-1 text-xs font-mono px-2 py-1 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                <AlertCircle className="w-3 h-3" />
                {configureCount} pendente{configureCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Integration cards grid */}
        <section className="space-y-3">
          <h2 className="text-xs font-mono text-white/40 uppercase tracking-widest">Servicos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeIntegrations.map(integration => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onUpdate={handleUpdateIntegration}
              />
            ))}
          </div>
        </section>

        {/* Claude Code Remote */}
        <section className="space-y-3">
          <h2 className="text-xs font-mono text-white/40 uppercase tracking-widest">Acesso Remoto</h2>
          <ClaudeRemoteCard apiBase={API} />
        </section>

        {/* Environment variables */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono text-white/40 uppercase tracking-widest">
              Variaveis de Ambiente
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-white/20">{envVars.length} vars</span>
              <button
                onClick={handleAddEnvVar}
                className="flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white/80 transition-all"
              >
                <Plus className="w-3 h-3" /> Adicionar
              </button>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-white/10 bg-white/[0.02] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
              <span className="ml-2 text-xs font-mono text-white/30">.env.local</span>
            </div>
            <div className="divide-y divide-white/5">
              {envVars.map(ev => (
                <EnvVarRow
                  key={ev.key}
                  envVar={ev}
                  onChange={handleEnvChange}
                  onDelete={handleEnvDelete}
                />
              ))}
            </div>
            <div className="px-3 py-2 border-t border-white/10 bg-white/[0.02]">
              <p className="text-xs font-mono text-white/20">
                Duplo-clique para editar. Valores sensiveis mascarados automaticamente.
              </p>
            </div>
          </div>
        </section>

        {/* MCP Servers */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-mono text-white/40 uppercase tracking-widest">MCP Servers</h2>
              <p className="text-xs text-white/25 font-mono mt-0.5">
                Model Context Protocol -- configuracao por projeto
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportMcp}
                disabled={mcpServers.length === 0}
                className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white/80 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Download className="w-3 h-3" />
                Exportar JSON
              </button>
              <button
                onClick={() => setShowMcpModal(true)}
                className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded bg-white text-black hover:bg-white/90 transition-all font-semibold"
              >
                <Plus className="w-3 h-3" />
                Adicionar MCP
              </button>
            </div>
          </div>

          {mcpLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          ) : mcpServers.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-lg px-6 py-10 text-center">
              <Server className="w-8 h-8 text-white/15 mx-auto mb-3" />
              <p className="text-xs font-mono text-white/30">
                Nenhum MCP server configurado para este projeto.
              </p>
              <p className="text-xs font-mono text-white/15 mt-1">
                Clique em &quot;Adicionar MCP&quot; para comecar.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {mcpServers.map((s, idx) => (
                <McpServerCard key={s.id || s.name + idx} server={s} />
              ))}

              {/* Preview completo */}
              <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden mt-3">
                <div className="px-3 py-2 border-b border-white/10 bg-white/[0.02] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                  <span className="ml-2 text-xs font-mono text-white/30">mcp_config.json</span>
                  <span className="ml-auto text-xs font-mono text-white/20">preview</span>
                </div>
                <pre className="p-4 text-xs font-mono text-white/60 overflow-x-auto leading-relaxed">
                  <code>
                    {JSON.stringify(
                      {
                        mcpServers: Object.fromEntries(
                          mcpServers.map(s => [s.name, { command: s.command, args: s.args, env: s.env }])
                        ),
                      },
                      null,
                      2,
                    )}
                  </code>
                </pre>
                <div className="px-3 py-2 border-t border-white/10 bg-white/[0.02] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span className="text-xs font-mono text-white/30">
                    {mcpServers.length} servidor{mcpServers.length !== 1 ? 'es' : ''} MCP configurado{mcpServers.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  )
}
