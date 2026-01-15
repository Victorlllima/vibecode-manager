import { Zap } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Função de logout
    async function signOut() {
        "use server";
        const supabase = await createClient();
        await supabase.auth.signOut();
        redirect("/");
    }

    return (
        <div className="min-h-screen">
            {/* ========== HEADER ========== */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800/50">
                {/* Logo */}
                <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <Zap className="w-6 h-6 text-neon-orange" />
                    <span className="text-white font-semibold text-lg">
                        VibeCode Manager
                    </span>
                </Link>

                {/* Botão Sair */}
                <form action={signOut}>
                    <button
                        type="submit"
                        className="btn-neon px-4 py-2 text-sm rounded hover:shadow-neon transition-shadow"
                    >
                        SAIR
                    </button>
                </form>
            </header>

            {/* ========== CONTEÚDO ========== */}
            <main className="px-6 py-8">
                {children}
            </main>
        </div>
    );
}
