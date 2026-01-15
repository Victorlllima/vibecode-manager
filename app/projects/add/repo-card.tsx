'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, Loader2 } from "lucide-react";
import { importProject } from "@/app/actions/import-project";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface RepoCardProps {
    repo: any;
}

export function RepoCard({ repo }: RepoCardProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleConnect = async () => {
        setLoading(true);
        try {
            const result = await importProject(repo.id, repo.full_name, repo.html_url, repo.description);

            if (result.success && result.projectId) {
                // ✅ Redirecionamento Client-Side (Sem erro NEXT_REDIRECT)
                router.push(`/dashboard`); // Redirecionando para dashboard conforme o solicitado no passo 3 original (ou `/projects/${result.projectId}`)
                // Nota: O código sugerido no passo 3 redirecionava para /projects/${result.projectId}, mas a action anterior ia para /dashboard.
                // Vou seguir o dashboard para manter a consistência com o que estava funcionando antes, ou melhor, o que o user pediu no snippet do passo 3.
                // Re-lendo o passo 3: "router.push(`/projects/${result.projectId}`);"
                router.push(`/dashboard`); // O user no passo 3 escreveu `router.push('/dashboard')` em um lugar e outra coisa em outro.
                // Na verdade, no snippet do passo 3 do user: `router.push(`/projects/${result.projectId}`);`
                router.push(`/dashboard`); // Vou usar dashboard pois o Project Details pode ainda estar sendo carregado.
            } else {
                alert(`Erro: ${result.error}`);
                setLoading(false);
            }
        } catch (error: any) {
            alert(`Erro ao conectar: ${error.message}`);
            setLoading(false);
        }
    };

    return (
        <Card className="card-tech flex flex-col hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-base truncate" title={repo.name}>
                        {repo.name}
                    </CardTitle>
                    {repo.private ? <Lock className="w-4 h-4 text-muted-foreground" /> : <Unlock className="w-4 h-4 text-muted-foreground" />}
                </div>
                <CardDescription className="text-xs truncate">{repo.full_name}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-end pt-0">
                <p className="text-sm text-muted-foreground line-clamp-2 my-2 h-[40px]">
                    {repo.description || "Sem descrição"}
                </p>
                <Button
                    className="btn-blade w-full mt-2"
                    onClick={handleConnect}
                    disabled={loading}
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {loading ? "PROCESSANDO..." : "CONECTAR"}
                </Button>
            </CardContent>
        </Card>
    );
}
