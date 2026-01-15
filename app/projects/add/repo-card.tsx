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
                router.push(`/dashboard`);
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
        <Card className="flex flex-col h-full hover:bg-accent/50 transition-colors">
            <CardHeader>
                <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-base truncate" title={repo.name}>
                        {repo.name}
                    </CardTitle>
                    {repo.private ? <Lock className="w-4 h-4 text-muted-foreground shrink-0" /> : <Unlock className="w-4 h-4 text-muted-foreground shrink-0" />}
                </div>
                <CardDescription className="text-xs truncate">{repo.full_name}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">
                    {repo.description || "Sem descrição"}
                </p>
                <Button
                    onClick={handleConnect}
                    disabled={loading}
                    className="w-full"
                    variant="secondary"
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Conectando...
                        </>
                    ) : (
                        "Importar Projeto"
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}
