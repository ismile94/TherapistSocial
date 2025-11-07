import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface AnimatedButtonProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  variant?: 'primary' | 'secondary' | 'danger'
  type?: 'button' | 'submit' | 'reset'
  'aria-label'?: string
  title?: string
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  onClick,
  disabled = false,
  className = '',
  variant = 'primary',
  type = 'button',
  'aria-label': ariaLabel,
  title
}) => {
  const baseClasses = `
    relative overflow-hidden
    transition-all duration-200
    font-medium
    disabled:opacity-50 disabled:cursor-not-allowed
    flex items-center justify-center
  `
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  }
  
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      transition={{ duration: 0.15 }}
      aria-label={ariaLabel}
      title={title}
    >
      <span className="relative z-10">{children}</span>
    </motion.button>
  )
}

export default AnimatedButton

