import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import Avatar from './Avatar'
import EmptyState from './EmptyState'
import { MessageSkeleton } from './SkeletonLoaders'
import { SwipeableConversationItem } from './SwipeableConversationItem'
import { haptic } from '../utils/hapticFeedback'
import { 
  MessageSquare, Star, VolumeX, Volume2, Archive, 
  ShieldAlert, MoreHorizontal, Mail, X 
} from 'lucide-react'
import type { Conversation, ConversationMetadata } from '../types/app'

interface ConversationsListProps {
  currentUserId: string
  onSelectConversation: (conversation: Conversation) => void
  selectedConversationId?: string
  onUnreadCountChange?: (count: number) => void
  conversationMetadata: { [key: string]: ConversationMetadata }
  onUpdateMetadata: (conversationId: string, updates: Partial<ConversationMetadata>) => void
  compact?: boolean
  playNotificationSound?: () => void
  onOpenConnections?: () => void
}

export default function ConversationsList({
  currentUserId,
  onSelectConversation,
  selectedConversationId,
  onUnreadCountChange,
  conversationMetadata,
  onUpdateMetadata,
  compact,
  playNotificationSound,
  onOpenConnections
}: ConversationsListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [showArchived, setShowArchived] = useState(false)
  const subscriptionRef = useRef<any>(null)
  const loadTimeoutRef = useRef<NodeJS.Timeout>()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (!currentUserId) return
    loadConversations()
    const timeoutId = setTimeout(() => subscribeToConversations(), 1000)
    return () => {
      clearTimeout(timeoutId)
      clearTimeout(loadTimeoutRef.current)
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
        subscriptionRef.current = null
      }
    }
  }, [currentUserId])

  // Ask for browser notification permission once
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {})
      }
    }
  }, [])

  useEffect(() => {
    const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0)
    onUnreadCountChange?.(totalUnread)
  }, [conversations])

  async function loadConversations() {
    if (!currentUserId) return
    clearTimeout(loadTimeoutRef.current)
    loadTimeoutRef.current = setTimeout(async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from("conversations")
          .select(`
            *,
            user1:profiles!user1_id(*),
            user2:profiles!user2_id(*),
            messages!conversation_id(*)
          `)
          .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
          .order("last_message_at", { ascending: false })

        if (error) {
          console.error("❌ Error loading conversations:", error)
        } else {
          const mapped = (data || []).map((conv) => {
            const other = conv.user1_id === currentUserId ? conv.user2 : conv.user1
            const msgs = conv.messages || []
            const last = msgs.length ? msgs[msgs.length - 1] : null
            const unread = msgs.filter((m: any) => !m.read && m.sender_id !== currentUserId).length
            return { ...conv, other_user: other, last_message: last, unread_count: unread }
          })
          setConversations(mapped)
        }
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  function subscribeToConversations() {
    if (!currentUserId || subscriptionRef.current) return
    const channel = supabase
      .channel(`conversations-${currentUserId}-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, loadConversations)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload: any) => {
        try {
          const msg = payload?.new as { id: string; sender_id: string; content: string; conversation_id: string }
          if (msg && msg.sender_id !== currentUserId) {
            // Play notification sound for new messages from others
            playNotificationSound?.()
            
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              const title = 'New message'
              const body = msg.content?.slice(0, 140) || 'New message received'
              // Show native notification (will auto-close by the OS)
              const notification = new Notification(title, { 
                body,
                icon: '/favicon.ico',
                tag: `message-${msg.id}`
              })
              
              notification.onclick = () => {
                window.focus()
                // Find and select the conversation
                const conversation = conversations.find(c => c.id === msg.conversation_id)
                if (conversation) {
                  onSelectConversation(conversation)
                }
              }
            }
          }
        } finally {
          loadConversations()
        }
      })
      .subscribe((status) => {
        console.log('Conversations subscription status:', status)
      })
    subscriptionRef.current = channel
  }

  const handleToggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const current = conversationMetadata[id]?.isStarred || false
    onUpdateMetadata(id, { isStarred: !current })
    setMenuOpenId(null)
  }

  const handleToggleMute = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const current = conversationMetadata[id]?.isMuted || false
    onUpdateMetadata(id, { isMuted: !current })
    setMenuOpenId(null)
  }

  const handleToggleArchive = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const current = conversationMetadata[id]?.isArchived || false
    onUpdateMetadata(id, { isArchived: !current })
    setMenuOpenId(null)
  }

  const handleMarkAsUnread = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .neq('sender_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (lastMsg && lastMsg.read) {
        await supabase
          .from('messages')
          .update({ read: false })
          .eq('id', lastMsg.id)
      }
      setMenuOpenId(null)
      await loadConversations()
    } catch (err) {
      console.error('Failed to mark as unread', err)
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    if (days < 7) return date.toLocaleDateString([], { weekday: "short" })
    return date.toLocaleDateString([], { month: "short", day: "numeric" })
  }

  const visible = conversations
    .filter((c) => showArchived ? (conversationMetadata[c.id]?.isArchived) : (!conversationMetadata[c.id]?.isArchived))
    .filter((c) => c.other_user.full_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aStar = conversationMetadata[a.id]?.isStarred ? 1 : 0
      const bStar = conversationMetadata[b.id]?.isStarred ? 1 : 0
      if (bStar - aStar !== 0) return bStar - aStar
      const at = a.last_message_at || a.created_at
      const bt = b.last_message_at || b.created_at
      return new Date(bt).getTime() - new Date(at).getTime()
    })

  const inboxUnread = useMemo(() =>
    conversations
      .filter((c) => !conversationMetadata[c.id]?.isArchived)
      .reduce((sum, c) => sum + (c.unread_count || 0), 0)
  , [conversations, conversationMetadata])

  const archivedUnread = useMemo(() =>
    conversations
      .filter((c) => !!conversationMetadata[c.id]?.isArchived)
      .reduce((sum, c) => sum + (c.unread_count || 0), 0)
  , [conversations, conversationMetadata])

  if (loading) {
    return (
      <div className="w-full h-full">
        <MessageSkeleton />
        <MessageSkeleton />
        <MessageSkeleton />
        <MessageSkeleton />
        <MessageSkeleton />
      </div>
    )
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
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
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
            const m = conversationMetadata[c.id]
            const isSelected = selectedConversationId === c.id
            
            // Only use swipe on mobile devices
            const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
            
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
                    haptic.light()
                    onSelectConversation(c)
                  }}
                  onSwipeLeft={() => handleToggleArchive(c.id, { stopPropagation: () => {} } as any)}
                  onSwipeRight={() => {
                    if ((c.unread_count ?? 0) > 0) {
                      handleMarkAsUnread(c.id, { stopPropagation: () => {} } as any)
                    }
                  }}
                  onMarkAsUnread={() => handleMarkAsUnread(c.id, { stopPropagation: () => {} } as any)}
                  onToggleArchive={() => handleToggleArchive(c.id, { stopPropagation: () => {} } as any)}
                />
              )
            }
            
            // Desktop: keep existing non-swipeable version
            return (
              <div
                key={c.id}
                onClick={() => {
                  haptic.light()
                  onSelectConversation(c)
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
                      e.stopPropagation()
                      haptic.light()
                      setMenuOpenId(menuOpenId === c.id ? null : c.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-3 hover:bg-gray-100 rounded transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    <MoreHorizontal className="w-5 h-5 text-gray-500" />
                  </button>
                  {menuOpenId === c.id && (
                    <div className="absolute right-0 top-8 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                      <button
                        onClick={(e) => {
                          haptic.light()
                          handleMarkAsUnread(c.id, e)
                        }}
                        className="flex w-full items-center px-4 py-3 hover:bg-gray-50 text-sm text-gray-700 min-h-[44px]"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Mark as unread
                      </button>
                      <button
                        onClick={(e) => {
                          haptic.light()
                          handleToggleStar(c.id, e)
                        }}
                        className="flex w-full items-center px-4 py-3 hover:bg-gray-50 text-sm text-gray-700 min-h-[44px]"
                      >
                        <Star className={`${m?.isStarred ? 'text-yellow-500 fill-yellow-500' : ''} w-4 h-4 mr-2`} />
                        {m?.isStarred ? "Unstar" : "Star"}
                      </button>
                      <button
                        onClick={(e) => {
                          haptic.light()
                          handleToggleMute(c.id, e)
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
                          haptic.light()
                          handleToggleArchive(c.id, e)
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
                          e.stopPropagation()
                          haptic.error()
                          supabase.from("conversations").delete().eq("id", c.id)
                          loadConversations()
                          setMenuOpenId(null)
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
            )
          })
        )}
      </div>
    </div>
  )
}

