"use client"

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface Subtask {
    id: string
    title: string
    is_completed: boolean
}

interface Phase {
    id: string
    title: string
    status: string
    completion_percentage: number
    subtasks: Subtask[]
}

interface RoadmapViewProps {
    phases: Phase[]
}

const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: "Aguardando", color: "bg-slate-500" },
    in_progress: { label: "Em Andamento", color: "bg-blue-500" },
    paused: { label: "Pausada", color: "bg-yellow-500" },
    blocked: { label: "Bloqueada", color: "bg-red-500" },
    completed: { label: "Completa", color: "bg-green-500" },
}

export function RoadmapView({ phases }: RoadmapViewProps) {
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Roadmap de Implementação</h2>
            <Accordion type="single" collapsible className="w-full space-y-4">
                {phases.map((phase, index) => (
                    <AccordionItem
                        key={phase.id}
                        value={phase.id}
                        className="border rounded-lg px-4 bg-card"
                    >
                        <AccordionTrigger className="hover:no-underline py-4">
                            <div className="flex flex-col sm:flex-row sm:items-center w-full gap-4 pr-4">
                                <div className="flex items-center gap-2 min-w-[150px]">
                                    <span className="text-muted-foreground font-mono text-sm">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <span className="font-semibold text-left">{phase.title}</span>
                                </div>

                                <div className="flex items-center gap-4 flex-1 w-full sm:w-auto">
                                    <Progress value={phase.completion_percentage} className="h-2 w-24 hidden sm:block" />
                                    <Badge variant="outline" className={cn("ml-auto sm:ml-0", statusMap[phase.status]?.color, "text-white border-none")}>
                                        {statusMap[phase.status]?.label || phase.status}
                                    </Badge>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-4">
                            <div className="space-y-3 pl-2 sm:pl-8">
                                {phase.subtasks.map((subtask) => (
                                    <div key={subtask.id} className="flex items-start space-x-3">
                                        <Checkbox
                                            id={subtask.id}
                                            checked={subtask.is_completed}
                                            disabled // Read-only por enquanto
                                        />
                                        <label
                                            htmlFor={subtask.id}
                                            className={cn(
                                                "text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                                                subtask.is_completed && "line-through text-muted-foreground"
                                            )}
                                        >
                                            {subtask.title}
                                        </label>
                                    </div>
                                ))}
                                {phase.subtasks.length === 0 && (
                                    <p className="text-sm text-muted-foreground italic">Nenhuma tarefa nesta fase.</p>
                                )}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    )
}
