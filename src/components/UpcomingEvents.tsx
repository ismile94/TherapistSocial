import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useToast } from './useToast'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  X,
  Edit2,
  Trash2,
  CheckCircle,
  ExternalLink,
  Share2,
  Filter,
  ChevronDown,
  ChevronUp,
  Bell
} from 'lucide-react'
import type { Event } from '../types/index'

interface UpcomingEventsProps {
  currentUserId?: string
  userProfile?: any
}

const eventCategories = [
  { value: 'workshop', label: 'Workshop', icon: '📚' },
  { value: 'group_therapy', label: 'Group Therapy', icon: '👥' },
  { value: 'webinar', label: 'Webinar', icon: '🎥' },
  { value: 'networking', label: 'Networking', icon: '🤝' },
  { value: 'seminar', label: 'Seminar', icon: '🎓' },
  { value: 'other', label: 'Other', icon: '📅' }
]

export default function UpcomingEvents({ currentUserId, userProfile }: UpcomingEventsProps) {
  const toast = useToast()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showOrganizerPanel, setShowOrganizerPanel] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [participantStatuses, setParticipantStatuses] = useState<Record<string, boolean>>({})
  const widgetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadEvents()
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel('events_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events'
        },
        () => {
          loadEvents()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_participants'
        },
        () => {
          loadEvents()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId])

  const loadEvents = async () => {
    try {
      setLoading(true)
      const now = new Date().toISOString()
      
      // Load upcoming events
      let query = supabase
        .from('events')
        .select(`
          *,
          organizer:profiles!organizer_id(id, full_name, profession, avatar_url)
        `)
        .gte('start_time', now)
        .order('start_time', { ascending: true })
        .limit(10)

      const { data, error } = await query

      if (error) {
        // If table doesn't exist, show helpful message
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.warn('Events table does not exist. Please run the SQL migration first.')
          setEvents([])
          return
        }
        throw error
      }

      // Load participant counts and user's participation status
      const eventsWithParticipants = await Promise.all(
        (data || []).map(async (event) => {
          // Get participant count
          let participantCount = 0
          try {
            const { count, error: countError } = await supabase
              .from('event_participants')
              .select('*', { count: 'exact', head: true })
              .eq('event_id', event.id)
              .eq('rsvp_status', true)
            
            if (countError && countError.code !== '42P01') {
              console.error('Error loading participant count:', countError)
            } else {
              participantCount = count || 0
            }
          } catch (err) {
            console.error('Error in participant count query:', err)
          }

          // Check if current user is a participant
          let isParticipant = false
          if (currentUserId) {
            try {
              const { data: participant, error: participantError } = await supabase
                .from('event_participants')
                .select('rsvp_status')
                .eq('event_id', event.id)
                .eq('user_id', currentUserId)
                .maybeSingle()
              
              // If error is not "not found", log it, otherwise participant simply doesn't exist
              if (participantError && participantError.code !== 'PGRST116' && participantError.code !== '42P01') {
                console.error('Error checking participant status:', participantError)
              }
              
              isParticipant = participant?.rsvp_status || false
            } catch (err) {
              console.error('Error in participant status query:', err)
            }
          }

          return {
            ...event,
            participant_count: participantCount,
            is_participant: isParticipant
          }
        })
      )

      setEvents(eventsWithParticipants as Event[])
      
      // Store participant statuses
      const statuses: Record<string, boolean> = {}
      eventsWithParticipants.forEach(event => {
        statuses[event.id] = event.is_participant || false
      })
      setParticipantStatuses(statuses)
    } catch (error: any) {
      console.error('Error loading events:', error)
      toast.error('Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  const handleRSVP = async (eventId: string, currentStatus: boolean) => {
    if (!currentUserId) {
      toast.error('Please sign in to join events')
      return
    }

    try {
      if (currentStatus) {
        // Remove RSVP
        const { error } = await supabase
          .from('event_participants')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', currentUserId)

        if (error) {
          if (error.code === '42P01') {
            toast.error('Events feature not set up. Please contact administrator.')
            return
          }
          throw error
        }
        toast.success('You have left this event')
      } else {
        // Add RSVP
        const { error } = await supabase
          .from('event_participants')
          .insert({
            event_id: eventId,
            user_id: currentUserId,
            rsvp_status: true
          })

        if (error) {
          // If duplicate, update instead
          if (error.code === '23505') {
            const { error: updateError } = await supabase
              .from('event_participants')
              .update({ rsvp_status: true })
              .eq('event_id', eventId)
              .eq('user_id', currentUserId)
            
            if (updateError) {
              if (updateError.code === '42P01') {
                toast.error('Events feature not set up. Please contact administrator.')
                return
              }
              throw updateError
            }
          } else if (error.code === '42P01') {
            toast.error('Events feature not set up. Please contact administrator.')
            return
          } else {
            throw error
          }
        }
        toast.success('You have joined this event!')
      }
      
      await loadEvents()
    } catch (error: any) {
      console.error('Error toggling RSVP:', error)
      toast.error(error.message || 'Failed to update RSVP')
    }
  }

  const addToCalendar = (event: Event) => {
    const startDate = new Date(event.start_time)
    const endDate = event.end_time ? new Date(event.end_time) : new Date(startDate.getTime() + 60 * 60 * 1000) // Default 1 hour
    
    // Format dates for Google Calendar
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${formatDate(startDate)}/${formatDate(endDate)}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.location)}`
    
    window.open(googleCalendarUrl, '_blank')
    toast.info('Opening Google Calendar...')
  }

  const copyEventLink = (eventId: string) => {
    const link = `${window.location.origin}${window.location.pathname}?event=${eventId}`
    navigator.clipboard.writeText(link)
    toast.success('Event link copied to clipboard!')
  }

  const filteredEvents = filterCategory
    ? events.filter(e => e.category === filterCategory)
    : events

  const myEvents = events.filter(e => e.organizer_id === currentUserId)

  return (
    <>
      <div 
        ref={widgetRef}
        className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Upcoming Events
              {events.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-gray-500 font-normal">
                  <Bell className="w-3 h-3" />
                  {events.length}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              {currentUserId && (
                <>
                  {myEvents.length > 0 && (
                    <button
                      onClick={() => setShowOrganizerPanel(true)}
                      className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-white rounded transition-colors"
                      title="My Events"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                    title="Create Event"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-gray-600 hover:text-gray-800 rounded transition-colors"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Category Filter */}
          {isExpanded && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <Filter className="w-3 h-3 text-gray-500" />
              <button
                onClick={() => setFilterCategory(null)}
                className={`px-2 py-1 text-xs rounded-full transition-colors ${
                  filterCategory === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {eventCategories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setFilterCategory(cat.value)}
                  className={`px-2 py-1 text-xs rounded-full transition-colors flex items-center gap-1 ${
                    filterCategory === cat.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Events List */}
        {isExpanded && (
          <div className="max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                <p className="text-xs text-gray-500 mt-2">Loading events...</p>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="p-8 text-center">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-xs text-gray-600">No upcoming events</p>
                {currentUserId && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Create the first event
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedEvent(event)
                      setShowDetailModal(true)
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
                        {event.thumbnail_url ? (
                          <img src={event.thumbnail_url} alt={event.title} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <Calendar className="w-6 h-6 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm text-gray-900 truncate">{event.title}</h4>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                              <Clock className="w-3 h-3" />
                              <span>
                                {new Date(event.start_time).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Users className="w-3 h-3" />
                              <span>{event.participant_count || 0}</span>
                            </div>
                            {event.category && (
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">
                                {eventCategories.find(c => c.value === event.category)?.icon || '📅'}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRSVP(event.id, participantStatuses[event.id] || false)
                          }}
                          className={`mt-3 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            participantStatuses[event.id]
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {participantStatuses[event.id] ? (
                            <>
                              <CheckCircle className="w-3 h-3 inline mr-1" />
                              Joined
                            </>
                          ) : (
                            'Join / Katıl'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Collapsed Preview */}
        {!isExpanded && (
          <div className="p-4">
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent"></div>
                <span>Loading...</span>
              </div>
            ) : filteredEvents.length === 0 ? (
              <p className="text-xs text-gray-500">No upcoming events</p>
            ) : (
              <div className="space-y-2">
                {filteredEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-2 text-xs cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={() => {
                      setSelectedEvent(event)
                      setShowDetailModal(true)
                    }}
                  >
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="truncate flex-1">{event.title}</span>
                    <span className="text-gray-400">
                      {new Date(event.start_time).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </span>
                  </div>
                ))}
                {filteredEvents.length > 3 && (
                  <p className="text-xs text-gray-400 text-center pt-1">
                    +{filteredEvents.length - 3} more
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Event Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedEvent && (
          <EventDetailModal
            event={selectedEvent}
            currentUserId={currentUserId}
            isParticipant={participantStatuses[selectedEvent.id] || false}
            onRSVP={() => handleRSVP(selectedEvent.id, participantStatuses[selectedEvent.id] || false)}
            onAddToCalendar={() => addToCalendar(selectedEvent)}
            onShare={() => copyEventLink(selectedEvent.id)}
            onEdit={() => {
              setEventToEdit(selectedEvent)
              setShowEditModal(true)
              setShowDetailModal(false)
            }}
            onClose={() => {
              setShowDetailModal(false)
              setSelectedEvent(null)
            }}
          />
        )}
      </AnimatePresence>

      {/* Create Event Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <EventCreateModal
            currentUserId={currentUserId}
            userProfile={userProfile}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false)
              loadEvents()
              toast.success('Event created successfully!')
            }}
          />
        )}
      </AnimatePresence>

      {/* Organizer Panel */}
      <AnimatePresence>
        {showOrganizerPanel && currentUserId && (
          <EventOrganizerPanel
            currentUserId={currentUserId}
            onClose={() => setShowOrganizerPanel(false)}
            onEventUpdated={loadEvents}
            onEditEvent={(event) => {
              setEventToEdit(event)
              setShowEditModal(true)
              setShowOrganizerPanel(false)
            }}
          />
        )}
      </AnimatePresence>

      {/* Edit Event Modal */}
      <AnimatePresence>
        {showEditModal && eventToEdit && (
          <EventEditModal
            event={eventToEdit}
            currentUserId={currentUserId}
            onClose={() => {
              setShowEditModal(false)
              setEventToEdit(null)
            }}
            onSuccess={() => {
              setShowEditModal(false)
              setEventToEdit(null)
              loadEvents()
              toast.success('Event updated successfully!')
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// Event Detail Modal Component
function EventDetailModal({
  event,
  currentUserId,
  isParticipant,
  onRSVP,
  onAddToCalendar,
  onShare,
  onEdit,
  onClose
}: {
  event: Event
  currentUserId?: string
  isParticipant: boolean
  onRSVP: () => void
  onAddToCalendar: () => void
  onShare: () => void
  onEdit?: () => void
  onClose: () => void
}) {
  const toast = useToast()
  const [participants, setParticipants] = useState<any[]>([])
  const [loadingParticipants, setLoadingParticipants] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)
  const startDate = new Date(event.start_time)
  const endDate = event.end_time ? new Date(event.end_time) : null

  const loadParticipants = async () => {
    if (loadingParticipants || participants.length > 0) return
    
    try {
      setLoadingParticipants(true)
      const { data, error } = await supabase
        .from('event_participants')
        .select(`
          *,
          user:profiles!user_id(id, full_name, profession, avatar_url)
        `)
        .eq('event_id', event.id)
        .eq('rsvp_status', true)

      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          toast.error('Events feature not set up. Please run the SQL migration first.')
          setParticipants([])
          return
        }
        throw error
      }
      setParticipants(data || [])
    } catch (error: any) {
      console.error('Error loading participants:', error)
      toast.error('Failed to load participants')
      setParticipants([])
    } finally {
      setLoadingParticipants(false)
    }
  }

  const handleViewParticipants = () => {
    if (!showParticipants) {
      setShowParticipants(true)
      loadParticipants()
    } else {
      setShowParticipants(false)
    }
  }

  const handleProfileClick = async (userId: string) => {
    try {
      // Profile verisini yükle ve modal'ı aç
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      
      // User profile modal'ını açmak için custom event
      window.dispatchEvent(new CustomEvent('openUserProfileModal', { 
        detail: { profile: data } 
      }))
    } catch (err) {
      console.error('Error loading user profile:', err)
      toast.error('Failed to load profile')
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
      >
        {/* Header */}
        <div className="relative">
          {event.thumbnail_url && (
            <img
              src={event.thumbnail_url}
              alt={event.title}
              className="w-full h-48 object-cover"
            />
          )}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center hover:bg-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {/* Title and Category */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{event.title}</h2>
              {event.category && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm">
                  {eventCategories.find(c => c.value === event.category)?.icon}
                  {eventCategories.find(c => c.value === event.category)?.label}
                </span>
              )}
            </div>
          </div>

          {/* Event Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {startDate.toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
                <p className="text-sm text-gray-600">
                  {startDate.toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                  {endDate && ` - ${endDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Location</p>
                <p className="text-sm text-gray-600 break-words">{event.location}</p>
                {event.location.startsWith('http') && (
                  <a
                    href={event.location}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 text-xs mt-1 inline-flex items-center gap-1"
                  >
                    Open link <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              {(event.participant_count || 0) > 0 ? (
                <button
                  onClick={handleViewParticipants}
                  className="flex-1 text-left"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900">Participants</p>
                  </div>
                  <p className="text-sm text-gray-600">
                    {event.participant_count || 0}
                    {event.max_participants && ` / ${event.max_participants}`}
                  </p>
                  {showParticipants && (
                    <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                      {loadingParticipants ? (
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <div className="animate-spin h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                          Loading...
                        </div>
                      ) : participants.length === 0 ? (
                        <p className="text-xs text-gray-500">No participants yet</p>
                      ) : (
                        participants.map((participant: any) => (
                          <button
                            key={participant.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              participant.user?.id && handleProfileClick(participant.user.id)
                            }}
                            className="w-full flex items-center gap-2 text-left hover:bg-gray-50 p-2 rounded-lg transition-colors"
                          >
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {participant.user?.avatar_url ? (
                                <img 
                                  src={participant.user.avatar_url} 
                                  alt={participant.user.full_name} 
                                  className="w-full h-full rounded-full object-cover" 
                                />
                              ) : (
                                <span className="text-blue-600 text-xs font-semibold">
                                  {participant.user?.full_name?.charAt(0) || 'U'}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {participant.user?.full_name || 'Unknown'}
                              </p>
                              {participant.user?.profession && (
                                <p className="text-xs text-gray-500 truncate">
                                  {participant.user.profession}
                                </p>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </button>
              ) : (
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 mb-1">Participants</p>
                  <p className="text-sm text-gray-600">
                    {event.participant_count || 0}
                    {event.max_participants && ` / ${event.max_participants}`}
                  </p>
                </div>
              )}
            </div>

            {event.organizer && (
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 flex-shrink-0 mt-0.5 flex items-center justify-center">
                  <span className="text-gray-400 text-xs">👤</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Organizer</p>
                  <p className="text-sm text-gray-600">{event.organizer.full_name}</p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Description</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{event.description}</p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
            {currentUserId && (
              <button
                onClick={onRSVP}
                className={`flex items-center justify-center w-10 h-10 rounded-full font-medium transition-colors ${
                  isParticipant
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
                title={isParticipant ? 'Joined - Leave Event' : 'Join Event'}
              >
                {isParticipant ? (
                  <X className="w-5 h-5" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
              </button>
            )}
            {onEdit && currentUserId === event.organizer_id && (
              <button
                onClick={onEdit}
                className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
                title="Edit Event"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onAddToCalendar}
              className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
              title="Add to Calendar"
            >
              <Calendar className="w-5 h-5" />
            </button>
            <button
              onClick={onShare}
              className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
              title="Share"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// Event Create Modal Component
function EventCreateModal({
  currentUserId,
  userProfile,
  onClose,
  onSuccess
}: {
  currentUserId?: string
  userProfile?: any
  onClose: () => void
  onSuccess: () => void
}) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    location: '',
    max_participants: '',
    registration_type: 'rsvp' as 'rsvp' | 'automatic',
    category: 'workshop',
    thumbnail_url: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentUserId) {
      toast.error('Please sign in to create events')
      return
    }

    if (!formData.title || !formData.description || !formData.start_time || !formData.location) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)

      const eventData: any = {
        title: formData.title,
        description: formData.description,
        start_time: formData.start_time,
        location: formData.location,
        organizer_id: currentUserId,
        registration_type: formData.registration_type,
        category: formData.category
      }

      if (formData.end_time) {
        eventData.end_time = formData.end_time
      }

      if (formData.max_participants && parseInt(formData.max_participants) > 0) {
        eventData.max_participants = parseInt(formData.max_participants)
      }

      if (formData.thumbnail_url) {
        eventData.thumbnail_url = formData.thumbnail_url
      }

      const { error } = await supabase.from('events').insert([eventData])

      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          toast.error('Events feature not set up. Please run the SQL migration first.')
        } else {
          throw error
        }
        return
      }

      onSuccess()
    } catch (error: any) {
      console.error('Error creating event:', error)
      toast.error(error.message || 'Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
      >
          <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Create New Event</h2>
              {userProfile && (
                <p className="text-sm text-gray-600 mt-1">
                  Organizer: {userProfile.full_name || userProfile.email || 'You'}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Mental Health Workshop"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Detailed description of the event..."
                required
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date & Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location (Address or Online Link) *
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="123 Main St, London or https://zoom.us/j/..."
                required
              />
            </div>

            {/* Category and Registration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {eventCategories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Registration Type
                </label>
                <select
                  value={formData.registration_type}
                  onChange={(e) => setFormData({ ...formData, registration_type: e.target.value as 'rsvp' | 'automatic' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="rsvp">RSVP Required</option>
                  <option value="automatic">Automatic Registration</option>
                </select>
              </div>
            </div>

            {/* Max Participants and Thumbnail */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Participants (Optional)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.max_participants}
                  onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="No limit"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thumbnail URL (Optional)
                </label>
                <input
                  type="url"
                  value={formData.thumbnail_url}
                  onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
                title="Cancel"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50"
                title={loading ? 'Creating...' : 'Create Event'}
              >
                {loading ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

// Event Organizer Panel Component
function EventOrganizerPanel({
  currentUserId,
  onClose,
  onEventUpdated,
  onEditEvent
}: {
  currentUserId: string
  onClose: () => void
  onEventUpdated: () => void
  onEditEvent?: (event: Event) => void
}) {
  const toast = useToast()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showParticipants, setShowParticipants] = useState<string | null>(null)
  const [participants, setParticipants] = useState<Record<string, any[]>>({})
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    loadMyEvents()
  }, [currentUserId])

  const loadMyEvents = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', currentUserId)
        .order('start_time', { ascending: false })

      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          toast.error('Events feature not set up. Please run the SQL migration first.')
          setEvents([])
          return
        }
        throw error
      }
      setEvents(data || [])

      // Load participant counts for each event
      const counts: Record<string, number> = {}
      for (const event of data || []) {
        try {
          const { count, error: countError } = await supabase
            .from('event_participants')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id)
            .eq('rsvp_status', true)
          
          if (countError && countError.code !== '42P01') {
            console.error('Error loading participant count:', countError)
          }
          counts[event.id] = count || 0
        } catch (err) {
          console.error('Error in participant count query:', err)
          counts[event.id] = 0
        }
      }
      setParticipantCounts(counts)
    } catch (error: any) {
      console.error('Error loading events:', error)
      toast.error('Failed to load events')
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  const loadParticipants = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('event_participants')
        .select(`
          *,
          user:profiles!user_id(id, full_name, profession, avatar_url)
        `)
        .eq('event_id', eventId)
        .eq('rsvp_status', true)

      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          toast.error('Events feature not set up. Please run the SQL migration first.')
          setParticipants({ ...participants, [eventId]: [] })
          return
        }
        throw error
      }
      setParticipants({ ...participants, [eventId]: data || [] })
    } catch (error: any) {
      console.error('Error loading participants:', error)
      toast.error('Failed to load participants')
      setParticipants({ ...participants, [eventId]: [] })
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return
    }

    try {
      // First delete participants (ignore error if table doesn't exist)
      try {
        await supabase
          .from('event_participants')
          .delete()
          .eq('event_id', eventId)
      } catch (err) {
        // Ignore if table doesn't exist
      }

      // Then delete event
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)

      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          toast.error('Events feature not set up. Please run the SQL migration first.')
          return
        }
        throw error
      }
      toast.success('Event deleted successfully')
      onEventUpdated()
    } catch (error: any) {
      console.error('Error deleting event:', error)
      toast.error(error.message || 'Failed to delete event')
    }
  }

  const handleEditEvent = (event: Event) => {
    if (onEditEvent) {
      onEditEvent(event)
    } else {
      toast.info(`Editing event: ${event.title}. Edit functionality coming soon`)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">My Events</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">You haven't created any events yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{event.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{event.description.substring(0, 100)}...</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>
                          {new Date(event.start_time).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {participantCounts[event.id] || 0} participants
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (showParticipants === event.id) {
                            setShowParticipants(null)
                          } else {
                            setShowParticipants(event.id)
                            loadParticipants(event.id)
                          }
                        }}
                        className="flex items-center justify-center w-8 h-8 border border-gray-300 rounded-full hover:bg-gray-50"
                        title="View Participants"
                      >
                        <Users className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditEvent(event)}
                        className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Participants List */}
                  {showParticipants === event.id && participants[event.id] && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Participants ({participants[event.id].length})</h4>
                      <div className="space-y-2">
                        {participants[event.id].length === 0 ? (
                          <p className="text-xs text-gray-500">No participants yet</p>
                        ) : (
                          participants[event.id].map((participant: any) => (
                            <div key={participant.id} className="flex items-center gap-2 text-sm">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                {participant.user?.avatar_url ? (
                                  <img src={participant.user.avatar_url} alt={participant.user.full_name} className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  <span className="text-blue-600 text-xs">
                                    {participant.user?.full_name?.charAt(0) || 'U'}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{participant.user?.full_name || 'Unknown'}</p>
                                <p className="text-xs text-gray-500">{participant.user?.profession || ''}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// Event Edit Modal Component
function EventEditModal({
  event,
  currentUserId,
  onClose,
  onSuccess
}: {
  event: Event
  currentUserId?: string
  onClose: () => void
  onSuccess: () => void
}) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  
  // Format datetime for input fields (YYYY-MM-DDTHH:mm)
  const formatDateTimeLocal = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }
  
  const [formData, setFormData] = useState({
    title: event.title || '',
    description: event.description || '',
    start_time: formatDateTimeLocal(event.start_time),
    end_time: event.end_time ? formatDateTimeLocal(event.end_time) : '',
    location: event.location || '',
    max_participants: event.max_participants ? String(event.max_participants) : '',
    registration_type: (event.registration_type || 'rsvp') as 'rsvp' | 'automatic',
    category: event.category || 'workshop',
    thumbnail_url: event.thumbnail_url || ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentUserId) {
      toast.error('Please sign in to edit events')
      return
    }

    if (!formData.title || !formData.description || !formData.start_time || !formData.location) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)

      const eventData: any = {
        title: formData.title,
        description: formData.description,
        start_time: formData.start_time,
        location: formData.location,
        registration_type: formData.registration_type,
        category: formData.category
      }

      if (formData.end_time) {
        eventData.end_time = formData.end_time
      } else {
        // If end_time is cleared, we need to explicitly set it to null
        eventData.end_time = null
      }

      if (formData.max_participants && parseInt(formData.max_participants) > 0) {
        eventData.max_participants = parseInt(formData.max_participants)
      } else {
        eventData.max_participants = null
      }

      if (formData.thumbnail_url) {
        eventData.thumbnail_url = formData.thumbnail_url
      } else {
        eventData.thumbnail_url = null
      }

      const { error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', event.id)
        .eq('organizer_id', currentUserId) // Ensure only organizer can edit

      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          toast.error('Events feature not set up. Please run the SQL migration first.')
        } else {
          throw error
        }
        return
      }

      onSuccess()
    } catch (error: any) {
      console.error('Error updating event:', error)
      toast.error(error.message || 'Failed to update event')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Edit Event</h2>
              <p className="text-sm text-gray-600 mt-1">{event.title}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Mental Health Workshop"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Detailed description of the event..."
                required
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date & Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location (Address or Online Link) *
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="123 Main St, London or https://zoom.us/j/..."
                required
              />
            </div>

            {/* Category and Registration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {eventCategories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Registration Type
                </label>
                <select
                  value={formData.registration_type}
                  onChange={(e) => setFormData({ ...formData, registration_type: e.target.value as 'rsvp' | 'automatic' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="rsvp">RSVP Required</option>
                  <option value="automatic">Automatic Registration</option>
                </select>
              </div>
            </div>

            {/* Max Participants and Thumbnail */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Participants (Optional)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.max_participants}
                  onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="No limit"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thumbnail URL (Optional)
                </label>
                <input
                  type="url"
                  value={formData.thumbnail_url}
                  onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
                title="Cancel"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50"
                title={loading ? 'Updating...' : 'Update Event'}
              >
                {loading ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
