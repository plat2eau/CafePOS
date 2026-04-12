import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type AppOverlaySheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  eyebrow?: string
  closeLabel?: string
  children: React.ReactNode
  bodyClassName?: string
  contentClassName?: string
}

export default function AppOverlaySheet({
  open,
  onOpenChange,
  title,
  description,
  eyebrow,
  closeLabel = 'Close',
  children,
  bodyClassName,
  contentClassName
}: AppOverlaySheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          '!top-auto bottom-[max(12px,calc(env(safe-area-inset-bottom)+12px))] !max-h-[calc(100vh-32px)] !w-[min(720px,calc(100vw-24px))] !translate-y-0 overflow-hidden !rounded-[24px] border-border bg-[linear-gradient(180deg,rgb(var(--accent-rgb)/0.08),transparent_36%),var(--panel-strong)] p-0 sm:!w-[min(720px,calc(100vw-40px))]',
          contentClassName
        )}
      >
        <div className="flex max-h-[calc(100vh-32px)] flex-col">
          <DialogHeader className="border-b border-border/80 px-4 py-4 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                {eyebrow ? <p className="eyebrow mb-0">{eyebrow}</p> : null}
                <DialogTitle>{title}</DialogTitle>
                {description ? (
                  <DialogDescription className="max-w-[48ch] text-[var(--muted)]">
                    {description}
                  </DialogDescription>
                ) : null}
              </div>

              <DialogClose asChild>
                <Button size="sm" variant="secondary" type="button">
                  {closeLabel}
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>

          <div className={cn('flex flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-5', bodyClassName)}>
            {children}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
