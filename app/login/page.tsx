'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Github } from 'lucide-react'
import { useState } from 'react'

export default function LoginPage() {
    const [loading, setLoading] = useState(false)

    const handleLogin = async () => {
        setLoading(true)
        const supabase = createClient()

        // Pega a URL atual para redirecionar corretamente
        const origin = window.location.origin

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: `${origin}/auth/callback`,
            },
        })

        if (error) {
            console.error(error)
            alert('Erro ao fazer login: ' + error.message)
            setLoading(false)
        }
        // Se não der erro, o navegador será redirecionado para o GitHub
    }

    return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
            <Card className="w-full max-w-md mx-4 shadow-lg">
                <CardHeader className="text-center space-y-2">
                    <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        VibeCode Manager
                    </CardTitle>
                    <CardDescription className="text-base">
                        Sincronize e gerencie seus projetos automaticamente via GitHub
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <Button
                        className="w-full flex gap-2 h-12 text-base font-medium"
                        size="lg"
                        onClick={handleLogin}
                        disabled={loading}
                    >
                        <Github className="h-5 w-5" />
                        {loading ? 'Conectando...' : 'Entrar com GitHub'}
                    </Button>
                    <p className="mt-4 text-xs text-center text-muted-foreground">
                        Ao entrar, você concorda com o acesso aos seus repositórios públicos e privados para leitura de asbuilt.md.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
