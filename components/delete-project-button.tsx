"use client"

import { useState } from "react"
import { Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { deleteProject } from "@/app/actions/delete-project"
import { useToast } from "@/hooks/use-toast"

interface DeleteProjectButtonProps {
    projectId: string
    repoFullName: string
}

export function DeleteProjectButton({ projectId, repoFullName }: DeleteProjectButtonProps) {
    const [isDeleting, setIsDeleting] = useState(false)
    const { toast } = useToast()

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            await deleteProject(projectId, repoFullName)
            // Redirect acontece na action
        } catch (error) {
            setIsDeleting(false)
            toast({
                variant: "destructive",
                // @ts-ignore
                title: "Erro ao deletar",
                description: "Não foi possível remover o projeto. Tente novamente."
            })
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Desconectar Projeto
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Isso irá remover o projeto "{repoFullName}" do VibeCode Manager e apagar todas as notas e histórico de progresso associados.
                        <br /><br />
                        <strong>O repositório no GitHub e o arquivo asbuilt.md NÃO serão afetados.</strong>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault(); // Impede fechamento automático para mostrar loading
                            handleDelete();
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isDeleting}
                    >
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isDeleting ? "Removendo..." : "Sim, desconectar"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
