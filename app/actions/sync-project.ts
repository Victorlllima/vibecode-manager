'use server'

import { createClient } from "@/lib/supabase/server"
import { getGithubClient } from "@/lib/github-service"
import { syncProjectLogic } from "@/lib/sync-service"
import { revalidatePath } from "next/cache"

export async function syncProject(projectId: string, repoFullName: string) {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session || !session.provider_token) {
        throw new Error("Sessão inválida.")
    }

    const octokit = getGithubClient(session.provider_token)
    const [owner, repo] = repoFullName.split('/')

    await syncProjectLogic(supabase, octokit, projectId, owner, repo)

    revalidatePath(`/projects/${projectId}`)
    revalidatePath('/dashboard')
}
