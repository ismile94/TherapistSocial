import { motion } from 'framer-motion'
import { CheckCircle } from 'lucide-react'

interface SuccessIconProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SuccessIcon: React.FC<SuccessIconProps> = ({ 
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }
  
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 10 }}
      className={className}
    >
      <CheckCircle className={`${sizeClasses[size]} text-green-500`} />
    </motion.div>
  )
}

export default SuccessIcon

