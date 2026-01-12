'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, Loader2 } from "lucide-react";
import { importProject } from "@/app/actions/import-project";
import { useState } from "react";

interface RepoCardProps {
    repo: any;
}

export function RepoCard({ repo }: RepoCardProps) {
    const [loading, setLoading] = useState(false);

    const handleConnect = async () => {
        setLoading(true);
        try {
            await importProject(repo.id, repo.full_name, repo.html_url, repo.description);
            // Redirecionamento acontece na Server Action
        } catch (error: any) {
            alert(`Erro ao conectar: ${error.message}`);
            setLoading(false);
        }
    };

    return (
        <Card className="flex flex-col hover:border-primary/50 transition-colors">
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
                    className="w-full mt-2"
                    variant="secondary"
                    onClick={handleConnect}
                    disabled={loading}
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {loading ? "Conectando..." : "Conectar"}
                </Button>
            </CardContent>
        </Card>
    );
}
