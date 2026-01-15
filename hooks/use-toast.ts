// Fallback simples para useToast caso a instalação do Shadcn falhe
"use client"

export function useToast() {
    const toast = ({ title, description, variant }: { title?: string, description?: string, variant?: "default" | "destructive" }) => {
        console.log(`[Toast ${variant || 'default'}]: ${title} - ${description}`)
        // Fallback visual simples
        // alert(`${title || 'Notificação'}: ${description}`)
    }
    return { toast }
}
