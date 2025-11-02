import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from './lib/supabaseClient'
import { ToastProvider } from './components/ToastProvider'
import { useToast } from './components/useToast'
import GlobalSearch from './components/GlobalSearch'
import Avatar from './components/Avatar'
import RichTextEditor from './components/RichTextEditor'
import EmptyState from './components/EmptyState'
import { 
  PostSkeleton, 
  MessageSkeleton, 
  ProfilePageSkeleton,
  SettingsSkeleton,
  ConnectionListSkeleton
} from './components/SkeletonLoaders'
import { ConnectionStatusBanner } from './components/ConnectionStatusBanner'
import { useNetworkStatus } from './hooks/useNetworkStatus'
import { getErrorMessage } from './utils/errorHandler'
import { usePullToRefresh } from './hooks/usePullToRefresh'
import { haptic } from './utils/hapticFeedback'
import { SwipeableConversationItem } from './components/SwipeableConversationItem'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { IoHome } from "react-icons/io5";
import { useSession } from '@supabase/auth-helpers-react'
import UpcomingEvents from './components/UpcomingEvents'
import { 
    Users, MapPin, User, Search, ChevronDown, X, MessageSquare, 
    Plus, Edit2, Check, ArrowLeft, Mail, Phone, Globe, Calendar, 
    Briefcase, Award, Send, Star, Volume2, VolumeX, Archive, ShieldAlert, MoreHorizontal,
    UserPlus, UserCheck, Clock, Settings, Eye, EyeOff, Lock, Bell, Filter,
    Download, Info, Trash2,ThumbsUp, Flag, RefreshCw, Printer,
    FileText, MessageCircle, Bookmark,
    CheckCircle, Circle, UserX, Monitor, Smartphone, LogOut, QrCode,
    Repeat2, Quote
} from 'lucide-react'


// Supabase client provided by ./lib/supabaseClient
  // Sort helper for displaying experiences (does not mutate state)
  const getSortedExperiences = (items: any[]) => {
    const parseDate = (d?: string) => {
      if (!d) return null
      const t = d.toLowerCase()
      if (t === 'present') return new Date()
      const dt = new Date(d)
      return isNaN(dt.getTime()) ? null : dt
    }
    return [...(items || [])].sort((a, b) => {
      const aIsCurrent = (a.end_date || '').toLowerCase() === 'present'
      const bIsCurrent = (b.end_date || '').toLowerCase() === 'present'
      const aStart = parseDate(a.start_date)
      const bStart = parseDate(b.start_date)
      const aEnd = parseDate(a.end_date) || (aIsCurrent ? new Date() : null)
      const bEnd = parseDate(b.end_date) || (bIsCurrent ? new Date() : null)

      if (aIsCurrent !== bIsCurrent) return aIsCurrent ? -1 : 1
      if (!aIsCurrent && aEnd && bEnd && aEnd.getTime() !== bEnd.getTime()) {
        return bEnd.getTime() - aEnd.getTime()
      }
      const aDur = aStart && aEnd ? (aEnd.getTime() - aStart.getTime()) : 0
      const bDur = bStart && bEnd ? (bEnd.getTime() - bStart.getTime()) : 0
      if (aDur !== bDur) return bDur - aDur
      return 0
    })
  }

// Leaflet icon fix
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
})

interface CommunityPost {
  id: string
  created_at: string
  updated_at: string
  user_id: string
  title: string
  content: string
  post_metadata: PostMetadata
  user?: Profile
  replies_count?: number
}

interface CVMakerProps {
  userProfile: any
  onClose: () => void
}

interface PostMetadata {
  professions: string[]
  clinical_areas: string[]
  content_type: string
  tags: string[]
  audience_level: string
  related_conditions: string[]
  language: string
  attachments: string[]
  co_authors: string[]
  is_public: boolean
  visibility?: 'public' | 'connections' | 'only_me'
  reposted_post_id?: string
  is_repost?: boolean
  quoted_post_id?: string
  quoted_post_data?: {
    id: string
    content: string
    title?: string
    user_id: string
    user?: Profile
  }
}

interface FeedFilters {
  professions: string[]
  clinical_areas: string[]
  content_types: string[]
  tags: string[]
  audience_levels: string[]
  related_conditions: string[]
  languages: string[]
  show_only_my_profession: boolean
  show_only_my_network: boolean
}

// Emoji Reactions
const EMOJI_REACTIONS = [
  { emoji: '👍', label: 'Like' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '😂', label: 'Haha' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '💡', label: 'Insightful' }
]

// Seçenek listeleri
const PROFESSION_OPTIONS = ['Physiotherapist', 'Occupational Therapist', 'Speech & Language Therapist', 'Practitioner psychologist', 'Registered psychologist', 'Clinical psychologist', 'Forensic psychologist', 'Counselling psychologist', 'Health psychologist', 'Educational psychologist', 'Occupational psychologist', 'Sport and exercise psychologist', 'Dietitian/Dietician', 'Chiropodist', 'Podiatrist', 'Doctor', 'Nurse', 'Paramedic', 'Psychologist', 'Clinical scientist', 'Hearing aid dispenser', 'Orthoptist', 'Prosthetist', 'Orthotist', 'Radiographer', 'Diagnostic radiographer', 'Therapeutic radiographer', 'Speech and language/Speech therapist', 'Pharmacist', 'Social Worker', 'Care Assistant', 'Art Psychotherapist', 'Art therapist', 'Dramatherapist', 'Music therapist', 'Biomedical scientist', 'Operating Department Practitioner (ODP)', 'Midwife', 'Genetic Counsellor', 'Dental Hygienist', 'Dental Therapist', 'Orthodontic Therapist', 'Prosthetist', 'Orthotist', 'Clinical Physiologist', 'Audiologist'
  ]

const CLINICAL_AREA_OPTIONS = [
  'Neurology', 'Orthopaedics', 'Cardiorespiratory', 'Paediatrics',
  'Mental Health', 'Community Care', 'Acute Care', 'Sports Medicine',
  'Geriatrics', 'Oncology', 'Dysphagia', 'Voice Disorders', 'ICU/Critical Care',
  'Musculoskeletal', 'Women\'s Health', 'Palliative Care', 'Rehabilitation'
]

const CONTENT_TYPE_OPTIONS = [
  'Research summary',
  'Case study', 
  'Clinical guideline',
  'Opinion/Discussion',
  'Question/Request for feedback',
  'Evidence-based tip',
  'Continuing education material',
  'Job opportunity',
  'Event announcement'
]

const AUDIENCE_LEVEL_OPTIONS = [
  'Student',
  'Junior professional', 
  'Experienced clinician',
  'Researcher/Academic',
  'All levels'
]

const RELATED_CONDITIONS_OPTIONS = [
  'Stroke', 'COPD', 'Low back pain', 'Parkinson\'s', 'Dementia',
  'Arthritis', 'COVID-19', 'Spinal cord injury', 'Autism', 'Dysphagia',
  'Multiple Sclerosis', 'Cardiac conditions', 'Pulmonary diseases'
]

const LANGUAGE_OPTIONS = [
  'Afrikaans','Albanian','Amharic','Arabic','Armenian','Assamese','Aymara','Azerbaijani','Bambara','Basque',
  'Belarusian','Bengali','Bhojpuri','Bosnian','Bulgarian','Catalan','Cebuano','Chinese (Simplified)','Chinese (Traditional)',
  'Corsican','Croatian','Czech','Danish','Dhivehi','Dogri','Dutch','English','Esperanto','Estonian','Ewe',
  'Filipino','Finnish','French','Frisian','Galician','Georgian','German','Greek','Guarani','Gujarati','Haitian Creole',
  'Hausa','Hawaiian','Hebrew','Hindi','Hmong','Hungarian','Icelandic','Igbo','Ilocano','Indonesian','Irish',
  'Italian','Japanese','Javanese','Kannada','Kazakh','Khmer','Kinyarwanda','Konkani','Korean','Krio','Kurdish (Kurmanji)',
  'Kurdish (Sorani)','Kyrgyz','Lao','Latin','Latvian','Lingala','Lithuanian','Luganda','Luxembourgish','Macedonian',
  'Maithili','Malagasy','Malay','Malayalam','Maltese','Maori','Marathi','Mizo','Mongolian','Myanmar (Burmese)',
  'Nepali','Norwegian','Nyanja (Chichewa)','Odia (Oriya)','Oromo','Pashto','Persian','Polish','Portuguese','Punjabi',
  'Quechua','Romanian','Russian','Samoan','Sanskrit','Scots Gaelic','Sepedi','Serbian','Sesotho','Shona','Sindhi',
  'Sinhala','Slovak','Slovenian','Somali','Spanish','Sundanese','Swahili','Swedish','Tagalog (Filipino)','Tajik',
  'Tamil','Tatar','Telugu','Thai','Tigrinya','Tsonga','Turkish','Turkmen','Twi (Akan)','Ukrainian','Urdu','Uyghur',
  'Uzbek','Vietnamese','Welsh','Xhosa','Yiddish','Yoruba','Zulu'
];


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
  bio?: string; 
  contact_email?: string
  regulator_number?: string
  avatar_url?: string | null
  connection_stats?: ConnectionStats
  is_connected?: boolean
  connection_status?: 'pending' | 'accepted' | 'rejected' | 'not_connected'
  profile_views?: number
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

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  parent_reply_id?: string | null;
  user: Profile;
  replies?: Comment[];
}

function calculateTotalExperience(workExperience: any[]): string {
  if (!workExperience || workExperience.length === 0) return '0'

  let totalYears = 0
  let totalMonths = 0
  let totalDays = 0

  workExperience.forEach((exp: any) => {
    // Tarihleri parse et
    let startDate: Date | null = null
    let endDate: Date | null = null

    if (exp.start_date) {
      const [year, month, day] = exp.start_date.split('-').map(Number)
      startDate = new Date(year, month - 1, day || 1)
    }

    if (exp.end_date?.toLowerCase() === 'present') {
      endDate = new Date()
    } else if (exp.end_date) {
      const [year, month, day] = exp.end_date.split('-').map(Number)
      endDate = new Date(year, month - 1, day || 1)
    }

    if (startDate && endDate) {
      // Yıl hesapla
      let years = endDate.getFullYear() - startDate.getFullYear()
      let months = endDate.getMonth() - startDate.getMonth()
      let days = endDate.getDate() - startDate.getDate()

      // Gün negatifse ay azalt ve gün düzelt
      if (days < 0) {
        months--
        const prevMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 0)
        days += prevMonth.getDate()
      }

      // Ay negatifse yıl azalt ve ay düzelt
      if (months < 0) {
        years--
        months += 12
      }

      totalYears += years
      totalMonths += months
      totalDays += days
    }
  })

  // Fazla günleri aya çevir
  if (totalDays >= 30) {
    totalMonths += Math.floor(totalDays / 30)
    totalDays = totalDays % 30
  }

  // Fazla ayları yıla çevir
  if (totalMonths >= 12) {
    totalYears += Math.floor(totalMonths / 12)
    totalMonths = totalMonths % 12
  }

  // Format logic
  
  // < 1 year: show months only
  if (totalYears === 0) {
    return totalMonths > 0 ? `${totalMonths}m` : `${totalDays}d`
  }

  // 1-3 years: show "Xy Zm" format
  if (totalYears < 3) {
    return totalMonths > 0 ? `${totalYears}y ${totalMonths}m` : `${totalYears}y`
  }

  // 3+ years: special formatting based on months
  if (totalYears >= 3) {
    // Year beginning (months 0-3): "x+ years"
    if (totalMonths < 4) {
      return `${totalYears}+ years`
    }
    
    // Mid-year start (months 4-5): "approximately x.5 years"
    if (totalMonths >= 4 && totalMonths <= 5) {
      return `approximately ${totalYears}.5 years`
    }
    
    // Mid-year end (months 6-8): "x.5+ years"
    if (totalMonths > 5 && totalMonths <= 8) {
      return `${totalYears}.5+ years`
    }
    
    // Year end (months 9+): "approximately x+1 years"
    if (totalMonths > 8) {
      return `approximately ${totalYears + 1} years`
    }
  }

  return `${totalYears}y`
}

// Tests:
console.log(calculateTotalExperience([
  { start_date: '2024-09-01', end_date: '2024-10-15' }
])) // Output: "1m"

console.log(calculateTotalExperience([
  { start_date: '2022-06-01', end_date: 'present' }
])) // Output: "2y 5m"

console.log(calculateTotalExperience([
  { start_date: '2019-02-01', end_date: 'present' }
])) // Output: "5+ years" or "approximately 6 years" depending on current month

console.log(calculateTotalExperience([
  { start_date: '2021-03-01', end_date: 'present' }
])) // Output: "3+ years" or "approximately 3.5 years" depending on current month

function AccountDropdown({ 
  currentUser, 
  onProfileClick, 
  onSettingsClick,
  onSignOut,
}: { 
  currentUser: any
  onProfileClick: () => void
  onSettingsClick: () => void
  onSignOut: () => void
  onOpenConnections: () => void
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
        className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
        aria-label="Account"
      >
        <User className="w-5 h-5" />
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
              {/* Network option removed from Account menu; now inline in header */}
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

function MobileBottomNav({ 
  activeView, 
  setActiveView, 
  setSelectedProfileId, 
  setIsConnectionsOpen, 
  setIsAuthModalOpen, 
  currentUser,
  unreadMessagesCount,
  setIsMessagesOverlayOpen
}: { 
  activeView: string
  setActiveView: (view: 'map' | 'community') => void
  setSelectedProfileId: (id: string | null) => void
  setIsConnectionsOpen: (open: boolean) => void
  setIsAuthModalOpen: (open: boolean) => void
  currentUser: any
  unreadMessagesCount: number
  setIsMessagesOverlayOpen: (open: boolean) => void
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center p-2 z-40 md:hidden">
      <button
        onClick={() => {
          setActiveView('map')
          setSelectedProfileId(null)
        }}
        className={`flex flex-col items-center p-2 ${activeView === 'map' ? 'text-blue-600' : 'text-gray-600'}`}
      >
        <MapPin className="w-5 h-5" />
        <span className="text-xs mt-1">Map</span>
      </button>
      
      <button
        onClick={() => {
          setActiveView('community')
          setSelectedProfileId(null)
        }}
        className={`flex flex-col items-center p-2 ${activeView === 'community' ? 'text-blue-600' : 'text-gray-600'}`}
      >
        <Users className="w-5 h-5" />
        <span className="text-xs mt-1">Feed</span>
      </button>

      {/* Messages Button */}
      <div className="relative">
        <button
          onClick={() => setIsMessagesOverlayOpen(true)}
          className="flex flex-col items-center p-2 text-gray-600"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-xs mt-1">Messages</span>
        </button>
        {unreadMessagesCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
          </span>
        )}
      </div>

      {currentUser && (
        <button
          onClick={() => setIsConnectionsOpen(true)}
          className="flex flex-col items-center p-2 text-gray-600"
        >
          <UserPlus className="w-5 h-5" />
          <span className="text-xs mt-1">Network</span>
        </button>
      )}

      <button
        onClick={() => setIsAuthModalOpen(true)}
        className="flex flex-col items-center p-2 text-gray-600"
      >
        <User className="w-5 h-5" />
        <span className="text-xs mt-1">Account</span>
      </button>
    </div>
  )
}

function SettingsComponent({ onClose }: { onClose: () => void }) {
  const [activeSection, setActiveSection] = useState<'account' | 'security' | 'visibility' | 'privacy' | 'notifications' | 'blocked' | 'sessions'>('account')
  const [settings, setSettings] = useState({
    email_notifications: true,
    push_notifications: true,
    profile_visibility: 'public',
    message_permissions: 'network',
    language: 'english',
    timezone: 'Europe/London',
    email_connection_requests: true,
    email_messages: true,
    email_community_posts: false,
    email_post_reactions: false,
    email_comments: false,
    email_mentions: false,
    email_events: true,
    push_messages: true,
    push_connection_activity: false,
    push_post_reactions: true,
    push_comments: true,
    push_mentions: true,
    push_events: true,
    two_factor_enabled: false,
    two_factor_secret: null as string | null,
    activity_status_visible: true,
    search_visible: true,
    profile_view_tracking: true,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00'
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [blockedUsers, setBlockedUsers] = useState<Profile[]>([])
  const [loadingBlocked, setLoadingBlocked] = useState(false)
  const [sessions, setSessions] = useState<any[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [changePasswordModal, setChangePasswordModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' })
  const [passwordError, setPasswordError] = useState('')
  const [exportingData, setExportingData] = useState(false)
  const [twoFactorModal, setTwoFactorModal] = useState(false)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [twoFactorQR, setTwoFactorQR] = useState('')
  const [twoFactorSecret, setTwoFactorSecret] = useState('')

  const sections = [
    { id: 'account', name: 'Account preferences', icon: Settings },
    { id: 'security', name: 'Sign in & security', icon: Lock },
    { id: 'visibility', name: 'Visibility', icon: Eye },
    { id: 'privacy', name: 'Data privacy', icon: ShieldAlert },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'blocked', name: 'Blocked users', icon: UserX },
    { id: 'sessions', name: 'Active sessions', icon: Monitor }
  ]

  useEffect(() => {
    initializeUser()
    loadSettings()
    loadUserProfile()
    if (activeSection === 'blocked') {
      loadBlockedUsers()
    }
    if (activeSection === 'sessions') {
      loadSessions()
    }
  }, [activeSection])

  const initializeUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
  }

  const loadUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', user.id)
        .single()
      
      if (!error && data) {
        setUserProfile(data)
      }
    } catch (err) {
      console.error('Error loading user profile:', err)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentUser) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB')
      return
    }

    setUploadingAvatar(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`
      // Don't include 'avatars/' prefix since we're already specifying the bucket with .from('avatars')
      const filePath = fileName

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        console.error('Error uploading avatar:', uploadError)
        if (uploadError.message?.includes('Bucket not found')) {
          alert('Storage bucket not found. Please create an "avatars" bucket in Supabase Storage first.')
        } else {
          alert('Error uploading image: ' + uploadError.message)
        }
        setUploadingAvatar(false)
        return
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', currentUser.id)

      if (updateError) {
        console.error('Error updating profile:', updateError)
        alert('Error updating profile. Please try again.')
      } else {
        setUserProfile({ ...userProfile, avatar_url: publicUrl })
        // Show success toast
        const successEvent = new CustomEvent('showToast', {
          detail: { message: 'Profile picture updated successfully!', type: 'success' }
        })
        window.dispatchEvent(successEvent)
        
        // Trigger page reload to update all avatars
        window.location.reload()
      }
    } catch (err) {
      console.error('Error uploading avatar:', err)
      alert('Error uploading image. Please try again.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleRemoveAvatar = async () => {
    if (!currentUser || !confirm('Are you sure you want to remove your profile picture?')) return

    setUploadingAvatar(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', currentUser.id)

      if (error) {
        console.error('Error removing avatar:', error)
        alert('Error removing profile picture. Please try again.')
      } else {
        setUserProfile({ ...userProfile, avatar_url: null })
        const successEvent = new CustomEvent('showToast', {
          detail: { message: 'Profile picture removed successfully!', type: 'success' }
        })
        window.dispatchEvent(successEvent)
        window.location.reload()
      }
    } catch (err) {
      console.error('Error removing avatar:', err)
      alert('Error removing profile picture. Please try again.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const loadSettings = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setLoading(false)
      return
    }

    try {
      // Veritabanından kullanıcı ayarlarını al
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!error && data) {
        setSettings({
          email_notifications: data.email_notifications ?? true,
          push_notifications: data.push_notifications ?? true,
          profile_visibility: data.profile_visibility || 'public',
          message_permissions: data.message_permissions || 'network',
          language: data.language || 'english',
          timezone: data.timezone || 'Europe/London',
          email_connection_requests: data.email_connection_requests ?? true,
          email_messages: data.email_messages ?? true,
          email_community_posts: data.email_community_posts ?? false,
          email_post_reactions: data.email_post_reactions ?? false,
          email_comments: data.email_comments ?? false,
          email_mentions: data.email_mentions ?? false,
          email_events: data.email_events ?? true,
          push_messages: data.push_messages ?? true,
          push_connection_activity: data.push_connection_activity ?? false,
          push_post_reactions: data.push_post_reactions ?? true,
          push_comments: data.push_comments ?? true,
          push_mentions: data.push_mentions ?? true,
          push_events: data.push_events ?? true,
          two_factor_enabled: data.two_factor_enabled ?? false,
          two_factor_secret: data.two_factor_secret || null,
          activity_status_visible: data.activity_status_visible ?? true,
          search_visible: data.search_visible ?? true,
          profile_view_tracking: data.profile_view_tracking ?? true,
          quiet_hours_enabled: data.quiet_hours_enabled ?? false,
          quiet_hours_start: data.quiet_hours_start || '22:00',
          quiet_hours_end: data.quiet_hours_end || '08:00'
        })
      }
    } catch (err) {
      console.error('Error loading settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async (updates: Partial<typeof settings>) => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setSaving(false)
      return
    }

    try {
      const newSettings = { ...settings, ...updates }
      
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          id: user.id,
          ...newSettings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })

      if (error) {
        console.error('Error saving settings:', error)
        alert('Error saving settings. Please try again.')
      } else {
        setSettings(newSettings)
        // Başarılı geri bildirim göster
        const successEvent = new CustomEvent('showToast', {
          detail: { message: 'Settings saved successfully!', type: 'success' }
        })
        window.dispatchEvent(successEvent)
      }
    } catch (err) {
      console.error('Error saving settings:', err)
      alert('Error saving settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    setChangePasswordModal(true)
    setPasswordForm({ current: '', new: '', confirm: '' })
    setPasswordError('')
  }

  const handleChangePasswordSubmit = async () => {
    setPasswordError('')
    
    if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
      setPasswordError('All fields are required')
      return
    }

    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordError('New passwords do not match')
      return
    }

    if (passwordForm.new.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }

    try {
      // Update password using Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.new
      })

      if (error) {
        setPasswordError(error.message || 'Failed to change password')
        return
      }

      const successEvent = new CustomEvent('showToast', {
        detail: { message: 'Password changed successfully!', type: 'success' }
      })
      window.dispatchEvent(successEvent)
      setChangePasswordModal(false)
      setPasswordForm({ current: '', new: '', confirm: '' })
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password')
    }
  }

  const handleEnable2FA = async () => {
    if (settings.two_factor_enabled) {
      // Disable 2FA
      if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
        return
      }
      await saveSettings({ 
        two_factor_enabled: false,
        two_factor_secret: null
      })
      const successEvent = new CustomEvent('showToast', {
        detail: { message: 'Two-factor authentication disabled', type: 'success' }
      })
      window.dispatchEvent(successEvent)
      return
    }

    // Enable 2FA - Generate secret and show QR code
    try {
      // In a real implementation, you would generate TOTP secret on the server
      // For now, we'll use a client-side approach with a library like 'otplib'
      // Since we don't have it, we'll show a simplified version
      const secret = generate2FASecret()
      setTwoFactorSecret(secret)
      
      // Generate QR code data URL (simplified - in production use a QR library)
      const qrData = `otpauth://totp/TherapistFinder:${currentUser?.email}?secret=${secret}&issuer=TherapistFinder`
      // In production, use a QR code library: QRCode.toDataURL(qrData)
      setTwoFactorQR(qrData)
      setTwoFactorModal(true)
      setTwoFactorCode('')
    } catch (err) {
      console.error('Error setting up 2FA:', err)
      alert('Error setting up two-factor authentication')
    }
  }

  const generate2FASecret = (): string => {
    // Generate a random base32 secret (simplified)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    let secret = ''
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return secret
  }

  const verify2FACode = async (code: string): Promise<boolean> => {
    // In production, verify TOTP code on the server
    // For now, simple validation (code should be 6 digits)
    if (!/^\d{6}$/.test(code)) {
      return false
    }
    // In production: verify with TOTP library using twoFactorSecret
    return true
  }

  const handle2FAEnable = async () => {
    if (!twoFactorCode || twoFactorCode.length !== 6) {
      alert('Please enter a 6-digit code')
      return
    }

    const isValid = await verify2FACode(twoFactorCode)
    if (!isValid) {
      alert('Invalid verification code. Please try again.')
      return
    }

    await saveSettings({ 
      two_factor_enabled: true,
      two_factor_secret: twoFactorSecret
    })
    
    const successEvent = new CustomEvent('showToast', {
      detail: { message: 'Two-factor authentication enabled successfully!', type: 'success' }
    })
    window.dispatchEvent(successEvent)
    setTwoFactorModal(false)
    setTwoFactorCode('')
    setTwoFactorQR('')
    setTwoFactorSecret('')
  }

  const loadBlockedUsers = async () => {
    setLoadingBlocked(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoadingBlocked(false)
      return
    }

    try {
      // Get blocked users from user_settings
      const { data: settingsData } = await supabase
        .from('user_settings')
        .select('blocked_users')
        .eq('id', user.id)
        .single()

      const blockedIds = settingsData?.blocked_users || []
      
      if (blockedIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', blockedIds)

        if (profiles) {
          setBlockedUsers(profiles.map(p => ({
            id: p.id,
            full_name: p.full_name || '',
            profession: p.profession || '',
            avatar_url: p.avatar_url || null,
            languages: p.languages || [],
            specialties: p.specialties || [],
            city: p.city || '',
            county: p.county || '',
            lat: p.lat,
            lng: p.lng,
            experience_month: p.experience_month,
            experience_year: p.experience_year,
            offers_remote: p.offers_remote,
            about_me: p.about_me,
            qualifications: p.qualifications,
            work_experience: p.work_experience,
            availability: p.availability,
            phone: p.phone,
            website: p.website,
            email: p.email,
            contact_email: p.contact_email,
            regulator_number: p.regulator_number,
            experience_day: p.experience_day
          })) as Profile[])
        } else {
          setBlockedUsers([])
        }
      } else {
        setBlockedUsers([])
      }
    } catch (err) {
      console.error('Error loading blocked users:', err)
    } finally {
      setLoadingBlocked(false)
    }
  }

  const handleUnblockUser = async (userId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const { data: currentSettings } = await supabase
        .from('user_settings')
        .select('blocked_users')
        .eq('id', user.id)
        .single()

      const currentBlocked = currentSettings?.blocked_users || []
      const updatedBlocked = currentBlocked.filter((id: string) => id !== userId)

      await supabase
        .from('user_settings')
        .upsert({
          id: user.id,
          blocked_users: updatedBlocked,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })

      await loadBlockedUsers()
      
      const successEvent = new CustomEvent('showToast', {
        detail: { message: 'User unblocked successfully', type: 'success' }
      })
      window.dispatchEvent(successEvent)
    } catch (err) {
      console.error('Error unblocking user:', err)
      alert('Error unblocking user')
    }
  }

  const loadSessions = async () => {
    setLoadingSessions(true)
    try {
      // Get current session info
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        // Create a simplified session list (in production, track all sessions)
        const currentSession = {
          id: session.access_token.substring(0, 8),
          device: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop',
          browser: getBrowserName(),
          location: 'Unknown', // Could use IP geolocation service
          last_active: new Date(session.expires_at! * 1000).toISOString(),
          current: true,
          ip: 'Unknown' // Would need server-side tracking
        }
        setSessions([currentSession])
      }
    } catch (err) {
      console.error('Error loading sessions:', err)
    } finally {
      setLoadingSessions(false)
    }
  }

  const getBrowserName = (): string => {
    const ua = navigator.userAgent
    if (ua.includes('Chrome')) return 'Chrome'
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Safari')) return 'Safari'
    if (ua.includes('Edge')) return 'Edge'
    return 'Unknown'
  }

  const handleTerminateSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to sign out of this device?')) return

    try {
      // If it's the current session, sign out
      if (sessions.find(s => s.id === sessionId && s.current)) {
        await supabase.auth.signOut()
        window.location.reload()
      } else {
        // In production, would call server to invalidate that session
        setSessions(sessions.filter(s => s.id !== sessionId))
        const successEvent = new CustomEvent('showToast', {
          detail: { message: 'Session terminated', type: 'success' }
        })
        window.dispatchEvent(successEvent)
      }
    } catch (err) {
      console.error('Error terminating session:', err)
      alert('Error terminating session')
    }
  }

  const handleExportData = async () => {
    if (!confirm('This will download all your account data. Continue?')) return

    setExportingData(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setExportingData(false)
      return
    }

    try {
      // Collect all user data
      const exportData: any = {
        export_date: new Date().toISOString(),
        user_id: user.id,
        email: user.email,
      }

      // Get profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      exportData.profile = profile

      // Get posts
      const { data: posts } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
      exportData.posts = posts || []

      // Get comments
      const { data: comments } = await supabase
        .from('post_comments')
        .select('*')
        .eq('user_id', user.id)
      exportData.comments = comments || []

      // Get messages
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*, messages(*)')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      exportData.conversations = conversations || []

      // Get connections
      const { data: connections } = await supabase
        .from('connections')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      exportData.connections = connections || []

      // Get settings
      const { data: userSettings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('id', user.id)
        .single()
      exportData.settings = userSettings

      // Create and download JSON file
      const jsonStr = JSON.stringify(exportData, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `therapist-finder-data-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      const successEvent = new CustomEvent('showToast', {
        detail: { message: 'Data exported successfully!', type: 'success' }
      })
      window.dispatchEvent(successEvent)
    } catch (err) {
      console.error('Error exporting data:', err)
      alert('Error exporting data. Please try again.')
    } finally {
      setExportingData(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.')) {
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      // Önce, kullanıcı verilerini profiles tablosundan sil
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id)

      if (profileError) {
        console.error('Error deleting profile:', profileError)
      }

      // Sonra kullanıcı ayarlarını sil
      const { error: settingsError } = await supabase
        .from('user_settings')
        .delete()
        .eq('id', user.id)

      if (settingsError) {
        console.error('Error deleting settings:', settingsError)
      }

      // Son olarak, auth kullanıcısını sil
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id)

      if (authError) {
        console.error('Error deleting auth user:', authError)
        alert('Error deleting account. Please contact support.')
      } else {
        alert('Account deleted successfully. You will be signed out.')
        onClose()
        // Çıkış yap
        await supabase.auth.signOut()
        window.location.reload()
      }
    } catch (err) {
      console.error('Error deleting account:', err)
      alert('Error deleting account. Please contact support.')
    }
  }

  const languages = [
    { value: 'english', label: 'English' },
    { value: 'turkish', label: 'Turkish' },
    { value: 'spanish', label: 'Spanish' },
    { value: 'french', label: 'French' },
    { value: 'german', label: 'German' }
  ]

  const timezones = [
    { value: 'Europe/London', label: '(GMT+00:00) London' },
    { value: 'Europe/Istanbul', label: '(GMT+03:00) Istanbul' },
    { value: 'America/New_York', label: '(GMT-05:00) New York' },
    { value: 'Europe/Paris', label: '(GMT+01:00) Paris' },
    { value: 'Asia/Dubai', label: '(GMT+04:00) Dubai' }
  ]

  if (loading) {
    return <SettingsSkeleton />
  }

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
                {/* Profile Picture Section */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Profile Picture</h4>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <Avatar src={userProfile?.avatar_url} name={userProfile?.full_name} size={96} className="border-2 border-gray-200" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors inline-block">
                          {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            disabled={uploadingAvatar}
                            className="hidden"
                          />
                        </label>
                        {userProfile?.avatar_url && (
                          <button
                            onClick={handleRemoveAvatar}
                            disabled={uploadingAvatar}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:bg-gray-100"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        Recommended: Square image, at least 400x400 pixels. Max size: 5MB
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Language & Region</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Language
                      </label>
                      <select 
                        className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2"
                        value={settings.language}
                        onChange={(e) => saveSettings({ language: e.target.value })}
                        disabled={saving}
                      >
                        {languages.map(lang => (
                          <option key={lang.value} value={lang.value}>
                            {lang.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Time Zone
                      </label>
                      <select 
                        className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2"
                        value={settings.timezone}
                        onChange={(e) => saveSettings({ timezone: e.target.value })}
                        disabled={saving}
                      >
                        {timezones.map(tz => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Communication Preferences</h4>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between w-full max-w-md">
                      <span className="text-sm text-gray-700">Email notifications</span>
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300" 
                        checked={settings.email_notifications}
                        onChange={(e) => saveSettings({ email_notifications: e.target.checked })}
                        disabled={saving}
                      />
                    </label>
                    <label className="flex items-center justify-between w-full max-w-md">
                      <span className="text-sm text-gray-700">Push notifications</span>
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300" 
                        checked={settings.push_notifications}
                        onChange={(e) => saveSettings({ push_notifications: e.target.checked })}
                        disabled={saving}
                      />
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
                  <button 
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                    onClick={handleChangePassword}
                    disabled={saving}
                  >
                    Change Password
                  </button>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Two-Factor Authentication</h4>
                  <p className="text-sm text-gray-600 mb-3">Add an extra layer of security to your account</p>
                  <button 
                    className={`px-4 py-2 rounded-lg disabled:bg-gray-100 flex items-center gap-2 ${
                      settings.two_factor_enabled 
                        ? 'border border-red-300 text-red-700 hover:bg-red-50' 
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={handleEnable2FA}
                    disabled={saving}
                  >
                    {settings.two_factor_enabled ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        2FA Enabled (Click to disable)
                      </>
                    ) : (
                      'Enable 2FA'
                    )}
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
                      <input 
                        type="radio" 
                        name="visibility" 
                        className="mr-2" 
                        checked={settings.profile_visibility === 'public'}
                        onChange={() => saveSettings({ profile_visibility: 'public' })}
                        disabled={saving}
                      />
                      <span className="text-sm text-gray-700">Public - Anyone can see your profile</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="radio" 
                        name="visibility" 
                        className="mr-2" 
                        checked={settings.profile_visibility === 'network'}
                        onChange={() => saveSettings({ profile_visibility: 'network' })}
                        disabled={saving}
                      />
                      <span className="text-sm text-gray-700">Network - Only your connections can see your profile</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="radio" 
                        name="visibility" 
                        className="mr-2" 
                        checked={settings.profile_visibility === 'private'}
                        onChange={() => saveSettings({ profile_visibility: 'private' })}
                        disabled={saving}
                      />
                      <span className="text-sm text-gray-700">Private - Only you can see your profile</span>
                    </label>
                  </div>
                </div>

                {/* Yeni: Mesajlaşma İzinleri Bölümü */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Messaging Permissions</h4>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input 
                        type="radio" 
                        name="message_permissions" 
                        className="mr-2" 
                        checked={settings.message_permissions === 'public'}
                        onChange={() => saveSettings({ message_permissions: 'public' })}
                        disabled={saving}
                      />
                      <span className="text-sm text-gray-700">Public - Anyone can message me</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="radio" 
                        name="message_permissions" 
                        className="mr-2" 
                        checked={settings.message_permissions === 'network'}
                        onChange={() => saveSettings({ message_permissions: 'network' })}
                        disabled={saving}
                      />
                      <span className="text-sm text-gray-700">Network - Only my connections can message me</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="radio" 
                        name="message_permissions" 
                        className="mr-2" 
                        checked={settings.message_permissions === 'private'}
                        onChange={() => saveSettings({ message_permissions: 'private' })}
                        disabled={saving}
                      />
                      <span className="text-sm text-gray-700">Private - No one can message me</span>
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
                  <h4 className="font-semibold text-gray-900 mb-4">Export Your Data</h4>
                  <p className="text-sm text-gray-600 mb-3">Download all your account data in JSON format (GDPR compliant)</p>
                  <button 
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 flex items-center gap-2"
                    onClick={handleExportData}
                    disabled={exportingData || saving}
                  >
                    {exportingData ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Export Data
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Privacy Controls</h4>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between w-full max-w-md">
                      <div>
                        <span className="text-sm text-gray-700 block">Show activity status</span>
                        <span className="text-xs text-gray-500">Let others see when you're online</span>
                      </div>
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300" 
                        checked={settings.activity_status_visible}
                        onChange={(e) => saveSettings({ activity_status_visible: e.target.checked })}
                        disabled={saving}
                      />
                    </label>
                    <label className="flex items-center justify-between w-full max-w-md">
                      <div>
                        <span className="text-sm text-gray-700 block">Search visibility</span>
                        <span className="text-xs text-gray-500">Allow others to find you in search</span>
                      </div>
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300" 
                        checked={settings.search_visible}
                        onChange={(e) => saveSettings({ search_visible: e.target.checked })}
                        disabled={saving}
                      />
                    </label>
                    <label className="flex items-center justify-between w-full max-w-md">
                      <div>
                        <span className="text-sm text-gray-700 block">Profile view tracking</span>
                        <span className="text-xs text-gray-500">Track who views your profile</span>
                      </div>
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300" 
                        checked={settings.profile_view_tracking}
                        onChange={(e) => saveSettings({ profile_view_tracking: e.target.checked })}
                        disabled={saving}
                      />
                    </label>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Quiet Hours</h4>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between w-full max-w-md">
                      <span className="text-sm text-gray-700">Enable quiet hours</span>
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300" 
                        checked={settings.quiet_hours_enabled}
                        onChange={(e) => saveSettings({ quiet_hours_enabled: e.target.checked })}
                        disabled={saving}
                      />
                    </label>
                    {settings.quiet_hours_enabled && (
                      <div className="flex gap-3 items-center max-w-md">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-600 mb-1">Start time</label>
                          <input 
                            type="time"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            value={settings.quiet_hours_start}
                            onChange={(e) => saveSettings({ quiet_hours_start: e.target.value })}
                            disabled={saving}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-600 mb-1">End time</label>
                          <input 
                            type="time"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            value={settings.quiet_hours_end}
                            onChange={(e) => saveSettings({ quiet_hours_end: e.target.value })}
                            disabled={saving}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Account Deletion</h4>
                  <p className="text-sm text-gray-600 mb-3">Permanently delete your account and all data</p>
                  <button 
                    className="flex items-center justify-center w-10 h-10 bg-red-600 text-white rounded-full hover:bg-red-700 disabled:bg-gray-300"
                    onClick={handleDeleteAccount}
                    disabled={saving}
                    title="Delete Account"
                  >
                    <Trash2 className="w-5 h-5" />
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
                    <label className="flex items-center justify-between w-full max-w-md">
                      <span className="text-sm text-gray-700">New connection requests</span>
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300" 
                        checked={settings.email_connection_requests}
                        onChange={(e) => saveSettings({ email_connection_requests: e.target.checked })}
                        disabled={saving || !settings.email_notifications}
                      />
                    </label>
                    <label className="flex items-center justify-between w-full max-w-md">
                      <span className="text-sm text-gray-700">Messages</span>
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300" 
                        checked={settings.email_messages}
                        onChange={(e) => saveSettings({ email_messages: e.target.checked })}
                        disabled={saving || !settings.email_notifications}
                      />
                    </label>
                    <label className="flex items-center justify-between w-full max-w-md">
                      <span className="text-sm text-gray-700">Feed posts</span>
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300" 
                        checked={settings.email_community_posts}
                        onChange={(e) => saveSettings({ email_community_posts: e.target.checked })}
                        disabled={saving || !settings.email_notifications}
                      />
                    </label>
                    <label className="flex items-center justify-between w-full max-w-md">
                      <span className="text-sm text-gray-700">Post reactions</span>
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300" 
                        checked={settings.email_post_reactions}
                        onChange={(e) => saveSettings({ email_post_reactions: e.target.checked })}
                        disabled={saving || !settings.email_notifications}
                      />
                    </label>
                    <label className="flex items-center justify-between w-full max-w-md">
                      <span className="text-sm text-gray-700">Comments</span>
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300" 
                        checked={settings.email_comments}
                        onChange={(e) => saveSettings({ email_comments: e.target.checked })}
                        disabled={saving || !settings.email_notifications}
                      />
                    </label>
                    <label className="flex items-center justify-between w-full max-w-md">
                      <span className="text-sm text-gray-700">Mentions</span>
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300" 
                        checked={settings.email_mentions}
                        onChange={(e) => saveSettings({ email_mentions: e.target.checked })}
                        disabled={saving || !settings.email_notifications}
                      />
                    </label>
                    <label className="flex items-center justify-between w-full max-w-md">
                      <span className="text-sm text-gray-700">Events</span>
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300" 
                        checked={settings.email_events}
                        onChange={(e) => saveSettings({ email_events: e.target.checked })}
                        disabled={saving || !settings.email_notifications}
                      />
                    </label>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Push Notifications</h4>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between w-full max-w-md">
                      <span className="text-sm text-gray-700">New messages</span>
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300" 
                        checked={settings.push_messages}
                        onChange={(e) => saveSettings({ push_messages: e.target.checked })}
                        disabled={saving || !settings.push_notifications}
                      />
                    </label>
                    <label className="flex items-center justify-between w-full max-w-md">
                      <span className="text-sm text-gray-700">Connection activity</span>
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300" 
                        checked={settings.push_connection_activity}
                        onChange={(e) => saveSettings({ push_connection_activity: e.target.checked })}
                        disabled={saving || !settings.push_notifications}
                      />
                    </label>
                    <label className="flex items-center justify-between w-full max-w-md">
                      <span className="text-sm text-gray-700">Post reactions</span>
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300" 
                        checked={settings.push_post_reactions}
                        onChange={(e) => saveSettings({ push_post_reactions: e.target.checked })}
                        disabled={saving || !settings.push_notifications}
                      />
                    </label>
                    <label className="flex items-center justify-between w-full max-w-md">
                      <span className="text-sm text-gray-700">Comments</span>
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300" 
                        checked={settings.push_comments}
                        onChange={(e) => saveSettings({ push_comments: e.target.checked })}
                        disabled={saving || !settings.push_notifications}
                      />
                    </label>
                    <label className="flex items-center justify-between w-full max-w-md">
                      <span className="text-sm text-gray-700">Mentions</span>
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300" 
                        checked={settings.push_mentions}
                        onChange={(e) => saveSettings({ push_mentions: e.target.checked })}
                        disabled={saving || !settings.push_notifications}
                      />
                    </label>
                    <label className="flex items-center justify-between w-full max-w-md">
                      <span className="text-sm text-gray-700">Events</span>
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300" 
                        checked={settings.push_events}
                        onChange={(e) => saveSettings({ push_events: e.target.checked })}
                        disabled={saving || !settings.push_notifications}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'blocked' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Blocked Users</h3>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                {loadingBlocked ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  </div>
                ) : blockedUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <UserX className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No blocked users</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {blockedUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar src={user.avatar_url} name={user.full_name} size={40} />
                          <div>
                            <p className="font-medium text-gray-900">{user.full_name}</p>
                            {user.profession && (
                              <p className="text-sm text-gray-500">{user.profession}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnblockUser(user.id)}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Unblock
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'sessions' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Active Sessions</h3>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                {loadingSessions ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8">
                    <Monitor className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No active sessions</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessions.map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-4">
                          {session.device === 'Mobile' ? (
                            <Smartphone className="w-5 h-5 text-gray-400" />
                          ) : (
                            <Monitor className="w-5 h-5 text-gray-400" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">{session.browser} on {session.device}</p>
                              {session.current && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">Current</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{session.location}</p>
                            <p className="text-xs text-gray-400">Last active: {new Date(session.last_active).toLocaleString()}</p>
                          </div>
                        </div>
                        {!session.current && (
                          <button
                            onClick={() => handleTerminateSession(session.id)}
                            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Change Password Modal */}
          {changePasswordModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Change Password</h3>
                  <button onClick={() => setChangePasswordModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                    <input
                      type="password"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      value={passwordForm.current}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <input
                      type="password"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      value={passwordForm.new}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                    />
                  </div>
                  {passwordError && (
                    <div className="text-red-600 text-sm">{passwordError}</div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleChangePasswordSubmit}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Change Password
                    </button>
                    <button
                      onClick={() => setChangePasswordModal(false)}
                      className="flex items-center justify-center w-10 h-10 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      title="Cancel"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2FA Setup Modal */}
          {twoFactorModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Enable Two-Factor Authentication</h3>
                  <button onClick={() => setTwoFactorModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-3">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
                    <div className="bg-gray-100 p-4 rounded-lg flex justify-center items-center min-h-[200px] mb-3">
                      {twoFactorQR ? (
                        <div className="text-center">
                          <QrCode className="w-32 h-32 text-gray-400 mx-auto mb-2" />
                          <p className="text-xs text-gray-500 mt-2">Secret: {twoFactorSecret}</p>
                          <p className="text-xs text-gray-400 mt-1">(In production, QR code would be displayed here)</p>
                        </div>
                      ) : (
                        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Enter 6-digit code</label>
                    <input
                      type="text"
                      maxLength={6}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-center text-2xl tracking-widest"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handle2FAEnable}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Verify & Enable
                    </button>
                    <button
                      onClick={() => setTwoFactorModal(false)}
                      className="flex items-center justify-center w-10 h-10 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      title="Cancel"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Saving Indicator */}
          {saving && (
            <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              Saving...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AppInner() {
  const postRefs = useRef<{ [postId: string]: HTMLDivElement | null }>({});
  const { status: connectionStatus } = useNetworkStatus();
  const [activeView, setActiveView] = useState<'map' | 'community'>('community')
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [selectedMobileConversation, setSelectedMobileConversation] = useState<Conversation | null>(null);
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
  
  // Community feed states
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
  
  // Chat boxes state
  const [chatBoxes, setChatBoxes] = useState<ChatBox[]>([])
  const [conversationMetadata, setConversationMetadata] = useState<{ [key: string]: ConversationMetadata }>({})
  const [isMessagesOverlayOpen, setIsMessagesOverlayOpen] = useState(false)
  
  // Connections state
  const [connections, setConnections] = useState<Connection[]>([])
  const [connectionRequests, setConnectionRequests] = useState<Connection[]>([])
  const [isConnectionsOpen, setIsConnectionsOpen] = useState(false)
  
  // Settings state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  
  // CV Maker state
  const [isCVMakerOpen, setIsCVMakerOpen] = useState(false)
  
  // Blocked users state
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]) // Users I blocked
  const [blockedByUserIds, setBlockedByUserIds] = useState<string[]>([]) // Users who blocked me
  
  // Notifications state
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0)
  
  // Messages dropdown state
  const [showMessagesDropdown, setShowMessagesDropdown] = useState(false)
  const messagesDropdownRef = useRef<HTMLDivElement>(null)
  
  // Cache
  const profileCacheRef = useRef<{ [key: string]: { data: any, timestamp: number } }>({})
  const loadingProfileRef = useRef<{ [key: string]: boolean }>({})

  const updateProfileInState = (updatedProfile: Profile) => {
    console.log('🔄 Updating profile in state:', updatedProfile.id);
    
    setTherapists(prev => prev.map(t => 
      t.id === updatedProfile.id ? { ...t, ...updatedProfile } : t
    ));
    
    if (currentUser?.id === updatedProfile.id) {
      setUserProfile(updatedProfile);
    }
    
    profileCacheRef.current[updatedProfile.id] = {
      data: updatedProfile,
      timestamp: Date.now()
    };
  };

  const updateProfileInAllComponents = (profileId: string, updates: Partial<Profile>) => {
    console.log('🔄 Updating profile in all components:', profileId);
    
    setTherapists(prev => prev.map(t => 
      t.id === profileId ? { ...t, ...updates } : t
    ));
    
    if (currentUser?.id === profileId && userProfile) {
      setUserProfile({ ...userProfile, ...updates });
    }
    
    if (profileCacheRef.current[profileId]) {
      profileCacheRef.current[profileId] = {
        data: { ...profileCacheRef.current[profileId].data, ...updates },
        timestamp: Date.now()
      };
    }
  };

  // Community feed functions
  const loadPosts = async () => {
    try {
      let query = supabase
        .from('posts')
        .select(`
          *,
          user:profiles!user_id (id, full_name, profession, avatar_url, specialties, languages)
        `)
        .order('created_at', { ascending: false })

      // Apply filters
      if (feedFilters.professions.length > 0) {
        query = query.contains('post_metadata->professions', feedFilters.professions)
      }
      if (feedFilters.clinical_areas.length > 0) {
        query = query.contains('post_metadata->clinical_areas', feedFilters.clinical_areas)
      }
      if (feedFilters.content_types.length > 0) {
        query = query.in('post_metadata->content_type', feedFilters.content_types)
      }
      if (feedFilters.tags.length > 0) {
        query = query.contains('post_metadata->tags', feedFilters.tags)
      }
      if (feedFilters.audience_levels.length > 0) {
        query = query.in('post_metadata->audience_level', feedFilters.audience_levels)
      }
      if (feedFilters.related_conditions.length > 0) {
        query = query.contains('post_metadata->related_conditions', feedFilters.related_conditions)
      }
      if (feedFilters.languages.length > 0) {
        query = query.in('post_metadata->language', feedFilters.languages)
      }
      if (feedFilters.show_only_my_profession && userProfile?.profession) {
        query = query.contains('post_metadata->professions', [userProfile.profession])
      }
      if (feedFilters.show_only_my_network && connections && connections.length > 0) {
        const connectedIds = connections.map((c: any) => (c.sender_id === currentUser?.id ? c.receiver_id : c.sender_id))
        query = query.in('user_id', connectedIds)
      }

      const { error } = await query

      if (error) throw error
    } catch (err) {
      console.error('Error loading posts:', err)
    }
  }

  const loadComments = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          *,
          user:profiles(*)
        `)
        .eq('post_id', postId)
        .is('parent_reply_id', null)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Load replies for each comment
      await Promise.all(
        (data || []).map(async (comment) => {
          await supabase
            .from('post_comments')
            .select(`
              *,
              user:profiles(*)
            `)
            .eq('parent_reply_id', comment.id)
            .order('created_at', { ascending: true })
        })
      )

    } catch (err) {
      console.error('Error loading comments:', err)
    }
  }


  useEffect(() => {
    const globalWindow = window as any;
    globalWindow.updateProfileInState = updateProfileInState;
    globalWindow.updateProfileInAllComponents = updateProfileInAllComponents;
    
    return () => {
      globalWindow.updateProfileInState = undefined;
      globalWindow.updateProfileInAllComponents = undefined;
    };
  }, [currentUser?.id, userProfile, therapists]);

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

  useEffect(() => {
    const handleOpenProfileDetail = (event: CustomEvent) => {
      setSelectedProfileId(event.detail.profileId)
    }

    window.addEventListener('openProfileDetail', handleOpenProfileDetail as EventListener)
    return () => window.removeEventListener('openProfileDetail', handleOpenProfileDetail as EventListener)
  }, [])


  useEffect(() => {
    const handleOpenCVMaker = () => {
      setIsCVMakerOpen(true)
    }

    window.addEventListener('openCVMaker', handleOpenCVMaker)
    return () => window.removeEventListener('openCVMaker', handleOpenCVMaker)
  }, [])

  useEffect(() => {
    updatePageTitle(unreadMessagesCount > 0)
  }, [unreadMessagesCount, originalTitle])

  // Load posts when community view is active
  useEffect(() => {
    if (activeView === 'community') {
      loadPosts()
    }
  }, [activeView, feedFilters, userProfile, connections])

  // Load user reactions when user logs in
  useEffect(() => {
    if (currentUser?.id) {
    }
  }, [currentUser?.id])

  // Sticky button position update

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

  const loadBlockedUsers = async () => {
    if (!currentUser?.id) {
      setBlockedUserIds([])
      setBlockedByUserIds([])
      return
    }
    
    try {
      // Load users I blocked
      const { data, error } = await supabase
        .from('user_settings')
        .select('blocked_users')
        .eq('id', currentUser.id)
        .single()
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Error loading blocked users:', error)
      } else {
        const blockedIds = data?.blocked_users || []
        setBlockedUserIds(blockedIds)
      }
      
      // Load users who blocked me (users whose blocked_users array contains my ID)
      const { data: blockedByData, error: blockedByError } = await supabase
        .from('user_settings')
        .select('id')
        .contains('blocked_users', [currentUser.id])
      
      if (blockedByError) {
        console.error('Error loading users who blocked me:', blockedByError)
        setBlockedByUserIds([])
      } else {
        const blockedByIds = (blockedByData || []).map(s => s.id)
        setBlockedByUserIds(blockedByIds)
      }
    } catch (err) {
      console.error('Error loading blocked users:', err)
      setBlockedUserIds([])
      setBlockedByUserIds([])
    }
  }
  
  // Combined list of all users we should hide (either I blocked them or they blocked me)
  const allHiddenUserIds = useMemo(() => {
    return [...new Set([...blockedUserIds, ...blockedByUserIds])]
  }, [blockedUserIds, blockedByUserIds])

  useEffect(() => {
    console.log('🚀 App mounted')
    loadProfiles()
    initializeAuth()
    
    return () => {
      console.log('🔍 App unmounting')
    }
  }, [])
  
  useEffect(() => {
    if (currentUser?.id) {
      loadBlockedUsers()
    } else {
      setBlockedUserIds([])
    }
  }, [currentUser?.id])

  useEffect(() => {
    const handleNavigateToMessages = () => {
      setIsMessagesOverlayOpen(true)
      setSelectedProfileId(null)
    }

    window.addEventListener('navigateToMessages', handleNavigateToMessages)
    return () => window.removeEventListener('navigateToMessages', handleNavigateToMessages)
  }, [])

  useEffect(() => {
    const handleOpenAuthModal: EventListener = () => {
      setIsAuthModalOpen(true)
    }
    window.addEventListener('openAuthModal', handleOpenAuthModal)
    return () => window.removeEventListener('openAuthModal', handleOpenAuthModal)
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
          
          if (newMsg.sender_id !== currentUser.id) {
            setUnreadMessagesCount(prev => prev + 1)
            playNotificationSound()
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

  // Close messages dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (messagesDropdownRef.current && !messagesDropdownRef.current.contains(event.target as Node)) {
        setShowMessagesDropdown(false)
      }
    }

    if (showMessagesDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMessagesDropdown])

  // Real-time notifications subscription
  useEffect(() => {
    if (!currentUser?.id) return

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`
        },
        (payload) => {
          const newNotification = payload.new
          setNotifications(prev => [newNotification, ...prev])
          setUnreadNotificationsCount(prev => prev + 1)
          
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(newNotification.title, {
              body: newNotification.message,
              icon: '/favicon.ico'
            })
          }
          
          playNotificationSound?.()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUser?.id])

  // Fallback polling to ensure notifications stay fresh even if a realtime event is missed
  useEffect(() => {
    if (!currentUser?.id) return
    const interval = setInterval(() => {
      loadNotifications()
    }, 60000)
    return () => clearInterval(interval)
  }, [currentUser?.id])

  // Real-time connections subscription
  useEffect(() => {
    if (!currentUser?.id) return;

    const channel = supabase
      .channel('connections-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connections',
          filter: `receiver_id=eq.${currentUser.id}`
        },
        async (payload) => {
          console.log('Connection change (receiver):', payload);

          if (payload.eventType === 'INSERT' && payload.new.status === 'pending') {
            // New incoming request
            const { data: sender } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', payload.new.sender_id)
              .single();

            const newRequest: Connection = {
              id: payload.new.id,
              created_at: payload.new.created_at,
              sender_id: payload.new.sender_id,
              receiver_id: payload.new.receiver_id,
              status: payload.new.status,
              sender,
              receiver: userProfile
            };

            setConnectionRequests(prev => [...prev, newRequest]);
          } else if (payload.eventType === 'UPDATE') {
            // Status change for incoming
            if (payload.new.status === 'accepted') {
              const acceptedConnection: Connection = {
                id: payload.new.id,
                created_at: payload.new.created_at,
                sender_id: payload.new.sender_id,
                receiver_id: payload.new.receiver_id,
                status: 'accepted',
                sender: payload.old?.sender,
                receiver: userProfile
              };
              setConnections(prev => [...prev, acceptedConnection]);
              setConnectionRequests(prev => prev.filter(req => req.id !== payload.new.id));
            } else if (payload.new.status === 'rejected') {
              setConnectionRequests(prev => prev.filter(req => req.id !== payload.new.id));
            }
          } else if (payload.eventType === 'DELETE') {
            setConnectionRequests(prev => prev.filter(req => req.id !== payload.old.id));
            setConnections(prev => prev.filter(conn => conn.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connections',
          filter: `sender_id=eq.${currentUser.id}`
        },
        async (payload) => {
          console.log('Connection change (sender):', payload);

          if (payload.eventType === 'INSERT' && payload.new.status === 'pending') {
            // New outgoing request - should NOT be added to connectionRequests
            // connectionRequests should only contain requests received by us (receiver_id === currentUser.id)
            // Outgoing requests are handled separately by loadSentRequests() in ConnectionsManager
          } else if (payload.eventType === 'UPDATE') {
            // Status change for outgoing - should only update connections, not connectionRequests
            if (payload.new.status === 'accepted') {
              const acceptedConnection: Connection = {
                id: payload.new.id,
                created_at: payload.new.created_at,
                sender_id: payload.new.sender_id,
                receiver_id: payload.new.receiver_id,
                status: 'accepted',
                sender: userProfile,
                receiver: payload.old?.receiver
              };
              setConnections(prev => [...prev, acceptedConnection]);
              // Don't filter connectionRequests here - this is an outgoing request
            }
            // Rejected outgoing requests don't need to update connectionRequests
          } else if (payload.eventType === 'DELETE') {
            // Only remove from connections, not from connectionRequests (outgoing request)
            setConnections(prev => prev.filter(conn => conn.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        console.log('Connections subscription:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, userProfile]);

  const loadConnections = async () => {
    if (!currentUser?.id) return
    
    try {
      const { data: connectionsData, error } = await supabase
        .from('connections')
        .select('*, sender:profiles!sender_id(*), receiver:profiles!receiver_id(*)')
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .eq('status', 'accepted')
      
      if (!error && connectionsData) {
        setConnections(connectionsData)
      }
      
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

  const loadNotifications = async () => {
    if (!currentUser?.id) return
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (error) {
        console.error('Error loading notifications:', error)
        return
      }
      
      setNotifications(data || [])
      const unreadCount = (data || []).filter(n => !n.read).length
      setUnreadNotificationsCount(unreadCount)
    } catch (err) {
      console.error('Error loading notifications:', err)
    }
  }
  
  const sendConnectionRequest = async (receiverId: string) => {
    if (!currentUser?.id) {
      setIsAuthModalOpen(true);
      return;
    }

    // Check if user is blocked or has blocked me
    if (allHiddenUserIds.includes(receiverId)) {
      const errorEvent = new CustomEvent('showToast', {
        detail: { message: 'Cannot send connection request to this user', type: 'error' }
      })
      window.dispatchEvent(errorEvent)
      return
    }

    try {
      // Önce aynı connection'ın olup olmadığını kontrol et
      const { data: existingConnection } = await supabase
        .from('connections')
        .select('id, status')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUser.id})`)
        .maybeSingle();

      if (existingConnection) {
        if (existingConnection.status === 'pending') {
          alert('Connection request already sent');
          return;
        } else if (existingConnection.status === 'accepted') {
          alert('You are already connected with this user');
          return;
        }
      }

      // Yeni connection request oluştur
      const { data, error } = await supabase
        .from('connections')
        .insert({
          sender_id: currentUser.id,
          receiver_id: receiverId,
          status: 'pending'
        })
        .select(`
          *,
          sender:profiles!sender_id(*),
          receiver:profiles!receiver_id(*)
        `)
        .single();

      if (error) {
        console.error('Connection request error:', error);
        throw error;
      }

      // Notification oluştur (title olmadan)
      await supabase
        .from('notifications')
        .insert({
          user_id: receiverId,
          message: `${currentUser.user_metadata?.full_name || 'Someone'} sent you a connection request`,
          type: 'connection_request',
          related_entity_type: 'connection',
          related_entity_id: data.id
        });

      // State'i güncelle
      setConnectionRequests(prev => [...prev, data]);

    } catch (err: any) {
      console.error('Error sending connection request:', err);
      
      if (err.code === '23505') {
        alert('Connection request already sent');
      } else if (err.code === '42501') {
        alert('Permission denied. Please check your database permissions.');
      } else {
        alert('Failed to send connection request. Please try again.');
      }
    }
  };

  const acceptConnectionRequest = async (connectionId: string) => {
    try {
      const { data: connection, error: updateError } = await supabase
        .from('connections')
        .update({ status: 'accepted' })
        .eq('id', connectionId)
        .select('*, sender:profiles!sender_id(*), receiver:profiles!receiver_id(*)')
        .single();
      
      if (updateError) throw updateError;
      
      if (connection) {
        setConnections(prev => [...prev, connection]);
        setConnectionRequests(prev => prev.filter(req => req.id !== connectionId));

        // Notify the sender about acceptance
        await supabase
          .from('notifications')
          .insert({
            user_id: connection.sender_id,
            message: `${userProfile?.full_name || 'Someone'} accepted your connection request`,
            type: 'connection_accepted',
            related_entity_type: 'connection',
            related_entity_id: connection.id
          });
      }
      
    } catch (err: any) {
      console.error('Error accepting connection request:', err)
      alert('Failed to accept connection request')
    }
  }

  const rejectConnectionRequest = async (connectionId: string) => {
    try {
      const { data: connection, error: deleteError } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId)
        .select('sender_id')
        .single();
      
      if (deleteError) throw deleteError;
      
      setConnectionRequests(prev => prev.filter(req => req.id !== connectionId));

      // Optionally notify sender about rejection
      if (connection) {
        await supabase
          .from('notifications')
          .insert({
            user_id: connection.sender_id,
            message: `${userProfile?.full_name || 'Someone'} rejected your connection request`,
            type: 'connection_rejected',
            related_entity_type: 'connection',
            related_entity_id: connectionId
          });
      }
      
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
      
      setConnectionRequests(prev => prev.filter(req => req.id !== connectionId))
      
    } catch (err: any) {
      console.error('Error canceling connection request:', err)
      alert('Failed to cancel connection request')
    }
  }

  const handleBlockUserInAppInner = async (userId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || userId === user.id) return

    try {
      // Get current blocked users
      const { data: currentSettings } = await supabase
        .from('user_settings')
        .select('blocked_users')
        .eq('id', user.id)
        .single()

      const currentBlocked = currentSettings?.blocked_users || []
      const updatedBlocked = [...currentBlocked, userId]

      await supabase
        .from('user_settings')
        .upsert({
          id: user.id,
          blocked_users: updatedBlocked,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })

      // Reload blocked users list (both blocked and blocked by)
      await loadBlockedUsers()

      const successEvent = new CustomEvent('showToast', {
        detail: { message: 'User blocked successfully', type: 'success' }
      })
      window.dispatchEvent(successEvent)
    } catch (err) {
      console.error('Error blocking user:', err)
      const errorEvent = new CustomEvent('showToast', {
        detail: { message: 'Error blocking user', type: 'error' }
      })
      window.dispatchEvent(errorEvent)
    }
  }

  const handleNotificationClick = async (notification: any) => {
    // Mark as clicked (not just read)
    try {
      await supabase
        .from('notifications')
        .update({ 
          read: true,
          clicked_at: new Date().toISOString()
        })
        .eq('id', notification.id)

      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, read: true, clicked_at: new Date().toISOString() } : n)
      )
      setUnreadNotificationsCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Error updating notification click:', err)
    }

    setShowNotifications(false)

    // Handle different notification types
    if (notification.type === 'connection_request') {
      setIsConnectionsOpen(true)
      return
    }

    if (notification.type === 'post_reaction' || notification.type === 'comment' || notification.type === 'comment_reaction') {
      // Switch to community view if not already there
      if (activeView !== 'community') {
        setActiveView('community')
        // Wait a bit for component to mount, then trigger event
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('openPostFromNotification', {
            detail: {
              postId: notification.related_entity_type === 'post' ? notification.related_entity_id : 
                     (notification.metadata?.post_id || notification.related_entity_id),
              commentId: notification.metadata?.comment_id || (notification.type === 'comment_reaction' ? notification.related_entity_id : null),
              scrollToReaction: notification.type === 'post_reaction' || notification.type === 'comment_reaction'
            }
          }))
        }, 300)
      } else {
        // Trigger event immediately
        window.dispatchEvent(new CustomEvent('openPostFromNotification', {
          detail: {
            postId: notification.related_entity_type === 'post' ? notification.related_entity_id : 
                   (notification.metadata?.post_id || notification.related_entity_id),
            commentId: notification.metadata?.comment_id || (notification.related_entity_type === 'comment' ? notification.related_entity_id : null),
            scrollToReaction: notification.type === 'post_reaction' || notification.type === 'comment_reaction'
          }
        }))
      }
    }
  }

  // Check for missed notifications (24 hours old, not clicked)
  useEffect(() => {
    if (!currentUser?.id) return

    const checkMissedNotifications = async () => {
      try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        
        const { data: missedNotifications } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', currentUser.id)
          .lt('created_at', twentyFourHoursAgo)
          .is('clicked_at', null)
          .eq('read', false)
          .limit(10)

        if (missedNotifications && missedNotifications.length > 0) {
          // Create reminder notification
          await supabase
            .from('notifications')
            .insert({
              user_id: currentUser.id,
              title: 'You have missed notifications',
              message: `You have ${missedNotifications.length} notification(s) you haven't checked in over 24 hours`,
              type: 'reminder',
              related_entity_type: 'notification',
              related_entity_id: null
            })
        }
      } catch (err) {
        console.error('Error checking missed notifications:', err)
      }
    }

    // Check on mount and every hour
    checkMissedNotifications()
    const interval = setInterval(checkMissedNotifications, 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [currentUser?.id])

  const markAllNotificationsAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', currentUser?.id)
        .eq('read', false)
      
      if (error) throw error
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadNotificationsCount(0)
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
    }
  }

  useEffect(() => {
    if (currentUser?.id) {
      loadConnections()
      loadNotifications()
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

  // Event listeners for chat box and connection requests
  useEffect(() => {
    const handleOpenChatBox = (event: Event) => {
      const customEvent = event as CustomEvent
      openChatBox(customEvent.detail.conversation)
    }

    const handleSendConnectionRequest = async (event: Event) => {
      const customEvent = event as CustomEvent
      await sendConnectionRequest(customEvent.detail.receiverId)
    }

    window.addEventListener('openChatBox', handleOpenChatBox)
    window.addEventListener('sendConnectionRequest', handleSendConnectionRequest)
    
    return () => {
      window.removeEventListener('openChatBox', handleOpenChatBox)
      window.removeEventListener('sendConnectionRequest', handleSendConnectionRequest)
    }
  }, [openChatBox, sendConnectionRequest])

  const filteredTherapists = therapists.filter(therapist => {
    // Filter out blocked users (either I blocked them or they blocked me)
    if (allHiddenUserIds.includes(therapist.id)) {
      return false
    }
    
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
      <ConnectionStatusBanner status={connectionStatus} />
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="w-full max-w-7xl mx-auto flex items-center gap-4 px-4 py-3">
          <div className="flex items-center pr-2">
          <h1 className="text-2xl font-bold text-gray-900">UK Therapist Network</h1>
        </div>

          <div className="flex-1 px-2">
            <div className="max-w-2xl">
              <GlobalSearch
                blockedUserIds={allHiddenUserIds}
                onSelectPerson={(id) => {
                  setSelectedProfileId(id)
                  setActiveView('community')
                }}
                onSelectPost={(postId) => {
                  const target = postRefs.current[postId]
                  if (target?.scrollIntoView) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                  loadComments(postId)
                }}
                isConnected={(profileId) => {
                  try {
                    const connSet = new Set((connections || []).map((c: any) => (c.sender_id === currentUser?.id ? c.receiver_id : c.sender_id)))
                    return connSet.has(profileId)
                  } catch { return false }
                }}
            />
          </div>
        </div>
        
          <nav className="flex items-center space-x-3 text-gray-600 pl-2">
          {/* Home Button */}
          <button
            onClick={() => {
              setActiveView('community')
              setSelectedProfileId(null)
            }}
            className={`flex items-center justify-center w-10 h-10 rounded-full text-xs sm:text-sm font-medium transition-all ${
              activeView === 'community' && !selectedProfileId
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <IoHome className="w-5 h-5" />
          </button>
        
          {/* Network Button (Visible only if logged in) */}
          {currentUser && (
            <div className="relative">
              <button
                onClick={() => setIsConnectionsOpen(true)}
                className="flex items-center justify-center w-10 h-10 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
                aria-label="Network"
              >
                <UserPlus className="w-5 h-5" />
                {/* Connection requests badge */}
                {connectionRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center pointer-events-none z-10">
                    {connectionRequests.length > 9 ? '9+' : connectionRequests.length}
                  </span>
                )}
              </button>
            </div>
          )}
        
          {/* Map Button */}
          <button
            onClick={() => {
              setActiveView('map')
              setSelectedProfileId(null)
            }}
            className={`flex items-center justify-center w-10 h-10 rounded-full text-xs sm:text-sm font-medium transition-all ${
              activeView === 'map' && !selectedProfileId
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <MapPin className="w-5 h-5" />
          </button>
        
          {/* Messages */}
          <div className="relative" ref={messagesDropdownRef}>
            <button 
              onClick={() => setShowMessagesDropdown(!showMessagesDropdown)}
              className="flex items-center justify-center w-10 h-10 rounded-full text-xs sm:text-sm font-medium transition-all text-gray-600 hover:text-blue-700 hover:bg-blue-100 relative"
            >
              <MessageCircle className="w-5 h-5" />
              {/* Badge Messages butonunun üzerinde */}
              {unreadMessagesCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center pointer-events-none z-10">
                  {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                </span>
              )}
            </button>
            
            {/* Messages Dropdown */}
            {showMessagesDropdown && (
              <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[70vh] overflow-hidden flex flex-col animate-slideDown">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-blue-600" />
                    Messages
                  </h3>
                  <button
                    onClick={() => {
                      setShowMessagesDropdown(false)
                      setIsMessagesOverlayOpen(true)
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View all
                  </button>
                </div>
                
                <div className="overflow-y-auto flex-1">
                  <ConversationsList
                    currentUserId={currentUser?.id || ''}
                    onSelectConversation={(conv: Conversation) => {
                      openChatBox(conv)
                      setShowMessagesDropdown(false)
                    }}
                    selectedConversationId={undefined}
		    onUnreadCountChange={setUnreadMessagesCount}
                    conversationMetadata={conversationMetadata}
                    onUpdateMetadata={updateConversationMetadata}
                    compact={true}
                    playNotificationSound={playNotificationSound}
                    onOpenConnections={() => setIsConnectionsOpen(true)}
                  />
                </div>
              </div>
            )}
          </div>
        
          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="flex items-center justify-center w-10 h-10 rounded-full text-xs sm:text-sm font-medium transition-all text-gray-600 hover:text-blue-700 hover:bg-blue-100 relative"
            >
              <Bell className="w-5 h-5" />
              {/* Badge Notifications butonunun üzerinde */}
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center pointer-events-none z-10">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>
            
            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[80vh] overflow-hidden flex flex-col animate-slideDown">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-purple-50 to-pink-50">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-purple-600" />
                    Notifications
                  </h3>
                  {unreadNotificationsCount > 0 && (
                    <button
                      onClick={markAllNotificationsAsRead}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                
                <div className="overflow-y-auto flex-1">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                          !notification.read ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            !notification.read ? 'bg-blue-600' : 'bg-transparent'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!notification.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                              {notification.title}
                            </p>
                            {notification.message && (
                              <p className="text-xs text-gray-600 mt-1">
                                {notification.message}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(notification.created_at).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No notifications yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        
          {/* Account Dropdown */}
          <AccountDropdown
            currentUser={currentUser}
            onProfileClick={handleProfileClick}
            onSettingsClick={handleSettingsClick}
            onSignOut={handleSignOut}
            onOpenConnections={() => setIsConnectionsOpen(true)}
          />
        </nav>
        </div>
      </header>
        
      
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
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
            updateProfileInState={updateProfileInState}
            onBlockUser={handleBlockUserInAppInner}
            allHiddenUserIds={allHiddenUserIds}
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
            
            <div className="flex-1 relative min-h-[75vh] md:min-h-0">
              <MapComponent 
                therapists={filteredTherapists}
                geocodeLocation={geocodeLocation}
                onProfileClick={(id: string) => setSelectedProfileId(id)}
              />
              
            </div>
          </>
        ) : activeView === 'community' ? (
          <CommunityComponent onOpenConnections={() => setIsConnectionsOpen(true)} />
        ) : null}
      </div>

      {isAuthModalOpen && (
        <AuthModalComponent 
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={() => {
            loadProfiles();
            if (currentUser?.id) {
              loadUserProfile(currentUser.id);
            }
          }}
          currentUser={currentUser}
          userProfile={userProfile}
          onOpenProfileDetail={(profileId: string) => setSelectedProfileId(profileId)}
          updateProfileInState={updateProfileInState}
        />
      )}

      {/* Chat Boxes */}
      <div className="hidden md:block">
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
      </div>

      {/* Mobile Messages Overlay */}
      {isMessagesOverlayOpen && (
        <div className="fixed inset-0 z-50 md:hidden" style={{ bottom: '60px' }}>
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => {
              setIsMessagesOverlayOpen(false)
              setSelectedMobileConversation(null)
            }}
          />
          
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Messages</h3>
                <button 
                  onClick={() => {
                    setIsMessagesOverlayOpen(false)
                    setSelectedMobileConversation(null)
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <ConversationsList
                currentUserId={currentUser?.id || ''}
                onSelectConversation={(conv: Conversation) => {
                  setSelectedMobileConversation(conv)
                  setMobileChatOpen(true)
                  setIsMessagesOverlayOpen(false)
                }}
                selectedConversationId={undefined}
                onUnreadCountChange={setUnreadMessagesCount}
                conversationMetadata={conversationMetadata}
                onUpdateMetadata={updateConversationMetadata}
                compact={false}
                playNotificationSound={playNotificationSound}
                onOpenConnections={() => setIsConnectionsOpen(true)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile Chat Screen */}
      {mobileChatOpen && selectedMobileConversation && (
        <MobileChatScreen
          conversation={selectedMobileConversation}
          currentUserId={currentUser?.id}
          userProfile={userProfile}
          onBack={() => {
            setMobileChatOpen(false)
          }}
          onClose={() => {
            setMobileChatOpen(false)
            setSelectedMobileConversation(null)
          }}
        />
      )}

      {/* Desktop Messages Overlay */}
      <div className="hidden md:block fixed bottom-0 z-[1000] w-full md:w-auto right-0 md:right-4">
        <div className="relative">
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
          
          <div
            className="bg-white border border-gray-300 rounded-t-lg shadow-2xl overflow-hidden md:rounded-lg"
            style={{ width: '100%', maxWidth: '360px' }}
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
              <div
                className="fixed inset-0 bg-white z-50 flex flex-col md:fixed md:inset-auto md:bottom-0 md:right-4 md:w-96 md:h-96 md:rounded-lg"
                style={{ maxHeight: '100vh' }}
              >
                <div className="flex-1 overflow-y-auto">
                  <ConversationsList
                    currentUserId={currentUser?.id || ''}
                    onSelectConversation={(conv: Conversation) => openChatBox(conv)}
                    selectedConversationId={undefined}
                    onUnreadCountChange={setUnreadMessagesCount}
                    conversationMetadata={conversationMetadata}
                    onUpdateMetadata={updateConversationMetadata}
                    compact
                    playNotificationSound={playNotificationSound}
                    onOpenConnections={() => setIsConnectionsOpen(true)}
                  />
                </div>

                <button
                  onClick={() => setIsMessagesOverlayOpen(false)}
                  className="absolute top-2 right-2 text-gray-500 z-10"
                >
                  ✕
                </button>
              </div>
            )}
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
          blockedUserIds={allHiddenUserIds}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsComponent onClose={() => setIsSettingsOpen(false)} />
      )}

      {/* CV Maker Modal */}
      {isCVMakerOpen && (
        <CVMaker 
          userProfile={userProfile} 
          onClose={() => setIsCVMakerOpen(false)} 
        />
      )}

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden">
        <MobileBottomNav
          activeView={activeView}
          setActiveView={setActiveView}
          setSelectedProfileId={setSelectedProfileId}
          setIsConnectionsOpen={setIsConnectionsOpen}
          setIsAuthModalOpen={setIsAuthModalOpen}
          currentUser={currentUser}
          unreadMessagesCount={unreadMessagesCount}
          setIsMessagesOverlayOpen={setIsMessagesOverlayOpen}
        />
      </div>

      {/* Notification Styles */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
        
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

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  )
}

function MobileChatScreen({ 
  conversation, 
  currentUserId,
  userProfile,
  onBack,
  onClose
}: { 
  conversation: Conversation
  currentUserId: string
  userProfile: any
  onBack: () => void
  onClose: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const subscriptionRef = useRef<any>(null)

  useEffect(() => {
    if (conversation?.id && currentUserId) {
      loadMessages()
      subscribeToMessages()
    }

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
      }
    }
  }, [conversation?.id, currentUserId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function loadMessages() {
    if (!conversation) return
    
    const { data, error } = await supabase
      .from('messages')
      .select(`*, sender:profiles(*)`)
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })

    if (!error && data) {
      setMessages(data)
      
      // Mesajları okundu olarak işaretle
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversation.id)
        .eq('read', false)
        .neq('sender_id', currentUserId)
    }
  }

  function subscribeToMessages() {
    if (!conversation || subscriptionRef.current) return

    const channel = supabase
      .channel(`mobile-chat-${conversation.id}-${Date.now()}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`
        },
        async (payload) => {
          const newMsg = payload.new as Message
          
          // Kendi gönderdiğimiz mesajları subscription'dan ekleme, çünkü zaten sendMessage'da ekliyoruz
          if (newMsg.sender_id === currentUserId) {
            return
          }
          
          const { data: senderData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newMsg.sender_id)
            .single()
          
          const messageWithSender = { ...newMsg, sender: senderData }
          setMessages(prev => [...prev, messageWithSender])
          
          // Yeni mesaj geldiğinde okundu olarak işaretle
          await supabase
            .from('messages')
            .update({ read: true })
            .eq('id', newMsg.id)
        }
      )
      .subscribe((status) => {
        console.log(`Mobile chat subscription status:`, status)
      })

    subscriptionRef.current = channel
  }

  async function sendMessage() {
    if (!conversation || !newMessage.trim() || sending) return
  
    setSending(true)
    
    const tempId = `temp-${Date.now()}`
    const tempMessage: Message = {
      id: tempId,
      created_at: new Date().toISOString(),
      conversation_id: conversation.id,
      sender_id: currentUserId,
      content: newMessage.trim(),
      read: true,
      sender: userProfile
    }
    
    // Geçici mesajı ekle
    setMessages(prev => [...prev, tempMessage])
    setNewMessage('')
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: currentUserId,
          content: newMessage.trim()
        })
        .select(`*, sender:profiles(*)`)
        .single()
    
      if (error) {
        // Hata olursa geçici mesajı kaldır
        setMessages(prev => prev.filter(msg => msg.id !== tempId))
        alert('Failed to send message')
        return
      }
      
      // Geçici mesajı gerçek mesajla değiştir
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? data : msg
      ))
      
      // Konuşmanın son mesaj tarihini güncelle
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversation.id)
        
    } catch (err) {
      console.error('Send message error:', err)
      setMessages(prev => prev.filter(msg => msg.id !== tempId))
      alert('Failed to send message')
    } finally {
      setSending(false)
    }
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

  return (
    <div className="fixed inset-0 z-50 bg-white md:hidden flex flex-col">
      {/* Header - Geri butonu ve kapatma butonu */}
      <div className="bg-blue-600 text-white p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-1"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex items-center space-x-3">
            <Avatar src={conversation.other_user?.avatar_url} name={conversation.other_user?.full_name} size={40} />
            <div>
              <h2 className="font-semibold text-white">{conversation.other_user.full_name}</h2>
              <p className="text-blue-100 text-sm">{conversation.other_user.profession}</p>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-white"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Mesajlar */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${message.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2 rounded-2xl ${
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

      {/* Mesaj yazma inputu */}
      <div className="border-t border-gray-200 bg-white p-4 flex-shrink-0">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 border border-gray-300 rounded-full px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={sending}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="bg-blue-600 text-white w-12 h-12 rounded-full hover:bg-blue-700 disabled:bg-gray-300 transition-colors flex items-center justify-center"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function ConnectionsManager({ 
  currentUserId,
  onClose,
  connections,
  connectionRequests,
  onAcceptConnectionRequest,
  onRejectConnectionRequest,
  onRemoveConnection,
  onSendConnectionRequest,
  onCancelConnectionRequest,
  blockedUserIds
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
  blockedUserIds?: string[]
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
    
    // First load sent requests if not already loaded
    if (sentRequests.length === 0) {
      await loadSentRequests()
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', currentUserId)
      .limit(20)

    if (!error && data) {
      // Bağlantısı olmayan, istek gönderilmemiş ve block edilmemiş kullanıcıları filtrele
      const connectedUserIds = connections.map(conn => 
        conn.sender_id === currentUserId ? conn.receiver_id : conn.sender_id
      )
      // Get all users we've sent requests to
      const sentRequestUserIds = sentRequests.map(req => req.receiver_id)
      // Get all users who sent us requests (these should also not appear in suggested)
      const receivedRequestUserIds = connectionRequests.map(req => req.sender_id)
      // Combine both
      const requestedUserIds = [...new Set([...sentRequestUserIds, ...receivedRequestUserIds])]
      
      // Get users who blocked me
      const { data: blockedByData } = await supabase
        .from('user_settings')
        .select('id')
        .contains('blocked_users', [currentUserId])
      const blockedByIds = (blockedByData || []).map(s => s.id)
      const allHiddenIds = [...new Set([...(blockedUserIds || []), ...blockedByIds])]
      
      const filtered = data.filter(profile => 
        !connectedUserIds.includes(profile.id) && 
        !requestedUserIds.includes(profile.id) &&
        !allHiddenIds.includes(profile.id)
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl w-full max-w-3xl sm:max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl">
        <div className="p-4 sm:p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">My Network</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
          {/* Search inside modal */}
          <div className="mt-3 sm:mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search connections, requests, suggested..."
                onChange={(e) => {
                  const q = e.target.value.toLowerCase()
                  // Simple client-side filter by dispatching a custom event; list sections will listen or we can just rely on built-in maps below
                  window.dispatchEvent(new CustomEvent('networkSearch', { detail: { query: q } }))
                }}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          <div className="flex mt-3 sm:mt-4 space-x-1">
            <button
              onClick={() => setActiveTab('connections')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium ${
                activeTab === 'connections'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Connections ({connections.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium ${
                activeTab === 'requests'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Requests ({connectionRequests.length + sentRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('suggested')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium ${
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

        <div className="overflow-y-auto max-h-[70vh] p-4 sm:p-6">
          {activeTab === 'connections' && (
            <div className="space-y-4">
              {connections.filter(connection => {
                const otherUser = connection.sender_id === currentUserId ? connection.receiver : connection.sender
                return otherUser && !blockedUserIds?.includes(otherUser.id)
              }).map(connection => {
                const otherUser = connection.sender_id === currentUserId ? connection.receiver : connection.sender
                return (
                  <div 
                    key={connection.id} 
                    className="flex items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => otherUser?.id && handleProfileClick(otherUser.id)}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <Avatar src={otherUser?.avatar_url} name={otherUser?.full_name} className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0" useInlineSize={false} />
                      <div className="flex-1">
                        <h3 className="font-medium sm:font-semibold text-gray-900 text-sm sm:text-base">{otherUser?.full_name}</h3>
                        <p className="text-xs sm:text-sm text-gray-600">{otherUser?.profession}</p>
                        <p className="text-[11px] sm:text-xs text-gray-500">{otherUser?.city}, {otherUser?.county}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        haptic.warning();
                        handleRemoveConnection(connection.id);
                      }}
                      className="px-2 sm:px-3 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      Remove
                    </button>
                  </div>
                )
              })}
              {connections.length === 0 && (
                <EmptyState
                  icon={<UserPlus className="w-16 h-16 text-gray-300" />}
                  title="Build your professional network"
                  description="Connect with therapists in your area and expand your circle"
                  actions={[
                    { label: 'Find Therapists', onClick: () => setActiveTab('suggested'), primary: true }
                  ]}
                />
              )}
            </div>
          )}

          {activeTab === 'requests' && requestSubTab === 'received' && (
            <div className="space-y-4">
              {connectionRequests.filter(request => {
                // Only show requests where we are the receiver (sender_id !== currentUserId)
                return request.sender_id !== currentUserId && 
                       request.receiver_id === currentUserId &&
                       request.sender && 
                       !blockedUserIds?.includes(request.sender.id)
              }).map(request => (
                <div 
                  key={request.id} 
                  className="flex items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => request.sender?.id && handleProfileClick(request.sender.id)}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <Avatar src={request.sender?.avatar_url} name={request.sender?.full_name} className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0" useInlineSize={false} />
                    <div className="flex-1">
                      <h3 className="font-medium sm:font-semibold text-gray-900 text-sm sm:text-base">{request.sender?.full_name}</h3>
                      <p className="text-xs sm:text-sm text-gray-600">{request.sender?.profession}</p>
                      <p className="text-[11px] sm:text-xs text-gray-500">{request.sender?.city}, {request.sender?.county}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleAcceptRequest(request.id)}
                      className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRejectRequest(request.id)}
                      className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
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
              {sentRequests.filter(request => {
                return request.receiver && !blockedUserIds?.includes(request.receiver.id)
              }).map(request => (
                <div 
                  key={request.id} 
                  className="flex items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => request.receiver?.id && handleProfileClick(request.receiver.id)}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <Avatar src={request.receiver?.avatar_url} name={request.receiver?.full_name} className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0" useInlineSize={false} />
                    <div className="flex-1">
                      <h3 className="font-medium sm:font-semibold text-gray-900 text-sm sm:text-base">{request.receiver?.full_name}</h3>
                      <p className="text-xs sm:text-sm text-gray-600">{request.receiver?.profession}</p>
                      <p className="text-[11px] sm:text-xs text-gray-500">{request.receiver?.city}, {request.receiver?.county}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCancelRequest(request.id)
                    }}
                    className="flex items-center justify-center w-8 h-8 text-red-600 hover:bg-red-50 rounded-lg border border-red-200"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
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
                <ConnectionListSkeleton />
              ) : (
                <>
                  {suggested.map(profile => (
                    <div 
                      key={profile.id} 
                      className="flex items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleProfileClick(profile.id)}
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <Avatar src={profile.avatar_url} name={profile.full_name} className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0" useInlineSize={false} />
                        <div className="flex-1">
                          <h3 className="font-medium sm:font-semibold text-gray-900 text-sm sm:text-base">{profile.full_name}</h3>
                          <p className="text-xs sm:text-sm text-gray-600">{profile.profession}</p>
                          <p className="text-[11px] sm:text-xs text-gray-500">{profile.city}, {profile.county}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSendRequest(profile.id)
                        }}
                        className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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

          // Avoid duplicating own messages (already optimistically added)
          if (newMsg.sender_id === currentUserId) {
            return;
          }
          
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
    
    try {
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
        console.error('Message send error:', error)
        
        // Hata durumunda temporary mesajı kaldır
        setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id))
        
        // Daha spesifik hata mesajları
        if (error.code === '23503') {
          alert('Failed to send message: Conversation or user not found')
        } else if (error.code === '42501') {
          alert('Failed to send message: Permission denied')
        } else if (error.code === '42703') {
          alert('Failed to send message: Database column error - please refresh the page')
        } else {
          alert('Failed to send message. Please try again.')
        }
      } else {
        // Başarılı durumda temporary mesajı gerçek mesajla değiştir
        setMessages(prev => prev.map(msg => 
          msg.id === tempMessage.id ? data : msg
        ))
        
        // Conversation'ın updated_at zamanını güncelle
        await supabase
          .from('conversations')
          .update({ 
            last_message_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', chatBox.conversation.id)
      }
    } catch (err: any) {
      console.error('Error sending message:', err)
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id))
      alert('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
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
          <Avatar src={chatBox.conversation.other_user?.avatar_url} name={chatBox.conversation.other_user?.full_name} className="w-8 h-8 flex-shrink-0" useInlineSize={false} />
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
  playNotificationSound,
  onOpenConnections
}: {
  currentUserId: string;
  onSelectConversation: (conversation: Conversation) => void;
  selectedConversationId?: string;
  onUnreadCountChange?: (count: number) => void;
  conversationMetadata: { [key: string]: ConversationMetadata };
  onUpdateMetadata: (conversationId: string, updates: Partial<ConversationMetadata>) => void;
  compact?: boolean;
  playNotificationSound?: () => void;
  onOpenConnections?: () => void;
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
      <div className="w-full h-full">
        <MessageSkeleton />
        <MessageSkeleton />
        <MessageSkeleton />
        <MessageSkeleton />
        <MessageSkeleton />
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
          <EmptyState
            icon={<MessageSquare className="w-16 h-16 text-gray-300" />}
            title="No messages yet"
            description="Start a conversation with your connections"
            actions={[
              { label: 'Send Message', onClick: () => onOpenConnections?.() || window.dispatchEvent(new CustomEvent('openConnections')), primary: true }
            ]}
          />
        ) : (
          visible.map((c) => {
            const m = conversationMetadata[c.id];
            const isSelected = selectedConversationId === c.id;
            
            // Only use swipe on mobile devices
            const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
            
            if (isMobile) {
              return (
                <SwipeableConversationItem
                  key={c.id}
                  conversation={c}
                  isSelected={isSelected}
                  isStarred={m?.isStarred || false}
                  isMuted={m?.isMuted || false}
                  isArchived={m?.isArchived || false}
                  formatTime={formatTime}
                  onClick={() => {
                    haptic.light();
                    onSelectConversation(c);
                  }}
                  onSwipeLeft={() => handleToggleArchive(c.id, { stopPropagation: () => {} } as any)}
                  onSwipeRight={() => {
                    if ((c.unread_count ?? 0) > 0) {
                      handleMarkAsUnread(c.id, { stopPropagation: () => {} } as any);
                    }
                  }}
                  onMarkAsUnread={() => handleMarkAsUnread(c.id, { stopPropagation: () => {} } as any)}
                  onToggleArchive={() => handleToggleArchive(c.id, { stopPropagation: () => {} } as any)}
                />
              );
            }
            
            // Desktop: keep existing non-swipeable version
            return (
              <div
                key={c.id}
                onClick={() => {
                  haptic.light();
                  onSelectConversation(c);
                }}
                className={`group relative flex items-center px-4 py-3 cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-blue-50 border-l-4 border-blue-600"
                    : "hover:bg-gray-50 border-l-4 border-transparent"
                }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <Avatar src={c.other_user?.avatar_url} name={c.other_user?.full_name} className="w-12 h-12 shadow-sm" useInlineSize={false} />
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
                      haptic.light();
                      setMenuOpenId(menuOpenId === c.id ? null : c.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-3 hover:bg-gray-100 rounded transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    <MoreHorizontal className="w-5 h-5 text-gray-500" />
                  </button>
                  {menuOpenId === c.id && (
                    <div className="absolute right-0 top-8 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                      <button
                        onClick={(e) => {
                          haptic.light();
                          handleMarkAsUnread(c.id, e);
                        }}
                        className="flex w-full items-center px-4 py-3 hover:bg-gray-50 text-sm text-gray-700 min-h-[44px]"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Mark as unread
                      </button>
                      <button
                        onClick={(e) => {
                          haptic.light();
                          handleToggleStar(c.id, e);
                        }}
                        className="flex w-full items-center px-4 py-3 hover:bg-gray-50 text-sm text-gray-700 min-h-[44px]"
                      >
                        <Star className={`${m?.isStarred ? 'text-yellow-500 fill-yellow-500' : ''} w-4 h-4 mr-2`} />
                        {m?.isStarred ? "Unstar" : "Star"}
                      </button>
                      <button
                        onClick={(e) => {
                          haptic.light();
                          handleToggleMute(c.id, e);
                        }}
                        className="flex w-full items-center px-4 py-3 hover:bg-gray-50 text-sm text-gray-700 min-h-[44px]"
                      >
                        {m?.isMuted ? (
                          <Volume2 className="w-4 h-4 mr-2" />
                        ) : (
                          <VolumeX className="w-4 h-4 mr-2" />
                        )}
                        {m?.isMuted ? "Unmute" : "Mute"}
                      </button>
                      <button
                        onClick={(e) => {
                          haptic.light();
                          handleToggleArchive(c.id, e);
                        }}
                        className="flex w-full items-center px-4 py-3 hover:bg-gray-50 text-sm text-gray-700 min-h-[44px]"
                      >
                        <Archive className="w-4 h-4 mr-2" />
                        {m?.isArchived ? "Unarchive" : "Archive"}
                      </button>
                      <button
                        className="flex w-full items-center px-4 py-3 hover:bg-gray-50 text-sm text-red-600 min-h-[44px]"
                        onClick={() => haptic.warning()}
                      >
                        <ShieldAlert className="w-4 h-4 mr-2" />
                        Report / Block
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          haptic.error();
                          supabase.from("conversations").delete().eq("id", c.id);
                          loadConversations();
                          setMenuOpenId(null);
                        }}
                        className="flex w-full items-center px-4 py-3 hover:bg-gray-50 text-sm text-red-600 border-t min-h-[44px]"
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
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = () => setIsFiltersExpanded(prev => !prev)
    window.addEventListener('toggleFiltersDrawer', handler as any)
    return () => window.removeEventListener('toggleFiltersDrawer', handler as any)
  }, [])

  const calculateExperience = (month?: string, year?: string) => {
    if (!year) return null
    const startDate = new Date(`${month || 'January'} 1, ${year}`)
    const now = new Date()
    const diffYears = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    return diffYears.toFixed(1)
  }

  const professions = ['Physiotherapist', 'Occupational Therapist', 'Speech & Language Therapist', 'Practitioner psychologist', 'Registered psychologist', 'Clinical psychologist', 'Forensic psychologist', 'Counselling psychologist', 'Health psychologist', 'Educational psychologist', 'Occupational psychologist', 'Sport and exercise psychologist', 'Dietitian/Dietician', 'Chiropodist', 'Podiatrist', 'Doctor', 'Nurse', 'Paramedic', 'Psychologist', 'Clinical scientist', 'Hearing aid dispenser', 'Orthoptist', 'Prosthetist', 'Orthotist', 'Radiographer', 'Diagnostic radiographer', 'Therapeutic radiographer', 'Speech and language/Speech therapist', 'Pharmacist', 'Social Worker', 'Care Assistant', 'Art Psychotherapist', 'Art therapist', 'Dramatherapist', 'Music therapist', 'Biomedical scientist', 'Operating Department Practitioner (ODP)', 'Midwife', 'Genetic Counsellor', 'Dental Hygienist', 'Dental Therapist', 'Orthodontic Therapist', 'Prosthetist', 'Orthotist', 'Clinical Physiologist', 'Audiologist'
    ]
  const languages = [
  'English','Turkish','Spanish','French','German','Italian','Portuguese','Arabic','Hindi','Urdu','Polish','Romanian',
  // Eklenen diller:
  'Afrikaans','Albanian','Amharic','Armenian','Azerbaijani','Basque','Belarusian','Bengali','Bosnian','Bulgarian','Burmese',
  'Catalan','Cebuano','Chichewa','Chinese (Simplified)','Chinese (Traditional)','Corsican','Croatian','Czech','Danish','Dutch',
  'Estonian','Filipino','Finnish','Galician','Georgian','Greek','Gujarati','Haitian Creole','Hausa','Hawaiian','Hebrew','Hungarian',
  'Icelandic','Indonesian','Irish','Japanese','Javanese','Kannada','Kazakh','Khmer','Kinyarwanda','Korean','Kurdish (Kurmanji)',
  'Kyrgyz','Lao','Latvian','Lithuanian','Luxembourgish','Macedonian','Malagasy','Malay','Malayalam','Maltese','Maori','Marathi',
  'Mongolian','Nepali','Norwegian','Odia','Pashto','Persian','Punjabi','Samogitian','Sinhala','Slovak','Slovenian','Somali','Swahili',
  'Sundanese','Tajik','Tamil','Telugu','Thai','Turkish','Turkmen','Ukrainian','Urdu','Uzbek','Vietnamese','Welsh','Xhosa','Yiddish','Zulu',
  // Ve yeni eklenen 110+ dil:
  'Abkhaz','Acehnese','Acholi','Afar','Alur','Avar','Awadhi','Aymara','Balinese','Baluchi','Bambara','Baoulé','Bashkir','Batak Karo',
  'Batak Simalungun','Batak Toba','Bemba','Betawi','Bikol','Breton','Buryat','Cantonese','Chamorro','Chechen','Chuvash','Crimean Tatar (Cyrillic)',
  'Crimean Tatar (Latin)','Dari','Dhivehi','Dinka','Dogri','Dombe','Dyula','Dzongkha','Ewe','Fijian','Fon','Friulian','Ga','Hakha Chin','Hiligaynon',
  'Hunsrik','Iban','Jamaican Patois','Jingpo','Konkani','Krio','Lingala','Luganda','Maithili','Meitei','Mizo','Minangkabau','Nuer','Occitan','Quechua',
  'Sanskrit','Tigrinya','Tsonga','Twi','Wolof','Yoruba'
];


  return (
    <div className="w-full md:w-80 bg-white shadow-sm border-r flex flex-col overflow-hidden">
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
            className="w-full pl-10 pr-28 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <button
            onClick={() => {
              try {
                const evt = new CustomEvent('toggleFiltersDrawer')
                window.dispatchEvent(evt)
              } catch {}
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur border border-gray-200 shadow-sm rounded-full px-3 py-1.5 flex items-center gap-2 text-gray-700 hover:bg-white"
            aria-label="Open Filters"
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm">Filters</span>
          </button>
        </div>
      </div>

      {/* Filters - Collapsible as drawer on mobile */}
      <div className="border-b md:border-0">
        <button
          onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <span className="font-medium text-gray-900 text-sm">Filters</span>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isFiltersExpanded ? 'rotate-180' : ''}`} />
        </button>

        {isFiltersExpanded && (
          <div className="fixed inset-0 z-50 md:static md:z-auto" ref={drawerRef}>
            <div className="absolute inset-0 bg-black/40 md:hidden" onClick={() => setIsFiltersExpanded(false)}></div>
            <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[85%] bg-white shadow-xl md:shadow-none md:relative md:w-auto px-4 pb-4 pt-16 md:pt-0 space-y-3 overflow-y-auto">
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
            {/* Results inside collapsible */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">Results ({therapists.length})</h3>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {therapists.map((therapist: Profile) => {
                  const experience = calculateExperience(therapist.experience_month, therapist.experience_year)
                  return (
                    <div
                      key={therapist.id}
                      onClick={() => onProfileClick(therapist.id)}
                      className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar src={therapist.avatar_url} name={therapist.full_name} className="w-10 h-10 flex-shrink-0" useInlineSize={false} />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-gray-900">{therapist.full_name}</h4>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <p className="text-xs text-blue-600 font-medium">{therapist.profession}</p>
                            {experience && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">{experience}</span>
                            )}
                          </div>
                          {therapist.city && (
                            <p className="text-xs text-gray-500 mt-1">📍 {therapist.city}, {therapist.county}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
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
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  
  const filteredTherapists = therapists.filter((therapist: Profile) => {
    const matchesSearch = therapist.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         therapist.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         therapist.county?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProfession = filters.professions.length === 0 || 
                            filters.professions.includes(therapist.profession);
    
    const matchesLanguages = filters.languages.length === 0 || 
      (filters.languageMode === 'OR' 
        ? filters.languages.some((lang: string) => therapist.languages?.includes(lang))
        : filters.languages.every((lang: string) => therapist.languages?.includes(lang)));
    
    return matchesSearch && matchesProfession && matchesLanguages;
  });

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">
          Results ({filteredTherapists.length})
        </h3>
      </div>

      <div className="space-y-2">
        {filteredTherapists.map((therapist: Profile) => {
          // Yeni calculateTotalExperience fonksiyonunu kullan
          const experience = calculateTotalExperience(therapist.work_experience || []);
          const isHovered = hoveredId === therapist.id;
          
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
                {therapist.avatar_url ? (
                  <img
                    src={therapist.avatar_url}
                    alt={therapist.full_name || 'Therapist'}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {therapist.full_name?.charAt(0) || 'T'}
                </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-gray-900">
                    {therapist.full_name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <p className="text-xs text-blue-600 font-medium">
                      {therapist.profession}
                    </p>
                    {experience !== '0' && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
                        {experience}
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
          );
        })}
      </div>
    </>
  );
}

function MapComponent({ therapists, geocodeLocation, onProfileClick }: any) {
  const [therapistsWithCoords, setTherapistsWithCoords] = useState<Profile[]>([]);

  useEffect(() => {
    async function addCoordinates() {
      const updated = [];
      for (const t of therapists) {
        if (t.lat && t.lng) {
          updated.push(t);
        } 
        else if (t.city && t.county) {
          const coords = await geocodeLocation(t.city, t.county);
          if (coords) {
            updated.push({ ...t, lat: coords[0], lng: coords[1] });
          }
        }
      }
      setTherapistsWithCoords(updated);
    }
    addCoordinates();
  }, [therapists]);

  return (
    <div className="h-full">
      <MapContainer center={[54.5, -2]} zoom={6} className="h-full w-full">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />
        {therapistsWithCoords.map(t => {
          // Yeni calculateTotalExperience fonksiyonunu kullan
          const experience = calculateTotalExperience(t.work_experience || []);
          
          return t.lat && t.lng && (
            <Marker key={t.id} position={[t.lat, t.lng]}>
              <Popup>
                <div className="p-2 min-w-[220px]">
                  <h3 className="font-semibold text-lg text-gray-900">{t.full_name}</h3>
                  <div className="flex items-center gap-2 mt-1 mb-2">
                    <p className="text-blue-600 font-medium text-sm">{t.profession}</p>
                    {experience !== '0' && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                        {experience}
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
                    className="flex items-center justify-center w-full mt-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    title="View Full Profile"
                  >
                    <User className="w-4 h-4" />
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

function ProfileDetailPage({ 
  profileId, 
  onClose, 
  currentUserId,
  onStartConversation,
  connections,
  connectionRequests,
  onSendConnectionRequest,
  onRemoveConnection,
  updateProfileInState,
  onBlockUser,
  allHiddenUserIds = []
}: { 
  profileId: string
  onClose: () => void
  currentUserId?: string
  onStartConversation: (conversation: Conversation) => void
  connections: Connection[]
  connectionRequests: Connection[]
  onSendConnectionRequest: (receiverId: string) => Promise<void>
  onAcceptConnectionRequest?: (connectionId: string) => Promise<void>
  onRejectConnectionRequest?: (connectionId: string) => Promise<void>
  onRemoveConnection: (connectionId: string) => Promise<void>
  updateProfileInState?: (updatedProfile: Profile) => void
  onBlockUser?: (userId: string) => Promise<void>
  allHiddenUserIds?: string[]
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
    availability: {} as any,
    profession: '',
    city: '',
    county: '',
    regulatorNumber: ''
  })
  const [professionInput, setProfessionInput] = useState('')
  const [filteredProfessions, setFilteredProfessions] = useState<string[]>([])
  const [showProfessionDropdown, setShowProfessionDropdown] = useState(false)
  const [allAvailableProfessions, setAllAvailableProfessions] = useState<string[]>([])
  const [expandedItems, setExpandedItems] = useState<{[key: number]: boolean}>({});
  const [connectionStatus, setConnectionStatus] = useState<'not_connected' | 'pending' | 'accepted' | 'rejected'>('not_connected')
  const [showConnectionOptions, setShowConnectionOptions] = useState(false)
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  useEffect(() => {
    // Check if this profile is blocked
    if (allHiddenUserIds.includes(profileId)) {
      // Redirect or show message
      onClose()
      const errorEvent = new CustomEvent('showToast', {
        detail: { message: 'This profile is not available', type: 'error' }
      })
      window.dispatchEvent(errorEvent)
      return
    }
    loadProfile()
    loadAllProfessions()
  }, [profileId, allHiddenUserIds])

  // Connection durumunu kontrol et
  useEffect(() => {
    if (currentUserId && profile) {
      checkConnectionStatus()
    }
  }, [currentUserId, profile, connections, connectionRequests])

  const loadAllProfessions = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('profession')
        .not('profession', 'is', null)

      if (!error && data) {
        const usedProfessions = [...new Set(data.map(p => p.profession).filter(p => p && p.trim()))] as string[]
        const combinedProfessions = [...new Set([...PROFESSION_OPTIONS, ...usedProfessions])]
        combinedProfessions.sort()
        
        setAllAvailableProfessions(combinedProfessions)
      } else {
        setAllAvailableProfessions([...PROFESSION_OPTIONS])
      }
    } catch (err) {
      console.error('Error loading professions:', err)
      setAllAvailableProfessions([...PROFESSION_OPTIONS])
    }
  }

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
        availability: data.availability || {},
        profession: data.profession || '',
        city: data.city || '',
        county: data.county || '',
        regulatorNumber: data.regulator_number || ''
      })
      setProfessionInput(data.profession || '')
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
    if (section === 'basic') {
      setProfessionInput(formData.profession)
    }
  }

  const cancelEditing = () => {
    setEditingSection(null)
    setFormData(tempFormData)
    setProfessionInput(tempFormData.profession)
    setShowProfessionDropdown(false)
    setHighlightedIndex(-1)
  }

  const handleProfessionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showProfessionDropdown || filteredProfessions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredProfessions.length - 1 ? prev + 1 : 0
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredProfessions.length - 1
        );
        break;
      
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredProfessions.length) {
          selectProfession(filteredProfessions[highlightedIndex]);
        }
        break;
      
      case 'Escape':
        e.preventDefault();
        setShowProfessionDropdown(false);
        setHighlightedIndex(-1);
        break;
      
      default:
        break;
    }
  };

  const handleProfessionInputChange = (value: string) => {
    setProfessionInput(value)
    setFormData({ ...formData, profession: value })
    setHighlightedIndex(-1);
    
    if (value.trim()) {
      const filtered = allAvailableProfessions.filter(prof => 
        prof.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredProfessions(filtered)
      setShowProfessionDropdown(true)
    } else {
      setFilteredProfessions([])
      setShowProfessionDropdown(false)
    }
  }

  const selectProfession = (profession: string) => {
    setProfessionInput(profession)
    setFormData({ ...formData, profession })
    setShowProfessionDropdown(false)
    setHighlightedIndex(-1)
  }

  const saveSection = async (section: string) => {
    setLoading(true)
    try {
      const updateData: any = {}
      
      if (section === 'basic') {
        const professionToSave = professionInput.trim()
        
        updateData.profession = professionToSave
        updateData.city = formData.city
        updateData.county = formData.county
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
        updateData.regulator_number = formData.regulatorNumber
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
      
      // Güncellenmiş profili al
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single()
      
      if (updatedProfile) {
        // Tüm bileşenleri yeni profil verisi ile güncelle
        if (updateProfileInState) {
          updateProfileInState(updatedProfile)
        } else {
          // Fallback: window üzerinden çağır
          const globalWindow = window as any
          if (globalWindow.updateProfileInState) {
            globalWindow.updateProfileInState(updatedProfile)
          }
        }
        
        // Local profile state'ini güncelle
        setProfile(updatedProfile)
        
        // Form data'yı güncelle
        setFormData({
          aboutMe: updatedProfile.about_me || '',
          qualifications: updatedProfile.qualifications || [],
          workExperience: updatedProfile.work_experience || [],
          contactEmail: updatedProfile.contact_email || '',
          phone: updatedProfile.phone || '',
          website: updatedProfile.website || '',
          specialties: updatedProfile.specialties || [],
          languages: updatedProfile.languages || [],
          availability: updatedProfile.availability || {},
          profession: updatedProfile.profession || '',
          city: updatedProfile.city || '',
          county: updatedProfile.county || '',
          regulatorNumber: updatedProfile.regulator_number || ''
        })
        
        setProfessionInput(updatedProfile.profession || '')
      }
      
      setEditingSection(null)
      setShowProfessionDropdown(false)
      setHighlightedIndex(-1)
      
      // Meslekler listesini yeniden yükle
      if (section === 'basic') {
        await loadAllProfessions()
      }
      
    } catch (err: any) {
      console.error('Update error:', err)
      alert(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
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
            onClick={() => startEditing('basic')}
            className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full hover:bg-blue-700 font-medium transition-colors"
            title="Edit Profile"
          >
            <Edit2 className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('openCVMaker'))}
            className="flex items-center justify-center w-10 h-10 bg-purple-600 text-white rounded-full hover:bg-purple-700 font-medium transition-colors"
            title="Generate CV"
          >
            <Briefcase className="w-5 h-5" />
          </button>
        </div>
      )
    }

    return (
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleMessage}
          className="flex items-center justify-center w-10 h-10 bg-green-600 text-white rounded-full hover:bg-green-700 font-medium transition-colors"
          title="Message"
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        {connectionStatus === 'not_connected' && (
          <button
            onClick={handleConnect}
            className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full hover:bg-blue-700 font-medium transition-colors"
            title="Connect"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        )}

        {connectionStatus === 'pending' && (
          <button
            disabled
            className="flex items-center justify-center w-10 h-10 bg-gray-400 text-white rounded-full font-medium cursor-not-allowed"
            title="Pending"
          >
            <Clock className="w-5 h-5" />
          </button>
        )}

        {connectionStatus === 'accepted' && connectionId && (
          <div className="relative">
            <button
              onClick={() => setShowConnectionOptions(!showConnectionOptions)}
              className="flex items-center justify-center w-10 h-10 bg-green-600 text-white rounded-full hover:bg-green-700 font-medium transition-colors"
              title="Connected"
            >
              <UserCheck className="w-5 h-5" />
            </button>
            
            {showConnectionOptions && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <button
                  onClick={() => {
                    onRemoveConnection(connectionId)
                    setConnectionStatus('not_connected')
                    setShowConnectionOptions(false)
                  }}
                  className="flex items-center justify-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-50 rounded-lg"
                  title="Remove Connection"
                >
                  <UserX className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {onBlockUser && (
          <button
            onClick={async () => {
              if (window.confirm(`Are you sure you want to block ${profile.full_name || 'this user'}? You won't be able to see their posts or messages.`)) {
                await onBlockUser(profile.id)
                onClose()
              }
            }}
            className="flex items-center justify-center w-10 h-10 bg-red-600 text-white rounded-full hover:bg-red-700 font-medium transition-colors"
            title="Block User"
          >
            <UserX className="w-5 h-5" />
          </button>
        )}

        {profile.contact_email && (
          <a 
            href={`mailto:${profile.contact_email}?subject=Contact from UK Therapist Network&body=Hello ${profile.full_name}, I found your profile on UK Therapist Network and would like to get in touch.`}
            className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-full hover:bg-gray-50 font-medium transition-colors"
            title="Email"
          >
            <Mail className="w-5 h-5" />
          </a>
        )}
        
        {profile.phone && (
          <a 
            href={`tel:${profile.phone}`}
            className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-full hover:bg-gray-50 font-medium transition-colors"
            title="Call"
          >
            <Phone className="w-5 h-5" />
          </a>
        )}
      </div>
    )
  }

  const isOwnProfile = currentUserId === profileId

  if (loading) {
    return <ProfilePageSkeleton />
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

  const totalExperience = calculateTotalExperience(profile?.work_experience || [])

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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Profile Header Card - TEK BİR KEZ RENDER EDİLİYOR */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            <div className="relative flex-shrink-0">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile?.full_name || 'Profile photo'}
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-blue-600 rounded-full flex items-center justify-center text-white text-4xl sm:text-5xl font-bold">
              {profile?.full_name?.charAt(0) || 'T'}
                </div>
              )}
              {isOwnProfile && editingSection === 'basic' && (
                <div className="mt-2 flex items-center gap-2">
                  <label className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 cursor-pointer">
                    Change photo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        // Validate
                        if (!file.type.startsWith('image/')) { alert('Please select an image file'); return }
                        if (file.size > 5 * 1024 * 1024) { alert('Image size must be less than 5MB'); return }
                        try {
                          const { data: { user } } = await supabase.auth.getUser()
                          if (!user) { alert('Not signed in'); return }
                          const fileExt = file.name.split('.').pop()
                          const fileName = `${user.id}-${Date.now()}.${fileExt}`
                          const filePath = fileName
                          const { error: uploadError } = await supabase.storage
                            .from('avatars')
                            .upload(filePath, file, { cacheControl: '3600', upsert: true })
                          if (uploadError) { alert('Error uploading image: ' + uploadError.message); return }
                          const { data: { publicUrl } } = supabase.storage
                            .from('avatars')
                            .getPublicUrl(filePath)
                          const { error: updateError } = await supabase
                            .from('profiles')
                            .update({ avatar_url: publicUrl })
                            .eq('id', profileId)
                          if (updateError) { alert('Error updating profile: ' + updateError.message); return }
                          // Update local and parent state
                          const updated = { ...profile, avatar_url: publicUrl } as any
                          setProfile(updated)
                          if (updateProfileInState) updateProfileInState(updated as any)
                          const successEvent = new CustomEvent('showToast', { detail: { message: 'Profile picture updated successfully!', type: 'success' } })
                          window.dispatchEvent(successEvent)
                        } catch (err: any) {
                          console.error('Error uploading avatar from detail:', err)
                          alert('Error uploading image. Please try again.')
                        }
                      }}
                    />
                  </label>
                  {profile?.avatar_url && (
                    <button
                      type="button"
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                      onClick={async () => {
                        try {
                          const { error } = await supabase
                            .from('profiles')
                            .update({ avatar_url: null })
                            .eq('id', profileId)
                          if (error) { alert('Error removing profile picture. Please try again.'); return }
                          const updated = { ...profile, avatar_url: null } as any
                          setProfile(updated)
                          if (updateProfileInState) updateProfileInState(updated as any)
                          const successEvent = new CustomEvent('showToast', { detail: { message: 'Profile picture removed successfully!', type: 'success' } })
                          window.dispatchEvent(successEvent)
                        } catch (err) {
                          console.error('Error removing avatar from detail:', err)
                          alert('Error removing profile picture. Please try again.')
                        }
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex-1">
              {editingSection === 'basic' && isOwnProfile ? (
                <div className="space-y-4 mb-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveSection('basic')}
                      disabled={loading}
                      className="flex items-center justify-center w-10 h-10 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300"
                      title="Save Changes"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="flex items-center justify-center w-10 h-10 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      title="Cancel"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Profession</label>
                    <input
                      type="text"
                      placeholder="Type to search or add new profession..."
                      value={professionInput}
                      onChange={(e) => handleProfessionInputChange(e.target.value)}
                      onKeyDown={handleProfessionKeyDown}
                      onFocus={() => {
                        if (professionInput.trim()) {
                          const filtered = allAvailableProfessions.filter(prof => 
                            prof.toLowerCase().includes(professionInput.toLowerCase())
                          )
                          setFilteredProfessions(filtered)
                          setShowProfessionDropdown(true)
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setShowProfessionDropdown(false)
                          setHighlightedIndex(-1)
                        }, 200)
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {showProfessionDropdown && filteredProfessions.length > 0 && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredProfessions.map((prof, index) => (
                          <button
                            key={prof}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              selectProfession(prof)
                            }}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            className={`w-full text-left px-4 py-2 text-sm ${
                              index === highlightedIndex 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'text-gray-700 hover:bg-blue-50'
                            }`}
                          >
                            {prof}
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {allAvailableProfessions.some(p => p.toLowerCase() === professionInput.toLowerCase()) 
                        ? 'Select from suggestions or keep typing. Use ↑↓ arrows to navigate, Enter to select, Esc to close' 
                        : professionInput.trim() 
                          ? 'New profession will be saved. Use ↑↓ arrows to navigate, Enter to select, Esc to close' 
                          : 'Start typing to see suggestions'}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{profile?.full_name}</h1>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
                    <p className="text-lg sm:text-xl text-blue-600 font-medium">{profile?.profession}</p>
                    {totalExperience !== '0' && (
                      <span className="bg-green-100 text-green-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold">
                        {totalExperience} total experience
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-gray-600 mb-4">
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
                </>
              )}
              
              {/* Contact Buttons */}
              {editingSection !== 'basic' && renderContactButtons()}
            </div>
          </div>
        </div>

        {/* Main Content Grid - TEK BİR KEZ RENDER EDİLİYOR */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column - Main Info */}
          <div className="md:col-span-2 space-y-4 sm:space-y-6">
            {/* About Me */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 relative group">
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 relative group">
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
                            type="date"
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
                              type="date"
                              className={`flex-1 px-3 py-2 border border-gray-300 rounded-lg ${isCurrentJob ? 'bg-gray-100' : ''}`}
                              value={isCurrentJob ? "" : (exp.end_date || '')}
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
                    const startDate = exp.start_date ? new Date(exp.start_date) : null
                    const endDate = isCurrentJob ? new Date() : (exp.end_date ? new Date(exp.end_date) : null)
                    
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
                  <input 
                    type="text"
                    placeholder="Registration Number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={formData.regulatorNumber}
                    onChange={(e) => setFormData({ ...formData, regulatorNumber: e.target.value })}
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

function CommunityComponent({ 
  onOpenConnections,
  allHiddenUserIds = []
}: { 
  onOpenConnections?: () => void
  allHiddenUserIds?: string[]
}) {
  const postRefs = useRef<{ [postId: string]: HTMLDivElement | null }>({});
  const toast = useToast();
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [userPostReactions, setUserPostReactions] = useState<Record<string, 'like' | 'dislike' | string | null>>({});
  const [currentVisibleExpandedPost, setCurrentVisibleExpandedPost] = useState<string | null>(null);
  const [stickyButtonStyle, setStickyButtonStyle] = useState<{ left: string; width: string }>({ left: '0px', width: '0px' });
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [showNewPostModal, setShowNewPostModal] = useState(false)
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    metadata: {
      professions: [] as string[],
      clinical_areas: [] as string[],
      content_type: '',
      tags: [] as string[],
      audience_level: '',
      related_conditions: [] as string[],
      language: 'English',
      attachments: [] as string[],
      co_authors: [] as string[],
      is_public: true,
      visibility: 'public' as 'public' | 'connections' | 'only_me'
    } as PostMetadata
  })
  const [selectedUserProfile, setSelectedUserProfile] = useState<Profile | null>(null)
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null)
  const [loading, setLoading] = useState(false)
  const [showVisibilityDropdown, setShowVisibilityDropdown] = useState(false)
  const [commentLikes, setCommentLikes] = useState<Record<string, number>>({});
  const [commentFavorites, setCommentFavorites] = useState<Record<string, boolean>>({});
  const [userReactions, setUserReactions] = useState<Record<string, 'like' | 'favorite' | null>>({});
  const [activeCommentMenu, setActiveCommentMenu] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState<string>('');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [comments, setComments] = useState<{ [postId: string]: Comment[] }>({})
  const [newComments, setNewComments] = useState<{ [postId: string]: string }>({})
  const [replyingTo, setReplyingTo] = useState<{ [commentId: string]: boolean }>({});
  const [replyContents, setReplyContents] = useState<{ [commentId: string]: string }>({})
  const [postSettings, setPostSettings] = useState<{ [postId: string]: { comments_disabled: boolean; muted: boolean } }>({})
  const [followingPosts, setFollowingPosts] = useState<string[]>([])
  const [repostedPosts, setRepostedPosts] = useState<string[]>([])
  const [repostCounts, setRepostCounts] = useState<Record<string, number>>({})
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [activeMenuPost, setActiveMenuPost] = useState<string | null>(null);
  const [quotePostData, setQuotePostData] = useState<CommunityPost | null>(null);
  const menuRefs = useRef<{ [postId: string]: HTMLDivElement | null }>({});
  const [feedFilters, setFeedFilters] = useState<FeedFilters>({
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
  const [showFilters, setShowFilters] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [attachmentInput, setAttachmentInput] = useState('')
  const [coAuthorInput, setCoAuthorInput] = useState('')
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({})
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({})
  const [activeFeedTab, setActiveFeedTab] = useState<'all' | 'saved'>('all')
  const [bookmarkedPosts, setBookmarkedPosts] = useState<string[]>([])
  const [showCompletenessChecklist, setShowCompletenessChecklist] = useState(false)
  
  // Pagination states
  const POSTS_PER_PAGE = 10
  const [postsPage, setPostsPage] = useState(0)
  const [hasMorePosts, setHasMorePosts] = useState(true)
  const [loadingMorePosts, setLoadingMorePosts] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const [showBackToTop, setShowBackToTop] = useState(false)

  // Pull-to-refresh
  const { isPulling, pullDistance, isRefreshing, containerRef } = usePullToRefresh({
    onRefresh: async () => {
      haptic.light();
      await loadPosts(0, true);
      toast.success('Feed refreshed');
    },
    enabled: true
  });

  
  const [postLikes, setPostLikes] = useState<Record<string, number>>({})
  const [postReactions, setPostReactions] = useState<Record<string, { emoji: string; count: number }[]>>({})
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null)
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const [editForm, setEditForm] = useState<{
    id: string;
    title: string;
    content: string;
    metadata: PostMetadata;
  }>({
    id: '',
    title: '',
    content: '',
    metadata: {
      professions: [],
      clinical_areas: [],
      content_type: '',
      tags: [],
      audience_level: '',
      related_conditions: [],
      language: 'English',
      attachments: [],
      co_authors: [],
      is_public: true,
      visibility: 'public' as 'public' | 'connections' | 'only_me'
    }
  })
  const session = useSession()
  const user = session?.user
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [connections, setConnections] = useState<any[]>([])
  const [suggestedConnections, setSuggestedConnections] = useState<Profile[]>([])
  const [connectingIds, setConnectingIds] = useState<Record<string, boolean>>({})
  const [networkStats, setNetworkStats] = useState<{ totalMembers: number; activeToday: number; postsThisWeek: number }>({ totalMembers: 0, activeToday: 0, postsThisWeek: 0 })


  useEffect(() => {
    const observers: { [key: string]: IntersectionObserver } = {};

    posts.forEach(post => {
      if (expandedPosts[post.id]) {
        const el = postRefs.current[post.id];
        if (el) {
          const observer = new IntersectionObserver(
            (entries) => {
              if (entries[0].isIntersecting) {
                setCurrentVisibleExpandedPost(post.id);
              } else if (currentVisibleExpandedPost === post.id) {
                setCurrentVisibleExpandedPost(null);
              }
            },
            { threshold: 0.1 }
          );
          observer.observe(el);
          observers[post.id] = observer;
        }
      }
    });

    return () => {
      Object.values(observers).forEach(obs => obs.disconnect());
    };
  }, [posts, expandedPosts, currentVisibleExpandedPost]);

  useEffect(() => {
    const updateButtonPosition = () => {
      if (currentVisibleExpandedPost) {
        const el = postRefs.current[currentVisibleExpandedPost];
        if (el) {
          const rect = el.getBoundingClientRect();
          setStickyButtonStyle({
            left: `${rect.left}px`,
            width: `${rect.width}px`
          });
        }
      }
    };

    window.addEventListener('scroll', updateButtonPosition);
    window.addEventListener('resize', updateButtonPosition);
    updateButtonPosition();

    return () => {
      window.removeEventListener('scroll', updateButtonPosition);
      window.removeEventListener('resize', updateButtonPosition);
    };
  }, [currentVisibleExpandedPost]);

  // Load user profile
  useEffect(() => {
    if (user?.id) {
      loadUserProfile()
      loadConnections()
      loadSuggestedConnections()
      loadNetworkStats()
    }
  }, [user?.id])

  // Load bookmarks (after user is available)
  useEffect(() => {
    async function loadBookmarks() {
      try {
        const { data } = await supabase
          .from('post_bookmarks')
          .select('post_id')
          .eq('user_id', user?.id || '')
        if (data) setBookmarkedPosts(data.map((d: any) => d.post_id))
        else setBookmarkedPosts([])
      } catch (e) {
        console.error('Error loading bookmarks:', e)
      }
    }
    if (user?.id) loadBookmarks(); else setBookmarkedPosts([])
  }, [user?.id])

  // Listen for notification events to open posts
  useEffect(() => {
    const handleOpenPostFromNotification = async (event: CustomEvent) => {
      const { postId, commentId, scrollToReaction } = event.detail
      
      if (!postId) return

      // Find post in current posts
      let targetPost = posts.find(p => p.id === postId)
      
      // If not found, load it
      if (!targetPost) {
        const { data } = await supabase
          .from('posts')
          .select(`
            *,
            user:profiles(*)
          `)
          .eq('id', postId)
          .single()
        
        if (data) {
          targetPost = data
          setPosts(prev => [...prev, data])
        }
      }

      if (targetPost) {
        // Open post modal
        setSelectedPost(targetPost)
        
        // Load comments if needed
        if (!comments[postId]) {
          await loadComments(postId)
        }
        
        // If commentId exists, expand all comments to find nested replies
        if (commentId) {
          // Expand all comments to ensure nested replies are visible
          setExpandedComments(prev => ({ ...prev, [postId]: true }))
          
          // Recursively expand replies to find the target comment
          const expandToComment = (commentList: Comment[], targetId: string): boolean => {
            for (const comment of commentList) {
              if (comment.id === targetId) {
                return true
              }
              if (comment.replies && comment.replies.length > 0) {
                if (expandToComment(comment.replies, targetId)) {
                  setExpandedReplies(prev => ({ ...prev, [comment.id]: true }))
                  return true
                }
              }
            }
            return false
          }
          
          // Wait for comments to load and expand
          setTimeout(() => {
            const postComments = comments[postId] || []
            expandToComment(postComments, commentId)
          }, 100)
        }
        
        // Scroll to reaction or comment after a longer delay to ensure everything is rendered
        setTimeout(() => {
          // Get the modal container for scrolling
          const modalContainer = document.querySelector('.modal-scroll-container') || 
                                 document.querySelector('[data-post-id="' + postId + '"]')?.closest('.overflow-y-auto') ||
                                 document.querySelector('.max-h-\\[90vh\\]')
          
          if (scrollToReaction) {
            // Scroll to reactions section
            const reactionsElement = document.querySelector(`[data-post-id="${postId}"] .reactions-section`)
            if (reactionsElement) {
              reactionsElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          }
          
          if (commentId) {
            // Scroll to specific comment - try multiple times as comments may load async
            const scrollToComment = (attempts = 0) => {
              const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`)
              if (commentElement) {
                // Scroll within modal container if available
                if (modalContainer) {
                  const containerRect = modalContainer.getBoundingClientRect()
                  const elementRect = commentElement.getBoundingClientRect()
                  const scrollTop = modalContainer.scrollTop + elementRect.top - containerRect.top - (containerRect.height / 2) + (elementRect.height / 2)
                  modalContainer.scrollTo({ top: scrollTop, behavior: 'smooth' })
                } else {
                  commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
                
                // Highlight comment briefly
                commentElement.classList.add('bg-yellow-100', 'transition-colors', 'duration-300')
                setTimeout(() => {
                  commentElement.classList.remove('bg-yellow-100')
                }, 2000)
              } else if (attempts < 10) {
                // Retry if element not found yet
                setTimeout(() => scrollToComment(attempts + 1), 200)
              }
            }
            scrollToComment()
          }
        }, 500) // Increased delay for comments to fully load and render
      }
    }

    const handler = (event: Event) => {
      const customEvent = event as CustomEvent
      handleOpenPostFromNotification(customEvent)
    }
    
    window.addEventListener('openPostFromNotification', handler)
    
    return () => {
      window.removeEventListener('openPostFromNotification', handler)
    }
  }, [posts, comments, expandedComments, expandedReplies])

  const handleRepost = async (postId: string) => {
    if (!user) {
      toast.info('Please sign in to repost')
      return
    }

    try {
      const post = posts.find(p => p.id === postId)
      if (!post) return

      // Check if already reposted
      const { data: existingRepost } = await supabase
        .from('posts')
        .select('id')
        .eq('user_id', user.id)
        .eq('post_metadata->>reposted_post_id', postId)
        .maybeSingle()

      const isReposted = !!existingRepost

      if (isReposted) {
        // Remove repost
        const { error } = await supabase
          .from('posts')
          .delete()
          .eq('id', existingRepost.id)

        if (error) throw error

        setRepostedPosts(prev => prev.filter(id => id !== postId))
        setRepostCounts(prev => ({
          ...prev,
          [postId]: Math.max(0, (prev[postId] || 0) - 1)
        }))
        toast.success('Repost removed')
        await loadPosts(0, true)
      } else {
        // Create repost
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (!currentUser) return

        const { error } = await supabase
          .from('posts')
          .insert({
            user_id: currentUser.id,
            title: post.title ? `Repost: ${post.title}` : 'Repost',
            content: post.content,
            post_metadata: {
              ...post.post_metadata,
              reposted_post_id: postId,
              is_repost: true
            }
          })

        if (error) throw error

        setRepostedPosts(prev => [...prev, postId])
        setRepostCounts(prev => ({
          ...prev,
          [postId]: (prev[postId] || 0) + 1
        }))
        toast.success('Post reposted')
        await loadPosts(0, true)
      }
    } catch (err) {
      console.error('Error reposting:', err)
      toast.error('Failed to repost')
    }
  }

  const handleQuote = (post: CommunityPost) => {
    if (!user) {
      toast.info('Please sign in to quote')
      return
    }

    setQuotePostData(post)
    setNewPost(prev => ({
      title: '',
      content: '',
      metadata: {
        ...prev.metadata,
        quoted_post_id: post.id
      } as PostMetadata
    }))
    setShowNewPostModal(true)
  }

  const handleBookmarkPost = async (postId: string) => {
    if (!user?.id) { 
      toast.info('Please sign in to save posts');
      return;
    }
    
    // Optimistic update
    const isBookmarked = bookmarkedPosts.includes(postId);
    setBookmarkedPosts(prev => isBookmarked ? prev.filter(id => id !== postId) : [...prev, postId]);
    
    try {
      if (isBookmarked) {
        await supabase.from('post_bookmarks').delete().eq('post_id', postId).eq('user_id', user.id);
        haptic.success();
        toast.success('Post removed from saved');
      } else {
        await supabase.from('post_bookmarks').insert({ post_id: postId, user_id: user.id });
        haptic.success();
        toast.success('Post saved');
      }
    } catch (error) {
      // Revert optimistic update on error
      setBookmarkedPosts(prev => isBookmarked ? [...prev, postId] : prev.filter(id => id !== postId));
      haptic.error();
      toast.error('Failed to save post');
    }
  }

  const loadUserProfile = async () => {
    if (!user?.id) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (data) setUserProfile(data)
  }

  const loadConnections = async () => {
    if (!user?.id) return
    const { data } = await supabase
      .from('connections')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq('status', 'accepted')
    setConnections(data || [])
  }

  const loadSuggestedConnections = async () => {
    if (!user?.id) return
    try {
      // 1) Fetch a pool of candidate profiles (exclude current user)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)
        .limit(50)

      const candidates: Profile[] = profiles || []

      // 2) Build current user's accepted connection set
      const currentConnectionIds = new Set(
        (connections || [])
          .filter((c: any) => c.status === 'accepted')
          .map((c: any) => (c.sender_id === user.id ? c.receiver_id : c.sender_id))
      )

      // 3) Filter out already-connected candidates and blocked users (both directions)
      // Get users I blocked
      const { data: settings } = await supabase
        .from('user_settings')
        .select('blocked_users')
        .eq('id', user.id)
        .single()
      const userBlockedIds = settings?.blocked_users || []
      
      // Get users who blocked me (users whose blocked_users array contains my ID)
      const { data: blockedByData } = await supabase
        .from('user_settings')
        .select('id')
        .contains('blocked_users', [user.id])
      const blockedByIds = (blockedByData || []).map(s => s.id)
      
      // Combine both: users I blocked + users who blocked me
      const allHiddenIds = [...new Set([...userBlockedIds, ...blockedByIds])]
      
      const pool = candidates.filter(c => 
        !currentConnectionIds.has(c.id) && 
        !allHiddenIds.includes(c.id)
      )
      if (pool.length === 0) {
        setSuggestedConnections([])
        return
      }

      // 4) Fetch accepted connections for these candidates (both directions)
      const candidateIds = pool.map(c => c.id)
      const { data: connsSender } = await supabase
        .from('connections')
        .select('sender_id,receiver_id,status')
        .in('sender_id', candidateIds)
        .eq('status', 'accepted')
      const { data: connsReceiver } = await supabase
        .from('connections')
        .select('sender_id,receiver_id,status')
        .in('receiver_id', candidateIds)
        .eq('status', 'accepted')

      const allCandConns = [...(connsSender || []), ...(connsReceiver || [])]
      const candConnMap = new Map<string, Set<string>>()
      allCandConns.forEach((row: any) => {
        const a = row.sender_id
        const b = row.receiver_id
        if (!candConnMap.has(a)) candConnMap.set(a, new Set<string>())
        if (!candConnMap.has(b)) candConnMap.set(b, new Set<string>())
        candConnMap.get(a)!.add(b)
        candConnMap.get(b)!.add(a)
      })

      // 5) Scoring helpers using available fields
      const getGeoScore = (cand: any) => {
        // Same city: 1, same county/region: 0.5, else 0
        const cityMatch = userProfile?.city && cand.city && cand.city === userProfile.city
        if (cityMatch) return 1
        const regionMatch = userProfile?.county && cand.county && cand.county === userProfile.county
        return regionMatch ? 0.5 : 0
      }

      const getProfileScore = (cand: any) => {
        // Same profession -> 1 else 0 (extend with interests when available)
        return userProfile?.profession && cand.profession && cand.profession === userProfile.profession ? 1 : 0
      }

      const scored = pool.map(cand => {
        // Common connections score
        const candSet = candConnMap.get(cand.id) || new Set<string>()
        let common = 0
        candSet.forEach(id => { if (currentConnectionIds.has(id)) common += 1 })
        const scoreCommon = common / Math.max(currentConnectionIds.size, 1)

        const scoreGroup = 0 // groups/schools/jobs not modeled yet in this app
        const scoreGeo = getGeoScore(cand)
        const scoreProfile = getProfileScore(cand)
        const scoreActivity = 0 // recentInteractions not modeled yet

        const totalScore = 0.4 * scoreCommon + 0.2 * scoreGroup + 0.1 * scoreGeo + 0.1 * scoreProfile + 0.2 * scoreActivity
        return { cand, totalScore }
      })

      // 6) Sort and pick top N
      scored.sort((a, b) => b.totalScore - a.totalScore)
      const top = scored.slice(0, 10).map(s => s.cand)
      setSuggestedConnections(top)
    } catch (e) {
      console.error('loadSuggestedConnections error:', e)
      // Graceful fallback
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)
      .limit(5)
    setSuggestedConnections(data || [])
    }
  }

  const loadNetworkStats = async () => {
    try {
      // Total members
      const { count: profilesCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      // Posts this week
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const { count: postsWeekCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString())

      // Active today (proxy: posts in last 24h)
      const dayAgo = new Date()
      dayAgo.setDate(dayAgo.getDate() - 1)
      const { count: postsDayCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', dayAgo.toISOString())

      setNetworkStats({
        totalMembers: profilesCount || 0,
        activeToday: postsDayCount || 0,
        postsThisWeek: postsWeekCount || 0
      })
    } catch (e) {
      console.error('Failed to load network stats', e)
    }
  }

  const handleSuggestedConnect = async (receiverId: string) => {
    if (!user?.id) {
      alert('Please sign in to connect')
      return
    }
    try {
      setConnectingIds(prev => ({ ...prev, [receiverId]: true }))
      // Check existing
      const { data: existing } = await supabase
        .from('connections')
        .select('id, status')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
        .maybeSingle()

      if (existing) {
        alert(existing.status === 'accepted' ? 'You are already connected' : 'Request already sent')
        return
      }

      const { data, error } = await supabase
        .from('connections')
        .insert({ sender_id: user.id, receiver_id: receiverId, status: 'pending' })
        .select('*')
        .single()
      if (error) throw error

      // Notify receiver
      await supabase
        .from('notifications')
        .insert({
          user_id: receiverId,
          message: `${userProfile?.full_name || 'Someone'} sent you a connection request`,
          type: 'connection_request',
          related_entity_type: 'connection',
          related_entity_id: data.id
        })

      // Reflect locally
      setConnections(prev => [...prev, data])
    } catch (err) {
      console.error('Connect error', err)
      alert('Failed to send request')
    } finally {
      setConnectingIds(prev => ({ ...prev, [receiverId]: false }))
    }
  }

  // Dropdown states
  const [dropdowns, setDropdowns] = useState({
    professions: false,
    clinical_areas: false,
    content_type: false,
    audience_level: false,
    related_conditions: false,
    language: false,
    editVisibility: false
  })

  // Filter dropdown states
  const [filterDropdowns, setFilterDropdowns] = useState({
    professions: false,
    clinical_areas: false,
    content_types: false,
    audience_levels: false,
    related_conditions: false,
    languages: false
  })

  // Refs for dropdowns
  const dropdownRefs = {
    professions: useRef<HTMLDivElement>(null),
    clinical_areas: useRef<HTMLDivElement>(null),
    content_type: useRef<HTMLDivElement>(null),
    audience_level: useRef<HTMLDivElement>(null),
    related_conditions: useRef<HTMLDivElement>(null),
    language: useRef<HTMLDivElement>(null)
  }

  const filterDropdownRefs = {
    professions: useRef<HTMLDivElement>(null),
    clinical_areas: useRef<HTMLDivElement>(null),
    content_types: useRef<HTMLDivElement>(null),
    audience_levels: useRef<HTMLDivElement>(null),
    related_conditions: useRef<HTMLDivElement>(null),
    languages: useRef<HTMLDivElement>(null)
  }

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // New post modal dropdowns
      Object.entries(dropdownRefs).forEach(([key, ref]) => {
        if (ref.current && !ref.current.contains(event.target as Node)) {
          setDropdowns(prev => ({ ...prev, [key]: false }))
        }
      })
  
      // Filter dropdowns
      Object.entries(filterDropdownRefs).forEach(([key, ref]) => {
        if (ref.current && !ref.current.contains(event.target as Node)) {
          setFilterDropdowns(prev => ({ ...prev, [key]: false }))
        }
      })
  
      // Post menus - tüm menü ref'lerini kontrol et
      let clickedOutsideAllMenus = true;
      Object.values(menuRefs.current).forEach(ref => {
        if (ref && ref.contains(event.target as Node)) {
          clickedOutsideAllMenus = false;
        }
      });
  
      if (clickedOutsideAllMenus) {
        setActiveMenuPost(null);
      }
    }
  
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!user) {
      setRealtimeStatus('disconnected');
      return;
    }
  
    let postsChannel: any;
    let repliesChannel: any;
    let commentReactionsChannel: any;
    let bookmarksChannel: any;
  
    const setupRealtimeSubscriptions = async () => {
      try {
        setRealtimeStatus('connecting');
  
        // Posts channel - DÜZELTİLDİ: subscribe callback eklendi
        postsChannel = supabase.channel('posts-follow')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'posts',
            },
            (payload) => {
              console.log('Post real-time update:', payload);
              handlePostRealtime(payload);
            }
          )
          .subscribe((status, error) => {
            console.log('Posts channel subscription status:', status);
            if (status === 'SUBSCRIBED') {
              setRealtimeStatus('connected');
            } else if (status === 'CHANNEL_ERROR' || error) {
              console.error('Posts channel error:', error);
              setRealtimeStatus('disconnected');
            }
          });
  
        // Post comments channel
        repliesChannel = supabase.channel('replies-follow')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'post_comments',
            },
            (payload) => {
              console.log('Reply real-time update:', payload);
              handleReplyRealtime(payload);
            }
          )
          .subscribe((status, error) => {
            console.log('Replies channel subscription status:', status);
            if (error) {
              console.error('Replies channel error:', error);
            }
          });
  
        // Comment reactions channel - DÜZELTİLDİ: subscribe callback eklendi
        commentReactionsChannel = supabase.channel('comment-reactions-follow')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'comment_reactions',
            },
            (payload) => {
              console.log('Comment reaction real-time update:', payload);
              handleCommentReactionRealtime(payload);
            }
          )
          .subscribe((status, error) => {
            console.log('Comment reactions channel subscription status:', status);
            if (error) {
              console.error('Comment reactions channel error:', error);
            }
          });

        // Bookmarks channel - real-time subscription
        bookmarksChannel = supabase.channel('bookmarks-follow')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'post_bookmarks',
              filter: `user_id=eq.${user?.id || ''}`,
            },
            (payload) => {
              console.log('Bookmark real-time update:', payload);
              if (payload.eventType === 'INSERT') {
                setBookmarkedPosts(prev => [...prev, payload.new.post_id]);
              } else if (payload.eventType === 'DELETE') {
                setBookmarkedPosts(prev => prev.filter(id => id !== payload.old.post_id));
              }
            }
          )
          .subscribe((status, error) => {
            console.log('Bookmarks channel subscription status:', status);
            if (error) {
              console.error('Bookmarks channel error:', error);
            }
          });
  
      } catch (error) {
        console.error('Error setting up real-time subscriptions:', error);
        setRealtimeStatus('disconnected');
      }
    };
  
    setupRealtimeSubscriptions();
  
    return () => {
      try {
        // DÜZELTİLDİ: unsubscribe metodları callback ile çağrıldı
        postsChannel?.unsubscribe();
        repliesChannel?.unsubscribe();
        commentReactionsChannel?.unsubscribe();
        bookmarksChannel?.unsubscribe();
        setRealtimeStatus('disconnected');
      } catch (e) {
        console.error('Error unsubscribing channels:', e);
      }
    };
  }, [user, feedFilters]);

  // Periyodik yenileme için useEffect
  useEffect(() => {
    if (!user) return;

    const refreshInterval = setInterval(() => {
      // Sadece sayfa görünürse ve real-time bağlantısı kopmuşsa yenile
      if (document.visibilityState === 'visible' && realtimeStatus === 'disconnected') {
        console.log('Periodic refresh triggered');
        loadPosts(0, true);
        loadFollowingPosts();
      }
    }, 30000); // 30 saniyede bir

    return () => clearInterval(refreshInterval);
  }, [user, realtimeStatus]);

  // Posts değiştiğinde menü ref'lerini temizle
  useEffect(() => {
    // Mevcut post ID'lerini al
    const currentPostIds = new Set(posts.map(p => p.id))
    
    // Silinmiş post'ların ref'lerini temizle
    Object.keys(menuRefs.current).forEach(postId => {
      if (!currentPostIds.has(postId)) {
        delete menuRefs.current[postId]
      }
    })
  }, [posts])

  // useEffect içindeki real-time subscription'ı güncelle
  useEffect(() => {
    if (user) {
      loadPosts(0, true)
      loadFollowingPosts()
      
      // Real-time subscriptions
      const postsChannel = supabase.channel('public:posts')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (payload) => {
          handlePostRealtime(payload)
        })
        .subscribe()
  
      const repliesChannel = supabase.channel('public:post_comments')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'post_comments' }, (payload) => {
          handleReplyRealtime(payload)
        })
        .subscribe()
  
      // YENİ: Yorum reaksiyonları için real-time subscription
      const commentReactionsChannel = supabase.channel('public:comment_reactions')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comment_reactions' }, (payload) => {
          handleCommentReactionRealtime(payload)
        })
        .subscribe()

      const bookmarksChannel = supabase.channel('public:post_bookmarks')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'post_bookmarks',
          filter: `user_id=eq.${user?.id || ''}`,
        }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setBookmarkedPosts(prev => [...prev, payload.new.post_id]);
          } else if (payload.eventType === 'DELETE') {
            setBookmarkedPosts(prev => prev.filter(id => id !== payload.old.post_id));
          }
        })
        .subscribe()

      return () => {
        try { postsChannel.unsubscribe() } catch (e) {}
        try { repliesChannel.unsubscribe() } catch (e) {}
        try { commentReactionsChannel.unsubscribe() } catch (e) {}
        try { bookmarksChannel.unsubscribe() } catch (e) {}
      }
    }
  }, [user, feedFilters])

  
  const handlePostRealtime = async (payload: any) => {
    const { eventType, new: newRow, old: oldRow } = payload;
    
    console.log('Handling post real-time:', eventType, newRow);
  
    // Kendi post'larımızı filtrele (INSERT için) - ÇÖZÜM BURADA!
    if (eventType === 'INSERT' && newRow.user_id === user?.id) {
      console.log('Ignoring own post in real-time');
      return;
    }
  
    if (eventType === 'INSERT') {
      // Yeni post için kullanıcı bilgilerini çek
      let userProfile = { 
        id: newRow.user_id, 
        full_name: 'Loading...', 
        profession: '' 
      };
      
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, profession')
          .eq('id', newRow.user_id)
          .single();
        
        if (data) {
          userProfile = data;
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
  
      const attached = {
        ...newRow,
        user: userProfile,
        replies_count: 0,
        post_metadata: newRow.post_metadata || {}
      };
  
      // Filtre kontrolü yap (mevcut filtrelerle uyumlu mu)
      const passesFilters = await checkPostFilters(attached, feedFilters);
      
      if (passesFilters) {
        setPosts(prev => {
          // Aynı post zaten varsa ekleme
          if (prev.some(p => p.id === attached.id)) {
            return prev;
          }
          return [attached, ...prev];
        });
      }
  
      setPostSettings(prev => ({ 
        ...prev, 
        [newRow.id]: { 
          comments_disabled: newRow.comments_disabled || false, 
          muted: newRow.muted || false 
        } 
      }));
  
    } else if (eventType === 'UPDATE') {
      setPosts(prev => prev.map(p => {
        if (p.id === newRow.id) {
          return { ...p, ...newRow };
        }
        return p;
      }));
      
      setPostSettings(prev => ({ 
        ...prev, 
        [newRow.id]: { 
          comments_disabled: newRow.comments_disabled || false, 
          muted: newRow.muted || false 
        } 
      }));
  
    } else if (eventType === 'DELETE') {
      setPosts(prev => prev.filter(p => p.id !== oldRow.id));
      setComments(prev => {
        const copy = { ...prev };
        delete copy[oldRow.id];
        return copy;
      });
      setFollowingPosts(prev => prev.filter(id => id !== oldRow.id));
      
      // Menü ref'ini de temizle
      delete menuRefs.current[oldRow.id];
    }
  };

  // Filtre kontrol fonksiyonu
  const checkPostFilters = async (post: any, filters: FeedFilters): Promise<boolean> => {
    // Eğer aktif filtre yoksa, tüm postları göster
    if (Object.values(filters).flat().length === 0 && 
        !filters.show_only_my_profession && 
        !filters.show_only_my_network) {
      return true;
    }
  
    const metadata = post.post_metadata || {};
  
    // Profesyon filtreleri
    if (filters.professions.length > 0) {
      const postProfessions = metadata.professions || [];
      const hasMatchingProfession = filters.professions.some(profession => 
        postProfessions.includes(profession)
      );
      if (!hasMatchingProfession) return false;
    }
  
    // Klinik alan filtreleri
    if (filters.clinical_areas.length > 0) {
      const postClinicalAreas = metadata.clinical_areas || [];
      const hasMatchingArea = filters.clinical_areas.some(area => 
        postClinicalAreas.includes(area)
      );
      if (!hasMatchingArea) return false;
    }
  
    // İçerik tipi filtreleri
    if (filters.content_types.length > 0) {
      const postContentType = metadata.content_type;
      if (!postContentType || !filters.content_types.includes(postContentType)) {
        return false;
      }
    }
  
    // Audience level filtreleri
    if (filters.audience_levels.length > 0) {
      const postAudienceLevel = metadata.audience_level;
      if (!postAudienceLevel || !filters.audience_levels.includes(postAudienceLevel)) {
        return false;
      }
    }
  
    // Related conditions filtreleri
    if (filters.related_conditions.length > 0) {
      const postRelatedConditions = metadata.related_conditions || [];
      const hasMatchingCondition = filters.related_conditions.some(condition => 
        postRelatedConditions.includes(condition)
      );
      if (!hasMatchingCondition) return false;
    }
  
    // Dil filtreleri
    if (filters.languages.length > 0) {
      const postLanguage = metadata.language || 'English';
      if (!filters.languages.includes(postLanguage)) {
        return false;
      }
    }
  
    // Sadece benim mesleğim filtresi
    if (filters.show_only_my_profession && user) {
      try {
        const userProfile = await getUserProfile();
        const postProfessions = metadata.professions || [];
        if (!userProfile?.profession || !postProfessions.includes(userProfile.profession)) {
          return false;
        }
      } catch (err) {
        console.error('Error checking profession filter:', err);
      }
    }
  
    // Sadece benim ağım filtresi (basit implementasyon)
    if (filters.show_only_my_network && user) {
      // Bu kısım bağlantı sisteminize bağlı olarak implemente edilmeli
      // Şimdilik tüm postları göster
      console.log('Network filter not fully implemented');
    }
  
    return true;
  };

  // Yorum beğenme - Güncellenmiş versiyon
  const handleLikeComment = async (commentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    console.log('Like clicked - User:', user.id, 'Comment:', commentId);
    const currentReaction = userReactions[commentId];
    const currentLikes = commentLikes[commentId] || 0;
    
    try {
      if (currentReaction === 'like') {
        // OPTIMISTIC UPDATE: Hemen state'i güncelle
        setCommentLikes(prev => ({ ...prev, [commentId]: Math.max(0, currentLikes - 1) }));
        setUserReactions(prev => ({ ...prev, [commentId]: null }));

        // Veritabanı işlemi
        const { error } = await supabase
          .from('comment_reactions')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id)
          .eq('reaction_type', 'like');

        if (error) {
          // Hata olursa geri al - AMA real-time gelirse çakışma olmaz çünkü kendi aksiyonumuzu filtreliyoruz
          setCommentLikes(prev => ({ ...prev, [commentId]: currentLikes }));
          setUserReactions(prev => ({ ...prev, [commentId]: 'like' }));
          throw error;
        }

      } else {
        // OPTIMISTIC UPDATE: Hemen state'i güncelle
        setCommentLikes(prev => ({ ...prev, [commentId]: currentLikes + 1 }));
        

        setUserReactions(prev => ({ ...prev, [commentId]: 'like' }));

        // Like ekle
        const { error } = await supabase
          .from('comment_reactions')
          .upsert({
            comment_id: commentId,
            user_id: user.id,
            reaction_type: 'like'
          });

        if (error) {
          // Hata olursa geri al
          setCommentLikes(prev => ({ ...prev, [commentId]: currentLikes }));
          setUserReactions(prev => ({ ...prev, [commentId]: currentReaction }));
          throw error;
        }

        // Create notification for comment owner
        // Find comment in state to get owner
        let commentOwnerId: string | null = null
        let postIdForComment: string | null = null
        for (const postId in comments) {
          const findComment = (commentList: Comment[]): Comment | null => {
            for (const comment of commentList) {
              if (comment.id === commentId) {
                return comment
              }
              if (comment.replies) {
                const found = findComment(comment.replies)
                if (found) return found
              }
            }
            return null
          }
          const foundComment = findComment(comments[postId])
          if (foundComment) {
            commentOwnerId = foundComment.user_id
            postIdForComment = postId
            break
          }
        }

        if (commentOwnerId && commentOwnerId !== user.id && postIdForComment) {
          // Check user notification settings
          const { data: settings } = await supabase
            .from('user_settings')
            .select('push_comments')
            .eq('id', commentOwnerId)
            .single()

          if (settings?.push_comments !== false) {
            await supabase
              .from('notifications')
              .insert({
                user_id: commentOwnerId,
                title: 'New like on your comment',
                message: `${userProfile?.full_name || 'Someone'} liked your comment`,
                type: 'comment_reaction',
                related_entity_type: 'comment',
                related_entity_id: commentId
              })
          }
        }
      }
    } catch (err) {
      console.error('Error updating like:', err);
    }
  };


  // Yorum favorileme - Güncellenmiş versiyon
  const handleFavoriteComment = async (commentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    const currentFavorite = commentFavorites[commentId];
    
    try {
      // OPTIMISTIC UPDATE: Hemen state'i güncelle
      setCommentFavorites(prev => ({ ...prev, [commentId]: !currentFavorite }));

      if (currentFavorite) {
        // Favoriyi kaldır
        const { error } = await supabase
          .from('comment_reactions')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id)
          .eq('reaction_type', 'favorite');

        if (error) {
          // Hata olursa geri al
          setCommentFavorites(prev => ({ ...prev, [commentId]: currentFavorite }));
          throw error;
        }
        
      } else {
        // Favori ekle
        const { error } = await supabase
          .from('comment_reactions')
          .upsert({
            comment_id: commentId,
            user_id: user.id,
            reaction_type: 'favorite'
          });

        if (error) {
          // Hata olursa geri al
          setCommentFavorites(prev => ({ ...prev, [commentId]: currentFavorite }));
          throw error;
        }
      }
    } catch (err) {
      console.error('Error updating favorite:', err);
    }
  };

  const handleCommentMenuAction = (action: string, commentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    try {
      switch (action) {
        case 'edit':
          // Find comment to edit in all posts (including nested replies)
          let foundComment: Comment | null = null;
          for (const postId in comments) {
            const findComment = (comments: Comment[]): Comment | null => {
              for (const c of comments) {
                if (c.id === commentId) return c;
                if (c.replies && c.replies.length > 0) {
                  for (const r of c.replies) {
                    if (r.id === commentId) return r;
                    if (r.replies && r.replies.length > 0) {
                      const nested = r.replies.find(nr => nr.id === commentId);
                      if (nested) return nested;
                    }
                  }
                }
              }
              return null;
            };
            const result = findComment(comments[postId] || []);
            if (result) {
              foundComment = result;
          break;
            }
          }
          if (foundComment) {
            setEditingCommentId(commentId);
            setEditCommentContent(foundComment.content);
          }
          break;
        case 'delete':
          handleDeleteComment(commentId);
          break;
        case 'report':
          setReportingCommentId(commentId);
          setReportModalOpen(true);
          break;
        default:
          console.log('Unknown action:', action);
      }
    } catch (err) {
      console.error('Error handling comment menu action:', err);
      toast.error('Failed to perform action');
    } finally {
      setActiveCommentMenu(null);
    }
  };

  const handleEditComment = async (commentId: string, postId: string) => {
    if (!editCommentContent.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    // Find original content for revert
    let originalContent = '';
    for (const pId in comments) {
      const findComment = (comments: Comment[]): Comment | null => {
        for (const c of comments) {
          if (c.id === commentId) return c;
          if (c.replies) {
            const found = findComment(c.replies);
            if (found) return found;
          }
        }
        return null;
      };
      const found = findComment(comments[pId] || []);
      if (found) {
        originalContent = found.content;
        break;
      }
    }

    // Optimistic update
    setComments(prev => {
      const postComments = prev[postId] || [];
      const updateComment = (comments: Comment[]): Comment[] => {
        return comments.map(c => {
          if (c.id === commentId) {
            return { ...c, content: editCommentContent.trim(), updated_at: new Date().toISOString() };
          }
          if (c.replies && c.replies.length > 0) {
            return { ...c, replies: updateComment(c.replies) };
          }
          return c;
        });
      };
      return { ...prev, [postId]: updateComment(postComments) };
    });

    try {
      const { error } = await supabase
        .from('post_comments')
        .update({ 
          content: editCommentContent.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId);

      if (error) throw error;

      setEditingCommentId(null);
      setEditCommentContent('');
      toast.success('Comment updated');
    } catch (error) {
      // Revert on error
      setComments(prev => {
        const postComments = prev[postId] || [];
        const revertComment = (comments: Comment[]): Comment[] => {
          return comments.map(c => {
            if (c.id === commentId) {
              return { ...c, content: originalContent };
            }
            if (c.replies) {
              return { ...c, replies: revertComment(c.replies) };
            }
            return c;
          });
        };
        return { ...prev, [postId]: revertComment(postComments) };
      });
      toast.error('Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!toast) return;
    
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    // Find which post this comment belongs to
    let targetPostId: string | null = null;
    for (const postId in comments) {
      const found = comments[postId].find(c => c.id === commentId) ||
                   comments[postId].flatMap(c => c.replies || []).find(r => r.id === commentId);
      if (found) {
        targetPostId = postId;
        break;
      }
    }

    if (!targetPostId) {
      toast.error('Comment not found');
      return;
    }

    // Optimistic update
    const originalComments = { ...comments };
    setComments(prev => {
      const postComments = prev[targetPostId!] || [];
      const deleteComment = (comments: Comment[]): Comment[] => {
        return comments.filter(c => {
          if (c.id === commentId) return false;
          if (c.replies) {
            return { ...c, replies: c.replies.filter(r => r.id !== commentId) };
          }
          return true;
        }).map(c => {
          if (c.replies) {
            return { ...c, replies: c.replies.filter(r => r.id !== commentId) };
          }
          return c;
        });
      };
      return { ...prev, [targetPostId!]: deleteComment(postComments) };
    });

    try {
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      // Update replies_count in posts
      if (targetPostId) {
        setPosts(prev => prev.map(p => 
          p.id === targetPostId 
            ? { ...p, replies_count: Math.max(0, (p.replies_count || 1) - 1) }
            : p
        ))
      }

      toast.success('Comment deleted');
    } catch (error) {
      // Revert on error
      setComments(originalComments);
      toast.error('Failed to delete comment');
    }
  };

  const handleReportComment = async () => {
    const finalReason = reportReason === 'Other' ? reportDetails.trim() : reportReason.trim();
    if (!finalReason || !reportingCommentId || !user?.id) {
      toast.error('Please provide a reason');
      return;
    }

    try {
      const { error } = await supabase
        .from('content_reports')
        .insert({
          reporter_id: user.id,
          content_type: 'comment',
          content_id: reportingCommentId,
          reason: finalReason
        });

      if (error) throw error;

      setReportModalOpen(false);
      setReportingCommentId(null);
      setReportReason('');
      setReportDetails('');
      toast.success('Comment reported. Thank you for your feedback.');
    } catch (error: any) {
      // If table doesn't exist yet, still show success
      if (error?.code === 'PGRST116') {
        setReportModalOpen(false);
        setReportingCommentId(null);
        setReportReason('');
        setReportDetails('');
        toast.success('Report feature will be available soon');
      } else {
        toast.error('Failed to report comment');
      }
    }
  };

  // Real-time yorum reaksiyon handler'ı
  const handleCommentReactionRealtime = async (payload: any) => {
    const { eventType, new: newRow, old: oldRow } = payload;
    
    console.log('Real-time reaction event:', eventType, 'User:', newRow?.user_id, 'Current user:', user?.id);

    // Kendi aksiyonlarımızı filtrele
    if (newRow && newRow.user_id === user?.id) {
      console.log('FILTERED: Ignoring own action in real-time');
      return;
    }
  
    if (eventType === 'INSERT') {
      const { comment_id, reaction_type, user_id } = newRow;
      
      // Like/dislike sayılarını güncelle
      if (reaction_type === 'like') {
        setCommentLikes(prev => ({ 
          ...prev, 
          [comment_id]: (prev[comment_id] || 0) + 1 
        }));
      } else if (reaction_type === 'favorite') {
        setCommentFavorites(prev => ({ 
          ...prev, 
          [comment_id]: true 
        }));
      }
      
      // Kullanıcı reaksiyonunu güncelle (sadece başka kullanıcılar için)
      if (user_id === user?.id) {
        setUserReactions(prev => ({ 
          ...prev, 
          [comment_id]: reaction_type 
        }));
      }
      
    } else if (eventType === 'DELETE') {
      const { comment_id, reaction_type, user_id } = oldRow;
      
      // Kendi aksiyonumuzu filtrele
      if (user_id === user?.id) {
        return;
      }
      
      // Like/dislike sayılarını güncelle
      if (reaction_type === 'like') {
        setCommentLikes(prev => ({ 
          ...prev, 
          [comment_id]: Math.max(0, (prev[comment_id] || 1) - 1) 
        }));
      } else if (reaction_type === 'favorite') {
        setCommentFavorites(prev => ({ 
          ...prev, 
          [comment_id]: false 
        }));
      }
      
    } else if (eventType === 'UPDATE') {
      const { comment_id, reaction_type, user_id } = newRow;
      const oldReactionType = oldRow.reaction_type;
      
      // Kendi aksiyonumuzu filtrele
      if (user_id === user?.id) {
        return;
      }
      
      // Eski reaksiyonu azalt
      if (oldReactionType === 'like') {
        setCommentLikes(prev => ({ 
          ...prev, 
          [comment_id]: Math.max(0, (prev[comment_id] || 1) - 1) 
        }));
      }
      
      // Yeni reaksiyonu artır
      if (reaction_type === 'like') {
        setCommentLikes(prev => ({ 
          ...prev, 
          [comment_id]: (prev[comment_id] || 0) + 1 
        }));
      }
    }
  };


  // handleReplyRealtime fonksiyonunu güncelle
  const handleReplyRealtime = async (payload: any) => {
    const { eventType, new: newRow, old: oldRow } = payload;
    
    console.log('Handling reply real-time:', eventType, newRow);
  
    // Kendi yorumlarımızı filtrele (INSERT için)
    if (eventType === 'INSERT' && newRow.user_id === user?.id) {
      console.log('Ignoring own comment in real-time');
      return;
    }
  
    // Kullanıcı bilgilerini çekmek için helper fonksiyon - GÜNCELLENDİ
    const fetchUserProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, profession, avatar_url')
          .eq('id', userId)
          .single();
        
        if (error) {
          console.error('Error fetching user profile for reply:', error);
          return { 
            id: userId, 
            full_name: 'Unknown User', 
            profession: '',
            avatar_url: null
          };
        }
        
        return data || { 
          id: userId, 
          full_name: 'Unknown User', 
          profession: '',
          avatar_url: null
        };
      } catch (err) {
        console.error('Error fetching user profile for reply:', err);
        return { 
          id: userId, 
          full_name: 'Unknown User', 
          profession: '',
          avatar_url: null
        };
      }
    };
  
    if (eventType === 'INSERT') {
      const userProfile = await fetchUserProfile(newRow.user_id);
  
      // Post'un reply count'ını güncelle
      setPosts(prev => prev.map(p => {
        if (p.id === newRow.post_id) {
          return { 
            ...p, 
            replies_count: (p.replies_count || 0) + 1 
          };
        }
        return p;
      }));
  
      // Yorumları güncelle - GÜNCELLENDİ: Yanıtlar için de kullanıcı bilgisi eklendi
      setComments(prev => {
        const postComments = prev[newRow.post_id] || [];
  
        const newComment = {
          ...newRow,
          user: userProfile,
          replies: []
        };
  
        // Eğer parent_reply_id varsa, üst yoruma ekle
        if (newRow.parent_reply_id) {
          const findAndUpdateReplies = (comments: any[]): any[] => {
            return comments.map(comment => {
              // Ana yorumda ara
              if (comment.id === newRow.parent_reply_id) {
                const updatedReplies = [...(comment.replies || []), newComment];
                return {
                  ...comment,
                  replies: updatedReplies
                };
              }
              
              // Yanıtların içinde ara (nested replies)
              if (comment.replies && comment.replies.length > 0) {
                return {
                  ...comment,
                  replies: findAndUpdateReplies(comment.replies)
                };
              }
              
              return comment;
            });
          };
          
          return { 
            ...prev, 
            [newRow.post_id]: findAndUpdateReplies(postComments) 
          };
        } else {
          // Ana yorum olarak ekle
          return { 
            ...prev, 
            [newRow.post_id]: [...postComments, newComment] 
          };
        }
      });
      
    } else if (eventType === 'DELETE') {
      // Post'un reply count'ını güncelle
      setPosts(prev => prev.map(p => {
        if (p.id === oldRow.post_id) {
          return { 
            ...p, 
            replies_count: Math.max(0, (p.replies_count || 1) - 1) 
          };
        }
        return p;
      }));
  
      // Yorumları güncelle
      setComments(prev => {
        const postComments = prev[oldRow.post_id];
        if (!postComments) return prev;
        
        const removeFromReplies = (comments: any[]): any[] => {
          return comments
            .filter(comment => comment.id !== oldRow.id)
            .map(comment => ({
              ...comment,
              replies: comment.replies ? removeFromReplies(comment.replies) : []
            }));
        };
        
        return { ...prev, [oldRow.post_id]: removeFromReplies(postComments) };
      });
      
    } else if (eventType === 'UPDATE') {
      // Yorum güncelleme (edit durumu) - kullanıcı bilgilerini de güncelle
      const userProfile = await fetchUserProfile(newRow.user_id);
      
      setComments(prev => {
        const postComments = prev[newRow.post_id];
        if (!postComments) return prev;
        
        const updateInReplies = (comments: any[]): any[] => {
          return comments.map(comment => {
            // Ana yorumda ara
            if (comment.id === newRow.id) {
              return { 
                ...comment, 
                ...newRow,
                user: userProfile
              };
            }
            
            // Yanıtların içinde ara
            if (comment.replies && comment.replies.length > 0) {
              return {
                ...comment,
                replies: updateInReplies(comment.replies)
              };
            }
            
            return comment;
          });
        };
        
        return { ...prev, [newRow.post_id]: updateInReplies(postComments) };
      });
    }
  };

  const loadPosts = async (page: number = 0, reset: boolean = false) => {
    if (!user) return

    try {
      if (reset) {
      setLoading(true)
        setPostsPage(0)
        setHasMorePosts(true)
      } else {
        setLoadingMorePosts(true)
      }

      const from = page * POSTS_PER_PAGE
      const to = from + POSTS_PER_PAGE - 1

      let query = supabase
        .from('posts')
        .select(`
          *,
          user:profiles!user_id (id, full_name, profession, avatar_url, specialties, languages)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      // Apply filters
      if (feedFilters.professions.length > 0) {
        query = query.overlaps('post_metadata->professions', feedFilters.professions)
      }

      if (feedFilters.clinical_areas.length > 0) {
        query = query.overlaps('post_metadata->clinical_areas', feedFilters.clinical_areas)
      }

      if (feedFilters.content_types.length > 0) {
        query = query.in('post_metadata->>content_type', feedFilters.content_types)
      }

      if (feedFilters.audience_levels.length > 0) {
        query = query.in('post_metadata->>audience_level', feedFilters.audience_levels)
      }

      if (feedFilters.related_conditions.length > 0) {
        query = query.overlaps('post_metadata->related_conditions', feedFilters.related_conditions)
      }

      if (feedFilters.languages.length > 0) {
        query = query.in('post_metadata->>language', feedFilters.languages)
      }

      // Show only my profession
      if (feedFilters.show_only_my_profession) {
        const userProfile = await getUserProfile()
        if (userProfile?.profession) {
          query = query.overlaps('post_metadata->professions', [userProfile.profession])
        }
      }

      // Show only my network (implementation depends on your connections system)
      if (feedFilters.show_only_my_network) {
        // This would need to be implemented based on your connections system
        // For now, we'll skip this filter
        console.log('Network filter not yet implemented')
      }

      const { data, error, count } = await query

      if (error) {
        console.error('Error loading posts:', error)
        if (reset) setLoading(false)
        else setLoadingMorePosts(false)
        return
      }

      if (count !== null) {
        const hasMore = to < (count - 1)
        setHasMorePosts(hasMore)
      }

      const postsWithDetails = await Promise.all(
        (data || []).map(async (post) => {
          // Count all comments (including nested replies) for this post
          const { count: commentsCount } = await supabase
            .from('post_comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id)

          // Load reaction counts
          const { data: reactions } = await supabase
            .from('post_reactions')
            .select('reaction_type')
            .eq('post_id', post.id)
          
          let likesCount = 0
          const emojiReactions: Record<string, number> = {}
          
          if (reactions) {
            reactions.forEach(r => {
              if (r.reaction_type === 'like') {
                likesCount++
              } else {
                emojiReactions[r.reaction_type] = (emojiReactions[r.reaction_type] || 0) + 1
              }
            })
          }

          setPostSettings(prev => ({
            ...prev,
            [post.id]: {
              comments_disabled: post.comments_disabled ?? false,
              muted: post.muted ?? false
            }
          }))

          // Set reaction counts
          if (likesCount > 0) {
            setPostLikes(prev => ({ ...prev, [post.id]: likesCount }))
          }
          if (Object.keys(emojiReactions).length > 0) {
            setPostReactions(prev => ({
              ...prev,
              [post.id]: Object.entries(emojiReactions).map(([emoji, count]) => ({ emoji, count }))
            }))
          }

          // Load repost count and check if current user reposted
          const { count: repostCount } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('post_metadata->>reposted_post_id', post.id)

          if (repostCount !== null && repostCount > 0) {
            setRepostCounts(prev => ({ ...prev, [post.id]: repostCount }))
          }

          // Check if current user reposted this post
          if (user) {
            const { data: userRepost } = await supabase
              .from('posts')
              .select('id')
              .eq('user_id', user.id)
              .eq('post_metadata->>reposted_post_id', post.id)
              .maybeSingle()

            if (userRepost) {
              setRepostedPosts(prev => {
                if (!prev.includes(post.id)) {
                  return [...prev, post.id]
                }
                return prev
              })
            }
          }

          return {
            ...post,
            user_id: post.user_id,
            user: post.user || { 
              full_name: 'Unknown User', 
              profession: '', 
              id: post.user_id 
            },
            replies_count: commentsCount || 0,
            post_metadata: post.post_metadata || {}
          }
        })
      )

      if (reset) {
      setPosts(postsWithDetails)
      } else {
        setPosts(prev => [...prev, ...postsWithDetails])
      }
    } catch (err) {
      console.error('Error loading community posts:', err)
    } finally {
      if (reset) {
      setLoading(false)
      } else {
        setLoadingMorePosts(false)
      }
    }
  }

  const loadMorePosts = async () => {
    if (!hasMorePosts || loadingMorePosts || loading) return
    
    const nextPage = postsPage + 1
    await loadPosts(nextPage, false)
    setPostsPage(nextPage)
  }

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    if (!loadMoreRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMorePosts && !loadingMorePosts && !loading) {
          loadMorePosts()
        }
      },
      { threshold: 0.5, rootMargin: '100px' }
    )

    observer.observe(loadMoreRef.current)

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current)
      }
    }
  }, [hasMorePosts, loadingMorePosts, loading])

  // Back to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const getUserProfile = async () => {
    if (!user) return null
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    return data
  }

  const loadFollowingPosts = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('post_followers')
        .select('post_id')
        .eq('user_id', user.id)

      if (!error && data) {
        setFollowingPosts(data.map(item => item.post_id))
      }
    } catch (err) {
      console.error('Error loading followed posts:', err)
    }
  }

  const loadComments = async (postId: string) => {
    try {
      // Load all comments for this post at once
      const { data: allComments, error } = await supabase
        .from('post_comments')
        .select(`
          *,
          user:profiles(id, full_name, profession, avatar_url)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
  
      if (error) {
        console.error('Error loading comments:', error)
        return
      }
  
      // Build comment tree recursively
      const buildCommentTree = (comments: any[], parentId: string | null = null): Comment[] => {
        return comments
          .filter(comment => {
            if (parentId === null) {
              return !comment.parent_reply_id
            }
            return comment.parent_reply_id === parentId
          })
          .map(comment => ({
              ...comment,
            replies: buildCommentTree(comments, comment.id)
          }))
      }
  
      const commentsTree = buildCommentTree(allComments || [])
  
      setComments(prev => ({
        ...prev,
        [postId]: commentsTree
      }))
    } catch (err) {
      console.error('Error loading comments:', err)
    }
  }

  const createPost = async () => {
    // Allow posting if there's content (strip HTML tags for length check)
    const textContent = newPost.content.replace(/<[^>]*>/g, '').trim()
    if (!textContent && !newPost.metadata.quoted_post_id) return

    setLoading(true)
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (!currentUser) {
      toast.info('Please sign in to create posts')
      setLoading(false)
      return
    }

    try {
      // Use content preview as title (strip HTML and get first line or first 100 chars)
      const textPreview = textContent.split('\n')[0].slice(0, 100) || (newPost.metadata.quoted_post_id ? 'Quote' : 'Post')
      const titleValue = textPreview
      
      const metadata: PostMetadata = { ...newPost.metadata }
      if (quotePostData && metadata.quoted_post_id) {
        metadata.quoted_post_data = {
          id: quotePostData.id,
          content: quotePostData.content,
          title: quotePostData.title,
          user_id: quotePostData.user_id,
          user: quotePostData.user
        }
      }
      
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: currentUser.id,
          title: titleValue,
          content: newPost.content, // Store HTML content
          post_metadata: metadata
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating post:', error)
        toast.error(getErrorMessage(error) || 'Failed to create post. Please try again.')
        return
      }

      toast.success(newPost.metadata.quoted_post_id ? 'Post quoted successfully' : 'Post created successfully')

      // Reset form
      setNewPost({
        title: '',
        content: '',
        metadata: {
          professions: [],
          clinical_areas: [],
          content_type: '',
          tags: [],
          audience_level: '',
          related_conditions: [],
          language: 'English',
          attachments: [],
          co_authors: [],
          is_public: true,
          visibility: 'public'
        }
      })
      setQuotePostData(null)
      setTagInput('')
      setAttachmentInput('')
      setCoAuthorInput('')
      setShowAdvancedOptions(false)
      setShowNewPostModal(false)
      await loadPosts(0, true)

    } catch (err) {
      console.error('Error creating post:', err)
      toast.error(getErrorMessage(err) || 'Failed to create post. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const updatePost = async (postId: string, updates: { title?: string | null; content?: string; metadata?: PostMetadata }) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({
          title: updates.title,
          content: updates.content,
          post_metadata: updates.metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', postId)
  
      if (error) {
        toast.error(getErrorMessage(error) || 'Failed to update post')
        throw error
      }

      toast.success('Post updated successfully')
  
      // Update local state (optional, since loadPosts will reload everything)
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { 
              ...p, 
              ...(updates.title !== undefined && updates.title !== null ? { title: updates.title } : {}),
              ...(updates.content !== undefined ? { content: updates.content } : {}),
              post_metadata: updates.metadata || p.post_metadata
            } 
          : p
      ))
    } catch (err) {
      console.error('Error updating post:', err)
      toast.error('Failed to update post')
      throw err // Re-throw to handle in calling function
    }
  }

  // Delete post fonksiyonunu daha güvenli hale getirelim
  const deletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)

      if (error) throw error

      // Local state'ten kaldır
      setPosts(prev => prev.filter(p => p.id !== postId))
      
      // Menü ref'ini temizle
      delete menuRefs.current[postId]
      
      // Eğer silinen post seçiliyse, seçimi temizle
      if (selectedPost?.id === postId) {
        setSelectedPost(null)
      }
      
    } catch (err) {
      console.error('Error deleting post:', err)
      toast.error('Failed to delete post')
      throw err
    }
  }

  const togglePostSettings = async (postId: string, setting: 'comments_disabled' | 'muted') => {
    const oldValue = postSettings[postId]?.[setting]
    
    try {
      const newValue = !oldValue
  
      // Optimistic UI Update
      setPostSettings(prev => ({ 
        ...prev, 
        [postId]: { ...prev[postId], [setting]: newValue } 
      }))
  
    const { error } = await supabase
      .from('posts')
      .update({ [setting]: newValue })
        .eq('id', postId)
        .select()
  
      if (error) throw error
  
      if (setting === 'muted' && followingPosts.includes(postId)) {
        if (newValue) {
          await unfollowPost(postId)
        } else {
          await followPost(postId)
        }
      }
    } catch (err) {
      console.error('Error updating post settings:', err)
      toast.error('Failed to update post settings')
      // Revert optimistic UI update
      setPostSettings(prev => ({ 
        ...prev, 
        [postId]: { ...prev[postId], [setting]: oldValue } 
      }))
    }
  }

  const followPost = async (postId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('post_followers')
        .insert({ post_id: postId, user_id: user.id })

      if (error) throw error

      setFollowingPosts(prev => Array.from(new Set([...prev, postId])))
    } catch (err) {
      console.error('Error following post:', err)
    }
  }

  const unfollowPost = async (postId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('post_followers')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)

      if (error) throw error

      setFollowingPosts(prev => prev.filter(id => id !== postId))
    } catch (err) {
      console.error('Error unfollowing post:', err)
    }
  }

  const addEditCoAuthor = () => {
    if (coAuthorInput.trim() && !editForm.metadata.co_authors.includes(coAuthorInput.trim())) {
      setEditForm({
        ...editForm,
        metadata: {
          ...editForm.metadata,
          co_authors: [...editForm.metadata.co_authors, coAuthorInput.trim()]
        }
      })
      setCoAuthorInput('')
    }
  }

  const removeEditCoAuthor = (coAuthorToRemove: string) => {
    setEditForm({
      ...editForm,
      metadata: {
        ...editForm.metadata,
        co_authors: editForm.metadata.co_authors.filter(coAuthor => coAuthor !== coAuthorToRemove)
      }
    })
  }

  const viewUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setSelectedUserProfile(data)
    } catch (err) {
      console.error('Error loading user profile:', err)
    }
  }

  // Toggle expanded post content
  const toggleExpandPost = (postId: string) => {
    setExpandedPosts(prev => ({ ...prev, [postId]: !prev[postId] }))
  }

  // Toggle comments section
  const toggleComments = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const isOpen = !openComments[postId]
    setOpenComments(prev => ({ ...prev, [postId]: isOpen }))
    if (isOpen && !comments[postId]) {
      loadComments(postId)
    }
  }

  // Handle like/dislike
  const handleLikePost = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    const currentReaction = userPostReactions[postId];

    try {
      if (currentReaction === 'like') {
        // Remove like
        setPostLikes(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 0) - 1) }));
        setUserPostReactions(prev => ({ ...prev, [postId]: null }));
        // Persist removal
        await supabase
          .from('post_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        

      } else {
        // Add like, remove old reaction if exists
        setPostLikes(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }));

        if (currentReaction && currentReaction !== 'like') {
          // Remove emoji reaction
          setPostReactions(prev => {
            const current = prev[postId] || [];
            return {
              ...prev,
              [postId]: current.map(r => 
                r.emoji === currentReaction ? { ...r, count: Math.max(0, r.count - 1) } : r
              ).filter(r => r.count > 0)
            };
          });
        }

        // Persist replacement of previous reaction (if any)
        await supabase
          .from('post_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        setUserPostReactions(prev => ({ ...prev, [postId]: 'like' }));

        // Persist like
        await supabase
          .from('post_reactions')
          .upsert({
            post_id: postId,
            user_id: user.id,
            reaction_type: 'like'
          }, { onConflict: 'post_id,user_id' });

        // Create notification for post owner
        const post = posts.find(p => p.id === postId)
        const postOwnerId = String(post?.user_id || '')
        const currentUserId = String(user?.id || '')
        
        if (post && postOwnerId !== '' && currentUserId !== '' && postOwnerId !== currentUserId) {
          // Get current user profile for notification
          const currentUserProfileData = await getUserProfile()
          
          // Check user notification settings
          const { data: settings, error: settingsError } = await supabase
            .from('user_settings')
            .select('push_post_reactions')
            .eq('id', post.user_id)
            .single()

          if (settingsError) {
            console.error('Error fetching user settings:', settingsError)
          }

          if (!settingsError && settings?.push_post_reactions !== false) {
            const { error: notifError } = await supabase
              .from('notifications')
              .insert({
                user_id: post.user_id,
                title: 'New like on your post',
                message: `${currentUserProfileData?.full_name || 'Someone'} liked your post`,
                type: 'post_reaction',
                related_entity_type: 'post',
                related_entity_id: postId
              })
            
            if (notifError) {
              console.error('Error creating like notification:', notifError)
            } else {
              console.log('Like notification created successfully for user:', post.user_id)
            }
          }
        }
      }
    } catch (err) {
      console.error('Error updating post like:', err);
    }
  };


  const handleEmojiReaction = async (postId: string, emoji: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    const currentReaction = userPostReactions[postId];

    try {
      if (currentReaction === emoji) {
        // Remove emoji reaction
        setPostReactions(prev => {
          const current = prev[postId] || [];
          return {
            ...prev,
            [postId]: current.map(r => 
              r.emoji === emoji ? { ...r, count: Math.max(0, r.count - 1) } : r
            ).filter(r => r.count > 0)
          };
        });
        setUserPostReactions(prev => ({ ...prev, [postId]: null }));
        // Persist removal
        await supabase
          .from('post_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        

      } else {
        // Add emoji reaction, remove old if exists
        setPostReactions(prev => {
          const current = prev[postId] || [];
          const existing = current.find(r => r.emoji === emoji);
          if (existing) {
            return {
              ...prev,
              [postId]: current.map(r => 
                r.emoji === emoji ? { ...r, count: r.count + 1 } : r
              )
            };
          } else {
            return {
              ...prev,
              [postId]: [...current, { emoji, count: 1 }]
            };
          }
        });

        if (currentReaction) {
          if (currentReaction === 'like') {
            setPostLikes(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 0) - 1) }));
          } else {
            // Remove old emoji
            setPostReactions(prev => {
              const current = prev[postId] || [];
              return {
                ...prev,
                [postId]: current.map(r => 
                  r.emoji === currentReaction ? { ...r, count: Math.max(0, r.count - 1) } : r
                ).filter(r => r.count > 0)
              };
            });
          }

          // Remove previous persisted reaction
          await supabase
            .from('post_reactions')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', user.id);

        }

        setUserPostReactions(prev => ({ ...prev, [postId]: emoji }));

        // Persist new emoji reaction
        await supabase
          .from('post_reactions')
          .upsert({ post_id: postId, user_id: user.id, reaction_type: emoji }, { onConflict: 'post_id,user_id' });

        // Create notification for post owner
        const post = posts.find(p => p.id === postId)
        const postOwnerId = String(post?.user_id || '')
        const currentUserId = String(user?.id || '')
        
        if (post && postOwnerId !== '' && currentUserId !== '' && postOwnerId !== currentUserId) {
          // Get current user profile for notification
          const currentUserProfileData = await getUserProfile()
          
          // Check user notification settings
          const { data: settings, error: settingsError } = await supabase
            .from('user_settings')
            .select('push_post_reactions')
            .eq('id', post.user_id)
            .single()

          if (settingsError) {
            console.error('Error fetching user settings for emoji reaction:', settingsError)
          }

          if (!settingsError && settings?.push_post_reactions !== false) {
            const { error: notifError } = await supabase
              .from('notifications')
              .insert({
                user_id: post.user_id,
                title: 'New reaction on your post',
                message: `${currentUserProfileData?.full_name || 'Someone'} reacted ${emoji} to your post`,
                type: 'post_reaction',
                related_entity_type: 'post',
                related_entity_id: postId
              })
            
            if (notifError) {
              console.error('Error creating emoji reaction notification:', notifError)
            } else {
              console.log('Emoji reaction notification created successfully for user:', post.user_id)
            }
          }
        }
      }
      setShowEmojiPicker(null);
    } catch (err) {
      console.error('Error updating emoji reaction:', err);
    }
  };

  // Long press handlers
  const handleLongPressStart = (postId: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    const timer = setTimeout(() => {
      setShowEmojiPicker(postId)
    }, 500) // 500ms for long press
    setLongPressTimer(timer)
  }

  const handleLongPressEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  const addComment = async (postId: string, parentReplyId: string | null = null) => {
    const commentText = parentReplyId ? replyContents[parentReplyId] : newComments[postId]
    if (!commentText?.trim() || !user) return
  
    try {
      // Optimistic update - hemen görünsün
      const tempId = `temp-${Date.now()}`
      const currentUserProfile = await getUserProfile()
      
      const newComment = {
        id: tempId,
        post_id: postId,
        user_id: user.id,
        content: commentText.trim(),
        parent_reply_id: parentReplyId,
        created_at: new Date().toISOString(),
        user: currentUserProfile || { 
          id: user.id, 
          full_name: 'You', 
          profession: '' 
        },
        replies: []
      }
  
      // State'i optimistically güncelle
      setComments(prev => {
        const postComments = prev[postId] || []
        
        if (parentReplyId) {
          // Yanıt ekleme - fully recursive search for any nested level
          const findAndAddReply = (comments: Comment[]): Comment[] => {
            return comments.map(comment => {
              // Check if this comment/reply is the parent
            if (comment.id === parentReplyId) {
              return {
                ...comment,
                replies: [...(comment.replies || []), newComment]
              }
            }
              // Recursively search in all nested replies
              if (comment.replies && comment.replies.length > 0) {
                return {
                  ...comment,
                  replies: findAndAddReply(comment.replies)
              }
            }
            return comment
          })
          }
          return { ...prev, [postId]: findAndAddReply(postComments) }
        } else {
          // Yeni yorum ekleme
          return { 
            ...prev, 
            [postId]: [...postComments, newComment] 
          }
        }
      })
  
      // Input'ları temizle
      if (parentReplyId) {
        setReplyContents(prev => ({ ...prev, [parentReplyId]: '' }))
        // DÜZELTME: null yerine false
        setReplyingTo(prev => ({ ...prev, [parentReplyId]: false }))
      } else {
        setNewComments(prev => ({ ...prev, [postId]: '' }))
      }
  
  // Veritabanına kaydet - parentReplyId null değilse ve geçerli bir UUID ise
      const { error } = await supabase
    .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: commentText.trim(),
      parent_reply_id: parentReplyId && parentReplyId.startsWith('temp-') ? null : parentReplyId
        })
  
      if (error) {
        // Hata olursa optimistic update'i geri al
        setComments(prev => {
          const postComments = prev[postId] || []
          if (parentReplyId) {
            const removeTempReply = (comments: Comment[]): Comment[] => {
              return comments.map(comment => {
              if (comment.id === parentReplyId) {
                return {
                  ...comment,
                  replies: (comment.replies || []).filter((reply: any) => reply.id !== tempId)
                }
              }
                if (comment.replies && comment.replies.length > 0) {
                  return {
                    ...comment,
                    replies: removeTempReply(comment.replies)
                }
              }
              return comment
            })
            }
            return { ...prev, [postId]: removeTempReply(postComments) }
          } else {
            return { 
              ...prev, 
              [postId]: postComments.filter(comment => comment.id !== tempId)
            }
          }
        })
        throw error
      }
      
      // Veritabanından gerçek yorumu al ve optimistic update'i güncelle
      const { data: insertedComment, error: fetchError } = await supabase
        .from('post_comments')
        .select(`
          *,
          user:profiles(*)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!fetchError && insertedComment) {
        // Gerçek yorumu state'e ekle (temp ID'yi gerçek ID ile değiştir)
        setComments(prev => {
          const postComments = prev[postId] || []
          
          if (parentReplyId) {
            const replaceTempWithReal = (comments: Comment[]): Comment[] => {
              return comments.map(comment => {
                if (comment.id === parentReplyId) {
                  return {
                    ...comment,
                    replies: (comment.replies || []).map((r: any) => 
                      r.id === tempId ? { ...insertedComment, replies: [] } : r
                    )
                  }
                }
                if (comment.replies && comment.replies.length > 0) {
                  return {
                    ...comment,
                    replies: replaceTempWithReal(comment.replies)
                  }
                }
                return comment
              })
            }
            return { ...prev, [postId]: replaceTempWithReal(postComments) }
          } else {
            return {
              ...prev,
              [postId]: postComments.map(c => 
                c.id === tempId ? { ...insertedComment, replies: [] } : c
              )
            }
          }
        })
        
        // Update replies_count in posts
        setPosts(prev => prev.map(p => 
          p.id === postId 
            ? { ...p, replies_count: (p.replies_count || 0) + 1 }
            : p
        ))

        // Create notifications
        const post = posts.find(p => p.id === postId)
        const currentUserProfileData = await getUserProfile()
        const postOwnerId = String(post?.user_id || '')
        const currentUserId = String(user?.id || '')
        
        // Notify post owner (if comment is not from post owner)
        if (post && postOwnerId !== '' && currentUserId !== '' && postOwnerId !== currentUserId) {
          const { data: settings, error: settingsError } = await supabase
            .from('user_settings')
            .select('push_comments')
            .eq('id', post.user_id)
            .single()

          if (settingsError) {
            console.error('Error fetching user settings for comment notification:', settingsError)
          }

          if (!settingsError && settings?.push_comments !== false) {
            const { error: notifError } = await supabase
              .from('notifications')
              .insert({
                user_id: post.user_id,
                title: 'New comment on your post',
                message: `${currentUserProfileData?.full_name || 'Someone'} commented on your post`,
                type: 'comment',
                related_entity_type: 'post',
                related_entity_id: postId,
                metadata: { comment_id: insertedComment.id, post_id: postId }
              })
            
            if (notifError) {
              console.error('Error creating comment notification:', notifError)
            } else {
              console.log('Comment notification created successfully for user:', post.user_id)
            }
          }
        }

        // If it's a reply, notify parent comment owner
        if (parentReplyId) {
          // Find parent comment to get owner
          let parentCommentOwnerId: string | null = null
          for (const pid in comments) {
            const findCommentRecursive = (commentList: Comment[]): Comment | null => {
              for (const comment of commentList) {
                if (comment.id === parentReplyId) {
                  return comment
                }
                if (comment.replies) {
                  const found = findCommentRecursive(comment.replies)
                  if (found) return found
                }
              }
              return null
            }
            const parentComment = findCommentRecursive(comments[pid])
            if (parentComment) {
              parentCommentOwnerId = parentComment.user_id
              break
            }
          }

          if (parentCommentOwnerId && parentCommentOwnerId !== user.id) {
            const { data: settings } = await supabase
              .from('user_settings')
              .select('push_comments')
              .eq('id', parentCommentOwnerId)
              .single()

            if (settings?.push_comments !== false) {
              const { error: notifError } = await supabase
                .from('notifications')
                .insert({
                  user_id: parentCommentOwnerId,
                  title: 'New reply to your comment',
                  message: `${currentUserProfileData?.full_name || 'Someone'} replied to your comment`,
                  type: 'comment',
                  related_entity_type: 'comment',
                  related_entity_id: parentReplyId,
                  metadata: { comment_id: insertedComment.id, parent_comment_id: parentReplyId, post_id: postId }
                })
              
              if (notifError) {
                console.error('Error creating reply notification:', notifError)
              }
            }
          }
        }
      }
  
    } catch (err) {
      console.error('Error adding comment:', err)
      toast.error('Failed to add comment')
    }
  }

  const isPostOwner = (post: any) => {
    const currentUserId = String(user?.id || '')
    const postOwnerId = String(post?.user_id || post?.user?.id || '')
    
    return currentUserId !== '' && currentUserId === postOwnerId
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
  
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60))
      return `${minutes}m ago`
    } else if (hours < 24) {
      return `${hours}h ago`
    } else {
      const days = Math.floor(hours / 24)
      return `${days}d ago`
    }
  }

  // Helper functions for tag input
  const addTag = () => {
    if (tagInput.trim() && !newPost.metadata.tags.includes(tagInput.trim())) {
      setNewPost({
        ...newPost,
        metadata: {
          ...newPost.metadata,
          tags: [...newPost.metadata.tags, tagInput.trim()]
        }
      })
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setNewPost({
      ...newPost,
      metadata: {
        ...newPost.metadata,
        tags: newPost.metadata.tags.filter(tag => tag !== tagToRemove)
      }
    })
  }

  const addAttachment = () => {
    if (attachmentInput.trim() && !newPost.metadata.attachments.includes(attachmentInput.trim())) {
      setNewPost({
        ...newPost,
        metadata: {
          ...newPost.metadata,
          attachments: [...newPost.metadata.attachments, attachmentInput.trim()]
        }
      })
      setAttachmentInput('')
    }
  }

  const removeAttachment = (attachmentToRemove: string) => {
    setNewPost({
      ...newPost,
      metadata: {
        ...newPost.metadata,
        attachments: newPost.metadata.attachments.filter(attachment => attachment !== attachmentToRemove)
      }
    })
  }

  const addCoAuthor = () => {
    if (coAuthorInput.trim() && !newPost.metadata.co_authors.includes(coAuthorInput.trim())) {
      setNewPost({
        ...newPost,
        metadata: {
          ...newPost.metadata,
          co_authors: [...newPost.metadata.co_authors, coAuthorInput.trim()]
        }
      })
      setCoAuthorInput('')
    }
  }

  const removeCoAuthor = (coAuthorToRemove: string) => {
    setNewPost({
      ...newPost,
      metadata: {
        ...newPost.metadata,
        co_authors: newPost.metadata.co_authors.filter(coAuthor => coAuthor !== coAuthorToRemove)
      }
    })
  }

  // Filter functions
  const toggleFilter = (filterType: keyof FeedFilters, value: string) => {
    setFeedFilters(prev => {
      const currentArray = prev[filterType] as string[]
      if (currentArray.includes(value)) {
        return {
          ...prev,
          [filterType]: currentArray.filter(item => item !== value)
        }
      } else {
        return {
          ...prev,
          [filterType]: [...currentArray, value]
        }
      }
    })
  }

  // Reset posts when filters change
  useEffect(() => {
    if (user) {
      loadPosts(0, true)
    }
  }, [feedFilters, user?.id])

  const clearAllFilters = () => {
    setFeedFilters({
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
    loadPosts(0, true)
  }

  // Helper functions for edit form tags
  const addEditTag = () => {
    if (tagInput.trim() && !editForm.metadata.tags.includes(tagInput.trim())) {
      setEditForm({
        ...editForm,
        metadata: {
          ...editForm.metadata,
          tags: [...editForm.metadata.tags, tagInput.trim()]
        }
      })
      setTagInput('')
    }
  }

  const removeEditTag = (tagToRemove: string) => {
    setEditForm({
      ...editForm,
      metadata: {
        ...editForm.metadata,
        tags: editForm.metadata.tags.filter(tag => tag !== tagToRemove)
      }
    })
  }

  const handleUpdatePost = async () => {
    // Strip HTML tags for length check
    const textContent = editForm.content.replace(/<[^>]*>/g, '').trim()
    if (!textContent) return

    setLoading(true)
    try {
      await updatePost(editForm.id, {
        title: editForm.title.trim() || null,
        content: editForm.content, // Store HTML content
        metadata: editForm.metadata
      })
      
      toast.success('Post updated successfully!')
      // Reset and reload posts to avoid duplicates
      await loadPosts(0, true)
      setEditForm({ ...editForm, id: '' }) // Close modal
    } catch (err) {
      console.error('Error updating post:', err)
      toast.error('Failed to update post')
    } finally {
      setLoading(false)
    }
  }

  // Menu action handler'ı daha güvenli hale getirelim
  const handleMenuAction = async (action: string, postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    console.log(`Menu action: ${action} for post ${postId}`);
    
    try {
      switch (action) {
        case 'edit':
          const postToEdit = posts.find(p => p.id === postId)
          if (postToEdit) {
            setEditForm({
              id: postToEdit.id,
              title: postToEdit.title,
              content: postToEdit.content,
              metadata: {
                professions: postToEdit.post_metadata?.professions || [],
                clinical_areas: postToEdit.post_metadata?.clinical_areas || [],
                content_type: postToEdit.post_metadata?.content_type || '',
                tags: postToEdit.post_metadata?.tags || [],
                audience_level: postToEdit.post_metadata?.audience_level || '',
                related_conditions: postToEdit.post_metadata?.related_conditions || [],
                language: postToEdit.post_metadata?.language || 'English',
                attachments: postToEdit.post_metadata?.attachments || [],
                co_authors: postToEdit.post_metadata?.co_authors || [],
                is_public: postToEdit.post_metadata?.is_public ?? true,
                visibility: (postToEdit.post_metadata?.visibility || 'public') as 'public' | 'connections' | 'only_me'
              }
            })
          }
          break
          
        case 'toggle_comments':
          await togglePostSettings(postId, 'comments_disabled')
          break
          
        case 'toggle_mute':
          await togglePostSettings(postId, 'muted')
          break
          
        case 'delete':
          if (confirm('Are you sure you want to delete this post?')) {
            await deletePost(postId)
          }
          break
          
        case 'follow':
          if (followingPosts.includes(postId)) {
            await unfollowPost(postId)
          } else {
            await followPost(postId)
          }
          break
          
        default:
          console.log('Unknown action:', action)
      }
    } catch (err) {
      console.error('Error handling menu action:', err)
    } finally {
      setActiveMenuPost(null)
    }
  }

  // Render post metadata badges
  const renderPostMetadata = (post: CommunityPost) => {
    const metadata = post.post_metadata || {}
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {metadata.content_type && (
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
            {metadata.content_type}
          </span>
        )}
        {metadata.audience_level && (
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
            {metadata.audience_level}
          </span>
        )}
        {metadata.language && metadata.language !== 'English' && (
          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
            {metadata.language}
          </span>
        )}
        {(metadata.professions || []).slice(0, 2).map(profession => (
          <span key={profession} className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
            {profession}
          </span>
        ))}
        {(metadata.clinical_areas || []).slice(0, 2).map(area => (
          <span key={area} className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
            {area}
          </span>
        ))}
        {(metadata.tags || []).slice(0, 3).map(tag => (
          <span key={tag} className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">
            #{tag}
          </span>
        ))}
        {(metadata.professions || []).length > 2 && (
          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
            +{(metadata.professions || []).length - 2} more
          </span>
        )}
      </div>
    )
  }

  const getUserDisplayName = (user: any): string => {
    if (!user) return 'Unknown User';
    return user.full_name || 'Unknown User';
  };

  const getUserProfession = (user: any): string => {
    if (!user) return '';
    return user.profession || '';
  };

  const calculateProfileCompleteness = (profile: Profile | null | undefined): number => {
    if (!profile) return 0;

    let score = 0;
    const weights = {
      full_name: 10,
      profession: 15,
      city: 10,
      about_me: 15,
      specialties: 10,
      languages: 10,
      work_experience: 15, // at least 1
      qualifications: 10, // at least 1
      contact_email: 5,
      avatar_url: 10
    };

    if (profile.full_name?.length > 0) score += weights.full_name;
    if (profile.profession?.length > 0) score += weights.profession;
    if (profile.city?.length > 0) score += weights.city;
    if (profile.about_me && profile.about_me.length > 50) score += weights.about_me;
    if (profile.specialties && profile.specialties.length > 0) score += weights.specialties;
    if (profile.languages && profile.languages.length > 0) score += weights.languages;
    if (profile.work_experience && profile.work_experience.length > 0) score += weights.work_experience;
    if (profile.qualifications && profile.qualifications.length > 0) score += weights.qualifications;
    if (profile.contact_email && profile.contact_email.length > 0) score += weights.contact_email;
    if (profile.avatar_url && profile.avatar_url.length > 0) score += weights.avatar_url;

    return Math.min(score, 100);
  };

  const getUserId = (user: any): string => {
    if (!user) return '';
    return user.id || '';
  };

  // Yorum sahibi kontrolü
  const isCommentOwner = (comment: any) => {
    return comment.user_id === user?.id;
  };

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto pb-20 md:pb-6">
<div className="max-w-7xl mx-auto p-4 md:p-6">
  {/* LinkedIn-style 3-column layout */}
  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
    
    {/* Left Sidebar - Profile Snapshot */}
    <div className="md:col-span-3 hidden lg:block">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden sticky top-6">
        {/* Profile Header with gradient */}
        <div className="h-16 bg-gradient-to-r from-blue-500 to-blue-600"></div>
        <div className="px-4 pb-4 -mt-8">
          <div className="flex flex-col items-center">
            {/* Avatar */}
            <Avatar src={userProfile?.avatar_url} name={userProfile?.full_name || user?.email || 'User'} className="w-16 h-16 border-4 border-white shadow-md" useInlineSize={false} />
            <h3 className="mt-2 text-lg font-semibold text-gray-900 text-center">
              {userProfile?.full_name || 'Your Name'}
            </h3>
            <p className="text-sm text-gray-600 text-center">
              {userProfile?.profession || 'Professional'}
            </p>
            <p className="text-xs text-gray-500 mt-1 text-center">
              {userProfile?.city && userProfile?.county 
                ? `${userProfile.city}, ${userProfile.county}`
                : 'Location not set'}
            </p>
          </div>
          
          {/* Profile Completeness Indicator */}
          {userProfile && (() => {
            const completeness = calculateProfileCompleteness(userProfile);
            
            const checklistItems = [
              { id: 'full_name', label: 'Full Name', completed: !!userProfile?.full_name?.length, section: 'basic' },
              { id: 'profession', label: 'Profession', completed: !!userProfile?.profession?.length, section: 'basic' },
              { id: 'city', label: 'Location', completed: !!userProfile?.city?.length, section: 'basic' },
              { id: 'about_me', label: 'About Me (50+ chars)', completed: !!(userProfile?.about_me && userProfile.about_me.length > 50), section: 'about' },
              { id: 'specialties', label: 'Specialties', completed: !!(userProfile?.specialties && userProfile.specialties.length > 0), section: 'specialties' },
              { id: 'languages', label: 'Languages', completed: !!(userProfile?.languages && userProfile.languages.length > 0), section: 'languages' },
              { id: 'work_experience', label: 'Work Experience', completed: !!(userProfile?.work_experience && userProfile.work_experience.length > 0), section: 'experience' },
              { id: 'qualifications', label: 'Qualifications', completed: !!(userProfile?.qualifications && userProfile.qualifications.length > 0), section: 'qualifications' },
              { id: 'contact_email', label: 'Contact Email', completed: !!userProfile?.contact_email?.length, section: 'contact' },
              { id: 'avatar_url', label: 'Profile Picture', completed: !!userProfile?.avatar_url?.length, section: 'settings' }
            ];

            const scrollToSection = (sectionId: string) => {
              window.dispatchEvent(new Event('openAuthModal'));
              setTimeout(() => {
                if (sectionId === 'settings') {
                  const settingsBtn = document.querySelector('[data-settings-trigger]');
                  if (settingsBtn) (settingsBtn as HTMLElement).click();
                } else {
                  const section = document.querySelector(`[data-section="${sectionId}"]`);
                  if (section) {
                    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }
              }, 300);
            };

            return (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Profile {completeness}% complete
                  </span>
                  <button 
                    onClick={() => setShowCompletenessChecklist(!showCompletenessChecklist)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${showCompletenessChecklist ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                
                {/* Progress bar */}
                <div className="bg-gray-200 rounded-full h-2 mb-3">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      completeness < 50 ? 'bg-red-500' :
                      completeness < 80 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${completeness}%` }}
                  />
                </div>
                
                {/* Checklist */}
                {showCompletenessChecklist && (
                  <div className="mt-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
                    {checklistItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() => scrollToSection(item.section)}
                        className="flex items-center gap-2 text-xs text-left hover:text-blue-600 transition-colors w-full"
                      >
                        {item.completed ? (
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                        <span className={item.completed ? 'text-gray-500 line-through' : 'text-gray-700'}>
                          {item.label}
                        </span>
                      </button>
                    ))}
                    {completeness < 100 && (
                      <p className="text-xs text-gray-500 mt-2 italic">
                        Complete your profile to get more visibility
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
          
          {/* Stats */}
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Connections</span>
              <span className="font-semibold text-gray-900">{connections.length}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Profile Views</span>
              <span className="font-semibold text-gray-900">{userProfile?.profile_views || 0}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Saved Posts</span>
              <span className="font-semibold text-gray-900">{bookmarkedPosts.length}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 space-y-2">
            <button onClick={() => window.dispatchEvent(new Event('openAuthModal'))} className="w-full px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              View My Profile
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Middle Column - Feed */}
    <div className="md:col-span-6 w-full">
      {/* Header with actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Feed</h2>
            
            {/* Real-time status */}
            <div className="ml-2 hidden md:flex items-center">
              <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                realtimeStatus === 'connected' ? 'bg-green-500' : 
                realtimeStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <span className="text-xs text-gray-500">
                {realtimeStatus === 'connected' ? 'Live' : 
                realtimeStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => {
                loadPosts(0, true);
                loadFollowingPosts();
              }}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
              title="Refresh posts"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="relative p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
              title="Filters"
            >
              <Filter className="w-4 h-4" />
              {(() => {
                const count = Object.values(feedFilters).reduce((acc, value) => {
                  if (Array.isArray(value)) {
                    return acc + value.length;
                  } else if (typeof value === 'boolean' && value) {
                    return acc + 1;
                  }
                  return acc;
                }, 0);
                return count > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                    {count}
                </span>
                ) : null
              })()}
            </button>
          </div>
        </div>

        {/* New Post Input */}
        <button 
          onClick={() => {
            haptic.light();
            setShowNewPostModal(true);
          }}
          className="w-full flex items-center gap-3 px-3 py-2 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors text-left"
        >
          <Avatar src={userProfile?.avatar_url} name={userProfile?.full_name} className="w-8 h-8" useInlineSize={false} />
          <span className="text-sm text-gray-500 flex-1">Share an update, question or insight...</span>
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filter Posts</h3>
            <button 
              onClick={clearAllFilters}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear all
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Profession Filter */}
            <div className="relative" ref={filterDropdownRefs.professions}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profession
              </label>
              <button
                onClick={() => setFilterDropdowns(prev => ({ ...prev, professions: !prev.professions }))}
                className="w-full px-3 py-2 text-left border border-gray-300 rounded-lg bg-white flex justify-between items-center"
              >
                <span className="text-sm text-gray-700">
                  {feedFilters.professions.length > 0 
                    ? `${feedFilters.professions.length} selected` 
                    : 'All professions'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {filterDropdowns.professions && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {PROFESSION_OPTIONS.map(profession => (
                    <label key={profession} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={feedFilters.professions.includes(profession)}
                        onChange={() => toggleFilter('professions', profession)}
                        className="mr-2 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{profession}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Clinical Areas Filter */}
            <div className="relative" ref={filterDropdownRefs.clinical_areas}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clinical Areas
              </label>
              <button
                onClick={() => setFilterDropdowns(prev => ({ ...prev, clinical_areas: !prev.clinical_areas }))}
                className="w-full px-3 py-2 text-left border border-gray-300 rounded-lg bg-white flex justify-between items-center"
              >
                <span className="text-sm text-gray-700">
                  {feedFilters.clinical_areas.length > 0 
                    ? `${feedFilters.clinical_areas.length} selected` 
                    : 'All areas'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {filterDropdowns.clinical_areas && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {CLINICAL_AREA_OPTIONS.map(area => (
                    <label key={area} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={feedFilters.clinical_areas.includes(area)}
                        onChange={() => toggleFilter('clinical_areas', area)}
                        className="mr-2 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{area}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Content Type Filter */}
            <div className="relative" ref={filterDropdownRefs.content_types}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Type
              </label>
              <button
                onClick={() => setFilterDropdowns(prev => ({ ...prev, content_types: !prev.content_types }))}
                className="w-full px-3 py-2 text-left border border-gray-300 rounded-lg bg-white flex justify-between items-center"
              >
                <span className="text-sm text-gray-700">
                  {feedFilters.content_types.length > 0 
                    ? `${feedFilters.content_types.length} selected` 
                    : 'All types'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {filterDropdowns.content_types && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {CONTENT_TYPE_OPTIONS.map(type => (
                    <label key={type} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={feedFilters.content_types.includes(type)}
                        onChange={() => toggleFilter('content_types', type)}
                        className="mr-2 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{type}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Audience Level Filter */}
            <div className="relative" ref={filterDropdownRefs.audience_levels}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Audience Level
              </label>
              <button
                onClick={() => setFilterDropdowns(prev => ({ ...prev, audience_levels: !prev.audience_levels }))}
                className="w-full px-3 py-2 text-left border border-gray-300 rounded-lg bg-white flex justify-between items-center"
              >
                <span className="text-sm text-gray-700">
                  {feedFilters.audience_levels.length > 0 
                    ? `${feedFilters.audience_levels.length} selected` 
                    : 'All levels'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {filterDropdowns.audience_levels && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {AUDIENCE_LEVEL_OPTIONS.map(level => (
                    <label key={level} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={feedFilters.audience_levels.includes(level)}
                        onChange={() => toggleFilter('audience_levels', level)}
                        className="mr-2 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{level}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Language Filter */}
            <div className="relative" ref={filterDropdownRefs.languages}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <button
                onClick={() => setFilterDropdowns(prev => ({ ...prev, languages: !prev.languages }))}
                className="w-full px-3 py-2 text-left border border-gray-300 rounded-lg bg-white flex justify-between items-center"
              >
                <span className="text-sm text-gray-700">
                  {feedFilters.languages.length > 0 
                    ? `${feedFilters.languages.length} selected` 
                    : 'All languages'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {filterDropdowns.languages && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {LANGUAGE_OPTIONS.map(language => (
                    <label key={language} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={feedFilters.languages.includes(language)}
                        onChange={() => toggleFilter('languages', language)}
                        className="mr-2 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{language}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Toggle Filters */}
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={feedFilters.show_only_my_profession}
                  onChange={(e) => setFeedFilters(prev => ({ 
                    ...prev, 
                    show_only_my_profession: e.target.checked 
                  }))}
                  className="mr-2 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Show only my profession</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={feedFilters.show_only_my_network}
                  onChange={(e) => setFeedFilters(prev => ({ 
                    ...prev, 
                    show_only_my_network: e.target.checked 
                  }))}
                  className="mr-2 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Show only my network</span>
              </label>
            </div>
          </div>

          {/* Active Filters */}
          {Object.values(feedFilters).flat().length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Active Filters:</h4>
              <div className="flex flex-wrap gap-2">
                {feedFilters.professions.map(profession => (
                  <span key={profession} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs flex items-center">
                    {profession}
                    <X 
                      className="w-3 h-3 ml-1 cursor-pointer" 
                      onClick={() => toggleFilter('professions', profession)}
                    />
                  </span>
                ))}
                {feedFilters.clinical_areas.map(area => (
                  <span key={area} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs flex items-center">
                    {area}
                    <X 
                      className="w-3 h-3 ml-1 cursor-pointer" 
                      onClick={() => toggleFilter('clinical_areas', area)}
                    />
                  </span>
                ))}
                {feedFilters.content_types.map(type => (
                  <span key={type} className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs flex items-center">
                    {type}
                    <X 
                      className="w-3 h-3 ml-1 cursor-pointer" 
                      onClick={() => toggleFilter('content_types', type)}
                    />
                  </span>
                ))}
                {feedFilters.audience_levels.map(level => (
                  <span key={level} className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs flex items-center">
                    {level}
                    <X 
                      className="w-3 h-3 ml-1 cursor-pointer" 
                      onClick={() => toggleFilter('audience_levels', level)}
                    />
                  </span>
                ))}
                {feedFilters.languages.map(language => (
                  <span key={language} className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs flex items-center">
                    {language}
                    <X 
                      className="w-3 h-3 ml-1 cursor-pointer" 
                      onClick={() => toggleFilter('languages', language)}
                    />
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Posts Feed */}
      <div className="relative" ref={containerRef}>
        {/* Pull-to-refresh indicator */}
        {pullDistance > 0 && (
          <div
            className="absolute top-0 left-0 right-0 flex justify-center items-center z-10 transition-opacity"
            style={{
              transform: `translateY(${-Math.max(0, 60 - pullDistance)}px)`,
              opacity: Math.min(1, pullDistance / 100)
            }}
          >
            {isRefreshing ? (
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
            ) : (
              <ChevronDown className={`w-6 h-6 text-blue-600 transition-transform ${isPulling ? 'rotate-180' : ''}`} />
            )}
          </div>
        )}

        <div className="space-y-4" style={{ transform: pullDistance > 0 ? `translateY(${Math.min(pullDistance, 60)}px)` : 'translateY(0)' }}>
          {/* Feed tabs */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveFeedTab('all')}
              className={`px-3 py-1.5 text-sm rounded-full border ${activeFeedTab === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              All
            </button>
            <button
              onClick={() => setActiveFeedTab('saved')}
              className={`px-3 py-1.5 text-sm rounded-full border ${activeFeedTab === 'saved' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              Saved
            </button>
          </div>
          {activeFeedTab === 'saved' && bookmarkedPosts.length > 0 && (
            <button
              onClick={async () => {
                const savedPostIds = bookmarkedPosts;
                const savedPostsData = posts.filter(p => savedPostIds.includes(p.id));
                const exportData = {
                  exportedAt: new Date().toISOString(),
                  count: savedPostsData.length,
                  posts: savedPostsData.map(p => ({
                    id: p.id,
                    title: p.title,
                    content: p.content.substring(0, 200),
                    author: getUserDisplayName(p.user),
                    createdAt: p.created_at,
                    url: `${window.location.origin}?post=${p.id}`
                  }))
                };
                const jsonStr = JSON.stringify(exportData, null, 2);
                try {
                  await navigator.clipboard.writeText(jsonStr);
                  toast.success('Saved posts exported to clipboard!');
                } catch (e) {
                  const blob = new Blob([jsonStr], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `saved-posts-${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success('Saved posts exported!');
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              title="Export saved posts"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          )}
        </div>

        {(activeFeedTab === 'saved' && posts.filter(p => bookmarkedPosts.includes(p.id)).length === 0) && (
          <EmptyState
            icon={<Bookmark className="w-16 h-16 text-gray-300" />}
            title="No saved posts"
            description="Save posts you want to read later by clicking the bookmark icon"
          />
        )}

        <div className="space-y-4">
          {loading && posts.length === 0 ? (
            <>
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </>
          ) : (
            (activeFeedTab === 'all' ? posts : posts.filter(p => bookmarkedPosts.includes(p.id))).map(post => (
          <div 
            key={post.id} 
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            {/* Post Header with Menu */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); viewUserProfile(post.user_id || getUserId(post.user)); }}
                    className="flex-shrink-0 hover:opacity-80 transition-opacity cursor-pointer"
                  >
                    <Avatar src={post.user?.avatar_url} name={getUserDisplayName(post.user)} className="w-8 h-8" useInlineSize={false} />
                  </button>
                  <div>
                    <button
                      onClick={(e) => { e.stopPropagation(); viewUserProfile(post.user_id || getUserId(post.user)); }}
                      className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer text-left"
                    >
                      {getUserDisplayName(post.user)}
                    </button>
                    <p className="text-xs text-gray-500">
                      {getUserProfession(post.user)} • {formatTime(post.created_at)}
                      {post.updated_at && post.updated_at !== post.created_at && (
                        <span className="text-gray-400"> (edited)</span>
                      )}
                    </p>
                  </div>
                </div>
                
                {/* Post Metadata */}
                {renderPostMetadata(post)}
                
                {/* Post Settings Indicators */}
                <div className="flex flex-wrap gap-2 text-[10px] text-gray-500 mb-2">
                  {postSettings[post.id]?.comments_disabled && (
                    <span className="flex items-center gap-0.5 bg-red-50 text-red-700 px-1.5 py-0.5 rounded-full">
                      <MessageSquare className="w-2.5 h-2.5" />
                      Comments disabled
                    </span>
                  )}
                  {postSettings[post.id]?.muted && (
                    <span className="flex items-center gap-0.5 bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded-full">
                      <Bell className="w-2.5 h-2.5" />
                      Notifications muted
                    </span>
                  )}
                  {followingPosts.includes(post.id) && (
                    <span className="flex items-center gap-0.5 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">
                      <Bell className="w-2.5 h-2.5" />
                      Following
                    </span>
                  )}
                </div>
              </div>

              {/* Menu Button and Dropdown */}
              <div 
                className="relative" 
                ref={el => {
                  menuRefs.current[post.id] = el;
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setActiveMenuPost(activeMenuPost === post.id ? null : post.id);
                  }}
                  className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {activeMenuPost === post.id && (
                  <div className="absolute right-0 top-10 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-2">
                    {isPostOwner(post) ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleMenuAction('edit', post.id, e);
                          }}
                          className="flex items-center justify-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          title="Edit Post"
                        >
                          <Edit2 className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleMenuAction('toggle_comments', post.id, e);
                          }}
                          className="flex items-center justify-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          title={postSettings[post.id]?.comments_disabled ? 'Enable Comments' : 'Disable Comments'}
                        >
                          <MessageSquare className="w-4 h-4 text-green-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleMenuAction('toggle_mute', post.id, e);
                          }}
                          className="flex items-center justify-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          title={postSettings[post.id]?.muted ? 'Enable Notifications' : 'Mute Notifications'}
                        >
                          <Bell className="w-4 h-4 text-orange-600" />
                        </button>
                        <div className="border-t border-gray-100 my-1"></div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleMenuAction('delete', post.id, e);
                          }}
                          className="flex items-center justify-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete Post"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleMenuAction('follow', post.id, e);
                        }}
                        className="flex items-center justify-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        title={followingPosts.includes(post.id) ? 'Unfollow Post' : 'Follow Post'}
                      >
                        <Bell className="w-4 h-4 text-purple-600" />
                      </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const postUrl = `${window.location.origin}?post=${post.id}`;
                            try {
                              await navigator.clipboard.writeText(postUrl);
                              toast.success('Post link copied to clipboard!');
                            } catch (err) {
                              toast.error('Failed to copy link');
                            }
                          }}
                          className="flex items-center justify-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          title="Share Post"
                        >
                          <Download className="w-4 h-4 text-blue-600" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Post Content with See More/Less */}
            <div className="group relative text-gray-700 mb-3 text-sm leading-relaxed">
              {(() => {
                const textContent = post.content.replace(/<[^>]*>/g, '')
                const contentLength = textContent.length
                return (
                  <>
                    {contentLength > 300 && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleExpandPost(post.id); }}
                          className={`sticky top-2 right-2 z-10 opacity-0 group-hover:opacity-100 bg-white shadow-md rounded-md px-3 py-1 text-sm text-blue-600 hover:bg-gray-50 transition-all duration-200 ${expandedPosts[post.id] ? 'block' : 'hidden'}`}
                        >
                          See less
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleExpandPost(post.id); }}
                          className={`absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 bg-white shadow-md rounded-md px-3 py-1 text-sm text-blue-600 hover:bg-gray-50 transition-all duration-200 ${expandedPosts[post.id] ? 'hidden' : 'block'}`}
                        >
                          See more
                        </button>
                      </>
                    )}

                    <div 
                      className={`
                        ${expandedPosts[post.id] || contentLength <= 300 ? '' : 'max-h-[200px] overflow-hidden'}
                        rich-text-content
                      `}
                      dangerouslySetInnerHTML={{ __html: post.content }}
                    />

                    {!expandedPosts[post.id] && contentLength > 300 && (
                      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                    )}
                  </>
                )
              })()}
            </div>

            {/* Quoted Post */}
            {post.post_metadata?.quoted_post_data && (
              <button
                onClick={async (e) => {
                  e.stopPropagation()
                  const quotedPostId = post.post_metadata?.quoted_post_data?.id
                  if (!quotedPostId) return

                  // Find post in current posts
                  let targetPost = posts.find(p => p.id === quotedPostId)
                  
                  // If not found, load it
                  if (!targetPost) {
                    const { data } = await supabase
                      .from('posts')
                      .select(`
                        *,
                        user:profiles!user_id (id, full_name, profession, avatar_url, specialties, languages)
                      `)
                      .eq('id', quotedPostId)
                      .single()
                    
                    if (data) {
                      targetPost = data
                      setPosts(prev => [...prev, data])
                    }
                  }

                  if (targetPost) {
                    setSelectedPost(targetPost)
                    // Load comments if needed
                    if (!comments[quotedPostId]) {
                      await loadComments(quotedPostId)
                    }
                  }
                }}
                className="w-full text-left border-l-4 border-blue-500 bg-gray-50 rounded-lg p-3 mb-3 mt-3 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Avatar 
                    src={post.post_metadata.quoted_post_data.user?.avatar_url} 
                    name={post.post_metadata.quoted_post_data.user?.full_name || 'Unknown'} 
                    className="w-6 h-6" 
                    useInlineSize={false} 
                  />
                  <div>
                    <p className="text-xs font-semibold text-gray-900">
                      {post.post_metadata.quoted_post_data.user?.full_name || 'Unknown User'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {post.post_metadata.quoted_post_data.user?.profession || ''}
                    </p>
                  </div>
                </div>
                <div 
                  className="text-sm text-gray-700 line-clamp-4 rich-text-content pointer-events-none"
                  dangerouslySetInnerHTML={{ __html: post.post_metadata.quoted_post_data.content }}
                />
              </button>
            )}

            {/* Attachments */}
            {post.post_metadata?.attachments && post.post_metadata.attachments.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {post.post_metadata.attachments.map((attachment: string, idx: number) => {
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment)
                    return isImage ? (
                      <img
                        key={idx}
                        src={attachment}
                        alt={`Attachment ${idx + 1}`}
                        className="max-w-full max-h-64 rounded-lg object-cover cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(attachment, '_blank')
                        }}
                      />
                    ) : (
                      <a
                        key={idx}
                        href={attachment}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Attachment {idx + 1}</span>
                      </a>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Reaction Summary */}
            {(postReactions[post.id]?.length > 0 || postLikes[post.id]) && (
              <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                {postReactions[post.id]?.map((reaction, idx) => (
                  <span key={idx} className="flex items-center gap-0.5">
                    <span className="text-base">{reaction.emoji}</span>
                    <span>{reaction.count}</span>
                  </span>
                ))}
                {(postLikes[post.id] || 0) > 0 && (
                  <span className="flex items-center gap-0.5">
                    <ThumbsUp className="w-3.5 h-3.5 text-blue-600" />
                    {postLikes[post.id]}
                  </span>
                )}
              </div>
            )}

            {/* Action Bar */}
            <div className="border-t border-gray-100 pt-2 mt-2">
              <div className="flex items-center justify-start gap-6">
                {/* Like Button with Long Press */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      haptic.like();
                      handleLikePost(post.id, e);
                    }}
                    onMouseDown={(e) => handleLongPressStart(post.id, e)}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                    onTouchStart={(e) => handleLongPressStart(post.id, e)}
                    onTouchEnd={handleLongPressEnd}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
                      userPostReactions[post.id] === 'like' 
                        ? 'text-blue-600 bg-blue-50' 
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                    title="Like"
                  >
                    <ThumbsUp className="w-5 h-5" />
                    {postLikes[post.id] > 0 && (
                      <span className="text-xs font-medium">{postLikes[post.id]}</span>
                    )}
                  </button>

                  {/* Emoji Picker Overlay */}
                  {showEmojiPicker === post.id && (
                    <div className="absolute bottom-full left-0 mb-2 bg-white rounded-full shadow-xl border border-gray-200 px-3 py-2 flex gap-2 z-50">
                      {EMOJI_REACTIONS.map((reaction) => (
                        <button
                          key={reaction.emoji}
                          onClick={(e) => {
                            haptic.like();
                            handleEmojiReaction(post.id, reaction.emoji, e);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="text-2xl hover:scale-125 transition-transform p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                          title={reaction.label}
                        >
                          {reaction.emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Comments Button */}
                <button
                  onClick={(e) => {
                    haptic.select();
                    toggleComments(post.id, e);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
                    openComments[post.id] 
                      ? 'text-green-600 bg-green-50' 
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                  title="Comments"
                >
                  <MessageSquare className="w-5 h-5" />
                  {(() => {
                    // If comments are loaded, use actual count
                    const postComments = comments[post.id];
                    let commentCount = 0;
                    if (postComments !== undefined) {
                      // Count all top-level comments (not replies)
                      const topLevelCount = postComments.filter(c => !c.parent_reply_id).length;
                      // Count all replies recursively
                      const countReplies = (commentList: Comment[]): number => {
                        let count = 0;
                        commentList.forEach(comment => {
                          if (comment.replies && comment.replies.length > 0) {
                            count += comment.replies.length;
                            count += countReplies(comment.replies);
                          }
                        });
                        return count;
                      };
                      const repliesCount = countReplies(postComments);
                      commentCount = topLevelCount + repliesCount;
                    } else {
                      commentCount = post.replies_count || 0;
                    }
                    return commentCount > 0 ? (
                      <span className="text-xs font-medium">{commentCount}</span>
                    ) : null;
                  })()}
                </button>

                {/* Repost Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRepost(post.id);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
                    repostedPosts.includes(post.id) 
                      ? 'text-green-600 bg-green-50 hover:bg-green-100' 
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                  title="Repost"
                >
                  <Repeat2 className={`w-5 h-5 ${repostedPosts.includes(post.id) ? 'fill-current' : ''}`} />
                  {repostCounts[post.id] > 0 && (
                    <span className="text-xs font-medium">{repostCounts[post.id]}</span>
                  )}
                </button>

                {/* Quote Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuote(post);
                  }}
                  className="px-3 py-1.5 rounded-full transition-colors text-gray-500 hover:bg-gray-100"
                  title="Quote"
                >
                  <Quote className="w-5 h-5" />
                </button>

                {/* Bookmark Button */}
                <button
                  onClick={() => handleBookmarkPost(post.id)}
                  className={`px-3 py-1.5 rounded-full transition-colors ${
                    bookmarkedPosts.includes(post.id) 
                      ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' 
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                  title={bookmarkedPosts.includes(post.id) ? 'Saved' : 'Save post'}
                  aria-label={bookmarkedPosts.includes(post.id) ? 'Unsave post' : 'Save post'}
                >
                  <Bookmark className={`w-5 h-5 ${bookmarkedPosts.includes(post.id) ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>

            {/* Inline Comments Section */}
            {openComments[post.id] && (
              <div className="mt-3 border-t border-gray-100 pt-3">
                {/* Add Comment */}
                {!postSettings[post.id]?.comments_disabled && (
                  <div className="mb-4">
                    <div className="flex gap-2">
                      <Avatar src={userProfile?.avatar_url} name={userProfile?.full_name} className="w-6 h-6 flex-shrink-0" useInlineSize={false} />
                      <div className="flex-1 flex items-center gap-2 px-2.5 py-1.5 border border-gray-200 rounded-full focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                        <textarea
                          value={newComments[post.id] || ''}
                          onChange={(e) => {
                            setNewComments(prev => ({ ...prev, [post.id]: e.target.value }));
                            // Auto-resize textarea
                            e.target.style.height = 'auto';
                            e.target.style.height = `${Math.min(e.target.scrollHeight, 80)}px`;
                          }}
                          placeholder="Write a comment..."
                          className="flex-1 resize-none border-none outline-none text-sm py-0.5"
                          rows={1}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              addComment(post.id)
                            }
                            // Shift+Enter allows new line (default behavior)
                          }}
                          style={{ maxHeight: '80px', minHeight: '20px', height: '20px' }}
                        />
                        <button
                          onClick={() => addComment(post.id)}
                          disabled={!newComments[post.id]?.trim()}
                          className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                          title="Post comment"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Comments List */}
                {comments[post.id] && comments[post.id].length > 0 && (
                  <div className="space-y-4">
                    {comments[post.id].map(comment => (
                      <div key={comment.id} data-comment-id={comment.id} className="flex gap-3 items-start">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            viewUserProfile(comment.user_id || getUserId(comment.user));
                          }}
                          className="flex-shrink-0 self-start hover:opacity-80 transition-opacity cursor-pointer"
                        >
                          {comment.user?.avatar_url ? (
                            <img
                              src={comment.user.avatar_url}
                              alt={comment.user?.full_name || 'User'}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {comment.user?.full_name?.charAt(0) || 'U'}
                        </div>
                          )}
                        </button>
                        <div className="flex-1">
                          <div className="bg-gray-50 rounded-lg px-3 py-2">
                            <div className="flex items-start justify-between">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  viewUserProfile(comment.user_id || getUserId(comment.user));
                                }}
                                className="font-semibold text-sm text-gray-900 hover:text-blue-600 transition-colors text-left"
                              >
                                {comment.user?.full_name || 'User'}
                              </button>
                              {isCommentOwner(comment) && (
                                <div className="relative">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveCommentMenu(activeCommentMenu === comment.id ? null : comment.id);
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>
                                  {activeCommentMenu === comment.id && (
                                    <div className="absolute right-0 top-6 w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-10 py-1">
                                      <button
                                        onClick={(e) => handleCommentMenuAction('edit', comment.id, e)}
                                        className="flex items-center w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                                      >
                                        <Edit2 className="w-3 h-3 mr-2 text-blue-600" />
                                        Edit
                                      </button>
                                      <button
                                        onClick={(e) => handleCommentMenuAction('delete', comment.id, e)}
                                        className="flex items-center w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                                      >
                                        <Trash2 className="w-3 h-3 mr-2" />
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            {editingCommentId === comment.id ? (
                              <div className="mt-2 space-y-2">
                                <textarea
                                  value={editCommentContent}
                                  onChange={(e) => setEditCommentContent(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                  rows={3}
                                  autoFocus
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEditComment(comment.id, post.id)}
                                    disabled={!editCommentContent.trim()}
                                    className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                                    title="Save"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingCommentId(null);
                                      setEditCommentContent('');
                                    }}
                                    className="flex items-center justify-center w-8 h-8 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                    title="Cancel"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                            <p className="text-gray-700 text-sm mt-1">{comment.content}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>
                              {formatTime(comment.created_at)}
                              {comment.updated_at && comment.updated_at !== comment.created_at && (
                                <span className="ml-1 text-gray-400">(edited)</span>
                              )}
                            </span>
                            <button
                              onClick={() => setReplyingTo(prev => ({ ...prev, [comment.id]: !prev[comment.id] }))}
                              className="hover:text-blue-600 font-medium"
                            >
                              Reply
                            </button>
                          </div>

                          {/* Reply Input */}
                          {replyingTo[comment.id] && (
                            <div className="mt-2 ml-4">
                              <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                                <textarea
                                  value={replyContents[comment.id] || ''}
                                  onChange={(e) => {
                                    setReplyContents(prev => ({ ...prev, [comment.id]: e.target.value }));
                                    // Auto-resize textarea
                                    e.target.style.height = 'auto';
                                    e.target.style.height = `${Math.min(e.target.scrollHeight, 80)}px`;
                                  }}
                                  placeholder="Write a reply..."
                                  className="flex-1 resize-none border-none outline-none text-sm py-1"
                                  rows={1}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault()
                                      addComment(post.id, comment.id)
                                    }
                                  }}
                                  style={{ maxHeight: '80px', minHeight: '24px', height: '24px' }}
                                />
                                <button
                                  onClick={() => addComment(post.id, comment.id)}
                                  disabled={!replyContents[comment.id]?.trim()}
                                  className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                                  title="Send reply"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Collapsible Replies */}
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="mt-2 ml-4">
                              <button
                                onClick={() => setExpandedComments(prev => ({ ...prev, [comment.id]: !prev[comment.id] }))}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                              >
                                {expandedComments[comment.id] ? 'Hide' : 'View'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                              </button>
                              {expandedComments[comment.id] && (
                                <div className="mt-3 space-y-3 border-l-2 border-gray-200 pl-3">
                                  {comment.replies.map(reply => (
                                    <div key={reply.id} data-comment-id={reply.id} className="flex gap-2 items-start">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          viewUserProfile(reply.user_id || getUserId(reply.user));
                                        }}
                                        className="flex-shrink-0 self-start hover:opacity-80 transition-opacity cursor-pointer"
                                      >
                                        {reply.user?.avatar_url ? (
                                          <img
                                            src={reply.user.avatar_url}
                                            alt={reply.user?.full_name || 'User'}
                                            className="w-6 h-6 rounded-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                                        {reply.user?.full_name?.charAt(0) || 'U'}
                                      </div>
                                        )}
                                      </button>
                                      <div className="flex-1">
                                        <div className="bg-gray-50 rounded-lg px-3 py-2">
                                          <div className="flex items-start justify-between">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                viewUserProfile(reply.user_id || getUserId(reply.user));
                                              }}
                                              className="font-semibold text-xs text-gray-900 hover:text-blue-600 transition-colors text-left"
                                            >
                                              {reply.user?.full_name || 'User'}
                                            </button>
                                            {isCommentOwner(reply) && (
                                              <div className="relative">
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveCommentMenu(activeCommentMenu === reply.id ? null : reply.id);
                                                  }}
                                                  className="text-gray-400 hover:text-gray-600"
                                                >
                                                  <MoreHorizontal className="w-3 h-3" />
                                                </button>
                                                {activeCommentMenu === reply.id && (
                                                  <div className="absolute right-0 top-4 w-36 bg-white border border-gray-200 rounded-lg shadow-xl z-10 py-1">
                                                    <button
                                                      onClick={(e) => handleCommentMenuAction('edit', reply.id, e)}
                                                      className="flex items-center w-full px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
                                                    >
                                                      <Edit2 className="w-3 h-3 mr-2 text-blue-600" />
                                                      Edit
                                                    </button>
                                                    <button
                                                      onClick={(e) => handleCommentMenuAction('delete', reply.id, e)}
                                                      className="flex items-center w-full px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                                                    >
                                                      <Trash2 className="w-3 h-3 mr-2" />
                                                      Delete
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                          {editingCommentId === reply.id ? (
                                            <div className="mt-2 space-y-2">
                                              <textarea
                                                value={editCommentContent}
                                                onChange={(e) => setEditCommentContent(e.target.value)}
                                                className="w-full px-2 py-1 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                                                rows={2}
                                                autoFocus
                                              />
                                              <div className="flex gap-2">
                                                <button
                                                  onClick={() => handleEditComment(reply.id, post.id)}
                                                  disabled={!editCommentContent.trim()}
                                                  className="flex items-center justify-center w-7 h-7 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
                                                  title="Save"
                                                >
                                                  <Check className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    setEditingCommentId(null);
                                                    setEditCommentContent('');
                                                  }}
                                                  className="flex items-center justify-center w-7 h-7 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                                  title="Cancel"
                                                >
                                                  <X className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            </div>
                                          ) : (
                                          <p className="text-gray-700 text-xs mt-1">{reply.content}</p>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                          <span>
                                            {formatTime(reply.created_at)}
                                            {reply.updated_at && reply.updated_at !== reply.created_at && (
                                              <span className="ml-1 text-gray-400">(edited)</span>
                                            )}
                                          </span>
                                          <button
                                            onClick={() => setReplyingTo(prev => ({ ...prev, [reply.id]: !prev[reply.id] }))}
                                            className="hover:text-blue-600 font-medium"
                                          >
                                            Reply
                                          </button>
                                        </div>

                                        {/* Reply to Reply Input */}
                                        {replyingTo[reply.id] && (
                                          <div className="mt-2">
                                            <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                                            <textarea
                                              value={replyContents[reply.id] || ''}
                                                onChange={(e) => {
                                                  setReplyContents(prev => ({ ...prev, [reply.id]: e.target.value }));
                                                  // Auto-resize textarea
                                                  e.target.style.height = 'auto';
                                                  e.target.style.height = `${Math.min(e.target.scrollHeight, 80)}px`;
                                                }}
                                              placeholder="Write a reply..."
                                                className="flex-1 resize-none border-none outline-none text-xs py-1"
                                                rows={1}
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault()
                                                    addComment(post.id, reply.id)
                                                  }
                                                }}
                                                style={{ maxHeight: '80px', minHeight: '24px', height: '24px' }}
                                              />
                                              <button
                                                onClick={() => addComment(post.id, reply.id)}
                                                disabled={!replyContents[reply.id]?.trim()}
                                                className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                                                title="Send reply"
                                              >
                                                <Send className="w-4 h-4" />
                                              </button>
                                            </div>
                                          </div>
                                        )}

                                        {/* Collapsible Nested Replies */}
                                        {reply.replies && reply.replies.length > 0 && (
                                          <div className="mt-2">
                                            <button
                                              onClick={() => setExpandedReplies(prev => ({ ...prev, [reply.id]: !prev[reply.id] }))}
                                              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                            >
                                              {expandedReplies[reply.id] ? 'Hide' : 'View'} {reply.replies.length} {reply.replies.length === 1 ? 'reply' : 'replies'}
                                            </button>
                                            {expandedReplies[reply.id] && (
                                              <div className="mt-3 space-y-3 border-l-2 border-gray-200 pl-3">
                                                {reply.replies.map(nestedReply => (
                                                  <div key={nestedReply.id} data-comment-id={nestedReply.id} className="flex gap-2 items-start">
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        viewUserProfile(nestedReply.user_id || getUserId(nestedReply.user));
                                                      }}
                                                      className="flex-shrink-0 self-start hover:opacity-80 transition-opacity cursor-pointer"
                                                    >
                                                      {nestedReply.user?.avatar_url ? (
                                                        <img
                                                          src={nestedReply.user.avatar_url}
                                                          alt={nestedReply.user?.full_name || 'User'}
                                                          className="w-6 h-6 rounded-full object-cover"
                                                        />
                                                      ) : (
                                                        <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                                                      {nestedReply.user?.full_name?.charAt(0) || 'U'}
                                                    </div>
                                                      )}
                                                    </button>
                                                    <div className="flex-1">
                                                      <div className="bg-gray-50 rounded-lg px-3 py-2">
                                                        <div className="flex items-start justify-between">
                                                          <button
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              viewUserProfile(nestedReply.user_id || getUserId(nestedReply.user));
                                                            }}
                                                            className="font-semibold text-xs text-gray-900 hover:text-blue-600 transition-colors text-left"
                                                          >
                                                            {nestedReply.user?.full_name || 'User'}
                                                          </button>
                                                          {isCommentOwner(nestedReply) && (
                                                            <div className="relative">
                                                              <button
                                                                onClick={(e) => {
                                                                  e.stopPropagation();
                                                                  setActiveCommentMenu(activeCommentMenu === nestedReply.id ? null : nestedReply.id);
                                                                }}
                                                                className="text-gray-400 hover:text-gray-600"
                                                              >
                                                                <MoreHorizontal className="w-3 h-3" />
                                                              </button>
                                                              {activeCommentMenu === nestedReply.id && (
                                                                <div className="absolute right-0 top-4 w-32 bg-white border border-gray-200 rounded-lg shadow-xl z-10 py-1">
                                                                  <button
                                                                    onClick={(e) => handleCommentMenuAction('edit', nestedReply.id, e)}
                                                                    className="flex items-center w-full px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                                                                  >
                                                                    <Edit2 className="w-3 h-3 mr-1 text-blue-600" />
                                                                    Edit
                                                                  </button>
                                                                  <button
                                                                    onClick={(e) => handleCommentMenuAction('delete', nestedReply.id, e)}
                                                                    className="flex items-center w-full px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                                                                  >
                                                                    <Trash2 className="w-3 h-3 mr-1" />
                                                                    Delete
                                                                  </button>
                                                                </div>
                                                              )}
                                                            </div>
                                                          )}
                                                        </div>
                                                        {editingCommentId === nestedReply.id ? (
                                                          <div className="mt-2 space-y-1">
                                                            <textarea
                                                              value={editCommentContent}
                                                              onChange={(e) => setEditCommentContent(e.target.value)}
                                                              className="w-full px-2 py-1 border border-gray-300 rounded resize-none focus:ring-2 focus:ring-blue-500 text-xs"
                                                              rows={2}
                                                              autoFocus
                                                            />
                                                            <div className="flex gap-1">
                                                              <button
                                                                onClick={() => handleEditComment(nestedReply.id, post.id)}
                                                                disabled={!editCommentContent.trim()}
                                                                className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
                                                                title="Save"
                                                              >
                                                                <Check className="w-3 h-3" />
                                                              </button>
                                                              <button
                                                                onClick={() => {
                                                                  setEditingCommentId(null);
                                                                  setEditCommentContent('');
                                                                }}
                                                                className="flex items-center justify-center w-6 h-6 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                                                title="Cancel"
                                                              >
                                                                <X className="w-3 h-3" />
                                                              </button>
                                                            </div>
                                                          </div>
                                                        ) : (
                                                        <p className="text-gray-700 text-xs mt-1">{nestedReply.content}</p>
                                                        )}
                                                      </div>
                                                      <span className="text-xs text-gray-500 ml-2">
                                                        {formatTime(nestedReply.created_at)}
                                                        {nestedReply.updated_at && nestedReply.updated_at !== nestedReply.created_at && (
                                                          <span className="ml-1 text-gray-400">(edited)</span>
                                                        )}
                                                      </span>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {comments[post.id] && comments[post.id].length === 0 && (
                  <p className="text-center text-gray-500 text-sm py-4">No comments yet. Be the first to comment!</p>
                )}
              </div>
            )}
          </div>
        ))
          )}
          
          {/* Infinite Scroll Trigger */}
          <div ref={loadMoreRef} className="py-8">
            {loadingMorePosts && (
              <>
                <PostSkeleton />
                <PostSkeleton />
              </>
            )}
            {!hasMorePosts && posts.length > 0 && (
              <p className="text-center text-gray-500 text-sm">
                No more posts to load
              </p>
            )}
          </div>
        </div>
        
        {/* Back to Top Button */}
        {showBackToTop && (
          <button
            onClick={() => {
              haptic.light();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center min-w-[44px] min-h-[44px]"
            aria-label="Back to top"
          >
            <ChevronDown className="w-6 h-6 rotate-180" />
          </button>
        )}

        {posts.length === 0 && !loading && (
          <EmptyState
            icon={<Users className="w-16 h-16 text-gray-300" />}
            title={Object.values(feedFilters).flat().length > 0 ? 'No posts match your filters' : 'Your feed is empty'}
            description={Object.values(feedFilters).flat().length > 0 
              ? 'Try adjusting your filters to see more posts' 
              : 'Start by connecting with other therapists or create your first post'}
            actions={Object.values(feedFilters).flat().length === 0 ? [
              { label: 'Create Post', onClick: () => setShowNewPostModal(true), primary: true },
              { label: 'Find Connections', onClick: () => onOpenConnections?.() || window.dispatchEvent(new CustomEvent('openConnections')) }
            ] : undefined}
          />
        )}
        </div>
      </div>
    </div>

    {/* Right Sidebar - Suggestions & Tips */}
    <div className="md:col-span-3 hidden md:block">
      <div className="sticky top-6 space-y-6">
        
        {/* Suggested Connections */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">People You May Know</h3>
          </div>
          <div className="p-4 space-y-4">
            {(() => {
              const connectedIds = new Set(
                (connections || []).map(c => (c.sender_id === user?.id ? c.receiver_id : c.sender_id))
              )
              const notConnected = suggestedConnections.filter(p => 
                !connectedIds.has(p.id) && 
                !allHiddenUserIds.includes(p.id)
              )
              return notConnected.length > 0 ? (
                notConnected.slice(0, 3).map(profile => (
                <div key={profile.id} className="flex items-start gap-3">
                    <button
                      onClick={() => viewUserProfile(profile.id)}
                      className="flex-shrink-0 hover:opacity-80 transition-opacity"
                      title="View profile"
                    >
                      <Avatar src={profile.avatar_url} name={profile.full_name} className="w-10 h-10" useInlineSize={false} />
                    </button>
                  <div className="flex-1 min-w-0">
                      <button
                        onClick={() => viewUserProfile(profile.id)}
                        className="font-medium text-sm text-gray-900 truncate text-left hover:text-blue-600 transition-colors"
                        title="View profile"
                      >
                      {profile.full_name}
                      </button>
                    <p className="text-xs text-gray-600 truncate">
                      {profile.profession}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {profile.city && profile.county ? `${profile.city}, ${profile.county}` : 'UK'}
                    </p>
                    <button
                      onClick={() => handleSuggestedConnect(profile.id)}
                      disabled={!!connectingIds[profile.id]}
                      className={`mt-2 px-3 py-1 text-xs font-medium rounded-full transition-colors ${connectingIds[profile.id] ? 'bg-gray-200 text-gray-500' : 'text-blue-600 bg-blue-50 hover:bg-blue-100'}`}
                    >
                      {connectingIds[profile.id] ? 'Sending…' : 'Connect'}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No suggestions available</p>
              )
            })()}
          </div>
        </div>

        {/* Professional Tip */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-sm border border-blue-200 p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Info className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 text-sm mb-1">Professional Tip</h4>
              <p className="text-xs text-gray-600">
                Keep your languages and specialties updated — clients and colleagues search by them!
              </p>
            </div>
          </div>
        </div>

        {/* Upcoming Activities */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <UpcomingEvents currentUserId={user?.id} userProfile={userProfile} />
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 text-sm">Network Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Total Members</span>
              <span className="font-semibold text-gray-900">{networkStats.totalMembers}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Active Today</span>
              <span className="font-semibold text-green-600">{networkStats.activeToday}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Posts This Week</span>
              <span className="font-semibold text-blue-600">{networkStats.postsThisWeek}</span>
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="text-xs text-gray-500 text-center space-y-1">
          <p>© 2025 UK Therapist Network</p>
          <div className="flex justify-center gap-3">
            <a href="#" className="hover:text-blue-600">About</a>
            <span>•</span>
            <a href="#" className="hover:text-blue-600">Privacy</a>
            <span>•</span>
            <a href="#" className="hover:text-blue-600">Contact</a>
          </div>
        </div>
      </div>
    </div>
  </div>
    
      {/* INSERT THE SNIPPET HERE */}
      {currentVisibleExpandedPost && (
        <div 
          className="fixed bottom-0 bg-white border-t border-gray-200 p-4 z-50"
          style={{
            position: 'fixed',
            bottom: 0,
            left: stickyButtonStyle.left,
            width: stickyButtonStyle.width,
          }}
        >
          <button 
            onClick={() => toggleExpandPost(currentVisibleExpandedPost)}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            See less
          </button>
        </div>
      )}
    </div>

    {/* LinkedIn-Style New Post Modal */}
    {showNewPostModal && (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowNewPostModal(false)
            setShowAdvancedOptions(false)
          }
        }}
      >
        <div 
          className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Header with User Info */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Avatar src={userProfile?.avatar_url} name={userProfile?.full_name} className="w-12 h-12" useInlineSize={false} />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{userProfile?.full_name || 'User'}</h3>
                  <div className="relative">
                    <button 
                      onClick={() => setShowVisibilityDropdown(!showVisibilityDropdown)}
                      className="text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1 mt-0.5"
                    >
                      <span>
                        {newPost.metadata.visibility === 'only_me' ? 'Only me' :
                         newPost.metadata.visibility === 'connections' ? 'Connections only' : 'Public'}
                      </span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${showVisibilityDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showVisibilityDropdown && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-[180px]">
                        <button
                          onClick={() => {
                            setNewPost({ ...newPost, metadata: { ...newPost.metadata, visibility: 'public', is_public: true } })
                            setShowVisibilityDropdown(false)
                          }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${
                            newPost.metadata.visibility === 'public' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                          }`}
                        >
                          Public
                        </button>
                        <button
                          onClick={() => {
                            setNewPost({ ...newPost, metadata: { ...newPost.metadata, visibility: 'connections', is_public: false } })
                            setShowVisibilityDropdown(false)
                          }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${
                            newPost.metadata.visibility === 'connections' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                          }`}
                        >
                          Connections only
                        </button>
                        <button
                          onClick={() => {
                            setNewPost({ ...newPost, metadata: { ...newPost.metadata, visibility: 'only_me', is_public: false } })
                            setShowVisibilityDropdown(false)
                          }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${
                            newPost.metadata.visibility === 'only_me' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                          }`}
                        >
                          Only me
                  </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowAdvancedOptions(false)
                  setShowNewPostModal(false)
                  setQuotePostData(null)
                  setNewPost(prev => ({
                    ...prev,
                    metadata: { ...prev.metadata, quoted_post_id: undefined }
                  }))
                }} 
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={loading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {/* Quote Post Preview */}
            {quotePostData && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar 
                      src={quotePostData.user?.avatar_url} 
                      name={getUserDisplayName(quotePostData.user)} 
                      className="w-6 h-6" 
                      useInlineSize={false} 
                    />
                    <div>
                      <p className="text-xs font-semibold text-gray-900">
                        {getUserDisplayName(quotePostData.user)}
                      </p>
                      <p className="text-xs text-gray-500">
                      {getUserProfession(quotePostData.user)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setQuotePostData(null)
                      setNewPost(prev => ({
                        ...prev,
                        metadata: { ...prev.metadata, quoted_post_id: undefined } as PostMetadata
                      }))
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {quotePostData.title && (
                  <p className="text-sm font-medium text-gray-900 mb-1">{quotePostData.title}</p>
                )}
                <p className="text-xs text-gray-600 line-clamp-3">
                  {quotePostData.content.replace(/<[^>]*>/g, '').slice(0, 150)}
                  {quotePostData.content.replace(/<[^>]*>/g, '').length > 150 ? '...' : ''}
                </p>
              </div>
            )}

            {/* Content Rich Text Editor */}
            <RichTextEditor
              value={newPost.content}
              onChange={(value) => setNewPost({ ...newPost, content: value })}
              placeholder={quotePostData ? "Add your thoughts..." : "What do you want to talk about?"}
              disabled={loading}
              attachments={newPost.metadata.attachments}
              onAttachmentsChange={(attachments) => {
                setNewPost({
                  ...newPost,
                  metadata: {
                    ...newPost.metadata,
                    attachments
                  }
                })
              }}
              onToast={(message, type) => {
                if (type === 'success') {
                  toast.success(message)
                } else {
                  toast.error(message)
                }
              }}
              onImageInsert={(_url) => {
                // Handle image insertion if needed
              }}
            />

            {/* Advanced Options Toggle */}
            <button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedOptions ? 'rotate-180' : ''}`} />
              {showAdvancedOptions ? 'Hide' : 'Show'} advanced options
            </button>

            {/* Advanced Options - Collapsible */}
            {showAdvancedOptions && (
            <div className="border-t border-gray-200 pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Profession */}
              <div className="relative" ref={dropdownRefs.professions}>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Relevant Professions *
                </label>
                <button
                  onClick={() => setDropdowns(prev => ({ ...prev, professions: !prev.professions }))}
                  className="w-full px-3 py-2 text-left border border-gray-300 rounded-lg bg-white flex justify-between items-center text-sm"
                >
                  <span className="text-sm text-gray-700">
                    {newPost.metadata.professions.length > 0 
                      ? `${newPost.metadata.professions.length} selected` 
                      : 'Select professions'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {dropdowns.professions && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {PROFESSION_OPTIONS.map((profession, index) => (
                      <label key={`${profession}-${index}`} className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newPost.metadata.professions.includes(profession)}
                          onChange={(e) => {
                            const updatedProfessions = e.target.checked
                              ? [...newPost.metadata.professions, profession]
                              : newPost.metadata.professions.filter(p => p !== profession)
                            setNewPost({
                              ...newPost,
                              metadata: { ...newPost.metadata, professions: updatedProfessions }
                            })
                          }}
                          className="mr-3 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">{profession}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Clinical Areas */}
              <div className="relative" ref={dropdownRefs.clinical_areas}>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Clinical Areas *
                </label>
                <button
                  onClick={() => setDropdowns(prev => ({ ...prev, clinical_areas: !prev.clinical_areas }))}
                  className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg bg-white flex justify-between items-center"
                >
                  <span className="text-sm text-gray-700">
                    {newPost.metadata.clinical_areas.length > 0 
                      ? `${newPost.metadata.clinical_areas.length} selected` 
                      : 'Select clinical areas'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {dropdowns.clinical_areas && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {CLINICAL_AREA_OPTIONS.map(area => (
                      <label key={area} className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newPost.metadata.clinical_areas.includes(area)}
                          onChange={(e) => {
                            const updatedAreas = e.target.checked
                              ? [...newPost.metadata.clinical_areas, area]
                              : newPost.metadata.clinical_areas.filter(a => a !== area)
                            setNewPost({
                              ...newPost,
                              metadata: { ...newPost.metadata, clinical_areas: updatedAreas }
                            })
                          }}
                          className="mr-3 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">{area}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Content Type */}
              <div className="relative" ref={dropdownRefs.content_type}>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Content Type *
                </label>
                <button
                  onClick={() => setDropdowns(prev => ({ ...prev, content_type: !prev.content_type }))}
                  className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg bg-white flex justify-between items-center"
                >
                  <span className="text-sm text-gray-700">
                    {newPost.metadata.content_type || 'Select content type'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {dropdowns.content_type && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {CONTENT_TYPE_OPTIONS.map(type => (
                      <button
                        key={type}
                        onClick={() => {
                          setNewPost({
                            ...newPost,
                            metadata: { ...newPost.metadata, content_type: type }
                          })
                          setDropdowns(prev => ({ ...prev, content_type: false }))
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm text-gray-700"
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Audience Level */}
              <div className="relative" ref={dropdownRefs.audience_level}>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Audience Level *
                </label>
                <button
                  onClick={() => setDropdowns(prev => ({ ...prev, audience_level: !prev.audience_level }))}
                  className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg bg-white flex justify-between items-center"
                >
                  <span className="text-sm text-gray-700">
                    {newPost.metadata.audience_level || 'Select audience level'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {dropdowns.audience_level && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {AUDIENCE_LEVEL_OPTIONS.map(level => (
                      <button
                        key={level}
                        onClick={() => {
                          setNewPost({
                            ...newPost,
                            metadata: { ...newPost.metadata, audience_level: level }
                          })
                          setDropdowns(prev => ({ ...prev, audience_level: false }))
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm text-gray-700"
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Language */}
              <div className="relative" ref={dropdownRefs.language}>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Language *
                </label>
                <button
                  onClick={() => setDropdowns(prev => ({ ...prev, language: !prev.language }))}
                  className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg bg-white flex justify-between items-center"
                >
                  <span className="text-sm text-gray-700">
                    {newPost.metadata.language}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {dropdowns.language && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {LANGUAGE_OPTIONS.map((language, index) => (
                      <button
                        key={`${language}-${index}`}
                        onClick={() => {
                          setNewPost({
                            ...newPost,
                            metadata: { ...newPost.metadata, language }
                          })
                          setDropdowns(prev => ({ ...prev, language: false }))
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm text-gray-700"
                      >
                        {language}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Related Conditions */}
              <div className="relative" ref={dropdownRefs.related_conditions}>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Related Conditions
                </label>
                <button
                  onClick={() => setDropdowns(prev => ({ ...prev, related_conditions: !prev.related_conditions }))}
                  className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg bg-white flex justify-between items-center"
                >
                  <span className="text-sm text-gray-700">
                    {newPost.metadata.related_conditions.length > 0 
                      ? `${newPost.metadata.related_conditions.length} selected` 
                      : 'Select conditions'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {dropdowns.related_conditions && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {RELATED_CONDITIONS_OPTIONS.map(condition => (
                      <label key={condition} className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newPost.metadata.related_conditions.includes(condition)}
                          onChange={(e) => {
                            const updatedConditions = e.target.checked
                              ? [...newPost.metadata.related_conditions, condition]
                              : newPost.metadata.related_conditions.filter(c => c !== condition)
                            setNewPost({
                              ...newPost,
                              metadata: { ...newPost.metadata, related_conditions: updatedConditions }
                            })
                          }}
                          className="mr-3 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">{condition}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tags & Keywords
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add tags (press Enter)"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Add
                </button>
              </div>
              {newPost.metadata.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {newPost.metadata.tags.map(tag => (
                    <span 
                      key={tag} 
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center"
                    >
                      {tag}
                      <X 
                        className="w-3 h-3 ml-2 cursor-pointer" 
                        onClick={() => removeTag(tag)} 
                      />
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Attachments */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Attachments & Links
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add file URLs or links"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={attachmentInput}
                  onChange={(e) => setAttachmentInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAttachment())}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={addAttachment}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Add
                </button>
              </div>
              {newPost.metadata.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {newPost.metadata.attachments.map((attachment, index) => (
                    <span 
                      key={index} 
                      className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center"
                    >
                      Attachment {index + 1}
                      <X 
                        className="w-3 h-3 ml-2 cursor-pointer" 
                        onClick={() => removeAttachment(attachment)} 
                      />
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Co-authors */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Co-authors / Mentions
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Mention users by username"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={coAuthorInput}
                  onChange={(e) => setCoAuthorInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCoAuthor())}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={addCoAuthor}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Add
                </button>
              </div>
              {newPost.metadata.co_authors.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {newPost.metadata.co_authors.map(coAuthor => (
                    <span 
                      key={coAuthor} 
                      className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm flex items-center"
                    >
                      @{coAuthor}
                      <X 
                        className="w-3 h-3 ml-2 cursor-pointer" 
                        onClick={() => removeCoAuthor(coAuthor)} 
                      />
                    </span>
                  ))}
                </div>
              )}
            </div>

            </div>
            )}
          </div>

          {/* Bottom Toolbar - Action Buttons */}
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-end">
            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={createPost}
                disabled={loading || !newPost.content.replace(/<[^>]*>/g, '').trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Posting...
                  </>
                ) : (
                  'Post'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Edit Post Modal */}
    {editForm.id && (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowAdvancedOptions(false)
            setEditForm({ ...editForm, id: '' })
          }
        }}
      >
        <div 
          className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Header with User Info */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Avatar src={userProfile?.avatar_url} name={userProfile?.full_name} className="w-12 h-12" useInlineSize={false} />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{userProfile?.full_name || 'User'}</h3>
                  <div className="relative">
                    <button 
                      onClick={() => setDropdowns(prev => ({ ...prev, editVisibility: !prev.editVisibility }))}
                      className="text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1 mt-0.5"
                    >
                      <span>
                        {editForm.metadata.visibility === 'only_me' ? 'Only me' :
                         editForm.metadata.visibility === 'connections' ? 'Connections only' : 'Public'}
                      </span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${dropdowns.editVisibility ? 'rotate-180' : ''}`} />
                    </button>
                    {dropdowns.editVisibility && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-[180px]">
                        <button
                          onClick={() => {
                            setEditForm({ 
                              ...editForm, 
                              metadata: { ...editForm.metadata, visibility: 'public', is_public: true } 
                            })
                            setDropdowns(prev => ({ ...prev, editVisibility: false }))
                          }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${
                            editForm.metadata.visibility === 'public' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                          }`}
                        >
                          Public
                        </button>
                        <button
                          onClick={() => {
                            setEditForm({ 
                              ...editForm, 
                              metadata: { ...editForm.metadata, visibility: 'connections', is_public: false } 
                            })
                            setDropdowns(prev => ({ ...prev, editVisibility: false }))
                          }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${
                            editForm.metadata.visibility === 'connections' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                          }`}
                        >
                          Connections only
                        </button>
                        <button
                          onClick={() => {
                            setEditForm({ 
                              ...editForm, 
                              metadata: { ...editForm.metadata, visibility: 'only_me', is_public: false } 
                            })
                            setDropdowns(prev => ({ ...prev, editVisibility: false }))
                          }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${
                            editForm.metadata.visibility === 'only_me' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                          }`}
                        >
                          Only me
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowAdvancedOptions(false)
                  setEditForm({ ...editForm, id: '' })
                }} 
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={loading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {/* Content Rich Text Editor */}
            <RichTextEditor
              value={editForm.content}
              onChange={(value) => setEditForm({ ...editForm, content: value })}
              placeholder="What do you want to talk about?"
              disabled={loading}
              attachments={editForm.metadata.attachments}
              onAttachmentsChange={(attachments) => {
                setEditForm({
                  ...editForm,
                  metadata: {
                    ...editForm.metadata,
                    attachments
                  }
                })
              }}
              onToast={(message, type) => {
                if (type === 'success') {
                  toast.success(message)
                } else {
                  toast.error(message)
                }
              }}
              onImageInsert={(_url) => {
                // Handle image insertion if needed
              }}
            />

            {/* Advanced Options Toggle */}
            <button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedOptions ? 'rotate-180' : ''}`} />
              {showAdvancedOptions ? 'Hide' : 'Show'} advanced options
            </button>

            {/* Advanced Options - Collapsible */}
            {showAdvancedOptions && (
            <div className="border-t border-gray-200 pt-4 space-y-4">

            {/* Metadata Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profession */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Relevant Professions *
                </label>
                <button
                  onClick={() => setDropdowns(prev => ({ ...prev, professions: !prev.professions }))}
                  className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg bg-white flex justify-between items-center"
                >
                  <span className="text-sm text-gray-700">
                    {editForm.metadata.professions.length > 0 
                      ? `${editForm.metadata.professions.length} selected` 
                      : 'Select professions'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {dropdowns.professions && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {PROFESSION_OPTIONS.map((profession, index) => (
                      <label key={`${profession}-${index}`} className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newPost.metadata.professions.includes(profession)}
                          onChange={(e) => {
                            const updatedProfessions = e.target.checked
                              ? [...newPost.metadata.professions, profession]
                              : newPost.metadata.professions.filter(p => p !== profession)
                            setNewPost({
                              ...newPost,
                              metadata: { ...newPost.metadata, professions: updatedProfessions }
                            })
                          }}
                          className="mr-3 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">{profession}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Clinical Areas */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clinical Areas *
                </label>
                <button
                  onClick={() => setDropdowns(prev => ({ ...prev, clinical_areas: !prev.clinical_areas }))}
                  className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg bg-white flex justify-between items-center"
                >
                  <span className="text-sm text-gray-700">
                    {editForm.metadata.clinical_areas.length > 0 
                      ? `${editForm.metadata.clinical_areas.length} selected` 
                      : 'Select clinical areas'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {dropdowns.clinical_areas && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {CLINICAL_AREA_OPTIONS.map(area => (
                      <label key={area} className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.metadata.clinical_areas.includes(area)}
                          onChange={(e) => {
                            const updatedAreas = e.target.checked
                              ? [...editForm.metadata.clinical_areas, area]
                              : editForm.metadata.clinical_areas.filter(a => a !== area)
                            setEditForm({
                              ...editForm,
                              metadata: { ...editForm.metadata, clinical_areas: updatedAreas }
                            })
                          }}
                          className="mr-3 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">{area}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Content Type */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content Type *
                </label>
                <button
                  onClick={() => setDropdowns(prev => ({ ...prev, content_type: !prev.content_type }))}
                  className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg bg-white flex justify-between items-center"
                >
                  <span className="text-sm text-gray-700">
                    {editForm.metadata.content_type || 'Select content type'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {dropdowns.content_type && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {CONTENT_TYPE_OPTIONS.map(type => (
                      <button
                        key={type}
                        onClick={() => {
                          setEditForm({
                            ...editForm,
                            metadata: { ...editForm.metadata, content_type: type }
                          })
                          setDropdowns(prev => ({ ...prev, content_type: false }))
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm text-gray-700"
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Audience Level */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Audience Level *
                </label>
                <button
                  onClick={() => setDropdowns(prev => ({ ...prev, audience_level: !prev.audience_level }))}
                  className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg bg-white flex justify-between items-center"
                >
                  <span className="text-sm text-gray-700">
                    {editForm.metadata.audience_level || 'Select audience level'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {dropdowns.audience_level && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {AUDIENCE_LEVEL_OPTIONS.map(level => (
                      <button
                        key={level}
                        onClick={() => {
                          setEditForm({
                            ...editForm,
                            metadata: { ...editForm.metadata, audience_level: level }
                          })
                          setDropdowns(prev => ({ ...prev, audience_level: false }))
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm text-gray-700"
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Language */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language *
                </label>
                <button
                  onClick={() => setDropdowns(prev => ({ ...prev, language: !prev.language }))}
                  className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg bg-white flex justify-between items-center"
                >
                  <span className="text-sm text-gray-700">
                    {editForm.metadata.language}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {dropdowns.language && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {LANGUAGE_OPTIONS.map((language, index) => (
                      <button
                        key={`${language}-${index}`}
                        onClick={() => {
                          setNewPost({
                            ...newPost,
                            metadata: { ...newPost.metadata, language }
                          })
                          setDropdowns(prev => ({ ...prev, language: false }))
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm text-gray-700"
                      >
                        {language}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Related Conditions */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Related Conditions
                </label>
                <button
                  onClick={() => setDropdowns(prev => ({ ...prev, related_conditions: !prev.related_conditions }))}
                  className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg bg-white flex justify-between items-center"
                >
                  <span className="text-sm text-gray-700">
                    {editForm.metadata.related_conditions.length > 0 
                      ? `${editForm.metadata.related_conditions.length} selected` 
                      : 'Select conditions'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {dropdowns.related_conditions && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {RELATED_CONDITIONS_OPTIONS.map(condition => (
                      <label key={condition} className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.metadata.related_conditions.includes(condition)}
                          onChange={(e) => {
                            const updatedConditions = e.target.checked
                              ? [...editForm.metadata.related_conditions, condition]
                              : editForm.metadata.related_conditions.filter(c => c !== condition)
                            setEditForm({
                              ...editForm,
                              metadata: { ...editForm.metadata, related_conditions: updatedConditions }
                            })
                          }}
                          className="mr-3 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">{condition}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags & Keywords
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add tags (press Enter to add)"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEditTag())}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={addEditTag}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Add
                </button>
              </div>
              {editForm.metadata.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {editForm.metadata.tags.map(tag => (
                    <span 
                      key={tag} 
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center"
                    >
                      {tag}
                      <X 
                        className="w-3 h-3 ml-2 cursor-pointer" 
                        onClick={() => removeEditTag(tag)} 
                      />
                    </span>
                  ))}
                </div>
              )}
            </div>


            {/* Co-authors */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Co-authors / Mentions
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Mention other users by username..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={coAuthorInput}
                  onChange={(e) => setCoAuthorInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEditCoAuthor())}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={addEditCoAuthor}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Add
                </button>
              </div>
              {editForm.metadata.co_authors.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {editForm.metadata.co_authors.map(coAuthor => (
                    <span 
                      key={coAuthor} 
                      className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm flex items-center"
                    >
                      @{coAuthor}
                      <X 
                        className="w-3 h-3 ml-2 cursor-pointer" 
                        onClick={() => removeEditCoAuthor(coAuthor)} 
                      />
                    </span>
                  ))}
                </div>
              )}
            </div>
            </div>
            )}

          </div>

          {/* Bottom Toolbar - Action Buttons */}
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-end">
            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleUpdatePost}
                disabled={loading || !editForm.content.replace(/<[^>]*>/g, '').trim()}
                className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                title={loading ? 'Updating...' : 'Update Post'}
              >
                {loading ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <Check className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* User Profile Modal */}
    {selectedUserProfile && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
        <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

          <div className="p-6 space-y-6">
            {/* Profile Header */}
            <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
                <Avatar 
                  src={selectedUserProfile.avatar_url} 
                  name={selectedUserProfile.full_name} 
                  className="w-20 h-20" 
                  useInlineSize={false} 
                />
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div>
                    <h4 className="text-2xl font-bold text-gray-900">{selectedUserProfile.full_name}</h4>
                    <p className="text-lg text-gray-600">{selectedUserProfile.profession}</p>
                  </div>
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        if (!user?.id) {
                          toast.info('Please sign in to send messages');
                          return;
                        }
                        const { data: existingConversations } = await supabase
                          .from('conversations')
                          .select('*, user1:profiles!user1_id(*), user2:profiles!user2_id(*)')
                          .or(`and(user1_id.eq.${user.id},user2_id.eq.${selectedUserProfile.id}),and(user1_id.eq.${selectedUserProfile.id},user2_id.eq.${user.id})`)

                        let conversation
                        if (existingConversations && existingConversations.length > 0) {
                          const conv = existingConversations[0]
                          conversation = {
                            ...conv,
                            other_user: conv.user1_id === user.id ? conv.user2 : conv.user1
                          }
                        } else {
                          const { data: newConv } = await supabase
                            .from('conversations')
                            .insert({
                              user1_id: user.id,
                              user2_id: selectedUserProfile.id
                            })
                            .select('*, user1:profiles!user1_id(*), user2:profiles!user2_id(*)')
                            .single()

                          if (newConv) {
                            conversation = {
                              ...newConv,
                              other_user: newConv.user1_id === user.id ? newConv.user2 : newConv.user1
                            }
                          }
                        }
                        if (conversation) {
                          window.dispatchEvent(new CustomEvent('openChatBox', { detail: { conversation } }))
                        }
                      }}
                      className="flex items-center justify-center w-10 h-10 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
                      title="Message"
                    >
                      <MessageSquare className="w-5 h-5" />
                    </button>
                    <button
                      onClick={async () => {
                        if (!user?.id) {
                          toast.info('Please sign in to connect');
                          return;
                        }
                        window.dispatchEvent(new CustomEvent('sendConnectionRequest', { detail: { receiverId: selectedUserProfile.id } }))
                        toast.success('Connection request sent!')
                      }}
                      className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                      title="Connect"
                    >
                      <UserPlus className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => { 
                        setSelectedUserProfile(null); 
                        window.dispatchEvent(new CustomEvent('openProfileDetail', { detail: { profileId: selectedUserProfile.id } })); 
                      }} 
                      className="flex items-center justify-center w-10 h-10 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors"
                      title="View Full Profile"
                    >
                      <User className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
              </div>

              <button 
                onClick={() => setSelectedUserProfile(null)} 
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Profile Details */}
            <div className="space-y-4">
              {selectedUserProfile.specialties && selectedUserProfile.specialties.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Specialties</h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedUserProfile.specialties.map((specialty: string) => (
                      <span key={specialty} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedUserProfile.languages && selectedUserProfile.languages.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Languages</h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedUserProfile.languages.map((language: string) => (
                      <span key={language} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                        {language}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Type-safe bio access */}
              {'bio' in selectedUserProfile && selectedUserProfile.bio && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Bio</h5>
                  <p className="text-gray-700">{(selectedUserProfile as { bio: string }).bio}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Post Detail Modal */}
    {selectedPost && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 md:p-4">
        <div className="bg-white md:rounded-2xl w-full h-full md:h-auto md:max-w-4xl md:max-h-[90vh] overflow-y-auto modal-scroll-container">
          <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
            <h3 className="text-xl font-bold text-gray-900">Post Details</h3>
            <button 
              onClick={() => setSelectedPost(null)} 
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6">
            {/* Post Header */}
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => {
                  viewUserProfile(selectedPost.user_id || getUserId(selectedPost.user))
                  setSelectedPost(null)
                }}
                className="flex-shrink-0 hover:opacity-80 transition-opacity"
              >
                {selectedPost.user?.avatar_url ? (
                  <img
                    src={selectedPost.user.avatar_url}
                    alt={getUserDisplayName(selectedPost.user)}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold hover:bg-blue-700 transition-colors">
                {getUserDisplayName(selectedPost.user)?.charAt(0) || 'U'}
                  </div>
                )}
              </button>
              <div>
                <button
                  onClick={() => {
                    viewUserProfile(selectedPost.user_id || getUserId(selectedPost.user))
                    setSelectedPost(null)
                  }}
                  className="font-semibold text-gray-900 hover:text-blue-600 transition-colors text-lg"
                >
                  {getUserDisplayName(selectedPost.user)}
                </button>
                <p className="text-sm text-gray-600">
                  {getUserProfession(selectedPost.user)} • {formatTime(selectedPost.created_at)}
                  {selectedPost.updated_at && selectedPost.updated_at !== selectedPost.created_at && (
                    <span className="text-gray-400"> (edited)</span>
                  )}
                </p>
              </div>
            </div>

            {/* Post Title */}
            {selectedPost.title && (
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{selectedPost.title}</h2>
            )}

            {/* Post Metadata */}
            {renderPostMetadata(selectedPost)}

            {/* Post Settings Indicators */}
            <div className="flex flex-wrap gap-3 text-xs text-gray-500 my-4">
              {postSettings[selectedPost.id]?.comments_disabled && (
                <span className="flex items-center gap-1 bg-red-50 text-red-700 px-2 py-1 rounded-full">
                  <MessageSquare className="w-3 h-3" />
                  Comments disabled
                </span>
              )}
              {postSettings[selectedPost.id]?.muted && (
                <span className="flex items-center gap-1 bg-orange-50 text-orange-700 px-2 py-1 rounded-full">
                  <Bell className="w-3 h-3" />
                  Notifications muted
                </span>
              )}
              {followingPosts.includes(selectedPost.id) && (
                <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                  <Bell className="w-3 h-3" />
                  Following
                </span>
              )}
            </div>

            {/* Post Content */}
            <p className="text-gray-700 mb-6 whitespace-pre-line text-lg leading-relaxed">{selectedPost.content}</p>

            {/* Attachments */}
            {selectedPost.post_metadata?.attachments && selectedPost.post_metadata.attachments.length > 0 && (
              <div className="mb-6">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Attachments:</h5>
                <div className="flex flex-wrap gap-2">
                  {selectedPost.post_metadata.attachments.map((attachment: string, index: number) => (
                    <a 
                      key={index}
                      href={attachment}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700 underline"
                    >
                      Attachment {index + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Co-authors */}
            {selectedPost.post_metadata?.co_authors && selectedPost.post_metadata.co_authors.length > 0 && (
              <div className="mb-6">
                <h5 className="text-sm font-medium text-gray-700 mb-1">Co-authors:</h5>
                <p className="text-sm text-gray-600">{selectedPost.post_metadata.co_authors.join(', ')}</p>
              </div>
            )}

            {/* Comments Section */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center text-sm text-gray-500">
                  <MessageSquare className="w-4 h-4 mr-1" />
                  {(() => {
                    // If comments are loaded, use actual count
                    const postComments = comments[selectedPost.id];
                    if (postComments !== undefined) {
                      // Count all top-level comments (not replies)
                      const topLevelCount = postComments.filter(c => !c.parent_reply_id).length;
                      // Count all replies recursively
                      const countReplies = (commentList: Comment[]): number => {
                        let count = 0;
                        commentList.forEach(comment => {
                          if (comment.replies && comment.replies.length > 0) {
                            count += comment.replies.length;
                            count += countReplies(comment.replies);
                          }
                        });
                        return count;
                      };
                      const repliesCount = countReplies(postComments);
                      return topLevelCount + repliesCount;
                    }
                    // Otherwise use replies_count from post
                    return selectedPost.replies_count || 0;
                  })()} comments
                </div>
              </div>

              {/* Comment Input */}
              {user && !postSettings[selectedPost.id]?.comments_disabled && (
                <div className="mb-4">
                  <div className="flex gap-2 items-center">
                    <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                      {userProfile?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                  <textarea
                    placeholder="Add a comment..."
                    value={newComments[selectedPost.id] || ''}
                        onChange={(e) => {
                          setNewComments(prev => ({ ...prev, [selectedPost.id]: e.target.value }));
                          // Auto-resize textarea
                          e.target.style.height = 'auto';
                          e.target.style.height = `${Math.min(e.target.scrollHeight, 80)}px`;
                        }}
                        className="flex-1 resize-none border-none outline-none text-sm py-1"
                        rows={1}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            addComment(selectedPost.id)
                          }
                          // Shift+Enter allows new line (default behavior)
                        }}
                        style={{ maxHeight: '80px', minHeight: '24px', height: '24px' }}
                      />
                    <button
                      onClick={() => addComment(selectedPost.id)}
                      disabled={!newComments[selectedPost.id]?.trim()}
                        className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                        title="Post comment"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                    </div>
                  </div>
                </div>
              )}

              {postSettings[selectedPost.id]?.comments_disabled && (
                <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="font-medium">Comments are disabled for this post</p>
                  <p className="text-sm mt-1">The post owner has turned off comments</p>
                </div>
              )}

              {!postSettings[selectedPost.id]?.comments_disabled && (
                <div className="space-y-4">
                  {(comments[selectedPost.id] || []).map(comment => (
                    <div key={comment.id} data-comment-id={comment.id} className="flex gap-3 items-start">
                      {/* Kullanıcı Avatarı */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          viewUserProfile(comment.user_id || getUserId(comment.user));
                        }}
                        className="flex-shrink-0 self-start hover:opacity-80 transition-opacity"
                      >
                        {comment.user?.avatar_url ? (
                          <img
                            src={comment.user.avatar_url}
                            alt={getUserDisplayName(comment.user)}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {getUserDisplayName(comment.user)?.charAt(0) || 'U'}
                          </div>
                        )}
                      </button>
                      
                      <div className="flex-1">
                        {/* Yorum İçeriği */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  viewUserProfile(comment.user_id || getUserId(comment.user));
                                }}
                                className="font-medium text-gray-900 hover:text-blue-600 transition-colors text-left"
                              >
                                {getUserDisplayName(comment.user)}
                              </button>
                              <p className="text-xs text-gray-500">
                                {getUserProfession(comment.user)}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                {formatTime(comment.created_at)}
                                {comment.updated_at && comment.updated_at !== comment.created_at && (
                                  <span className="ml-1 text-gray-400">(edited)</span>
                                )}
                              </span>
                              
                              {/* Yorum Menüsü */}
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveCommentMenu(activeCommentMenu === comment.id ? null : comment.id);
                                  }}
                                  className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-gray-200 transition-colors"
                                >
                                  <MoreHorizontal className="w-4 h-4 text-gray-500" />
                                </button>

                                {activeCommentMenu === comment.id && (
                                  <div className="absolute right-0 top-8 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-10 py-2">
                                    {isCommentOwner(comment) ? (
                                      <>
                                        <button
                                          onClick={(e) => handleCommentMenuAction('edit', comment.id, e)}
                                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                          <Edit2 className="w-4 h-4 mr-3 text-blue-600" />
                                          Edit Comment
                                        </button>
                                        <button
                                          onClick={(e) => handleCommentMenuAction('delete', comment.id, e)}
                                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                          <Trash2 className="w-4 h-4 mr-3" />
                                          Delete Comment
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        onClick={(e) => handleCommentMenuAction('report', comment.id, e)}
                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                      >
                                        <Flag className="w-4 h-4 mr-3 text-orange-600" />
                                        Report Comment
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {editingCommentId === comment.id ? (
                            <div className="mt-2 space-y-2">
                              <textarea
                                value={editCommentContent}
                                onChange={(e) => setEditCommentContent(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows={3}
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditComment(comment.id, selectedPost.id)}
                                  disabled={!editCommentContent.trim()}
                                  className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                                  title="Save"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingCommentId(null);
                                    setEditCommentContent('');
                                  }}
                                  className="flex items-center justify-center w-8 h-8 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                          <p className="text-gray-700 mt-2">{comment.content}</p>
                          )}

                          {/* Yorum Etkileşim Butonları */}
                          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-200">
                            {/* Beğenme Butonu */}
                            <button
                              onClick={(e) => handleLikeComment(comment.id, e)}
                              className={`flex items-center gap-1 text-xs ${
                                userReactions[comment.id] === 'like' 
                                  ? 'text-blue-600 font-medium' 
                                  : 'text-gray-500 hover:text-blue-600'
                              }`}
                            >
                              <ThumbsUp className="w-4 h-4" />
                              <span>{commentLikes[comment.id] || 0}</span>
                            </button>

                            {/* Favori Butonu */}
                            <button
                              onClick={(e) => handleFavoriteComment(comment.id, e)}
                              className={`flex items-center gap-1 text-xs ${
                                commentFavorites[comment.id] 
                                  ? 'text-yellow-500 font-medium' 
                                  : 'text-gray-500 hover:text-yellow-500'
                              }`}
                            >
                              <Star className="w-4 h-4" fill={commentFavorites[comment.id] ? "currentColor" : "none"} />
                            </button>

                            {/* Reply Butonu */}
                            {user && !postSettings[selectedPost.id]?.comments_disabled && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReplyingTo(prev => ({ 
                                    ...prev, 
                                    [comment.id]: !prev[comment.id] 
                                  }));
                                }}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                              >
                                {replyingTo[comment.id] ? (
                                  <X className="w-4 h-4" />
                                ) : (
                                  <MessageSquare className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Reply Formu */}
                        {replyingTo[comment.id] && user && !postSettings[selectedPost.id]?.comments_disabled && (
                          <div className="ml-4 mt-3">
                            <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                            <textarea
                              placeholder="Write a reply..."
                              value={replyContents[comment.id] || ''}
                                onChange={(e) => {
                                  setReplyContents(prev => ({ ...prev, [comment.id]: e.target.value }));
                                  // Auto-resize textarea
                                  e.target.style.height = 'auto';
                                  e.target.style.height = `${Math.min(e.target.scrollHeight, 80)}px`;
                                }}
                                className="flex-1 resize-none border-none outline-none text-sm py-1"
                                rows={1}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    addComment(selectedPost.id, comment.id)
                                  }
                                }}
                                style={{ maxHeight: '80px', minHeight: '24px', height: '24px' }}
                              />
                              <button
                                onClick={() => addComment(selectedPost.id, comment.id)}
                                disabled={!replyContents[comment.id]?.trim()}
                                className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                                title="Send reply"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Yanıtlar (Replies) */}
                        {comment.replies && comment.replies.length > 0 && (
                            <div className="ml-4 mt-3 space-y-3">
                              {comment.replies.map((reply: any) => (
                               <div key={reply.id} data-comment-id={reply.id} className="flex gap-2">
                                {/* Yanıt Kullanıcı Avatarı */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    viewUserProfile(reply.user_id || getUserId(reply.user));
                                  }}
                                  className="flex-shrink-0 hover:opacity-80 transition-opacity"
                                >
                                  {reply.user?.avatar_url ? (
                                    <img
                                      src={reply.user.avatar_url}
                                      alt={getUserDisplayName(reply.user)}
                                      className="w-6 h-6 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                  {getUserDisplayName(reply.user)?.charAt(0) || 'U'}
                                    </div>
                                  )}
                                </button>
                                
                                <div className="flex-1">
                                  <div className="bg-green-50 rounded-lg p-3">
                                    <div className="flex justify-between items-start mb-1">
                                      <div>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            viewUserProfile(reply.user_id || getUserId(reply.user));
                                          }}
                                          className="font-medium text-gray-900 hover:text-blue-600 transition-colors text-sm text-left"
                                        >
                                          {getUserDisplayName(reply.user)}
                                        </button>
                                        <p className="text-xs text-gray-500">
                                          {getUserProfession(reply.user)}
                                        </p>
                                      </div>
                                      
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">
                                          {formatTime(reply.created_at)}
                                          {reply.updated_at && reply.updated_at !== reply.created_at && (
                                            <span className="ml-1 text-gray-400">(edited)</span>
                                          )}
                                        </span>
                                        
                                        {/* Yanıt Menüsü */}
                                        <div className="relative">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveCommentMenu(activeCommentMenu === reply.id ? null : reply.id);
                                            }}
                                            className="flex items-center justify-center w-5 h-5 rounded-full hover:bg-gray-200 transition-colors"
                                          >
                                            <MoreHorizontal className="w-3 h-3 text-gray-500" />
                                          </button>

                                          {activeCommentMenu === reply.id && (
                                            <div className="absolute right-0 top-6 w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-10 py-1">
                                              {isCommentOwner(reply) ? (
                                                <>
                                                  <button
                                                    onClick={(e) => handleCommentMenuAction('edit', reply.id, e)}
                                                    className="flex items-center w-full px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
                                                  >
                                                    <Edit2 className="w-3 h-3 mr-2 text-blue-600" />
                                                    Edit
                                                  </button>
                                                  <button
                                                    onClick={(e) => handleCommentMenuAction('delete', reply.id, e)}
                                                    className="flex items-center w-full px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                                                  >
                                                    <Trash2 className="w-3 h-3 mr-2" />
                                                    Delete
                                                  </button>
                                                </>
                                              ) : (
                                                <button
                                                  onClick={(e) => handleCommentMenuAction('report', reply.id, e)}
                                                  className="flex items-center w-full px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
                                                  >
                                                  <Flag className="w-3 h-3 mr-2 text-orange-600" />
                                                  Report
                                                </button>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {editingCommentId === reply.id ? (
                                      <div className="mt-2 space-y-2">
                                        <textarea
                                          value={editCommentContent}
                                          onChange={(e) => setEditCommentContent(e.target.value)}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                          rows={2}
                                          autoFocus
                                        />
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => {
                                              // Find postId for this reply
                                              for (const postId in comments) {
                                                const found = comments[postId].flatMap(c => c.replies || []).find(r => r.id === reply.id);
                                                if (found) {
                                                  handleEditComment(reply.id, postId);
                                                  return;
                                                }
                                              }
                                            }}
                                            disabled={!editCommentContent.trim()}
                                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                                          >
                                            Save
                                          </button>
                                          <button
                                            onClick={() => {
                                              setEditingCommentId(null);
                                              setEditCommentContent('');
                                            }}
                                            className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-300 transition-colors"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                    <p className="text-gray-700 text-sm mt-1">{reply.content}</p>
                                    )}
                                    
                                    {/* Yanıt Etkileşim Butonları */}
                                    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-green-100">
                                      <button
                                        onClick={(e) => handleLikeComment(reply.id, e)}
                                        className={`flex items-center gap-1 text-xs ${
                                          userReactions[reply.id] === 'like' 
                                            ? 'text-blue-600' 
                                            : 'text-gray-500 hover:text-blue-600'
                                        }`}
                                      >
                                        <ThumbsUp className="w-3 h-3" />
                                        <span>{commentLikes[reply.id] || 0}</span>
                                      </button>

                                      <button
                                        onClick={(e) => handleFavoriteComment(reply.id, e)}
                                        className={`text-xs ${
                                          commentFavorites[reply.id] 
                                            ? 'text-yellow-500' 
                                            : 'text-gray-500 hover:text-yellow-500'
                                        }`}
                                      >
                                        <Star className="w-3 h-3" fill={commentFavorites[reply.id] ? "currentColor" : "none"} />
                                      </button>

                                      {/* Yanıtlara Yanıt Butonu */}
                                      {user && !postSettings[selectedPost.id]?.comments_disabled && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setReplyingTo(prev => ({ 
                                              ...prev, 
                                              [reply.id]: !prev[reply.id] 
                                            }));
                                          }}
                                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                        >
                                          {replyingTo[reply.id] ? (
                                            <X className="w-4 h-4" />
                                          ) : (
                                            <MessageSquare className="w-4 h-4" />
                                          )}
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Yanıtlara Yanıt Formu */}
                                  {replyingTo[reply.id] && user && !postSettings[selectedPost.id]?.comments_disabled && (
                                    <div className="ml-4 mt-3">
                                      <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                                      <textarea
                                        placeholder="Write a reply..."
                                        value={replyContents[reply.id] || ''}
                                          onChange={(e) => {
                                            setReplyContents(prev => ({ ...prev, [reply.id]: e.target.value }));
                                            // Auto-resize textarea
                                            e.target.style.height = 'auto';
                                            e.target.style.height = `${Math.min(e.target.scrollHeight, 80)}px`;
                                          }}
                                          className="flex-1 resize-none border-none outline-none text-sm py-1"
                                          rows={1}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                              e.preventDefault()
                                              addComment(selectedPost.id, reply.id)
                                            }
                                          }}
                                          style={{ maxHeight: '80px', minHeight: '24px', height: '24px' }}
                                        />
                                        <button
                                          onClick={() => addComment(selectedPost.id, reply.id)}
                                          disabled={!replyContents[reply.id]?.trim()}
                                          className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                                          title="Send reply"
                                        >
                                          <Send className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Nested Yanıtlar (Yanıtların Yanıtları) */}
                                  {reply.replies && reply.replies.length > 0 && (
                                      <div className="ml-4 mt-3 space-y-3">
                                        {reply.replies.map((nestedReply: any) => (
                                         <div key={nestedReply.id} data-comment-id={nestedReply.id} className="flex gap-2 items-start">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              viewUserProfile(nestedReply.user_id || getUserId(nestedReply.user));
                                            }}
                                            className="flex-shrink-0 self-start hover:opacity-80 transition-opacity"
                                          >
                                            {nestedReply.user?.avatar_url ? (
                                              <img
                                                src={nestedReply.user.avatar_url}
                                                alt={getUserDisplayName(nestedReply.user)}
                                                className="w-5 h-5 rounded-full object-cover"
                                              />
                                            ) : (
                                              <div className="w-5 h-5 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                            {getUserDisplayName(nestedReply.user)?.charAt(0) || 'U'}
                                              </div>
                                            )}
                                          </button>
                                          <div className="flex-1">
                                            <div className="bg-orange-50 rounded-lg p-2">
                                              <div className="flex justify-between items-start mb-1">
                                                <div>
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      viewUserProfile(nestedReply.user_id || getUserId(nestedReply.user));
                                                    }}
                                                    className="font-medium text-gray-900 hover:text-blue-600 transition-colors text-xs text-left"
                                                  >
                                                    {getUserDisplayName(nestedReply.user)}
                                                  </button>
                                                  <p className="text-xs text-gray-500">
                                                    {getUserProfession(nestedReply.user)}
                                                  </p>
                                                </div>
                                                <span className="text-xs text-gray-500">
                                                  {formatTime(nestedReply.created_at)}
                                                  {nestedReply.updated_at && nestedReply.updated_at !== nestedReply.created_at && (
                                                    <span className="ml-1 text-gray-400">(edited)</span>
                                                  )}
                                                </span>
                                              </div>
                                              {editingCommentId === nestedReply.id ? (
                                                <div className="mt-2 space-y-2">
                                                  <textarea
                                                    value={editCommentContent}
                                                    onChange={(e) => setEditCommentContent(e.target.value)}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                                                    rows={2}
                                                    autoFocus
                                                  />
                                                  <div className="flex gap-2">
                                                    <button
                                                      onClick={() => {
                                                        for (const postId in comments) {
                                                          const findInNested = (comments: Comment[]): Comment | null => {
                                                            for (const c of comments) {
                                                              if (c.replies) {
                                                                for (const r of c.replies) {
                                                                  if (r.replies) {
                                                                    const found = r.replies.find(nr => nr.id === nestedReply.id);
                                                                    if (found) return found;
                                                                  }
                                                                }
                                                              }
                                                            }
                                                            return null;
                                                          };
                                                          const found = findInNested(comments[postId] || []);
                                                          if (found) {
                                                            handleEditComment(nestedReply.id, postId);
                                                            return;
                                                          }
                                                        }
                                                      }}
                                                      disabled={!editCommentContent.trim()}
                                                      className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
                                                      title="Save"
                                                    >
                                                      <Check className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                      onClick={() => {
                                                        setEditingCommentId(null);
                                                        setEditCommentContent('');
                                                      }}
                                                      className="flex items-center justify-center w-6 h-6 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                                      title="Cancel"
                                                    >
                                                      <X className="w-3 h-3" />
                                                    </button>
                                                  </div>
                                                </div>
                                              ) : (
                                              <p className="text-gray-700 text-xs mt-1">{nestedReply.content}</p>
                                              )}
                                              
                                              {/* Nested Yanıt Etkileşim Butonları */}
                                              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-orange-100">
                                                <button
                                                  onClick={(e) => handleLikeComment(nestedReply.id, e)}
                                                  className={`flex items-center gap-1 text-xs ${
                                                    userReactions[nestedReply.id] === 'like' 
                                                      ? 'text-blue-600' 
                                                      : 'text-gray-500 hover:text-blue-600'
                                                  }`}
                                                >
                                                  <ThumbsUp className="w-3 h-3" />
                                                  <span>{commentLikes[nestedReply.id] || 0}</span>
                                                </button>

                                                <button
                                                  onClick={(e) => handleFavoriteComment(nestedReply.id, e)}
                                                  className={`text-xs ${
                                                    commentFavorites[nestedReply.id] 
                                                      ? 'text-yellow-500' 
                                                      : 'text-gray-500 hover:text-yellow-500'
                                                  }`}
                                                >
                                                  <Star className="w-3 h-3" fill={commentFavorites[nestedReply.id] ? "currentColor" : "none"} />
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {(comments[selectedPost.id] || []).length === 0 && (
                    <div className="text-center py-6 text-gray-500">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>No comments yet</p>
                      <p className="text-sm mt-1">Be the first to comment!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Report Comment Modal */}
    {reportModalOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setReportModalOpen(false)}>
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Report Comment</h3>
            <button
              onClick={() => {
                setReportModalOpen(false);
                setReportingCommentId(null);
                setReportReason('');
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Please tell us why you're reporting this comment. This helps us keep the community safe.
          </p>

          <div className="space-y-3 mb-4">
            {['Spam', 'Harassment', 'Inappropriate content', 'Misinformation', 'Other'].map((reason) => (
              <label key={reason} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="reportReason"
                  value={reason}
                  checked={reportReason === reason}
                  onChange={(e) => {
                    if (reason === 'Other') {
                      setReportReason('');
                    } else {
                      setReportReason(e.target.value);
                    }
                  }}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">{reason}</span>
              </label>
            ))}
          </div>

          {reportReason === 'Other' && (
            <textarea
              placeholder="Please provide details..."
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none mb-4 text-sm"
              rows={3}
            />
          )}

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setReportModalOpen(false);
                setReportingCommentId(null);
                setReportReason('');
                setReportDetails('');
              }}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleReportComment}
              disabled={!(reportReason === 'Other' ? reportDetails.trim() : reportReason.trim())}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 transition-colors"
            >
              Submit Report
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  )
}

function CVMaker({ userProfile, onClose }: CVMakerProps) {
  const [loading, setLoading] = useState(false)
  const [cvStyle, setCvStyle] = useState<'modern' | 'professional' | 'creative'>('modern')
  const [selectedSections, setSelectedSections] = useState({
    personal: true,
    phone: false,
    summary: true,
    experience: true,
    qualifications: true,
    specialties: true,
    languages: true,
    additional: true
  })

  const toggleSection = (section: string) => {
    setSelectedSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev]
    }))
  }

  const calculateTotalExperience = (experiences: any[]) => {
    if (!experiences || experiences.length === 0) return 'N/A'
    
    let totalMonths = 0
    experiences.forEach(exp => {
      if (exp.start_date) {
        const start = new Date(exp.start_date)
        const end = exp.end_date?.toLowerCase() === 'present' ? new Date() : new Date(exp.end_date)
        
        if (!isNaN(start.getTime())) {
          const diffTime = Math.abs(end.getTime() - start.getTime())
          const months = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.44))
          totalMonths += months
        }
      }
    })
    
    const years = Math.floor(totalMonths / 12)
    const months = totalMonths % 12
    
    if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''} ${months > 0 ? `${months} month${months > 1 ? 's' : ''}` : ''}`.trim()
    } else {
      return `${months} month${months > 1 ? 's' : ''}`
    }
  }

  const formatParagraphs = (text: string) => {
    if (!text) return ''
    return text.split('\n').filter(para => para.trim()).map(para => 
      `<p style="margin-bottom: 0.4rem;">${para.trim()}</p>`
    ).join('')
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-GB', { 
        year: 'numeric', 
        month: 'long' 
      })
    } catch {
      return dateString
    }
  }

  const calculateDuration = (startDate: string, endDate: string) => {
    if (!startDate) return ''
    
    const start = new Date(startDate)
    const end = endDate?.toLowerCase() === 'present' ? new Date() : new Date(endDate)
    
    if (isNaN(start.getTime())) return ''
    
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25))
    const diffMonths = Math.floor((diffTime % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44))
    
    if (diffYears > 0) {
      return `${diffYears} year${diffYears > 1 ? 's' : ''} ${diffMonths > 0 ? `${diffMonths} month${diffMonths > 1 ? 's' : ''}` : ''}`.trim()
    } else {
      return `${diffMonths} month${diffMonths > 1 ? 's' : ''}`
    }
  }

  const printCV = async () => {
    setLoading(true)
    try {
      const cvContent = generateCVContent()
      const printWindow = window.open('', '_blank')
      
      if (printWindow) {
        const fullName = (userProfile.full_name || 'Professional').trim()
        const now = new Date()
        const dd = String(now.getDate()).padStart(2, '0')
        const mm = String(now.getMonth() + 1).padStart(2, '0')
        const yyyy = now.getFullYear()
        const dateStr = `${dd}.${mm}.${yyyy}`
        const fileBase = `${fullName} CV - ${dateStr}`
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${fileBase}</title>
              <meta charset="UTF-8">
              <style>
                ${getCVStyles(cvStyle)}
                ${getPrintStyles()}
              </style>
            </head>
            <body>
              <div class="cv-container">
                ${cvContent}
              </div>
              <script>
                window.onload = function() {
                  setTimeout(() => {
                    window.print();
                    setTimeout(() => window.close(), 500);
                  }, 250);
                }
              <\/script>
            </body>
          </html>
        `)
        printWindow.document.close()
      }
      
    } catch (error) {
      console.error('Error generating CV:', error)
      alert('Error generating CV')
    }
    setLoading(false)
  }

  const downloadPDF = async () => {
    setLoading(true)
    try {
      const ensureHtml2Pdf = () => new Promise<void>((resolve, reject) => {
        if ((window as any).html2pdf) return resolve()
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js'
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Failed to load html2pdf.js'))
        document.body.appendChild(script)
      })

      await ensureHtml2Pdf()

      // Build a detached DOM with styles so html2pdf captures correct look
      const wrapper = document.createElement('div')
      wrapper.innerHTML = `
        <style>${getCVStyles(cvStyle)}</style>
        <div class="cv-container">${generateCVContent()}</div>
      `

      const now = new Date()
      const dd = String(now.getDate()).padStart(2, '0')
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const yyyy = now.getFullYear()
      const dateStr = `${dd}.${mm}.${yyyy}`
      const fullName = (userProfile.full_name || 'Professional').trim()
      const fileBase = `${fullName} CV - ${dateStr}`

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `${fileBase}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }

      await (window as any).html2pdf().set(opt).from(wrapper).save()
    } catch (err) {
      console.error('PDF export error:', err)
      alert('Failed to export PDF')
    }
    setLoading(false)
  }

  const getPrintStyles = () => `
    @media print {
      @page {
        margin: 15mm;
        size: A4;
      }
      
      /* CRITICAL: Remove all headers and footers */
      body::before,
      body::after {
        display: none !important;
        content: none !important;
      }
      
      header, footer {
        display: block !important;
      }
      
      body {
        margin: 0;
        padding: 0;
        background: white !important;
        font-size: 10pt;
        line-height: 1.35;
      }
      
      .cv-container {
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        background: white !important;
      }
      
      .cv-section {
        break-inside: auto;
        margin-bottom: 0.8rem;
        page-break-inside: auto;
      }
      
      .experience-item {
        break-inside: avoid;
        page-break-inside: avoid;
        margin-bottom: 0.5rem;
        padding: 0.4rem 0.6rem;
      }
      
      .qualification-item {
        break-inside: avoid;
        page-break-inside: avoid;
        margin-bottom: 0.4rem;
        padding: 0.3rem 0.5rem;
      }
      
      .cv-header {
        margin: 0 0 1rem 0 !important;
        padding: 1.5rem 0 !important;
        break-after: avoid;
      }
      
      .skills-container, .languages-container {
        break-inside: avoid;
      }
      
      .section-content {
        break-inside: auto;
      }
      
      .section-title {
        margin-bottom: 0.4rem !important;
        padding-bottom: 0.2rem !important;
      }
      
      .summary-text p {
        margin-bottom: 0.3rem !important;
      }
      
      .job-description p {
        margin-bottom: 0.3rem !important;
      }
    }
    
    .avoid-break {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  `

  const generateCVContent = () => {
    let content = ''
    
    // Header Section
    if (selectedSections.personal) {
      content += `
        <header class="cv-header">
          <div class="header-content">
            <h1 class="name">${userProfile.full_name || 'Professional Therapist'}</h1>
            <h2 class="title">${userProfile.profession || 'Therapist'}</h2>
            <div class="contact-info">
              ${userProfile.contact_email ? `<div class="contact-item"><span class="icon">✉️</span> ${userProfile.contact_email}</div>` : ''}
              ${selectedSections.phone && userProfile.phone ? `<div class="contact-item"><span class="icon">📞</span> ${userProfile.phone}</div>` : ''}
              ${userProfile.city ? `<div class="contact-item"><span class="icon">📍</span> ${userProfile.city}, ${userProfile.county}</div>` : ''}
              ${userProfile.website ? `<div class="contact-item"><span class="icon">🌐</span> ${userProfile.website}</div>` : ''}
            </div>
          </div>
        </header>
      `
    }

    content += `<main class="cv-main">`

    // Professional Summary
    if (selectedSections.summary && userProfile.about_me) {
      content += `
        <section class="cv-section avoid-break">
          <h3 class="section-title">Professional Summary</h3>
          <div class="section-content">
            <div class="summary-text">${formatParagraphs(userProfile.about_me)}</div>
          </div>
        </section>
      `
    }

    // Work Experience
    if (selectedSections.experience && userProfile.work_experience?.length > 0) {
      content += `
        <section class="cv-section" style="margin-top: 1.2rem;">
          <h3 class="section-title">Work Experience</h3>
          <div class="section-content">
            ${userProfile.work_experience.map((exp: any) => {
              const duration = calculateDuration(exp.start_date, exp.end_date)
              const endDateDisplay = exp.end_date?.toLowerCase() === 'present' ? 'Present' : formatDate(exp.end_date)
              return `
                <div class="experience-item">
                  <div class="experience-header">
                    <h4 class="job-title">${exp.title || 'Position'}</h4>
                    <span class="date-range">${formatDate(exp.start_date)} - ${endDateDisplay}${duration ? ` (${duration})` : ''}</span>
                  </div>
                  <div class="company">${exp.organization || 'Organization'}</div>
                  ${exp.description ? `
                    <div class="job-description">
                      ${formatParagraphs(exp.description)}
                    </div>
                  ` : ''}
                </div>
              `
            }).join('')}
          </div>
        </section>
      `
    }

    // Qualifications
    if (selectedSections.qualifications && userProfile.qualifications?.length > 0) {
      content += `
        <section class="cv-section">
          <h3 class="section-title">Qualifications & Certifications</h3>
          <div class="section-content">
            ${userProfile.qualifications.map((qual: any) => `
              <div class="qualification-item avoid-break">
                <div class="qualification-header">
                  <h4 class="qualification-title">${qual.title || 'Qualification'}</h4>
                  <span class="qualification-year">${qual.year || ''}</span>
                </div>
                <div class="institution">${qual.institution || 'Institution'}</div>
              </div>
            `).join('')}
          </div>
        </section>
      `
    }

    // Specialties
    if (selectedSections.specialties && userProfile.specialties?.length > 0) {
      content += `
        <section class="cv-section avoid-break">
          <h3 class="section-title">Areas of Specialization</h3>
          <div class="section-content">
            <div class="skills-container">
              ${userProfile.specialties.map((spec: string) => `
                <span class="skill-tag">${spec}</span>
              `).join('')}
            </div>
          </div>
        </section>
      `
    }

    // Languages
    if (selectedSections.languages && userProfile.languages?.length > 0) {
      content += `
        <section class="cv-section avoid-break">
          <h3 class="section-title">Languages</h3>
          <div class="section-content">
            <div class="languages-container">
              ${userProfile.languages.map((lang: string) => `
                <span class="language-item">${lang}</span>
              `).join('')}
            </div>
          </div>
        </section>
      `
    }

    // Additional Information
    if (selectedSections.additional) {
      content += `
        <section class="cv-section avoid-break">
          <h3 class="section-title">Additional Information</h3>
          <div class="section-content">
            <div class="additional-info">
              ${userProfile.offers_remote ? '<div class="info-item">✅ Available for remote sessions</div>' : ''}
              ${userProfile.regulator_number ? `<div class="info-item">Professional Registration: ${userProfile.regulator_number}</div>` : ''}
              <div class="info-item">Total Experience: ${calculateTotalExperience(userProfile.work_experience || [])}</div>
            </div>
          </div>
        </section>
      `
    }

    content += `</main>`

    // Footer
    content += `
      <footer class="cv-footer">
        <p>Generated by UK Therapist Network • ${new Date().toLocaleDateString('en-GB')}</p>
      </footer>
    `

    return content
  }

  const getCVStyles = (style: string) => {
    const baseStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', sans-serif;
    line-height: 1.35;
    color: #333;
    background: #fff;
  }

  .cv-container {
    max-width: 210mm;
    margin: 0 auto;
    padding: 12mm 15mm;
    background: white;
    box-shadow: 0 0 10px rgba(0,0,0,0.05);
  }

  .cv-header {
    border-bottom: 2px solid #2563eb;
    padding-bottom: 0.8rem;
    margin-bottom: 1rem;
  }

  .header-content {
    text-align: center;
  }

  .name {
    font-size: 1.6rem;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 0.2rem;
  }

  .title {
    font-size: 0.95rem;
    font-weight: 500;
    color: #2563eb;
    margin-bottom: 0.4rem;
  }

  .contact-info {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.4rem;
    font-size: 0.75rem;
    color: #64748b;
  }

  .cv-section {
    margin-bottom: 1rem;
  }

  .section-title {
    font-size: 1rem;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 0.5rem;
    padding-bottom: 0.25rem;
    border-bottom: 1px solid #e2e8f0;
    position: relative;
  }

  .section-title::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 35px;
    height: 2px;
    background: #2563eb;
  }

  .section-content {
    padding-left: 0.3rem;
  }

  .experience-item {
    margin-bottom: 0.6rem;
    padding: 0.5rem 0.7rem;
    background: #f8fafc;
    border-radius: 4px;
    border-left: 3px solid #2563eb;
  }

  .experience-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 0.25rem;
    gap: 1rem;
  }

  .job-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: #1e293b;
    flex: 1;
  }

  .date-range {
    font-size: 0.75rem;
    color: #64748b;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .company {
    font-size: 0.85rem;
    color: #2563eb;
    font-weight: 500;
    margin-bottom: 0.25rem;
  }

  .job-description {
    font-size: 0.8rem;
    color: #475569;
    line-height: 1.35;
  }

  .job-description p {
    margin-bottom: 0.4rem;
  }

  .job-description p:last-child {
    margin-bottom: 0;
  }

  .qualification-item {
    margin-bottom: 0.5rem;
    padding: 0.5rem;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
  }

  .qualification-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
  }

  .qualification-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: #1e293b;
  }

  .qualification-year {
    font-size: 0.75rem;
    color: #64748b;
    white-space: nowrap;
  }

  .institution {
    font-size: 0.8rem;
    color: #64748b;
    margin-top: 0.2rem;
  }

  .skills-container, .languages-container {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .skill-tag, .language-item {
    background: #e0f2fe;
    color: #075985;
    padding: 0.25rem 0.55rem;
    border-radius: 10px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .additional-info {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .info-item {
    font-size: 0.8rem;
    color: #475569;
  }

  .summary-text {
    font-size: 0.85rem;
    line-height: 1.4;
    color: #475569;
  }

  .summary-text p {
    margin-bottom: 0.5rem;
  }

  .summary-text p:last-child {
    margin-bottom: 0;
  }

  .cv-footer {
    margin-top: 1.2rem;
    padding-top: 0.4rem;
    border-top: 1px solid #e2e8f0;
    text-align: center;
    color: #94a3b8;
    font-size: 0.7rem;
  }

  @media print {
    body {
      background: white !important;
      font-size: 10pt;
      line-height: 1.3;
    }

    .cv-container {
      box-shadow: none;
      padding: 0;
      max-width: 100%;
    }

    .experience-item, .qualification-item {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    
    .cv-section {
      margin-bottom: 0.8rem;
    }
    
    .section-title {
      margin-bottom: 0.4rem;
      padding-bottom: 0.2rem;
    }
    
    .experience-item {
      margin-bottom: 0.5rem;
      padding: 0.4rem 0.6rem;
    }
    
    .qualification-item {
      margin-bottom: 0.4rem;
      padding: 0.3rem 0.5rem;
    }
  }
`

    const styleVariants = {
      modern: `
        .cv-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1.8rem 0;
          margin: -12mm -15mm 1rem -15mm;
        }
        
        .name, .title, .contact-info, .contact-item {
          color: white !important;
        }
        
        .section-title {
          color: #374151;
        }
      `,
      
      professional: `
        .cv-header {
          background: #1e293b;
          color: white;
          padding: 1.8rem 0;
          margin: -12mm -15mm 1rem -15mm;
        }
        
        .name {
          color: white !important;
        }
        
        .title {
          color: #cbd5e1 !important;
        }
        
        .contact-info, .contact-item {
          color: #cbd5e1 !important;
        }
        
        .section-title {
          color: #1e293b;
          border-bottom-color: #cbd5e1;
        }
      `,
      
      creative: `
        .cv-header {
          background: linear-gradient(45deg, #ec4899, #8b5cf6);
          color: white;
          padding: 1.8rem 0;
          margin: -12mm -15mm 1rem -15mm;
          border-bottom: none;
        }
        
        .name, .title, .contact-info, .contact-item {
          color: white !important;
        }
        
        .section-title {
          color: #7c3aed;
          border-bottom-color: #ddd6fe;
        }
        
        .experience-item {
          border-left-color: #8b5cf6;
        }
      `
    }

    return baseStyles + (styleVariants[style as keyof typeof styleVariants] || styleVariants.modern)
  }

  const previewCV = () => {
    const cvContent = generateCVContent()
    const previewWindow = window.open('', '_blank')
    
    if (previewWindow) {
      previewWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>CV Preview - ${userProfile.full_name}</title>
            <meta charset="UTF-8">
            <style>
              ${getCVStyles(cvStyle)}
              body { 
                background: #f8fafc; 
                padding: 2rem;
                display: flex;
                justify-center: center;
              }
              .cv-container {
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                max-width: 210mm;
              }
            </style>
          </head>
          <body>
            <div class="cv-container">
              ${cvContent}
            </div>
          </body>
        </html>
      `)
      previewWindow.document.close()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">CV Maker</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {/* Style Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Choose CV Style</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { id: 'modern', name: 'Modern', color: 'bg-gradient-to-r from-indigo-500 to-purple-600' },
                { id: 'professional', name: 'Professional', color: 'bg-gray-800' },
                { id: 'creative', name: 'Creative', color: 'bg-gradient-to-r from-pink-500 to-purple-600' }
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => setCvStyle(style.id as any)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    cvStyle === style.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full ${style.color} mb-2`}></div>
                  <span className="font-medium text-gray-900">{style.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Include Sections</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { id: 'personal', label: 'Personal Info' },
                { id: 'phone', label: 'Phone Number' },
                { id: 'summary', label: 'Professional Summary' },
                { id: 'experience', label: 'Work Experience' },
                { id: 'qualifications', label: 'Qualifications' },
                { id: 'specialties', label: 'Specialties' },
                { id: 'languages', label: 'Languages' },
                { id: 'additional', label: 'Additional Info' }
              ].map((section) => (
                <label key={section.id} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSections[section.id as keyof typeof selectedSections]}
                    onChange={() => toggleSection(section.id)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">{section.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Included Information */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-3 text-gray-900">Included Information:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>Personal & Contact Information</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>Professional Summary</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>Work Experience ({userProfile.work_experience?.length || 0} positions)</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>Qualifications ({userProfile.qualifications?.length || 0})</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>Specialties ({userProfile.specialties?.length || 0})</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>Languages ({userProfile.languages?.length || 0})</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={previewCV}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <Eye className="w-5 h-5" />
              Preview CV
            </button>
            <button
              onClick={printCV}
              disabled={loading}
              className="flex-1 py-3 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-900 disabled:bg-gray-300 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  Preparing...
                </>
              ) : (
                <>
                  <Printer className="w-5 h-5" />
                  Print
                </>
              )}
            </button>
            <button
              onClick={downloadPDF}
              disabled={loading}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Download PDF
                </>
              )}
            </button>
          </div>

          {/* Tips */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Pro Tip
            </h4>
            <p className="text-sm text-blue-700">
              For best results, when printing:<br/>
              1. Choose "A4" paper size<br/>
              2. In "More settings" <strong>disable "Headers and footers"</strong> to remove page headers<br/>
              3. Click "Save as PDF" for a clean, professional look
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function AuthModalComponent({ 
  onClose, 
  onSuccess, 
  currentUser, 
  userProfile, 
  onOpenProfileDetail,
  updateProfileInState
}: { 
  onClose: () => void
  onSuccess: () => void
  currentUser: any
  userProfile: any
  onOpenProfileDetail: (profileId: string) => void
  updateProfileInState?: (updatedProfile: Profile) => void
}) {
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
    experienceDay: '',
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
  const [professionInput, setProfessionInput] = useState('')
  const [filteredProfessions, setFilteredProfessions] = useState<string[]>([])
  const [showProfessionDropdown, setShowProfessionDropdown] = useState(false)
  const [highlightedProfessionIndex, setHighlightedProfessionIndex] = useState(-1)
  const [specialtyInput, setSpecialtyInput] = useState('')
  const [filteredSpecialties, setFilteredSpecialties] = useState<string[]>([])
  const [showSpecialtyDropdown, setShowSpecialtyDropdown] = useState(false)
  const [highlightedSpecialtyIndex, setHighlightedSpecialtyIndex] = useState(-1)
  const [allAvailableSpecialties, setAllAvailableSpecialties] = useState<string[]>([])
  const [languageInput, setLanguageInput] = useState('')
  const [filteredLanguages, setFilteredLanguages] = useState<string[]>([])
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)
  const [highlightedLanguageIndex, setHighlightedLanguageIndex] = useState(-1)
  const [allAvailableLanguages, setAllAvailableLanguages] = useState<string[]>([])
  const [expandedItems, setExpandedItems] = useState<{[key: number]: boolean}>({});
  const [showPassword, setShowPassword] = useState(false)
  const [authMessage, setAuthMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null)
  const [allAvailableProfessions, setAllAvailableProfessions] = useState<string[]>([]);

  // Ref'leri ekleyin:
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const signInButtonRef = useRef<HTMLButtonElement>(null)

  const [dropdowns, setDropdowns] = useState({
    specialties: false,
    languages: false
  })

  const [locationSearch, setLocationSearch] = useState('')
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([])
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false)
  const [isSearchingLocation, setIsSearchingLocation] = useState(false)

  // Organization auto-complete states
  const [, setOrganizationSearch] = useState('')
  const [organizationSuggestions, setOrganizationSuggestions] = useState<string[]>([])
  const [showOrganizationSuggestions, setShowOrganizationSuggestions] = useState(false)
  const [activeOrganizationSuggestionIndex, setActiveOrganizationSuggestionIndex] = useState(-1)
  const [allOrganizations, setAllOrganizations] = useState<string[]>([])

  const specialtiesRef = useRef<HTMLDivElement>(null)
  const languagesRef = useRef<HTMLDivElement>(null)
  const locationRef = useRef<HTMLDivElement>(null)
  const organizationRef = useRef<HTMLDivElement>(null)

  // Tüm organization'ları veritabanından çek
  useEffect(() => {
    fetchAllOrganizations()
    fetchAllProfessions()
    fetchAllSpecialties()
    fetchAllLanguages()
  }, [])

  const fetchAllOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('work_experience')
      
      if (error) {
        console.error('Error fetching organizations:', error)
        return
      }

      const organizations = new Set<string>()
      data.forEach(profile => {
        if (profile.work_experience && Array.isArray(profile.work_experience)) {
          profile.work_experience.forEach((exp: any) => {
            if (exp.organization && exp.organization.trim()) {
              organizations.add(exp.organization.trim())
            }
          })
        }
      })
      
      setAllOrganizations(Array.from(organizations).sort())
    } catch (err) {
      console.error('Error fetching organizations:', err)
    }
  }

  const fetchAllProfessions = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('profession')
        .not('profession', 'is', null)

      if (!error && data) {
        const usedProfessions = [...new Set(data.map(p => p.profession).filter(p => p && p.trim()))] as string[]
        const combinedProfessions = [...new Set([...PROFESSION_OPTIONS, ...usedProfessions])]
        combinedProfessions.sort()
        
        setAllAvailableProfessions(combinedProfessions)
      } else {
        setAllAvailableProfessions([...PROFESSION_OPTIONS])
      }
    } catch (err) {
      console.error('Error loading professions:', err)
      setAllAvailableProfessions([...PROFESSION_OPTIONS])
    }
  }

  const fetchAllSpecialties = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('specialties')
        .not('specialties', 'is', null)

      if (error) {
        console.error('Error fetching specialties:', error)
        return
      }

      const allSpecialties = new Set<string>()
      data.forEach(profile => {
        if (profile.specialties && Array.isArray(profile.specialties)) {
          profile.specialties.forEach((s: string) => {
            if (s.trim()) {
              allSpecialties.add(s.trim())
            }
          })
        }
      })

      const combinedSpecialties = [...new Set([...specialtiesOptions, ...Array.from(allSpecialties)])]
      combinedSpecialties.sort()
      setAllAvailableSpecialties(combinedSpecialties)
    } catch (err) {
      console.error('Error fetching specialties:', err)
      setAllAvailableSpecialties([...specialtiesOptions])
    }
  }

  const fetchAllLanguages = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('languages')
        .not('languages', 'is', null)

      if (error) {
        console.error('Error fetching languages:', error)
        return
      }

      const allLanguages = new Set<string>()
      data.forEach(profile => {
        if (profile.languages && Array.isArray(profile.languages)) {
          profile.languages.forEach((l: string) => {
            if (l.trim()) {
              allLanguages.add(l.trim())
            }
          })
        }
      })

      const combinedLanguages = [...new Set([...languageOptions, ...Array.from(allLanguages)])]
      combinedLanguages.sort()
      setAllAvailableLanguages(combinedLanguages)
    } catch (err) {
      console.error('Error fetching languages:', err)
      setAllAvailableLanguages([...languageOptions])
    }
  }

  useEffect(() => {
    if (userProfile && !editingSection) {
      setFormData({
        firstName: userProfile.full_name?.split(' ')[0] || '',
        lastName: userProfile.full_name?.split(' ').slice(1).join(' ') || '',
        email: currentUser?.email || '',
        password: '',
        profession: userProfile.profession || '',
        registrationNumber: userProfile.regulator_number || '',
        experienceDay: userProfile.experience_day || '',
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

  // Organization auto-complete fonksiyonları
  const handleOrganizationSearch = (searchTerm: string, _index: number) => {
    setOrganizationSearch(searchTerm)
    
    if (searchTerm.length < 2) {
      setOrganizationSuggestions([])
      setShowOrganizationSuggestions(false)
      return
    }

    const filtered = allOrganizations.filter(org =>
      org.toLowerCase().includes(searchTerm.toLowerCase())
    )
    
    setOrganizationSuggestions(filtered.slice(0, 5))
    setShowOrganizationSuggestions(true)
    setActiveOrganizationSuggestionIndex(-1)
  }

  const handleOrganizationSelect = (organization: string, index: number) => {
    const updated = [...formData.workExperience]
    updated[index].organization = organization
    setFormData({ ...formData, workExperience: updated })
    
    setShowOrganizationSuggestions(false)
    setOrganizationSearch('')
    setActiveOrganizationSuggestionIndex(-1)
  }

  const handleOrganizationKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (!showOrganizationSuggestions) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveOrganizationSuggestionIndex(prev => 
        prev < organizationSuggestions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveOrganizationSuggestionIndex(prev => 
        prev > 0 ? prev - 1 : -1
      )
    } else if (e.key === 'Enter' && activeOrganizationSuggestionIndex >= 0) {
      e.preventDefault()
      handleOrganizationSelect(organizationSuggestions[activeOrganizationSuggestionIndex], index)
    } else if (e.key === 'Escape') {
      setShowOrganizationSuggestions(false)
      setActiveOrganizationSuggestionIndex(-1)
    }
  }

  // Profession input handlers
  const handleProfessionInputChange = (value: string) => {
    setProfessionInput(value)
    setFormData({ ...formData, profession: value })
    setHighlightedProfessionIndex(-1)
    
    if (value.trim()) {
      const filtered = allAvailableProfessions.filter(prof => 
        prof.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredProfessions(filtered)
      setShowProfessionDropdown(true)
    } else {
      setFilteredProfessions([])
      setShowProfessionDropdown(false)
    }
  }

  const selectProfession = (profession: string) => {
    setProfessionInput(profession)
    setFormData({ ...formData, profession })
    setShowProfessionDropdown(false)
    setHighlightedProfessionIndex(-1)
  }

  const handleProfessionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showProfessionDropdown) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedProfessionIndex(prev => {
          const next = prev + 1
          // allow highlighting special "+ Add" row at index = filteredProfessions.length
          const bounded = next > filteredProfessions.length ? filteredProfessions.length : next
          const result = prev === -1 ? 0 : bounded
          if (result >= 0 && result < filteredProfessions.length) {
            setProfessionInput(filteredProfessions[result])
          }
          return result
        })
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedProfessionIndex(prev => {
          if (prev === -1) return -1
          const next = prev - 1
          const result = next >= 0 ? next : filteredProfessions.length // allow jumping to "+ Add" row when moving above first
          if (result >= 0 && result < filteredProfessions.length) {
            setProfessionInput(filteredProfessions[result])
          }
          return result
        })
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedProfessionIndex >= 0 && highlightedProfessionIndex < filteredProfessions.length) {
          selectProfession(filteredProfessions[highlightedProfessionIndex])
        } else if (
          highlightedProfessionIndex === filteredProfessions.length ||
          filteredProfessions.length === 0
        ) {
          if (professionInput.trim() && !allAvailableProfessions.includes(professionInput.trim())) {
            const newProfession = professionInput.trim()
            setAllAvailableProfessions(prev => [...prev, newProfession].sort())
            selectProfession(newProfession)
          }
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowProfessionDropdown(false)
        setHighlightedProfessionIndex(-1)
        break
      default:
        break
    }
  }

  // Specialty input handlers
  const handleSpecialtyInputChange = (value: string) => {
    setSpecialtyInput(value)
    setHighlightedSpecialtyIndex(-1)
    
    if (value.trim()) {
      const filtered = allAvailableSpecialties.filter(spec => 
        spec.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredSpecialties(filtered)
      setShowSpecialtyDropdown(true)
    } else {
      setFilteredSpecialties([])
      setShowSpecialtyDropdown(false)
    }
  }

  const addSpecialty = (specialty: string) => {
    if (!formData.specialties.includes(specialty)) {
      setFormData({
        ...formData,
        specialties: [...formData.specialties, specialty]
      })
      
      // Eğer yeni bir specialty eklendiyse, listeye ekle
      if (!allAvailableSpecialties.includes(specialty)) {
        setAllAvailableSpecialties(prev => [...prev, specialty].sort())
      }
    }
    setSpecialtyInput('')
    setShowSpecialtyDropdown(false)
    setHighlightedSpecialtyIndex(-1)
  }

  const handleSpecialtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSpecialtyDropdown) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedSpecialtyIndex(prev => {
          const next = prev + 1
          const bounded = next > filteredSpecialties.length ? filteredSpecialties.length : next
          const result = prev === -1 ? 0 : bounded
          if (result >= 0 && result < filteredSpecialties.length) {
            setSpecialtyInput(filteredSpecialties[result])
          }
          return result
        })
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedSpecialtyIndex(prev => {
          if (prev === -1) return -1
          const next = prev - 1
          const result = next >= 0 ? next : filteredSpecialties.length
          if (result >= 0 && result < filteredSpecialties.length) {
            setSpecialtyInput(filteredSpecialties[result])
          }
          return result
        })
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedSpecialtyIndex >= 0 && highlightedSpecialtyIndex < filteredSpecialties.length) {
          addSpecialty(filteredSpecialties[highlightedSpecialtyIndex])
        } else if (
          highlightedSpecialtyIndex === filteredSpecialties.length ||
          filteredSpecialties.length === 0
        ) {
          if (specialtyInput.trim() && !allAvailableSpecialties.includes(specialtyInput.trim())) {
            addSpecialty(specialtyInput.trim())
          }
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowSpecialtyDropdown(false)
        setHighlightedSpecialtyIndex(-1)
        break
      default:
        break
    }
  }

  // Language input handlers
  const handleLanguageInputChange = (value: string) => {
    setLanguageInput(value)
    setHighlightedLanguageIndex(-1)
    
    if (value.trim()) {
      const filtered = allAvailableLanguages.filter(lang => 
        lang.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredLanguages(filtered)
      setShowLanguageDropdown(true)
    } else {
      setFilteredLanguages([])
      setShowLanguageDropdown(false)
    }
  }

  const addLanguage = (language: string) => {
    if (!formData.languages.includes(language)) {
      setFormData({
        ...formData,
        languages: [...formData.languages, language]
      })
      
      // Eğer yeni bir language eklendiyse, listeye ekle
      if (!allAvailableLanguages.includes(language)) {
        setAllAvailableLanguages(prev => [...prev, language].sort())
      }
    }
    setLanguageInput('')
    setShowLanguageDropdown(false)
    setHighlightedLanguageIndex(-1)
  }

  const handleLanguageKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showLanguageDropdown) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedLanguageIndex(prev => {
          const next = prev + 1
          const bounded = next > filteredLanguages.length ? filteredLanguages.length : next
          const result = prev === -1 ? 0 : bounded
          if (result >= 0 && result < filteredLanguages.length) {
            setLanguageInput(filteredLanguages[result])
          }
          return result
        })
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedLanguageIndex(prev => {
          if (prev === -1) return -1
          const next = prev - 1
          const result = next >= 0 ? next : filteredLanguages.length
          if (result >= 0 && result < filteredLanguages.length) {
            setLanguageInput(filteredLanguages[result])
          }
          return result
        })
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedLanguageIndex >= 0 && highlightedLanguageIndex < filteredLanguages.length) {
          addLanguage(filteredLanguages[highlightedLanguageIndex])
        } else if (
          highlightedLanguageIndex === filteredLanguages.length ||
          filteredLanguages.length === 0
        ) {
          if (languageInput.trim() && !allAvailableLanguages.includes(languageInput.trim())) {
            addLanguage(languageInput.trim())
          }
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowLanguageDropdown(false)
        setHighlightedLanguageIndex(-1)
        break
      default:
        break
    }
  }

  const toggleItem = (index: number) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const startEditing = (section: string, _index?: number) => {
    if (section.startsWith('experience-')) {
      setEditingSection(section)
      setTempFormData({ ...formData })
    } else {
      setEditingSection(section)
      setTempFormData({ ...formData })
    }
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
        updateData.experience_day = formData.experienceDay
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
      } else if (section === 'experience' || section.startsWith('experience-')) {
        // Sort experiences before saving
        const sorted = [...formData.workExperience].sort((a: any, b: any) => {
          const isAPresent = (a.end_date || '').toLowerCase() === 'present'
          const isBPresent = (b.end_date || '').toLowerCase() === 'present'

          const parseDate = (d: string | undefined) => {
            if (!d) return null
            const t = d.toLowerCase()
            if (t === 'present') return new Date() as Date
            const dt = new Date(d)
            return isNaN(dt.getTime()) ? null : dt
          }

          const aStart = parseDate(a.start_date)
          const bStart = parseDate(b.start_date)
          const aEnd = parseDate(a.end_date)
          const bEnd = parseDate(b.end_date)

          // Current jobs first
          if (isAPresent !== isBPresent) return isAPresent ? -1 : 1

          // If both current or both not, compare by end date desc (newer first)
          if (!isAPresent && aEnd && bEnd && aEnd.getTime() !== bEnd.getTime()) {
            return bEnd.getTime() - aEnd.getTime()
          }

          // Tie-breaker: longer duration first
          const aDuration = (aStart && aEnd ? (aEnd.getTime() - aStart.getTime()) : 0)
          const bDuration = (bStart && bEnd ? (bEnd.getTime() - bStart.getTime()) : 0)
          if (aDuration !== bDuration) return bDuration - aDuration

          // Final fallback: stable order
          return 0
        })
        updateData.work_experience = sorted
        // also reflect sorted in local state so UI updates immediately
        setFormData(prev => ({ ...prev, workExperience: sorted }))
      } else if (section === 'contact') {
        updateData.contact_email = formData.contactEmail
        updateData.phone = formData.phone
        updateData.website = formData.website
      } else if (section === 'name') {
        updateData.full_name = `${formData.firstName} ${formData.lastName}`.trim();
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', currentUser.id)
      
      if (error) throw error
      
      if (section === 'email') {
        alert('Email updated! Please check your new email for verification.')
      }
      
      // Güncellenmiş profili al
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single()
      
      if (updatedProfile) {
        // Eğer deneyim güncellendiyse, cache/stale veri sorunlarını önlemek için
        // en azından work_experience alanını yerelde sıraladığımız liste ile güncelle
        if (section === 'experience' || section.startsWith('experience-')) {
          (updatedProfile as any).work_experience = (formData.workExperience || [])
        }
        // Tüm bileşenleri yeni profil verisi ile güncelle
        if (updateProfileInState) {
          updateProfileInState(updatedProfile)
        } else {
          // Fallback: window üzerinden çağır
          const globalWindow = window as any
          if (globalWindow.updateProfileInState) {
            globalWindow.updateProfileInState(updatedProfile)
          }
        }
        
        // Profili yeniden yükle
        onSuccess()
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
      if (organizationRef.current && !organizationRef.current.contains(event.target as Node)) {
        setShowOrganizationSuggestions(false)
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

  const specialtiesOptions = [
    'Orthopaedics', 'Neurology', 'Cardiorespiratory', 'Paediatrics',
    'Mental Health', 'Community Care', 'Acute Care', 'Sports Medicine',
    'Geriatrics', 'Oncology', 'Dysphagia', 'Voice Disorders'
  ]

  const languageOptions = [
    'English','Turkish','Spanish','French','German','Italian','Portuguese','Arabic','Hindi','Urdu','Polish','Romanian',
    // ... diğer diller
  ];
  
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
    setAuthMessage(null) // Önceki mesajı temizle
    
    if (isSignUp) {
      if (!formData.acceptTerms) {
        setAuthMessage({ type: 'error', text: 'Please accept Terms & Privacy Policy' })
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
          setAuthMessage({ type: 'error', text: error.message })
          return
        }
        
        const user = data.user
        const session = data.session
        
        if (!user || !user.id) {
          setAuthMessage({ type: 'error', text: 'User creation failed - no user ID returned' })
          return
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
            experience_day: formData.experienceDay,
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
          setAuthMessage({ type: 'error', text: `Failed to save profile: ${upsertError.message}` })
          return
        }
        
        console.log('Profile saved successfully!')
        setAuthMessage({ type: 'success', text: 'Account created successfully!' })
        
        // 1.5 saniye bekle ve kapat
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 1500)
      } catch (err: any) {
        console.error('Signup error:', err)
        setAuthMessage({ type: 'error', text: err.message })
      } finally {
        setLoading(false)
      }
    } else {
      // Sign In
      setLoading(true)
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        })
        if (error) {
          setAuthMessage({ type: 'error', text: 'Invalid email or password' })
          return
        }
        
        setAuthMessage({ type: 'success', text: 'Successfully signed in!' })
        
        // 1 saniye bekle ve kapat
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 1000)
      } catch (err: any) {
        console.error('Sign in error:', err)
        setAuthMessage({ type: 'error', text: err.message })
      } finally {
        setLoading(false)
      }
    }
  }

  const handleEmailKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSignUp) {
      e.preventDefault()
      passwordRef.current?.focus()
    }
  }

  const handlePasswordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSignUp) {
      e.preventDefault()
      signInButtonRef.current?.click()
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
                  className="absolute top-4 right-4 flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full hover:bg-blue-700"
                  title="View Full Profile"
                >
                  <User className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  {userProfile?.avatar_url ? (
                    <Avatar src={userProfile.avatar_url} name={userProfile.full_name} className="w-16 h-16" useInlineSize={false} />
                  ) : (
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {userProfile?.full_name?.charAt(0) || 'U'}
                  </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900">{userProfile?.full_name || 'User'}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-blue-600 font-medium">{userProfile?.profession || 'Therapist'}</p>
                      {(() => {
                        const totalExperience = calculateTotalExperience(userProfile?.work_experience || [])
                        return totalExperience !== '0' && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                            {totalExperience}
                          </span>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Name Section */}
              <div 
                className="bg-gray-50 rounded-lg p-3 relative group hover:bg-gray-100 transition-colors"
                onMouseEnter={(e) => e.currentTarget.querySelector('.edit-icon')?.classList.remove('hidden')}
                onMouseLeave={(e) => e.currentTarget.querySelector('.edit-icon')?.classList.add('hidden')}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Name</p>
                    {editingSection === 'name' ? (
                      <div className="space-y-2">
                        <input 
                          type="text"
                          placeholder="First Name"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        />
                        <input 
                          type="text"
                          placeholder="Last Name"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        />
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-gray-900">{userProfile?.full_name}</p>
                    )}
                  </div>
                  {editingSection === 'name' ? (
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => saveSection('name')}
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
                      onClick={() => startEditing('name')}
                      className="edit-icon hidden p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Email Section */}
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

              {/* CV Maker Button */}
              <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                <p className="text-sm font-bold text-amber-900 mb-2">📄 CV Maker</p>
                <p className="text-sm text-amber-800 mb-3">Generate a professional CV from your profile information</p>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('openCVMaker'))}
                  className="flex items-center justify-center w-full py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
                  title="Generate CV"
                >
                  <Briefcase className="w-5 h-5" />
                </button>
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
                        {userProfile?.experience_year && (
                          <p className="text-xs text-gray-600 mt-1">
                            {userProfile.experience_year} years of experience
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
                    {editingSection?.startsWith('experience-') ? (
                      <div className="space-y-3">
                        {(() => {
                          const editIndex = parseInt((editingSection as string).split('-')[1] || '-1', 10)
                          const exp = formData.workExperience[editIndex]
                          if (!exp) return null
                          const isCurrentJob = exp.end_date?.toLowerCase() === 'present'
                          return (
                            <div className="bg-white border border-gray-300 rounded-lg p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900">Edit Experience</p>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => saveSection('experience')}
                                    disabled={loading}
                                    className="p-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
                                    type="button"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={cancelEditing}
                                    className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                                    type="button"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              <input 
                                type="text"
                                placeholder="Job Title"
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                value={exp.title || ''}
                                onChange={(e) => {
                                  const updated = [...formData.workExperience]
                                  updated[editIndex].title = e.target.value
                                  setFormData({ ...formData, workExperience: updated })
                                }}
                              />
                              <div className="relative" ref={organizationRef}>
                                <input 
                                  type="text"
                                  placeholder="Organization"
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                  value={exp.organization || ''}
                                  onChange={(e) => {
                                    const updated = [...formData.workExperience]
                                    updated[editIndex].organization = e.target.value
                                    setFormData({ ...formData, workExperience: updated })
                                    handleOrganizationSearch(e.target.value, editIndex)
                                  }}
                                  onKeyDown={(e) => handleOrganizationKeyDown(e, editIndex)}
                                  onFocus={() => {
                                    if (exp.organization) {
                                      handleOrganizationSearch(exp.organization, editIndex)
                                    }
                                  }}
                                />
                                {showOrganizationSuggestions && organizationSuggestions.length > 0 && (
                                  <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                    {organizationSuggestions.map((org, idx) => (
                                      <div
                                        key={org}
                                        className={`px-3 py-2 cursor-pointer ${
                                          idx === activeOrganizationSuggestionIndex 
                                            ? 'bg-blue-100 text-blue-800' 
                                            : 'hover:bg-gray-100'
                                        }`}
                                        onClick={() => handleOrganizationSelect(org, editIndex)}
                                      >
                                        {org}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <input 
                                  type="date"
                                  placeholder="Start Date"
                                  className="px-2 py-1 text-sm border border-gray-300 rounded"
                                  value={exp.start_date || ''}
                                  onChange={(e) => {
                                    const updated = [...formData.workExperience]
                                    updated[editIndex].start_date = e.target.value
                                    setFormData({ ...formData, workExperience: updated })
                                  }}
                                />
                                <div className="flex gap-2">
                                  <input 
                                    type="date"
                                    placeholder={isCurrentJob ? "Present" : "End Date"}
                                    className={`flex-1 px-2 py-1 text-sm border border-gray-300 rounded ${isCurrentJob ? 'bg-gray-100' : ''}`}
                                    value={isCurrentJob ? "" : (exp.end_date || '')}
                                    disabled={isCurrentJob}
                                    onChange={(e) => {
                                      const updated = [...formData.workExperience]
                                      updated[editIndex].end_date = e.target.value
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
                                    updated[editIndex].end_date = e.target.checked ? 'Present' : ''
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
                                  updated[editIndex].description = e.target.value
                                  setFormData({ ...formData, workExperience: updated })
                                }}
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  const updated = formData.workExperience.filter((_: any, i: number) => i !== editIndex)
                                  
                                  // State'i hemen güncelle
                                  setFormData({ ...formData, workExperience: updated })
                                  
                                  // Veritabanını güncelle
                                  setLoading(true)
                                  try {
                                    const { error } = await supabase
                                      .from('profiles')
                                      .update({ work_experience: updated })
                                      .eq('id', currentUser.id)
                                    
                                    if (error) throw error
                                    
                                    // Global state'i güncelle
                                    if (updateProfileInState) {
                                      updateProfileInState({
                                        ...userProfile,
                                        work_experience: updated
                                      } as any)
                                    }
                                    
                                    setEditingSection(null)
                                  } catch (err: any) {
                                    console.error('Remove error:', err)
                                    alert(`Error: ${err.message}`)
                                    onSuccess() // Hata durumunda verileri yeniden yükle
                                  } finally {
                                    setLoading(false)
                                  }
                                }}
                                className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                              >
                                Remove
                              </button>
                            </div>
                          )
                        })()}
                      </div>
                    ) : (
                      (formData.workExperience && formData.workExperience.length > 0) || (userProfile?.work_experience && userProfile.work_experience.length > 0) ? (
                        <div className="space-y-3">
                          {(() => {
                            const sourceList = (formData.workExperience && formData.workExperience.length > 0)
                              ? formData.workExperience
                              : (userProfile?.work_experience || [])
                            return getSortedExperiences(sourceList).map((exp: any, index: number) => {
                              const originalIndex = sourceList === formData.workExperience
                                ? formData.workExperience.indexOf(exp)
                                : index
                            const isCurrentJob = exp.end_date?.toLowerCase() === 'present'
                            const startDate = exp.start_date ? new Date(exp.start_date) : null
                            const endDate = isCurrentJob ? new Date() : (exp.end_date ? new Date(exp.end_date) : null)
                            
                            let duration = ''
                            if (startDate && endDate) {
                              const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
                              const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25))
                              const diffMonths = Math.floor((diffTime % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44))
                              const diffDays = Math.floor((diffTime % (1000 * 60 * 60 * 24 * 30.44)) / (1000 * 60 * 60 * 24))
                              
                              if (diffYears > 0) {
                                duration = `${diffYears} yr${diffYears > 1 ? 's' : ''}`
                                if (diffMonths > 0) {
                                  duration += ` ${diffMonths} mo${diffMonths > 1 ? 's' : ''}`
                                }
                              } else if (diffMonths > 0) {
                                duration = `${diffMonths} mo${diffMonths > 1 ? 's' : ''}`
                                if (diffDays > 0) {
                                  duration += ` ${diffDays} day${diffDays > 1 ? 's' : ''}`
                                }
                              } else {
                                duration = `${diffDays} day${diffDays > 1 ? 's' : ''}`
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
                                  <div className="ml-2 flex items-center gap-1 flex-shrink-0">
                                    <button
                                      onClick={() => startEditing(`experience-${originalIndex}`)}
                                      className="text-gray-400 hover:text-blue-600 transition-colors"
                                      title="Edit"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    {exp.description && (
                                      <button
                                        onClick={() => toggleItem(index)}
                                        className="text-gray-400 hover:text-blue-600 transition-colors"
                                        title="Expand"
                                      >
                                        <ChevronDown className={`w-4 h-4 transition-transform ${expandedItems[index] ? 'rotate-180' : ''}`} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {exp.description && expandedItems[index] && (
                                  <div className="mt-3 pt-3 border-t border-gray-100">
                                    <p className="text-sm text-gray-700 whitespace-pre-line">{exp.description}</p>
                                  </div>
                                )}
                              </div>
                            )
                            })
                          })()}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">Click edit to add work experience</p>
                      )
                    )}
                  </div>
                  <div className="">
                    <button
                      type="button"
                      onClick={() => {
                        const newIndex = formData.workExperience.length
                        setFormData({
                          ...formData,
                          workExperience: [...formData.workExperience, { title: '', organization: '', start_date: '', end_date: '', description: '' }]
                        })
                        setEditingSection(`experience-${newIndex}`)
                      }}
                      className="absolute top-2 right-2 p-1 bg-green-500 text-white rounded-full hover:bg-green-600 shadow-sm"
                      title="Add Experience"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
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
                ref={emailRef}
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
                onKeyDown={handleEmailKeyDown}
              />
              
              <div className="relative">
                <input 
                  ref={passwordRef}
                  type={showPassword ? "text" : "password"}
                  placeholder="Password" 
                  required
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  onKeyDown={handlePasswordKeyDown}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Auth Message - Şifre ile Buton Arası */}
              {authMessage && (
                <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
                  authMessage.type === 'error' 
                    ? 'bg-red-50 text-red-700 border border-red-200' 
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}>
                  {authMessage.text}
                </div>
              )}

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

                  {/* Profession Input - YENİ YAPI */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Type to search or add new profession..."
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                      value={professionInput}
                      onChange={(e) => handleProfessionInputChange(e.target.value)}
                      onKeyDown={handleProfessionKeyDown}
                      onFocus={() => {
                        if (professionInput.trim()) {
                          const filtered = allAvailableProfessions.filter(prof => 
                            prof.toLowerCase().includes(professionInput.toLowerCase())
                          )
                          setFilteredProfessions(filtered)
                          setShowProfessionDropdown(true)
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setShowProfessionDropdown(false)
                          setHighlightedProfessionIndex(-1)
                        }, 200)
                      }}
                    />
                    {showProfessionDropdown && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredProfessions.map((prof, index) => (
                          <button
                            key={prof}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              selectProfession(prof)
                            }}
                            onMouseEnter={() => setHighlightedProfessionIndex(index)}
                            className={`w-full text-left px-4 py-2 text-sm ${
                              index === highlightedProfessionIndex 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'text-gray-700 hover:bg-blue-50'
                            }`}
                          >
                            {prof}
                          </button>
                        ))}
                        {professionInput.trim() && !allAvailableProfessions.includes(professionInput.trim()) && (
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              const newProfession = professionInput.trim()
                              setAllAvailableProfessions(prev => [...prev, newProfession].sort())
                              selectProfession(newProfession)
                            }}
                            onMouseEnter={() => setHighlightedProfessionIndex(filteredProfessions.length)}
                            className={`w-full text-left px-4 py-2 text-sm border-t border-gray-200 ${
                              highlightedProfessionIndex === filteredProfessions.length
                                ? 'bg-green-100 text-green-800'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                          >
                            + Add "{professionInput.trim()}"
                          </button>
                        )}
                      </div>
                    )}
                  </div>

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

                  {/* Specialties Input - YENİ YAPI */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Type to search or add new specialty..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                      value={specialtyInput}
                      onChange={(e) => handleSpecialtyInputChange(e.target.value)}
                      onKeyDown={handleSpecialtyKeyDown}
                      onFocus={() => {
                        if (specialtyInput.trim()) {
                          const filtered = allAvailableSpecialties.filter(spec => 
                            spec.toLowerCase().includes(specialtyInput.toLowerCase())
                          )
                          setFilteredSpecialties(filtered)
                          setShowSpecialtyDropdown(true)
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setShowSpecialtyDropdown(false)
                          setHighlightedSpecialtyIndex(-1)
                        }, 200)
                      }}
                    />
                    {showSpecialtyDropdown && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredSpecialties.map((spec, index) => (
                          <button
                            key={spec}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              addSpecialty(spec)
                            }}
                            onMouseEnter={() => setHighlightedSpecialtyIndex(index)}
                            className={`w-full text-left px-4 py-2 text-sm ${
                              index === highlightedSpecialtyIndex 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'text-gray-700 hover:bg-blue-50'
                            }`}
                          >
                            {spec}
                          </button>
                        ))}
                        {specialtyInput.trim() && !allAvailableSpecialties.includes(specialtyInput.trim()) && (
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              addSpecialty(specialtyInput.trim())
                            }}
                            onMouseEnter={() => setHighlightedSpecialtyIndex(filteredSpecialties.length)}
                            className={`w-full text-left px-4 py-2 text-sm border-t border-gray-200 ${
                              highlightedSpecialtyIndex === filteredSpecialties.length
                                ? 'bg-green-100 text-green-800'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                          >
                            + Add "{specialtyInput.trim()}"
                          </button>
                        )}
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

                  {/* Languages Input - YENİ YAPI */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Type to search or add new language..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                      value={languageInput}
                      onChange={(e) => handleLanguageInputChange(e.target.value)}
                      onKeyDown={handleLanguageKeyDown}
                      onFocus={() => {
                        if (languageInput.trim()) {
                          const filtered = allAvailableLanguages.filter(lang => 
                            lang.toLowerCase().includes(languageInput.toLowerCase())
                          )
                          setFilteredLanguages(filtered)
                          setShowLanguageDropdown(true)
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setShowLanguageDropdown(false)
                          setHighlightedLanguageIndex(-1)
                        }, 200)
                      }}
                    />
                    {showLanguageDropdown && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredLanguages.map((lang, index) => (
                          <button
                            key={lang}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              addLanguage(lang)
                            }}
                            onMouseEnter={() => setHighlightedLanguageIndex(index)}
                            className={`w-full text-left px-4 py-2 text-sm ${
                              index === highlightedLanguageIndex 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'text-gray-700 hover:bg-blue-50'
                            }`}
                          >
                            {lang}
                          </button>
                        ))}
                        {languageInput.trim() && !allAvailableLanguages.includes(languageInput.trim()) && (
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              addLanguage(languageInput.trim())
                            }}
                            onMouseEnter={() => setHighlightedLanguageIndex(filteredLanguages.length)}
                            className={`w-full text-left px-4 py-2 text-sm border-t border-gray-200 ${
                              highlightedLanguageIndex === filteredLanguages.length
                                ? 'bg-green-100 text-green-800'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                          >
                            + Add "{languageInput.trim()}"
                          </button>
                        )}
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
                ref={signInButtonRef}
                type="button"
                onClick={handleSubmit}
                disabled={loading || (isSignUp && !formData.acceptTerms)}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
              >
                {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
              </button>

              {/* Şifremi Unuttum - Sadece Sign In'de */}
              {!isSignUp && (
                <div className="text-center">
                  <button 
                    type="button"
                    className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
                    onClick={() => {
                      setAuthMessage({ type: 'error', text: 'Password reset feature coming soon!' })
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <div className="text-center">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsSignUp(!isSignUp)
                    setAuthMessage(null)
                  }}
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