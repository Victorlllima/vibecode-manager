import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProjectCard } from "@/components/project-card";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Buscar projetos do usuário
    const { data: projects } = await supabase
        .from("projects")
        .select(`
      *,
      phases (
        id,
        subtasks (id, is_completed)
      )
    `)
        .eq("user_id", user?.id)
        .order("updated_at", { ascending: false });

    // Calcular progresso de cada projeto
    const projectsWithProgress = projects?.map((project) => {
        const allSubtasks = project.phases?.flatMap((phase: any) => phase.subtasks) || [];
        const completedSubtasks = allSubtasks.filter((st: any) => st.is_completed).length;
        const totalSubtasks = allSubtasks.length;
        const progress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

        return { ...project, progress, totalSubtasks, completedSubtasks };
    }) || [];

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

            {projectsWithProgress.length === 0 ? (
                <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border border-dashed">
                    <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                        <h3 className="mt-4 text-lg font-semibold">Nenhum projeto encontrado</h3>
                        <p className="mb-4 mt-2 text-sm text-muted-foreground">
                            Você ainda não tem nenhum projeto. Comece importando um repositório.
                        </p>
                        <Link href="/projects/add">
                            <Button>Importar Projeto</Button>
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {projectsWithProgress.map((project) => (
                        <ProjectCard key={project.id} project={project} />
                    ))}
                </div>
            )}
        </div>
    );
}
