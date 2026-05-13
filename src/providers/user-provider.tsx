'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

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

export interface UserData {
  id: string
  email: string
  name: string
  role: AppRole | null
  permissions: Permission[]
}

interface UserContextType {
  user: UserData | null
  isLoading: boolean
  hasPermission: (resource: string, type?: 'view' | 'create' | 'edit' | 'delete') => boolean
  canAccess: (resource: string) => boolean
  canEdit: (resource: string) => boolean
  isAdmin: boolean
  refreshUser: () => Promise<void>
}

interface UserProviderProps {
  children: React.ReactNode
  /** Initial user data from server-side rendering (from getServerUser()) */
  initialUser?: UserData | null
}

const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
  hasPermission: () => false,
  canAccess: () => false,
  canEdit: () => false,
  isAdmin: false,
  refreshUser: async () => {},
})

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

export function UserProvider({ children, initialUser }: UserProviderProps) {
  const [user, setUser] = useState<UserData | null>(initialUser ?? null)
  // Always start with loading false if we have initialUser, otherwise check on mount
  const [isLoading] = useState(false)

  const fetchUserWithRole = useCallback(async (authUser: User | null) => {
    if (!authUser) {
      setUser(null)
      return
    }

    const metadata = authUser.user_metadata || {}
    const basicUser = {
      id: authUser.id,
      email: authUser.email || '',
      name: metadata.name || metadata.full_name || authUser.email?.split('@')[0] || '사용자',
      role: null as AppRole | null,
      permissions: [] as Permission[],
    }

    try {
      const supabase = createClient()
      
      // Fetch role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authUser.id)
        .single()

      if (roleData?.role) {
        // Fetch permissions
        const { data: permissions } = await supabase
          .from('role_permissions' as 'user_roles')
          .select('resource, can_view, can_create, can_edit, can_delete')
          .eq('role', roleData.role) as { data: Permission[] | null }
        
        setUser({
          ...basicUser,
          role: roleData.role as AppRole,
          permissions: permissions || [],
        })
      } else {
        setUser(basicUser)
      }
    } catch (error) {
      console.error('Error fetching user role:', error)
      setUser(basicUser)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    const supabase = createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    await fetchUserWithRole(authUser)
  }, [fetchUserWithRole])

  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'INITIAL_SESSION') {
          // If we already have user from server-side, skip client fetch
          if (initialUser) {
            return
          }
          // No initial user - fetch on client (handles post-login redirect)
          await fetchUserWithRole(session?.user ?? null)
        } else if (event === 'SIGNED_IN') {
          // Skip fetching if we already have initialUser from server-side (post-login redirect)
          // This prevents redundant DB queries after login
          if (!initialUser) {
            await fetchUserWithRole(session?.user ?? null)
          }
        } else if (event === 'TOKEN_REFRESHED') {
          // Always refresh on token refresh
          await fetchUserWithRole(session?.user ?? null)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchUserWithRole, initialUser])

  // Permission check helpers
  const hasPermission = useCallback((resource: string, type: 'view' | 'create' | 'edit' | 'delete' = 'view'): boolean => {
    if (!user) return false
    if (user.role === 'admin') return true // Admin has all permissions
    
    const permission = user.permissions.find(p => p.resource === resource)
    if (!permission) return false
    
    switch (type) {
      case 'view': return permission.can_view
      case 'create': return permission.can_create
      case 'edit': return permission.can_edit
      case 'delete': return permission.can_delete
      default: return false
    }
  }, [user])

  const canAccess = useCallback((resource: string): boolean => {
    return hasPermission(resource, 'view')
  }, [hasPermission])

  const canEdit = useCallback((resource: string): boolean => {
    return hasPermission(resource, 'edit') || hasPermission(resource, 'create')
  }, [hasPermission])

  const isAdmin = user?.role === 'admin'

  return (
    <UserContext.Provider value={{ 
      user, 
      isLoading, 
      hasPermission, 
      canAccess, 
      canEdit, 
      isAdmin,
      refreshUser 
    }}>
      {children}
    </UserContext.Provider>
  )
}
