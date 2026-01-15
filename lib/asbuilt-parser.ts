import { remark } from 'remark';
import parse from 'remark-parse';

export interface ParsedSubtask {
    title: string;
    isCompleted: boolean;
}

export interface ParsedPhase {
    title: string;
    status: 'pending' | 'in_progress' | 'paused' | 'blocked' | 'completed';
    subtasks: ParsedSubtask[];
}

export interface ParsedProject {
    phases: ParsedPhase[];
}

export async function parseAsbuilt(markdown: string): Promise<ParsedProject> {
    const processor = remark().use(parse);
    const tree = processor.parse(markdown);

    const phases: ParsedPhase[] = [];
    let currentPhase: ParsedPhase | null = null;

    // Percorre a árvore de sintaxe (AST) simplificada
    // Nota: Estamos fazendo um parser manual sobre o AST para flexibilidade

    // @ts-ignore - Tipagem estrita do unist/remark pode ser complexa, simplificando para o script
    const nodes = tree.children;

    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        // Detectar Fases (Headings nível 3, ex: ### FASE 1: ...)
        if (node.type === 'heading' && node.depth === 3) {
            // @ts-ignore
            const title = node.children[0]?.value || 'Fase sem título';

            // Se tivermos uma fase anterior, salvamos ela (embora já esteja no array ref)
            currentPhase = {
                title: title.replace(/^FASE \d+:\s*/i, ''), // Remove "FASE X: " do título
                status: 'pending', // Default
                subtasks: []
            };
            phases.push(currentPhase);
        }

        // Detectar Status da Fase (Parágrafo logo após heading contendo "**Status:**")
        if (currentPhase && node.type === 'paragraph') {
            // @ts-ignore
            const text = node.children.map(c => c.value).join('');
            if (text.includes('Status:')) {
                if (text.includes('Em Andamento') || text.includes('🚧')) currentPhase.status = 'in_progress';
                else if (text.includes('Completa') || text.includes('✅')) currentPhase.status = 'completed';
                else if (text.includes('Pausada') || text.includes('⏸️')) currentPhase.status = 'paused';
                else if (text.includes('Bloqueada') || text.includes('🚫')) currentPhase.status = 'blocked';
                else currentPhase.status = 'pending';
            }
        }

        // Detectar Subtasks (Listas)
        if (currentPhase && node.type === 'list') {
            // @ts-ignore
            const listItems = node.children;
            // @ts-ignore
            listItems.forEach(item => {
                const checked = item.checked === true; // [x]
                // O texto da tarefa geralmente está no primeiro parágrafo do item da lista
                const paragraph = item.children.find((c: any) => c.type === 'paragraph');
                // @ts-ignore
                const title = paragraph?.children[0]?.value || 'Tarefa sem nome';

                currentPhase?.subtasks.push({
                    title,
                    isCompleted: checked
                });
            });
        }
    }

    return { phases };
}
