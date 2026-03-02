import jsPDF from 'jspdf'

// Use local font file from public folder
const NANUM_GOTHIC_URL = '/fonts/NanumGothic.ttf'

let fontLoaded = false
let fontData: ArrayBuffer | null = null

export async function loadKoreanFont(doc: jsPDF): Promise<void> {
    if (fontLoaded && fontData) {
        registerFont(doc, fontData)
        return
    }

    try {
        const response = await fetch(NANUM_GOTHIC_URL)
        if (!response.ok) {
            throw new Error(`Failed to load Korean font: ${response.status}`)
        }
        
        fontData = await response.arrayBuffer()
        fontLoaded = true
        registerFont(doc, fontData)
    } catch (error) {
        console.error('Font loading error:', error)
        throw error
    }
}

function registerFont(doc: jsPDF, data: ArrayBuffer): void {
    const base64 = arrayBufferToBase64(data)
    
    // Register for VFS
    doc.addFileToVFS('NanumGothic.ttf', base64)
    
    // Register both normal and bold styles (using same font file)
    // This prevents "Unable to look up font label" errors when fontStyle: 'bold' is used
    doc.addFont('NanumGothic.ttf', 'NanumGothic', 'normal')
    doc.addFont('NanumGothic.ttf', 'NanumGothic', 'bold')
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    const chunkSize = 8192
    let binary = ''
    
    // Process in chunks to avoid call stack issues with large fonts
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length))
        binary += String.fromCharCode.apply(null, Array.from(chunk))
    }
    
    return btoa(binary)
}
