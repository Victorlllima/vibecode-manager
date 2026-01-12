import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-xl">
                    ⚡ VibeCode Manager
                </div>
                <div className="ml-auto flex items-center gap-4">
                    <span className="text-sm text-muted-foreground hidden md:block">
                        {user.user_metadata.user_name || user.email}
                    </span>
                    <form action="/auth/signout" method="post">
                        <Button variant="ghost" size="sm">Sair</Button>
                    </form>
                </div>
            </header>
            <main className="container mx-auto py-8 px-4">
                {children}
            </main>
        </div>
    )
}
