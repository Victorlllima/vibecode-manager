"use client";

import Link from "next/link";
import { GitBranch, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

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
}

export function ProjectCard({ project }: ProjectCardProps) {
    // Formatar data
    const updatedDate = new Date(project.updated_at).toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "short",
    });

    // Verificar se está inativo (mais de 7 dias)
    const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(project.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    const isInactive = daysSinceUpdate > 7;

    return (
        <Link href={`/projects/${project.id}`}>
            <Card className="hover:bg-accent/50 transition-colors h-full flex flex-col justify-between">
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-base truncate" title={project.name}>
                            {project.name}
                        </CardTitle>
                        {project.progress === 100 ? (
                            <Badge variant="default" className="bg-green-600 hover:bg-green-700">Completo</Badge>
                        ) : isInactive ? (
                            <Badge variant="destructive">Inativo</Badge>
                        ) : (
                            <Badge variant="secondary">Ativo</Badge>
                        )}
                    </div>
                    <CardDescription className="flex items-center gap-1 text-xs">
                        <GitBranch className="h-3 w-3" />
                        {project.repo_full_name}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Progresso</span>
                            <span>{project.progress}%</span>
                        </div>
                        <Progress value={project.progress} className="h-2" />
                        <div className="flex justify-between items-center mt-4 text-xs text-muted-foreground">
                            <span>{project.completedSubtasks}/{project.totalSubtasks} tarefas</span>
                            <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{updatedDate}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
