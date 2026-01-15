import Link from "next/link";
import { Plus, FolderOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProjectCard } from "@/components/project-card";

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
        <div>
            {/* ========== HEADER DA PÁGINA ========== */}
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold text-white">
                    Meus Projetos
                </h1>

                <Link href="/projects/add">
                    <button className="btn-neon flex items-center gap-2 px-5 py-2.5 rounded hover:shadow-neon transition-all">
                        <Plus className="w-4 h-4" />
                        <span>NOVO PROJETO</span>
                    </button>
                </Link>
            </div>

            {/* ========== LISTA DE PROJETOS ========== */}
            {projectsWithProgress.length === 0 ? (
                /* Empty State */
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="icon-neon w-20 h-20 mb-6">
                        <FolderOpen className="w-10 h-10" />
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-2">
                        Nenhum projeto ainda
                    </h2>
                    <p className="text-gray-400 mb-6 text-center max-w-md">
                        Conecte seu primeiro repositório do GitHub para começar a gerenciar seus projetos de vibecoding.
                    </p>
                    <Link href="/projects/add">
                        <button className="btn-neon-glow px-8 py-3 rounded-lg">
                            Conectar Repositório
                        </button>
                    </Link>
                </div>
            ) : (
                /* Grid de Projetos */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projectsWithProgress.map((project) => (
                        <ProjectCard key={project.id} project={project} />
                    ))}
                </div>
            )}
        </div>
    );
}
