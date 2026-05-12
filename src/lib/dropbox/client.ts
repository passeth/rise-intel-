import { Dropbox } from 'dropbox'

/**
 * Dropbox 클라이언트 (OAuth Refresh Token + Team Namespace)
 *
 * 팀 공유 워크스페이스에 접근하려면 pathRoot를 팀 root namespace ID로 설정해야 합니다.
 * 개인 네임스페이스로만 접근하면 팀 공유 폴더를 찾을 수 없습니다.
 *
 * 환경변수:
 *   DROPBOX_APP_KEY          — Dropbox OAuth App Key
 *   DROPBOX_APP_SECRET       — Dropbox OAuth App Secret
 *   DROPBOX_REFRESH_TOKEN    — Offline refresh token (영구 유효)
 *   DROPBOX_ROOT_NAMESPACE_ID — 팀 root namespace ID (Dropbox Business)
 *   DROPBOX_BASE_FOLDER      — 기본 폴더 경로 (예: /RISE/100_DESIGN DATA)
 */

let _client: Dropbox | null = null

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`환경변수 ${name}이(가) 설정되지 않았습니다.`)
  }
  return value
}

export function getDropboxClient(): Dropbox {
  if (_client) return _client

  const appKey = getRequiredEnv('DROPBOX_APP_KEY')
  const appSecret = getRequiredEnv('DROPBOX_APP_SECRET')
  const refreshToken = getRequiredEnv('DROPBOX_REFRESH_TOKEN')
  const rootNamespaceId = process.env.DROPBOX_ROOT_NAMESPACE_ID

  const options: ConstructorParameters<typeof Dropbox>[0] = {
    clientId: appKey,
    clientSecret: appSecret,
    refreshToken,
  }

  // 팀 root namespace ID가 설정된 경우, pathRoot를 설정하여 팀 공유 워크스페이스에 접근
  if (rootNamespaceId) {
    options.pathRoot = JSON.stringify({
      '.tag': 'root',
      root: rootNamespaceId,
    })
  }

  _client = new Dropbox(options)
  return _client
}

export function getBaseFolder(): string {
  const base = getRequiredEnv('DROPBOX_BASE_FOLDER')
  return base.startsWith('/') ? base.replace(/\/+$/, '') : `/${base}`.replace(/\/+$/, '')
}

export function joinDropboxPath(...segments: string[]): string {
  const joined = segments
    .filter(Boolean)
    .map((s) => s.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/')
  return `/${joined}`
}

export function resetDropboxClient(): void {
  _client = null
}
