'use client';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Github } from 'lucide-react';

export default function LoginPage() {
  const supabase = createClient();

  const handleLogin = async () => {
    // Pega a URL atual do navegador (localhost ou produção)
    const origin = window.location.origin;
    
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        // FORÇA o redirecionamento para a origem atual
        redirectTo: `${origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md border-zinc-800 bg-black text-white shadow-[0_0_40px_-10px_rgba(255,255,255,0.1)]">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold tracking-tight text-white">
            VibeCode Manager
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Faça login para gerenciar seus projetos
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="text-center text-sm text-zinc-500">
            Sincronize e gerencie seus projetos automaticamente via GitHub
          </div>
          
          {/* BOTÃO SAGE: Fundo Branco, Texto Preto, Hover Cinza */}
          <Button 
            onClick={handleLogin}
            className="w-full bg-white text-black hover:bg-zinc-200 h-12 text-base font-medium rounded-md transition-all"
          >
            <Github className="mr-2 h-5 w-5" />
            Entrar com GitHub
          </Button>

          <p className="px-8 text-center text-xs text-zinc-600">
            Ao entrar, você concorda com o acesso aos seus repositórios para leitura de asbuilt.md.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
