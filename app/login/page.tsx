'use client';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Github } from 'lucide-react';

export default function LoginPage() {
    const supabase = createClient();

    const handleLogin = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: `${location.origin}/auth/callback`,
            },
        });
    };

    return (
        <main className="flex min-h-screen items-center justify-center p-4 bg-background">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">Bem-vindo ao VibeCode</CardTitle>
                    <CardDescription>
                        Faça login para gerenciar seus projetos
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={handleLogin}
                        className="w-full gap-2"
                        size="lg"
                    >
                        <Github className="h-5 w-5" />
                        Entrar com GitHub
                    </Button>
                </CardContent>
            </Card>
        </main>
    );
}
