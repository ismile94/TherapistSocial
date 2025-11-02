import { motion } from 'framer-motion'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }
  
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`relative ${sizeClasses[size]}`}>
        <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
        <motion.div
          className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>
    </div>
  )
}

export default LoadingSpinner

