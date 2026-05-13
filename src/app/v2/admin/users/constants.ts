import type { Database } from '@/types/supabase'

export type AdminRole = Database['public']['Enums']['app_role']

export const ADMIN_ROLES: { value: AdminRole; label: string }[] = [
  { value: 'admin', label: '관리자' },
  { value: 'production_manager', label: '생산매니저' },
  { value: 'materials_manager', label: '자재관리' },
  { value: 'manufacturing_team', label: '제조팀' },
  { value: 'monitoring', label: '모니터링' },
  { value: 'viewer', label: '뷰어' },
  { value: 'pending', label: '승인대기' },
]
