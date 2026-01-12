import Link from "next/link"
import { ArrowRight, Github, RefreshCw, Layout, Code2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="px-6 h-16 flex items-center border-b justify-between">
        <div className="flex items-center gap-2 font-bold text-xl">
          <Code2 className="w-6 h-6 text-primary" />
          <span>VibeCode Manager</span>
        </div>
        <nav>
          <Link href="/login">
            <Button variant="ghost">Entrar</Button>
          </Link>
          <Link href="/login" className="ml-2">
            <Button>Começar Agora</Button>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="w-full py-20 md:py-32 lg:py-40 bg-gradient-to-b from-background to-muted/20">
          <div className="container px-4 md:px-6 mx-auto text-center">
            <div className="space-y-4 max-w-3xl mx-auto">
              <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
                Transforme seu <span className="text-primary">asbuilt.md</span> em um Roadmap Vivo.
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                Pare de atualizar quadros manuais. O VibeCode Manager sincroniza seu progresso diretamente do GitHub. Você coda, nós atualizamos.
              </p>
            </div>
            <div className="space-y-4 mt-8">
              <Link href="/login">
                <Button size="lg" className="px-8 h-12 text-base">
                  <Github className="mr-2 h-5 w-5" />
                  Entrar com GitHub
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground">
                Livre para uso pessoal. Código Aberto.
              </p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full py-20 bg-muted/10 border-t">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-4 bg-primary/10 rounded-full text-primary">
                  <RefreshCw className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold">Sync Automático</h3>
                <p className="text-muted-foreground">
                  Integração via Webhooks. Dê um <code>git push</code> e veja seu dashboard atualizar magicamente em segundos.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-4 bg-primary/10 rounded-full text-primary">
                  <Layout className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold">Roadmap Visual</h3>
                <p className="text-muted-foreground">
                  Visualize fases, subtasks e progresso em uma interface limpa. Abandone a leitura de Markdown puro.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-4 bg-primary/10 rounded-full text-primary">
                  <Code2 className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold">Foco no Código</h3>
                <p className="text-muted-foreground">
                  Mantenha a verdade no repositório. O <code>asbuilt.md</code> continua sendo sua fonte única da verdade.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t w-full shrink-0 items-center px-4 md:px-6 flex flex-col sm:flex-row justify-between gap-4">
        <p className="text-xs text-muted-foreground text-center sm:text-left">
          © 2026 VibeCode Manager. Construído com Next.js 15 e Supabase.
        </p>
        <div className="flex gap-4">
          <Link href="#" className="text-xs hover:underline underline-offset-4">
            Termos
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4">
            Privacidade
          </Link>
        </div>
      </footer>
    </div>
  )
}
