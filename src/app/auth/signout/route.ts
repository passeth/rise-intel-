import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function POST(request: Request) {
  const supabase = await createClient()
  
  // Check if we have a user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    await supabase.auth.signOut()
  }
  
  // Revalidate all paths to clear any cached data
  revalidatePath('/', 'layout')
  
  // Get the origin for redirect
  const { origin } = new URL(request.url)
  
  return NextResponse.redirect(`${origin}/login`, {
    status: 302,
  })
}

// Also support GET for direct navigation
export async function GET(request: Request) {
  return POST(request)
}
