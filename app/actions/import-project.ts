'use server'

import { createClient } from "@/lib/supabase/server";
import { getGithubClient } from "@/lib/github-service";
import { parseAsbuilt } from "@/lib/asbuilt-parser";
import { redirect } from "next/navigation";

export async function importProject(repoId: number, repoFullName: string, repoUrl: string, repoDescription: string | null) {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !session.provider_token) {
        throw new Error("Usuário não autenticado ou sem token do GitHub");
    }

    const octokit = getGithubClient(session.provider_token);
    const [owner, repo] = repoFullName.split('/');

    // 1. Buscar asbuilt.md no GitHub
    let content = "";
    try {
        // Tenta primeiro em /docs/asbuilt.md (padrão F.R.I.D.A.Y.)
        try {
            const { data } = await octokit.rest.repos.getContent({
                owner,
                repo,
                path: 'docs/asbuilt.md',
            });
            // @ts-ignore - GitHub retorna base64
            content = Buffer.from(data.content, 'base64').toString('utf-8');
        } catch (e) {
            // Fallback para raiz /asbuilt.md
            const { data } = await octokit.rest.repos.getContent({
                owner,
                repo,
                path: 'asbuilt.md',
            });
            // @ts-ignore
            content = Buffer.from(data.content, 'base64').toString('utf-8');
        }
    } catch (error) {
        console.error("asbuilt.md não encontrado");
        throw new Error("Arquivo asbuilt.md não encontrado. Certifique-se que existe em /docs/asbuilt.md ou /asbuilt.md");
    }

    // 2. Parsear o conteúdo
    const parsedData = await parseAsbuilt(content);

    // 3. Salvar no Supabase
    // Criar Projeto
    const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
            user_id: session.user.id,
            name: repo, // Nome inicial = nome do repo
            description: repoDescription,
            github_repo_id: repoId,
            github_repo_full_name: repoFullName,
            github_repo_url: repoUrl,
            status: 'active'
        })
        .select()
        .single();

    if (projectError) throw new Error(`Erro ao criar projeto: ${projectError.message}`);

    // --- LÓGICA DE WEBHOOK ---
    try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL;
        const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

        if (appUrl && webhookSecret) {
            const webhookUrl = `${appUrl}/api/webhooks/github`;

            // Verifica se já existe webhook para esta URL para não duplicar
            const { data: existingHooks } = await octokit.rest.repos.listWebhooks({
                owner,
                repo,
            });

            // @ts-ignore
            const hookExists = existingHooks.find(h => h.config.url === webhookUrl);

            if (!hookExists) {
                await octokit.rest.repos.createWebhook({
                    owner,
                    repo,
                    name: 'web',
                    active: true,
                    events: ['push'],
                    config: {
                        url: webhookUrl,
                        content_type: 'json',
                        secret: webhookSecret,
                        insecure_ssl: '0',
                    },
                });
                console.log(`Webhook criado para ${repoFullName}`);
            }
        }
    } catch (webhookError) {
        console.error("Aviso: Não foi possível criar o webhook automaticamente.", webhookError);
        // Não falha a importação, apenas avisa
    }
    // --- FIM LÓGICA DE WEBHOOK ---

    // Criar Fases e Subtasks
    for (const [index, phase] of parsedData.phases.entries()) {
        const { data: phaseData, error: phaseError } = await supabase
            .from('phases')
            .insert({
                project_id: project.id,
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

    // 4. Redirecionar para o dashboard
    redirect('/dashboard');
}
