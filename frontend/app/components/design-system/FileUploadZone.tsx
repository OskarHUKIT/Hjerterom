'use client'

import { useCallback, useState } from 'react'
import { Upload } from 'lucide-react'

type FileUploadZoneProps = {
  title: string
  hint: string
  accept?: string
  multiple?: boolean
  onFiles: (files: File[]) => void
  className?: string
}

/** Drag-drop upload zone (NPD-5 #18). */
export default function FileUploadZone({
  title,
  hint,
  accept,
  multiple = true,
  onFiles,
  className,
}: FileUploadZoneProps) {
  const [active, setActive] = useState(false)

  const handleFiles = useCallback(
    (list: FileList | null) => {
      if (!list?.length) return
      onFiles(Array.from(list))
    },
    [onFiles]
  )

  return (
    <label
      className={`ds-upload-zone${active ? ' ds-upload-zone--active' : ''}${className ? ` ${className}` : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setActive(true)
      }}
      onDragLeave={() => setActive(false)}
      onDrop={(e) => {
        e.preventDefault()
        setActive(false)
        handleFiles(e.dataTransfer.files)
      }}
    >
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Upload size={28} aria-hidden style={{ marginBottom: 'var(--space-2)', opacity: 0.75 }} />
      <p className="ds-upload-zone__title">{title}</p>
      <p className="ds-upload-zone__hint">{hint}</p>
    </label>
  )
}
