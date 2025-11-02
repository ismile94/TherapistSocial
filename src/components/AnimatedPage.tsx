import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import { pageVariants } from '../utils/animations'

interface AnimatedPageProps {
  children: ReactNode
  className?: string
}

const AnimatedPage: React.FC<AnimatedPageProps> = ({ children, className = '' }) => {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export default AnimatedPage

