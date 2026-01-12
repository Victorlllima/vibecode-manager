import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Github, CalendarDays, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { RoadmapView } from "@/components/roadmap-view"

interface ProjectPageProps {
    params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
    const { id } = await params
    const supabase = await createClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) redirect("/login")

    // Busca projeto com fases e subtasks ordenadas
    const { data: project } = await supabase
        .from("projects")
        .select(`
      *,
      phases (
        *,
        subtasks (*)
      )
    `)
        .eq("id", id)
        .eq("user_id", session.user.id)
        .single()

    if (!project) notFound()

    // Ordenar fases e subtasks (o Supabase não garante ordem no select aninhado sem modifiers complexos)
    const phases = project.phases?.sort((a: any, b: any) => a.order_index - b.order_index) || []

    // Calcular totais
    const totalSubtasks = phases.reduce((acc: number, curr: any) => acc + (curr.subtasks_total || 0), 0)
    const completedSubtasks = phases.reduce((acc: number, curr: any) => acc + (curr.subtasks_completed || 0), 0)
    const totalProgress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0

    return (
        <div className="container max-w-5xl mx-auto py-8 space-y-8">
            {/* Header */}
            <div className="space-y-4">
                <Link href="/dashboard" className="text-muted-foreground hover:text-primary flex items-center gap-2 text-sm mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    Voltar para Dashboard
                </Link>

                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <a
                                href={project.github_repo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 hover:text-primary hover:underline"
                            >
                                <Github className="w-4 h-4" />
                                {project.github_repo_full_name}
                                <ExternalLink className="w-3 h-3" />
                            </a>
                            <span className="flex items-center gap-1">
                                <CalendarDays className="w-4 h-4" />
                                Atualizado em {new Date(project.updated_at).toLocaleDateString('pt-BR')}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">Progresso Global</span>
                            <span className="text-2xl font-bold">{totalProgress}%</span>
                        </div>
                        <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                            {project.status === 'active' ? 'Em Atividade' : 'Arquivado'}
                        </Badge>
                    </div>
                </div>

                {project.description && (
                    <p className="text-muted-foreground max-w-3xl">{project.description}</p>
                )}
            </div>

            <Separator />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Roadmap (2/3 width) */}
                <div className="lg:col-span-2 space-y-6">
                    <RoadmapView phases={phases} />
                </div>

                {/* Right Column: Notes & Actions (1/3 width) */}
                <div className="space-y-6">
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                        <h3 className="font-semibold mb-4">Notas Rápidas</h3>
                        <div className="text-sm text-muted-foreground text-center py-8 bg-muted/20 rounded border border-dashed">
                            Em breve: Bloco de notas integrado.
                        </div>
                    </div>

                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                        <h3 className="font-semibold mb-4">Ações</h3>
                        <Button variant="outline" className="w-full justify-start mb-2" disabled>
                            Sincronizar Repositório
                        </Button>
                        <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive" disabled>
                            Desconectar Projeto
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
