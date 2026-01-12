import { SupabaseClient } from '@supabase/supabase-js';
import { parseAsbuilt } from "@/lib/asbuilt-parser";
import { Octokit } from '@octokit/rest';

export async function syncProjectLogic(
    supabase: SupabaseClient,
    octokit: Octokit,
    projectId: string,
    repoOwner: string,
    repoName: string) {
    // 1. Buscar asbuilt.md atualizado do GitHub
    let content = "";
    try {
        try {
            const { data } = await octokit.rest.repos.getContent({
                owner: repoOwner,
                repo: repoName,
                path: 'docs/asbuilt.md',
            });
            // @ts-ignore
            content = Buffer.from(data.content, 'base64').toString('utf-8');
        } catch (e) {
            const { data } = await octokit.rest.repos.getContent({
                owner: repoOwner,
                repo: repoName,
                path: 'asbuilt.md',
            });
            // @ts-ignore
            content = Buffer.from(data.content, 'base64').toString('utf-8');
        }
    } catch (error) {
        throw new Error("asbuilt.md não encontrado no repositório.");
    }

    // 2. Parsear conteúdo
    const parsedData = await parseAsbuilt(content);

    // 3. Atualizar Banco de Dados (Remove e Recria)
    const { error: deleteError } = await supabase
        .from('phases')
        .delete()
        .eq('project_id', projectId);

    if (deleteError) throw new Error(`Erro ao limpar dados antigos: ${deleteError.message}`);

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
            .single();

        if (phaseError) continue;

        if (phase.subtasks.length > 0) {
            const subtasksToInsert = phase.subtasks.map(t => ({
                phase_id: phaseData.id,
                title: t.title,
                is_completed: t.isCompleted
            }));

            await supabase.from('subtasks').insert(subtasksToInsert);
        }
    }

    // 4. Atualizar timestamp do projeto
    await supabase
        .from('projects')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', projectId);

    return true;
}
