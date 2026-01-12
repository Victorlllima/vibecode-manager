'use server'

import { createClient } from "@/lib/supabase/server"
import { getGithubClient } from "@/lib/github-service"
import { parseAsbuilt } from "@/lib/asbuilt-parser"
import { revalidatePath } from "next/cache"

export async function syncProject(projectId: string, repoFullName: string) {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session || !session.provider_token) {
        throw new Error("Sessão inválida ou token do GitHub expirado.")
    }

    const octokit = getGithubClient(session.provider_token)
    const [owner, repo] = repoFullName.split('/')

    // 1. Buscar asbuilt.md atualizado (Tenta /docs/asbuilt.md primeiro, depois /asbuilt.md)
    let content = "";
    try {
        try {
            const { data } = await octokit.rest.repos.getContent({
                owner,
                repo,
                path: 'docs/asbuilt.md',
            });
            // @ts-ignore
            content = Buffer.from(data.content, 'base64').toString('utf-8');
        } catch (e) {
            const { data } = await octokit.rest.repos.getContent({
                owner,
                repo,
                path: 'asbuilt.md',
            });
            // @ts-ignore
            content = Buffer.from(data.content, 'base64').toString('utf-8');
        }
    } catch (error) {
        throw new Error("asbuilt.md não encontrado no repositório.")
    }

    // 2. Parsear conteúdo
    const parsedData = await parseAsbuilt(content)

    // 3. Atualizar Banco de Dados (Transação Simulada)
    // Remove fases antigas (Cascade deletará subtasks automaticamente)
    const { error: deleteError } = await supabase
        .from('phases')
        .delete()
        .eq('project_id', projectId)

    if (deleteError) throw new Error(`Erro ao limpar dados antigos: ${deleteError.message}`)

    // Insere novas fases e subtasks
    for (const [index, phase] of parsedData.phases.entries()) {
        const { data: phaseData, error: phaseError } = await supabase
            .from('phases')
            .insert({
                project_id: projectId,
                title: phase.title,
                order_index: index,
                status: phase.status,
                subtasks_total: phase.subtasks.length,
                subtasks_completed: phase.subtasks.filter(t => t.isCompleted).length,
                completion_percentage: phase.subtasks.length > 0
                    ? Math.round((phase.subtasks.filter(t => t.isCompleted).length / phase.subtasks.length) * 100)
                    : 0
            })
            .select()
            .single()

        if (phaseError) continue

        if (phase.subtasks.length > 0) {
            const subtasksToInsert = phase.subtasks.map(t => ({
                phase_id: phaseData.id,
                title: t.title,
                is_completed: t.isCompleted
            }))

            await supabase.from('subtasks').insert(subtasksToInsert)
        }
    }

    // Atualiza timestamp do projeto
    await supabase
        .from('projects')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', projectId)

    revalidatePath(`/projects/${projectId}`)
    revalidatePath('/dashboard')
}
