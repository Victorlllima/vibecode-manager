import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySignature } from '@/lib/github-webhook';
import { syncProjectLogic } from '@/lib/sync-service';
import { Octokit } from '@octokit/rest';

// Cliente Admin (Service Role)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    const body = await req.text();
    const headerPayload = await headers();
    const signature = headerPayload.get('x-hub-signature-256');
    const event = headerPayload.get('x-github-event');

    if (!signature) return NextResponse.json({ error: 'No signature' }, { status: 401 });

    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!webhookSecret) return NextResponse.json({ error: 'Config error' }, { status: 500 });

    const isValid = await verifySignature(body, signature, webhookSecret);
    if (!isValid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

    if (event !== 'push') return NextResponse.json({ message: 'Event ignored' }, { status: 200 });

    const payload = JSON.parse(body);
    const repoId = payload.repository.id;
    const repoFullName = payload.repository.full_name; // "owner/repo"
    const [owner, repoName] = repoFullName.split('/');

    // 1. Encontrar o projeto no Supabase
    const { data: project } = await supabaseAdmin
        .from('projects')
        .select('id, user_id')
        .eq('github_repo_id', repoId)
        .single();

    if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // 2. Tentar recuperar o Token do Usuário via auth.identities
    // Nota: Isso acessa tabela interna do sistema de Auth
    const { data: identityData, error: identityError } = await supabaseAdmin
        .from('auth.identities') // Sintaxe especial para acessar schema auth, requer permissão do service role
        .select('identity_data')
        .eq('user_id', project.user_id)
        // .eq('provider', 'github') // Removido filtro de provider pois o identityData já contém o token
        // Ajuste: auth.identities tem provider como coluna, mas a chave composta é provider+id
        .eq('provider', 'github')
        .single();

    let octokit;

    if (identityData?.identity_data?.provider_token) {
        // Temos o token do usuário! Podemos acessar repos privados
        octokit = new Octokit({ auth: identityData.identity_data.provider_token });
    } else {
        // Fallback: Tenta acessar como público (sem auth)
        console.warn(`Token não encontrado para user ${project.user_id}, tentando acesso público.`);
        octokit = new Octokit();
    }

    try {
        // 3. Executar Lógica de Sync
        await syncProjectLogic(supabaseAdmin, octokit, project.id, owner, repoName);

        // Log sucesso
        await supabaseAdmin.from('github_webhooks_log').insert({
            payload: { repository: repoFullName, pusher: payload.pusher },
            processed: true,
            created_at: new Date().toISOString()
        });

        return NextResponse.json({ message: 'Sync successful' }, { status: 200 });

    } catch (error: any) {
        console.error("Erro no processamento do webhook:", error);

        // Log erro
        await supabaseAdmin.from('github_webhooks_log').insert({
            payload: { repository: repoFullName, error: error.message },
            processed: false,
            error_message: error.message,
            created_at: new Date().toISOString()
        });

        return NextResponse.json({ error: 'Sync failed', details: error.message }, { status: 500 });
    }
}
