import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Github, CalendarDays, ExternalLink, PlayCircle, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RoadmapView } from "@/components/roadmap-view"
import { ProjectNotes } from "@/components/project-notes"
import { SyncButton } from "@/components/sync-button"
import { DeleteProjectButton } from "@/components/delete-project-button"

interface ProjectPageProps {
    params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
    const { id } = await params
    const supabase = await createClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) redirect("/login")

    // 1. Busca Projeto + Fases + Subtasks + Notas
    const { data: project } = await supabase
        .from("projects")
        .select(`
      *,
      phases (
        *,
        subtasks (*)
      ),
      notes (*)
    `)
        .eq("id", id)
        .eq("user_id", session.user.id)
        .single()

    if (!project) notFound()

    // 2. Processamento de Dados
    const phases = project.phases?.sort((a: any, b: any) => a.order_index - b.order_index) || []
    const notes = project.notes?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) || []

    // Cálculo de Progresso
    const totalSubtasks = phases.reduce((acc: number, curr: any) => acc + (curr.subtasks_total || 0), 0)
    const completedSubtasks = phases.reduce((acc: number, curr: any) => acc + (curr.subtasks_completed || 0), 0)
    const totalProgress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0

    // 3. Lógica de "Próxima Ação"
    // Encontra a fase ativa (in_progress) ou a primeira pendente (pending)
    const activePhase = phases.find((p: any) => p.status === 'in_progress') || phases.find((p: any) => p.status === 'pending');
    // Dentro dessa fase, pega a primeira subtask não concluída
    const nextTask = activePhase?.subtasks?.sort((a: any, b: any) => (a.title > b.title ? 1 : -1)).find((t: any) => !t.is_completed);

    // 4. Lógica de Inatividade
    const isStale = (project.days_inactive || 0) > 7;

    return (
        <div className="container max-w-6xl mx-auto py-8 space-y-8">
            {/* Header */}
            <div className="space-y-4">
                <Link href="/dashboard" className="text-muted-foreground hover:text-primary flex items-center gap-2 text-sm mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    Voltar para Dashboard
                </Link>

                {/* Alerta de Inatividade */}
                {isStale && (
                    <Alert variant="destructive" className="mb-4 bg-destructive/10 border-destructive/20 text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Projeto Inativo</AlertTitle>
                        <AlertDescription>
                            Este projeto não recebe atualizações há {project.days_inactive} dias. Considere retomar o ritmo ou arquivá-lo.
                        </AlertDescription>
                    </Alert>
                )}

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
            </div>

            <Separator />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Roadmap (2/3 width) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Próxima Ação Sugerida */}
                    {nextTask && (
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <PlayCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-primary uppercase tracking-wider mb-1">Próxima Ação Sugerida</h4>
                                <p className="font-medium text-lg leading-none">{nextTask.title}</p>
                                <p className="text-xs text-muted-foreground mt-1">Na fase: {activePhase.title}</p>
                            </div>
                        </div>
                    )}

                    <RoadmapView phases={phases} />
                </div>

                {/* Right Column: Sidebar (1/3 width) */}
                <div className="space-y-6">
                    {/* Componente de Notas */}
                    <ProjectNotes projectId={project.id} notes={notes} />

                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                        <h3 className="font-semibold mb-4">Ações</h3>
                        <SyncButton
                            projectId={project.id}
                            repoFullName={project.github_repo_full_name}
                        />
                        <DeleteProjectButton projectId={project.id} repoFullName={project.github_repo_full_name} />
                    </div>
                </div>
            </div>
        </div>
    )
}
