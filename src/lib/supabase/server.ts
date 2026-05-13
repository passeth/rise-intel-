import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

// Types matching UserProvider
export type AppRole = 
  | 'admin' 
  | 'monitoring'
  | 'production_manager' 
  | 'materials_manager' 
  | 'manufacturing_team' 
  | 'viewer' 
  | 'pending'

export interface Permission {
  resource: string
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
}

export interface ServerUserData {
  id: string
  email: string
  name: string
  role: AppRole | null
  permissions: Permission[]
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Get current user with role and permissions from server-side
 * Used to pass initial user data to UserProvider to avoid client-side loading delay
 */
export async function getServerUser(): Promise<ServerUserData | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null
  
  // Extract user info from metadata
  const metadata = user.user_metadata || {}
  const basicUser: ServerUserData = {
    id: user.id,
    email: user.email || '',
    name: metadata.name || metadata.full_name || user.email?.split('@')[0] || '사용자',
    role: null,
    permissions: [],
  }

  try {
    // Fetch role from user_roles
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleData?.role) {
      // Fetch permissions from role_permissions
      const { data: permissions } = await supabase
        .from('role_permissions' as 'user_roles')
        .select('resource, can_view, can_create, can_edit, can_delete')
        .eq('role', roleData.role) as { data: Permission[] | null }
      
      return {
        ...basicUser,
        role: roleData.role as AppRole,
        permissions: permissions || [],
      }
    }
  } catch (error) {
    console.error('Error fetching user role/permissions:', error)
  }

  return basicUser
}

/** @deprecated Use getServerUser() instead */
export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null
  
  // user_metadata에서 사용자 정보 추출
  const metadata = user.user_metadata || {}
  
  return {
    id: user.id,
    email: user.email || '',
    name: metadata.name || metadata.full_name || user.email?.split('@')[0] || '사용자',
    role: metadata.role || 'user',
  }
}
