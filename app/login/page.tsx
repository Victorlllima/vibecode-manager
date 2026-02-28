'use client'

import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-2xl font-bold font-mono text-white tracking-widest">RVM</span>
          </div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">
            RedPro Vibecoding Manager
          </h1>
          <p className="text-sm text-white/40 font-mono">
            Gestão e acompanhamento de projetos do Método S.H.A.R.K.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            className="w-full bg-white text-black hover:bg-white/90 font-mono text-sm h-11 rounded font-medium"
            onClick={() => signIn('github', { callbackUrl: '/dashboard' })}
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Entrar com GitHub
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          {[
            { dot: 'bg-green-500', label: 'Production' },
            { dot: 'bg-blue-500', label: 'In Dev' },
            { dot: 'bg-yellow-500', label: 'Attention' },
            { dot: 'bg-red-500', label: 'Down' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              <span className="text-xs text-white/30 font-mono">{s.label}</span>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-white/20 font-mono">
          RedPro AI Academy · Método S.H.A.R.K.
        </p>
      </div>
    </div>
  )
}
