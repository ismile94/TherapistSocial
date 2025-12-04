import { motion, HTMLMotionProps } from 'framer-motion'
import { ReactNode, useRef, useCallback, forwardRef } from 'react'

interface AnimatedButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: ReactNode
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  className?: string
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  type?: 'button' | 'submit' | 'reset'
  'aria-label'?: string
  title?: string
  loading?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  ripple?: boolean
}

const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(({
  children,
  onClick,
  disabled = false,
  className = '',
  variant = 'primary',
  size = 'md',
  type = 'button',
  'aria-label': ariaLabel,
  title,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  ripple = true,
  ...motionProps
}, ref) => {
  const buttonRef = useRef<HTMLButtonElement>(null)
  
  // Ripple effect handler
  const createRipple = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ripple || disabled || loading) return
    
    const button = buttonRef.current || (ref as React.RefObject<HTMLButtonElement>)?.current
    if (!button) return
    
    const rect = button.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top - size / 2
    
    const rippleEl = document.createElement('span')
    rippleEl.className = 'absolute rounded-full bg-white/30 pointer-events-none animate-ripple'
    rippleEl.style.width = rippleEl.style.height = `${size}px`
    rippleEl.style.left = `${x}px`
    rippleEl.style.top = `${y}px`
    
    button.appendChild(rippleEl)
    
    setTimeout(() => rippleEl.remove(), 600)
  }, [ripple, disabled, loading, ref])
  
  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    createRipple(e)
    onClick?.(e)
  }, [createRipple, onClick])
  
  // Base styles
  const baseClasses = `
    relative overflow-hidden
    inline-flex items-center justify-center
    font-medium
    transition-all duration-200 ease-out-expo
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    select-none
    ${fullWidth ? 'w-full' : ''}
  `
  
  // Size variants
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
    md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
    lg: 'px-6 py-3 text-base rounded-xl gap-2.5',
  }
  
  // Color variants
  const variantClasses = {
    primary: `
      bg-gradient-to-r from-primary-500 to-accent-indigo
      text-white
      hover:from-primary-600 hover:to-primary-700
      focus:ring-primary-500/50
      shadow-md shadow-primary-500/20
      hover:shadow-lg hover:shadow-primary-500/30
    `,
    secondary: `
      bg-gray-100
      text-gray-900
      hover:bg-gray-200
      focus:ring-gray-500/30
      border border-gray-200
    `,
    danger: `
      bg-gradient-to-r from-red-500 to-rose-600
      text-white
      hover:from-red-600 hover:to-rose-700
      focus:ring-red-500/50
      shadow-md shadow-red-500/20
      hover:shadow-lg hover:shadow-red-500/30
    `,
    ghost: `
      bg-transparent
      text-gray-700
      hover:bg-gray-100
      focus:ring-gray-500/20
    `,
    outline: `
      bg-transparent
      text-primary-600
      border-2 border-primary-500
      hover:bg-primary-50
      focus:ring-primary-500/30
    `,
  }
  
  return (
    <motion.button
      ref={buttonRef}
      type={type}
      onClick={handleClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      whileHover={!disabled && !loading ? { scale: 1.02, y: -1 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      aria-label={ariaLabel}
      title={title}
      aria-busy={loading}
      aria-disabled={disabled || loading}
      {...motionProps}
    >
      {/* Loading spinner */}
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center bg-inherit rounded-inherit">
          <svg 
            className="w-5 h-5 animate-spin" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </span>
      )}
      
      {/* Button content */}
      <span className={`relative z-10 flex items-center gap-inherit ${loading ? 'invisible' : ''}`}>
        {icon && iconPosition === 'left' && (
          <span className="flex-shrink-0">{icon}</span>
        )}
        {children}
        {icon && iconPosition === 'right' && (
          <span className="flex-shrink-0">{icon}</span>
        )}
      </span>
    </motion.button>
  )
})

AnimatedButton.displayName = 'AnimatedButton'

export default AnimatedButton

// Utility component for icon-only buttons
export const IconButton = forwardRef<HTMLButtonElement, Omit<AnimatedButtonProps, 'children' | 'icon'> & { icon: ReactNode }>(
  ({ icon, className = '', size = 'md', ...props }, ref) => {
    const sizeClasses = {
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12',
    }
    
    return (
      <AnimatedButton
        ref={ref}
        className={`${sizeClasses[size]} !p-0 !rounded-full ${className}`}
        size={size}
        {...props}
      >
        {icon}
      </AnimatedButton>
    )
  }
)

IconButton.displayName = 'IconButton'
