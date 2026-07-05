const MAX_DIMENSION = 2000
const JPEG_QUALITY = 0.85

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('decode_failed'))
    }
    img.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('encode_failed'))),
      type,
      quality
    )
  })
}

/** Resize/compress listing photos client-side before upload (max 2000px longest edge). */
export async function compressListingImage(file: File, maxDim = MAX_DIMENSION): Promise<File> {
  const img = await loadImageFromFile(file)
  const { width, height } = img
  if (width <= maxDim && height <= maxDim && file.size <= 800_000) {
    return file
  }

  const scale = Math.min(1, maxDim / Math.max(width, height))
  const targetW = Math.max(1, Math.round(width * scale))
  const targetH = Math.max(1, Math.round(height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(img, 0, 0, targetW, targetH)

  const outputType =
    file.type === 'image/png'
      ? 'image/png'
      : file.type === 'image/webp'
        ? 'image/webp'
        : 'image/jpeg'
  const blob = await canvasToBlob(
    canvas,
    outputType,
    outputType === 'image/png' ? undefined : JPEG_QUALITY
  )

  const ext = outputType === 'image/png' ? 'png' : outputType === 'image/webp' ? 'webp' : 'jpg'
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo'
  return new File([blob], `${baseName}.${ext}`, { type: outputType, lastModified: Date.now() })
}
