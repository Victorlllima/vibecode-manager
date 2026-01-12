'use client' // Error components must be Client Components

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Aqui você poderia logar o erro em um serviço como Sentry
        console.error(error)
    }, [error])

    return (
        <div className="flex min-h-[600px] flex-col items-center justify-center p-4">
            <Card className="w-full max-w-md border-destructive/50 bg-destructive/5">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                    </div>
                    <CardTitle className="text-xl font-bold text-destructive">Algo deu errado!</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-sm text-muted-foreground">
                    <p>Encontramos um erro inesperado ao processar sua solicitação.</p>
                    <p className="mt-2 font-mono text-xs opacity-70">{error.message || "Erro desconhecido"}</p>
                </CardContent>
                <CardFooter className="flex justify-center pb-6">
                    <Button onClick={() => reset()} variant="outline" className="border-destructive/30 hover:bg-destructive/10">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Tentar Novamente
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
