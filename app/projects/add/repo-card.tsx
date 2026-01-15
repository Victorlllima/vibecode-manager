'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
                // ✅ Redirecionamento Client-Side
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
        <Card className="rounded-xl border border-white/10 bg-[#121215] flex flex-col hover:border-[#FF4D5A]/50 transition-all duration-300 shadow-xl overflow-hidden">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-base truncate text-white" title={repo.name}>
                        {repo.name}
                    </CardTitle>
                    {repo.private ? <Lock className="w-4 h-4 text-zinc-500" /> : <Unlock className="w-4 h-4 text-zinc-500" />}
                </div>
                <CardDescription className="text-xs truncate text-zinc-500">{repo.full_name}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-end pt-0">
                <p className="text-sm text-zinc-400 line-clamp-2 my-2 h-[40px]">
                    {repo.description || "Sem descrição"}
                </p>
                <button
                    onClick={handleConnect}
                    disabled={loading}
                    className="group mt-2 flex w-full flex-col items-center justify-center gap-2 bg-transparent disabled:opacity-50"
                >
                    <span className="text-sm font-bold uppercase tracking-[0.2em] text-white drop-shadow-[0_0_10px_rgba(255,165,0,0.5)] transition-all group-hover:text-orange-100 flex items-center gap-2">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {loading ? 'Conectando...' : 'Iniciar Controle'}
                    </span>

                    {/* Lâmina Laranja */}
                    <div className="h-1 w-full rounded-full bg-gradient-to-r from-orange-900 via-orange-500 to-orange-900 shadow-[0_0_15px_rgba(255,140,0,0.6)] transition-all duration-300 group-hover:h-1.5 group-hover:via-orange-300 group-hover:shadow-[0_0_25px_rgba(255,165,0,0.8)]"></div>
                </button>
            </CardContent>
        </Card>
    );
}
