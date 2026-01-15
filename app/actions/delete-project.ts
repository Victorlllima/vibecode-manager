'use server'

import { createClient } from "@/lib/supabase/server"
import { getGithubClient } from "@/lib/github-service"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function deleteProject(projectId: string, repoFullName: string) {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) throw new Error("Unauthorized")

    // 1. Tentar remover webhook do GitHub (Best effort)
    try {
        if (session.provider_token) {
            const octokit = getGithubClient(session.provider_token)
            const [owner, repo] = repoFullName.split('/')
            const appUrl = process.env.NEXT_PUBLIC_APP_URL

            if (appUrl) {
                // Busca webhooks para encontrar o nosso
                const { data: hooks } = await octokit.rest.repos.listWebhooks({ owner, repo })
                const hook = hooks.find(h => h.config.url?.startsWith(appUrl))

                if (hook) {
                    await octokit.rest.repos.deleteWebhook({ owner, repo, hook_id: hook.id })
                }
            }
        }
    } catch (error) {
        console.error("Aviso: Erro ao remover webhook (ignorado):", error)
        // Não impedimos o delete se falhar o webhook
    }

    // 2. Remover do Supabase (Cascade apaga phases, subtasks, notes, logs)
    const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', session.user.id) // Segurança extra: garante ownership

    if (error) throw new Error(error.message)

    revalidatePath('/dashboard')
    redirect('/dashboard')
}
