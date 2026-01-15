// app/page.tsx
import Link from "next/link";
import { Zap, RefreshCw, GitBranch, Code2 } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* ========== HEADER ========== */}
      <header className="flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-neon-orange" />
          <span className="text-white font-semibold text-lg">
            Vibecode Manager
          </span>
        </div>

        {/* Botão Sair - Visível apenas para fins de demonstração ou logado */}
        <button className="btn-neon px-4 py-2 text-sm rounded">
          Configurações
        </button>
      </header>

      {/* ========== CONTEÚDO PRINCIPAL ========== */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Botão Novo Projeto */}
        <div className="self-end mb-12">
          <Link href="/projects/add">
            <button className="btn-neon px-6 py-3 rounded relative">
              Novo Projeto
              {/* Linha de brilho */}
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-neon-orange to-transparent"
                style={{ boxShadow: '0 0 10px #F97316' }} />
            </button>
          </Link>
        </div>

        {/* Botão Principal - Entrar com GitHub */}
        <div className="mb-16">
          <Link href="/login">
            <button className="btn-neon-glow px-12 py-4 text-xl rounded-lg">
              Entrar com GitHub
            </button>
          </Link>
        </div>

        {/* ========== FEATURES ========== */}
        <div className="flex items-center justify-center gap-8 md:gap-16 mt-8 flex-wrap">
          {/* Feature 1 - Sync Automático */}
          <div className="flex flex-col items-center min-w-[120px]">
            <div className="icon-neon">
              <RefreshCw className="w-7 h-7" />
            </div>
            <span className="text-white text-sm mt-3 font-medium">
              Sync Automático
            </span>
            <div className="line-glow w-24 mt-2" />
          </div>

          {/* Feature 2 - Roadmap Visual */}
          <div className="flex flex-col items-center min-w-[120px]">
            <div className="icon-neon">
              <GitBranch className="w-7 h-7" />
            </div>
            <span className="text-white text-sm mt-3 font-medium">
              Roadmap Visual
            </span>
            <div className="line-glow w-24 mt-2" />
          </div>

          {/* Feature 3 - Foco no Código */}
          <div className="flex flex-col items-center min-w-[120px]">
            <div className="icon-neon">
              <Code2 className="w-7 h-7" />
            </div>
            <span className="text-white text-sm mt-3 font-medium">
              Foco no Código
            </span>
            <div className="line-glow w-24 mt-2" />
          </div>
        </div>
      </main>

      {/* ========== DECORAÇÃO DE CANTO ========== */}
      <div className="fixed bottom-6 right-6">
        <svg
          className="w-10 h-10 text-neon-orange/20"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
      </div>
    </div>
  );
}
