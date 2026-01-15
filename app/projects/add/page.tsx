import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserRepositories } from "@/lib/github-service";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { RepoCard } from "./repo-card";

export default async function NewProjectPage() {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        redirect("/login");
    }

    const providerToken = session.provider_token;

    if (!providerToken) {
        return (
            <div className="container mx-auto py-10">
                <div className="p-4 border border-destructive/50 bg-destructive/10 rounded-md text-destructive">
                    Erro: Token do GitHub não encontrado. Tente fazer logout e login novamente.
                </div>
            </div>
        );
    }

    const repos = await getUserRepositories(providerToken);

    return (
        <div className="container max-w-4xl mx-auto py-10 space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Importar Projeto</h1>
                    <p className="text-muted-foreground">
                        Selecione um repositório para conectar ao VibeCode Manager.
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {repos.map((repo) => (
                    <RepoCard key={repo.id} repo={repo} />
                ))}
            </div>

            {repos.length === 0 && (
                <div className="text-center py-10 text-muted-foreground flex flex-col items-center">
                    <p className="mb-4">Nenhum repositório encontrado.</p>
                    {/* Botão de recarregar removido no server component, idealmente seria um refresh via router */}
                </div>
            )}
        </div>
    );
}
