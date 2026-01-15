'use client';
import { createClient } from '@/lib/supabase/client';
import { NeonButton } from '@/components/ui/neon-button';

export default function LoginPage() {
    const supabase = createClient();

    const handleLogin = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: { redirectTo: `${location.origin}/auth/callback` },
        });
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4">
            {/* Título com Glow Laranja Sutil */}
            <div className="mb-16 text-center space-y-2">
                <h1 className="text-5xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400 drop-shadow-[0_0_25px_rgba(255,100,0,0.2)]">
                    VibeCode Manager
                </h1>
                <p className="text-zinc-500 uppercase tracking-widest text-sm">
                    Painel de Controle de Projetos
                </p>
            </div>

            {/* Botão Centralizado (Estilo da Imagem) */}
            <div className="w-full max-w-md flex flex-col items-center gap-12">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-orange-900/30 to-transparent" />

                <NeonButton onClick={handleLogin} variant="large">
                    Entrar com GitHub
                </NeonButton>

                <div className="w-full h-px bg-gradient-to-r from-transparent via-orange-900/30 to-transparent" />
            </div>

            {/* Footer Visual (Os ícones circulares da imagem podem ser adicionados depois, vamos focar no botão principal primeiro) */}
        </main>
    );
}
