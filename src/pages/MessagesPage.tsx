import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Avatar from '../components/Avatar'
import { 
  X, Search, Send, MoreHorizontal, Archive, Star, Volume2, VolumeX,
  Trash2, ArrowLeft, MessageCircle, Filter, Users
} from 'lucide-react'

interface Profile {
  id: string
  full_name: string
  avatar_url?: string | null
  profession?: string
  [key: string]: any
}

interface Conversation {
  id: string
  user1_id: string
  user2_id: string
  last_message_at: string
  user1?: Profile
  user2?: Profile
  other_user?: Profile
  last_message?: string
}

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  read: boolean
}

export default function MessagesPage() {
  const navigate = useNavigate()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread' | 'starred' | 'archived'>('all')
  const [conversationMetadata, setConversationMetadata] = useState<{[key: string]: { starred: boolean, archived: boolean, muted: boolean }}>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    initializeUser()
  }, [])

  useEffect(() => {
    if (currentUserId) {
      loadConversations()
    }
  }, [currentUserId])

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id)
      markMessagesAsRead(selectedConversation.id)
    }
  }, [selectedConversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Real-time message subscription
  useEffect(() => {
    if (!currentUserId || !selectedConversation) return

    const channel = supabase
      .channel(`messages-${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages(prev => [...prev, newMsg])
          
          if (newMsg.sender_id !== currentUserId) {
            markMessagesAsRead(selectedConversation.id)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, selectedConversation?.id])

  const initializeUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUserId(user.id)
    } else {
      navigate('/auth')
    }
  }

  const loadConversations = async () => {
    if (!currentUserId) return
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          user1:profiles!user1_id(id, full_name, avatar_url, profession),
          user2:profiles!user2_id(id, full_name, avatar_url, profession)
        `)
        .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
        .order('last_message_at', { ascending: false })

      if (!error && data) {
        const processedConversations = await Promise.all(data.map(async conv => {
          // Get last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          return {
            ...conv,
            other_user: conv.user1_id === currentUserId ? conv.user2 : conv.user1,
            last_message: lastMsg?.content
          }
        }))
        setConversations(processedConversations)
      }
    } catch (err) {
      console.error('Error loading conversations:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (conversationId: string) => {
    setLoadingMessages(true)

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (!error && data) {
        setMessages(data)
      }
    } catch (err) {
      console.error('Error loading messages:', err)
    } finally {
      setLoadingMessages(false)
    }
  }

  const markMessagesAsRead = async (conversationId: string) => {
    if (!currentUserId) return

    try {
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', currentUserId)
        .eq('read', false)
    } catch (err) {
      console.error('Error marking messages as read:', err)
    }
  }

  const sendMessage = async () => {
    if (!currentUserId || !selectedConversation || !newMessage.trim()) return

    const content = newMessage.trim()
    setNewMessage('')

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: currentUserId,
          content
        })

      if (error) throw error

      // Update conversation last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedConversation.id)

      inputRef.current?.focus()
    } catch (err) {
      console.error('Error sending message:', err)
      setNewMessage(content)
    }
  }

  const handleClose = () => {
    navigate('/community')
  }

  const handleBackToList = () => {
    setSelectedConversation(null)
    setMessages([])
  }

  const handleDeleteConversation = async (conversationId: string) => {
    if (!confirm('Are you sure you want to delete this conversation?')) return

    try {
      await supabase.from('messages').delete().eq('conversation_id', conversationId)
      await supabase.from('conversations').delete().eq('id', conversationId)

      setConversations(prev => prev.filter(c => c.id !== conversationId))
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null)
        setMessages([])
      }

      window.dispatchEvent(new CustomEvent('showToast', {
        detail: { message: 'Conversation deleted', type: 'success' }
      }))
    } catch (err) {
      console.error('Error deleting conversation:', err)
    }
  }

  const toggleStarred = (conversationId: string) => {
    setConversationMetadata(prev => ({
      ...prev,
      [conversationId]: {
        ...prev[conversationId],
        starred: !prev[conversationId]?.starred,
        archived: prev[conversationId]?.archived || false,
        muted: prev[conversationId]?.muted || false
      }
    }))
  }

  const toggleArchived = (conversationId: string) => {
    setConversationMetadata(prev => ({
      ...prev,
      [conversationId]: {
        ...prev[conversationId],
        starred: prev[conversationId]?.starred || false,
        archived: !prev[conversationId]?.archived,
        muted: prev[conversationId]?.muted || false
      }
    }))
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / 86400000)

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return 'Yesterday'
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  const filteredConversations = useMemo(() => {
    let filtered = conversations

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(conv =>
        conv.other_user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply tab filter
    if (filter === 'starred') {
      filtered = filtered.filter(conv => conversationMetadata[conv.id]?.starred)
    } else if (filter === 'archived') {
      filtered = filtered.filter(conv => conversationMetadata[conv.id]?.archived)
    } else if (filter === 'all') {
      filtered = filtered.filter(conv => !conversationMetadata[conv.id]?.archived)
    }

    return filtered
  }, [conversations, searchQuery, filter, conversationMetadata])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl w-full max-w-5xl h-[90vh] overflow-hidden flex shadow-2xl">
        {/* Conversations List */}
        <div className={`w-full md:w-80 lg:w-96 border-r flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-600" />
                Messages
              </h2>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 md:hidden">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-1 mt-3">
              {(['all', 'unread', 'starred', 'archived'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-xs rounded-full capitalize ${
                    filter === f 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500">No conversations yet</p>
              </div>
            ) : (
              filteredConversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar 
                      src={conv.other_user?.avatar_url} 
                      name={conv.other_user?.full_name} 
                      size={48}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium text-gray-900 truncate">
                          {conv.other_user?.full_name}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {formatTime(conv.last_message_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {conv.last_message || 'No messages yet'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Message Area */}
        <div className={`flex-1 flex flex-col ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
          {selectedConversation ? (
            <>
              {/* Conversation Header */}
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleBackToList}
                    className="md:hidden text-gray-400 hover:text-gray-600"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <Avatar 
                    src={selectedConversation.other_user?.avatar_url} 
                    name={selectedConversation.other_user?.full_name} 
                    size={40}
                  />
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {selectedConversation.other_user?.full_name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {selectedConversation.other_user?.profession}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/profile/${selectedConversation.other_user?.id}`)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="View Profile"
                  >
                    <Users className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => toggleStarred(selectedConversation.id)}
                    className={`p-2 hover:bg-gray-100 rounded-lg ${
                      conversationMetadata[selectedConversation.id]?.starred 
                        ? 'text-yellow-500' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title="Star"
                  >
                    <Star className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => toggleArchived(selectedConversation.id)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="Archive"
                  >
                    <Archive className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteConversation(selectedConversation.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={handleClose}
                    className="hidden md:block text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map(message => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                          message.sender_id === currentUserId
                            ? 'bg-blue-600 text-white rounded-br-sm'
                            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className={`text-[10px] mt-1 ${
                          message.sender_id === currentUserId ? 'text-blue-200' : 'text-gray-500'
                        }`}>
                          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
              <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
              <MessageCircle className="w-20 h-20 text-gray-200 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Your Messages</h3>
              <p className="text-sm text-center max-w-xs">
                Select a conversation to start chatting or start a new conversation from a profile page.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
