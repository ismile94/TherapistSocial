import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Avatar from '../components/Avatar'
import EmptyState from '../components/EmptyState'
import { ConnectionListSkeleton } from '../components/SkeletonLoaders'
import { haptic } from '../utils/hapticFeedback'
import { X, Search, UserPlus } from 'lucide-react'

interface Profile {
  id: string
  full_name: string
  avatar_url?: string | null
  profession?: string
  city?: string
  county?: string
  [key: string]: any
}

interface Connection {
  id: string
  created_at: string
  sender_id: string
  receiver_id: string
  status: 'pending' | 'accepted' | 'rejected'
  sender?: Profile
  receiver?: Profile
}

export default function NetworkPage() {
  const navigate = useNavigate()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [connections, setConnections] = useState<Connection[]>([])
  const [connectionRequests, setConnectionRequests] = useState<Connection[]>([])
  const [sentRequests, setSentRequests] = useState<Connection[]>([])
  const [suggested, setSuggested] = useState<Profile[]>([])
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'connections' | 'requests' | 'suggested'>('connections')
  const [requestSubTab, setRequestSubTab] = useState<'received' | 'sent'>('received')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    initializeUser()
  }, [])

  useEffect(() => {
    if (currentUserId) {
      loadConnections()
      loadBlockedUsers()
    }
  }, [currentUserId])

  useEffect(() => {
    if (activeTab === 'suggested' && currentUserId) {
      loadSuggested()
    }
  }, [activeTab, currentUserId, connections.length, sentRequests.length, connectionRequests.length])

  const initializeUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUserId(user.id)
    } else {
      navigate('/auth')
    }
  }

  const loadConnections = async () => {
    if (!currentUserId) return
    setLoading(true)

    try {
      // Load accepted connections
      const { data: connectionsData } = await supabase
        .from('connections')
        .select('*, sender:profiles!sender_id(*), receiver:profiles!receiver_id(*)')
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .eq('status', 'accepted')

      if (connectionsData) {
        setConnections(connectionsData)
      }

      // Load received requests
      const { data: requestsData } = await supabase
        .from('connections')
        .select('*, sender:profiles!sender_id(*)')
        .eq('receiver_id', currentUserId)
        .eq('status', 'pending')

      if (requestsData) {
        setConnectionRequests(requestsData)
      }

      // Load sent requests
      const { data: sentData } = await supabase
        .from('connections')
        .select('*, receiver:profiles!receiver_id(*)')
        .eq('sender_id', currentUserId)
        .eq('status', 'pending')

      if (sentData) {
        setSentRequests(sentData)
      }
    } catch (err) {
      console.error('Error loading connections:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadBlockedUsers = async () => {
    if (!currentUserId) return

    try {
      const { data: mySettings } = await supabase
        .from('user_settings')
        .select('blocked_users')
        .eq('id', currentUserId)
        .single()

      const { data: blockedBy } = await supabase
        .from('user_settings')
        .select('id')
        .contains('blocked_users', [currentUserId])

      const myBlocked = mySettings?.blocked_users || []
      const blockedByOthers = blockedBy?.map(s => s.id) || []
      setBlockedUserIds([...new Set([...myBlocked, ...blockedByOthers])])
    } catch (err) {
      console.error('Error loading blocked users:', err)
    }
  }

  const loadSuggested = async () => {
    if (!currentUserId) return
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', currentUserId)
        .limit(20)

      if (!error && data) {
        const connectedUserIds = connections.map(conn =>
          conn.sender_id === currentUserId ? conn.receiver_id : conn.sender_id
        )
        const sentRequestUserIds = sentRequests.map(req => req.receiver_id)
        const receivedRequestUserIds = connectionRequests.map(req => req.sender_id)
        const requestedUserIds = [...new Set([...sentRequestUserIds, ...receivedRequestUserIds])]

        const filtered = data.filter(profile =>
          !connectedUserIds.includes(profile.id) &&
          !requestedUserIds.includes(profile.id) &&
          !blockedUserIds.includes(profile.id)
        )
        setSuggested(filtered)
      }
    } catch (err) {
      console.error('Error loading suggested:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    navigate('/community')
  }

  const handleProfileClick = (profileId: string) => {
    navigate(`/profile/${profileId}`)
  }

  const handleAcceptRequest = async (connectionId: string) => {
    try {
      const { data: connection, error } = await supabase
        .from('connections')
        .update({ status: 'accepted' })
        .eq('id', connectionId)
        .select('*, sender:profiles!sender_id(*), receiver:profiles!receiver_id(*)')
        .single()

      if (error) throw error

      if (connection) {
        setConnections(prev => [...prev, connection])
        setConnectionRequests(prev => prev.filter(req => req.id !== connectionId))

        // Get user profile for notification
        const { data: { user } } = await supabase.auth.getUser()
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user?.id)
          .single()

        await supabase.from('notifications').insert({
          user_id: connection.sender_id,
          message: `${userProfile?.full_name || 'Someone'} accepted your connection request`,
          type: 'connection_accepted',
          related_entity_type: 'connection',
          related_entity_id: connection.id
        })

        window.dispatchEvent(new CustomEvent('showToast', {
          detail: { message: 'Connection accepted!', type: 'success' }
        }))
      }
    } catch (err) {
      console.error('Error accepting request:', err)
      alert('Failed to accept connection request')
    }
  }

  const handleRejectRequest = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId)

      if (error) throw error

      setConnectionRequests(prev => prev.filter(req => req.id !== connectionId))

      window.dispatchEvent(new CustomEvent('showToast', {
        detail: { message: 'Request rejected', type: 'success' }
      }))
    } catch (err) {
      console.error('Error rejecting request:', err)
      alert('Failed to reject connection request')
    }
  }

  const handleRemoveConnection = async (connectionId: string) => {
    if (!confirm('Are you sure you want to remove this connection?')) return

    try {
      const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId)

      if (error) throw error

      setConnections(prev => prev.filter(conn => conn.id !== connectionId))
      haptic.warning()

      window.dispatchEvent(new CustomEvent('showToast', {
        detail: { message: 'Connection removed', type: 'success' }
      }))
    } catch (err) {
      console.error('Error removing connection:', err)
      alert('Failed to remove connection')
    }
  }

  const handleCancelRequest = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId)

      if (error) throw error

      setSentRequests(prev => prev.filter(req => req.id !== connectionId))

      window.dispatchEvent(new CustomEvent('showToast', {
        detail: { message: 'Request cancelled', type: 'success' }
      }))
    } catch (err) {
      console.error('Error canceling request:', err)
      alert('Failed to cancel connection request')
    }
  }

  const handleSendRequest = async (receiverId: string) => {
    if (!currentUserId) return

    try {
      // Check for existing connection
      const { data: existing } = await supabase
        .from('connections')
        .select('id, status')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUserId})`)
        .maybeSingle()

      if (existing) {
        if (existing.status === 'pending') {
          alert('Connection request already sent')
          return
        } else if (existing.status === 'accepted') {
          alert('Already connected')
          return
        }
      }

      const { data, error } = await supabase
        .from('connections')
        .insert({
          sender_id: currentUserId,
          receiver_id: receiverId,
          status: 'pending'
        })
        .select('*, receiver:profiles!receiver_id(*)')
        .single()

      if (error) throw error

      // Get user profile for notification
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', currentUserId)
        .single()

      await supabase.from('notifications').insert({
        user_id: receiverId,
        message: `${userProfile?.full_name || 'Someone'} sent you a connection request`,
        type: 'connection_request',
        related_entity_type: 'connection',
        related_entity_id: data.id
      })

      setSentRequests(prev => [...prev, data])
      setSuggested(prev => prev.filter(profile => profile.id !== receiverId))

      window.dispatchEvent(new CustomEvent('showToast', {
        detail: { message: 'Connection request sent!', type: 'success' }
      }))
    } catch (err: any) {
      console.error('Error sending request:', err)
      if (err.code === '23505') {
        alert('Connection request already sent')
      } else {
        alert('Failed to send connection request')
      }
    }
  }

  // Filter by search query
  const filterBySearch = (items: any[], nameKey: string) => {
    if (!searchQuery.trim()) return items
    return items.filter(item => {
      const profile = item[nameKey] || item
      return profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl w-full max-w-3xl sm:max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl">
        <div className="p-4 sm:p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">My Network</h2>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Search */}
          <div className="mt-3 sm:mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search connections, requests, suggested..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex mt-3 sm:mt-4 space-x-1">
            <button
              onClick={() => setActiveTab('connections')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium ${
                activeTab === 'connections'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Connections ({connections.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium ${
                activeTab === 'requests'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Requests ({connectionRequests.length + sentRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('suggested')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium ${
                activeTab === 'suggested'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Suggested
            </button>
          </div>

          {/* Request Sub Tabs */}
          {activeTab === 'requests' && (
            <div className="flex mt-3 space-x-1 border-b pb-2">
              <button
                onClick={() => setRequestSubTab('received')}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  requestSubTab === 'received'
                    ? 'bg-blue-50 text-blue-600 border border-blue-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Received ({connectionRequests.length})
              </button>
              <button
                onClick={() => setRequestSubTab('sent')}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  requestSubTab === 'sent'
                    ? 'bg-blue-50 text-blue-600 border border-blue-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Sent ({sentRequests.length})
              </button>
            </div>
          )}
        </div>

        <div className="overflow-y-auto max-h-[70vh] p-4 sm:p-6">
          {loading ? (
            <ConnectionListSkeleton />
          ) : (
            <>
              {/* Connections Tab */}
              {activeTab === 'connections' && (
                <div className="space-y-4">
                  {filterBySearch(connections, 'sender').filter(connection => {
                    const otherUser = connection.sender_id === currentUserId ? connection.receiver : connection.sender
                    return otherUser && !blockedUserIds.includes(otherUser.id)
                  }).map(connection => {
                    const otherUser = connection.sender_id === currentUserId ? connection.receiver : connection.sender
                    return (
                      <div
                        key={connection.id}
                        className="flex items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => otherUser?.id && handleProfileClick(otherUser.id)}
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <Avatar src={otherUser?.avatar_url} name={otherUser?.full_name} className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0" />
                          <div className="flex-1">
                            <h3 className="font-medium sm:font-semibold text-gray-900 text-sm sm:text-base">{otherUser?.full_name}</h3>
                            <p className="text-xs sm:text-sm text-gray-600">{otherUser?.profession}</p>
                            <p className="text-[11px] sm:text-xs text-gray-500">{otherUser?.city}, {otherUser?.county}</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveConnection(connection.id)
                          }}
                          className="px-2 sm:px-3 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200"
                        >
                          Remove
                        </button>
                      </div>
                    )
                  })}
                  {connections.length === 0 && (
                    <EmptyState
                      icon={<UserPlus className="w-16 h-16 text-gray-300" />}
                      title="Build your professional network"
                      description="Connect with therapists in your area and expand your circle"
                      actions={[
                        { label: 'Find Therapists', onClick: () => setActiveTab('suggested'), primary: true }
                      ]}
                    />
                  )}
                </div>
              )}

              {/* Received Requests Tab */}
              {activeTab === 'requests' && requestSubTab === 'received' && (
                <div className="space-y-4">
                  {filterBySearch(connectionRequests, 'sender').filter(request =>
                    request.sender && !blockedUserIds.includes(request.sender.id)
                  ).map(request => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => request.sender?.id && handleProfileClick(request.sender.id)}
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <Avatar src={request.sender?.avatar_url} name={request.sender?.full_name} className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="font-medium sm:font-semibold text-gray-900 text-sm sm:text-base">{request.sender?.full_name}</h3>
                          <p className="text-xs sm:text-sm text-gray-600">{request.sender?.profession}</p>
                          <p className="text-[11px] sm:text-xs text-gray-500">{request.sender?.city}, {request.sender?.county}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleAcceptRequest(request.id)}
                          className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.id)}
                          className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                  {connectionRequests.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No pending requests</p>
                  )}
                </div>
              )}

              {/* Sent Requests Tab */}
              {activeTab === 'requests' && requestSubTab === 'sent' && (
                <div className="space-y-4">
                  {filterBySearch(sentRequests, 'receiver').filter(request =>
                    request.receiver && !blockedUserIds.includes(request.receiver.id)
                  ).map(request => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => request.receiver?.id && handleProfileClick(request.receiver.id)}
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <Avatar src={request.receiver?.avatar_url} name={request.receiver?.full_name} className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="font-medium sm:font-semibold text-gray-900 text-sm sm:text-base">{request.receiver?.full_name}</h3>
                          <p className="text-xs sm:text-sm text-gray-600">{request.receiver?.profession}</p>
                          <p className="text-[11px] sm:text-xs text-gray-500">{request.receiver?.city}, {request.receiver?.county}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCancelRequest(request.id)
                        }}
                        className="flex items-center justify-center w-8 h-8 text-red-600 hover:bg-red-50 rounded-lg border border-red-200"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {sentRequests.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No sent requests</p>
                  )}
                </div>
              )}

              {/* Suggested Tab */}
              {activeTab === 'suggested' && (
                <div className="space-y-4">
                  {filterBySearch(suggested, 'full_name').map(profile => (
                    <div
                      key={profile.id}
                      className="flex items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleProfileClick(profile.id)}
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <Avatar src={profile.avatar_url} name={profile.full_name} className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="font-medium sm:font-semibold text-gray-900 text-sm sm:text-base">{profile.full_name}</h3>
                          <p className="text-xs sm:text-sm text-gray-600">{profile.profession}</p>
                          <p className="text-[11px] sm:text-xs text-gray-500">{profile.city}, {profile.county}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSendRequest(profile.id)
                        }}
                        className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Connect
                      </button>
                    </div>
                  ))}
                  {suggested.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No suggestions available</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
