import { supabase } from './supabase'
import { uid } from './archive'

export const STORAGE_BUCKET = 'acq-files'

const cleanName = value => String(value || 'file')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9._-]+/g, '-')
  .replace(/-+/g, '-')
  .toLowerCase()

export async function uploadCloudFile(file, folder = 'uploads') {
  if (!file) throw new Error('FILE MANCANTE')
  const path = `${folder}/${Date.now()}-${uid()}-${cleanName(file.name)}`
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  })
  if (error) throw error
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return {
    storagePath: path,
    url: data.publicUrl,
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size || 0,
  }
}

export async function removeCloudFile(path) {
  if (!path) return
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path])
  if (error) throw error
}
