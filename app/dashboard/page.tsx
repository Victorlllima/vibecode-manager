import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/project-card";

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        redirect("/login");
    }

    // Busca projetos com os dados das fases para calcular progresso
    const { data: projects, error } = await supabase
        .from("projects")
        .select(`
      *,
      phases (
        subtasks_total,
        subtasks_completed
      )
    `)
        .eq("user_id", session.user.id)
        .order("updated_at", { ascending: false });

    // EMPTY STATE (Se não houver projetos)
    if (!projects || projects.length === 0) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed shadow-sm p-14 bg-muted/10 min-h-[500px]">
                <div className="flex flex-col items-center gap-1 text-center">
                    <h3 className="text-2xl font-bold tracking-tight">
                        Nenhum projeto monitorado
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-[500px] mb-6">
                        O VibeCode Manager ajuda você a terminar o que começou.
                        Importe seu primeiro repositório e transforme seu asbuilt.md em um roadmap vivo.
                    </p>
                    <Link href="/projects/add">
                        <Button size="lg" className="mt-4">
                            <Plus className="mr-2 h-4 w-4" />
                            Importar Projeto
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    // LISTA DE PROJETOS
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Meus Projetos</h1>
                <Link href="/projects/add">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Projeto
                    </Button>
                </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => {
                    // Calcula a porcentagem total baseada na soma de todas as subtasks de todas as fases
                    const totalSubtasks = project.phases?.reduce((acc: number, curr: any) => acc + (curr.subtasks_total || 0), 0) || 0;
                    const completedSubtasks = project.phases?.reduce((acc: number, curr: any) => acc + (curr.subtasks_completed || 0), 0) || 0;
                    const completionPercentage = totalSubtasks > 0
                        ? Math.round((completedSubtasks / totalSubtasks) * 100)
                        : 0;

                    return (
                        <ProjectCard
                            key={project.id}
                            id={project.id}
                            name={project.name}
                            description={project.description}
                            githubRepo={project.github_repo_full_name}
                            status={project.status as "active" | "archived"}
                            completionPercentage={completionPercentage}
                            daysInactive={project.days_inactive || 0}
                            updatedAt={project.updated_at}
                        />
                    );
                })}
            </div>
        </div>
    );
}
