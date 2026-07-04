'use client'

import * as React from 'react'
import { UploadCloud, X, CheckCircle2, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { cn } from '@/lib/utils'
import { ShadcnButton as Button } from '@/app/components/ui/shadcn-button'
import { Progress } from '@/app/components/ui/progress'

export interface UploadedFile {
  id: string
  file: File
  progress: number
  status: 'uploading' | 'completed' | 'error' | 'queued'
}

export interface FileUploadCardLabels {
  title: string
  description?: string
  dropzoneTitle: string
  dropzoneHint: string
  browseLabel: string
  uploadingLabel: string
  completedLabel: string
  queuedLabel: string
  errorLabel: string
}

interface FileUploadCardProps {
  className?: string
  files: UploadedFile[]
  labels: FileUploadCardLabels
  accept?: string
  disabled?: boolean
  onFilesChange: (files: File[]) => void
  onFileRemove: (id: string) => void
  onClose?: () => void
}

export const FileUploadCard = React.forwardRef<HTMLDivElement, FileUploadCardProps>(
  (
    {
      className,
      files = [],
      labels,
      accept,
      disabled = false,
      onFilesChange,
      onFileRemove,
      onClose,
    },
    ref
  ) => {
    const [isDragging, setIsDragging] = React.useState(false)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      if (!disabled) setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
    }

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      if (disabled) return
      const droppedFiles = Array.from(e.dataTransfer.files)
      if (droppedFiles.length > 0) onFilesChange(droppedFiles)
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || [])
      if (selectedFiles.length > 0) onFilesChange(selectedFiles)
      e.target.value = ''
    }

    const triggerFileSelect = () => {
      if (!disabled) fileInputRef.current?.click()
    }

    const formatFileSize = (bytes: number) => {
      if (bytes === 0) return '0 KB'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
    }

    const statusLabel = (status: UploadedFile['status']) => {
      switch (status) {
        case 'uploading':
          return labels.uploadingLabel
        case 'completed':
          return labels.completedLabel
        case 'queued':
          return labels.queuedLabel
        case 'error':
          return labels.errorLabel
        default:
          return labels.completedLabel
      }
    }

    const cardVariants = {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 },
    }

    const fileItemVariants = {
      hidden: { opacity: 0, x: -20 },
      visible: { opacity: 1, x: 0 },
    }

    return (
      <motion.div
        ref={ref}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.3 }}
        className={cn('w-full max-w-lg rounded-xl border border-border bg-background shadow-sm', className)}
      >
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <UploadCloud className="size-6 text-muted-foreground" aria-hidden />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{labels.title}</h3>
                {labels.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{labels.description}</p>
                ) : null}
              </div>
            </div>
            {onClose ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full"
                onClick={onClose}
                aria-label={labels.title}
              >
                <X className="size-4" aria-hidden />
              </Button>
            ) : null}
          </div>

          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={triggerFileSelect}
            className={cn(
              'mt-6 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors duration-200',
              disabled && 'cursor-not-allowed opacity-50',
              isDragging && !disabled
                ? 'border-primary bg-primary/10'
                : 'border-muted-foreground/30 hover:border-primary/50'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={accept}
              disabled={disabled}
              className="hidden"
              onChange={handleFileSelect}
            />
            <UploadCloud className="mb-4 size-10 text-muted-foreground" aria-hidden />
            <p className="font-semibold text-foreground">{labels.dropzoneTitle}</p>
            <p className="mt-1 text-xs text-muted-foreground">{labels.dropzoneHint}</p>
            <Button variant="outline" size="sm" className="pointer-events-none mt-4">
              {labels.browseLabel}
            </Button>
          </div>
        </div>

        {files.length > 0 ? (
          <div className="border-t border-border p-6">
            <ul className="space-y-4" aria-live="polite">
              <AnimatePresence>
                {files.map((file) => (
                  <motion.li
                    key={file.id}
                    variants={fileItemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    layout
                    className="flex items-center justify-between"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-bold text-muted-foreground">
                        {file.file.type.split('/')[1]?.toUpperCase().substring(0, 3) || 'FILE'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="max-w-[150px] truncate text-sm font-medium text-foreground sm:max-w-xs">
                          {file.file.name}
                        </p>
                        <div className="text-xs text-muted-foreground">
                          {file.status === 'uploading' ? (
                            <span>
                              {formatFileSize((file.file.size * file.progress) / 100)} of{' '}
                              {formatFileSize(file.file.size)}
                            </span>
                          ) : (
                            <span>{formatFileSize(file.file.size)}</span>
                          )}
                          <span className="mx-1">•</span>
                          <span
                            className={cn({
                              'text-primary': file.status === 'uploading' || file.status === 'queued',
                              'text-[var(--ds-success)]':
                                file.status === 'completed',
                              'text-destructive': file.status === 'error',
                            })}
                          >
                            {statusLabel(file.status)}
                          </span>
                        </div>
                        {file.status === 'uploading' ? (
                          <Progress value={file.progress} className="mt-1 h-1.5" />
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {file.status === 'completed' ? (
                        <CheckCircle2 className="size-5 text-[var(--ds-success)]" aria-hidden />
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-full"
                        aria-label={file.file.name}
                        onClick={(e) => {
                          e.stopPropagation()
                          onFileRemove(file.id)
                        }}
                      >
                        {file.status === 'completed' || file.status === 'queued' ? (
                          <Trash2 className="size-4" aria-hidden />
                        ) : (
                          <X className="size-4" aria-hidden />
                        )}
                      </Button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        ) : null}
      </motion.div>
    )
  }
)
FileUploadCard.displayName = 'FileUploadCard'
