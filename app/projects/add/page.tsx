import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserRepositories } from "@/lib/github-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewProjectPage() {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        redirect("/login");
    }

    // O provider_token vem na sessão se configurado corretamente no login
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
                    <Card key={repo.id} className="flex flex-col hover:border-primary/50 transition-colors cursor-pointer transition-all duration-200">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-base truncate" title={repo.name}>
                                    {repo.name}
                                </CardTitle>
                                {repo.private ? (
                                    <Lock className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                    <Unlock className="w-4 h-4 text-muted-foreground" />
                                )}
                            </div>
                            <CardDescription className="text-xs truncate">
                                {repo.full_name}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col justify-end pt-0">
                            <p className="text-sm text-muted-foreground line-clamp-2 my-2 h-[40px]">
                                {repo.description || "Sem descrição"}
                            </p>
                            <Button className="w-full mt-2" variant="secondary">
                                Conectar
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {repos.length === 0 && (
                <div className="text-center py-10 text-muted-foreground flex flex-col items-center">
                    <p className="mb-4">Nenhum repositório encontrado.</p>
                    <Button variant="outline" onClick={() => window.location.reload()}>Recarregar</Button>
                </div>
            )}
        </div>
    );
}
