import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface Toast {
  id: string
  type: ToastType
  message: string
  title?: string
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

const toastConfig = {
  success: {
    icon: CheckCircle,
    bgClass: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
    iconBg: 'bg-emerald-400/20',
    progressBg: 'bg-emerald-300/50',
  },
  error: {
    icon: XCircle,
    bgClass: 'bg-gradient-to-r from-red-500 to-rose-600',
    iconBg: 'bg-red-400/20',
    progressBg: 'bg-red-300/50',
  },
  warning: {
    icon: AlertTriangle,
    bgClass: 'bg-gradient-to-r from-amber-500 to-orange-500',
    iconBg: 'bg-amber-400/20',
    progressBg: 'bg-amber-300/50',
  },
  info: {
    icon: Info,
    bgClass: 'bg-gradient-to-r from-blue-500 to-indigo-600',
    iconBg: 'bg-blue-400/20',
    progressBg: 'bg-blue-300/50',
  },
}

function ToastItem({ 
  toast, 
  onClose 
}: { 
  toast: Toast
  onClose: (id: string) => void 
}) {
  const { id, type, message, title, action, duration = 3000 } = toast
  const config = toastConfig[type]
  const Icon = config.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ 
        type: 'spring', 
        stiffness: 500, 
        damping: 30,
        mass: 1
      }}
      className={`
        relative w-full max-w-sm 
        ${config.bgClass} 
        rounded-2xl shadow-elevated overflow-hidden
        text-white
        backdrop-blur-xl
      `}
      role="status" 
      aria-live="polite"
    >
      {/* Progress bar */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
        className={`absolute top-0 left-0 right-0 h-1 ${config.progressBg} origin-left`}
      />
      
      <div className="p-4 flex items-start gap-3">
        {/* Icon */}
        <div className={`w-9 h-9 rounded-xl ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          {title && (
            <p className="font-semibold text-sm mb-0.5">{title}</p>
          )}
          <p className="text-sm text-white/90 leading-relaxed">{message}</p>
          
          {action && (
            <button 
              onClick={() => { action.onClick(); onClose(id); }}
              className="mt-2 text-sm font-medium text-white/80 hover:text-white underline underline-offset-2 transition-colors"
            >
              {action.label}
            </button>
          )}
        </div>
        
        {/* Close button */}
        <button 
          aria-label="Dismiss" 
          onClick={() => onClose(id)}
          className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const queueRef = useRef<Toast[]>([])
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const maxVisible = 4

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
    const timer = setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id))
      timersRef.current.delete(id)
      flushQueue()
    }, timeout)
    timersRef.current.set(id, timer)
  }, [flushQueue])

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts((current) => current.filter((t) => t.id !== id))
    flushQueue()
  }, [flushQueue])

  const push = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    const full: Toast = { id, duration: 4000, ...toast }
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
      
      {/* Toast Container */}
      <div 
        className="fixed z-[9999] top-4 right-4 left-4 sm:left-auto sm:w-96 flex flex-col gap-3 pointer-events-none" 
        aria-live="polite" 
        aria-atomic="false"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto">
              <ToastItem toast={t} onClose={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
