'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function addNote(projectId: string, content: string) {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) throw new Error("Unauthorized")

    const { error } = await supabase
        .from("notes")
        .insert({
            project_id: projectId,
            content,
        })

    if (error) throw new Error(error.message)

    revalidatePath(`/projects/${projectId}`)
}

export async function deleteNote(noteId: string, projectId: string) {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) throw new Error("Unauthorized")

    const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", noteId)

    // Nota: RLS já garante que só o dono pode deletar
    if (error) throw new Error(error.message)

    revalidatePath(`/projects/${projectId}`)
}
