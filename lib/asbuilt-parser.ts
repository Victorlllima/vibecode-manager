import { remark } from 'remark';
import parse from 'remark-parse';
import gfm from 'remark-gfm';

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
    const processor = remark().use(parse).use(gfm);
    const tree = processor.parse(markdown);

    const phases: ParsedPhase[] = [];
    let currentPhase: ParsedPhase | null = null;
    let expectingSubtasksList = false; // Flag para indicar que a próxima lista são subtasks

    // Helper para extrair texto de nós recursivamente (incluindo strong, emphasis, etc.)
    const extractText = (node: any): string => {
        if (node.type === 'text') return node.value || '';
        if (node.children) return node.children.map(extractText).join('');
        return '';
    };

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

            // Verificar se é uma fase do roadmap (contém "FASE" ou padrões conhecidos)
            if (title.match(/^FASE \d+:/i)) {
                currentPhase = {
                    title: title.replace(/^FASE \d+:\s*/i, ''), // Remove "FASE X: " do título
                    status: 'pending', // Default
                    subtasks: []
                };
                phases.push(currentPhase);
                expectingSubtasksList = false; // Reset flag ao entrar em nova fase
            }
        }

        // Detectar Status da Fase (Parágrafo contendo "**Status:**")
        if (currentPhase && node.type === 'paragraph') {
            const text = extractText(node);
            if (text.includes('Status:')) {
                if (text.includes('Em Andamento') || text.includes('🚧')) currentPhase.status = 'in_progress';
                else if (text.includes('Completa') || text.includes('✅')) currentPhase.status = 'completed';
                else if (text.includes('Pausada') || text.includes('⏸️')) currentPhase.status = 'paused';
                else if (text.includes('Bloqueada') || text.includes('🚫')) currentPhase.status = 'blocked';
                else currentPhase.status = 'pending';
            }
            // Detectar marcador "**Subtasks:**" - a próxima lista serão as subtasks
            if (text.includes('Subtasks:')) {
                expectingSubtasksList = true;
            }
            // Outros marcadores terminam a seção de subtasks
            else if (text.includes('Notas') || text.includes('Último trabalho') || text.includes('Critério') || text.includes('Próximos')) {
                expectingSubtasksList = false;
            }
        }

        // Detectar Subtasks (Listas) - APENAS se estamos esperando uma lista de subtasks
        if (currentPhase && node.type === 'list' && expectingSubtasksList) {
            // @ts-ignore
            const listItems = node.children;
            // @ts-ignore
            listItems.forEach(item => {
                const checked = item.checked === true; // [x]
                // O texto da tarefa geralmente está no primeiro parágrafo do item da lista
                const paragraph = item.children.find((c: any) => c.type === 'paragraph');
                const title = paragraph ? extractText(paragraph) : 'Tarefa sem nome';

                currentPhase?.subtasks.push({
                    title,
                    isCompleted: checked
                });
            });
            // Após processar a lista de subtasks, desativamos a flag
            expectingSubtasksList = false;
        }
    }

    return { phases };
}
