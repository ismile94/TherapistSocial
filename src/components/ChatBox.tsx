import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import Avatar from './Avatar'
import { ChevronDown, X, Send } from 'lucide-react'
import type { ChatBox as ChatBoxType, Message, Profile } from '../types/app'

interface ChatBoxComponentProps {
  chatBox: ChatBoxType
  currentUserId: string
  userProfile: Profile | null
  onClose: () => void
  onMinimize: () => void
  position: number
  baseRightOffset?: number
  playNotificationSound?: () => void
}

export default function ChatBoxComponent({ 
  chatBox, 
  currentUserId,
  userProfile,
  onClose, 
  onMinimize,
  position,
  baseRightOffset = 0,
  playNotificationSound
}: ChatBoxComponentProps) {
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
      .on(
        'postgres_changes',
        { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'messages',
          filter: `conversation_id=eq.${chatBox.conversation.id}`
        },
        (payload) => {
          // Mesaj silindiğinde listeden kaldır
          const deletedMsg = payload.old as Message
          setMessages(prev => prev.filter(msg => msg.id !== deletedMsg.id))
        }
      )
      .subscribe((status) => {
        console.log(`Chat ${chatBox.conversation?.id} status:`, status)
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
      sender: userProfile || undefined
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
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all duration-200"
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

