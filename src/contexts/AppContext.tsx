import { createContext, useContext, ReactNode, useState, useCallback, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useConnections } from '../hooks/useConnections'
import { useChat } from '../hooks/useChat'
import { useNotifications } from '../hooks/useNotifications'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { supabase } from '../lib/supabaseClient'
import type { Profile, Connection, Conversation, ChatBox, ConversationMetadata, FeedFilters } from '../types/app'

// ============================================
// Context Type
// ============================================

export interface AppContextType {
  // Auth
  currentUser: any
  userProfile: Profile | null
  setUserProfile: (profile: Profile | null) => void
  isAuthenticated: boolean
  signOut: () => Promise<void>

  // Network Status
  connectionStatus: string

  // Navigation
  activeView: 'map' | 'community'
  setActiveView: (view: 'map' | 'community') => void
  selectedProfileId: string | null
  setSelectedProfileId: (id: string | null) => void
  isAuthModalOpen: boolean
  setIsAuthModalOpen: (open: boolean) => void
  isMessagesOverlayOpen: boolean
  setIsMessagesOverlayOpen: (open: boolean) => void
  isConnectionsOpen: boolean
  setIsConnectionsOpen: (open: boolean) => void
  isSettingsOpen: boolean
  setIsSettingsOpen: (open: boolean) => void
  isCVMakerOpen: boolean
  setIsCVMakerOpen: (open: boolean) => void
  showNotifications: boolean
  setShowNotifications: (open: boolean) => void

  // Therapists
  therapists: Profile[]
  setTherapists: (therapists: Profile[]) => void
  loadTherapists: () => Promise<void>
  searchTerm: string
  setSearchTerm: (term: string) => void
  filters: {
    professions: string[]
    languages: string[]
    languageMode: 'OR' | 'AND'
  }
  setFilters: (filters: any) => void

  // Connections
  connections: Connection[]
  connectionRequests: Connection[]
  sentRequests: Connection[]
  blockedUserIds: string[]
  blockedByUserIds: string[]
  allHiddenUserIds: string[]
  sendConnectionRequest: (receiverId: string) => Promise<void>
  acceptConnectionRequest: (connectionId: string) => Promise<void>
  rejectConnectionRequest: (connectionId: string) => Promise<void>
  removeConnection: (connectionId: string) => Promise<void>
  cancelConnectionRequest: (connectionId: string) => Promise<void>
  blockUser: (userId: string) => Promise<void>

  // Chat
  chatBoxes: ChatBox[]
  setChatBoxes: React.Dispatch<React.SetStateAction<ChatBox[]>>
  conversationMetadata: { [key: string]: ConversationMetadata }
  setConversationMetadata: React.Dispatch<React.SetStateAction<{ [key: string]: ConversationMetadata }>>
  conversations: Conversation[]
  unreadMessagesCount: number
  startConversation: (otherUserId: string) => Promise<Conversation | null>
  openChatBox: (conversation: Conversation) => void
  closeChatBox: (conversationId: string) => void
  minimizeChatBox: (conversationId: string) => void
  sendMessage: (conversationId: string, content: string) => Promise<any>
  markMessagesAsRead: (conversationId: string) => Promise<void>
  deleteConversation: (conversationId: string) => Promise<void>

  // Notifications
  notifications: any[]
  unreadNotificationsCount: number
  markNotificationAsRead: (id: string) => Promise<void>
  markAllNotificationsAsRead: () => Promise<void>

  // Profile helpers
  updateProfileInState: (profile: Profile) => void
  updateProfileInAllComponents: (profileId: string, updates: Partial<Profile>) => void

  // Feed filters
  feedFilters: FeedFilters
}

// ============================================
// Context Creation
// ============================================

const AppContext = createContext<AppContextType | null>(null)

// ============================================
// Provider Component
// ============================================

export function AppContextProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { status: connectionStatus } = useNetworkStatus()

  // Auth hook
  const {
    currentUser,
    userProfile,
    setUserProfile,
    signOut,
    isAuthenticated
  } = useAuth()

  // Connections hook
  const {
    connections,
    connectionRequests,
    sentRequests,
    blockedUserIds,
    blockedByUserIds,
    allHiddenUserIds,
    sendConnectionRequest,
    acceptConnectionRequest,
    rejectConnectionRequest,
    removeConnection,
    cancelConnectionRequest,
    blockUser
  } = useConnections({
    currentUserId: currentUser?.id || null,
    userProfile
  })

  // Chat hook
  const {
    chatBoxes,
    setChatBoxes,
    conversationMetadata,
    setConversationMetadata,
    conversations,
    unreadMessagesCount,
    startConversation,
    openChatBox,
    closeChatBox,
    minimizeChatBox,
    sendMessage,
    markMessagesAsRead,
    deleteConversation
  } = useChat({
    currentUserId: currentUser?.id || null,
    userProfile
  })

  // Notifications hook
  const {
    notifications,
    unreadCount: unreadNotificationsCount,
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead
  } = useNotifications({
    currentUserId: currentUser?.id || null
  })

  // Local state
  const [therapists, setTherapists] = useState<Profile[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    professions: [] as string[],
    languages: [] as string[],
    languageMode: 'OR' as 'OR' | 'AND'
  })
  const [feedFilters] = useState<FeedFilters>({
    professions: [],
    clinical_areas: [],
    content_types: [],
    tags: [],
    audience_levels: [],
    related_conditions: [],
    languages: [],
    show_only_my_profession: false,
    show_only_my_network: false
  })

  // URL-based navigation state
  const getActiveView = useCallback((): 'map' | 'community' => {
    if (location.pathname === '/map') return 'map'
    return 'community'
  }, [location.pathname])

  const getSelectedProfileId = useCallback((): string | null => {
    const match = location.pathname.match(/^\/profile\/(.+)$/)
    return match ? match[1] : null
  }, [location.pathname])

  const activeView = getActiveView()
  const selectedProfileId = getSelectedProfileId()
  const isAuthModalOpen = location.pathname === '/auth'
  const isMessagesOverlayOpen = location.pathname === '/messages'
  const isConnectionsOpen = location.pathname === '/network'
  const isSettingsOpen = location.pathname === '/settings'
  const isCVMakerOpen = location.pathname === '/cv-maker'
  const showNotifications = location.pathname === '/notifications'

  // Navigation functions
  const setActiveView = useCallback((view: 'map' | 'community') => {
    navigate(view === 'map' ? '/map' : '/community')
  }, [navigate])

  const setSelectedProfileId = useCallback((id: string | null) => {
    if (id) {
      navigate(`/profile/${id}`)
    } else {
      if (window.history.length > 2) {
        navigate(-1)
      } else {
        navigate('/community')
      }
    }
  }, [navigate])

  const setIsAuthModalOpen = useCallback((open: boolean) => {
    navigate(open ? '/auth' : '/community')
  }, [navigate])

  const setIsMessagesOverlayOpen = useCallback((open: boolean) => {
    navigate(open ? '/messages' : '/community')
  }, [navigate])

  const setIsConnectionsOpen = useCallback((open: boolean) => {
    navigate(open ? '/network' : '/community')
  }, [navigate])

  const setIsSettingsOpen = useCallback((open: boolean) => {
    navigate(open ? '/settings' : '/community')
  }, [navigate])

  const setIsCVMakerOpen = useCallback((open: boolean) => {
    navigate(open ? '/cv-maker' : '/community')
  }, [navigate])

  const setShowNotifications = useCallback((open: boolean) => {
    navigate(open ? '/notifications' : '/community')
  }, [navigate])

  // Load therapists
  const loadTherapists = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name')

      if (!error && data) {
        setTherapists(data)
      }
    } catch (err) {
      console.error('Error loading therapists:', err)
    }
  }, [])

  // Profile update helpers
  const updateProfileInState = useCallback((updatedProfile: Profile) => {
    setTherapists(prev => prev.map(t =>
      t.id === updatedProfile.id ? { ...t, ...updatedProfile } : t
    ))

    if (currentUser?.id === updatedProfile.id) {
      setUserProfile(updatedProfile)
    }
  }, [currentUser?.id, setUserProfile])

  const updateProfileInAllComponents = useCallback((profileId: string, updates: Partial<Profile>) => {
    setTherapists(prev => prev.map(t =>
      t.id === profileId ? { ...t, ...updates } : t
    ))

    if (currentUser?.id === profileId && userProfile) {
      setUserProfile({ ...userProfile, ...updates })
    }
  }, [currentUser?.id, userProfile, setUserProfile])

  // Redirect from root when logged in
  useEffect(() => {
    if (currentUser && location.pathname === '/') {
      navigate('/community', { replace: true })
    }
  }, [currentUser, location.pathname, navigate])

  // Initial load
  useEffect(() => {
    loadTherapists()
  }, [loadTherapists])

  const value: AppContextType = {
    // Auth
    currentUser,
    userProfile,
    setUserProfile,
    isAuthenticated,
    signOut,

    // Network Status
    connectionStatus,

    // Navigation
    activeView,
    setActiveView,
    selectedProfileId,
    setSelectedProfileId,
    isAuthModalOpen,
    setIsAuthModalOpen,
    isMessagesOverlayOpen,
    setIsMessagesOverlayOpen,
    isConnectionsOpen,
    setIsConnectionsOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    isCVMakerOpen,
    setIsCVMakerOpen,
    showNotifications,
    setShowNotifications,

    // Therapists
    therapists,
    setTherapists,
    loadTherapists,
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,

    // Connections
    connections,
    connectionRequests,
    sentRequests,
    blockedUserIds,
    blockedByUserIds,
    allHiddenUserIds,
    sendConnectionRequest,
    acceptConnectionRequest,
    rejectConnectionRequest,
    removeConnection,
    cancelConnectionRequest,
    blockUser,

    // Chat
    chatBoxes,
    setChatBoxes,
    conversationMetadata,
    setConversationMetadata,
    conversations,
    unreadMessagesCount,
    startConversation,
    openChatBox,
    closeChatBox,
    minimizeChatBox,
    sendMessage,
    markMessagesAsRead,
    deleteConversation,

    // Notifications
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,

    // Profile helpers
    updateProfileInState,
    updateProfileInAllComponents,

    // Feed filters
    feedFilters
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

// ============================================
// Hook
// ============================================

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within AppContextProvider')
  }
  return context
}

export default AppContext
