"use client"

import { useState } from "react"
import { RefreshCw, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { syncProject } from "@/app/actions/sync-project"
import { useToast } from "@/hooks/use-toast"

interface SyncButtonProps {
    projectId: string
    repoFullName: string
}

export function SyncButton({ projectId, repoFullName }: SyncButtonProps) {
    const [isLoading, setIsLoading] = useState(false)
    const { toast } = useToast()

    const handleSync = async () => {
        setIsLoading(true)
        try {
            await syncProject(projectId, repoFullName)
            toast({
                title: "Sincronizado!",
                description: "O roadmap foi atualizado com sucesso."
            })
        } catch (error: any) {
            toast({
                variant: "destructive",
                // @ts-ignore
                title: "Erro na sincronização",
                description: error.message || "Não foi possível ler o asbuilt.md do GitHub."
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Button
            variant="outline"
            className="w-full justify-start mb-2"
            onClick={handleSync}
            disabled={isLoading}
        >
            {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {isLoading ? "Sincronizando..." : "Sincronizar Agora"}
        </Button>
    )
}
