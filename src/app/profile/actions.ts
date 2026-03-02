'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ProfileData = {
  id: string
  email: string
  name: string
  role: string | null
  department: string | null
}

export async function getProfile(): Promise<ProfileData | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // Get role from user_roles
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  // Get profile from user_profiles
  const { data: profileData } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  const metadata = user.user_metadata || {}

  return {
    id: user.id,
    email: user.email || '',
    name: profileData?.display_name || metadata.name || metadata.full_name || user.email?.split('@')[0] || '',
    role: roleData?.role || null,
    department: null, // department column doesn't exist in user_profiles
  }
}

export async function updatePassword(currentPassword: string, newPassword: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  if (newPassword.length < 6) {
    throw new Error('새 비밀번호는 6자 이상이어야 합니다.')
  }

  // Verify current password by re-authenticating
  // Note: Supabase doesn't have a direct "verify password" API
  // We need to use signInWithPassword to verify
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  })

  if (signInError) {
    throw new Error('현재 비밀번호가 올바르지 않습니다.')
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (updateError) {
    throw new Error(`비밀번호 변경 실패: ${updateError.message}`)
  }

  revalidatePath('/profile')
  return { success: true }
}

export async function updateProfile(name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  if (!name.trim()) {
    throw new Error('이름을 입력해주세요.')
  }

  // Update auth metadata
  const { error: metaError } = await supabase.auth.updateUser({
    data: { name: name.trim() }
  })

  if (metaError) {
    throw new Error(`프로필 수정 실패: ${metaError.message}`)
  }

  // Update user_profiles
  const { error: profileError } = await supabase
    .from('user_profiles')
    .upsert({
      id: user.id,
      display_name: name.trim(),
    })

  if (profileError) {
    console.error('Profile update error:', profileError)
  }

  revalidatePath('/profile')
  return { success: true }
}
