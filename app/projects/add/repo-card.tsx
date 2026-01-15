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
                    className="w-full mt-2 rounded-full bg-gradient-to-r from-[#B11226] to-[#FF4D5A] px-4 py-2 text-sm font-bold text-white shadow-[0_0_15px_rgba(177,18,38,0.4)] transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,77,90,0.6)] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {loading ? "CONECTANDO..." : "INICIAR CONTROLE"}
                </button>
            </CardContent>
        </Card>
    );
}
