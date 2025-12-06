// ============================================
// Core Application Types
// ============================================

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
  availability?: Availability
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
  title: string
  institution: string
  year: string
  description?: string
}

export interface WorkExperience {
  id?: string
  title: string
  company: string
  start_date: string
  end_date: string
  description?: string
  is_current?: boolean
}

export interface Availability {
  monday?: string[]
  tuesday?: string[]
  wednesday?: string[]
  thursday?: string[]
  friday?: string[]
  saturday?: string[]
  sunday?: string[]
}

// ============================================
// Connection Types
// ============================================

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

// ============================================
// Messaging Types
// ============================================

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

// ============================================
// Community Types
// ============================================

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
  poll?: PollData | null
  mood?: string
  location?: string
  scheduled_at?: string | null
  album?: string[]
}

export interface PollData {
  question: string
  options: string[]
  duration: number
  position?: 'before' | 'after'
  votes?: Record<string, number>
  voters?: string[]
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

// ============================================
// Event Types
// ============================================

export interface Event {
  id: string
  title: string
  description: string
  start_time: string
  end_time?: string
  location: string
  organizer_id: string
  max_participants?: number
  registration_type: 'rsvp' | 'automatic'
  category: string
  thumbnail_url?: string
  created_at: string
  updated_at: string
  organizer?: {
    id: string
    full_name: string
    profession?: string
    avatar_url?: string
  }
  participant_count?: number
  is_participant?: boolean
}

export interface EventParticipant {
  id: string
  event_id: string
  user_id: string
  rsvp_status: boolean
  created_at: string
}

// ============================================
// Notification Types
// ============================================

export interface Notification {
  id: string
  user_id: string
  message: string
  type: string
  related_entity_type?: string
  related_entity_id?: string
  read: boolean
  clicked_at?: string
  created_at: string
  metadata?: Record<string, any>
  actor?: Profile
  post?: CommunityPost
  comment?: Comment
}

// ============================================
// Filter Types
// ============================================

export interface TherapistFilters {
  professions: string[]
  languages: string[]
  languageMode: 'OR' | 'AND'
}

// ============================================
// CV Maker Types
// ============================================

export interface CVMakerProps {
  userProfile: Profile
  onClose: () => void
}

// ============================================
// Emoji Reaction Type
// ============================================

export interface EmojiReaction {
  emoji: string
  label: string
}
