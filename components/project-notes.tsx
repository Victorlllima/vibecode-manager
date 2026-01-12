"use client"

import { useState } from "react"
import { Trash2, Plus, Loader2, StickyNote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { addNote, deleteNote } from "@/app/actions/notes"
import { useToast } from "@/hooks/use-toast"

interface Note {
    id: string
    content: string
    created_at: string
}

interface ProjectNotesProps {
    projectId: string
    notes: Note[]
}

export function ProjectNotes({ projectId, notes }: ProjectNotesProps) {
    const [newNote, setNewNote] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { toast } = useToast()

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newNote.trim()) return

        setIsSubmitting(true)
        try {
            await addNote(projectId, newNote)
            setNewNote("")
            toast({ description: "Nota adicionada." })
        } catch (error) {
            toast({ variant: "destructive", description: "Erro ao adicionar nota." })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await deleteNote(id, projectId)
            toast({ description: "Nota removida." })
        } catch (error) {
            toast({ variant: "destructive", description: "Erro ao remover nota." })
        }
    }

    return (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm h-[400px] flex flex-col">
            <div className="p-6 pb-2">
                <h3 className="font-semibold flex items-center gap-2">
                    <StickyNote className="w-4 h-4" />
                    Notas Rápidas
                </h3>
            </div>

            <ScrollArea className="flex-1 px-6">
                {notes.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-8 italic opacity-50">
                        Nenhuma nota ainda.
                    </div>
                ) : (
                    <div className="space-y-3 py-2">
                        {notes.map((note) => (
                            <div key={note.id} className="group flex items-start justify-between gap-2 p-3 rounded-md bg-muted/50 text-sm">
                                <p className="whitespace-pre-wrap leading-relaxed">{note.content}</p>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                    onClick={() => handleDelete(note.id)}
                                >
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>

            <div className="p-4 border-t mt-auto">
                <form onSubmit={handleAddNote} className="flex gap-2">
                    <Input
                        placeholder="Nova nota..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        disabled={isSubmitting}
                        className="flex-1"
                    />
                    <Button type="submit" size="icon" disabled={isSubmitting || !newNote.trim()}>
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    </Button>
                </form>
            </div>
        </div>
    )
}
