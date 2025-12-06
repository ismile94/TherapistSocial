import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Conversation, Message, ChatBox, ConversationMetadata, Profile } from '../types/app'

interface UseChatProps {
  currentUserId: string | null
  userProfile: Profile | null
}

export function useChat({ currentUserId, userProfile }: UseChatProps) {
  const [chatBoxes, setChatBoxes] = useState<ChatBox[]>([])
  const [conversationMetadata, setConversationMetadata] = useState<{ [key: string]: ConversationMetadata }>({})
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!currentUserId) return

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
        const processedConversations = data.map(conv => ({
          ...conv,
          other_user: conv.user1_id === currentUserId ? conv.user2 : conv.user1
        }))
        setConversations(processedConversations)
      }
    } catch (err) {
      console.error('Error loading conversations:', err)
    }
  }, [currentUserId])

  // Calculate unread count
  const calculateUnreadCount = useCallback(async () => {
    if (!currentUserId) {
      setUnreadMessagesCount(0)
      return
    }

    try {
      const { count, error } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .neq('sender_id', currentUserId)
        .eq('read', false)

      if (!error) {
        setUnreadMessagesCount(count || 0)
      }
    } catch (err) {
      console.error('Error calculating unread count:', err)
    }
  }, [currentUserId])

  // Start or get conversation
  const startConversation = useCallback(async (otherUserId: string): Promise<Conversation | null> => {
    if (!currentUserId) return null

    try {
      // Check if conversation exists
      const { data: existing } = await supabase
        .from('conversations')
        .select(`
          *,
          user1:profiles!user1_id(id, full_name, avatar_url, profession),
          user2:profiles!user2_id(id, full_name, avatar_url, profession)
        `)
        .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${currentUserId})`)
        .maybeSingle()

      if (existing) {
        return {
          ...existing,
          other_user: existing.user1_id === currentUserId ? existing.user2 : existing.user1
        }
      }

      // Create new conversation
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          user1_id: currentUserId,
          user2_id: otherUserId,
          last_message_at: new Date().toISOString()
        })
        .select(`
          *,
          user1:profiles!user1_id(id, full_name, avatar_url, profession),
          user2:profiles!user2_id(id, full_name, avatar_url, profession)
        `)
        .single()

      if (error) throw error

      return {
        ...newConv,
        other_user: newConv.user1_id === currentUserId ? newConv.user2 : newConv.user1
      }
    } catch (err) {
      console.error('Error starting conversation:', err)
      return null
    }
  }, [currentUserId])

  // Open chat box
  const openChatBox = useCallback((conversation: Conversation) => {
    setChatBoxes(prev => {
      const existing = prev.find(c => c.id === conversation.id)
      if (existing) {
        return prev.map(c => c.id === conversation.id 
          ? { ...c, isMinimized: false, isOpen: true }
          : c
        )
      }

      // Limit to 3 chat boxes
      const newBoxes = prev.length >= 3 ? prev.slice(1) : prev
      return [...newBoxes, {
        id: conversation.id,
        conversation,
        isMinimized: false,
        isOpen: true
      }]
    })
  }, [])

  // Close chat box
  const closeChatBox = useCallback((conversationId: string) => {
    setChatBoxes(prev => prev.filter(c => c.id !== conversationId))
  }, [])

  // Minimize chat box
  const minimizeChatBox = useCallback((conversationId: string) => {
    setChatBoxes(prev => prev.map(c => 
      c.id === conversationId ? { ...c, isMinimized: !c.isMinimized } : c
    ))
  }, [])

  // Send message
  const sendMessage = useCallback(async (conversationId: string, content: string): Promise<Message | null> => {
    if (!currentUserId || !content.trim()) return null

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: content.trim()
        })
        .select('*')
        .single()

      if (error) throw error

      // Update conversation last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId)

      return data
    } catch (err) {
      console.error('Error sending message:', err)
      return null
    }
  }, [currentUserId])

  // Mark messages as read
  const markMessagesAsRead = useCallback(async (conversationId: string) => {
    if (!currentUserId) return

    try {
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', currentUserId)
        .eq('read', false)

      calculateUnreadCount()
    } catch (err) {
      console.error('Error marking messages as read:', err)
    }
  }, [currentUserId, calculateUnreadCount])

  // Toggle conversation metadata
  const toggleMuted = useCallback((conversationId: string) => {
    setConversationMetadata(prev => ({
      ...prev,
      [conversationId]: {
        ...prev[conversationId],
        isMuted: !prev[conversationId]?.isMuted,
        isStarred: prev[conversationId]?.isStarred || false,
        isArchived: prev[conversationId]?.isArchived || false
      }
    }))
  }, [])

  const toggleStarred = useCallback((conversationId: string) => {
    setConversationMetadata(prev => ({
      ...prev,
      [conversationId]: {
        ...prev[conversationId],
        isMuted: prev[conversationId]?.isMuted || false,
        isStarred: !prev[conversationId]?.isStarred,
        isArchived: prev[conversationId]?.isArchived || false
      }
    }))
  }, [])

  const toggleArchived = useCallback((conversationId: string) => {
    setConversationMetadata(prev => ({
      ...prev,
      [conversationId]: {
        ...prev[conversationId],
        isMuted: prev[conversationId]?.isMuted || false,
        isStarred: prev[conversationId]?.isStarred || false,
        isArchived: !prev[conversationId]?.isArchived
      }
    }))
  }, [])

  // Delete conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!currentUserId) return

    try {
      // Get conversation to check which user we are
      const { data: conv } = await supabase
        .from('conversations')
        .select('user1_id, user2_id, user1_deleted, user2_deleted')
        .eq('id', conversationId)
        .single()

      if (!conv) return

      const isUser1 = conv.user1_id === currentUserId
      const otherUserDeleted = isUser1 ? conv.user2_deleted : conv.user1_deleted

      if (otherUserDeleted) {
        // Both deleted, remove completely
        await supabase.from('messages').delete().eq('conversation_id', conversationId)
        await supabase.from('conversations').delete().eq('id', conversationId)
      } else {
        // Mark as deleted for current user
        await supabase
          .from('conversations')
          .update(isUser1 ? { user1_deleted: true } : { user2_deleted: true })
          .eq('id', conversationId)
      }

      setConversations(prev => prev.filter(c => c.id !== conversationId))
      closeChatBox(conversationId)
    } catch (err) {
      console.error('Error deleting conversation:', err)
    }
  }, [currentUserId, closeChatBox])

  // Initial load
  useEffect(() => {
    if (currentUserId) {
      loadConversations()
      calculateUnreadCount()
    }
  }, [currentUserId, loadConversations, calculateUnreadCount])

  // Real-time subscription for messages
  useEffect(() => {
    if (!currentUserId) return

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          calculateUnreadCount()
          loadConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, calculateUnreadCount, loadConversations])

  return {
    chatBoxes,
    setChatBoxes,
    conversationMetadata,
    setConversationMetadata,
    conversations,
    unreadMessagesCount,
    loadConversations,
    calculateUnreadCount,
    startConversation,
    openChatBox,
    closeChatBox,
    minimizeChatBox,
    sendMessage,
    markMessagesAsRead,
    toggleMuted,
    toggleStarred,
    toggleArchived,
    deleteConversation
  }
}

