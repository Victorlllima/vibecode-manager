import Link from "next/link"
import { CalendarDays, Github, MoreVertical } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface ProjectCardProps {
    id: string
    name: string
    description?: string | null
    githubRepo: string // owner/repo
    status: "active" | "archived"
    completionPercentage: number
    daysInactive: number
    updatedAt: string
}

export function ProjectCard({
    id,
    name,
    description,
    githubRepo,
    status,
    completionPercentage,
    daysInactive,
    updatedAt,
}: ProjectCardProps) {
    // Formata a data
    const formattedDate = new Date(updatedAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short'
    })

    // Define cor do status de inatividade
    const isStale = daysInactive > 7

    return (
        <Card className={`flex flex-col h-full transition-all hover:border-primary/50 ${isStale ? "border-l-4 border-l-destructive" : ""}`}>
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <CardTitle className="text-xl font-bold truncate">
                            <Link href={`/projects/${id}`} className="hover:underline decoration-primary underline-offset-4">
                                {name}
                            </Link>
                        </CardTitle>
                        <div className="flex items-center text-xs text-muted-foreground">
                            <Github className="w-3 h-3 mr-1" />
                            <span className="truncate max-w-[150px]">{githubRepo}</span>
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Menu</span>
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                                <Link href={`/projects/${id}`}>Ver Detalhes</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>Sincronizar Agora</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>

            <CardContent className="flex-1 pb-3">
                {description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-[40px]">
                        {description}
                    </p>
                )}

                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                        <span>Progresso</span>
                        <span>{completionPercentage}%</span>
                    </div>
                    <Progress value={completionPercentage} className="h-2" />
                </div>
            </CardContent>

            <CardFooter className="pt-3 border-t bg-muted/20 text-xs text-muted-foreground flex justify-between">
                <div className="flex items-center" title="Última atualização">
                    <CalendarDays className="w-3 h-3 mr-1" />
                    {formattedDate}
                </div>

                <div className="flex gap-2">
                    {daysInactive > 7 && (
                        <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
                            {daysInactive} dias inativo
                        </Badge>
                    )}
                    <Badge variant={status === "active" ? "default" : "secondary"} className="text-[10px] h-5 px-1.5 uppercase">
                        {status === "active" ? "Ativo" : "Arquivado"}
                    </Badge>
                </div>
            </CardFooter>
        </Card>
    )
}
