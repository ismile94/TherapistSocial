import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Avatar from '../components/Avatar'
import { X, Bell, Trash2, Check, MessageCircle, UserPlus, ThumbsUp, Reply, Quote, Repeat2 } from 'lucide-react'

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
  metadata?: {
    post_id?: string
    comment_id?: string
    reply_id?: string
    parent_comment_id?: string
    [key: string]: any
  }
  actor?: any
  post?: any
  comment?: any
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    initializeUser()
  }, [])

  useEffect(() => {
    if (currentUserId) {
      loadNotifications()
    }
  }, [currentUserId])

  // Real-time subscription for deleted posts and comments to clean up notifications
  useEffect(() => {
    if (!currentUserId) return

    const postsChannel = supabase
      .channel('notifs-posts-deletion')
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'posts'
        },
        async (payload) => {
          const deletedPostId = payload.old?.id
          if (!deletedPostId) return

          // Remove notifications related to this post
          setNotifications(prev => {
            const toRemove = prev.filter(n => 
              n.related_entity_id === deletedPostId && n.related_entity_type === 'post' ||
              n.metadata?.post_id === deletedPostId ||
              n.post?.id === deletedPostId
            )
            
            // Delete from database
            const idsToDelete = toRemove.map(n => n.id)
            if (idsToDelete.length > 0) {
              supabase
                .from('notifications')
                .delete()
                .in('id', idsToDelete)
                .then(() => console.log(`Deleted ${idsToDelete.length} notifications for deleted post`))
            }

            return prev.filter(n => 
              !(n.related_entity_id === deletedPostId && n.related_entity_type === 'post') &&
              n.metadata?.post_id !== deletedPostId &&
              n.post?.id !== deletedPostId
            )
          })
        }
      )
      .subscribe()

    const commentsChannel = supabase
      .channel('notifs-comments-deletion')
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'post_comments'
        },
        async (payload) => {
          const deletedCommentId = payload.old?.id
          if (!deletedCommentId) return

          // Remove notifications related to this comment
          setNotifications(prev => {
            const toRemove = prev.filter(n => 
              n.related_entity_id === deletedCommentId && n.related_entity_type === 'comment' ||
              n.metadata?.comment_id === deletedCommentId ||
              n.metadata?.reply_id === deletedCommentId ||
              n.comment?.id === deletedCommentId
            )
            
            // Delete from database
            const idsToDelete = toRemove.map(n => n.id)
            if (idsToDelete.length > 0) {
              supabase
                .from('notifications')
                .delete()
                .in('id', idsToDelete)
                .then(() => console.log(`Deleted ${idsToDelete.length} notifications for deleted comment`))
            }

            return prev.filter(n => 
              !(n.related_entity_id === deletedCommentId && n.related_entity_type === 'comment') &&
              n.metadata?.comment_id !== deletedCommentId &&
              n.metadata?.reply_id !== deletedCommentId &&
              n.comment?.id !== deletedCommentId
            )
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(postsChannel)
      supabase.removeChannel(commentsChannel)
    }
  }, [currentUserId])

  const initializeUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUserId(user.id)
    } else {
      navigate('/auth')
    }
  }

  const loadNotifications = async () => {
    if (!currentUserId) return
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(100)

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
        const postId = notification.metadata?.post_id || 
                       (notification.related_entity_type === 'post' ? notification.related_entity_id : null)
        
        if (postId) {
          const { data: postData } = await supabase
            .from('posts')
            .select('id, title, content')
            .eq('id', postId)
            .maybeSingle()

          if (postData) {
            result.post = postData
          } else {
            // Post was deleted - mark notification for deletion
            result._shouldDelete = true
          }
        }

        // Fetch comment data if needed
        const commentId = notification.metadata?.comment_id || 
                          (notification.related_entity_type === 'comment' ? notification.related_entity_id : null)
        
        if (commentId) {
          const { data: commentData } = await supabase
            .from('post_comments')
            .select('id, content, post_id, parent_reply_id')
            .eq('id', commentId)
            .maybeSingle()

          if (commentData) {
            result.comment = commentData
            // If we don't have post_id yet, get it from comment
            if (!result.post && commentData.post_id) {
              const { data: postData } = await supabase
                .from('posts')
                .select('id, title, content')
                .eq('id', commentData.post_id)
                .maybeSingle()
              if (postData) {
                result.post = postData
              }
            }
          } else {
            // Comment was deleted - mark notification for deletion
            result._shouldDelete = true
          }
        }

        return result
      }))

      // Filter out notifications that should be deleted (related content was removed)
      const notificationsToDelete = notificationsWithData.filter(n => n._shouldDelete).map(n => n.id)
      if (notificationsToDelete.length > 0) {
        // Delete from database
        await supabase
          .from('notifications')
          .delete()
          .in('id', notificationsToDelete)
        
        console.log(`Deleted ${notificationsToDelete.length} notifications for removed content`)
      }
      
      // Keep only valid notifications
      const validNotifications = notificationsWithData.filter(n => !n._shouldDelete)
      
      setNotifications(validNotifications)
    } catch (err) {
      console.error('Error loading notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    navigate('/community')
  }

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      try {
        await supabase
          .from('notifications')
          .update({ 
            read: true,
            clicked_at: new Date().toISOString()
          })
          .eq('id', notification.id)

        setNotifications(prev =>
          prev.map(n => n.id === notification.id 
            ? { ...n, read: true, clicked_at: new Date().toISOString() }
            : n
          )
        )
      } catch (err) {
        console.error('Error marking notification as read:', err)
      }
    }

    // Navigate based on notification type
    const type = notification.type

    // Connection-related notifications
    if (type === 'connection_request' || type === 'connection_accepted' || type === 'connection_rejected') {
      navigate('/network')
      return
    }

    // Message notifications
    if (type === 'message' || type === 'new_message') {
      navigate('/messages')
      return
    }

    // Post/Comment/Reply related notifications
    const postId = notification.metadata?.post_id || 
                   notification.post?.id ||
                   (notification.related_entity_type === 'post' ? notification.related_entity_id : null)
    
    const commentId = notification.metadata?.comment_id || 
                      notification.comment?.id ||
                      (notification.related_entity_type === 'comment' ? notification.related_entity_id : null)
    
    const replyId = notification.metadata?.reply_id
    const parentCommentId = notification.metadata?.parent_comment_id || notification.comment?.parent_reply_id

    // Determine the correct route
    if (postId) {
      let route = `/post/${postId}`
      
      // If it's a reply (has parent_comment_id), navigate to the reply
      if (replyId && parentCommentId) {
        route = `/post/${postId}/comment/${parentCommentId}/reply/${replyId}`
      }
      // If it's a comment reaction or comment notification
      else if (commentId) {
        // Check if the comment is a reply (has parent_reply_id)
        if (parentCommentId) {
          route = `/post/${postId}/comment/${parentCommentId}/reply/${commentId}`
        } else {
          route = `/post/${postId}/comment/${commentId}`
        }
      }
      
      navigate(route)
      return
    }

    // Fallback: navigate to actor's profile
    if (notification.actor?.id) {
      navigate(`/profile/${notification.actor.id}`)
      return
    }

    // Default: stay on notifications or go to community
    navigate('/community')
  }

  const markAllAsRead = async () => {
    if (!currentUserId) return

    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', currentUserId)
        .eq('read', false)

      setNotifications(prev => prev.map(n => ({ ...n, read: true })))

      window.dispatchEvent(new CustomEvent('showToast', {
        detail: { message: 'All notifications marked as read', type: 'success' }
      }))
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    } catch (err) {
      console.error('Error deleting notification:', err)
    }
  }

  const clearAll = async () => {
    if (!currentUserId || !confirm('Are you sure you want to clear all notifications?')) return

    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', currentUserId)

      setNotifications([])

      window.dispatchEvent(new CustomEvent('showToast', {
        detail: { message: 'All notifications cleared', type: 'success' }
      }))
    } catch (err) {
      console.error('Error clearing notifications:', err)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'connection_request':
      case 'connection_accepted':
        return <UserPlus className="w-5 h-5 text-blue-500" />
      case 'message':
      case 'new_message':
        return <MessageCircle className="w-5 h-5 text-green-500" />
      case 'post_reaction':
      case 'like':
        return <ThumbsUp className="w-5 h-5 text-pink-500" />
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-blue-500" />
      case 'comment_reaction':
        return <ThumbsUp className="w-5 h-5 text-orange-500" />
      case 'reply':
      case 'comment_reply':
        return <Reply className="w-5 h-5 text-purple-500" />
      case 'mention':
        return <span className="w-5 h-5 text-blue-600 font-bold">@</span>
      case 'repost':
        return <Repeat2 className="w-5 h-5 text-green-600" />
      case 'quote':
        return <Quote className="w-5 h-5 text-indigo-500" />
      default:
        return <Bell className="w-5 h-5 text-gray-500" />
    }
  }

  const getNotificationPreview = (notification: Notification) => {
    // Show a preview of the related content
    if (notification.comment?.content) {
      const preview = notification.comment.content.substring(0, 60)
      return preview + (notification.comment.content.length > 60 ? '...' : '')
    }
    if (notification.post?.title) {
      return notification.post.title
    }
    if (notification.post?.content) {
      const textContent = notification.post.content.replace(/<[^>]*>/g, '')
      const preview = textContent.substring(0, 60)
      return preview + (textContent.length > 60 ? '...' : '')
    }
    return null
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const groupNotificationsByDate = (notifications: Notification[]) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const lastWeek = new Date(today)
    lastWeek.setDate(lastWeek.getDate() - 7)

    const groups: { title: string; notifications: Notification[] }[] = [
      { title: 'Today', notifications: [] },
      { title: 'Yesterday', notifications: [] },
      { title: 'This Week', notifications: [] },
      { title: 'Earlier', notifications: [] }
    ]

    notifications.forEach(n => {
      const date = new Date(n.created_at)
      date.setHours(0, 0, 0, 0)

      if (date.getTime() >= today.getTime()) {
        groups[0].notifications.push(n)
      } else if (date.getTime() >= yesterday.getTime()) {
        groups[1].notifications.push(n)
      } else if (date.getTime() >= lastWeek.getTime()) {
        groups[2].notifications.push(n)
      } else {
        groups[3].notifications.push(n)
      }
    })

    return groups.filter(g => g.notifications.length > 0)
  }

  const unreadCount = notifications.filter(n => !n.read).length
  const groupedNotifications = groupNotificationsByDate(notifications)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Bell className="w-6 h-6 text-blue-600" />
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Notifications</h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {notifications.length > 0 && (
            <div className="flex gap-3 mt-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  Mark all as read
                </button>
              )}
              <button
                onClick={clearAll}
                className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500">No notifications yet</p>
              <p className="text-sm text-gray-400 mt-1">We'll notify you when something happens</p>
            </div>
          ) : (
            <div>
              {groupedNotifications.map(group => (
                <div key={group.title}>
                  <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0">
                    {group.title}
                  </div>
                  {group.notifications.map(notification => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors border-b flex items-start gap-3 group ${
                        !notification.read ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      {/* Actor Avatar or Icon */}
                      <div className="flex-shrink-0 relative">
                        {notification.actor?.avatar_url ? (
                          <Avatar 
                            src={notification.actor.avatar_url} 
                            name={notification.actor.full_name} 
                            size={44}
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center">
                            {getNotificationIcon(notification.type)}
                          </div>
                        )}
                        {/* Type indicator badge */}
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white shadow flex items-center justify-center">
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.read ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                          {notification.message}
                        </p>
                        
                        {/* Preview */}
                        {getNotificationPreview(notification) && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1 bg-gray-100 px-2 py-1 rounded">
                            "{getNotificationPreview(notification)}"
                          </p>
                        )}
                        
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteNotification(notification.id)
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
