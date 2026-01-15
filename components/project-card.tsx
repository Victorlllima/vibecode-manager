"use client";

import Link from "next/link";
import { GitBranch, Calendar, MoreVertical, Trash2, RefreshCw } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface ProjectCardProps {
    project: {
        id: string;
        name: string;
        repo_full_name: string;
        progress: number;
        updated_at: string;
        totalSubtasks: number;
        completedSubtasks: number;
    };
    // Propriedades para compatibilidade com o código anterior, se necessário
    id?: string;
    githubRepo?: string;
    status?: string;
    completionPercentage?: number;
    daysInactive?: number;
    updatedAt?: string;
}

export function ProjectCard({ project, ...props }: ProjectCardProps & any) {
    // Backwards compatibility logic in case the parent component passes props differently
    // The new DashboardPage passes a 'project' object. 
    // If individual props are passed (like in the old version), we map them.
    const data = project || {
        id: props.id,
        name: props.name,
        repo_full_name: props.githubRepo,
        progress: props.completionPercentage,
        updated_at: props.updatedAt,
        totalSubtasks: 0,
        completedSubtasks: 0
    };

    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Fechar menu ao clicar fora
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Formatar data
    const updatedDate = new Date(data.updated_at).toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "short",
    });

    // Verificar se está inativo (mais de 7 dias)
    const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(data.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    const isInactive = daysSinceUpdate > 7;

    // Determinar status
    const statusLabel = data.progress === 100
        ? "COMPLETO"
        : isInactive
            ? "INATIVO"
            : "ATIVO";

    const statusColor = {
        COMPLETO: "text-green-400 bg-green-400/10 border-green-400/30",
        INATIVO: "text-red-400 bg-red-400/10 border-red-400/30",
        ATIVO: "text-neon-orange bg-neon-orange/10 border-neon-orange/30",
    }[statusLabel];

    return (
        <div
            className={`
        relative bg-dark-card/50 rounded-lg border-2 
        ${isInactive ? 'border-red-500/50' : 'border-gray-800 hover:border-neon-orange/50'} 
        transition-all duration-300 hover:shadow-neon group
      `}
        >
            {/* Link para detalhes */}
            <Link href={`/projects/${data.id}`} className="block p-5">
                {/* Nome do Projeto */}
                <h3 className="text-lg font-semibold text-neon-orange mb-2 group-hover:text-neon-orange-light transition-colors">
                    {data.name}
                </h3>

                {/* Repositório */}
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
                    <GitBranch className="w-4 h-4" />
                    <span className="truncate">{data.repo_full_name}</span>
                </div>

                {/* Barra de Progresso */}
                <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-400">Progresso</span>
                        <span className="text-white font-medium">{data.progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-neon-orange to-neon-orange-light rounded-full transition-all duration-500"
                            style={{ width: `${data.progress}%` }}
                        />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        {data.completedSubtasks !== undefined ? `${data.completedSubtasks} de ${data.totalSubtasks} tarefas` : 'Tarefas'}
                    </div>
                </div>

                {/* Footer do Card */}
                <div className="flex items-center justify-between">
                    {/* Data */}
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <Calendar className="w-4 h-4" />
                        <span>{updatedDate}</span>
                    </div>

                    {/* Status Badge */}
                    <span className={`px-2 py-1 text-xs font-medium rounded border ${statusColor}`}>
                        {statusLabel}
                    </span>
                </div>
            </Link>

            {/* Menu de Ações (3 pontinhos) */}
            <div className="absolute top-4 right-4" ref={menuRef}>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        setMenuOpen(!menuOpen);
                    }}
                    className="p-1 text-gray-500 hover:text-white hover:bg-gray-800 rounded transition-colors"
                >
                    <MoreVertical className="w-5 h-5" />
                </button>

                {/* Dropdown Menu */}
                {menuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-dark-card border border-gray-700 rounded-lg shadow-lg z-10"
                        onClick={(e) => e.preventDefault()} // Prevent navigation when clicking menu
                    >
                        <button
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                            onClick={() => {
                                // TODO: Implementar sync
                                setMenuOpen(false);
                            }}
                        >
                            <RefreshCw className="w-4 h-4" />
                            Sincronizar
                        </button>
                        <button
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                            onClick={() => {
                                // TODO: Implementar delete
                                setMenuOpen(false);
                            }}
                        >
                            <Trash2 className="w-4 h-4" />
                            Excluir Projeto
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
