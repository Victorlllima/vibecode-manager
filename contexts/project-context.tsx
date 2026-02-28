'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export type Project = {
  id: number
  name: string
  description: string
  path: string
  status: string
  priority: number
  github_url: string
  last_activity: string
  created_at: string
}

type ProjectContextType = {
  projects: Project[]
  selectedProject: Project | null
  selectedProjectId: number | null
  setSelectedProjectId: (id: number | null) => void
  isLoading: boolean
  refetch: () => void
}

const ProjectContext = createContext<ProjectContextType>({
  projects: [],
  selectedProject: null,
  selectedProjectId: null,
  setSelectedProjectId: () => {},
  isLoading: true,
  refetch: () => {},
})

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { status } = useSession()
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)

  const { data: projects = [], isLoading, refetch } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => fetch(`${API}/api/projects`).then(r => r.json()),
    refetchInterval: 30_000,
    enabled: status === 'authenticated',
  })

  // Auto-select first project
  useEffect(() => {
    if (projects.length > 0 && selectedProjectId === null) {
      // Try to restore from localStorage
      try {
        const stored = localStorage.getItem('rvm-selected-project')
        if (stored) {
          const id = parseInt(stored)
          if (projects.some(p => p.id === id)) {
            setSelectedProjectId(id)
            return
          }
        }
      } catch {}
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId])

  // Persist selection
  const handleSetProject = useCallback((id: number | null) => {
    setSelectedProjectId(id)
    if (id !== null) {
      try { localStorage.setItem('rvm-selected-project', String(id)) } catch {}
    }
  }, [])

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null

  return (
    <ProjectContext.Provider value={{
      projects,
      selectedProject,
      selectedProjectId,
      setSelectedProjectId: handleSetProject,
      isLoading,
      refetch,
    }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  return useContext(ProjectContext)
}
