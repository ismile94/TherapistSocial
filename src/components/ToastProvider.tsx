import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
  action?: ToastAction
}

interface ToastContextValue {
  show: (toast: Omit<Toast, 'id'>) => string
  success: (message: string, opts?: Partial<Omit<Toast, 'id' | 'type'>>) => string
  error: (message: string, opts?: Partial<Omit<Toast, 'id' | 'type'>>) => string
  info: (message: string, opts?: Partial<Omit<Toast, 'id' | 'type'>>) => string
  warning: (message: string, opts?: Partial<Omit<Toast, 'id' | 'type'>>) => string
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: (id: string) => void }) {
  const { id, type, message, action } = toast

  const color = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : type === 'warning' ? 'bg-amber-500' : 'bg-blue-600'

  return (
    <div className={`w-full max-w-sm shadow-lg rounded-lg overflow-hidden text-white ${color}`} role="status" aria-live="polite">
      <div className="px-4 py-3 flex items-start gap-3">
        <div className="flex-1 text-sm leading-5">{message}</div>
        <button aria-label="Dismiss" className="text-white/90 hover:text-white" onClick={() => onClose(id)}>✕</button>
      </div>
      {action ? (
        <button className="w-full bg-black/10 hover:bg-black/20 text-white text-sm py-2" onClick={() => { action.onClick(); onClose(id); }}>
          {action.label}
        </button>
      ) : null}
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const queueRef = useRef<Toast[]>([])

  const maxVisible = 3

  const flushQueue = useCallback(() => {
    setToasts((current) => {
      const space = Math.max(0, maxVisible - current.length)
      if (space === 0 || queueRef.current.length === 0) return current
      const next = queueRef.current.splice(0, space)
      return [...current, ...next]
    })
  }, [])

  const scheduleDismiss = useCallback((id: string, duration?: number) => {
    const timeout = typeof duration === 'number' ? duration : 3000
    window.setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id))
      flushQueue()
    }, timeout)
  }, [flushQueue])

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id))
    flushQueue()
  }, [flushQueue])

  const push = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    const full: Toast = { id, duration: 3000, ...toast }
    setToasts((current) => {
      if (current.length < maxVisible) {
        scheduleDismiss(id, full.duration)
        return [...current, full]
      }
      queueRef.current.push(full)
      return current
    })
    return id
  }, [scheduleDismiss])

  const api = useMemo<ToastContextValue>(() => ({
    show: push,
    success: (message, opts) => push({ type: 'success', message, ...opts }),
    error: (message, opts) => push({ type: 'error', message, ...opts }),
    info: (message, opts) => push({ type: 'info', message, ...opts }),
    warning: (message, opts) => push({ type: 'warning', message, ...opts }),
    dismiss,
  }), [push, dismiss])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed z-[1000] top-4 right-4 left-4 sm:left-auto flex flex-col gap-3 items-center sm:items-end pointer-events-none" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onClose={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}


