import { redirect } from 'next/navigation'

export default function HomePage() {
  redirect('/login')
}

// This page should not render - the redirect above should handle it
// If you're seeing this, the redirect() function was called
