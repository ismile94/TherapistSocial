import { Users, Map, User } from 'lucide-react'
import { motion } from 'framer-motion'
import AnimatedButton from './AnimatedButton'

interface HeaderProps {
  activeView: 'map' | 'community'
  onViewChange: (view: 'map' | 'community') => void
  onAccountClick: () => void
}

function Header({ activeView, onViewChange, onAccountClick }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <motion.div 
          className="flex items-center space-x-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">UK Therapist Network</h1>
        </motion.div>
        
        <div className="flex items-center space-x-4">
          <nav className="flex space-x-1">
            <motion.button
              onClick={() => onViewChange('map')}
              className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium transition-all ${
                activeView === 'map'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="View map"
              aria-pressed={activeView === 'map'}
              title="Map"
            >
              <Map className="w-5 h-5" />
            </motion.button>
            <motion.button
              onClick={() => onViewChange('community')}
              className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium transition-all ${
                activeView === 'community'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="View community feed"
              aria-pressed={activeView === 'community'}
              title="Feed"
            >
              <Users className="w-5 h-5" />
            </motion.button>
          </nav>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <AnimatedButton
              onClick={onAccountClick}
              variant="primary"
              className="flex items-center justify-center w-10 h-10 rounded-full"
              aria-label="View account"
              title="Account"
            >
              <User className="w-5 h-5" />
            </AnimatedButton>
          </motion.div>
        </div>
      </div>
    </header>
  )
}

export default Header
