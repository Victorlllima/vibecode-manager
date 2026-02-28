const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export async function getProjects() {
  try {
    const response = await fetch(`${API_URL}/api/projects`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching projects:', error)
    return []
  }
}

export async function getProject(id: string) {
  try {
    const response = await fetch(`${API_URL}/api/projects/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch project: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching project:', error)
    return null
  }
}
