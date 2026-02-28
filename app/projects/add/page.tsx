'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/app-layout'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

const STATUS_OPTIONS = [
  { value: 'development', label: 'In Development' },
  { value: 'production',  label: 'Production Ready' },
  { value: 'attention',   label: 'Needs Attention' },
  { value: 'down',        label: 'Down' },
]

export default function AddProjectPage() {
  const { status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    description: '',
    path: '',
    github_url: '',
    status: 'development',
    priority: '5',
  })

  if (status === 'loading') return (
    <div className="flex h-screen w-full items-center justify-center bg-neutral-950">
      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  )
  if (status === 'unauthenticated') { router.push('/login'); return null }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Nome é obrigatório'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          priority: parseInt(form.priority),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao criar projeto')
      }
      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar projeto')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-white/20 font-mono focus:outline-none focus:border-white/30 focus:bg-white/[0.08] transition-colors"
  const labelClass = "block text-xs font-mono text-white/50 uppercase tracking-wide mb-1.5"

  return (
    <AppLayout>
      <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-white/40 hover:text-white/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xs font-mono text-white/40 uppercase tracking-widest">Novo Projeto</h1>
      </div>

      <div className="px-6 py-8 max-w-xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={labelClass}>Nome *</label>
            <input
              type="text"
              className={inputClass}
              placeholder="ex: RVM Dashboard"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div>
            <label className={labelClass}>Descrição</label>
            <textarea
              className={`${inputClass} resize-none h-20`}
              placeholder="Descrição breve do projeto..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div>
            <label className={labelClass}>Caminho local</label>
            <input
              type="text"
              className={inputClass}
              placeholder="ex: /home/user/projects/rvm"
              value={form.path}
              onChange={e => setForm(f => ({ ...f, path: e.target.value }))}
            />
          </div>

          <div>
            <label className={labelClass}>GitHub URL</label>
            <input
              type="url"
              className={inputClass}
              placeholder="https://github.com/user/repo"
              value={form.github_url}
              onChange={e => setForm(f => ({ ...f, github_url: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Status</label>
              <select
                className={inputClass}
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value} className="bg-neutral-900">{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Prioridade (1-10)</label>
              <input
                type="number"
                min="1"
                max="10"
                className={inputClass}
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 font-mono bg-red-400/10 border border-red-400/20 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="bg-white text-black hover:bg-white/90 font-mono text-xs h-8 px-4 rounded"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border border-black/30 border-t-black rounded-full animate-spin" />
                  Criando...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Plus className="w-3 h-3" />
                  Criar Projeto
                </span>
              )}
            </Button>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="text-xs font-mono text-white/30 hover:text-white/60 transition-colors"
            >
              cancelar
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
