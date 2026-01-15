import Link from 'next/link'
import { FileQuestion, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
    return (
        <div className="flex min-h-[600px] flex-col items-center justify-center space-y-4 text-center">
            <div className="rounded-full bg-muted p-6">
                <FileQuestion className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">Página não encontrada</h1>
                <p className="text-muted-foreground">
                    O recurso que você está procurando não existe ou você não tem permissão para acessá-lo.
                </p>
            </div>
            <Link href="/dashboard">
                <Button variant="default">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para o Dashboard
                </Button>
            </Link>
        </div>
    )
}
