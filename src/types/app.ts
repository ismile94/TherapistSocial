// ===== APP TYPES =====

export interface Profile {
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
  qualifications?: Qualification[]
  work_experience?: WorkExperience[]
  availability?: any
  phone?: string
  website?: string
  email?: string
  bio?: string
  contact_email?: string
  regulator_number?: string
  avatar_url?: string | null
  connection_stats?: ConnectionStats
  is_connected?: boolean
  connection_status?: 'pending' | 'accepted' | 'rejected' | 'not_connected'
  profile_views?: number
}

export interface Qualification {
  id?: string
  degree: string
  institution: string
  year: string
  field?: string
}

export interface WorkExperience {
  id?: string
  role: string
  company: string
  start_date: string
  end_date?: string
  description?: string
  is_current?: boolean
}

export interface Connection {
  id: string
  created_at: string
  sender_id: string
  receiver_id: string
  status: 'pending' | 'accepted' | 'rejected'
  sender?: Profile
  receiver?: Profile
}

export interface ConnectionStats {
  followers_count: number
  following_count: number
  connection_count: number
}

export interface Conversation {
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

export interface Message {
  id: string
  created_at: string
  conversation_id: string
  sender_id: string
  content: string
  read: boolean
  sender?: Profile
}

export interface ChatBox {
  id: string
  conversation: Conversation
  isMinimized: boolean
  isOpen: boolean
}

export interface ConversationMetadata {
  isMuted: boolean
  isStarred: boolean
  isArchived: boolean
}

export interface PostMetadata {
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
  // New post creation features
  poll?: { question: string; options: string[]; duration: number; position?: 'before' | 'after'; votes?: Record<string, number>; voters?: string[] } | null
  mood?: string
  location?: string
  scheduled_at?: string | null
  album?: string[]
}

export interface CommunityPost {
  id: string
  created_at: string
  updated_at: string
  user_id: string
  title: string
  content: string
  post_metadata: PostMetadata
  shared_post_id?: string | null
  user?: Profile
  replies_count?: number
  likes_count?: number
  emoji_reactions?: { emoji: string; count: number }[]
  original_post?: CommunityPost | null
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  updated_at?: string
  parent_reply_id?: string | null
  user: Profile
  replies?: Comment[]
}

export interface FeedFilters {
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

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  read: boolean
  created_at: string
  related_entity_id?: string
  related_entity_type?: string
  actor_id?: string
  actor?: Profile
  metadata?: Record<string, any>
}

export interface UserSettings {
  email_notifications: boolean
  push_notifications: boolean
  profile_visibility: 'public' | 'connections' | 'private'
  message_permissions: 'everyone' | 'connections' | 'network'
  language: string
  timezone: string
  email_connection_requests: boolean
  email_messages: boolean
  email_community_posts: boolean
  email_post_reactions: boolean
  email_comments: boolean
  email_mentions: boolean
  email_events: boolean
  push_messages: boolean
  push_connection_activity: boolean
  push_post_reactions: boolean
  push_comments: boolean
  push_mentions: boolean
  push_events: boolean
  two_factor_enabled: boolean
  two_factor_secret: string | null
}

// ===== CONSTANTS =====

export const EMOJI_REACTIONS = [
  { emoji: '👍', label: 'Like' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '😂', label: 'Haha' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '💡', label: 'Insightful' }
]

export const PROFESSION_OPTIONS = [
  'Physiotherapist', 'Occupational Therapist', 'Speech & Language Therapist', 
  'Practitioner psychologist', 'Registered psychologist', 'Clinical psychologist', 
  'Forensic psychologist', 'Counselling psychologist', 'Health psychologist', 
  'Educational psychologist', 'Occupational psychologist', 'Sport and exercise psychologist', 
  'Dietitian/Dietician', 'Chiropodist', 'Podiatrist', 'Doctor', 'Nurse', 'Paramedic', 
  'Psychologist', 'Clinical scientist', 'Hearing aid dispenser', 'Orthoptist', 
  'Prosthetist', 'Orthotist', 'Radiographer', 'Diagnostic radiographer', 
  'Therapeutic radiographer', 'Speech and language/Speech therapist', 'Pharmacist', 
  'Social Worker', 'Care Assistant', 'Art Psychotherapist', 'Art therapist', 
  'Dramatherapist', 'Music therapist', 'Biomedical scientist', 
  'Operating Department Practitioner (ODP)', 'Midwife', 'Genetic Counsellor', 
  'Dental Hygienist', 'Dental Therapist', 'Orthodontic Therapist', 
  'Clinical Physiologist', 'Audiologist'
]

export const CLINICAL_AREA_OPTIONS = [
  'Neurology', 'Orthopaedics', 'Cardiorespiratory', 'Paediatrics',
  'Mental Health', 'Community Care', 'Acute Care', 'Sports Medicine',
  'Geriatrics', 'Oncology', 'Dysphagia', 'Voice Disorders', 'ICU/Critical Care',
  'Musculoskeletal', 'Women\'s Health', 'Palliative Care', 'Rehabilitation'
]

export const CONTENT_TYPE_OPTIONS = [
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

export const AUDIENCE_LEVEL_OPTIONS = [
  'Student',
  'Junior professional', 
  'Experienced clinician',
  'Researcher/Academic',
  'All levels'
]

export const RELATED_CONDITIONS_OPTIONS = [
  'Stroke', 'COPD', 'Low back pain', 'Parkinson\'s', 'Dementia',
  'Arthritis', 'COVID-19', 'Spinal cord injury', 'Autism', 'Dysphagia',
  'Multiple Sclerosis', 'Cardiac conditions', 'Pulmonary diseases'
]

export const LANGUAGE_OPTIONS = [
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
]

// ===== HELPER FUNCTIONS =====

export const getSortedExperiences = (items: WorkExperience[]) => {
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

export function calculateTotalExperience(workExperience: WorkExperience[]): string {
  if (!workExperience || workExperience.length === 0) return '0'

  let totalYears = 0
  let totalMonths = 0
  let totalDays = 0

  workExperience.forEach((exp: WorkExperience) => {
    const startDate = exp.start_date ? new Date(exp.start_date) : null
    const endDateStr = exp.end_date?.toLowerCase()
    const endDate = endDateStr === 'present' ? new Date() : exp.end_date ? new Date(exp.end_date) : null

    if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      const diffTime = endDate.getTime() - startDate.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      totalDays += diffDays
    }
  })

  totalMonths = Math.floor(totalDays / 30)
  totalYears = Math.floor(totalMonths / 12)
  const remainingMonths = totalMonths % 12

  if (totalYears > 0 && remainingMonths > 0) {
    return `${totalYears} year${totalYears > 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`
  } else if (totalYears > 0) {
    return `${totalYears} year${totalYears > 1 ? 's' : ''}`
  } else if (totalMonths > 0) {
    return `${totalMonths} month${totalMonths > 1 ? 's' : ''}`
  } else if (totalDays > 0) {
    return `${totalDays} day${totalDays > 1 ? 's' : ''}`
  }
  return '0'
}

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  } else if (days === 1) {
    return 'Yesterday'
  } else if (days < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

