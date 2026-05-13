'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'
import type { AdminRole } from './constants'

export interface ManagedUser {
  id: string
  email: string
  display_name: string | null
  role: AdminRole | null
  created_at: string | null
  last_sign_in_at: string | null
}

export interface ManagedUsersResult {
  users: ManagedUser[]
}

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase admin 환경변수가 설정되지 않았습니다.')
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  const { data: roleData, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    throw new Error(`권한 확인 실패: ${error.message}`)
  }

  if (roleData?.role !== 'admin') {
    throw new Error('관리자 권한이 필요합니다.')
  }

  return user
}

function normalizePassword(password: string) {
  const trimmed = password.trim()
  if (trimmed.length < 6) {
    throw new Error('비밀번호는 6자 이상이어야 합니다.')
  }
  return trimmed
}

function normalizeEmail(email: string) {
  const trimmed = email.trim().toLowerCase()
  if (!trimmed.includes('@')) {
    throw new Error('올바른 이메일 아이디를 입력해주세요.')
  }
  return trimmed
}

function normalizeName(name: string) {
  const trimmed = name.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function listManagedUsers(): Promise<ManagedUsersResult> {
  await assertAdmin()
  const admin = createAdminClient()

  const { data: authData, error: authError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (authError) {
    throw new Error(`사용자 목록 조회 실패: ${authError.message}`)
  }

  const ids = authData.users.map((user) => user.id)
  const [profilesResult, rolesResult] = await Promise.all([
    ids.length > 0
      ? admin.from('user_profiles').select('id, display_name, email').in('id', ids)
      : Promise.resolve({ data: [], error: null }),
    ids.length > 0
      ? admin.from('user_roles').select('user_id, role').in('user_id', ids)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (profilesResult.error) {
    throw new Error(`프로필 조회 실패: ${profilesResult.error.message}`)
  }
  if (rolesResult.error) {
    throw new Error(`권한 조회 실패: ${rolesResult.error.message}`)
  }

  const profileMap = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]))
  const roleMap = new Map((rolesResult.data ?? []).map((role) => [role.user_id, role.role]))

  const users = authData.users
    .map((user) => {
      const profile = profileMap.get(user.id)
      const metadata = user.user_metadata ?? {}
      return {
        id: user.id,
        email: user.email ?? profile?.email ?? '',
        display_name:
          profile?.display_name ??
          (typeof metadata.name === 'string' ? metadata.name : null) ??
          (typeof metadata.full_name === 'string' ? metadata.full_name : null),
        role: roleMap.get(user.id) ?? null,
        created_at: user.created_at ?? null,
        last_sign_in_at: user.last_sign_in_at ?? null,
      }
    })
    .sort((a, b) => a.email.localeCompare(b.email))

  return { users }
}

export async function createManagedUser(input: {
  email: string
  password: string
  displayName: string
  role: AdminRole
}): Promise<{ success: boolean; userId: string }> {
  await assertAdmin()
  const admin = createAdminClient()
  const email = normalizeEmail(input.email)
  const password = normalizePassword(input.password)
  const displayName = normalizeName(input.displayName)

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name: displayName ?? email.split('@')[0],
      role: input.role,
    },
  })

  if (error || !data.user) {
    throw new Error(`사용자 생성 실패: ${error?.message ?? 'Unknown error'}`)
  }

  const userId = data.user.id

  const { error: profileError } = await admin.from('user_profiles').upsert({
    id: userId,
    email,
    display_name: displayName,
    updated_at: new Date().toISOString(),
  })

  if (profileError) {
    throw new Error(`프로필 생성 실패: ${profileError.message}`)
  }

  const { error: roleError } = await admin.from('user_roles').upsert({
    user_id: userId,
    role: input.role,
  })

  if (roleError) {
    throw new Error(`권한 설정 실패: ${roleError.message}`)
  }

  return { success: true, userId }
}

export async function updateManagedUserRole(input: {
  userId: string
  role: AdminRole
}): Promise<{ success: boolean }> {
  await assertAdmin()
  const admin = createAdminClient()

  const { error } = await admin.from('user_roles').upsert({
    user_id: input.userId,
    role: input.role,
  })

  if (error) {
    throw new Error(`권한 변경 실패: ${error.message}`)
  }

  const { error: metadataError } = await admin.auth.admin.updateUserById(input.userId, {
    user_metadata: { role: input.role },
  })

  if (metadataError) {
    throw new Error(`사용자 메타데이터 변경 실패: ${metadataError.message}`)
  }

  return { success: true }
}

export async function updateManagedUserPassword(input: {
  userId: string
  password: string
}): Promise<{ success: boolean }> {
  await assertAdmin()
  const admin = createAdminClient()
  const password = normalizePassword(input.password)

  const { error } = await admin.auth.admin.updateUserById(input.userId, { password })

  if (error) {
    throw new Error(`비밀번호 변경 실패: ${error.message}`)
  }

  return { success: true }
}

export async function updateManagedUserProfile(input: {
  userId: string
  displayName: string
}): Promise<{ success: boolean }> {
  await assertAdmin()
  const admin = createAdminClient()
  const displayName = normalizeName(input.displayName)

  const { error: profileError } = await admin.from('user_profiles').upsert({
    id: input.userId,
    display_name: displayName,
    updated_at: new Date().toISOString(),
  })

  if (profileError) {
    throw new Error(`프로필 변경 실패: ${profileError.message}`)
  }

  const { error: metadataError } = await admin.auth.admin.updateUserById(input.userId, {
    user_metadata: { name: displayName },
  })

  if (metadataError) {
    throw new Error(`사용자 메타데이터 변경 실패: ${metadataError.message}`)
  }

  return { success: true }
}
