import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { 
  Users, MapPin, User, Search, ChevronDown, X, MessageSquare, 
  Plus, Edit2, Check, ArrowLeft, Mail, Phone, Globe, Calendar, 
  Briefcase, Award, Send, Star, Volume2, VolumeX, Archive, ShieldAlert, MoreHorizontal,
  UserPlus, UserCheck, Clock, Settings, Eye, Lock, Bell
} from 'lucide-react'

// Supabase Client
const supabaseUrl = 'https://ukxcfzcvkmtjtwtrsotb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVreGNmemN2a210anR3dHJzb3RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMzczOTQsImV4cCI6MjA3NTYxMzM5NH0.hD3eW9c1mESHOpQVVI-lAVEW_SBCeyB40Ox1OCGjDy4'

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Leaflet icon fix
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
})

interface Profile {
  id: string
  full_name: string
  profession: string
  languages: string[]
  specialties: string[]
  city: string
  county: string
  lat?: number
  lng?: number
  experience_month?: string
  experience_year?: string
  offers_remote?: boolean
  about_me?: string
  qualifications?: any[]
  work_experience?: any[]
  availability?: any
  phone?: string
  website?: string
  email?: string
  contact_email?: string
  regulator_number?: string
  connection_stats?: ConnectionStats
  is_connected?: boolean
  connection_status?: 'pending' | 'accepted' | 'rejected' | 'not_connected'
}

interface Connection {
  id: string
  created_at: string
  sender_id: string
  receiver_id: string
  status: 'pending' | 'accepted' | 'rejected'
  sender?: Profile
  receiver?: Profile
}

interface ConnectionStats {
  followers_count: number
  following_count: number
  connection_count: number
}

interface Conversation {
  id: string
  created_at: string
  last_message_at: string
  user1_id: string
  user2_id: string
  user1_deleted: boolean
  user2_deleted: boolean
  other_user: Profile
  last_message?: Message
  unread_count?: number
}

interface Message {
  id: string
  created_at: string
  conversation_id: string
  sender_id: string
  content: string
  read: boolean
  sender?: Profile
}

interface ChatBox {
  id: string
  conversation: Conversation
  isMinimized: boolean
  isOpen: boolean
}

interface ConversationMetadata {
  isMuted: boolean
  isStarred: boolean
  isArchived: boolean
}

// Account Dropdown Component
function AccountDropdown({ 
  currentUser, 
  onProfileClick, 
  onSettingsClick,
  onSignOut 
}: { 
  currentUser: any
  onProfileClick: () => void
  onSettingsClick: () => void
  onSignOut: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
      >
        <User className="w-4 h-4" />
        <span>Account</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {currentUser ? (
            <>
              <button
                onClick={() => {
                  onProfileClick()
                  setIsOpen(false)
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <User className="w-4 h-4 mr-2" />
                Profile
              </button>
              <button
                onClick={() => {
                  onSettingsClick()
                  setIsOpen(false)
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings & Privacy
              </button>
              <div className="border-t border-gray-100 my-1"></div>
              <button
                onClick={() => {
                  onSignOut()
                  setIsOpen(false)
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                onProfileClick()
                setIsOpen(false)
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <User className="w-4 h-4 mr-2" />
              Sign In
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Settings Component
function SettingsComponent({ onClose }: { onClose: () => void }) {
  const [activeSection, setActiveSection] = useState<'account' | 'security' | 'visibility' | 'privacy' | 'notifications'>('account')

  const sections = [
    { id: 'account', name: 'Account preferences', icon: Settings },
    { id: 'security', name: 'Sign in & security', icon: Lock },
    { id: 'visibility', name: 'Visibility', icon: Eye },
    { id: 'privacy', name: 'Data privacy', icon: ShieldAlert },
    { id: 'notifications', name: 'Notifications', icon: Bell }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl h-[80vh] overflow-hidden flex">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 bg-white border-b z-10 p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Settings & Privacy</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-64 bg-gray-50 border-r pt-20 h-full overflow-y-auto">
          <nav className="p-4 space-y-1">
            {sections.map((section) => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id as any)}
                  className={`flex items-center w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-3" />
                  {section.name}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 pt-20 h-full overflow-y-auto p-8">
          {activeSection === 'account' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Account Preferences</h3>
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Language & Region</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Language
                      </label>
                      <select className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2">
                        <option>English</option>
                        <option>Turkish</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Time Zone
                      </label>
                      <select className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2">
                        <option>(GMT+00:00) London</option>
                        <option>(GMT+03:00) Istanbul</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Communication Preferences</h4>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300 mr-2" defaultChecked />
                      <span className="text-sm text-gray-700">Email notifications</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300 mr-2" defaultChecked />
                      <span className="text-sm text-gray-700">Push notifications</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Sign In & Security</h3>
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Password</h4>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Change Password
                  </button>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Two-Factor Authentication</h4>
                  <p className="text-sm text-gray-600 mb-3">Add an extra layer of security to your account</p>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                    Enable 2FA
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'visibility' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Visibility</h3>
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Profile Visibility</h4>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input type="radio" name="visibility" className="mr-2" defaultChecked />
                      <span className="text-sm text-gray-700">Public - Anyone can see your profile</span>
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="visibility" className="mr-2" />
                      <span className="text-sm text-gray-700">Network - Only your connections can see your profile</span>
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="visibility" className="mr-2" />
                      <span className="text-sm text-gray-700">Private - Only you can see your profile</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'privacy' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Data Privacy</h3>
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Data Export</h4>
                  <p className="text-sm text-gray-600 mb-3">Download a copy of your data</p>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                    Request Data Export
                  </button>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Account Deletion</h4>
                  <p className="text-sm text-gray-600 mb-3">Permanently delete your account and all data</p>
                  <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Notifications</h3>
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Email Notifications</h4>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between w-full">
                      <span className="text-sm text-gray-700">New connection requests</span>
                      <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                    </label>
                    <label className="flex items-center justify-between w-full">
                      <span className="text-sm text-gray-700">Messages</span>
                      <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                    </label>
                    <label className="flex items-center justify-between w-full">
                      <span className="text-sm text-gray-700">Community posts</span>
                      <input type="checkbox" className="rounded border-gray-300" />
                    </label>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Push Notifications</h4>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between w-full">
                      <span className="text-sm text-gray-700">New messages</span>
                      <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                    </label>
                    <label className="flex items-center justify-between w-full">
                      <span className="text-sm text-gray-700">Connection activity</span>
                      <input type="checkbox" className="rounded border-gray-300" />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function App() {
  const [activeView, setActiveView] = useState<'map' | 'community'>('map')
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    professions: [] as string[],
    languages: [] as string[],
    languageMode: 'OR' as 'OR' | 'AND',
  })
  const [therapists, setTherapists] = useState<Profile[]>([])
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
  const [originalTitle, setOriginalTitle] = useState('')
  
  // Chat boxes state
  const [chatBoxes, setChatBoxes] = useState<ChatBox[]>([])
  const [conversationMetadata, setConversationMetadata] = useState<{ [key: string]: ConversationMetadata }>({})
  const [isMessagesOverlayOpen, setIsMessagesOverlayOpen] = useState(false)
  
  // Connections state
  const [connections, setConnections] = useState<Connection[]>([])
  const [connectionRequests, setConnectionRequests] = useState<Connection[]>([])
  const [isConnectionsOpen, setIsConnectionsOpen] = useState(false)
  
  // New state for settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  
  // Cache
  const profileCacheRef = useRef<{ [key: string]: { data: any, timestamp: number } }>({})
  const loadingProfileRef = useRef<{ [key: string]: boolean }>({})

  // Browser notification permission and page title setup
  useEffect(() => {
    setOriginalTitle(document.title)
    
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission)
      })
    }

    const handleVisibilityChange = () => {
      if (!document.hidden && unreadMessagesCount > 0) {
        updatePageTitle(false)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Profile Detail sayfasını açmak için event listener
  useEffect(() => {
    const handleOpenProfileDetail = (event: CustomEvent) => {
      setSelectedProfileId(event.detail.profileId)
    }

    window.addEventListener('openProfileDetail', handleOpenProfileDetail as EventListener)
    return () => window.removeEventListener('openProfileDetail', handleOpenProfileDetail as EventListener)
  }, [])

  // Update page title when unread count changes
  useEffect(() => {
    updatePageTitle(unreadMessagesCount > 0)
  }, [unreadMessagesCount, originalTitle])

  const updatePageTitle = (hasNotification: boolean) => {
    if (hasNotification && unreadMessagesCount > 0) {
      document.title = `(${unreadMessagesCount}) ${originalTitle}`
    } else {
      document.title = originalTitle
    }
  }

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (e) {
      console.error('Error playing notification sound:', e)
    }
  }

  useEffect(() => {
    console.log('🚀 App mounted')
    loadProfiles()
    initializeAuth()
    
    return () => {
      console.log('🔍 App unmounting')
    }
  }, [])

  useEffect(() => {
    const handleNavigateToMessages = () => {
      setIsMessagesOverlayOpen(true)
      setSelectedProfileId(null)
    }

    window.addEventListener('navigateToMessages', handleNavigateToMessages)
    return () => window.removeEventListener('navigateToMessages', handleNavigateToMessages)
  }, [])

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error)
      setError('An unexpected error occurred')
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason)
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  // Global message subscription for real-time updates
  useEffect(() => {
    if (!currentUser?.id) return

    const channel = supabase
      .channel('global-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id.in.(select id from conversations where user1_id.eq.${currentUser.id} or user2_id.eq.${currentUser.id})`
        },
        async (payload) => {
          const newMsg = payload.new as Message
          
          // Only show notifications for messages from others
          if (newMsg.sender_id !== currentUser.id) {
            // Update unread count
            setUnreadMessagesCount(prev => prev + 1)
            
            // Play sound
            playNotificationSound()
            
            // Show browser notification if permitted
            if ('Notification' in window && Notification.permission === 'granted') {
              // Get conversation info for notification
              const { data: conversation } = await supabase
                .from('conversations')
                .select(`
                  *,
                  user1:profiles!user1_id(*),
                  user2:profiles!user2_id(*)
                `)
                .eq('id', newMsg.conversation_id)
                .single()
              
              if (conversation) {
                const otherUser = conversation.user1_id === currentUser.id ? conversation.user2 : conversation.user1
                const title = `Yeni mesaj - ${otherUser.full_name}`
                const body = newMsg.content?.slice(0, 100) || 'Yeni mesajınız var'
                
                const notification = new Notification(title, {
                  body,
                  icon: '/favicon.ico',
                  tag: `message-${newMsg.id}`
                })
                
                notification.onclick = () => {
                  window.focus()
                  setIsMessagesOverlayOpen(true)
                  // Find and open the conversation
                  const existingConv = chatBoxes.find(box => box.id === newMsg.conversation_id)
                  if (!existingConv) {
                    // Create a new chat box for this conversation
                    openChatBox({
                      ...conversation,
                      other_user: otherUser
                    })
                  }
                }
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Global messages subscription:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUser?.id, chatBoxes])

  // Connection functions
  const loadConnections = async () => {
    if (!currentUser?.id) return
    
    try {
      // Kendi connection'larımı yükle
      const { data: connectionsData, error } = await supabase
        .from('connections')
        .select('*, sender:profiles!sender_id(*), receiver:profiles!receiver_id(*)')
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .eq('status', 'accepted')
      
      if (!error && connectionsData) {
        setConnections(connectionsData)
      }
      
      // Bekleyen connection isteklerini yükle
      const { data: requestsData } = await supabase
        .from('connections')
        .select('*, sender:profiles!sender_id(*)')
        .eq('receiver_id', currentUser.id)
        .eq('status', 'pending')
      
      if (requestsData) {
        setConnectionRequests(requestsData)
      }
    } catch (err) {
      console.error('Error loading connections:', err)
    }
  }
  
  const sendConnectionRequest = async (receiverId: string) => {
    if (!currentUser?.id) {
      setIsAuthModalOpen(true)
    return
    }
  
  try {
    const { data, error } = await supabase
      .from('connections')
      .insert({
        sender_id: currentUser.id,
        receiver_id: receiverId,
        status: 'pending'
      })
      .select()
      .single()
    
    if (error) {
      console.error('Connection request error:', error)
      throw error
    }
    
    // Başarılı olduğunda sender bilgisini al
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single()
    
    if (senderProfile) {
      const connectionWithSender = {
        ...data,
        sender: senderProfile
      }
      setConnectionRequests(prev => [...prev, connectionWithSender])
    } else {
      setConnectionRequests(prev => [...prev, data])
    }
    
  } catch (err: any) {
    console.error('Error sending connection request:', err)
    
    // Daha spesifik hata mesajı
    if (err.code === '23505') {
      alert('Connection request already sent')
    } else if (err.code === '42501') {
      alert('Permission denied. Please check if the connections table exists and you have proper permissions.')
    } else {
      alert('Failed to send connection request. Please try again.')
    }
  }
}

const acceptConnectionRequest = async (connectionId: string) => {
  try {
    const { error } = await supabase
      .from('connections')
      .update({ status: 'accepted' })
      .eq('id', connectionId)
    
    if (error) throw error
    
    // State'leri güncelle
    const acceptedRequest = connectionRequests.find(req => req.id === connectionId)
    if (acceptedRequest) {
      setConnections(prev => [...prev, { ...acceptedRequest, status: 'accepted' }])
      setConnectionRequests(prev => prev.filter(req => req.id !== connectionId))
    }
    
  } catch (err: any) {
    console.error('Error accepting connection request:', err)
    alert('Failed to accept connection request')
  }
}

const rejectConnectionRequest = async (connectionId: string) => {
  try {
    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('id', connectionId)
    
    if (error) throw error
    
    // State'ten kaldır
    setConnectionRequests(prev => prev.filter(req => req.id !== connectionId))
    
  } catch (err: any) {
    console.error('Error rejecting connection request:', err)
    alert('Failed to reject connection request')
  }
}

const removeConnection = async (connectionId: string) => {
  try {
    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('id', connectionId)
    
    if (error) throw error
    
    // State'ten kaldır
    setConnections(prev => prev.filter(conn => conn.id !== connectionId))
    
  } catch (err: any) {
    console.error('Error removing connection:', err)
    alert('Failed to remove connection')
  }
}

const cancelConnectionRequest = async (connectionId: string) => {
  try {
    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('id', connectionId)
    
    if (error) throw error
    
    // State'ten kaldır
    setConnectionRequests(prev => prev.filter(req => req.id !== connectionId))
    
  } catch (err: any) {
    console.error('Error canceling connection request:', err)
    alert('Failed to cancel connection request')
  }
}

  // Connection'ları yükle
  useEffect(() => {
    if (currentUser?.id) {
      loadConnections()
    }
  }, [currentUser?.id])

  async function initializeAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        console.log('✅ Initial session found:', session.user.id)
        setCurrentUser(session.user)
        await loadUserProfile(session.user.id)
      }

      let timeoutId: NodeJS.Timeout
      
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔐 Auth event:', event)
        
        clearTimeout(timeoutId)
        
        timeoutId = setTimeout(async () => {
          if (event === 'SIGNED_IN' && session?.user) {
            if (currentUser?.id !== session.user.id) {
              console.log('✅ New user signed in:', session.user.id)
              setCurrentUser(session.user)
              await loadUserProfile(session.user.id)
            }
          } else if (event === 'SIGNED_OUT') {
            console.log('👋 User signed out')
            setCurrentUser(null)
            setUserProfile(null)
            setSelectedProfileId(null)
            setChatBoxes([])
            profileCacheRef.current = {}
          }
        }, 1000)
      })

      return () => {
        clearTimeout(timeoutId)
        authListener.subscription.unsubscribe()
      }
    } catch (err) {
      console.error('❌ Auth initialization error:', err)
    }
  }

  async function loadUserProfile(userId: string) {
    const cached = profileCacheRef.current[userId]
    const now = Date.now()
    
    if (cached && (now - cached.timestamp) < 30000) {
      console.log('✅ Profile loaded from cache:', userId)
      setUserProfile(cached.data)
      return
    }

    if (loadingProfileRef.current[userId]) {
      console.log('⏳ Profile already loading:', userId)
      return
    }

    try {
      loadingProfileRef.current[userId] = true
      console.log('🔍 Loading profile from DB:', userId)
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error('❌ Profile load error:', error)
        setError('Failed to load profile')
      } else {
        console.log('✅ Profile loaded:', data.full_name)
        setUserProfile(data)
        
        profileCacheRef.current[userId] = {
          data,
          timestamp: Date.now()
        }
      }
    } catch (err) {
      console.error('❌ Profile load exception:', err)
      setError('Failed to load profile')
    } finally {
      loadingProfileRef.current[userId] = false
    }
  }

  async function loadProfiles() {
    try {
      const { data, error } = await supabase.from('profiles').select('*')
      if (error) {
        console.error('Error loading profiles:', error)
      } else {
        setTherapists(data || [])
      }
    } catch (err) {
      console.error('Error loading profiles:', err)
    }
  }

  async function geocodeLocation(city: string, county: string): Promise<[number, number] | null> {
    try {
      const query = `${city}, ${county}, UK`
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
      )
      const data = await response.json()
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)]
      }
    } catch (err) {
      console.error('Geocoding error:', err)
    }
    return null
  }

  const openChatBox = (conversation: Conversation) => {
    setChatBoxes(prev => {
      const exists = prev.find(box => box.id === conversation.id)
      if (exists) {
        return prev.map(box => 
          box.id === conversation.id 
            ? { ...box, isMinimized: false, isOpen: true }
            : box
        )
      }
      
      if (prev.length >= 3) {
        return [
          ...prev.slice(1),
          { id: conversation.id, conversation, isMinimized: false, isOpen: true }
        ]
      }
      
      return [
        ...prev,
        { id: conversation.id, conversation, isMinimized: false, isOpen: true }
      ]
    })
  }

  const closeChatBox = (conversationId: string) => {
    setChatBoxes(prev => prev.filter(box => box.id !== conversationId))
  }

  const minimizeChatBox = (conversationId: string) => {
    setChatBoxes(prev => 
      prev.map(box => 
        box.id === conversationId 
          ? { ...box, isMinimized: !box.isMinimized }
          : box
      )
    )
  }

  const updateConversationMetadata = (conversationId: string, updates: Partial<ConversationMetadata>) => {
    setConversationMetadata(prev => {
      const existing = prev[conversationId] ?? { isMuted: false, isStarred: false, isArchived: false }
      return {
        ...prev,
        [conversationId]: {
          ...existing,
          ...updates
        }
      }
    })
  }

  const filteredTherapists = therapists.filter(therapist => {
    const matchesSearch = therapist.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         therapist.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         therapist.county?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesProfession = filters.professions.length === 0 || 
                            filters.professions.includes(therapist.profession)
    
    const matchesLanguages = filters.languages.length === 0 || 
      (filters.languageMode === 'OR' 
        ? filters.languages.some((lang: string) => therapist.languages?.includes(lang))
        : filters.languages.every((lang: string) => therapist.languages?.includes(lang)))
    
    return matchesSearch && matchesProfession && matchesLanguages
  })

  // Account dropdown handler'ları
  const handleProfileClick = () => {
    setIsAuthModalOpen(true)
  }

  const handleSettingsClick = () => {
    setIsSettingsOpen(true)
  }

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setCurrentUser(null)
      setUserProfile(null)
    }
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => {
              setError(null)
              window.location.reload()
            }} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">UK Therapist Network</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <nav className="flex space-x-1">
              <button
                onClick={() => {
                  setActiveView('map')
                  setSelectedProfileId(null)
                }}
                className={`flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeView === 'map' && !selectedProfileId
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <MapPin className="w-4 h-4 mr-2" />
                Map
              </button>
              <button
                onClick={() => {
                  setActiveView('community')
                  setSelectedProfileId(null)
                }}
                className={`flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeView === 'community' && !selectedProfileId
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Users className="w-4 h-4 mr-2" />
                Community
              </button>
            </nav>
            
            {/* Network Butonu */}
            {currentUser && (
              <button
                onClick={() => setIsConnectionsOpen(true)}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
              >
                <Users className="w-4 h-4 mr-2" />
                Network
              </button>
            )}
            
            {/* Yeni Account Dropdown */}
            <AccountDropdown 
              currentUser={currentUser}
              onProfileClick={handleProfileClick}
              onSettingsClick={handleSettingsClick}
              onSignOut={handleSignOut}
            />
          </div>
        </div>
      </header>
      
      <div className="flex-1 flex overflow-hidden">
        {selectedProfileId ? (
          <ProfileDetailPage 
            profileId={selectedProfileId} 
            onClose={() => setSelectedProfileId(null)}
            currentUserId={currentUser?.id}
            onStartConversation={openChatBox}
            connections={connections}
            connectionRequests={connectionRequests}
            onSendConnectionRequest={sendConnectionRequest}
            onAcceptConnectionRequest={acceptConnectionRequest}
            onRejectConnectionRequest={rejectConnectionRequest}
            onRemoveConnection={removeConnection}
          />
        ) : activeView === 'map' ? (
          <>
            <SidebarComponent
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filters={filters}
              setFilters={setFilters}
              onProfileClick={(id: string) => setSelectedProfileId(id)}
              therapists={filteredTherapists}
            />
            
            <div className="flex-1 relative">
              <MapComponent 
                therapists={filteredTherapists}
                geocodeLocation={geocodeLocation}
                onProfileClick={(id: string) => setSelectedProfileId(id)}
              />
            </div>
          </>
        ) : activeView === 'community' ? (
          <CommunityComponent />
        ) : null}
      </div>

      {isAuthModalOpen && (
        <AuthModalComponent 
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={() => {
            loadProfiles()
          }}
          currentUser={currentUser}
          userProfile={userProfile}
          onOpenProfileDetail={(profileId: string) => setSelectedProfileId(profileId)}
        />
      )}

      {/* Chat Boxes */}
      {chatBoxes.map((chatBox, index) => (
        <ChatBoxComponent
          key={chatBox.id}
          chatBox={chatBox}
          currentUserId={currentUser?.id}
          userProfile={userProfile}
          onClose={() => closeChatBox(chatBox.id)}
          onMinimize={() => minimizeChatBox(chatBox.id)}
          position={index}
          baseRightOffset={360 + 16}
          playNotificationSound={playNotificationSound}
        />
      ))}

      {/* Messages Overlay (LinkedIn-style) */}
      <div className="fixed bottom-0 right-4 z-[1000]">
        <div className="relative">
          {/* Bildirim göstergesi */}
          {unreadMessagesCount > 0 && (
            <div className="absolute -top-1 -right-1">
              <span className="messages-notification flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 justify-center items-center">
                  <span className="text-white text-[10px] font-bold">
                    {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                  </span>
                </span>
              </span>
            </div>
          )}
          
          <div className={`msg-overlay-list-bubble ml4 msg-overlay-list-bubble ${isMessagesOverlayOpen ? '' : ''}`}>
            <div
              className="bg-white border border-gray-300 rounded-t-lg shadow-2xl overflow-hidden"
              style={{ width: '360px' }}
            >
              <div
                className="bg-blue-600 text-white h-12 px-3 flex items-center justify-between cursor-pointer"
                onClick={() => setIsMessagesOverlayOpen(prev => !prev)}
              >
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 opacity-90" />
                  <span className="font-medium text-sm tracking-wide">Messaging</span>
                </div>
                {unreadMessagesCount > 0 && (
                  <span className="bg-white text-blue-700 text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                  </span>
                )}
              </div>

              {isMessagesOverlayOpen && (
                <div className="bg-white" style={{ height: '420px', width: '360px' }}>
                  <div className="h-full w-full">
                    <ConversationsList
                      currentUserId={currentUser?.id || ''}
                      onSelectConversation={(conv: Conversation) => openChatBox(conv)}
                      selectedConversationId={undefined}
                      onUnreadCountChange={setUnreadMessagesCount}
                      conversationMetadata={conversationMetadata}
                      onUpdateMetadata={updateConversationMetadata}
                      compact
                      playNotificationSound={playNotificationSound}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Connections Manager Modal */}
      {isConnectionsOpen && currentUser && (
        <ConnectionsManager 
          currentUserId={currentUser.id}
          onClose={() => setIsConnectionsOpen(false)}
          connections={connections}
          connectionRequests={connectionRequests}
          onAcceptConnectionRequest={acceptConnectionRequest}
          onRejectConnectionRequest={rejectConnectionRequest}
          onRemoveConnection={removeConnection}
          onSendConnectionRequest={sendConnectionRequest}
          onCancelConnectionRequest={cancelConnectionRequest}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsComponent onClose={() => setIsSettingsOpen(false)} />
      )}

      {/* Notification Styles */}
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        
        @keyframes bounce {
          0%, 20%, 53%, 80%, 100% {
            transform: translate3d(0,0,0);
          }
          40%, 43% {
            transform: translate3d(0, -8px, 0);
          }
          70% {
            transform: translate3d(0, -4px, 0);
          }
          90% {
            transform: translate3d(0, -2px, 0);
          }
        }
        
        .notification-pulse {
          animation: pulse 2s infinite;
        }
        
        .bounce {
          animation: bounce 1s ease infinite;
        }
        
        .messages-notification::after {
          content: '';
          position: absolute;
          top: -2px;
          right: -2px;
          width: 12px;
          height: 12px;
          background: #EF4444;
          border-radius: 50%;
          border: 2px solid white;
          animation: pulse 2s infinite;
        }
      `}</style>
    </div>
  )
}

// Connections Management Component - Güncellenmiş versiyon
function ConnectionsManager({ 
  currentUserId,
  onClose,
  connections,
  connectionRequests,
  onAcceptConnectionRequest,
  onRejectConnectionRequest,
  onRemoveConnection,
  onSendConnectionRequest,
  onCancelConnectionRequest
}: { 
  currentUserId: string
  onClose: () => void
  connections: Connection[]
  connectionRequests: Connection[]
  onAcceptConnectionRequest: (id: string) => Promise<void>
  onRejectConnectionRequest: (id: string) => Promise<void>
  onRemoveConnection: (id: string) => Promise<void>
  onSendConnectionRequest: (id: string) => Promise<void>
  onCancelConnectionRequest: (id: string) => Promise<void>
}) {
  const [activeTab, setActiveTab] = useState<'connections' | 'requests' | 'suggested'>('connections')
  const [requestSubTab, setRequestSubTab] = useState<'received' | 'sent'>('received')
  const [suggested, setSuggested] = useState<Profile[]>([])
  const [sentRequests, setSentRequests] = useState<Connection[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (activeTab === 'suggested') {
      loadSuggested()
    }
    if (activeTab === 'requests') {
      loadSentRequests()
    }
  }, [activeTab])

  const loadSuggested = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', currentUserId)
      .limit(20)

    if (!error && data) {
      // Bağlantısı olmayan ve istek gönderilmemiş kullanıcıları filtrele
      const connectedUserIds = connections.map(conn => 
        conn.sender_id === currentUserId ? conn.receiver_id : conn.sender_id
      )
      const requestedUserIds = sentRequests.map(req => req.receiver_id)
      const filtered = data.filter(profile => 
        !connectedUserIds.includes(profile.id) && 
        !requestedUserIds.includes(profile.id)
      )
      setSuggested(filtered)
    }
    setLoading(false)
  }

  const loadSentRequests = async () => {
    const { data, error } = await supabase
      .from('connections')
      .select('*, receiver:profiles!receiver_id(*)')
      .eq('sender_id', currentUserId)
      .eq('status', 'pending')

    if (!error && data) {
      setSentRequests(data)
    }
  }

  const handleAcceptRequest = async (connectionId: string) => {
    try {
      await onAcceptConnectionRequest(connectionId)
    } catch (error) {
      console.error('Error accepting request:', error)
      alert('Failed to accept connection request')
    }
  }

  const handleRejectRequest = async (connectionId: string) => {
    try {
      await onRejectConnectionRequest(connectionId)
    } catch (error) {
      console.error('Error rejecting request:', error)
      alert('Failed to reject connection request')
    }
  }

  const handleRemoveConnection = async (connectionId: string) => {
    try {
      await onRemoveConnection(connectionId)
    } catch (error) {
      console.error('Error removing connection:', error)
      alert('Failed to remove connection')
    }
  }

  const handleCancelRequest = async (connectionId: string) => {
    try {
      await onCancelConnectionRequest(connectionId)
      setSentRequests(prev => prev.filter(req => req.id !== connectionId))
      loadSuggested() // Suggested listesini güncelle
    } catch (err: any) {
      console.error('Error canceling connection request:', err)
      alert('Failed to cancel connection request')
    }
  }

  const handleSendRequest = async (receiverId: string) => {
    try {
      await onSendConnectionRequest(receiverId)
      // İstek gönderildikten sonra suggested listesini güncelle
      setSuggested(prev => prev.filter(profile => profile.id !== receiverId))
      loadSentRequests() // Gönderilen istekler listesini güncelle
    } catch (error) {
      console.error('Error sending connection request:', error)
    }
  }

  const handleProfileClick = (profileId: string) => {
    onClose()
    // Profile sayfasını açmak için global state'i güncelle
    window.dispatchEvent(new CustomEvent('openProfileDetail', { 
      detail: { profileId } 
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">My Network</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex mt-4 space-x-1">
            <button
              onClick={() => setActiveTab('connections')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'connections'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Connections ({connections.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'requests'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Requests ({requestSubTab === 'received' ? connectionRequests.length : sentRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('suggested')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'suggested'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Suggested
            </button>
          </div>

          {/* Request Sub Tabs */}
          {activeTab === 'requests' && (
            <div className="flex mt-3 space-x-1 border-b pb-2">
              <button
                onClick={() => setRequestSubTab('received')}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  requestSubTab === 'received'
                    ? 'bg-blue-50 text-blue-600 border border-blue-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Received ({connectionRequests.length})
              </button>
              <button
                onClick={() => setRequestSubTab('sent')}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  requestSubTab === 'sent'
                    ? 'bg-blue-50 text-blue-600 border border-blue-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Sent ({sentRequests.length})
              </button>
            </div>
          )}
        </div>

        <div className="overflow-y-auto max-h-[60vh] p-6">
          {activeTab === 'connections' && (
            <div className="space-y-4">
              {connections.map(connection => {
                const otherUser = connection.sender_id === currentUserId ? connection.receiver : connection.sender
                return (
                  <div 
                    key={connection.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => otherUser?.id && handleProfileClick(otherUser.id)}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                        {otherUser?.full_name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{otherUser?.full_name}</h3>
                        <p className="text-sm text-gray-600">{otherUser?.profession}</p>
                        <p className="text-xs text-gray-500">{otherUser?.city}, {otherUser?.county}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveConnection(connection.id)
                      }}
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200"
                    >
                      Remove
                    </button>
                  </div>
                )
              })}
              {connections.length === 0 && (
                <p className="text-center text-gray-500 py-8">No connections yet</p>
              )}
            </div>
          )}

          {activeTab === 'requests' && requestSubTab === 'received' && (
            <div className="space-y-4">
              {connectionRequests.map(request => (
                <div 
                  key={request.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => request.sender?.id && handleProfileClick(request.sender.id)}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                      {request.sender?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{request.sender?.full_name}</h3>
                      <p className="text-sm text-gray-600">{request.sender?.profession}</p>
                      <p className="text-xs text-gray-500">{request.sender?.city}, {request.sender?.county}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleAcceptRequest(request.id)}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRejectRequest(request.id)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
              {connectionRequests.length === 0 && (
                <p className="text-center text-gray-500 py-8">No pending requests</p>
              )}
            </div>
          )}

          {activeTab === 'requests' && requestSubTab === 'sent' && (
            <div className="space-y-4">
              {sentRequests.map(request => (
                <div 
                  key={request.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => request.receiver?.id && handleProfileClick(request.receiver.id)}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                      {request.receiver?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{request.receiver?.full_name}</h3>
                      <p className="text-sm text-gray-600">{request.receiver?.profession}</p>
                      <p className="text-xs text-gray-500">{request.receiver?.city}, {request.receiver?.county}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCancelRequest(request.id)
                    }}
                    className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200"
                  >
                    Cancel
                  </button>
                </div>
              ))}
              {sentRequests.length === 0 && (
                <p className="text-center text-gray-500 py-8">No sent requests</p>
              )}
            </div>
          )}

          {activeTab === 'suggested' && (
            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <>
                  {suggested.map(profile => (
                    <div 
                      key={profile.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleProfileClick(profile.id)}
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                          {profile.full_name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{profile.full_name}</h3>
                          <p className="text-sm text-gray-600">{profile.profession}</p>
                          <p className="text-xs text-gray-500">{profile.city}, {profile.county}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSendRequest(profile.id)
                        }}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Connect
                      </button>
                    </div>
                  ))}
                  {suggested.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No suggestions available</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ChatBoxComponent({ 
  chatBox, 
  currentUserId,
  userProfile,
  onClose, 
  onMinimize,
  position,
  baseRightOffset = 0,
  playNotificationSound
}: { 
  chatBox: ChatBox
  currentUserId: string
  userProfile: any
  onClose: () => void
  onMinimize: () => void
  position: number
  baseRightOffset?: number
  playNotificationSound?: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const subscriptionRef = useRef<any>(null)
  const unreadCount = useMemo(() => messages.filter(m => !m.read && m.sender_id !== currentUserId).length, [messages, currentUserId])

  useEffect(() => {
    if (chatBox.conversation?.id && currentUserId && chatBox.isOpen) {
      loadMessages()
      subscribeToMessages()
      markMessagesAsRead()
    }

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
        subscriptionRef.current = null
      }
    }
  }, [chatBox.conversation?.id, currentUserId, chatBox.isOpen])

  useEffect(() => {
    if (!chatBox.isMinimized) {
      scrollToBottom()
    }
  }, [messages, chatBox.isMinimized])

  async function loadMessages() {
    if (!chatBox.conversation) return
    
    const { data, error } = await supabase
      .from('messages')
      .select(`*, sender:profiles(*)`)
      .eq('conversation_id', chatBox.conversation.id)
      .order('created_at', { ascending: true })

    if (!error && data) {
      setMessages(data)
    }
  }

  function subscribeToMessages() {
    if (!chatBox.conversation || subscriptionRef.current) return

    const channel = supabase
      .channel(`chatbox-${chatBox.conversation.id}-${Date.now()}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `conversation_id=eq.${chatBox.conversation.id}`
        },
        async (payload) => {
          const newMsg = payload.new as Message
          
          // Sender bilgisini fetch et
          const { data: senderData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newMsg.sender_id)
            .single()
          
          const messageWithSender = { ...newMsg, sender: senderData }
          setMessages(prev => [...prev, messageWithSender])
          
          if (newMsg.sender_id !== currentUserId) {
            if (!chatBox.isOpen || chatBox.isMinimized) {
              // Mini bildirim göster
              showMiniNotification()
              playNotificationSound?.()
            }
            
            if (!chatBox.isMinimized) {
              markMessagesAsRead()
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'messages',
          filter: `conversation_id=eq.${chatBox.conversation.id}`
        },
        (payload) => {
          // Mesaj okundu olarak işaretlendiğinde güncelle
          const updatedMsg = payload.new as Message
          setMessages(prev => 
            prev.map(msg => 
              msg.id === updatedMsg.id ? { ...msg, read: updatedMsg.read } : msg
            )
          )
        }
      )
      .subscribe((status) => {
        console.log(`Chat ${chatBox.conversation.id} status:`, status)
      })

    subscriptionRef.current = channel
  }

  // Mini bildirim fonksiyonu
  const showMiniNotification = () => {
    const element = document.querySelector(`[data-chat-id="${chatBox.id}"]`)
    if (element) {
      element.classList.add('notification-pulse')
      setTimeout(() => {
        element.classList.remove('notification-pulse')
      }, 2000)
    }
  }

  async function markMessagesAsRead() {
    if (!chatBox.conversation) return

    await supabase
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', chatBox.conversation.id)
      .eq('read', false)
      .neq('sender_id', currentUserId)
  }

  async function sendMessage() {
    if (!chatBox.conversation || !newMessage.trim() || sending) return
  
    setSending(true)
    
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      created_at: new Date().toISOString(),
      conversation_id: chatBox.conversation.id,
      sender_id: currentUserId,
      content: newMessage.trim(),
      read: true,
      sender: userProfile
    }
    
    setMessages(prev => [...prev, tempMessage])
    setNewMessage('')
    
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: chatBox.conversation.id,
        sender_id: currentUserId,
        content: newMessage.trim()
      })
      .select(`*, sender:profiles(*)`)
      .single()
  
    if (error) {
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id))
      alert('Failed to send message')
    } else {
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessage.id ? data : msg
      ))
      
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', chatBox.conversation.id)
    }
    setSending(false)
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!chatBox.conversation) return null

  return (
    <div 
      data-chat-id={chatBox.id}
      className={`fixed bottom-0 bg-white border border-gray-300 rounded-t-lg shadow-2xl flex flex-col transition-all ${
        chatBox.isMinimized ? 'h-12' : 'h-96'
      }`}
      style={{ 
        zIndex: 1100,
        width: '320px',
        right: `${16 + baseRightOffset + (position * 328)}px`
      }}
    >
      <div 
        className="bg-blue-600 text-white p-2 rounded-t-lg flex items-center justify-between cursor-pointer chat-header"
        onClick={onMinimize}
      >
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
            {chatBox.conversation.other_user.full_name?.charAt(0) || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">
              {chatBox.conversation.other_user.full_name}
            </p>
            <p className="text-xs text-blue-100 truncate">
              {chatBox.conversation.other_user.profession}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          {chatBox.isMinimized && unreadCount > 0 && (
            <span className="bg-white text-blue-700 text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1.5 flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMinimize()
            }}
            className="p-1 hover:bg-blue-700 rounded"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${chatBox.isMinimized ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="p-1 hover:bg-blue-700 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!chatBox.isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] px-3 py-2 rounded-lg text-sm ${
                    message.sender_id === currentUserId
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white text-gray-900 rounded-bl-none border border-gray-200'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.sender_id === currentUserId ? 'text-blue-200' : 'text-gray-500'
                  }`}>
                    {new Date(message.created_at).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-gray-200 bg-white">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={sending}
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ConversationsList({
  currentUserId,
  onSelectConversation,
  selectedConversationId,
  onUnreadCountChange,
  conversationMetadata,
  onUpdateMetadata,
  compact,
  playNotificationSound
}: {
  currentUserId: string;
  onSelectConversation: (conversation: Conversation) => void;
  selectedConversationId?: string;
  onUnreadCountChange?: (count: number) => void;
  conversationMetadata: { [key: string]: ConversationMetadata };
  onUpdateMetadata: (conversationId: string, updates: Partial<ConversationMetadata>) => void;
  compact?: boolean;
  playNotificationSound?: () => void;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const subscriptionRef = useRef<any>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout>();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    loadConversations();
    const timeoutId = setTimeout(() => subscribeToConversations(), 1000);
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(loadTimeoutRef.current);
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [currentUserId]);

  // Ask for browser notification permission once
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  useEffect(() => {
    const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
    onUnreadCountChange?.(totalUnread);
  }, [conversations]);

  async function loadConversations() {
    if (!currentUserId) return;
    clearTimeout(loadTimeoutRef.current);
    loadTimeoutRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("conversations")
          .select(`
            *,
            user1:profiles!user1_id(*),
            user2:profiles!user2_id(*),
            messages!conversation_id(*)
          `)
          .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
          .order("last_message_at", { ascending: false });

        if (error) {
          console.error("❌ Error loading conversations:", error);
        } else {
          const mapped = (data || []).map((conv) => {
            const other = conv.user1_id === currentUserId ? conv.user2 : conv.user1;
            const msgs = conv.messages || [];
            const last = msgs.length ? msgs[msgs.length - 1] : null;
            const unread = msgs.filter((m: any) => !m.read && m.sender_id !== currentUserId).length;
            return { ...conv, other_user: other, last_message: last, unread_count: unread };
          });
          setConversations(mapped);
        }
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function subscribeToConversations() {
    if (!currentUserId || subscriptionRef.current) return;
    const channel = supabase
      .channel(`conversations-${currentUserId}-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, loadConversations)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload: any) => {
        try {
          const msg = payload?.new as { id: string; sender_id: string; content: string; conversation_id: string };
          if (msg && msg.sender_id !== currentUserId) {
            // Play notification sound for new messages from others
            playNotificationSound?.();
            
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              const title = 'New message';
              const body = msg.content?.slice(0, 140) || 'New message received';
              // Show native notification (will auto-close by the OS)
              const notification = new Notification(title, { 
                body,
                icon: '/favicon.ico',
                tag: `message-${msg.id}`
              });
              
              notification.onclick = () => {
                window.focus();
                // Find and select the conversation
                const conversation = conversations.find(c => c.id === msg.conversation_id);
                if (conversation) {
                  onSelectConversation(conversation);
                }
              };
            }
          }
        } finally {
          loadConversations();
        }
      })
      .subscribe((status) => {
        console.log('Conversations subscription status:', status);
      });
    subscriptionRef.current = channel;
  }

  const handleToggleStar = (id: string, e: any) => {
    e.stopPropagation();
    const current = conversationMetadata[id]?.isStarred || false;
    onUpdateMetadata(id, { isStarred: !current });
    setMenuOpenId(null);
  };

  const handleToggleMute = (id: string, e: any) => {
    e.stopPropagation();
    const current = conversationMetadata[id]?.isMuted || false;
    onUpdateMetadata(id, { isMuted: !current });
    setMenuOpenId(null);
  };

  const handleToggleArchive = (id: string, e: any) => {
    e.stopPropagation();
    const current = conversationMetadata[id]?.isArchived || false;
    onUpdateMetadata(id, { isArchived: !current });
    setMenuOpenId(null);
  };

  const handleMarkAsUnread = async (id: string, e: any) => {
    e.stopPropagation();
    try {
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .neq('sender_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastMsg && lastMsg.read) {
        await supabase
          .from('messages')
          .update({ read: false })
          .eq('id', lastMsg.id);
      }
      setMenuOpenId(null);
      await loadConversations();
    } catch (err) {
      console.error('Failed to mark as unread', err);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (days < 7) return date.toLocaleDateString([], { weekday: "short" });
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const visible = conversations
    .filter((c) => showArchived ? (conversationMetadata[c.id]?.isArchived) : (!conversationMetadata[c.id]?.isArchived))
    .filter((c) => c.other_user.full_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aStar = conversationMetadata[a.id]?.isStarred ? 1 : 0;
      const bStar = conversationMetadata[b.id]?.isStarred ? 1 : 0;
      if (bStar - aStar !== 0) return bStar - aStar;
      const at = a.last_message_at || a.created_at;
      const bt = b.last_message_at || b.created_at;
      return new Date(bt).getTime() - new Date(at).getTime();
    });

  const inboxUnread = useMemo(() =>
    conversations
      .filter((c) => !conversationMetadata[c.id]?.isArchived)
      .reduce((sum, c) => sum + (c.unread_count || 0), 0)
  , [conversations, conversationMetadata]);

  const archivedUnread = useMemo(() =>
    conversations
      .filter((c) => !!conversationMetadata[c.id]?.isArchived)
      .reduce((sum, c) => sum + (c.unread_count || 0), 0)
  , [conversations, conversationMetadata]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      {!compact && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Messages</h2>
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="mt-3 flex items-center space-x-2">
            <button
              onClick={() => setShowArchived(false)}
              className={`px-3 py-1.5 text-xs rounded-full border ${!showArchived ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-700 border-gray-300 hover:bg-gray-100'}`}
            >
              Inbox{inboxUnread > 0 && (
                <span className="ml-2 bg-blue-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1.5 inline-flex items-center justify-center">{inboxUnread > 99 ? '99+' : inboxUnread}</span>
              )}
            </button>
            <button
              onClick={() => setShowArchived(true)}
              className={`px-3 py-1.5 text-xs rounded-full border ${showArchived ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-700 border-gray-300 hover:bg-gray-100'}`}
            >
              Archived{archivedUnread > 0 && (
                <span className="ml-2 bg-blue-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1.5 inline-flex items-center justify-center">{archivedUnread > 99 ? '99+' : archivedUnread}</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Conversation list */}
      {compact && (
        <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center space-x-2">
          <button
            onClick={() => setShowArchived(false)}
            className={`px-3 py-1.5 text-xs rounded-full border ${!showArchived ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-700 border-gray-300 hover:bg-gray-100'}`}
          >
            Inbox{inboxUnread > 0 && (
              <span className="ml-2 bg-blue-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1.5 inline-flex items-center justify-center">{inboxUnread > 99 ? '99+' : inboxUnread}</span>
            )}
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={`px-3 py-1.5 text-xs rounded-full border ${showArchived ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-700 border-gray-300 hover:bg-gray-100'}`}
          >
            Archived{archivedUnread > 0 && (
              <span className="ml-2 bg-blue-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1.5 inline-flex items-center justify-center">{archivedUnread > 99 ? '99+' : archivedUnread}</span>
            )}
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p>No conversations yet</p>
            <p className="text-sm mt-1 text-gray-400">Start chatting with someone</p>
          </div>
        ) : (
          visible.map((c) => {
            const m = conversationMetadata[c.id];
            const isSelected = selectedConversationId === c.id;
            return (
              <div
                key={c.id}
                onClick={() => onSelectConversation(c)}
                className={`group relative flex items-center px-4 py-3 cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-blue-50 border-l-4 border-blue-600"
                    : "hover:bg-gray-50 border-l-4 border-transparent"
                }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-500 text-white flex items-center justify-center font-semibold text-lg shadow-sm">
                    {c.other_user.full_name?.[0] || "U"}
                  </div>
                  {(c.unread_count ?? 0) > 0 && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 border-2 border-white rounded-full"></span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 ml-3">
                  <div className="flex justify-between items-center pr-8">
                    <div className="flex items-center min-w-0">
                      <p className={`${(c.unread_count ?? 0) > 0 ? 'font-bold' : 'font-semibold'} text-gray-900 truncate`}>{c.other_user.full_name}</p>
                      {m?.isStarred && (
                        <Star className="w-4 h-4 ml-1 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                      )}
                      {m?.isMuted && (
                        <VolumeX className="w-4 h-4 ml-1 text-gray-400 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center flex-shrink-0">
                      {c.last_message?.created_at && (
                        <span className={`text-xs ${((c.unread_count ?? 0) > 0) ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>{formatTime(c.last_message.created_at)}</span>
                      )}
                      {(c.unread_count ?? 0) > 0 && (
                        <span className="ml-2 bg-blue-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1.5 flex items-center justify-center">
                          {c.unread_count! > 99 ? '99+' : c.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{c.other_user.profession}</p>
                  <p className="text-sm text-gray-700 truncate mt-0.5">
                    {((c.unread_count ?? 0) > 0) ? (
                      <span className="text-gray-900 font-medium">{c.last_message?.content}</span>
                    ) : (
                      c.last_message?.content || <span className="text-gray-400 italic">No messages yet</span>
                    )}
                  </p>
                </div>

                {/* Menu */}
                <div className="absolute top-2 right-2" ref={menuOpenId === c.id ? menuRef : null}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId(menuOpenId === c.id ? null : c.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded transition"
                  >
                    <MoreHorizontal className="w-5 h-5 text-gray-500" />
                  </button>
                  {menuOpenId === c.id && (
                    <div className="absolute right-0 top-8 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                      <button
                        onClick={(e) => handleMarkAsUnread(c.id, e)}
                        className="flex w-full items-center px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Mark as unread
                      </button>
                      <button
                        onClick={(e) => handleToggleStar(c.id, e)}
                        className="flex w-full items-center px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
                      >
                        <Star className={`${m?.isStarred ? 'text-yellow-500 fill-yellow-500' : ''} w-4 h-4 mr-2`} />
                        {m?.isStarred ? "Unstar" : "Star"}
                      </button>
                      <button
                        onClick={(e) => handleToggleMute(c.id, e)}
                        className="flex w-full items-center px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
                      >
                        {m?.isMuted ? (
                          <Volume2 className="w-4 h-4 mr-2" />
                        ) : (
                          <VolumeX className="w-4 h-4 mr-2" />
                        )}
                        {m?.isMuted ? "Unmute" : "Mute"}
                      </button>
                      <button
                        onClick={(e) => handleToggleArchive(c.id, e)}
                        className="flex w-full items-center px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
                      >
                        <Archive className="w-4 h-4 mr-2" />
                        {m?.isArchived ? "Unarchive" : "Archive"}
                      </button>
                      <button
                        className="flex w-full items-center px-4 py-2 hover:bg-gray-50 text-sm text-red-600"
                      >
                        <ShieldAlert className="w-4 h-4 mr-2" />
                        Report / Block
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          supabase.from("conversations").delete().eq("id", c.id);
                          loadConversations();
                          setMenuOpenId(null);
                        }}
                        className="flex w-full items-center px-4 py-2 hover:bg-gray-50 text-sm text-red-600 border-t"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function SidebarComponent({ searchTerm, setSearchTerm, filters, setFilters, onProfileClick, therapists }: any) {
  const [isProfessionOpen, setIsProfessionOpen] = useState(false)
  const [isLanguagesOpen, setIsLanguagesOpen] = useState(false)
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false)

  const professions = [
    'Physiotherapist',
    'Occupational Therapist',
    'Speech & Language Therapist',
    'Dietitian',
    'Podiatrist',
  ]

  const languages = [
    'English', 'Turkish', 'Spanish', 'French', 'German', 'Italian',
    'Portuguese', 'Arabic', 'Hindi', 'Urdu', 'Polish', 'Romanian',
  ]

  return (
    <div className="w-80 bg-white shadow-sm border-r flex flex-col overflow-hidden">
      {/* Search - Always visible */}
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Find Therapists</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name, city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Filters - Collapsible */}
      <div className="border-b">
        <button
          onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <span className="font-medium text-gray-900 text-sm">Filters</span>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isFiltersExpanded ? 'rotate-180' : ''}`} />
        </button>

        {isFiltersExpanded && (
          <div className="px-4 pb-4 space-y-3">
            {/* Profession Filter - Compact */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Profession</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsProfessionOpen(!isProfessionOpen)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between"
                >
                  <span className="text-gray-700 truncate">
                    {filters.professions.length === 0
                      ? 'All'
                      : `${filters.professions.length} selected`}
                  </span>
                  <ChevronDown className="w-3 h-3 text-gray-500 flex-shrink-0" />
                </button>

                {isProfessionOpen && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {professions.map((profession) => (
                      <label
                        key={profession}
                        className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={filters.professions.includes(profession)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters({ ...filters, professions: [...filters.professions, profession] })
                            } else {
                              setFilters({
                                ...filters,
                                professions: filters.professions.filter((p: string) => p !== profession)
                              })
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-xs text-gray-700">{profession}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {filters.professions.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {filters.professions.map((profession: string) => (
                    <span
                      key={profession}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800"
                    >
                      {profession.split(' ')[0]}
                      <button
                        type="button"
                        onClick={() =>
                          setFilters({
                            ...filters,
                            professions: filters.professions.filter((p: string) => p !== profession)
                          })
                        }
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Languages Filter - Compact */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Languages</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsLanguagesOpen(!isLanguagesOpen)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between"
                >
                  <span className="text-gray-700 truncate">
                    {filters.languages.length === 0
                      ? 'All'
                      : `${filters.languages.length} selected`}
                  </span>
                  <ChevronDown className="w-3 h-3 text-gray-500 flex-shrink-0" />
                </button>

                {isLanguagesOpen && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {languages.map((language) => (
                      <label
                        key={language}
                        className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={filters.languages.includes(language)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters({ ...filters, languages: [...filters.languages, language] })
                            } else {
                              setFilters({
                                ...filters,
                                languages: filters.languages.filter((l: string) => l !== language)
                              })
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-xs text-gray-700">{language}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {filters.languages.length > 0 && (
                <>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {filters.languages.map((language: string) => (
                      <span
                        key={language}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800"
                      >
                        {language}
                        <button
                          type="button"
                          onClick={() =>
                            setFilters({
                              ...filters,
                              languages: filters.languages.filter((l: string) => l !== language)
                            })
                          }
                          className="ml-1 text-green-600 hover:text-green-800"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="mt-2">
                    <div className="flex space-x-3 text-xs">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="languageMode"
                          value="OR"
                          checked={filters.languageMode === 'OR'}
                          onChange={() => setFilters({ ...filters, languageMode: 'OR' })}
                          className="mr-1"
                        />
                        <span className="text-gray-700">Any</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="languageMode"
                          value="AND"
                          checked={filters.languageMode === 'AND'}
                          onChange={() => setFilters({ ...filters, languageMode: 'AND' })}
                          className="mr-1"
                        />
                        <span className="text-gray-700">All</span>
                      </label>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto p-4">
          <TherapistsList 
            filters={filters} 
            searchTerm={searchTerm} 
            onProfileClick={onProfileClick}
            therapists={therapists}
          />
        </div>
    </div>
  )
}

// New component for therapist list
function TherapistsList({ filters, searchTerm, onProfileClick, therapists }: any) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const filteredTherapists = therapists.filter((therapist: Profile) => {
    const matchesSearch = therapist.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         therapist.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         therapist.county?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesProfession = filters.professions.length === 0 || 
                            filters.professions.includes(therapist.profession)
    
    const matchesLanguages = filters.languages.length === 0 || 
      (filters.languageMode === 'OR' 
        ? filters.languages.some((lang: string) => therapist.languages?.includes(lang))
        : filters.languages.every((lang: string) => therapist.languages?.includes(lang)))
    
    return matchesSearch && matchesProfession && matchesLanguages
  })

  const calculateExperience = (month?: string, year?: string) => {
    if (!year) return null
    const startDate = new Date(`${month || 'January'} 1, ${year}`)
    const now = new Date()
    const diffYears = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    return diffYears.toFixed(1)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">
          Results ({filteredTherapists.length})
        </h3>
      </div>

      <div className="space-y-2">
        {filteredTherapists.map((therapist: Profile) => {
          const experience = calculateExperience(therapist.experience_month, therapist.experience_year)
          const isHovered = hoveredId === therapist.id
          
          return (
            <div
              key={therapist.id}
              onClick={() => onProfileClick(therapist.id)}
              onMouseEnter={() => setHoveredId(therapist.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all cursor-pointer ${
                isHovered ? 'scale-105' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {therapist.full_name?.charAt(0) || 'T'}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-gray-900">
                    {therapist.full_name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <p className="text-xs text-blue-600 font-medium">
                      {therapist.profession}
                    </p>
                    {experience && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
                        {experience} yrs
                      </span>
                    )}
                  </div>
                  {therapist.city && (
                    <p className="text-xs text-gray-500 mt-1">
                      📍 {therapist.city}, {therapist.county}
                    </p>
                  )}
                  
                  {/* Expanded info on hover */}
                  {isHovered && (
                    <div className="mt-3 space-y-2 animate-fadeIn">
                      {therapist.languages && therapist.languages.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-700 mb-1">Languages:</p>
                          <div className="flex flex-wrap gap-1">
                            {therapist.languages.map((lang: string) => (
                              <span key={lang} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                {lang}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {therapist.specialties && therapist.specialties.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-700 mb-1">Specialties:</p>
                          <div className="flex flex-wrap gap-1">
                            {therapist.specialties.map((spec: string) => (
                              <span key={spec} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                {spec}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {therapist.offers_remote && (
                        <p className="text-xs text-green-600 font-medium">✅ Offers Remote Sessions</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

function MapComponent({ therapists, geocodeLocation, onProfileClick }: any) {
  const [therapistsWithCoords, setTherapistsWithCoords] = useState<Profile[]>([])

  useEffect(() => {
    async function addCoordinates() {
      const updated = []
      for (const t of therapists) {
        if (t.lat && t.lng) {
          updated.push(t)
        } 
        else if (t.city && t.county) {
          const coords = await geocodeLocation(t.city, t.county)
          if (coords) {
            updated.push({ ...t, lat: coords[0], lng: coords[1] })
          }
        }
      }
      setTherapistsWithCoords(updated)
    }
    addCoordinates()
  }, [therapists])

  const calculateExperience = (month?: string, year?: string) => {
    if (!year) return null
    const startDate = new Date(`${month || 'January'} 1, ${year}`)
    const now = new Date()
    const diffYears = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    return diffYears.toFixed(1)
  }

  return (
    <div className="h-full">
      <MapContainer center={[54.5, -2]} zoom={6} className="h-full w-full">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />
        {therapistsWithCoords.map(t => {
          const experience = calculateExperience(t.experience_month, t.experience_year)
          
          return t.lat && t.lng && (
            <Marker key={t.id} position={[t.lat, t.lng]}>
              <Popup>
                <div className="p-2 min-w-[220px]">
                  <h3 className="font-semibold text-lg text-gray-900">{t.full_name}</h3>
                  <div className="flex items-center gap-2 mt-1 mb-2">
                    <p className="text-blue-600 font-medium text-sm">{t.profession}</p>
                    {experience && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                        {experience} yrs
                      </span>
                    )}
                  </div>
                  {t.languages && t.languages.length > 0 && (
                    <p className="text-sm text-gray-600 mt-2">
                      <strong>Languages:</strong> {t.languages?.join(', ')}
                    </p>
                  )}
                  {t.specialties && t.specialties.length > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>Specialties:</strong> {t.specialties?.join(', ')}
                    </p>
                  )}
                  <p className="text-sm text-gray-600 mt-1">
                    <strong>Location:</strong> {t.city}, {t.county}
                  </p>
                  {t.offers_remote && (
                    <div className="mt-2 bg-blue-50 border border-blue-200 rounded px-2 py-1">
                      <p className="text-xs text-blue-800 font-medium">✅ Offers Remote Sessions</p>
                    </div>
                  )}
                  <button
                    onClick={() => onProfileClick(t.id)}
                    className="w-full mt-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    View Full Profile
                  </button>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}

function ProfileDetailPage({ 
  profileId, 
  onClose, 
  currentUserId,
  onStartConversation,
  connections,
  connectionRequests,
  onSendConnectionRequest,
  onRemoveConnection
  // onAcceptConnectionRequest ve onRejectConnectionRequest kaldırıldı
}: { 
  profileId: string
  onClose: () => void
  currentUserId?: string
  onStartConversation: (conversation: Conversation) => void
  connections: Connection[]
  connectionRequests: Connection[]
  onSendConnectionRequest: (receiverId: string) => Promise<void>
  onRemoveConnection: (connectionId: string) => Promise<void>
  onAcceptConnectionRequest?: (connectionId: string) => Promise<void>
  onRejectConnectionRequest?: (connectionId: string) => Promise<void>
}) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [tempFormData, setTempFormData] = useState<any>({})
  const [formData, setFormData] = useState({
    aboutMe: '',
    qualifications: [] as any[],
    workExperience: [] as any[],
    contactEmail: '',
    phone: '',
    website: '',
    specialties: [] as string[],
    languages: [] as string[],
    availability: {} as any
  })
  const [expandedItems, setExpandedItems] = useState<{[key: number]: boolean}>({});
  const [connectionStatus, setConnectionStatus] = useState<'not_connected' | 'pending' | 'accepted' | 'rejected'>('not_connected')
  const [showConnectionOptions, setShowConnectionOptions] = useState(false)
  const [connectionId, setConnectionId] = useState<string | null>(null)

  useEffect(() => {
    loadProfile()
  }, [profileId])

  // Connection durumunu kontrol et
  useEffect(() => {
    if (currentUserId && profile) {
      checkConnectionStatus()
    }
  }, [currentUserId, profile, connections, connectionRequests])

  const checkConnectionStatus = async () => {
    if (!currentUserId || !profile) return
    
    try {
      const { data } = await supabase
        .from('connections')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${profile.id}),and(sender_id.eq.${profile.id},receiver_id.eq.${currentUserId})`)
        .single()

      if (data) {
        setConnectionStatus(data.status)
        setConnectionId(data.id)
      } else {
        setConnectionStatus('not_connected')
        setConnectionId(null)
      }
    } catch (err) {
      setConnectionStatus('not_connected')
      setConnectionId(null)
    }
  }

  async function loadProfile() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single()
    
    if (!error && data) {
      setProfile(data)
      setFormData({
        aboutMe: data.about_me || '',
        qualifications: data.qualifications || [],
        workExperience: data.work_experience || [],
        contactEmail: data.contact_email || '',
        phone: data.phone || '',
        website: data.website || '',
        specialties: data.specialties || [],
        languages: data.languages || [],
        availability: data.availability || {}
      })
    }
    setLoading(false)
  }

  const toggleItem = (index: number) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const startEditing = (section: string) => {
    setEditingSection(section)
    setTempFormData({ ...formData })
  }

  const cancelEditing = () => {
    setEditingSection(null)
    setFormData(tempFormData)
  }

  const saveSection = async (section: string) => {
    setLoading(true)
    try {
      const updateData: any = {}
      
      if (section === 'about') {
        updateData.about_me = formData.aboutMe
      } else if (section === 'qualifications') {
        updateData.qualifications = formData.qualifications
      } else if (section === 'experience') {
        updateData.work_experience = formData.workExperience
      } else if (section === 'contact') {
        updateData.contact_email = formData.contactEmail
        updateData.phone = formData.phone
        updateData.website = formData.website
      } else if (section === 'specialties') {
        updateData.specialties = formData.specialties
      } else if (section === 'languages') {
        updateData.languages = formData.languages
      } else if (section === 'availability') {
        updateData.availability = formData.availability
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profileId)
      
      if (error) throw error
      
      setEditingSection(null)
      loadProfile()
    } catch (err: any) {
      console.error('Update error:', err)
      alert(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const calculateTotalExperience = (workExperience: any[]) => {
    if (!workExperience || workExperience.length === 0) return '0'
    
    let totalMonths = 0
    
    workExperience.forEach((exp: any) => {
      const startDate = exp.start_date ? new Date(exp.start_date + '-01') : null
      const endDate = exp.end_date?.toLowerCase() === 'present' ? new Date() : 
                     (exp.end_date ? new Date(exp.end_date + '-01') : null)
      
      if (startDate && endDate) {
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
        const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.44))
        totalMonths += diffMonths
      }
    })
    
    const totalYears = (totalMonths / 12).toFixed(1)
    return totalYears
  }

  const handleConnect = async () => {
    if (!currentUserId) {
      alert('Please sign in to connect with therapists')
      return
    }

    if (!profile) return

    try {
      await onSendConnectionRequest(profile.id)
      setConnectionStatus('pending')
      alert('Connection request sent!')
      
    } catch (err: any) {
      console.error('Error sending connection request:', err)
      alert('Failed to send connection request')
    }
  }

  const handleMessage = async () => {
    if (!currentUserId || !profile) return
    
    // Mevcut mesajlaşma fonksiyonunu kullan
    const { data: existingConversations } = await supabase
      .from('conversations')
      .select('*, user1:profiles!user1_id(*), user2:profiles!user2_id(*)')
      .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${profile.id}),and(user1_id.eq.${profile.id},user2_id.eq.${currentUserId})`)

    let conversation

    if (existingConversations && existingConversations.length > 0) {
      const conv = existingConversations[0]
      conversation = {
        ...conv,
        other_user: conv.user1_id === currentUserId ? conv.user2 : conv.user1
      }
    } else {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          user1_id: currentUserId,
          user2_id: profile.id
        })
        .select('*, user1:profiles!user1_id(*), user2:profiles!user2_id(*)')
        .single()

      if (newConv) {
        conversation = {
          ...newConv,
          other_user: newConv.user1_id === currentUserId ? newConv.user2 : newConv.user1
        }
      }
    }

    if (conversation) {
      onStartConversation(conversation)
    }
  }

  // Contact butonları için render fonksiyonu
  const renderContactButtons = () => {
    if (!profile) return null
    const isOwnProfile = currentUserId === profileId
    
    if (isOwnProfile) {
      return (
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('openAuthModal'))}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </button>
        </div>
      )
    }

    return (
      <div className="flex gap-3 flex-wrap">
        {/* Message Button - Her zaman görünür */}
        <button
          onClick={handleMessage}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          Message
        </button>

        {/* Connect Button - Connection durumuna göre değişir */}
        {connectionStatus === 'not_connected' && (
          <button
            onClick={handleConnect}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Connect
          </button>
        )}

        {connectionStatus === 'pending' && (
          <button
            disabled
            className="flex items-center gap-2 px-6 py-3 bg-gray-400 text-white rounded-lg font-medium cursor-not-allowed"
          >
            <Clock className="w-4 h-4" />
            Pending
          </button>
        )}

        {connectionStatus === 'accepted' && connectionId && (
          <div className="relative">
            <button
              onClick={() => setShowConnectionOptions(!showConnectionOptions)}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
            >
              <UserCheck className="w-4 h-4" />
              Connected
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {showConnectionOptions && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <button
                  onClick={() => {
                    onRemoveConnection(connectionId)
                    setConnectionStatus('not_connected')
                    setShowConnectionOptions(false)
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 rounded-lg"
                >
                  Remove Connection
                </button>
              </div>
            )}
          </div>
        )}

        {/* Contact Buttons */}
        {profile.contact_email && (
          <a 
            href={`mailto:${profile.contact_email}?subject=Contact from UK Therapist Network&body=Hello ${profile.full_name}, I found your profile on UK Therapist Network and would like to get in touch.`}
            className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            <Mail className="w-4 h-4" />
            Email
          </a>
        )}
        
        {profile.phone && (
          <a 
            href={`tel:${profile.phone}`}
            className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            <Phone className="w-4 h-4" />
            Call
          </a>
        )}
      </div>
    )
  }

  const isOwnProfile = currentUserId === profileId

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Profile not found</p>
          <button onClick={onClose} className="text-blue-600 hover:text-blue-700">
            Go back
          </button>
        </div>
      </div>
    )
  }

  const totalExperience = calculateTotalExperience(profile.work_experience || [])

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <button
            onClick={onClose}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Map
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Profile Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
          <div className="flex items-start gap-6">
            <div className="w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center text-white text-5xl font-bold flex-shrink-0">
              {profile.full_name?.charAt(0) || 'T'}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{profile.full_name}</h1>
              <div className="flex items-center gap-3 mb-4">
                <p className="text-xl text-blue-600 font-medium">{profile.profession}</p>
                {totalExperience !== '0' && (
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {totalExperience} years total experience
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{profile.city}, {profile.county}</span>
                </div>
                {profile.offers_remote && (
                  <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                    ✅ Remote Available
                  </span>
                )}
              </div>
              
              {/* Contact Buttons */}
              {renderContactButtons()}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="col-span-2 space-y-6">
            {/* About Me */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative group">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  About Me
                </h2>
                {isOwnProfile && (
                  editingSection === 'about' ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => saveSection('about')}
                        disabled={loading}
                        className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditing('about')}
                      className="edit-icon hidden group-hover:flex p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )
                )}
              </div>
              
              {editingSection === 'about' && isOwnProfile ? (
                <textarea
                  placeholder="Tell others about yourself, your experience, and approach..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-[120px]"
                  value={formData.aboutMe}
                  onChange={(e) => setFormData({ ...formData, aboutMe: e.target.value })}
                />
              ) : profile.about_me ? (
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{profile.about_me}</p>
              ) : (
                <p className="text-gray-400 italic">No about me information provided yet.</p>
              )}
            </div>

            {/* Work Experience */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative group">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  Work Experience
                </h2>
                {isOwnProfile && (
                  editingSection === 'experience' ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => saveSection('experience')}
                        disabled={loading}
                        className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditing('experience')}
                      className="edit-icon hidden group-hover:flex p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )
                )}
              </div>
              
              {editingSection === 'experience' && isOwnProfile ? (
                <div className="space-y-4">
                  {formData.workExperience.map((exp: any, index: number) => {
                    const isCurrentJob = exp.end_date?.toLowerCase() === 'present'
                    return (
                      <div key={index} className="border border-gray-300 rounded-lg p-4 space-y-3">
                        <input 
                          type="text"
                          placeholder="Job Title"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          value={exp.title || ''}
                          onChange={(e) => {
                            const updated = [...formData.workExperience]
                            updated[index].title = e.target.value
                            setFormData({ ...formData, workExperience: updated })
                          }}
                        />
                        <input 
                          type="text"
                          placeholder="Organization"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          value={exp.organization || ''}
                          onChange={(e) => {
                            const updated = [...formData.workExperience]
                            updated[index].organization = e.target.value
                            setFormData({ ...formData, workExperience: updated })
                          }}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input 
                            type="text"
                            placeholder="Start Date (e.g., 2020-01)"
                            className="px-3 py-2 border border-gray-300 rounded-lg"
                            value={exp.start_date || ''}
                            onChange={(e) => {
                              const updated = [...formData.workExperience]
                              updated[index].start_date = e.target.value
                              setFormData({ ...formData, workExperience: updated })
                            }}
                          />
                          <div className="flex gap-2">
                            <input 
                              type="text"
                              placeholder={isCurrentJob ? "Present" : "End Date (e.g., 2022-12)"}
                              className={`flex-1 px-3 py-2 border border-gray-300 rounded-lg ${isCurrentJob ? 'bg-gray-100' : ''}`}
                              value={isCurrentJob ? "Present" : (exp.end_date || '')}
                              disabled={isCurrentJob}
                              onChange={(e) => {
                                const updated = [...formData.workExperience]
                                updated[index].end_date = e.target.value
                                setFormData({ ...formData, workExperience: updated })
                              }}
                            />
                          </div>
                        </div>
                        <label className="flex items-center gap-2">
                          <input 
                            type="checkbox"
                            checked={isCurrentJob}
                            onChange={(e) => {
                              const updated = [...formData.workExperience]
                              updated[index].end_date = e.target.checked ? 'Present' : ''
                              setFormData({ ...formData, workExperience: updated })
                            }}
                          />
                          <span className="text-gray-700">I currently work here</span>
                        </label>
                        <textarea
                          placeholder="Description (optional)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          rows={2}
                          value={exp.description || ''}
                          onChange={(e) => {
                            const updated = [...formData.workExperience]
                            updated[index].description = e.target.value
                            setFormData({ ...formData, workExperience: updated })
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = formData.workExperience.filter((_, i) => i !== index)
                            setFormData({ ...formData, workExperience: updated })
                          }}
                          className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        workExperience: [...formData.workExperience, { title: '', organization: '', start_date: '', end_date: '', description: '' }]
                      })
                    }}
                    className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600"
                  >
                    + Add Experience
                  </button>
                </div>
              ) : profile.work_experience && profile.work_experience.length > 0 ? (
                <div className="space-y-4">
                  {profile.work_experience.map((exp: any, index: number) => {
                    const isCurrentJob = exp.end_date?.toLowerCase() === 'present'
                    const startDate = exp.start_date ? new Date(exp.start_date + '-01') : null
                    const endDate = isCurrentJob ? new Date() : (exp.end_date ? new Date(exp.end_date + '-01') : null)
                    
                    let duration = ''
                    if (startDate && endDate) {
                      const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
                      const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25))
                      const diffMonths = Math.floor((diffTime % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44))
                      
                      if (diffYears > 0) {
                        duration = `${diffYears} year${diffYears > 1 ? 's' : ''}`
                        if (diffMonths > 0) {
                          duration += ` ${diffMonths} month${diffMonths > 1 ? 's' : ''}`
                        }
                      } else {
                        duration = `${diffMonths} month${diffMonths > 1 ? 's' : ''}`
                      }
                    }

                    return (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{exp.title}</h3>
                            <p className="text-blue-600 text-sm font-medium">{exp.organization}</p>
                            <p className="text-gray-500 text-sm mt-1">
                              {exp.start_date} - {exp.end_date || 'Present'}
                              {duration && <span className="text-green-600 font-medium"> • {duration}</span>}
                            </p>
                          </div>
                          {exp.description && (
                            <button
                              onClick={() => toggleItem(index)}
                              className="ml-2 text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0"
                            >
                              <ChevronDown className={`w-4 h-4 transition-transform ${expandedItems[index] ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                        </div>
                        {exp.description && expandedItems[index] && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-gray-700 whitespace-pre-line">{exp.description}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-gray-400 italic">No work experience added yet.</p>
              )}
            </div>

            {/* Qualifications */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative group">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-600" />
                  Qualifications & Certifications
                </h2>
                {isOwnProfile && (
                  editingSection === 'qualifications' ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => saveSection('qualifications')}
                        disabled={loading}
                        className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditing('qualifications')}
                      className="edit-icon hidden group-hover:flex p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )
                )}
              </div>
              
              {editingSection === 'qualifications' && isOwnProfile ? (
                <div className="space-y-4">
                  {formData.qualifications.map((qual: any, index: number) => (
                    <div key={index} className="border border-gray-300 rounded-lg p-4 space-y-2">
                      <input 
                        type="text"
                        placeholder="Qualification Title"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        value={qual.title || ''}
                        onChange={(e) => {
                          const updated = [...formData.qualifications]
                          updated[index].title = e.target.value
                          setFormData({ ...formData, qualifications: updated })
                        }}
                      />
                      <input 
                        type="text"
                        placeholder="Institution"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        value={qual.institution || ''}
                        onChange={(e) => {
                          const updated = [...formData.qualifications]
                          updated[index].institution = e.target.value
                          setFormData({ ...formData, qualifications: updated })
                        }}
                      />
                      <input 
                        type="text"
                        placeholder="Year"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        value={qual.year || ''}
                        onChange={(e) => {
                          const updated = [...formData.qualifications]
                          updated[index].year = e.target.value
                          setFormData({ ...formData, qualifications: updated })
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = formData.qualifications.filter((_, i) => i !== index)
                          setFormData({ ...formData, qualifications: updated })
                        }}
                        className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        qualifications: [...formData.qualifications, { title: '', institution: '', year: '' }]
                      })
                    }}
                    className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600"
                  >
                    + Add Qualification
                  </button>
                </div>
              ) : profile.qualifications && profile.qualifications.length > 0 ? (
                <div className="space-y-4">
                  {profile.qualifications.map((qual: any, index: number) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900">{qual.title}</h3>
                      <p className="text-blue-600 text-sm">{qual.institution}</p>
                      <p className="text-gray-500 text-sm mt-1">{qual.year}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 italic">No qualifications added yet.</p>
              )}
            </div>
          </div>

          {/* Right Column - Sidebar Info */}
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative group">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-bold text-gray-900">Contact Information</h3>
                {isOwnProfile && (
                  editingSection === 'contact' ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => saveSection('contact')}
                        disabled={loading}
                        className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditing('contact')}
                      className="edit-icon hidden group-hover:flex p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )
                )}
              </div>
              
              {editingSection === 'contact' && isOwnProfile ? (
                <div className="space-y-3">
                  <input 
                    type="email"
                    placeholder="Contact Email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  />
                  <input 
                    type="tel"
                    placeholder="Phone Number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                  <input 
                    type="url"
                    placeholder="Website"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {profile.contact_email && (
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">{profile.contact_email}</span>
                    </div>
                  )}
                  {profile.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">{profile.phone}</span>
                    </div>
                  )}
                  {profile.website && (
                    <div className="flex items-center gap-3 text-sm">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Website
                      </a>
                    </div>
                  )}
                  {!profile.contact_email && !profile.phone && !profile.website && (
                    <p className="text-sm text-gray-400 italic">No contact information provided</p>
                  )}
                  {profile.regulator_number && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-gray-500 mb-1">Registration Number</p>
                      <p className="text-sm font-medium text-gray-900">{profile.regulator_number}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Specialties */}
            {profile.specialties && profile.specialties.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative group">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-bold text-gray-900">Specialties</h3>
                  {isOwnProfile && (
                    editingSection === 'specialties' ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => saveSection('specialties')}
                          disabled={loading}
                          className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing('specialties')}
                        className="edit-icon hidden group-hover:flex p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )
                  )}
                </div>
                
                {editingSection === 'specialties' && isOwnProfile ? (
                  <div className="space-y-2">
                    {formData.specialties.map((s: string, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <input 
                          type="text"
                          value={s}
                          onChange={(e) => {
                            const updated = [...formData.specialties]
                            updated[index] = e.target.value
                            setFormData({ ...formData, specialties: updated })
                          }}
                          className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm"
                        />
                        <button
                          onClick={() => {
                            const updated = formData.specialties.filter((_, i) => i !== index)
                            setFormData({ ...formData, specialties: updated })
                          }}
                          className="p-1 text-red-500 hover:text-red-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setFormData({ ...formData, specialties: [...formData.specialties, ''] })}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add Specialty
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {profile.specialties.map((s: string) => (
                      <span key={s} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Languages */}
            {profile.languages && profile.languages.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative group">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-bold text-gray-900">Languages</h3>
                  {isOwnProfile && (
                    editingSection === 'languages' ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => saveSection('languages')}
                          disabled={loading}
                          className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing('languages')}
                        className="edit-icon hidden group-hover:flex p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )
                  )}
                </div>
                
                {editingSection === 'languages' && isOwnProfile ? (
                  <div className="space-y-2">
                    {formData.languages.map((l: string, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <input 
                          type="text"
                          value={l}
                          onChange={(e) => {
                            const updated = [...formData.languages]
                            updated[index] = e.target.value
                            setFormData({ ...formData, languages: updated })
                          }}
                          className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm"
                        />
                        <button
                          onClick={() => {
                            const updated = formData.languages.filter((_, i) => i !== index)
                            setFormData({ ...formData, languages: updated })
                          }}
                          className="p-1 text-red-500 hover:text-red-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setFormData({ ...formData, languages: [...formData.languages, ''] })}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add Language
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {profile.languages.map((l: string) => (
                      <span key={l} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                        {l}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Availability */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative group">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Availability
                </h3>
                {isOwnProfile && (
                  editingSection === 'availability' ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => saveSection('availability')}
                        disabled={loading}
                        className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditing('availability')}
                      className="edit-icon hidden group-hover:flex p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )
                )}
              </div>
              
              {editingSection === 'availability' && isOwnProfile ? (
                <div className="space-y-3">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                    <div key={day} className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700 capitalize">{day}</label>
                      <input 
                        type="text"
                        placeholder="e.g., 9:00-17:00"
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                        value={formData.availability[day] || ''}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            availability: {
                              ...formData.availability,
                              [day]: e.target.value
                            }
                          })
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : profile.availability && Object.keys(profile.availability).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(profile.availability).map(([day, hours]: [string, any]) => (
                    <div key={day} className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700 capitalize">{day}</span>
                      <span className="text-gray-600">{Array.isArray(hours) ? hours.join(', ') : hours}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 italic text-sm">Availability not set</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CommunityComponent() {
  const posts = [
    {
      id: 1,
      author: 'Sarah Johnson',
      profession: 'Physiotherapist',
      title: 'Best practices for sports injury rehabilitation',
      content: 'Looking for advice on modern approaches to ACL rehabilitation...',
      replies: 12,
      time: '2 hours ago'
    },
    {
      id: 2,
      author: 'Ahmed Hassan',
      profession: 'Occupational Therapist',
      title: 'Pediatric OT resources in Birmingham area',
      content: 'Does anyone know good resources for sensory integration therapy for children?',
      replies: 8,
      time: '5 hours ago'
    }
  ]

  return (
    <div className="flex-1 bg-gray-50 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Users className="w-6 h-6 mr-2 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Community</h2>
          </div>
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            New Post
          </button>
        </div>

        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{post.title}</h3>
                  <p className="text-sm text-gray-600">
                    by <span className="font-medium">{post.author}</span> • {post.profession} • {post.time}
                  </p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-4">{post.content}</p>
              
              <div className="flex items-center text-sm text-gray-500">
                <MessageSquare className="w-4 h-4 mr-1" />
                {post.replies} replies
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AuthModalComponent({ onClose, onSuccess, currentUser, userProfile, onOpenProfileDetail }: any) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [tempFormData, setTempFormData] = useState<any>({})
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    profession: '',
    registrationNumber: '',
    experienceMonth: '',
    experienceYear: '',
    specialties: [] as string[],
    languages: [] as string[],
    city: '',
    county: '',
    lat: null as number | null,
    lng: null as number | null,
    offersRemote: false,
    acceptTerms: false,
    aboutMe: '',
    phone: '',
    website: '',
    qualifications: [] as any[],
    workExperience: [] as any[],
    availability: {} as any,
    contactEmail: '',
    useSignupEmailAsContact: true
  })
  const [expandedItems, setExpandedItems] = useState<{[key: number]: boolean}>({});

  const [dropdowns, setDropdowns] = useState({
    specialties: false,
    languages: false
  })

  const [locationSearch, setLocationSearch] = useState('')
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([])
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false)
  const [isSearchingLocation, setIsSearchingLocation] = useState(false)

  const specialtiesRef = useRef<HTMLDivElement>(null)
  const languagesRef = useRef<HTMLDivElement>(null)
  const locationRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (userProfile && !editingSection) {
      setFormData({
        firstName: userProfile.full_name?.split(' ')[0] || '',
        lastName: userProfile.full_name?.split(' ').slice(1).join(' ') || '',
        email: currentUser?.email || '',
        password: '',
        profession: userProfile.profession || '',
        registrationNumber: userProfile.regulator_number || '',
        experienceMonth: userProfile.experience_month || '',
        experienceYear: userProfile.experience_year || '',
        specialties: userProfile.specialties || [],
        languages: userProfile.languages || [],
        city: userProfile.city || '',
        county: userProfile.county || '',
        lat: userProfile.lat,
        lng: userProfile.lng,
        offersRemote: userProfile.offers_remote || false,
        acceptTerms: true,
        aboutMe: userProfile.about_me || '',
        phone: userProfile.phone || '',
        website: userProfile.website || '',
        qualifications: userProfile.qualifications || [],
        workExperience: userProfile.work_experience || [],
        availability: userProfile.availability || {},
        contactEmail: userProfile.contact_email || '',
        useSignupEmailAsContact: true
      })
      if (userProfile.city && userProfile.county) {
        setLocationSearch(`${userProfile.city}, ${userProfile.county}`)
      }
    }
  }, [userProfile, currentUser, editingSection])

  const calculateTotalExperience = (workExperience: any[]) => {
    if (!workExperience || workExperience.length === 0) return '0'
    
    let totalDays = 0
    
    workExperience.forEach((exp: any) => {
      const startDate = exp.start_date ? new Date(exp.start_date) : null
      const endDate = exp.end_date?.toLowerCase() === 'present' ? new Date() : 
                    (exp.end_date ? new Date(exp.end_date) : null)  
      
      if (startDate && endDate) {
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        totalDays += diffDays
      }
    })
    
    const totalYears = (totalDays / 365.25).toFixed(1)
    return totalYears
  }

  const toggleItem = (index: number) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const startEditing = (section: string) => {
    setEditingSection(section)
    setTempFormData({ ...formData })
  }

  const cancelEditing = () => {
    setEditingSection(null)
    setFormData(tempFormData)
    setLocationSearch(tempFormData.city && tempFormData.county ? `${tempFormData.city}, ${tempFormData.county}` : '')
  }

  const saveSection = async (section: string) => {
    setLoading(true)
    try {
      const updateData: any = {}
      
      if (section === 'email') {
        const { error: authError } = await supabase.auth.updateUser({
          email: formData.email
        })
        if (authError) throw authError
        
        updateData.email = formData.email
      } else if (section === 'registration') {
        updateData.regulator_number = formData.registrationNumber
        updateData.experience_month = formData.experienceMonth
        updateData.experience_year = formData.experienceYear
      } else if (section === 'specialties') {
        updateData.specialties = formData.specialties
      } else if (section === 'languages') {
        updateData.languages = formData.languages
      } else if (section === 'location') {
        updateData.city = formData.city
        updateData.county = formData.county
        updateData.lat = formData.lat
        updateData.lng = formData.lng
        updateData.offers_remote = formData.offersRemote
      } else if (section === 'about') {
        updateData.about_me = formData.aboutMe
      } else if (section === 'qualifications') {
        updateData.qualifications = formData.qualifications
      } else if (section === 'experience') {
        updateData.work_experience = formData.workExperience
      } else if (section === 'contact') {
        updateData.contact_email = formData.contactEmail
        updateData.phone = formData.phone
        updateData.website = formData.website
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', currentUser.id)
      
      if (error) throw error
      
      if (section === 'email') {
        alert('Email updated! Please check your new email for verification.')
      }
      
      setEditingSection(null)
    } catch (err: any) {
      console.error('Update error:', err)
      alert(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (specialtiesRef.current && !specialtiesRef.current.contains(event.target as Node)) {
        setDropdowns(prev => ({ ...prev, specialties: false }))
      }
      if (languagesRef.current && !languagesRef.current.contains(event.target as Node)) {
        setDropdowns(prev => ({ ...prev, languages: false }))
      }
      if (locationRef.current && !locationRef.current.contains(event.target as Node)) {
        setShowLocationSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (locationSearch.length < 3) {
      setLocationSuggestions([])
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsSearchingLocation(true)
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationSearch)}&format=json&limit=5&countrycodes=gb&addressdetails=1`
        )
        const data = await response.json()
        setLocationSuggestions(data)
        setShowLocationSuggestions(true)
      } catch (error) {
        console.error('Location search error:', error)
      } finally {
        setIsSearchingLocation(false)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [locationSearch])

  const professions = [
    'Physiotherapist',
    'Occupational Therapist',
    'Speech & Language Therapist',
    'Dietitian',
    'Podiatrist'
  ]

  const specialtiesOptions = [
    'Orthopaedics', 'Neurology', 'Cardiorespiratory', 'Paediatrics',
    'Mental Health', 'Community Care', 'Acute Care', 'Sports Medicine',
    'Geriatrics', 'Oncology', 'Dysphagia', 'Voice Disorders'
  ]

  const languageOptions = [
    'English', 'Turkish', 'Spanish', 'French', 'German', 'Italian',
    'Portuguese', 'Arabic', 'Hindi', 'Urdu', 'Polish', 'Romanian'
  ]
  
  const handleLocationSelect = (suggestion: any) => {
    const city = suggestion.address.city || 
                 suggestion.address.town || 
                 suggestion.address.village || 
                 suggestion.address.hamlet || ''
    const county = suggestion.address.county || 
                   suggestion.address.state || ''
    
    setFormData({
      ...formData,
      city: city,
      county: county,
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon)
    })
    setLocationSearch(suggestion.display_name)
    setShowLocationSuggestions(false)
  }

  const handleSignOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        alert('Error signing out: ' + error.message);
      } else {
        console.log('Signed out successfully');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error('Sign out error:', err);
      alert('Error signing out');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProfileDetail = () => {
    if (currentUser?.id) {
      onClose()
      onOpenProfileDetail(currentUser.id)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSignUp) {
      if (!formData.acceptTerms) {
        alert('Please accept Terms & Privacy Policy')
        return
      }
      setLoading(true)
      try {
        const fullName = `${formData.firstName} ${formData.lastName}`.trim()
        
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: fullName
            }
          }
        })
        
        if (error) {
          console.error('Auth signup error:', error)
          throw new Error(`Sign up failed: ${error.message}`)
        }
        
        const user = data.user
        const session = data.session
        
        if (!user || !user.id) {
          throw new Error('User creation failed - no user ID returned')
        }
        
        console.log('User created with ID:', user.id)
        console.log('Session:', session ? 'Active' : 'No session')
        
        if (session) {
          await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token
          })
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()
        
        if (!existingProfile) {
          console.log('Creating profile manually...')
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({ id: user.id })
          
          if (insertError && insertError.code !== '23505') {
            console.error('Profile insert error:', insertError)
          }
          
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: formData.email,
            contact_email: formData.useSignupEmailAsContact ? formData.email : formData.contactEmail, 
            full_name: fullName,
            profession: formData.profession,
            regulator_number: formData.registrationNumber,
            experience_month: formData.experienceMonth,
            experience_year: formData.experienceYear,
            specialties: formData.specialties,
            languages: formData.languages,
            city: formData.city,
            county: formData.county,
            lat: formData.lat,
            lng: formData.lng,
            offers_remote: formData.offersRemote,
            about_me: formData.aboutMe || null,
            phone: formData.phone || null,
            website: formData.website || null,
            qualifications: formData.qualifications.length > 0 ? formData.qualifications : [],
            work_experience: formData.workExperience.length > 0 ? formData.workExperience : [],
            availability: Object.keys(formData.availability).length > 0 ? formData.availability : {}
          }, {
            onConflict: 'id'
          })
        
        if (upsertError) {
          console.error('Profile upsert error:', upsertError)
          throw new Error(`Failed to save profile: ${upsertError.message}`)
        }
        
        console.log('Profile saved successfully!')
        alert('Account created successfully! You can now sign in.')
        onSuccess()
        onClose()
      } catch (err: any) {
        console.error('Signup error:', err)
        alert(`Error: ${err.message}`)
      } finally {
        setLoading(false)
      }
    } else {
      setLoading(true)
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        })
        if (error) throw error
        
        alert('Signed in successfully!')
        onSuccess()
        onClose()
      } catch (err: any) {
        console.error('Sign in error:', err)
        alert(`Sign in failed: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b z-10 p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">
              {currentUser ? 'My Profile' : (isSignUp ? 'Join Network' : 'Sign In')}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
  
        <div className="p-6">
          {currentUser ? (
            <div className="space-y-4">
              {/* Profile Header */}
              <div className="bg-blue-50 rounded-xl p-4 mb-4 relative">
                <button
                  onClick={handleOpenProfileDetail}
                  className="absolute top-4 right-4 px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  View Full Profile
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {userProfile?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900">{userProfile?.full_name || 'User'}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-blue-600 font-medium">{userProfile?.profession || 'Therapist'}</p>
                      {(() => {
                        const totalExperience = calculateTotalExperience(userProfile?.work_experience || [])
                        return totalExperience !== '0' && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                            {totalExperience} yrs
                          </span>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              </div>
  
              <div className="space-y-3">
                {/* Email Section - Editable */}
                <div 
                  className="bg-gray-50 rounded-lg p-3 relative group hover:bg-gray-100 transition-colors"
                  onMouseEnter={(e) => e.currentTarget.querySelector('.edit-icon')?.classList.remove('hidden')}
                  onMouseLeave={(e) => e.currentTarget.querySelector('.edit-icon')?.classList.add('hidden')}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Email</p>
                      {editingSection === 'email' ? (
                        <input 
                          type="email"
                          placeholder="Email"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      ) : (
                        <p className="text-sm font-medium text-gray-900">{currentUser.email}</p>
                      )}
                    </div>
                    {editingSection === 'email' ? (
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => saveSection('email')}
                          disabled={loading}
                          className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing('email')}
                        className="edit-icon hidden p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
  
                {/* About Me Section */}
                <div 
                  className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 relative group hover:bg-blue-100 transition-colors"
                  onMouseEnter={(e) => e.currentTarget.querySelector('.edit-icon')?.classList.remove('hidden')}
                  onMouseLeave={(e) => e.currentTarget.querySelector('.edit-icon')?.classList.add('hidden')}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-blue-900 mb-2">📝 About Me</p>
                      {editingSection === 'about' ? (
                        <textarea
                          placeholder="Tell others about yourself, your experience, and approach..."
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg min-h-[120px]"
                          value={formData.aboutMe}
                          onChange={(e) => setFormData({ ...formData, aboutMe: e.target.value })}
                        />
                      ) : (
                        userProfile?.about_me ? (
                          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{userProfile.about_me}</p>
                        ) : (
                          <p className="text-sm text-gray-500 italic">Click edit to add information about yourself</p>
                        )
                      )}
                    </div>
                    {editingSection === 'about' ? (
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => saveSection('about')}
                          disabled={loading}
                          className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing('about')}
                        className="edit-icon hidden p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
  
                {/* Contact Info Section */}
                <div 
                  className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 relative group hover:bg-purple-100 transition-colors"
                  onMouseEnter={(e) => e.currentTarget.querySelector('.edit-icon')?.classList.remove('hidden')}
                  onMouseLeave={(e) => e.currentTarget.querySelector('.edit-icon')?.classList.add('hidden')}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-purple-900 mb-2">📞 Contact Info</p>
                      {editingSection === 'contact' ? (
                        <div className="space-y-2">
                          <input 
                            type="email"
                            placeholder="Contact Email"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                            value={formData.contactEmail}
                            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                          />
                          <input 
                            type="tel"
                            placeholder="Phone Number"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          />
                          <input 
                            type="url"
                            placeholder="Website (https://...)"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                            value={formData.website}
                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                          />
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {userProfile?.contact_email ? (
                            <p className="text-sm text-gray-700">📧 {userProfile.contact_email}</p>
                          ) : null}
                          {userProfile?.phone ? (
                            <p className="text-sm text-gray-700">📞 {userProfile.phone}</p>
                          ) : null}
                          {userProfile?.website ? (
                            <a href={userProfile.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline block">
                              🌐 {userProfile.website}
                            </a>
                          ) : null}
                          {!userProfile?.contact_email && !userProfile?.phone && !userProfile?.website && (
                            <p className="text-sm text-gray-500 italic">Add contact information</p>
                          )}
                        </div>
                      )}
                    </div>
                    {editingSection === 'contact' ? (
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => saveSection('contact')}
                          disabled={loading}
                          className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing('contact')}
                        className="edit-icon hidden p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
  
                {/* Registration Number Section */}
                <div 
                  className="bg-gray-50 rounded-lg p-3 relative group hover:bg-gray-100 transition-colors"
                  onMouseEnter={(e) => e.currentTarget.querySelector('.edit-icon')?.classList.remove('hidden')}
                  onMouseLeave={(e) => e.currentTarget.querySelector('.edit-icon')?.classList.add('hidden')}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Registration & Experience</p>
                      {editingSection === 'registration' ? (
                        <div className="space-y-2">
                          <input 
                            type="text"
                            placeholder="Registration Number"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                            value={formData.registrationNumber}
                            onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                          />
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-gray-900">{userProfile?.regulator_number || 'Not set'}</p>
                          {(userProfile?.experience_month || userProfile?.experience_year) && (
                            <p className="text-xs text-gray-600 mt-1">
                              Since {userProfile.experience_month} {userProfile.experience_year}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    {editingSection === 'registration' ? (
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => saveSection('registration')}
                          disabled={loading}
                          className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing('registration')}
                        className="edit-icon hidden p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
  
                {/* Qualifications Section */}
                <div 
                  className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 relative group hover:bg-amber-100 transition-colors"
                  onMouseEnter={(e) => e.currentTarget.querySelector('.edit-icon')?.classList.remove('hidden')}
                  onMouseLeave={(e) => e.currentTarget.querySelector('.edit-icon')?.classList.add('hidden')}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-amber-900 mb-2">🎓 Qualifications & Certifications</p>
                      {editingSection === 'qualifications' ? (
                        <div className="space-y-3">
                          {formData.qualifications.map((qual: any, index: number) => (
                            <div key={index} className="bg-white border border-gray-300 rounded-lg p-3 space-y-2">
                              <input 
                                type="text"
                                placeholder="Qualification Title"
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                value={qual.title || ''}
                                onChange={(e) => {
                                  const updated = [...formData.qualifications]
                                  updated[index].title = e.target.value
                                  setFormData({ ...formData, qualifications: updated })
                                }}
                              />
                              <input 
                                type="text"
                                placeholder="Institution"
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                value={qual.institution || ''}
                                onChange={(e) => {
                                  const updated = [...formData.qualifications]
                                  updated[index].institution = e.target.value
                                  setFormData({ ...formData, qualifications: updated })
                                }}
                              />
                              <div className="flex gap-2">
                                <input 
                                  type="text"
                                  placeholder="Year"
                                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                                  value={qual.year || ''}
                                  onChange={(e) => {
                                    const updated = [...formData.qualifications]
                                    updated[index].year = e.target.value
                                    setFormData({ ...formData, qualifications: updated })
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = formData.qualifications.filter((_, i) => i !== index)
                                    setFormData({ ...formData, qualifications: updated })
                                  }}
                                  className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                qualifications: [...formData.qualifications, { title: '', institution: '', year: '' }]
                              })
                            }}
                            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600"
                          >
                            + Add Qualification
                          </button>
                        </div>
                      ) : (
                        userProfile?.qualifications && userProfile.qualifications.length > 0 ? (
                          <div className="space-y-2">
                            {userProfile.qualifications.map((qual: any, index: number) => (
                              <div key={index} className="text-sm">
                                <p className="font-semibold text-gray-900">{qual.title}</p>
                                <p className="text-gray-600">{qual.institution} • {qual.year}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">Click edit to add qualifications</p>
                        )
                      )}
                    </div>
                    {editingSection === 'qualifications' ? (
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => saveSection('qualifications')}
                          disabled={loading}
                          className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing('qualifications')}
                        className="edit-icon hidden p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
  
                {/* Work Experience Section */}
                <div 
                  className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-4 relative group hover:bg-emerald-100 transition-colors"
                  onMouseEnter={(e) => e.currentTarget.querySelector('.edit-icon')?.classList.remove('hidden')}
                  onMouseLeave={(e) => e.currentTarget.querySelector('.edit-icon')?.classList.add('hidden')}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-emerald-900 mb-2">💼 Work Experience</p>
                      {editingSection === 'experience' ? (
                        <div className="space-y-3">
                          {formData.workExperience.map((exp: any, index: number) => {
                            const isCurrentJob = exp.end_date?.toLowerCase() === 'present'
                            return (
                              <div key={index} className="bg-white border border-gray-300 rounded-lg p-3 space-y-2">
                                <input 
                                  type="text"
                                  placeholder="Job Title"
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                  value={exp.title || ''}
                                  onChange={(e) => {
                                    const updated = [...formData.workExperience]
                                    updated[index].title = e.target.value
                                    setFormData({ ...formData, workExperience: updated })
                                  }}
                                />
                                <input 
                                  type="text"
                                  placeholder="Organization"
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                  value={exp.organization || ''}
                                  onChange={(e) => {
                                    const updated = [...formData.workExperience]
                                    updated[index].organization = e.target.value
                                    setFormData({ ...formData, workExperience: updated })
                                  }}
                                />
                                <div className="grid grid-cols-2 gap-2">
                                  <input 
                                    type="text"
                                    placeholder="Start Date (YYYY-MM)"
                                    className="px-2 py-1 text-sm border border-gray-300 rounded"
                                    value={exp.start_date || ''}
                                    onChange={(e) => {
                                      const updated = [...formData.workExperience]
                                      updated[index].start_date = e.target.value
                                      setFormData({ ...formData, workExperience: updated })
                                    }}
                                  />
                                  <div className="flex gap-2">
                                    <input 
                                      type="text"
                                      placeholder={isCurrentJob ? "Present" : "End Date (YYYY-MM)"}
                                      className={`flex-1 px-2 py-1 text-sm border border-gray-300 rounded ${isCurrentJob ? 'bg-gray-100' : ''}`}
                                      value={isCurrentJob ? "Present" : (exp.end_date || '')}
                                      disabled={isCurrentJob}
                                      onChange={(e) => {
                                        const updated = [...formData.workExperience]
                                        updated[index].end_date = e.target.value
                                        setFormData({ ...formData, workExperience: updated })
                                      }}
                                    />
                                  </div>
                                </div>
                                <label className="flex items-center gap-2 text-xs">
                                  <input 
                                    type="checkbox"
                                    checked={isCurrentJob}
                                    onChange={(e) => {
                                      const updated = [...formData.workExperience]
                                      updated[index].end_date = e.target.checked ? 'Present' : ''
                                      setFormData({ ...formData, workExperience: updated })
                                    }}
                                  />
                                  <span className="text-gray-700">I currently work here</span>
                                </label>
                                <textarea
                                  placeholder="Description (optional)"
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                  rows={2}
                                  value={exp.description || ''}
                                  onChange={(e) => {
                                    const updated = [...formData.workExperience]
                                    updated[index].description = e.target.value
                                    setFormData({ ...formData, workExperience: updated })
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = formData.workExperience.filter((_, i) => i !== index)
                                    setFormData({ ...formData, workExperience: updated })
                                  }}
                                  className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                                >
                                  Remove
                                </button>
                              </div>
                            )
                          })}
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                workExperience: [...formData.workExperience, { title: '', organization: '', start_date: '', end_date: '', description: '' }]
                              })
                            }}
                            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600"
                          >
                            + Add Experience
                          </button>
                        </div>
                      ) : (
                        userProfile?.work_experience && userProfile.work_experience.length > 0 ? (
                          <div className="space-y-3">
                            {userProfile.work_experience.map((exp: any, index: number) => {
                              const isCurrentJob = exp.end_date?.toLowerCase() === 'present'
                              const startDate = exp.start_date ? new Date(exp.start_date + '-01') : null
                              const endDate = isCurrentJob ? new Date() : (exp.end_date ? new Date(exp.end_date + '-01') : null)
                              
                              let duration = ''
                              if (startDate && endDate) {
                                const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
                                const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25))
                                const diffMonths = Math.floor((diffTime % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44))
                                
                                if (diffYears > 0) {
                                  duration = `${diffYears} yr${diffYears > 1 ? 's' : ''}`
                                  if (diffMonths > 0) {
                                    duration += ` ${diffMonths} mo${diffMonths > 1 ? 's' : ''}`
                                  }
                                } else {
                                  duration = `${diffMonths} mo${diffMonths > 1 ? 's' : ''}`
                                }
                              }

                              return (
                                <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <p className="font-semibold text-gray-900">{exp.title}</p>
                                      <p className="text-blue-600 text-sm">{exp.organization}</p>
                                      <p className="text-gray-500 text-xs mt-1">
                                        {exp.start_date} - {exp.end_date || 'Present'} {duration && `• ${duration}`}
                                      </p>
                                    </div>
                                    {exp.description && (
                                      <button
                                        onClick={() => toggleItem(index)}
                                        className="ml-2 text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0"
                                      >
                                        <ChevronDown className={`w-4 h-4 transition-transform ${expandedItems[index] ? 'rotate-180' : ''}`} />
                                      </button>
                                    )}
                                  </div>
                                  {exp.description && expandedItems[index] && (
                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                      <p className="text-sm text-gray-700 whitespace-pre-line">{exp.description}</p>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">Click edit to add work experience</p>
                        )
                      )}
                    </div>
                    {editingSection === 'experience' ? (
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => saveSection('experience')}
                          disabled={loading}
                          className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing('experience')}
                        className="edit-icon hidden p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
  
                {/* Specialties Section */}
                <div 
                  className="bg-gray-50 rounded-lg p-3 relative group hover:bg-gray-100 transition-colors"
                  onMouseEnter={(e) => e.currentTarget.querySelector('.edit-icon')?.classList.remove('hidden')}
                  onMouseLeave={(e) => e.currentTarget.querySelector('.edit-icon')?.classList.add('hidden')}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-2">Specialties</p>
                      {editingSection === 'specialties' ? (
                        <div className="relative" ref={specialtiesRef}>
                          <button 
                            type="button"
                            onClick={() => setDropdowns({ ...dropdowns, specialties: !dropdowns.specialties })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg flex justify-between items-center"
                          >
                            <span>{formData.specialties.length ? `${formData.specialties.length} selected` : 'Select'}</span>
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          {dropdowns.specialties && (
                            <div className="absolute w-full bg-white border border-gray-300 mt-1 rounded-lg shadow-lg max-h-40 overflow-y-auto z-50">
                              {specialtiesOptions.map((s) => (
                                <label key={s} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                                  <input 
                                    type="checkbox"
                                    checked={formData.specialties.includes(s)}
                                    onChange={() => {
                                      setFormData({
                                        ...formData,
                                        specialties: formData.specialties.includes(s)
                                          ? formData.specialties.filter((x) => x !== s)
                                          : [...formData.specialties, s]
                                      })
                                    }}
                                    className="mr-2"
                                  />
                                  <span className="text-xs">{s}</span>
                                </label>
                              ))}
                            </div>
                          )}
                          {formData.specialties.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {formData.specialties.map((s) => (
                                <span key={s} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {userProfile?.specialties && userProfile.specialties.length > 0 ? (
                            userProfile.specialties.map((s: string) => (
                              <span key={s} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                {s}
                              </span>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500">No specialties set</p>
                          )}
                        </div>
                      )}
                    </div>
                    {editingSection === 'specialties' ? (
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => saveSection('specialties')}
                          disabled={loading}
                          className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing('specialties')}
                        className="edit-icon hidden p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
  
                {/* Languages Section */}
                <div 
                  className="bg-gray-50 rounded-lg p-3 relative group hover:bg-gray-100 transition-colors"
                  onMouseEnter={(e) => e.currentTarget.querySelector('.edit-icon')?.classList.remove('hidden')}
                  onMouseLeave={(e) => e.currentTarget.querySelector('.edit-icon')?.classList.add('hidden')}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-2">Languages</p>
                      {editingSection === 'languages' ? (
                        <div className="relative" ref={languagesRef}>
                          <button 
                            type="button"
                            onClick={() => setDropdowns({ ...dropdowns, languages: !dropdowns.languages })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg flex justify-between items-center"
                          >
                            <span>{formData.languages.length ? `${formData.languages.length} selected` : 'Select'}</span>
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          {dropdowns.languages && (
                            <div className="absolute w-full bg-white border border-gray-300 mt-1 rounded-lg shadow-lg max-h-40 overflow-y-auto z-50">
                              {languageOptions.map((lang) => (
                                <label key={lang} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                                  <input 
                                    type="checkbox"
                                    checked={formData.languages.includes(lang)}
                                    onChange={() => {
                                      setFormData({
                                        ...formData,
                                        languages: formData.languages.includes(lang)
                                          ? formData.languages.filter((x) => x !== lang)
                                          : [...formData.languages, lang]
                                      })
                                    }}
                                    className="mr-2"
                                  />
                                  <span className="text-xs">{lang}</span>
                                </label>
                              ))}
                            </div>
                          )}
                          {formData.languages.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {formData.languages.map((l) => (
                                <span key={l} className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">
                                  {l}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {userProfile?.languages && userProfile.languages.length > 0 ? (
                            userProfile.languages.map((l: string) => (
                              <span key={l} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                                {l}
                              </span>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500">No languages set</p>
                          )}
                        </div>
                      )}
                    </div>
                    {editingSection === 'languages' ? (
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => saveSection('languages')}
                          disabled={loading}
                          className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing('languages')}
                        className="edit-icon hidden p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
  
                {/* Location Section */}
                <div 
                  className="bg-gray-50 rounded-lg p-3 relative group hover:bg-gray-100 transition-colors"
                  onMouseEnter={(e) => e.currentTarget.querySelector('.edit-icon')?.classList.remove('hidden')}
                  onMouseLeave={(e) => e.currentTarget.querySelector('.edit-icon')?.classList.add('hidden')}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Location</p>
                      {editingSection === 'location' ? (
                        <div className="space-y-2">
                          <div className="relative" ref={locationRef}>
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                            <input 
                              type="text" 
                              placeholder="Search location..." 
                              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg"
                              value={locationSearch}
                              onChange={(e) => {
                                setLocationSearch(e.target.value)
                                if (e.target.value.length < 3) {
                                  setFormData({ ...formData, city: '', county: '', lat: null, lng: null })
                                }
                              }}
                            />
                            {showLocationSuggestions && locationSuggestions.length > 0 && (
                              <div className="absolute w-full bg-white border border-gray-300 mt-1 rounded-lg shadow-lg max-h-40 overflow-y-auto z-50">
                                {locationSuggestions.map((suggestion, index) => (
                                  <button
                                    key={index}
                                    type="button"
                                    onClick={() => handleLocationSelect(suggestion)}
                                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-xs"
                                  >
                                    <div className="font-medium">{suggestion.address.city || suggestion.address.town}</div>
                                    <div className="text-gray-500 truncate">{suggestion.display_name}</div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          {formData.city && formData.county && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-xs">
                              <p className="font-medium text-green-900">✅ {formData.city}, {formData.county}</p>
                            </div>
                          )}
                          <label className="flex items-center gap-2 text-xs">
                            <input 
                              type="checkbox" 
                              checked={formData.offersRemote}
                              onChange={(e) => setFormData({ ...formData, offersRemote: e.target.checked })}
                            />
                            Offers remote sessions
                          </label>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-gray-900">
                            {userProfile?.city && userProfile?.county 
                              ? `${userProfile.city}, ${userProfile.county}` 
                              : 'Not set'}
                          </p>
                          {userProfile?.offers_remote && (
                            <p className="text-xs text-green-600 font-medium mt-1">✅ Offers Remote Sessions</p>
                          )}
                        </>
                      )}
                    </div>
                    {editingSection === 'location' ? (
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => saveSection('location')}
                          disabled={loading}
                          className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing('location')}
                        className="edit-icon hidden p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
  
              {/* Sign Out Button */}
              <button
                onClick={handleSignOut}
                className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors mt-6"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Email ve Password - HER ZAMAN GÖRÜNÜR (Sign In ve Sign Up'ta) */}
              <input 
                type="email" 
                placeholder="Email" 
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                value={formData.email}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  email: e.target.value,
                  contactEmail: formData.useSignupEmailAsContact ? e.target.value : formData.contactEmail
                })}
              />
              
              <input 
                type="password" 
                placeholder="Password" 
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
  
              {/* Diğer tüm alanlar - SADECE SIGN UP'TA GÖRÜNÜR */}
              {isSignUp && (
                <>
                  <input 
                    type="text" 
                    placeholder="First Name" 
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                  <input 
                    type="text" 
                    placeholder="Last Name" 
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
  
                  <select 
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                    value={formData.profession}
                    required
                    onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                  >
                    <option value="">Select Profession</option>
                    {professions.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
  
                  {formData.profession && (
                    <input 
                      type="text" 
                      placeholder="Registration Number"
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                      value={formData.registrationNumber}
                      onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                    />
                  )}
  
                  <div className="relative" ref={specialtiesRef}>
                    <button 
                      type="button"
                      onClick={() => setDropdowns({ ...dropdowns, specialties: !dropdowns.specialties })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl flex justify-between items-center hover:border-gray-300"
                    >
                      <span>{formData.specialties.length ? `${formData.specialties.length} selected` : 'Select Specialties'}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${dropdowns.specialties ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {dropdowns.specialties && (
                      <div className="absolute w-full bg-white border border-gray-200 mt-1 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
                        {specialtiesOptions.map((s) => (
                          <label key={s} className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={formData.specialties.includes(s)}
                              onChange={() => {
                                setFormData({
                                  ...formData,
                                  specialties: formData.specialties.includes(s)
                                    ? formData.specialties.filter((x) => x !== s)
                                    : [...formData.specialties, s]
                                })
                              }}
                              className="mr-2"
                            />
                            <span className="text-sm">{s}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
  
                  {formData.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.specialties.map((s) => (
                        <span 
                          key={s} 
                          className="bg-green-100 text-green-800 px-3 py-1 rounded-full flex items-center text-sm"
                        >
                          {s}
                          <X 
                            className="w-3 h-3 ml-2 cursor-pointer" 
                            onClick={() => setFormData({ 
                              ...formData, 
                              specialties: formData.specialties.filter((x) => x !== s) 
                            })} 
                          />
                        </span>
                      ))}
                    </div>
                  )}
  
                  <div className="relative" ref={languagesRef}>
                    <button 
                      type="button"
                      onClick={() => setDropdowns({ ...dropdowns, languages: !dropdowns.languages })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl flex justify-between items-center hover:border-gray-300"
                    >
                      <span>{formData.languages.length ? `${formData.languages.length} selected` : 'Select Languages'}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${dropdowns.languages ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {dropdowns.languages && (
                      <div className="absolute w-full bg-white border border-gray-200 mt-1 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
                        {languageOptions.map((lang) => (
                          <label key={lang} className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={formData.languages.includes(lang)}
                              onChange={() => {
                                setFormData({
                                  ...formData,
                                  languages: formData.languages.includes(lang)
                                    ? formData.languages.filter((x) => x !== lang)
                                    : [...formData.languages, lang]
                                })
                              }}
                              className="mr-2"
                            />
                            <span className="text-sm">{lang}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
  
                  {formData.languages.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.languages.map((l) => (
                        <span 
                          key={l} 
                          className="bg-green-100 text-green-800 px-3 py-1 rounded-full flex items-center text-sm"
                        >
                          {l}
                          <X 
                            className="w-3 h-3 ml-2 cursor-pointer" 
                            onClick={() => setFormData({ 
                              ...formData, 
                              languages: formData.languages.filter((x) => x !== l) 
                            })} 
                          />
                        </span>
                      ))}
                    </div>
                  )}
  
                  {/* Contact Email Checkbox */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <label className="flex items-start gap-2">
                      <input 
                        type="checkbox" 
                        checked={formData.useSignupEmailAsContact}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          useSignupEmailAsContact: e.target.checked,
                          contactEmail: e.target.checked ? formData.email : formData.contactEmail
                        })}
                        className="mt-1"
                      />
                      <div>
                        <span className="text-sm font-medium text-blue-900">
                          Use my sign-up email as contact email
                        </span>
                        <p className="text-xs text-blue-700 mt-1">
                          When checked, other therapists can contact you via your sign-up email address.
                          If unchecked, you can set a different contact email later in your profile settings.
                        </p>
                      </div>
                    </label>
                  </div>
  
                  <div className="relative" ref={locationRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location (City/Town)
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input 
                        type="text" 
                        placeholder="Type your city or town..." 
                        required
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                        value={locationSearch}
                        onChange={(e) => {
                          setLocationSearch(e.target.value)
                          if (e.target.value.length < 3) {
                            setFormData({ ...formData, city: '', county: '', lat: null, lng: null })
                          }
                        }}
                      />
                      {isSearchingLocation && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                        </div>
                      )}
                    </div>
  
                    {showLocationSuggestions && locationSuggestions.length > 0 && (
                      <div className="absolute w-full bg-white border border-gray-200 mt-1 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
                        {locationSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleLocationSelect(suggestion)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-sm text-gray-900">
                              {suggestion.address.city || suggestion.address.town || suggestion.address.village}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {suggestion.display_name}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
  
                    {showLocationSuggestions && locationSuggestions.length === 0 && locationSearch.length >= 3 && !isSearchingLocation && (
                      <div className="absolute w-full bg-white border border-gray-200 mt-1 rounded-lg shadow-lg p-3 z-50">
                        <p className="text-sm text-gray-500">No locations found. Try a different search.</p>
                      </div>
                    )}
                  </div>
  
                  {formData.city && formData.county && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-green-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-green-900">{formData.city}, {formData.county}</p>
                          <p className="text-green-700 text-xs mt-1">Location confirmed ✅</p>
                        </div>
                      </div>
                    </div>
                  )}
  
                  <input 
                    type="text" 
                    placeholder="City" 
                    required
                    disabled
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-600"
                    value={formData.city}
                    readOnly
                  />
                  <input 
                    type="text" 
                    placeholder="County" 
                    required
                    disabled
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-600"
                    value={formData.county}
                    readOnly
                  />
  
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={formData.offersRemote}
                      onChange={(e) => setFormData({ ...formData, offersRemote: e.target.checked })}
                    />
                    Offers remote sessions
                  </label>
  
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={formData.acceptTerms}
                      onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                    />
                    Accept Terms & Privacy Policy
                  </label>
                </>
              )}
  
              <button 
                type="button"
                onClick={handleSubmit}
                disabled={loading || (isSignUp && !formData.acceptTerms)}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
              >
                {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
              </button>
  
              <div className="text-center mt-3">
                <button 
                  type="button" 
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App