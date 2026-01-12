import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySignature } from '@/lib/github-webhook';

// Cliente Admin do Supabase (para escrever logs sem sessão de usuário)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    const body = await req.text();
    const headerPayload = await headers();
    const signature = headerPayload.get('x-hub-signature-256');
    const event = headerPayload.get('x-github-event');

    // 1. Validação de Segurança
    if (!signature) {
        return NextResponse.json({ error: 'No signature' }, { status: 401 });
    }

    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.error('GITHUB_WEBHOOK_SECRET não configurado');
        return NextResponse.json({ error: 'Server config error' }, { status: 500 });
    }

    const isValid = await verifySignature(body, signature, webhookSecret);
    if (!isValid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 2. Processar apenas eventos de push
    if (event !== 'push') {
        return NextResponse.json({ message: 'Event ignored' }, { status: 200 });
    }

    const payload = JSON.parse(body);

    // 3. Logar o evento no Supabase (Tabela github_webhooks_log)
    const { error } = await supabaseAdmin
        .from('github_webhooks_log')
        .insert({
            payload: payload,
            processed: false, // Vamos processar no próximo passo
            created_at: new Date().toISOString()
        });

    if (error) {
        console.error('Erro ao logar webhook:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Webhook received' }, { status: 200 });
}
