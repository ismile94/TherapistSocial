import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import Avatar from './Avatar'
import EmptyState from './EmptyState'
import { ConnectionListSkeleton } from './SkeletonLoaders'
import { haptic } from '../utils/hapticFeedback'
import { X, Search, UserPlus } from 'lucide-react'
import type { Profile, Connection } from '../types/app'

interface ConnectionsManagerProps {
  currentUserId: string
  onClose: () => void
  connections: Connection[]
  connectionRequests: Connection[]
  onAcceptConnectionRequest: (id: string) => Promise<void>
  onRejectConnectionRequest: (id: string) => Promise<void>
  onRemoveConnection: (id: string) => Promise<void>
  onSendConnectionRequest: (id: string) => Promise<void>
  onCancelConnectionRequest: (id: string) => Promise<void>
  blockedUserIds?: string[]
}

export default function ConnectionsManager({ 
  currentUserId,
  onClose,
  connections,
  connectionRequests,
  onAcceptConnectionRequest,
  onRejectConnectionRequest,
  onRemoveConnection,
  onSendConnectionRequest,
  onCancelConnectionRequest,
  blockedUserIds
}: ConnectionsManagerProps) {
  const [activeTab, setActiveTab] = useState<'connections' | 'requests' | 'suggested'>('connections')
  const [requestSubTab, setRequestSubTab] = useState<'received' | 'sent'>('received')
  const [suggested, setSuggested] = useState<Profile[]>([])
  const [sentRequests, setSentRequests] = useState<Connection[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (activeTab === 'suggested') {
      loadSuggested()
    }
    if (activeTab === 'requests') {
      loadSentRequests()
    }
  }, [activeTab])

  const loadSuggested = async () => {
    setLoading(true)
    
    // First load sent requests if not already loaded
    if (sentRequests.length === 0) {
      await loadSentRequests()
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', currentUserId)
      .limit(20)

    if (!error && data) {
      // Bağlantısı olmayan, istek gönderilmemiş ve block edilmemiş kullanıcıları filtrele
      const connectedUserIds = connections.map(conn => 
        conn.sender_id === currentUserId ? conn.receiver_id : conn.sender_id
      )
      // Get all users we've sent requests to
      const sentRequestUserIds = sentRequests.map(req => req.receiver_id)
      // Get all users who sent us requests (these should also not appear in suggested)
      const receivedRequestUserIds = connectionRequests.map(req => req.sender_id)
      // Combine both
      const requestedUserIds = [...new Set([...sentRequestUserIds, ...receivedRequestUserIds])]
      
      // Get users who blocked me
      const { data: blockedByData } = await supabase
        .from('user_settings')
        .select('id')
        .contains('blocked_users', [currentUserId])
      const blockedByIds = (blockedByData || []).map(s => s.id)
      const allHiddenIds = [...new Set([...(blockedUserIds || []), ...blockedByIds])]
      
      const filtered = data.filter(profile => 
        !connectedUserIds.includes(profile.id) && 
        !requestedUserIds.includes(profile.id) &&
        !allHiddenIds.includes(profile.id)
      )
      setSuggested(filtered)
    }
    setLoading(false)
  }

  const loadSentRequests = async () => {
    const { data, error } = await supabase
      .from('connections')
      .select('*, receiver:profiles!receiver_id(*)')
      .eq('sender_id', currentUserId)
      .eq('status', 'pending')

    if (!error && data) {
      setSentRequests(data)
    }
  }

  const handleAcceptRequest = async (connectionId: string) => {
    try {
      await onAcceptConnectionRequest(connectionId)
    } catch (error) {
      console.error('Error accepting request:', error)
      alert('Failed to accept connection request')
    }
  }

  const handleRejectRequest = async (connectionId: string) => {
    try {
      await onRejectConnectionRequest(connectionId)
    } catch (error) {
      console.error('Error rejecting request:', error)
      alert('Failed to reject connection request')
    }
  }

  const handleRemoveConnection = async (connectionId: string) => {
    try {
      await onRemoveConnection(connectionId)
    } catch (error) {
      console.error('Error removing connection:', error)
      alert('Failed to remove connection')
    }
  }

  const handleCancelRequest = async (connectionId: string) => {
    try {
      await onCancelConnectionRequest(connectionId)
      setSentRequests(prev => prev.filter(req => req.id !== connectionId))
      loadSuggested() // Suggested listesini güncelle
    } catch (err: any) {
      console.error('Error canceling connection request:', err)
      alert('Failed to cancel connection request')
    }
  }

  const handleSendRequest = async (receiverId: string) => {
    try {
      await onSendConnectionRequest(receiverId)
      // İstek gönderildikten sonra suggested listesini güncelle
      setSuggested(prev => prev.filter(profile => profile.id !== receiverId))
      loadSentRequests() // Gönderilen istekler listesini güncelle
    } catch (error) {
      console.error('Error sending connection request:', error)
    }
  }

  const handleProfileClick = (profileId: string) => {
    onClose()
    // Profile sayfasını açmak için global state'i güncelle
    window.dispatchEvent(new CustomEvent('openProfileDetail', { 
      detail: { profileId } 
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl w-full max-w-3xl sm:max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl">
        <div className="p-4 sm:p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">My Network</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
          {/* Search inside modal */}
          <div className="mt-3 sm:mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search connections, requests, suggested..."
                onChange={(e) => {
                  const q = e.target.value.toLowerCase()
                  // Simple client-side filter by dispatching a custom event; list sections will listen or we can just rely on built-in maps below
                  window.dispatchEvent(new CustomEvent('networkSearch', { detail: { query: q } }))
                }}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all duration-200 text-sm"
              />
            </div>
          </div>

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
          {activeTab === 'connections' && (
            <div className="space-y-4">
              {connections.filter(connection => {
                const otherUser = connection.sender_id === currentUserId ? connection.receiver : connection.sender
                return otherUser && !blockedUserIds?.includes(otherUser.id)
              }).map(connection => {
                const otherUser = connection.sender_id === currentUserId ? connection.receiver : connection.sender
                return (
                  <div 
                    key={connection.id} 
                    className="flex items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => otherUser?.id && handleProfileClick(otherUser.id)}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <Avatar src={otherUser?.avatar_url} name={otherUser?.full_name} className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0" useInlineSize={false} />
                      <div className="flex-1">
                        <h3 className="font-medium sm:font-semibold text-gray-900 text-sm sm:text-base">{otherUser?.full_name}</h3>
                        <p className="text-xs sm:text-sm text-gray-600">{otherUser?.profession}</p>
                        <p className="text-[11px] sm:text-xs text-gray-500">{otherUser?.city}, {otherUser?.county}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        haptic.warning();
                        handleRemoveConnection(connection.id);
                      }}
                      className="px-2 sm:px-3 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
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

          {activeTab === 'requests' && requestSubTab === 'received' && (
            <div className="space-y-4">
              {connectionRequests.filter(request => {
                // Only show requests where we are the receiver (sender_id !== currentUserId)
                return request.sender_id !== currentUserId && 
                       request.receiver_id === currentUserId &&
                       request.sender && 
                       !blockedUserIds?.includes(request.sender.id)
              }).map(request => (
                <div 
                  key={request.id} 
                  className="flex items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => request.sender?.id && handleProfileClick(request.sender.id)}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <Avatar src={request.sender?.avatar_url} name={request.sender?.full_name} className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0" useInlineSize={false} />
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

          {activeTab === 'requests' && requestSubTab === 'sent' && (
            <div className="space-y-4">
              {sentRequests.filter(request => {
                return request.receiver && !blockedUserIds?.includes(request.receiver.id)
              }).map(request => (
                <div 
                  key={request.id} 
                  className="flex items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => request.receiver?.id && handleProfileClick(request.receiver.id)}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <Avatar src={request.receiver?.avatar_url} name={request.receiver?.full_name} className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0" useInlineSize={false} />
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

          {activeTab === 'suggested' && (
            <div className="space-y-4">
              {loading ? (
                <ConnectionListSkeleton />
              ) : (
                <>
                  {suggested.map(profile => (
                    <div 
                      key={profile.id} 
                      className="flex items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleProfileClick(profile.id)}
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <Avatar src={profile.avatar_url} name={profile.full_name} className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0" useInlineSize={false} />
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
                        className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-gradient-to-r from-primary-500 to-accent-indigo text-white rounded-xl hover:from-primary-600 hover:to-primary-700 shadow-md shadow-primary-500/20 hover:shadow-lg transition-all duration-200"
                      >
                        Connect
                      </button>
                    </div>
                  ))}
                  {suggested.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No suggestions available</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

