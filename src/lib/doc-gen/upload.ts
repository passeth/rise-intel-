import { createClient } from '@/lib/supabase/client'

export async function uploadDocToStorage(
  blob: Blob,
  filePath: string,
  contentType: string
): Promise<string> {
  const supabase = createClient()

  const { error } = await supabase.storage
    .from('documents')
    .upload(filePath, blob, { contentType, upsert: true })

  if (error) throw new Error(`Upload failed: ${error.message}`)

  const { data } = supabase.storage.from('documents').getPublicUrl(filePath)
  return data.publicUrl
}
