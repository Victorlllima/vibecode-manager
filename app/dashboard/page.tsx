import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Meus Projetos</h2>
                    <p className="text-muted-foreground mt-1">
                        Gerencie e acompanhe seus projetos de vibecoding.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/projects/add">
                        <Plus className="mr-2 h-4 w-4" /> Novo Projeto
                    </Link>
                </Button>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-12 flex flex-col items-center justify-center text-center space-y-4 border-dashed">
                <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Plus className="h-6 w-6 text-slate-500" />
                </div>
                <h3 className="text-lg font-semibold">Nenhum projeto encontrado</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                    Comece conectando um repositório GitHub que contenha um arquivo asbuilt.md.
                </p>
                <Button variant="outline" asChild>
                    <Link href="/projects/add">
                        Conectar Repositório
                    </Link>
                </Button>
            </div>
        </div>
    )
}
