'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  LogOut, Layers, GitBranch, Zap, DollarSign, Plug, Shield, Map, ChevronDown, Activity
} from 'lucide-react'
import { useProject } from '@/contexts/project-context'
import { useState } from 'react'

const NAV_LINKS = [
  { href: '/dashboard',     label: 'Dashboard',      icon: Layers },
  { href: '/roadmap',       label: 'Roadmap',        icon: Map },
  { href: '/time-machine',  label: 'Time Machine',   icon: GitBranch },
  { href: '/shark-journey', label: 'Jornada SHARK',  icon: Zap },
  { href: '/ci-cd',          label: 'CI/CD',          icon: Activity },
  { href: '/cost-monitor',  label: 'Cost Monitor',   icon: DollarSign },
  { href: '/integrations',  label: 'Integrações',    icon: Plug },
  { href: '/health-score',  label: 'Health Score',   icon: Shield },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { projects, selectedProject, selectedProjectId, setSelectedProjectId, isLoading } = useProject()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const showProjectSelector = pathname !== '/dashboard'

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      {/* Top bar */}
      <header className="border-b border-white/10 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold tracking-widest text-white/80 font-mono uppercase">RVM</span>
          <span className="text-white/20 text-xs">|</span>
          <span className="text-xs text-white/40 font-mono hidden sm:block">RedPro Vibecoding Manager</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Global project selector */}
          {showProjectSelector && (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(v => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all text-xs font-mono text-white/60 max-w-[220px]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                <span className="truncate">
                  {isLoading ? 'Carregando...' : selectedProject?.name || 'Selecionar projeto'}
                </span>
                <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 w-72 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                  {projects.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedProjectId(p.id); setDropdownOpen(false) }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-mono transition-colors ${
                        selectedProjectId === p.id
                          ? 'bg-white/10 text-white'
                          : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          p.status === 'production' ? 'bg-green-400' :
                          p.status === 'development' ? 'bg-blue-400' :
                          p.status === 'attention' ? 'bg-yellow-400' : 'bg-white/30'
                        }`} />
                        <span className="text-white/80 truncate">{p.name}</span>
                      </div>
                      {p.description && (
                        <div className="text-white/30 text-[10px] mt-0.5 ml-3.5 truncate">{p.description}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <Avatar className="w-7 h-7 border border-white/20">
            <AvatarImage src={session?.user?.image || ''} alt={session?.user?.name || ''} />
            <AvatarFallback className="bg-neutral-800 text-white text-xs">
              {session?.user?.name?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-white/60 hidden sm:block">{session?.user?.name}</span>
          <Button
            variant="ghost" size="sm"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-white/40 hover:text-white/80 hover:bg-white/5 p-1.5 h-auto"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Navigation tabs */}
      <nav className="border-b border-white/5 px-4 flex items-center gap-0.5 overflow-x-auto shrink-0">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-mono transition-all whitespace-nowrap border-b-2 -mb-px ${
                active
                  ? 'border-white text-white'
                  : 'border-transparent text-white/40 hover:text-white/70 hover:border-white/20'
              }`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Page content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
