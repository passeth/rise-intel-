'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useUser } from '@/providers/user-provider'
import { Loader2, Save, ShieldAlert, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import {
  ADMIN_ROLES,
  createManagedUser,
  listManagedUsers,
  updateManagedUserPassword,
  updateManagedUserProfile,
  updateManagedUserRole,
  type AdminRole,
  type ManagedUser,
} from './actions'

const ROLE_LABELS = new Map(ADMIN_ROLES.map((role) => [role.value, role.label]))

function formatDate(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('ko-KR')
}

function roleBadgeClass(role: AdminRole | null) {
  if (role === 'admin') return 'bg-red-50 text-red-700 border-red-200'
  if (role === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200'
  if (!role) return 'bg-slate-50 text-slate-600 border-slate-200'
  return 'bg-emerald-50 text-emerald-700 border-emerald-200'
}

function UserRow({ user }: { user: ManagedUser }) {
  const queryClient = useQueryClient()
  const [displayName, setDisplayName] = useState(user.display_name ?? '')
  const [password, setPassword] = useState('')

  const profileMutation = useMutation({
    mutationFn: updateManagedUserProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managed-users'] })
      toast.success('사용자 이름을 저장했습니다')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const roleMutation = useMutation({
    mutationFn: updateManagedUserRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managed-users'] })
      toast.success('권한을 변경했습니다')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const passwordMutation = useMutation({
    mutationFn: updateManagedUserPassword,
    onSuccess: () => {
      setPassword('')
      toast.success('비밀번호를 변경했습니다')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <TableRow>
      <TableCell className="align-top">
        <div className="font-medium text-[#1A1A1A]">{user.email}</div>
        <div className="mt-1 font-mono text-[11px] text-[#999999]">{user.id}</div>
      </TableCell>
      <TableCell className="align-top">
        <div className="flex items-center gap-2">
          <Input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="h-8 min-w-36 text-xs"
            placeholder="사용자명"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={profileMutation.isPending}
            onClick={() => profileMutation.mutate({ userId: user.id, displayName })}
            title="이름 저장"
          >
            {profileMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </TableCell>
      <TableCell className="align-top">
        <div className="space-y-2">
          <Badge variant="outline" className={roleBadgeClass(user.role)}>
            {user.role ? ROLE_LABELS.get(user.role) ?? user.role : '역할 없음'}
          </Badge>
          <Select
            value={user.role ?? 'pending'}
            onValueChange={(value) =>
              roleMutation.mutate({ userId: user.id, role: value as AdminRole })
            }
            disabled={roleMutation.isPending}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="권한 선택" />
            </SelectTrigger>
            <SelectContent>
              {ADMIN_ROLES.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </TableCell>
      <TableCell className="align-top text-xs text-[#666666]">
        <div>생성: {formatDate(user.created_at)}</div>
        <div className="mt-1">최근 로그인: {formatDate(user.last_sign_in_at)}</div>
      </TableCell>
      <TableCell className="align-top">
        <div className="flex items-center gap-2">
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-8 min-w-40 text-xs"
            placeholder="새 비밀번호"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={password.length < 6 || passwordMutation.isPending}
            onClick={() => passwordMutation.mutate({ userId: user.id, password })}
          >
            {passwordMutation.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
            변경
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

export default function UserManagementPage() {
  const queryClient = useQueryClient()
  const { isAdmin, user } = useUser()
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<AdminRole>('viewer')

  const usersQuery = useQuery({
    queryKey: ['managed-users'],
    queryFn: listManagedUsers,
    enabled: isAdmin,
  })

  const createMutation = useMutation({
    mutationFn: createManagedUser,
    onSuccess: () => {
      setEmail('')
      setDisplayName('')
      setPassword('')
      setRole('viewer')
      queryClient.invalidateQueries({ queryKey: ['managed-users'] })
      toast.success('사용자를 생성했습니다')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const handleCreate = () => {
    createMutation.mutate({ email, password, displayName, role })
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-3 py-8 text-amber-800">
            <ShieldAlert className="h-5 w-5" />
            <div>
              <div className="font-medium">관리자 권한이 필요합니다.</div>
              <div className="mt-1 text-sm">현재 사용자: {user?.email ?? '로그인 정보 없음'}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const users = usersQuery.data?.users ?? []

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#1A1A1A] px-2 py-0.5 text-[10px] font-semibold tracking-wider text-white">
            ADMIN
          </span>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">사용자 관리</h1>
        </div>
        <p className="mt-1 text-sm text-[#999999]">
          로그인 아이디 생성, 권한 레벨 설정, 비밀번호 수정을 관리합니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4" /> 새 사용자 생성
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.2fr_1fr_1fr_180px_auto] md:items-end">
            <label className="space-y-1 text-xs">
              <span className="text-[#666666]">아이디(이메일)</span>
              <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="user@example.com" />
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-[#666666]">사용자명</span>
              <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="홍길동" />
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-[#666666]">초기 비밀번호</span>
              <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="6자 이상" />
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-[#666666]">권한 레벨</span>
              <Select value={role} onValueChange={(value) => setRole(value as AdminRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_ROLES.map((roleOption) => (
                    <SelectItem key={roleOption.value} value={roleOption.value}>
                      {roleOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !email || password.length < 6}
              className="bg-[#1A1A1A] text-white hover:bg-[#333333]"
            >
              {createMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              생성
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">사용자 목록 ({users.length.toLocaleString()})</CardTitle>
        </CardHeader>
        <CardContent>
          {usersQuery.isLoading ? (
            <div className="flex justify-center py-16 text-[#999999]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : usersQuery.error ? (
            <div className="py-12 text-center text-sm text-red-600">
              {usersQuery.error instanceof Error ? usersQuery.error.message : '사용자 목록 조회 실패'}
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#999999]">등록된 사용자가 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>아이디</TableHead>
                    <TableHead>사용자명</TableHead>
                    <TableHead>권한 레벨</TableHead>
                    <TableHead>접속 정보</TableHead>
                    <TableHead>비밀번호 수정</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((managedUser) => (
                    <UserRow key={managedUser.id} user={managedUser} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
