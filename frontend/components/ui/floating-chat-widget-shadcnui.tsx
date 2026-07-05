"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion"
import { Heart, MessageSquare, Send, X } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useId, useRef, useState } from "react"
import type { ChatMessage } from "@/features/los/useLosChat"

const LOS_AVATAR =
  "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&h=200&fit=crop&q=80"

const containerVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
    transformOrigin: "bottom right",
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 300,
      staggerChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.95,
    transition: {
      duration: 0.2,
    },
  },
}

const messageVariants: Variants = {
  hidden: { opacity: 0, y: 10, x: -10 },
  visible: {
    opacity: 1,
    y: 0,
    x: 0,
    transition: { type: "spring", stiffness: 500, damping: 30 },
  },
}

export type FloatingChatWidgetLabels = {
  title: string
  subtitle: string
  launcherLabel: string
  closeLabel: string
  inputPlaceholder: string
  sendLabel: string
  businessHoursNotice: string
  privacyNotice: string
  privacyLink: string
  privacyHref: string
  loading: string
}

type FloatingChatWidgetProps = {
  labels: FloatingChatWidgetLabels
  messages: ChatMessage[]
  busy: boolean
  isInitializing: boolean
  onSend: (text: string) => Promise<boolean>
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function FloatingChatWidget({
  labels,
  messages,
  busy,
  isInitializing,
  onSend,
  isOpen,
  onOpenChange,
}: FloatingChatWidgetProps) {
  const [message, setMessage] = useState("")
  const widgetId = useId()
  const bottomRef = useRef<HTMLDivElement>(null!)
  const inputRef = useRef<HTMLInputElement>(null!)
  const prefersReducedMotion = useReducedMotion()

  const toggleOpen = useCallback(() => onOpenChange(!isOpen), [isOpen, onOpenChange])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
    })
  }, [messages, busy, prefersReducedMotion])

  useEffect(() => {
    if (isOpen) {
      const timer = window.setTimeout(() => inputRef.current?.focus(), prefersReducedMotion ? 0 : 180)
      return () => window.clearTimeout(timer)
    }
  }, [isOpen, prefersReducedMotion])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = message.trim()
    if (!text || busy) return
    setMessage("")
    await onSend(text)
  }

  const MotionPanel = prefersReducedMotion ? "div" : motion.div
  const MotionMessage = prefersReducedMotion ? "div" : motion.div
  const MotionButton = prefersReducedMotion ? "button" : motion.button

  const panelMotionProps = prefersReducedMotion
    ? {}
    : {
        variants: containerVariants,
        initial: "hidden" as const,
        animate: "visible" as const,
        exit: "exit" as const,
      }

  const messageMotionProps = prefersReducedMotion
    ? {}
    : {
        variants: messageVariants,
      }

  const launcherMotionProps = prefersReducedMotion
    ? {}
    : {
        whileHover: { scale: 1.05 },
        whileTap: { scale: 0.95 },
      }

  return (
    <div
      className="los-widget-root fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4"
      data-widget-id={widgetId}
    >
      <AnimatePresence>
        {isOpen ? (
          prefersReducedMotion ? (
            <div
              key="chat-window"
              className="los-widget-panel w-[380px] overflow-hidden rounded-2xl border border-border/40 bg-background/60 shadow-2xl backdrop-blur-xl ring-1 ring-white/10"
              role="dialog"
              aria-labelledby={`${widgetId}-title`}
              aria-describedby={`${widgetId}-desc`}
            >
              <WidgetPanelContent
                widgetId={widgetId}
                labels={labels}
                messages={messages}
                busy={busy}
                isInitializing={isInitializing}
                message={message}
                setMessage={setMessage}
                onClose={() => onOpenChange(false)}
                onSubmit={handleSubmit}
                bottomRef={bottomRef}
                inputRef={inputRef}
                MotionMessage={MotionMessage}
                messageMotionProps={messageMotionProps}
              />
            </div>
          ) : (
            <MotionPanel
              key="chat-window"
              {...panelMotionProps}
              className="los-widget-panel w-[380px] overflow-hidden rounded-2xl border border-border/40 bg-background/60 shadow-2xl backdrop-blur-xl ring-1 ring-white/10"
              role="dialog"
              aria-labelledby={`${widgetId}-title`}
              aria-describedby={`${widgetId}-desc`}
            >
              <WidgetPanelContent
                widgetId={widgetId}
                labels={labels}
                messages={messages}
                busy={busy}
                isInitializing={isInitializing}
                message={message}
                setMessage={setMessage}
                onClose={() => onOpenChange(false)}
                onSubmit={handleSubmit}
                bottomRef={bottomRef}
                inputRef={inputRef}
                MotionMessage={MotionMessage}
                messageMotionProps={messageMotionProps}
              />
            </MotionPanel>
          )
        ) : null}
      </AnimatePresence>

      <MotionButton
        type="button"
        {...launcherMotionProps}
        onClick={toggleOpen}
        aria-expanded={isOpen}
        aria-controls={isOpen ? `${widgetId}-panel` : undefined}
        aria-label={isOpen ? labels.closeLabel : labels.launcherLabel}
        className={cn(
          "los-widget-launcher group relative flex h-14 w-14 cursor-pointer items-center justify-center rounded-full shadow-2xl transition-all duration-300",
          isOpen
            ? "bg-destructive text-destructive-foreground rotate-90"
            : "bg-[color-mix(in_srgb,var(--hrt-teal,#2dd4bf)_85%,#020617)] text-[#020617] hover:shadow-[0_0_24px_color-mix(in_srgb,var(--hrt-teal,#2dd4bf)_45%,transparent)]"
        )}
      >
        <span
          className={cn(
            "absolute inset-0 -z-10 rounded-full bg-inherit opacity-20 blur-xl transition-opacity duration-300",
            !isOpen && "los-widget-launcher-pulse group-hover:opacity-40"
          )}
          aria-hidden
        />
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageSquare className="h-6 w-6" />
        )}
        {!isOpen ? (
          <span className="los-widget-launcher-tooltip pointer-events-none absolute bottom-full right-0 mb-3 hidden max-w-[220px] rounded-lg border border-border/40 bg-background/90 px-3 py-2 text-left text-xs font-medium leading-snug text-foreground shadow-lg backdrop-blur-md sm:block">
            {labels.launcherLabel}
          </span>
        ) : null}
      </MotionButton>
    </div>
  )
}

type WidgetPanelContentProps = {
  widgetId: string
  labels: FloatingChatWidgetLabels
  messages: ChatMessage[]
  busy: boolean
  isInitializing: boolean
  message: string
  setMessage: (value: string) => void
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  bottomRef: React.RefObject<HTMLDivElement>
  inputRef: React.RefObject<HTMLInputElement>
  MotionMessage: React.ElementType
  messageMotionProps: Record<string, unknown>
}

function WidgetPanelContent({
  widgetId,
  labels,
  messages,
  busy,
  isInitializing,
  message,
  setMessage,
  onClose,
  onSubmit,
  bottomRef,
  inputRef,
  MotionMessage,
  messageMotionProps,
}: WidgetPanelContentProps) {
  return (
    <>
      <div
        id={`${widgetId}-panel`}
        className="relative overflow-hidden border-b border-border/40 bg-muted/30 p-4"
      >
        <div
          className="absolute inset-0 bg-gradient-to-br from-[color-mix(in_srgb,var(--hrt-teal,#2dd4bf)_18%,transparent)] to-[color-mix(in_srgb,var(--hrt-primary,#4a5fd4)_12%,transparent)] opacity-60"
          aria-hidden
        />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                <AvatarImage src={LOS_AVATAR} alt={labels.title} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  <Heart className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
            </div>
            <div>
              <h3 id={`${widgetId}-title`} className="text-sm font-semibold text-foreground">
                {labels.title}
              </h3>
              <p id={`${widgetId}-desc`} className="text-xs text-muted-foreground">
                {labels.subtitle}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-background/50"
            onClick={onClose}
            aria-label={labels.closeLabel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        className="flex h-[320px] flex-col gap-3 overflow-y-auto bg-gradient-to-b from-background/20 to-background/40 p-4"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {isInitializing ? (
          <p className="text-sm text-muted-foreground">{labels.loading}</p>
        ) : (
          messages.map((m, i) => (
            <MotionMessage
              key={`${m.at ?? i}-${m.role}`}
              {...messageMotionProps}
              className={cn(
                "flex gap-3",
                m.role === "user" && "flex-row-reverse self-end"
              )}
            >
              <Avatar className="h-8 w-8 border border-border/40 shadow-sm">
                {m.role === "user" ? (
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    ?
                  </AvatarFallback>
                ) : (
                  <>
                    <AvatarImage src={LOS_AVATAR} alt={labels.title} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      L
                    </AvatarFallback>
                  </>
                )}
              </Avatar>
              <div
                className={cn(
                  "flex max-w-[85%] flex-col gap-1",
                  m.role === "user" && "items-end"
                )}
              >
                {m.role === "assistant" ? (
                  <span className="text-xs font-medium text-muted-foreground">{labels.title}</span>
                ) : null}
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm shadow-sm backdrop-blur-sm border",
                    m.role === "user"
                      ? "rounded-tr-none border-primary/30 bg-primary text-primary-foreground"
                      : "rounded-tl-none border-border/20 bg-muted/50"
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            </MotionMessage>
          ))
        )}

        {busy ? (
          <div className="flex gap-3">
            <Avatar className="h-8 w-8 border border-border/40 shadow-sm">
              <AvatarImage src={LOS_AVATAR} alt={labels.title} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                L
              </AvatarFallback>
            </Avatar>
            <div className="flex w-16 items-center justify-center gap-1 rounded-2xl rounded-tl-none border border-border/20 bg-muted/50 px-4 py-3 shadow-sm backdrop-blur-sm">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40 [animation-delay:-0.3s] motion-reduce:animate-none" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40 [animation-delay:-0.15s] motion-reduce:animate-none" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40 motion-reduce:animate-none" />
            </div>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      <div className="space-y-2 border-t border-border/40 bg-background/60 p-3 backdrop-blur-md">
        <p className="text-[11px] leading-snug text-muted-foreground" role="note">
          {labels.businessHoursNotice}
        </p>
        <p className="text-[11px] leading-snug text-muted-foreground" role="note">
          {labels.privacyNotice}{" "}
          <Link href={labels.privacyHref} className="text-primary underline-offset-2 hover:underline">
            {labels.privacyLink}
          </Link>
        </p>
        <form className="relative flex items-center gap-2" onSubmit={onSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={labels.inputPlaceholder}
            disabled={busy || isInitializing}
            aria-label={labels.inputPlaceholder}
            className="flex-1 rounded-full border border-border/40 bg-background/50 px-4 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/10 disabled:opacity-60"
          />
          <Button
            type="submit"
            size="icon"
            className="h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 hover:shadow-primary/25 disabled:hover:scale-100"
            disabled={!message.trim() || busy || isInitializing}
            aria-label={labels.sendLabel}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </>
  )
}
