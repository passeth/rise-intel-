import { redirect } from 'next/navigation'

interface ProductNewRedirectPageProps {
  searchParams: Promise<{ edit?: string | string[] }>
}

export default async function ProductNewRedirectPage({
  searchParams,
}: ProductNewRedirectPageProps) {
  const params = await searchParams
  const edit = Array.isArray(params.edit) ? params.edit[0] : params.edit

  redirect(edit ? `/v2/pif/new?edit=${encodeURIComponent(edit)}` : '/v2/pif/new')
}
