import { Users, Map, User, Shield, Bell, MessageSquare, Search, Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useCallback } from 'react'
import AnimatedButton, { IconButton } from './AnimatedButton'

interface HeaderProps {
  activeView: 'map' | 'community'
  onViewChange: (view: 'map' | 'community') => void
  onAccountClick: () => void
  notificationCount?: number
  messageCount?: number
  onNotificationsClick?: () => void
  onMessagesClick?: () => void
  onSearchClick?: () => void
  userAvatar?: string
  userName?: string
}

function Header({ 
  activeView, 
  onViewChange, 
  onAccountClick,
  notificationCount = 0,
  messageCount = 0,
  onNotificationsClick,
  onMessagesClick,
  onSearchClick,
  userAvatar,
  userName
}: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // Handle scroll for glass effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  
  // Close mobile menu on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false)
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])
  
  const navItems = [
    { id: 'map', icon: Map, label: 'Map', view: 'map' as const },
    { id: 'community', icon: Users, label: 'Feed', view: 'community' as const },
  ]

  const NavButton = useCallback(({ 
    isActive, 
    onClick, 
    icon: Icon, 
    label 
  }: { 
    isActive: boolean
    onClick: () => void
    icon: typeof Map
    label: string 
  }) => (
    <motion.button
      onClick={onClick}
      className={`
        relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
        transition-all duration-300 ease-out-expo
        ${isActive 
          ? 'text-primary-700 bg-primary-50' 
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      aria-label={label}
      aria-pressed={isActive}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
      
      {/* Active indicator */}
      {isActive && (
        <motion.div
          layoutId="activeTab"
          className="absolute inset-0 bg-primary-100 rounded-xl -z-10"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </motion.button>
  ), [])

  return (
    <>
      <header 
        className={`
          fixed top-0 left-0 right-0 z-50
          px-4 sm:px-6 py-3
          transition-all duration-300 ease-out-expo
          ${isScrolled 
            ? 'bg-white/80 backdrop-blur-xl shadow-soft border-b border-gray-100/50' 
            : 'bg-white/95 backdrop-blur-sm'
          }
        `}
      >
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo */}
          <motion.div 
            className="flex items-center gap-3 group cursor-pointer"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => onViewChange('community')}
          >
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-indigo rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:shadow-xl group-hover:shadow-primary-500/30 transition-all duration-300 group-hover:scale-105">
                <Shield className="w-5 h-5 text-white" />
              </div>
              {/* Glow effect on hover */}
              <div className="absolute inset-0 bg-primary-400 rounded-xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
            </div>
            <div className="hidden xs:block">
              <h1 className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-primary-600 via-accent-indigo to-accent-purple bg-clip-text text-transparent">
                TherapistSocial
              </h1>
            </div>
          </motion.div>
          
          {/* Desktop Navigation */}
          <motion.nav 
            className="hidden md:flex items-center gap-1 bg-gray-50/80 backdrop-blur-sm p-1.5 rounded-2xl border border-gray-100"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            {navItems.map((item) => (
              <NavButton
                key={item.id}
                isActive={activeView === item.view}
                onClick={() => onViewChange(item.view)}
                icon={item.icon}
                label={item.label}
              />
            ))}
          </motion.nav>
          
          {/* Right Actions */}
          <motion.div 
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Search Button - Desktop */}
            {onSearchClick && (
              <IconButton
                icon={<Search className="w-4 h-4" />}
                variant="ghost"
                size="md"
                onClick={onSearchClick}
                aria-label="Search"
                className="hidden sm:flex"
              />
            )}
            
            {/* Messages Button */}
            {onMessagesClick && (
              <div className="relative">
                <IconButton
                  icon={<MessageSquare className="w-4 h-4" />}
                  variant="ghost"
                  size="md"
                  onClick={onMessagesClick}
                  aria-label="Messages"
                  className="hidden sm:flex"
                />
                {messageCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center shadow-lg"
                  >
                    {messageCount > 9 ? '9+' : messageCount}
                  </motion.span>
                )}
              </div>
            )}
            
            {/* Notifications Button */}
            {onNotificationsClick && (
              <div className="relative">
                <IconButton
                  icon={<Bell className="w-4 h-4" />}
                  variant="ghost"
                  size="md"
                  onClick={onNotificationsClick}
                  aria-label="Notifications"
                  className="hidden sm:flex"
                />
                {notificationCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center shadow-lg"
                  >
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </motion.span>
                )}
              </div>
            )}
            
            {/* Profile Button */}
            <motion.button
              onClick={onAccountClick}
              className="relative flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-colors duration-200"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              aria-label="View account"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-accent-indigo flex items-center justify-center overflow-hidden ring-2 ring-white shadow-md">
                {userAvatar ? (
                  <img 
                    src={userAvatar} 
                    alt={userName || 'Profile'} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>
            </motion.button>
            
            {/* Mobile Menu Button */}
            <IconButton
              icon={isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              variant="ghost"
              size="md"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Menu"
              className="md:hidden"
            />
          </motion.div>
        </div>
      </header>
      
      {/* Header Spacer */}
      <div className="h-16" />
      
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            {/* Mobile Menu Panel */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-16 left-4 right-4 bg-white rounded-2xl shadow-elevated border border-gray-100 p-4 z-50 md:hidden"
            >
              <nav className="space-y-2">
                {navItems.map((item) => (
                  <motion.button
                    key={item.id}
                    onClick={() => {
                      onViewChange(item.view)
                      setIsMobileMenuOpen(false)
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left
                      transition-all duration-200
                      ${activeView === item.view 
                        ? 'bg-primary-50 text-primary-700' 
                        : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                    whileTap={{ scale: 0.98 }}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </motion.button>
                ))}
                
                <div className="border-t border-gray-100 my-3" />
                
                {/* Mobile-only actions */}
                <div className="grid grid-cols-3 gap-2">
                  {onSearchClick && (
                    <motion.button
                      onClick={() => {
                        onSearchClick()
                        setIsMobileMenuOpen(false)
                      }}
                      className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-gray-50 text-gray-600"
                      whileTap={{ scale: 0.95 }}
                    >
                      <Search className="w-5 h-5" />
                      <span className="text-xs">Search</span>
                    </motion.button>
                  )}
                  
                  {onMessagesClick && (
                    <motion.button
                      onClick={() => {
                        onMessagesClick()
                        setIsMobileMenuOpen(false)
                      }}
                      className="relative flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-gray-50 text-gray-600"
                      whileTap={{ scale: 0.95 }}
                    >
                      <div className="relative">
                        <MessageSquare className="w-5 h-5" />
                        {messageCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                            {messageCount > 9 ? '9+' : messageCount}
                          </span>
                        )}
                      </div>
                      <span className="text-xs">Messages</span>
                    </motion.button>
                  )}
                  
                  {onNotificationsClick && (
                    <motion.button
                      onClick={() => {
                        onNotificationsClick()
                        setIsMobileMenuOpen(false)
                      }}
                      className="relative flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-gray-50 text-gray-600"
                      whileTap={{ scale: 0.95 }}
                    >
                      <div className="relative">
                        <Bell className="w-5 h-5" />
                        {notificationCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                            {notificationCount > 9 ? '9+' : notificationCount}
                          </span>
                        )}
                      </div>
                      <span className="text-xs">Alerts</span>
                    </motion.button>
                  )}
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default Header
