import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Avatar from '../components/Avatar'
import { useToast } from '../components/useToast'
import { CommunityPost, PostMetadata, Comment, Profile } from '../types/app'
import {
  ArrowLeft, MessageSquare, Bookmark,
  Link2, Check, ChevronDown, ChevronUp,
  Send, Reply, MoreHorizontal, Edit2, Trash2, Bell, MapPin,
  BarChart2, Maximize2, FileText, Repeat2, Quote, Smile, Download,
  MessageCircle, X
} from 'lucide-react'
// Emoji Reactions
const EMOJI_REACTIONS = [
  { emoji: '👍', label: 'Like' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '😂', label: 'Haha' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '💡', label: 'Insightful' }
]
const MOOD_OPTIONS = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '🤔', label: 'Thoughtful' },
  { emoji: '😍', label: 'Excited' },
  { emoji: '💪', label: 'Motivated' },
  { emoji: '🎉', label: 'Celebrating' },
  { emoji: '📚', label: 'Learning' },
  { emoji: '💡', label: 'Inspired' },
  { emoji: '🙏', label: 'Grateful' }
]
// Using Comment type from app.ts instead of redefining
// Extended Comment interface with additional properties
interface ExtendedComment extends Comment {
  parent_id?: string | null;
  reply_count: number;
  replies?: ExtendedComment[];
}
export default function PostPage() {
  const { postId, commentId, replyId } = useParams<{ postId: string; commentId?: string; replyId?: string }>()
  const navigate = useNavigate()
  const toast = useToast()
 
  const [post, setPost] = useState<CommunityPost | null>(null)
  const [comments, setComments] = useState<ExtendedComment[]>([]);
  const [commentReactions, setCommentReactions] = useState<Record<string, Array<{
    emoji: string;
    user_id: string;
    user: Profile;
  }>>>({});
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
 
  // Post interaction states (App.tsx'teki gibi)
  const [postLikes, setPostLikes] = useState<Record<string, number>>({})
  const [postReactions, setPostReactions] = useState<Record<string, { emoji: string; count: number }[]>>({})
  const [userPostReactions, setUserPostReactions] = useState<Record<string, string | null>>({})
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({})
  const [expandedMetadata, setExpandedMetadata] = useState<Record<string, boolean>>({})
  const [bookmarkedPosts, setBookmarkedPosts] = useState<string[]>([])
  const [repostedPosts, setRepostedPosts] = useState<string[]>([])
  const [repostCounts, setRepostCounts] = useState<Record<string, number>>({})
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null)
  const [emojiPickerHideTimer, setEmojiPickerHideTimer] = useState<NodeJS.Timeout | null>(null)
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const [expandedImages, setExpandedImages] = useState<Record<string, boolean>>({})
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [albumModalImages, setAlbumModalImages] = useState<string[]>([])
  const [albumModalIndex, setAlbumModalIndex] = useState(0)
  const [showAlbumModal, setShowAlbumModal] = useState(false)
  const [postSettings, setPostSettings] = useState<Record<string, { comments_disabled: boolean; muted: boolean }>>({})
  const [followingPosts] = useState<string[]>([])
  const [activeMenuPost, setActiveMenuPost] = useState<string | null>(null)
  const [userReactions, setUserReactions] = useState<Record<string, string | null>>({})
  const [commentEmojiPickerHideTimer, setCommentEmojiPickerHideTimer] = useState<NodeJS.Timeout | null>(null)
  const [commentSort, setCommentSort] = useState<Record<string, 'newest' | 'oldest' | 'popular'>>({})
  const [showCommentInputEmoji, setShowCommentInputEmoji] = useState<string | null>(null)
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({})
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [newComments, setNewComments] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<Record<string, boolean>>({});
  const [replyContents, setReplyContents] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [showCommentEmojiPicker, setShowCommentEmojiPicker] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState<string>('')
  
  // Reactions Modal states
  const [reactionsModalOpen, setReactionsModalOpen] = useState(false)
  const [reactionsModalCommentId, setReactionsModalCommentId] = useState<string | null>(null)
  const [reactionsModalData, setReactionsModalData] = useState<{ emoji: string; users: { user: Profile; reaction_type: string }[] }[]>([])
  const [reactionsModalActiveTab, setReactionsModalActiveTab] = useState<string>('ALL')
  const [loadingReactionsModal, setLoadingReactionsModal] = useState(false)
  
  // Function to create a notification
  const createNotification = useCallback(async ({
    userId,
    message,
    type,
    relatedEntityType,
    relatedEntityId,
    metadata
  }: {
    userId: string
    message: string
    type: string
    relatedEntityType?: string
    relatedEntityId?: string
    metadata?: Record<string, any>
  }) => {
    if (!currentUserId || userId === currentUserId) return // Don't send notification to self
    try {
      // Check user notification settings first
      let notificationEnabled = true
     
      try {
        const { data: settings, error: settingsError } = await supabase
          .from('user_settings')
          .select('push_comments, push_reactions')
          .eq('id', userId)
          .maybeSingle()
        // If settings table doesn't exist or has errors, use default (enabled)
        if (!settingsError && settings) {
          // Check if the specific notification type is enabled
          // Note: push_replies doesn't exist, using push_comments for both comments and replies
          if ((type === 'comment' || type === 'reply' || type === 'reply_to_reply' || type === 'comment_reply_on_post') && settings?.push_comments === false) {
            notificationEnabled = false
          } else if ((type === 'reaction' || type === 'comment_reaction' || type === 'reply_reaction' || type === 'post_reaction') && settings?.push_reactions === false) {
            notificationEnabled = false
          }
        }
      } catch (settingsErr) {
        // If user_settings table doesn't exist or has column errors, continue with default (enabled)
        console.warn('Could not fetch user settings, using default (enabled):', settingsErr)
      }
      if (notificationEnabled) {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            title: `New ${type}`,
            message,
            type,
            related_entity_type: relatedEntityType,
            related_entity_id: relatedEntityId,
            metadata: metadata || {}
          })
       
        if (notifError) {
          console.error(`Error creating ${type} notification:`, notifError)
        } else {
          console.log(`${type} notification created successfully for user:`, userId)
        }
      }
    } catch (err) {
      console.error(`Error in createNotification for ${type}:`, err)
    }
  }, [currentUserId])
 
  const highlightedCommentRef = useRef<HTMLDivElement>(null)
  const highlightedReplyRef = useRef<HTMLDivElement>(null)
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({})
  useEffect(() => {
    initializeUser()
  }, [])
  useEffect(() => {
    if (postId) {
      loadPost()
    }
  }, [postId, currentUserId])
  useEffect(() => {
    if (post && postId) {
      loadComments(postId)
    }
  }, [post, postId])
  // Scroll to highlighted comment/reply after load
  useEffect(() => {
    if (!loading && commentId && comments.length > 0) {
      // Expand the comment if we're highlighting a reply
      if (replyId) {
        setExpandedReplies(prev => ({ ...prev, [commentId]: true }))
      }
     
      setTimeout(() => {
        if (replyId && highlightedReplyRef.current) {
          highlightedReplyRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
        } else if (highlightedCommentRef.current) {
          highlightedCommentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 500)
    }
  }, [loading, commentId, replyId, comments])
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeMenuPost && menuRefs.current[activeMenuPost] &&
          !menuRefs.current[activeMenuPost]?.contains(event.target as Node)) {
        setActiveMenuPost(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [activeMenuPost])
  const initializeUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUserId(user.id)
     
      // Load user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
     
      if (profile) {
        setUserProfile(profile)
      }
    }
  }
  const loadPost = async () => {
    if (!postId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          user:profiles!user_id (id, full_name, profession, avatar_url, specialties, languages)
        `)
        .eq('id', postId)
        .single()
      if (error) throw error
      if (data) {
        // Load quoted post if exists
        let quotedPost = null
        if (data.post_metadata?.quoted_post_id) {
          const { data: quotedPostData } = await supabase
            .from('posts')
            .select(`
              *,
              user:profiles!user_id (id, full_name, profession, avatar_url)
            `)
            .eq('id', data.post_metadata.quoted_post_id)
            .single()
         
          if (quotedPostData) {
            quotedPost = quotedPostData
          }
        }
        // Load reposted post if this is a repost
        let originalPost = null
        if (data.post_metadata?.reposted_post_id) {
          const { data: originalPostData } = await supabase
            .from('posts')
            .select(`
              *,
              user:profiles!user_id (id, full_name, profession, avatar_url, specialties, languages)
            `)
            .eq('id', data.post_metadata.reposted_post_id)
            .single()
         
          if (originalPostData) {
            originalPost = {
              ...originalPostData,
              user: originalPostData.user || {
                id: originalPostData.user_id,
                full_name: 'Unknown User',
                profession: ''
              }
            }
          }
        }
        // Use original post ID for reactions/comments if this is a repost
        const postIdForReactions = data.post_metadata?.reposted_post_id || postId
        const stateKey = originalPost ? originalPost.id : postId
        // Load reaction counts
        const { data: reactions } = await supabase
          .from('post_reactions')
          .select('reaction_type')
          .eq('post_id', postIdForReactions)
       
        let likesCount = 0
        const emojiReactions: Record<string, number> = {}
       
        if (reactions) {
          reactions.forEach(r => {
            if (r.reaction_type === 'like' || r.reaction_type === '👍') {
              likesCount++
            } else {
              emojiReactions[r.reaction_type] = (emojiReactions[r.reaction_type] || 0) + 1
            }
          })
        }
        // Set reaction counts
        if (likesCount > 0) {
          setPostLikes(prev => ({ ...prev, [stateKey]: likesCount }))
        }
        if (Object.keys(emojiReactions).length > 0) {
          setPostReactions(prev => ({
            ...prev,
            [stateKey]: Object.entries(emojiReactions).map(([emoji, count]) => ({ emoji, count }))
          }))
        }
        // Check if current user reacted
        if (currentUserId) {
          const { data: userReaction } = await supabase
            .from('post_reactions')
            .select('reaction_type')
            .eq('post_id', postIdForReactions)
            .eq('user_id', currentUserId)
            .maybeSingle()
          if (userReaction) {
            setUserPostReactions(prev => ({ ...prev, [stateKey]: userReaction.reaction_type }))
          }
        }
        // Load repost count
        const { count: repostCount } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('post_metadata->>reposted_post_id', postIdForReactions)
        if (repostCount !== null && repostCount > 0) {
          setRepostCounts(prev => ({ ...prev, [stateKey]: repostCount }))
        }
        // Check if current user reposted
        if (currentUserId) {
          const { data: userRepost } = await supabase
            .from('posts')
            .select('id')
            .eq('user_id', currentUserId)
            .eq('post_metadata->>reposted_post_id', postIdForReactions)
            .maybeSingle()
          if (userRepost) {
            setRepostedPosts(prev => {
              if (!prev.includes(stateKey)) {
                return [...prev, stateKey]
              }
              return prev
            })
          }
          // Check if bookmarked
          const { data: bookmark } = await supabase
            .from('post_bookmarks')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', currentUserId)
            .maybeSingle()
         
          if (bookmark) {
            setBookmarkedPosts(prev => {
              if (!prev.includes(postId)) {
                return [...prev, postId]
              }
              return prev
            })
          }
        }
        // Update post metadata with quoted post data
        const updatedMetadata: PostMetadata = {
          ...data.post_metadata,
          professions: data.post_metadata?.professions || [],
          clinical_areas: data.post_metadata?.clinical_areas || [],
          tags: data.post_metadata?.tags || [],
          attachments: data.post_metadata?.attachments || [],
          co_authors: data.post_metadata?.co_authors || [],
          related_conditions: data.post_metadata?.related_conditions || [],
          is_public: data.post_metadata?.is_public ?? true
        }
       
        if (quotedPost) {
          updatedMetadata.quoted_post_data = {
            id: quotedPost.id,
            content: quotedPost.content,
            title: quotedPost.title,
            user_id: quotedPost.user_id,
            user: quotedPost.user
          }
        }
        // Set post settings
        setPostSettings(prev => ({
          ...prev,
          [postId]: {
            comments_disabled: data.comments_disabled ?? false,
            muted: data.muted ?? false
          }
        }))
        const finalPost: CommunityPost = {
          ...data,
          post_metadata: updatedMetadata,
          original_post: originalPost,
          replies_count: data.replies_count || 0
        }
        setPost(finalPost)
        setOpenComments(prev => ({ ...prev, [postId]: true })) // Auto-open comments on PostPage
      }
    } catch (err) {
      console.error('Error loading post:', err)
    } finally {
      setLoading(false)
    }
  }
  const loadComments = async (postId: string) => {
    try {
      // Load all comments for this post at once
      const { data: allComments, error } = await supabase
        .from('post_comments')
        .select(`
          *,
          user:profiles!user_id (id, full_name, profession, avatar_url)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
 
      if (error) {
        console.error('Error loading comments:', error)
        return
      }
 
      // Load comment reactions (likes and favorites) for all comments
      let favoritesMap: Record<string, boolean> = {}
      let userReactionsMap: Record<string, string | null> = {}
      const reactionsByComment: Record<string, { emoji: string; count: number }[]> = {}
      if (currentUserId && allComments && allComments.length > 0) {
        const commentIds = allComments.map(c => c.id)
       
        // Load all reactions for these comments with user info
        const { data: reactions, error: reactionsError } = await supabase
          .from('comment_reactions')
          .select('comment_id, reaction_type, user_id, user:profiles!user_id(id, full_name, profession, avatar_url)')
          .in('comment_id', commentIds)
        if (!reactionsError && reactions) {
          // Group reactions by comment and type
          let likesCountMap: Record<string, number> = {};
          reactions.forEach((reaction: any) => {
            if (!reactionsByComment[reaction.comment_id]) {
              reactionsByComment[reaction.comment_id] = [];
            }
            const existing = reactionsByComment[reaction.comment_id].find(r => r.emoji === reaction.reaction_type);
            if (existing) {
              existing.count++;
            } else {
              reactionsByComment[reaction.comment_id].push({ emoji: reaction.reaction_type, count: 1 });
            }
            // Count 'like' reactions and 👍 emoji for backward compatibility
            if (reaction.reaction_type === 'like' || reaction.reaction_type === '👍') {
              likesCountMap[reaction.comment_id] = (likesCountMap[reaction.comment_id] || 0) + 1;
            }
            if (reaction.reaction_type === 'favorite') {
              favoritesMap[reaction.comment_id] = true
            }
            // Track current user's reactions
            if (reaction.user_id === currentUserId) {
              userReactionsMap[reaction.comment_id] = reaction.reaction_type
            }
          })
          // Update state with loaded reactions - convert to user format
          setCommentReactions((prev) => {
            const newState: Record<string, Array<{ emoji: string; user_id: string; user: Profile }>> = { ...prev };
           
            // Group reactions by comment_id and convert to user format
            reactions.forEach((reaction: any) => {
              if (!newState[reaction.comment_id]) {
                newState[reaction.comment_id] = [];
              }
             
              // Add reaction with user info if available
              if (reaction.user_id && reaction.user) {
                newState[reaction.comment_id].push({
                  emoji: reaction.reaction_type,
                  user_id: reaction.user_id,
                  user: reaction.user as Profile
                });
              }
            });
           
            return newState;
          })
          setCommentLikes(prev => ({ ...prev, ...likesCountMap }))
          setCommentFavorites(prev => ({ ...prev, ...favoritesMap }))
          setUserReactions(prev => ({ ...prev, ...userReactionsMap }))
        }
      }
      // Build comment tree recursively, with favorites sorted to the top
      const buildCommentTree = (comments: any[], parentId: string | null = null): ExtendedComment[] => {
        const filtered = comments.filter(comment => {
          if (parentId === null) {
            return !comment.parent_reply_id
          }
          return comment.parent_reply_id === parentId
        })
       
        // Sort: favorites first, then by created_at
        const sorted = filtered.sort((a, b) => {
          const aIsFavorite = favoritesMap[a.id] || false
          const bIsFavorite = favoritesMap[b.id] || false
         
          if (aIsFavorite && !bIsFavorite) return -1
          if (!aIsFavorite && bIsFavorite) return 1
         
          // If both are favorites or both are not, sort by created_at
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        })
       
        return sorted.map(comment => ({
          ...comment,
          replies: buildCommentTree(comments, comment.id)
        }))
      }
 
      const commentsTree = buildCommentTree(allComments || [])
 
      setComments(commentsTree)
    } catch (err) {
      console.error('Error loading comments:', err)
    }
  }
  // Helper functions
  const getUserDisplayName = (user: any): string => {
    if (!user) return 'Unknown User';
    return user.full_name || 'Unknown User';
  };
  const getUserProfession = (user: any): string => {
    if (!user) return '';
    return user.profession || '';
  };
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
  const renderPostMetadata = (post: CommunityPost) => {
    const metadata = post.post_metadata || {}
    const isExpanded = expandedMetadata[post.id] || false
   
    // Collect all badges
    const allBadges: JSX.Element[] = []
   
    if (metadata.content_type) {
      allBadges.push(
        <span key="content_type" className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap">
          {metadata.content_type}
        </span>
      )
    }
   
    if (metadata.audience_level) {
      allBadges.push(
        <span key="audience_level" className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap">
          {metadata.audience_level}
        </span>
      )
    }
   
    if (metadata.language && metadata.language !== 'English') {
      allBadges.push(
        <span key="language" className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap">
          {metadata.language}
        </span>
      )
    }
   
    allBadges.push(...(metadata.professions || []).map((profession: string, idx: number) => (
      <span key={`profession-${idx}`} className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap">
        {profession}
      </span>
    )))
   
    allBadges.push(...(metadata.clinical_areas || []).map((area: string, idx: number) => (
      <span key={`clinical-${idx}`} className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap">
        {area}
      </span>
    )))
   
    allBadges.push(...(metadata.tags || []).map((tag: string, idx: number) => (
      <span key={`tag-${idx}`} className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap">
        #{tag}
      </span>
    )))
   
    if (allBadges.length === 0) return null
   
    const hasMultipleBadges = allBadges.length > 3
   
    return (
      <div className="mt-3">
        <div className={`flex gap-2 items-center ${isExpanded ? 'flex-wrap' : 'overflow-x-auto scrollbar-hide'}`}>
          <div className={`flex gap-2 items-center ${isExpanded ? 'flex-wrap' : ''}`}>
            {isExpanded ? allBadges : allBadges.slice(0, 3)}
          </div>
          {hasMultipleBadges && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setExpandedMetadata(prev => ({ ...prev, [post.id]: !prev[post.id] }))
              }}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap flex-shrink-0"
            >
              {isExpanded ? '−' : `+${allBadges.length - 3}`}
            </button>
          )}
        </div>
      </div>
    )
  }
  const toggleExpandPost = (postId: string) => {
    setExpandedPosts(prev => ({ ...prev, [postId]: !prev[postId] }))
  }
  const handleClose = () => {
    navigate('/community')
  }
  const handleLikePost = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) return;
    const currentReaction = userPostReactions[postId];
    const likeEmoji = '👍';
    try {
      if (currentReaction === likeEmoji) {
        // Remove 👍 reaction
        setPostReactions(prev => {
          const current = prev[postId] || [];
          return {
            ...prev,
            [postId]: current.map(r =>
              r.emoji === likeEmoji ? { ...r, count: Math.max(0, r.count - 1) } : r
            ).filter(r => r.count > 0)
          };
        });
        setUserPostReactions(prev => ({ ...prev, [postId]: null }));
        await supabase
          .from('post_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUserId);
      } else {
        // Add 👍 reaction, remove old reaction if exists
        setPostReactions(prev => {
          const current = prev[postId] || [];
          const existing = current.find(r => r.emoji === likeEmoji);
          if (existing) {
            return {
              ...prev,
              [postId]: current.map(r =>
                r.emoji === likeEmoji ? { ...r, count: r.count + 1 } : r
              )
            };
          } else {
            return {
              ...prev,
              [postId]: [...current, { emoji: likeEmoji, count: 1 }]
            };
          }
        });
        if (currentReaction && currentReaction !== likeEmoji) {
          setPostReactions(prev => {
            const current = prev[postId] || [];
            return {
              ...prev,
              [postId]: current.map(r =>
                r.emoji === currentReaction ? { ...r, count: Math.max(0, r.count - 1) } : r
              ).filter(r => r.count > 0)
            };
          });
          await supabase
            .from('post_reactions')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', currentUserId);
        }
        setUserPostReactions(prev => ({ ...prev, [postId]: likeEmoji }));
        await supabase
          .from('post_reactions')
          .upsert({ post_id: postId, user_id: currentUserId, reaction_type: likeEmoji }, { onConflict: 'post_id,user_id' });
        // Create notification for post owner
        // Use original post owner if this is a repost
        let targetPostUserId: string | null = null
        let targetPostIdForNotification = postId
        // Try to get post info from state first
        if (post) {
          const targetPost = post.original_post || post
          targetPostUserId = targetPost?.user_id || null
          targetPostIdForNotification = post.original_post?.id || postId
        } else {
          // If post state is not available, fetch minimal data from database
          const { data: postData } = await supabase
            .from('posts')
            .select('id, user_id, post_metadata')
            .eq('id', postId)
            .single()
         
          if (postData) {
            // Check if this is a repost
            if (postData.post_metadata?.reposted_post_id) {
              const { data: originalPostData } = await supabase
                .from('posts')
                .select('id, user_id')
                .eq('id', postData.post_metadata.reposted_post_id)
                .single()
             
              if (originalPostData) {
                targetPostUserId = originalPostData.user_id
                targetPostIdForNotification = originalPostData.id
              } else {
                targetPostUserId = postData.user_id
                targetPostIdForNotification = postId
              }
            } else {
              targetPostUserId = postData.user_id
              targetPostIdForNotification = postId
            }
          }
        }
       
        if (targetPostUserId && targetPostUserId !== currentUserId) {
          const { data: currentUserProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', currentUserId)
            .single()
          // Check user notification settings
          const { data: settings, error: settingsError } = await supabase
            .from('user_settings')
            .select('push_post_reactions')
            .eq('id', targetPostUserId)
            .maybeSingle()
          // PGRST116 means no record found, which is fine - use default (enabled)
          if (settingsError && settingsError.code !== 'PGRST116') {
            console.error('Error fetching user settings for like notification:', settingsError)
          }
          // If no settings found or push_post_reactions is not false, send notification
          if ((!settingsError || settingsError.code === 'PGRST116') && settings?.push_post_reactions !== false) {
            const { error: notifError } = await supabase
              .from('notifications')
              .insert({
                user_id: targetPostUserId,
                title: 'New like on your post',
                message: `${currentUserProfile?.full_name || 'Someone'} liked your post`,
                type: 'post_reaction',
                related_entity_type: 'post',
                related_entity_id: targetPostIdForNotification,
                actor_id: currentUserId
              })
           
            if (notifError) {
              console.error('Error creating like notification:', notifError)
            } else {
              console.log('Like notification created successfully for user:', targetPostUserId)
            }
          }
        }
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };
  const handleEmojiReaction = async (postId: string, emoji: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) return;
    try {
      const currentReaction = userPostReactions[postId];
      if (currentReaction === emoji) {
        // Remove reaction
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
        await supabase
          .from('post_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUserId);
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
            .eq('user_id', currentUserId);
        }
        setUserPostReactions(prev => ({ ...prev, [postId]: emoji }));
        await supabase
          .from('post_reactions')
          .upsert({ post_id: postId, user_id: currentUserId, reaction_type: emoji }, { onConflict: 'post_id,user_id' });
        // Create notification for post owner
        // Use original post owner if this is a repost
        let targetPostUserId: string | null = null
        let targetPostIdForNotification = postId
        // Try to get post info from state first
        if (post) {
          const targetPost = post.original_post || post
          targetPostUserId = targetPost?.user_id || null
          targetPostIdForNotification = post.original_post?.id || postId
        } else {
          // If post state is not available, fetch minimal data from database
          const { data: postData } = await supabase
            .from('posts')
            .select('id, user_id, post_metadata')
            .eq('id', postId)
            .single()
         
          if (postData) {
            // Check if this is a repost
            if (postData.post_metadata?.reposted_post_id) {
              const { data: originalPostData } = await supabase
                .from('posts')
                .select('id, user_id')
                .eq('id', postData.post_metadata.reposted_post_id)
                .single()
             
              if (originalPostData) {
                targetPostUserId = originalPostData.user_id
                targetPostIdForNotification = originalPostData.id
              } else {
                targetPostUserId = postData.user_id
                targetPostIdForNotification = postId
              }
            } else {
              targetPostUserId = postData.user_id
              targetPostIdForNotification = postId
            }
          }
        }
       
        if (targetPostUserId && targetPostUserId !== currentUserId) {
          const { data: currentUserProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', currentUserId)
            .single()
          // Check user notification settings
          const { data: settings, error: settingsError } = await supabase
            .from('user_settings')
            .select('push_post_reactions')
            .eq('id', targetPostUserId)
            .maybeSingle()
          // PGRST116 means no record found, which is fine - use default (enabled)
          if (settingsError && settingsError.code !== 'PGRST116') {
            console.error('Error fetching user settings for emoji reaction notification:', settingsError)
          }
          // If no settings found or push_post_reactions is not false, send notification
          if ((!settingsError || settingsError.code === 'PGRST116') && settings?.push_post_reactions !== false) {
            const { error: notifError } = await supabase
              .from('notifications')
              .insert({
                user_id: targetPostUserId,
                title: 'New reaction on your post',
                message: `${currentUserProfile?.full_name || 'Someone'} reacted ${emoji} to your post`,
                type: 'post_reaction',
                related_entity_type: 'post',
                related_entity_id: targetPostIdForNotification,
                actor_id: currentUserId
              })
           
            if (notifError) {
              console.error('Error creating emoji reaction notification:', notifError)
            } else {
              console.log('Emoji reaction notification created successfully for user:', targetPostUserId)
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
  const handleBookmarkPost = async (postId: string) => {
    if (!currentUserId) return
    try {
      const isBookmarked = bookmarkedPosts.includes(postId)
     
      if (isBookmarked) {
        await supabase
          .from('post_bookmarks')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUserId)
       
        setBookmarkedPosts(prev => prev.filter(id => id !== postId))
      } else {
        await supabase
          .from('post_bookmarks')
          .insert({
            post_id: postId,
            user_id: currentUserId
          })
       
        setBookmarkedPosts(prev => [...prev, postId])
      }
    } catch (err) {
      console.error('Error toggling bookmark:', err)
    }
  }
  const handleRepost = async (postIdToRepost: string) => {
    if (!currentUserId || !post) return;
    try {
      const isReposted = repostedPosts.includes(postIdToRepost);
     
      if (isReposted) {
        // Remove repost
        const { error: deleteError } = await supabase
          .from('reposts')
          .delete()
          .eq('post_id', postIdToRepost)
          .eq('user_id', currentUserId);
        if (deleteError) throw deleteError;
        setRepostedPosts(prev => prev.filter(id => id !== postIdToRepost));
      } else {
        // Add repost
        const { error: insertError } = await supabase
          .from('reposts')
          .insert({
            post_id: postIdToRepost,
            user_id: currentUserId
          });
        if (insertError) throw insertError;
        setRepostedPosts(prev => [...prev, postIdToRepost]);
        // Send notification to the original post author
        if (post.user_id !== currentUserId) {
          await createNotification({
            userId: post.user_id,
            message: `${userProfile?.full_name || 'Someone'} reposted your post`,
            type: 'repost',
            relatedEntityType: 'post',
            relatedEntityId: postIdToRepost,
            metadata: {
              post_id: postIdToRepost
            }
          });
        }
      }
    } catch (err) {
      console.error('Error toggling repost:', err);
      toast.error('Failed to update repost');
    }
  };
  const handleAddReply = async (postId: string, commentId: string, content: string) => {
    if (!currentUserId || !content.trim() || !post) return;
    try {
      // Get the comment being replied to
      const parentComment = comments.find(c => c.id === commentId) ||
                          comments.flatMap(c => c.replies || []).find(r => r.id === commentId) as ExtendedComment | undefined;
     
      if (!parentComment) {
        throw new Error('Parent comment not found');
      }
      const { data: reply, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: currentUserId,
          content: content.trim(),
          parent_reply_id: commentId
        })
        .select()
        .single();
      if (error) throw error;
      // Add the reply to the correct comment
      setComments((prev: ExtendedComment[]) => {
        return prev.map((comment: ExtendedComment) => {
          if (comment.id === commentId) {
            return {
              ...comment,
              replies: [
                {
                  ...reply,
                  user: userProfile || null,
                  replies: [],
                  created_at: new Date().toISOString()
                },
                ...(comment.replies || [])
              ],
              reply_count: (comment.reply_count || 0) + 1
            };
          } else if (comment.replies?.some(r => r.id === commentId)) {
            // Handle nested replies
            return {
              ...comment,
              replies: comment.replies?.map((reply: any) => {
                if (reply.id === commentId) {
                  return {
                    ...reply,
                    replies: [
                      {
                        ...reply,
                        user: userProfile || null,
                        created_at: new Date().toISOString()
                      },
                      ...(reply.replies || [])
                    ],
                    reply_count: (reply.reply_count || 0) + 1
                  } as ExtendedComment;
                }
                return reply as ExtendedComment;
              }) || []
            };
          }
          return comment;
        });
      });
      // Clear the reply input
      setReplyContents((prev: Record<string, string>) => ({ ...prev, [commentId]: '' }));
      setReplyingTo((prev: Record<string, boolean>) => ({ ...prev, [commentId]: false }));
      // Update reply count in the parent comment
      setComments((prev: ExtendedComment[]) => {
        return prev.map((c: ExtendedComment) => c.id === commentId
          ? { ...c, reply_count: (c.reply_count || 0) + 1 }
          : c
        );
      });
      // If this is a reply to a reply, expand the parent comment
      if (parentComment?.parent_id) {
        setExpandedReplies((prev: Record<string, boolean>) => ({ ...prev, [parentComment.parent_id!]: true }));
      }
      // Expand the replies for the comment being replied to
      setExpandedReplies((prev: Record<string, boolean>) => ({ ...prev, [commentId]: true }));
      // Send notification to the comment author (if it's not the current user)
      if (parentComment.user_id !== currentUserId) {
        const notificationType = parentComment.parent_id ? 'reply_to_reply' : 'reply';
       
        try {
          await createNotification({
            userId: parentComment.user_id,
            message: `${userProfile?.full_name || 'Someone'} replied to your ${parentComment.parent_id ? 'reply' : 'comment'}: "${content.trim().substring(0, 30)}${content.trim().length > 30 ? '...' : ''}"`,
            type: notificationType,
            relatedEntityType: 'comment',
            relatedEntityId: commentId,
            metadata: {
              comment_id: reply.id,
              parent_comment_id: commentId,
              post_id: postId
            }
          });
          console.log('Reply notification sent to comment author:', parentComment.user_id);
        } catch (notifErr) {
          console.error('Error sending reply notification:', notifErr);
          // Don't throw - notification failure shouldn't break the reply
        }
      }
      // Also notify the post author if they're different from the comment author and current user
      if (post.user_id !== currentUserId && post.user_id !== parentComment.user_id) {
        try {
          await createNotification({
            userId: post.user_id,
            message: `${userProfile?.full_name || 'Someone'} replied to a comment on your post`,
            type: 'comment_reply_on_post',
            relatedEntityType: 'post',
            relatedEntityId: postId,
            metadata: {
              comment_id: reply.id,
              parent_comment_id: commentId,
              post_id: postId
            }
          });
          console.log('Reply notification sent to post author:', post.user_id);
        } catch (notifErr) {
          console.error('Error sending reply notification to post author:', notifErr);
          // Don't throw - notification failure shouldn't break the reply
        }
      }
      toast.success('Reply added successfully');
    } catch (err) {
      console.error('Error adding reply:', err);
      toast.error('Failed to add reply');
    }
  };
  const handleReaction = useCallback(async (commentId: string, emoji: string) => {
    if (!currentUserId) return;
    try {
      const comment = comments.find(c => c.id === commentId) ||
                    comments.flatMap(c => c.replies || []).find(r => r.id === commentId) as ExtendedComment;
     
      if (!comment) return;
      const isReply = !!comment.parent_reply_id;
      const targetUserId = comment.user_id;
     
      // Check if user already reacted with this emoji
      const userHasReacted = commentReactions[commentId]?.some(
        (r: any) =>
          r.emoji === emoji && r.user_id === currentUserId
      );
      if (userHasReacted) {
        // Remove reaction
        const { error } = await supabase
          .from('comment_reactions')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', currentUserId)
          .eq('reaction_type', emoji);
        if (error) throw error;
        // Update local state
        setCommentReactions((prev: Record<string, Array<{ emoji: string; user_id: string; user: Profile }>>) => ({
          ...prev,
          [commentId]: (prev[commentId] || []).filter(
            r => !(r.emoji === emoji && r.user_id === currentUserId)
          )
        }));
        // Update commentLikes if it's a like reaction
        if (emoji === '👍' || emoji === 'like') {
          setCommentLikes((prev) => ({
            ...prev,
            [commentId]: Math.max(0, (prev[commentId] || 0) - 1)
          }));
        }
      } else {
        // Check if user has any existing reaction on this comment
        const existingReaction = commentReactions[commentId]?.find(
          (r: any) => r.user_id === currentUserId
        );
        
        // If user has an existing reaction (different emoji), remove it first
        if (existingReaction) {
          const { error: deleteError } = await supabase
            .from('comment_reactions')
            .delete()
            .eq('comment_id', commentId)
            .eq('user_id', currentUserId);
          
          if (deleteError) throw deleteError;
          
          // Update local state to remove the old reaction
          setCommentReactions((prev: Record<string, Array<{ emoji: string; user_id: string; user: Profile }>>) => ({
            ...prev,
            [commentId]: (prev[commentId] || []).filter(
              r => r.user_id !== currentUserId
            )
          }));
          
          // Update commentLikes if the old reaction was a like
          if (existingReaction.emoji === '👍' || existingReaction.emoji === 'like') {
            setCommentLikes((prev) => ({
              ...prev,
              [commentId]: Math.max(0, (prev[commentId] || 0) - 1)
            }));
          }
        }
        
        // Add new reaction
        const { error } = await supabase
          .from('comment_reactions')
          .upsert({
            comment_id: commentId,
            user_id: currentUserId,
            reaction_type: emoji
          }, {
            onConflict: 'user_id,comment_id,reaction_type'
          });
        
        if (error) throw error;
        
        // Update local state
        setCommentReactions((prev: Record<string, Array<{ emoji: string; user_id: string; user: Profile }>>) => ({
          ...prev,
          [commentId]: [
            ...(prev[commentId] || []).filter(r => r.user_id !== currentUserId),
            {
              emoji: emoji,
              user_id: currentUserId,
              user: userProfile as Profile
            }
          ]
        }));
        
        // Update commentLikes if it's a like reaction
        if (emoji === '👍' || emoji === 'like') {
          setCommentLikes((prev) => ({
            ...prev,
            [commentId]: (prev[commentId] || 0) + 1
          }));
        }
        // Send notification for reaction
        if (targetUserId !== currentUserId) {
          const reactionType = isReply ? 'reply_reaction' : 'comment_reaction';
         
          try {
            await createNotification({
              userId: targetUserId,
              message: `${userProfile?.full_name || 'Someone'} reacted with ${emoji} to your ${isReply ? 'reply' : 'comment'}`,
              type: reactionType,
              relatedEntityType: 'comment',
              relatedEntityId: commentId,
              metadata: {
                emoji,
                is_reply: isReply,
                post_id: comment.post_id
              }
            });
            console.log('Reaction notification sent to:', targetUserId);
          } catch (notifErr) {
            console.error('Error sending reaction notification:', notifErr);
            // Don't throw - notification failure shouldn't break the reaction
          }
        }
      }
    } catch (err) {
      console.error('Error toggling reaction:', err);
      toast.error('Failed to update reaction');
    }
  }, [currentUserId, comments, commentReactions, userProfile, createNotification]);
  
  // Load comment reactions modal
  const loadCommentReactionsModal = async (commentId: string) => {
    setReactionsModalOpen(true)
    setReactionsModalCommentId(commentId)
    setLoadingReactionsModal(true)
    setReactionsModalActiveTab('ALL')
    
    try {
      const { data: reactions, error } = await supabase
        .from('comment_reactions')
        .select('user_id, reaction_type, profiles!comment_reactions_user_id_fkey(*)')
        .eq('comment_id', commentId)
      
      if (error) throw error
      
      const reactionsByType: Record<string, { user: Profile; reaction_type: string }[]> = {}
      
      if (reactions) {
        reactions.forEach((reaction: any) => {
          const reactionType = reaction.reaction_type === 'like' ? '👍' : reaction.reaction_type
          if (!reactionsByType[reactionType]) {
            reactionsByType[reactionType] = []
          }
          if (reaction.profiles) {
            reactionsByType[reactionType].push({
              user: reaction.profiles as Profile,
              reaction_type: reaction.reaction_type
            })
          }
        })
      }
      
      const reactionsArray = Object.entries(reactionsByType).map(([emoji, users]) => ({
        emoji,
        users
      })).sort((a, b) => b.users.length - a.users.length)
      
      setReactionsModalData(reactionsArray)
    } catch (err) {
      console.error('Error loading comment reactions:', err)
      setReactionsModalData([])
    } finally {
      setLoadingReactionsModal(false)
    }
  }
  
  // Add missing state variables
  const [commentLikes, setCommentLikes] = useState<Record<string, number>>({});
  const [commentFavorites, setCommentFavorites] = useState<Record<string, boolean>>({});
  const handleAddComment = async (postId: string, content: string) => {
    if (!currentUserId || !content.trim() || !post) return;
    try {
      const { data: comment, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: currentUserId,
          content: content.trim(),
          parent_reply_id: null
        })
        .select()
        .single();
      if (error) throw error;
      // Add the new comment to the state
      setComments((prev: ExtendedComment[]) => [{
        ...comment,
        user: userProfile || null,
        replies: [],
        reply_count: 0,
        created_at: new Date().toISOString()
      }, ...prev]);
      // Clear the comment input
      setNewComments((prev: Record<string, string>) => ({ ...prev, [postId]: '' }));
      // Update comment count in the post
      setPost((prev: CommunityPost | null) => prev ? {
        ...prev,
        replies_count: (prev.replies_count || 0) + 1
      } : null);
      // Send notification to post author if it's not the current user
      if (post.user_id !== currentUserId) {
        await createNotification({
          userId: post.user_id,
          message: `${userProfile?.full_name || 'Someone'} commented on your post: "${content.trim().substring(0, 30)}${content.trim().length > 30 ? '...' : ''}"`,
          type: 'comment',
          relatedEntityType: 'post',
          relatedEntityId: postId,
          metadata: {
            comment_id: comment.id,
            post_id: postId
          }
        });
      }
      toast.success('Comment added successfully');
    } catch (err) {
      console.error('Error adding comment:', err);
      toast.error('Failed to add comment');
    }
  };
  const handleEditComment = async (commentId: string, newContent: string) => {
    if (!currentUserId || !newContent.trim()) return;
    try {
      const { error } = await supabase
        .from('post_comments')
        .update({ content: newContent.trim(), updated_at: new Date().toISOString() })
        .eq('id', commentId)
        .eq('user_id', currentUserId);
      if (error) throw error;
      // Update local state
      setComments((prev: ExtendedComment[]) => {
        return prev.map((comment: ExtendedComment) => {
          if (comment.id === commentId) {
            return { ...comment, content: newContent.trim(), updated_at: new Date().toISOString() };
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.map((reply: ExtendedComment) =>
                reply.id === commentId
                  ? { ...reply, content: newContent.trim(), updated_at: new Date().toISOString() }
                  : reply
              )
            };
          }
          return comment;
        });
      });
      setEditingCommentId(null);
      toast.success('Comment updated successfully');
    } catch (err) {
      console.error('Error editing comment:', err);
      toast.error('Failed to edit comment');
    }
  };
  const handleDeleteComment = async (commentId: string) => {
    if (!currentUserId || !confirm('Are you sure you want to delete this comment?')) return;
    try {
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', currentUserId);
      if (error) throw error;
      // Update local state
      setComments((prev: ExtendedComment[]) => {
        return prev.filter((comment: ExtendedComment) => {
          if (comment.id === commentId) return false;
          if (comment.replies) {
            comment.replies = comment.replies.filter((reply: ExtendedComment) => reply.id !== commentId);
          }
          return true;
        });
      });
      toast.success('Comment deleted successfully');
    } catch (err) {
      console.error('Error deleting comment:', err);
      toast.error('Failed to delete comment');
    }
  };
  const handleFavoriteComment = async (commentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) return;
    const currentFavorite = commentFavorites[commentId];
   
    try {
      setCommentFavorites(prev => ({ ...prev, [commentId]: !currentFavorite }));
      if (currentFavorite) {
        const { error } = await supabase
          .from('comment_reactions')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', currentUserId)
          .eq('reaction_type', 'favorite');
        if (error) {
          setCommentFavorites(prev => ({ ...prev, [commentId]: currentFavorite }));
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('comment_reactions')
          .upsert({
            comment_id: commentId,
            user_id: currentUserId,
            reaction_type: 'favorite'
          }, {
            onConflict: 'user_id,comment_id,reaction_type'
          });
        if (error) {
          setCommentFavorites(prev => ({ ...prev, [commentId]: currentFavorite }));
          throw error;
        }
      }
    } catch (err) {
      console.error('Error updating favorite:', err);
      toast.error('Failed to update favorite');
    }
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-block">
            <div className="animate-spin h-12 w-12 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
            <div className="absolute inset-0 animate-ping h-12 w-12 border-4 border-blue-400 rounded-full opacity-20"></div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading post...</p>
        </div>
      </div>
    )
  }
  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Post not found</h2>
          <p className="text-gray-500 mb-6">This post may have been deleted or doesn't exist.</p>
          <button
            onClick={handleClose}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 font-medium shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Go to Community
          </button>
        </div>
      </div>
    )
  }
  // Determine display post (for reposts)
  const isRepost = post.post_metadata?.is_repost && post.original_post
  const displayPost = isRepost ? post.original_post : post
  const reposter = isRepost ? post.user : null
  const originalAuthor = displayPost?.user
  const postIdForReactions = displayPost?.id || post.id
  const stateKey = post.original_post ? post.original_post.id : post.id
  if (!displayPost) return null
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-40 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            onClick={handleClose}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-gray-900 text-lg">Post</h1>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Post Card - App.tsx'teki gibi */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 sm:p-4 shadow-lg border border-white/50 hover:shadow-xl hover:bg-white transition-all duration-300 group/card mb-6">
          {/* Repost Header */}
          {isRepost && reposter && (
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
              <Avatar
                src={reposter.avatar_url}
                name={getUserDisplayName(reposter)}
                className="w-6 h-6"
                useInlineSize={false}
              />
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/profile/${reposter.id}`); }}
                  className="font-medium hover:text-blue-600 transition-colors"
                >
                  {getUserDisplayName(reposter)}
                </button>
                <span>reposted this</span>
              </div>
            </div>
          )}
          {/* Post Header with Menu */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/profile/${displayPost.user_id || originalAuthor?.id}`); }}
                  className="flex-shrink-0 hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <Avatar src={originalAuthor?.avatar_url} name={getUserDisplayName(originalAuthor)} className="w-8 h-8" useInlineSize={false} />
                </button>
                <div>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/profile/${displayPost.user_id || originalAuthor?.id}`); }}
                    className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer text-left"
                  >
                    {getUserDisplayName(originalAuthor)}
                  </button>
                  <p className="text-xs text-gray-500">
                    {getUserProfession(originalAuthor)} • {formatTime(displayPost.created_at || post.created_at)}
                    {displayPost.updated_at && displayPost.updated_at !== displayPost.created_at && (
                      <span className="text-gray-400"> (edited)</span>
                    )}
                  </p>
                </div>
              </div>
             
              {/* Post Metadata */}
              {displayPost && renderPostMetadata(displayPost)}
             
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
                {/* Mood Display */}
                {displayPost.post_metadata?.mood && (
                  <span className="flex items-center gap-1 text-gray-500">
                    <span className="text-sm">
                      {MOOD_OPTIONS.find(m => m.label === displayPost.post_metadata?.mood)?.emoji || '😊'}
                    </span>
                    <span className="text-xs">Feeling {displayPost.post_metadata.mood}</span>
                  </span>
                )}
                {/* Location Display */}
                {displayPost.post_metadata?.location && (
                  <span className="flex items-center gap-1 text-gray-500">
                    <MapPin className="w-3 h-3" />
                    <span className="text-xs">{displayPost.post_metadata.location}</span>
                  </span>
                )}
              </div>
            </div>
            {/* Menu Button */}
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
                <div className="absolute right-0 top-10 w-12 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1">
                  {post.user_id === currentUserId ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          // Edit functionality
                        }}
                        className="flex items-center justify-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        title="Edit Post"
                      >
                        <Edit2 className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          // Toggle comments
                        }}
                        className="flex items-center justify-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        title="Toggle Comments"
                      >
                        <MessageSquare className="w-4 h-4 text-green-600" />
                      </button>
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (confirm('Are you sure you want to delete this post?')) {
                            try {
                              await supabase.from('posts').delete().eq('id', post.id)
                              toast.success('Post deleted')
                              navigate('/community')
                            } catch (err) {
                              toast.error('Failed to delete post')
                            }
                          }
                        }}
                        className="flex items-center justify-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete Post"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          const postUrl = `${window.location.origin}/post/${post.id}`;
                          try {
                            await navigator.clipboard.writeText(postUrl);
                            toast.success('Post link copied to clipboard!');
                          } catch (err) {
                            toast.error('Failed to copy link');
                          }
                        }}
                        className="flex items-center justify-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
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
          {/* Poll Display (Before Content) */}
          {displayPost.post_metadata?.poll && displayPost.post_metadata.poll.position === 'before' && (
            <div className="mb-3 border border-gray-200 rounded-xl p-4 bg-gray-50">
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Poll</span>
              </div>
              <div className="space-y-2">
                {displayPost.post_metadata.poll.options.map((option: string, idx: number) => {
                  const poll = displayPost.post_metadata?.poll
                  const votes = poll?.votes || {}
                  const totalVotes = Object.values(votes).reduce((sum: number, v) => sum + (v as number), 0)
                  const optionVotes = votes[`option_${idx}`] || 0
                  const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0
                  const hasVoted = poll?.voters?.includes(currentUserId || '')
                 
                  return (
                    <button
                      key={idx}
                      disabled={hasVoted}
                      className={`w-full text-left relative overflow-hidden rounded-lg border transition-all ${
                        hasVoted
                          ? 'border-gray-200 cursor-default'
                          : 'border-blue-200 hover:border-blue-400 cursor-pointer'
                      }`}
                    >
                      {hasVoted && (
                        <div
                          className="absolute inset-y-0 left-0 bg-gray-100 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      )}
                      <div className="relative px-4 py-2.5 flex items-center justify-between">
                        <span className="text-sm text-gray-700">{option}</span>
                        {hasVoted && (
                          <span className="text-xs text-gray-500">{percentage}%</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          {/* Post Content with See More/Less */}
          <div className="group relative text-gray-700 mb-2 text-sm leading-relaxed">
            {(() => {
              const postContent = displayPost.content || ''
              const textContent = postContent.replace(/<[^>]*>/g, '')
              const contentLength = textContent.length
              const hasImages = /<img[^>]*>/i.test(postContent)
              const needsCollapse = contentLength > 300 || hasImages
              const isExpanded = expandedPosts[post.id]
             
              return (
                <>
                  {needsCollapse && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleExpandPost(post.id); }}
                        className={`sticky top-2 right-2 z-10 opacity-0 group-hover:opacity-100 bg-white shadow-md rounded-md px-3 py-1 text-sm text-blue-600 hover:bg-gray-50 transition-all duration-200 ${isExpanded ? 'block' : 'hidden'}`}
                      >
                        See less
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleExpandPost(post.id); }}
                        className={`absolute bottom-2 right-2 z-10 opacity-0 group-hover:opacity-100 bg-white shadow-md rounded-md px-3 py-1 text-sm text-blue-600 hover:bg-gray-50 transition-all duration-200 ${isExpanded ? 'hidden' : 'block'}`}
                      >
                        See more
                      </button>
                    </>
                  )}
                  <div
                    className={`
                      ${isExpanded || !needsCollapse ? '' : 'max-h-[200px] overflow-hidden'}
                      rich-text-content
                    `}
                    dangerouslySetInnerHTML={{ __html: postContent }}
                  />
                  {!isExpanded && needsCollapse && (
                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                  )}
                </>
              )
            })()}
          </div>
          {/* Poll Display (After Content) */}
          {displayPost.post_metadata?.poll && (displayPost.post_metadata.poll.position === 'after' || !displayPost.post_metadata.poll.position) && (
            <div className="mb-3 border border-gray-200 rounded-xl p-4 bg-gray-50">
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Poll</span>
              </div>
              <div className="space-y-2">
                {displayPost.post_metadata.poll.options.map((option: string, idx: number) => {
                  const poll = displayPost.post_metadata?.poll
                  const votes = poll?.votes || {}
                  const totalVotes = Object.values(votes).reduce((sum: number, v) => sum + (v as number), 0)
                  const optionVotes = votes[`option_${idx}`] || 0
                  const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0
                  const hasVoted = poll?.voters?.includes(currentUserId || '')
                 
                  return (
                    <button
                      key={idx}
                      disabled={hasVoted}
                      className={`w-full text-left relative overflow-hidden rounded-lg border transition-all ${
                        hasVoted
                          ? 'border-gray-200 cursor-default'
                          : 'border-blue-200 hover:border-blue-400 cursor-pointer'
                      }`}
                    >
                      {hasVoted && (
                        <div
                          className="absolute inset-y-0 left-0 bg-gray-100 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      )}
                      <div className="relative px-4 py-2.5 flex items-center justify-between">
                        <span className="text-sm text-gray-700">{option}</span>
                        {hasVoted && (
                          <span className="text-xs text-gray-500">{percentage}%</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          {/* Quoted Post */}
          {displayPost.post_metadata?.quoted_post_data && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                const quotedPostId = displayPost.post_metadata?.quoted_post_data?.id
                if (quotedPostId) {
                  navigate(`/post/${quotedPostId}`)
                }
              }}
              className="w-full text-left border-l-4 border-blue-500 bg-gray-50 rounded-lg p-2.5 mb-2 mt-2 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-2">
                <Avatar
                  src={displayPost.post_metadata.quoted_post_data.user?.avatar_url}
                  name={displayPost.post_metadata.quoted_post_data.user?.full_name || 'Unknown'}
                  className="w-6 h-6"
                  useInlineSize={false}
                />
                <div>
                  <p className="text-xs font-semibold text-gray-900">
                    {displayPost.post_metadata.quoted_post_data.user?.full_name || 'Unknown User'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {displayPost.post_metadata.quoted_post_data.user?.profession || ''}
                  </p>
                </div>
              </div>
              <div
                className="text-sm text-gray-700 line-clamp-4 rich-text-content pointer-events-none"
                dangerouslySetInnerHTML={{ __html: displayPost.post_metadata.quoted_post_data.content }}
              />
            </button>
          )}
          {/* Attachments */}
          {displayPost.post_metadata?.attachments && displayPost.post_metadata.attachments.length > 0 && (
            <div className="mb-2">
              {(() => {
                const attachments = displayPost.post_metadata.attachments
                const images = attachments.filter((a: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(a))
                const files = attachments.filter((a: string) => !/\.(jpg|jpeg|png|gif|webp)$/i.test(a))
                const showAll = expandedImages[post.id]
                const displayImages = showAll ? images : images.slice(0, 3)
                const hiddenCount = images.length - 3
               
                return (
                  <>
                    {images.length > 0 && (
                      <div className={`grid gap-1 rounded-xl overflow-hidden ${
                        images.length === 1 ? 'grid-cols-1' :
                        images.length === 2 ? 'grid-cols-2' : 'grid-cols-2'
                      }`}>
                        {displayImages.map((attachment: string, idx: number) => (
                          <div
                            key={idx}
                            className={`relative cursor-pointer overflow-hidden group bg-gray-100 flex items-center justify-center ${
                              images.length === 1 ? 'max-h-96' :
                              images.length === 2 ? 'max-h-64' :
                              idx === 0 ? 'row-span-2 max-h-80' : 'max-h-40'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation()
                              setLightboxImage(attachment)
                            }}
                          >
                            <img
                              src={attachment}
                              alt={`Attachment ${idx + 1}`}
                              className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
                            />
                            {idx === 2 && !showAll && hiddenCount > 0 && (
                              <div
                                className="absolute inset-0 bg-black/60 flex items-center justify-center"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setExpandedImages((prev: Record<string, boolean>) => ({ ...prev, [post.id]: true }))
                                }}
                              >
                                <span className="text-white text-2xl font-bold">+{hiddenCount}</span>
                              </div>
                            )}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center">
                                <Maximize2 className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                   
                    {showAll && images.length > 3 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setExpandedImages((prev: Record<string, boolean>) => ({ ...prev, [post.id]: false }))
                        }}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Show less
                      </button>
                    )}
                   
                    {files.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {files.map((attachment: string, idx: number) => (
                          <a
                            key={idx}
                            href={attachment}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                            <span className="text-sm">Attachment {idx + 1}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          )}
          {/* Album Display */}
          {displayPost.post_metadata?.album && displayPost.post_metadata.album.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-2">
                <Bookmark className="w-4 h-4 text-pink-600" />
                <span className="text-sm font-medium text-gray-700">Album ({displayPost.post_metadata.album.length} photos)</span>
              </div>
              <div className={`grid gap-1 rounded-xl overflow-hidden ${
                displayPost.post_metadata.album.length === 1 ? 'grid-cols-1' :
                displayPost.post_metadata.album.length === 2 ? 'grid-cols-2' :
                displayPost.post_metadata.album.length === 3 ? 'grid-cols-3' : 'grid-cols-4'
              }`}>
                {displayPost.post_metadata.album.slice(0, 8).map((img: string, idx: number) => (
                  <div
                    key={idx}
                    className="relative cursor-pointer overflow-hidden group aspect-square"
                    onClick={(e) => {
                      e.stopPropagation()
                      setAlbumModalImages(displayPost.post_metadata?.album || [])
                      setAlbumModalIndex(idx)
                      setShowAlbumModal(true)
                    }}
                  >
                    <img
                      src={img}
                      alt={`Album ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {idx === 7 && (displayPost.post_metadata?.album?.length || 0) > 8 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white text-2xl font-bold">+{(displayPost.post_metadata?.album?.length || 0) - 8}</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center">
                        <Maximize2 className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Reaction Summary */}
          {(() => {
            const allReactions: { emoji: string; count: number }[] = [];
           
            // Add like as 👍 emoji
            if (postLikes[stateKey] && postLikes[stateKey] > 0) {
              allReactions.push({ emoji: '👍', count: postLikes[stateKey] });
            }
           
            // Add emoji reactions
            if (postReactions[stateKey]) {
              postReactions[stateKey].forEach(reaction => {
                const existing = allReactions.find(r => r.emoji === reaction.emoji);
                if (existing) {
                  existing.count += reaction.count;
                } else {
                  allReactions.push({ ...reaction });
                }
              });
            }
           
            if (allReactions.length === 0) return null;
           
            // Sort by count (descending) and take top 3
            const topReactions = allReactions
              .sort((a, b) => b.count - a.count)
              .slice(0, 3);
           
            // Calculate total count
            const totalCount = allReactions.reduce((sum, r) => sum + r.count, 0);
           
            return (
              <div
                className="flex items-center gap-1.5 mb-2 text-xs text-gray-600 cursor-pointer hover:underline"
              >
                {/* Top 3 reactions stacked */}
                <div className="flex items-center" style={{ marginRight: '4px' }}>
                  {topReactions.map((reaction, idx) => (
                    <span
                      key={idx}
                      className="text-lg leading-none inline-block"
                      style={{
                        marginLeft: idx > 0 ? '-6px' : '0',
                        zIndex: topReactions.length - idx,
                        position: 'relative',
                        filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.1))'
                      }}
                      title={`${reaction.emoji} ${reaction.count}`}
                    >
                      {reaction.emoji}
                    </span>
                  ))}
                </div>
                {/* Total count */}
                <span className="text-xs font-medium text-gray-600">
                  {totalCount}
                </span>
              </div>
            );
          })()}
          {/* Action Bar */}
          <div className="border-t border-gray-100 pt-1.5 mt-1.5">
            <div className="flex items-center justify-start gap-6">
              {/* Like Button with Long Press */}
              <div
                className="relative"
                onMouseEnter={() => {
                  if (emojiPickerHideTimer) {
                    clearTimeout(emojiPickerHideTimer)
                    setEmojiPickerHideTimer(null)
                  }
                  setShowEmojiPicker(post.id)
                }}
                onMouseLeave={() => {
                  const timer = setTimeout(() => {
                    setShowEmojiPicker(null)
                  }, 250)
                  setEmojiPickerHideTimer(timer)
                }}
              >
                <button
                  onClick={(e) => {
                    handleLikePost(postIdForReactions, e);
                  }}
                  onMouseDown={(e) => {
                    handleLongPressStart(postIdForReactions, e);
                  }}
                  onMouseUp={handleLongPressEnd}
                  onTouchStart={(e) => {
                    handleLongPressStart(postIdForReactions, e);
                  }}
                  onTouchEnd={handleLongPressEnd}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
                    userPostReactions[stateKey]
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                  title="Like"
                >
                  {(() => {
                    const currentReaction = userPostReactions[stateKey];
                    if (currentReaction) {
                      return <span className="text-xl">{currentReaction}</span>;
                    }
                    return <span className="text-xl">👍</span>;
                  })()}
                  {(() => {
                    const currentReaction = userPostReactions[stateKey];
                    if (currentReaction) {
                      const reactionData = postReactions[stateKey]?.find(r => r.emoji === currentReaction);
                      return reactionData && reactionData.count > 0 ? (
                        <span className="text-xs font-medium">{reactionData.count}</span>
                      ) : null;
                    }
                    const likeReaction = postReactions[stateKey]?.find(r => r.emoji === '👍');
                    return likeReaction && likeReaction.count > 0 ? (
                      <span className="text-xs font-medium">{likeReaction.count}</span>
                    ) : null;
                  })()}
                </button>
                {/* Emoji Picker Overlay */}
                {showEmojiPicker === post.id && (
                  <div className="absolute bottom-full left-0 mb-2 bg-white rounded-full shadow-xl border border-gray-200 px-2 py-1.5 flex gap-1.5 z-50">
                    {EMOJI_REACTIONS.map((reaction) => {
                      const isSelected = userPostReactions[stateKey] === reaction.emoji;
                      return (
                        <button
                          key={reaction.emoji}
                          onClick={(e) => {
                            handleEmojiReaction(postIdForReactions, reaction.emoji, e);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          className={`relative hover:scale-125 transition-transform p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full ${
                            isSelected ? 'bg-blue-50 scale-110' : ''
                          }`}
                          title={reaction.label}
                        >
                          <span className="text-xl">{reaction.emoji}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {/* Comments Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))
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
                  let commentCount = 0;
                  if (comments.length > 0) {
                    const countReplies = (commentList: ExtendedComment[]): number => {
                      let count = 0;
                      commentList.forEach(comment => {
                        if (comment.replies && comment.replies.length > 0) {
                          count += comment.replies.length;
                          count += countReplies(comment.replies);
                        }
                      });
                      return count;
                    };
                    commentCount = comments.length + countReplies(comments);
                  } else {
                    commentCount = displayPost.replies_count || post.replies_count || 0;
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
                  handleRepost(postIdForReactions);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
                  repostedPosts.includes(postIdForReactions)
                    ? 'text-green-600 bg-green-50 hover:bg-green-100'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
                title="Repost"
              >
                <Repeat2 className={`w-5 h-5 ${repostedPosts.includes(postIdForReactions) ? 'fill-current' : ''}`} />
                {repostCounts[postIdForReactions] > 0 ? (
                  <span className="text-xs font-medium">{repostCounts[postIdForReactions]}</span>
                ) : null}
              </button>
              {/* Quote Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (displayPost) {
                    // Quote functionality - navigate to compose with quote
                    navigate(`/compose?quote=${displayPost.id}`);
                  }
                }}
                className="px-3 py-1.5 rounded-full transition-colors text-gray-500 hover:bg-gray-100"
                title="Quote"
              >
                <Quote className="w-5 h-5" />
              </button>
              {/* Bookmark Button */}
              {postId && (
                <button
                  onClick={() => {
                    handleBookmarkPost(postId);
                  }}
                  className={`px-3 py-1.5 rounded-full transition-colors ${
                    bookmarkedPosts.includes(postId)
                      ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                  title={bookmarkedPosts.includes(postId) ? 'Saved' : 'Save post'}
                >
                  <Bookmark className={`w-5 h-5 ${bookmarkedPosts.includes(postId) ? 'fill-current' : ''}`} />
                </button>
              )}
            </div>
          </div>
          {/* Inline Comments Section */}
          {openComments[post.id] && (
            <div className="mt-2 border-t border-gray-100 pt-2">
              {/* Add Comment */}
              {!postSettings[post.id]?.comments_disabled && (
                <div className="mb-3">
                  <div className="flex gap-2">
                    <Avatar src={userProfile?.avatar_url} name={userProfile?.full_name} className="w-6 h-6 flex-shrink-0" useInlineSize={false} />
                    <div className="flex-1 flex items-center gap-2 px-2.5 py-1.5 border border-gray-200 rounded-full focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                      <textarea
                        value={newComments[post.id] || ''}
                        onChange={(e) => {
                          setNewComments(prev => ({ ...prev, [post.id]: e.target.value }));
                          e.target.style.height = 'auto';
                          e.target.style.height = `${Math.min(e.target.scrollHeight, 80)}px`;
                        }}
                        placeholder="Write a comment..."
                        className="flex-1 resize-none border-none outline-none text-sm py-0.5"
                        rows={1}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleAddComment(postIdForReactions, newComments[postIdForReactions] || '')
                          }
                        }}
                        style={{ maxHeight: '80px', minHeight: '20px', height: '20px' }}
                      />
                      {/* Emoji Picker for Comment Input */}
                      <div className="relative">
                        <button
                          onClick={() => setShowCommentInputEmoji(showCommentInputEmoji === post.id ? null : post.id)}
                          className="flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Add emoji"
                        >
                          <Smile className="w-4 h-4" />
                        </button>
                        {showCommentInputEmoji === post.id && (
                          <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-50">
                            <div className="flex gap-1 flex-wrap max-w-[200px]">
                              {['😀', '😂', '😍', '🥰', '😊', '👍', '👏', '🎉', '❤️', '🔥', '💯', '✨', '🙏', '💪', '🤔', '😢'].map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => {
                                    setNewComments(prev => ({ ...prev, [post.id]: (prev[post.id] || '') + emoji }));
                                    setShowCommentInputEmoji(null);
                                  }}
                                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-lg transition-colors"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          handleAddComment(postIdForReactions, newComments[postIdForReactions] || '')
                        }}
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
              {comments.length > 0 && (
                <div className="space-y-3">
                  {/* Comments Header with Count and Sort */}
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-700">
                      {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
                    </span>
                    <select
                      value={postId ? (commentSort[postId] || 'newest') : 'newest'}
                      onChange={(e) => {
                        if (postId) {
                          setCommentSort(prev => ({
                            ...prev,
                            [postId]: e.target.value as 'newest' | 'oldest' | 'popular'
                          }))
                        }
                      }}
                      className="text-xs text-gray-600 border border-gray-200 rounded px-2 py-1"
                    >
                      <option value="newest">Newest</option>
                      <option value="oldest">Oldest</option>
                      <option value="popular">Popular</option>
                    </select>
                  </div>
                  {/* Render comments recursively */}
              {(() => {
                  if (!postId) return null
                 
                  const sortType = commentSort[postId] || 'newest'
                  const sortedComments = [...comments].sort((a, b) => {
                      if (sortType === 'oldest') {
                        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                      } else if (sortType === 'popular') {
                        const aLikes = commentReactions[a.id]?.length || 0;
                        const bLikes = commentReactions[b.id]?.length || 0;
                        return bLikes - aLikes;
                      }
                      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    });
                    const renderComment = (comment: ExtendedComment, depth: number = 0): JSX.Element => {
                      const isHighlighted = commentId === comment.id && (!replyId || depth > 0)
                      const isReplyHighlighted = replyId === comment.id
                      const isExpanded = expandedReplies[comment.id] !== undefined ? expandedReplies[comment.id] : (depth === 0 && comment.replies && comment.replies.length > 0)
                     
                      return (
                        <div
                          key={comment.id}
                          ref={isHighlighted ? highlightedCommentRef : (isReplyHighlighted ? highlightedReplyRef : undefined)}
                          className={`${depth === 0 ? 'mb-3' : 'ml-8 mt-2'} ${
                            isHighlighted || isReplyHighlighted
                              ? 'ring-2 ring-blue-500 bg-blue-50 rounded-lg p-3'
                              : ''
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/profile/${comment.user.id}`); }}
                              className="flex-shrink-0 hover:opacity-80 transition-opacity"
                            >
                              <Avatar src={comment.user.avatar_url} name={comment.user.full_name} className="w-6 h-6" useInlineSize={false} />
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); navigate(`/profile/${comment.user.id}`); }}
                                  className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                                >
                                  {comment.user.full_name}
                                </button>
                                <span className="text-xs text-gray-500">•</span>
                                <span className="text-xs text-gray-500">{formatTime(comment.created_at)}</span>
                                {comment.updated_at && comment.updated_at !== comment.created_at && (
                                  <>
                                    <span className="text-xs text-gray-400">•</span>
                                    <span className="text-xs text-gray-400 italic">edited</span>
                                  </>
                                )}
                                <button
                                  onClick={() => {
                                    const link = `${window.location.origin}${window.location.pathname}?commentId=${comment.id}`;
                                    navigator.clipboard.writeText(link);
                                    setCopiedLink(comment.id);
                                    setTimeout(() => setCopiedLink(null), 2000);
                                  }}
                                  className="ml-auto p-1 text-gray-400 hover:text-blue-600 rounded"
                                  title="Copy link"
                                >
                                  {copiedLink === comment.id ? (
                                    <Check className="w-3.5 h-3.5 text-green-600" />
                                  ) : (
                                    <Link2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                {comment.user_id === currentUserId && (
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => {
                                        setEditingCommentId(comment.id);
                                        setEditingContent(comment.content);
                                      }}
                                      className="p-1 text-gray-400 hover:text-blue-600 rounded"
                                      title="Edit"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteComment(comment.id)}
                                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                              {editingCommentId === comment.id ? (
                                <div className="mb-2 flex gap-2">
                                  <textarea
                                    value={editingContent}
                                    onChange={(e) => setEditingContent(e.target.value)}
                                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    rows={3}
                                  />
                                  <div className="flex flex-col gap-2">
                                    <button
                                      onClick={() => handleEditComment(comment.id, editingContent)}
                                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingCommentId(null)}
                                      className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  className="text-sm text-gray-700 leading-relaxed mb-2"
                                  dangerouslySetInnerHTML={{ __html: comment.content }}
                                />
                              )}
                             
                              {/* Comment Actions */}
                              <div className="flex items-center gap-4">
                                <div className="relative">
                                  <button
                                    onMouseEnter={() => {
                                      if (commentEmojiPickerHideTimer) {
                                        clearTimeout(commentEmojiPickerHideTimer)
                                        setCommentEmojiPickerHideTimer(null)
                                      }
                                      setShowCommentEmojiPicker(comment.id)
                                    }}
                                    onMouseLeave={() => {
                                      const timer = setTimeout(() => {
                                        setShowCommentEmojiPicker(null)
                                      }, 250)
                                      setCommentEmojiPickerHideTimer(timer)
                                    }}
                                    onClick={(e) => { e.stopPropagation(); handleReaction(comment.id, '👍'); }}
                                    className={`text-xs flex items-center gap-1 font-medium ${
                                      (userReactions[comment.id] === 'like' || userReactions[comment.id] === '👍')
                                        ? 'text-blue-600 hover:text-blue-700'
                                        : 'text-gray-500 hover:text-blue-600'
                                    }`}
                                    title="Like comment"
                                  >
                                    {(() => {
                                      const currentReaction = userReactions[comment.id];
                                      if (currentReaction && currentReaction !== 'like' && currentReaction !== 'favorite') {
                                        return <span className="text-base">{currentReaction}</span>;
                                      }
                                      return <span className="text-base">👍</span>;
                                    })()}
                                    {(() => {
                                      const totalReactions = commentReactions[comment.id]?.length || 0;
                                      return totalReactions > 0 ? (
                                        <span 
                                          className="text-xs cursor-pointer hover:underline"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            loadCommentReactionsModal(comment.id);
                                          }}
                                        >
                                          {totalReactions}
                                        </span>
                                      ) : null;
                                    })()}
                                  </button>
                                  {/* Comment Emoji Picker Overlay */}
                                  {showCommentEmojiPicker === comment.id && (
                                    <div
                                      className="absolute bottom-full left-0 mb-2 bg-white rounded-full shadow-xl border border-gray-200 px-2 py-1.5 flex gap-1.5 z-50"
                                      onMouseEnter={() => {
                                        if (commentEmojiPickerHideTimer) {
                                          clearTimeout(commentEmojiPickerHideTimer)
                                          setCommentEmojiPickerHideTimer(null)
                                        }
                                        setShowCommentEmojiPicker(comment.id)
                                      }}
                                      onMouseLeave={() => {
                                        const timer = setTimeout(() => {
                                          setShowCommentEmojiPicker(null)
                                        }, 250)
                                        setCommentEmojiPickerHideTimer(timer)
                                      }}
                                    >
                                      {EMOJI_REACTIONS.map((reaction) => {
                                        const isSelected = userReactions[comment.id] === reaction.emoji;
                                        return (
                                          <button
                                            key={reaction.emoji}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleReaction(comment.id, reaction.emoji);
                                            }}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            className={`relative hover:scale-125 transition-transform p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full ${
                                              isSelected ? 'bg-blue-50 scale-110' : ''
                                            }`}
                                            title={reaction.label}
                                          >
                                            <span className="text-xl">{reaction.emoji}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                                {post.user_id === currentUserId && (
                                  <button
                                    onClick={(e) => handleFavoriteComment(comment.id, e)}
                                    className={`text-xs flex items-center gap-1 font-medium ${
                                      commentFavorites[comment.id]
                                        ? 'text-amber-600 hover:text-amber-700'
                                        : 'text-gray-500 hover:text-amber-600'
                                    }`}
                                    title="Favorite comment"
                                  >
                                    <Bookmark className={`w-3.5 h-3.5 ${commentFavorites[comment.id] ? 'fill-current' : ''}`} />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReplyingTo(prev => ({ ...prev, [comment.id]: !prev[comment.id] }))
                                  }}
                                  className="text-xs text-gray-500 hover:text-blue-600 font-medium flex items-center gap-1"
                                >
                                  <Reply className="w-3.5 h-3.5" />
                                  Reply
                                </button>
                              </div>
                              {/* Reply Input */}
                              {replyingTo[comment.id] && postId && (
                                <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                                  <div className="flex gap-2">
                                    <Avatar src={userProfile?.avatar_url} name={userProfile?.full_name} className="w-5 h-5 flex-shrink-0" useInlineSize={false} />
                                    <textarea
                                      value={replyContents[comment.id] || ''}
                                      onChange={(e) => {
                                        setReplyContents(prev => ({ ...prev, [comment.id]: e.target.value }));
                                        e.target.style.height = 'auto';
                                        e.target.style.height = `${Math.min(e.target.scrollHeight, 60)}px`;
                                      }}
                                      placeholder="Write a reply..."
                                      className="flex-1 resize-none border border-gray-200 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      rows={1}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                          e.preventDefault()
                                          handleAddReply(postIdForReactions, comment.id, replyContents[comment.id] || '')
                                        }
                                      }}
                                      style={{ maxHeight: '60px', minHeight: '20px', height: '20px' }}
                                    />
                                    <button
                                      onClick={() => handleAddReply(postIdForReactions, comment.id, replyContents[comment.id] || '')}
                                      disabled={!replyContents[comment.id]?.trim()}
                                      className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                    >
                                      <Send className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              )}
                              {/* Replies */}
                              {comment.replies && comment.replies.length > 0 && (
                                <div className="mt-2">
                                  {isExpanded && comment.replies.map(reply => renderComment(reply, depth + 1))}
                                  {!isExpanded && (
                                    <button
                                      onClick={() => setExpandedReplies(prev => ({ ...prev, [comment.id]: true }))}
                                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1"
                                    >
                                      <ChevronDown className="w-3 h-3" />
                                      Show {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                                    </button>
                                  )}
                                  {isExpanded && (
                                    <button
                                      onClick={() => setExpandedReplies(prev => ({ ...prev, [comment.id]: false }))}
                                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1"
                                    >
                                      <ChevronUp className="w-3 h-3" />
                                      Hide replies
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    }
                    return sortedComments.map(comment => renderComment(comment))
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
        {/* Lightbox Modal */}
        {lightboxImage && (
          <div
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setLightboxImage(null)}
          >
            <img
              src={lightboxImage}
              alt="Full size"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        )}
        {/* Album Modal */}
        {showAlbumModal && (
          <div
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
            onClick={() => setShowAlbumModal(false)}
          >
            <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
              {albumModalImages[albumModalIndex] && (
                <img
                  src={albumModalImages[albumModalIndex]}
                  alt={`Album ${albumModalIndex + 1}`}
                  className="max-w-full max-h-full object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              {albumModalIndex > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setAlbumModalIndex(prev => prev - 1);
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 bg-black/50 rounded-full p-2"
                >
                  <ChevronDown className="w-6 h-6 rotate-90" />
                </button>
              )}
              {albumModalIndex < albumModalImages.length - 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setAlbumModalIndex(prev => prev + 1);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 bg-black/50 rounded-full p-2"
                >
                  <ChevronDown className="w-6 h-6 -rotate-90" />
                </button>
              )}
              <button
                onClick={() => setShowAlbumModal(false)}
                className="absolute top-4 right-4 text-white hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
                {albumModalIndex + 1} / {albumModalImages.length}
              </div>
            </div>
          </div>
        )}
        
        {/* Reactions Modal */}
        {reactionsModalOpen && reactionsModalCommentId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4" onClick={() => {
            setReactionsModalOpen(false)
            setReactionsModalCommentId(null)
          }}>
            <div className="bg-white rounded-xl w-full max-w-lg max-h-[70vh] overflow-hidden flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Reactions</h2>
                <button 
                  onClick={() => {
                    setReactionsModalOpen(false)
                    setReactionsModalCommentId(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 rounded-full p-1.5 hover:bg-gray-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs */}
              <div className="border-b px-4 flex items-center gap-0.5 overflow-x-auto">
                <button
                  onClick={() => setReactionsModalActiveTab('ALL')}
                  className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                    reactionsModalActiveTab === 'ALL'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span className="mr-1.5">All</span>
                  <span className="text-gray-500 text-xs">
                    {reactionsModalData.reduce((sum, r) => sum + r.users.length, 0)}
                  </span>
                </button>
                {reactionsModalData.map((reaction) => {
                  const reactionType = reaction.emoji === '👍' ? 'LIKE' : 
                    reaction.emoji === '❤️' ? 'EMPATHY' :
                    reaction.emoji === '💡' ? 'INTEREST' :
                    reaction.emoji === '😂' ? 'HAHA' :
                    reaction.emoji === '😮' ? 'WOW' :
                    reaction.emoji === '😢' ? 'SAD' : 'OTHER';
                  return (
                    <button
                      key={reaction.emoji}
                      onClick={() => setReactionsModalActiveTab(reactionType)}
                      className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                        reactionsModalActiveTab === reactionType
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <span className="text-base">{reaction.emoji}</span>
                      <span className="text-xs">{reaction.users.length}</span>
                    </button>
                  );
                })}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {loadingReactionsModal ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  </div>
                ) : (() => {
                  let usersToShow: { user: Profile; reaction_type: string }[] = [];
                  
                  if (reactionsModalActiveTab === 'ALL') {
                    // Combine all users
                    usersToShow = reactionsModalData.flatMap(r => r.users);
                  } else {
                    // Filter by selected reaction type
                    const selectedReaction = reactionsModalData.find(r => {
                      const reactionType = r.emoji === '👍' ? 'LIKE' : 
                        r.emoji === '❤️' ? 'EMPATHY' :
                        r.emoji === '💡' ? 'INTEREST' :
                        r.emoji === '😂' ? 'HAHA' :
                        r.emoji === '😮' ? 'WOW' :
                        r.emoji === '😢' ? 'SAD' : 'OTHER';
                      return reactionType === reactionsModalActiveTab;
                    });
                    usersToShow = selectedReaction?.users || [];
                  }

                  if (usersToShow.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No reactions found</p>
                      </div>
                    );
                  }

                  return (
                    <ul className="space-y-1">
                      {usersToShow.map((item, idx) => {
                        const reactionData = reactionsModalData.find(r => 
                          r.users.some(u => u.user.id === item.user.id && u.reaction_type === item.reaction_type)
                        );
                        const reactionEmoji = reactionData?.emoji || '👍';
                        
                        return (
                          <li key={`${item.user.id}-${idx}`} className="py-2 border-b border-gray-100 last:border-0">
                            <button
                              onClick={() => {
                                setReactionsModalOpen(false)
                                setReactionsModalCommentId(null)
                                navigate(`/profile/${item.user.id}`)
                              }}
                              className="flex items-center gap-2.5 w-full text-left hover:bg-gray-50 px-2 py-1.5 rounded-lg transition-colors"
                            >
                              <div className="relative">
                                <Avatar 
                                  src={item.user.avatar_url} 
                                  name={item.user.full_name} 
                                  className="w-10 h-10" 
                                  useInlineSize={false} 
                                />
                                <span 
                                  className="absolute -bottom-0.5 -right-0.5 text-base bg-white rounded-full p-0.5"
                                  style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.1))' }}
                                >
                                  {reactionEmoji}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-gray-900 truncate">
                                  {item.user.full_name}
                                </div>
                                {item.user.profession && (
                                  <div className="text-xs text-gray-600 truncate">
                                    {item.user.profession}
                                  </div>
                                )}
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}