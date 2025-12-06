import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

interface Notification {
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
  actor?: any
  post?: any
  comment?: any
}

interface UseNotificationsProps {
  currentUserId: string | null
}

export function useNotifications({ currentUserId }: UseNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!currentUserId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Error loading notifications:', error)
        return
      }

      // Fetch related data for each notification
      const notificationsWithData = await Promise.all((data || []).map(async (notification) => {
        const result: any = { ...notification }

        // Extract actor name from message and fetch profile
        if (notification.message) {
          const messageMatch = notification.message.match(/^([^ ]+)/)
          if (messageMatch && messageMatch[1] !== 'Someone') {
            const { data: actorProfile } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .ilike('full_name', `%${messageMatch[1]}%`)
              .limit(1)
              .maybeSingle()

            if (actorProfile) {
              result.actor = actorProfile
            }
          }
        }

        // Fetch post data if needed
        if (notification.related_entity_type === 'post' && notification.related_entity_id) {
          const { data: postData } = await supabase
            .from('posts')
            .select('id, title, content, post_metadata')
            .eq('id', notification.related_entity_id)
            .maybeSingle()

          if (postData) {
            result.post = postData
          }
        }

        // Fetch comment data if needed
        if (notification.related_entity_type === 'comment' && notification.related_entity_id) {
          const { data: commentData } = await supabase
            .from('post_comments')
            .select('id, content, user_id')
            .eq('id', notification.related_entity_id)
            .maybeSingle()

          if (commentData) {
            result.comment = commentData
          }
        }

        // Check metadata for comment_id
        if (notification.metadata?.comment_id) {
          const { data: commentData } = await supabase
            .from('post_comments')
            .select('id, content, user_id')
            .eq('id', notification.metadata.comment_id)
            .maybeSingle()

          if (commentData) {
            result.comment = commentData
          }
        }

        return result
      }))

      setNotifications(notificationsWithData)
      setUnreadCount(notificationsWithData.filter(n => !n.read).length)
    } catch (err) {
      console.error('Error loading notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [currentUserId])

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ 
          read: true,
          clicked_at: new Date().toISOString()
        })
        .eq('id', notificationId)

      setNotifications(prev =>
        prev.map(n => n.id === notificationId 
          ? { ...n, read: true, clicked_at: new Date().toISOString() }
          : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }, [])

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!currentUserId) return

    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', currentUserId)
        .eq('read', false)

      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }, [currentUserId])

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      setNotifications(prev => {
        const notification = prev.find(n => n.id === notificationId)
        if (notification && !notification.read) {
          setUnreadCount(c => Math.max(0, c - 1))
        }
        return prev.filter(n => n.id !== notificationId)
      })
    } catch (err) {
      console.error('Error deleting notification:', err)
    }
  }, [])

  // Clear all notifications
  const clearAll = useCallback(async () => {
    if (!currentUserId) return

    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', currentUserId)

      setNotifications([])
      setUnreadCount(0)
    } catch (err) {
      console.error('Error clearing notifications:', err)
    }
  }, [currentUserId])

  // Initial load
  useEffect(() => {
    if (currentUserId) {
      loadNotifications()
    }
  }, [currentUserId, loadNotifications])

  // Real-time subscription
  useEffect(() => {
    if (!currentUserId) return

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`
        },
        () => {
          loadNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, loadNotifications])

  return {
    notifications,
    unreadCount,
    loading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll
  }
}

