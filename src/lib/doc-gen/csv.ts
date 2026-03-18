const BOM = '\uFEFF'

function escapeField(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function generateCsv(headers: string[], rows: string[][]): Blob {
  const headerLine = headers.map(escapeField).join(',')
  const dataLines = rows.map((row) => row.map(escapeField).join(','))
  const content = [headerLine, ...dataLines].join('\r\n')
  return new Blob([BOM + content], { type: 'text/csv;charset=utf-8' })
}
