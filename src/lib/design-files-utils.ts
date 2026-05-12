const DATE_FOLDER_REGEX = /^(\d{6})_/

/** "240710_샤샤 아르간 오일..." → true, "SSC-0784_(전면라벨)..." → false */
export function isDatePrefixedFolder(name: string): boolean {
  return DATE_FOLDER_REGEX.test(name)
}

export function findLatestVersionFolder(
  items: Array<{ name: string; type: string }>
): { name: string; type: string } | null {
  const dateFolders = items
    .filter((item) => item.type === 'folder' && isDatePrefixedFolder(item.name))
    .sort((a, b) => b.name.localeCompare(a.name, 'ko'))

  return dateFolders[0] ?? null
}

/** Replace YYMMDD prefix with today's date: "240710_...라벨" → "260319_...라벨" */
export function generateVersionFolderName(latestFolderName: string): string {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const dateStr = `${yy}${mm}${dd}`

  return latestFolderName.replace(DATE_FOLDER_REGEX, `${dateStr}_`)
}
