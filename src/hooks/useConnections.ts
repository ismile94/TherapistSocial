import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Connection, Profile } from '../types/app'

interface UseConnectionsProps {
  currentUserId: string | null
  userProfile: Profile | null
}

export function useConnections({ currentUserId, userProfile }: UseConnectionsProps) {
  const [connections, setConnections] = useState<Connection[]>([])
  const [connectionRequests, setConnectionRequests] = useState<Connection[]>([])
  const [sentRequests, setSentRequests] = useState<Connection[]>([])
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([])
  const [blockedByUserIds, setBlockedByUserIds] = useState<string[]>([])

  // Combined hidden user IDs
  const allHiddenUserIds = [...new Set([...blockedUserIds, ...blockedByUserIds])]

  // Load connections
  const loadConnections = useCallback(async () => {
    if (!currentUserId) return

    try {
      // Load accepted connections
      const { data: connectionsData, error } = await supabase
        .from('connections')
        .select('*, sender:profiles!sender_id(*), receiver:profiles!receiver_id(*)')
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .eq('status', 'accepted')

      if (!error && connectionsData) {
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
      const { data: sentRequestsData } = await supabase
        .from('connections')
        .select('*, receiver:profiles!receiver_id(*)')
        .eq('sender_id', currentUserId)
        .eq('status', 'pending')

      if (sentRequestsData) {
        setSentRequests(sentRequestsData)
      }
    } catch (err) {
      console.error('Error loading connections:', err)
    }
  }, [currentUserId])

  // Load blocked users
  const loadBlockedUsers = useCallback(async () => {
    if (!currentUserId) {
      setBlockedUserIds([])
      setBlockedByUserIds([])
      return
    }

    try {
      // Get users I blocked
      const { data: mySettings } = await supabase
        .from('user_settings')
        .select('blocked_users')
        .eq('id', currentUserId)
        .single()

      setBlockedUserIds(mySettings?.blocked_users || [])

      // Get users who blocked me
      const { data: blockedBy } = await supabase
        .from('user_settings')
        .select('id')
        .contains('blocked_users', [currentUserId])

      setBlockedByUserIds(blockedBy?.map(s => s.id) || [])
    } catch (err) {
      console.error('Error loading blocked users:', err)
    }
  }, [currentUserId])

  // Send connection request
  const sendConnectionRequest = useCallback(async (receiverId: string) => {
    if (!currentUserId) return

    if (allHiddenUserIds.includes(receiverId)) {
      throw new Error('Cannot send connection request to this user')
    }

    try {
      // Check for existing connection
      const { data: existing } = await supabase
        .from('connections')
        .select('id, status')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUserId})`)
        .maybeSingle()

      if (existing) {
        if (existing.status === 'pending') {
          throw new Error('Connection request already sent')
        } else if (existing.status === 'accepted') {
          throw new Error('Already connected')
        }
      }

      // Create connection request
      const { data, error } = await supabase
        .from('connections')
        .insert({
          sender_id: currentUserId,
          receiver_id: receiverId,
          status: 'pending'
        })
        .select('*, sender:profiles!sender_id(*), receiver:profiles!receiver_id(*)')
        .single()

      if (error) throw error

      // Create notification
      await supabase.from('notifications').insert({
        user_id: receiverId,
        message: `${userProfile?.full_name || 'Someone'} sent you a connection request`,
        type: 'connection_request',
        related_entity_type: 'connection',
        related_entity_id: data.id
      })

      // Real-time subscription will handle state update
    } catch (err: any) {
      console.error('Error sending connection request:', err)
      throw err
    }
  }, [currentUserId, userProfile?.full_name, allHiddenUserIds])

  // Accept connection request
  const acceptConnectionRequest = useCallback(async (connectionId: string) => {
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

        // Notify sender
        await supabase.from('notifications').insert({
          user_id: connection.sender_id,
          message: `${userProfile?.full_name || 'Someone'} accepted your connection request`,
          type: 'connection_accepted',
          related_entity_type: 'connection',
          related_entity_id: connection.id
        })
      }
    } catch (err) {
      console.error('Error accepting connection:', err)
      throw err
    }
  }, [userProfile?.full_name])

  // Reject connection request
  const rejectConnectionRequest = useCallback(async (connectionId: string) => {
    try {
      const { data: connection, error } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId)
        .select('sender_id')
        .single()

      if (error) throw error

      setConnectionRequests(prev => prev.filter(req => req.id !== connectionId))

      // Optionally notify sender
      if (connection) {
        await supabase.from('notifications').insert({
          user_id: connection.sender_id,
          message: `${userProfile?.full_name || 'Someone'} rejected your connection request`,
          type: 'connection_rejected'
        })
      }
    } catch (err) {
      console.error('Error rejecting connection:', err)
      throw err
    }
  }, [userProfile?.full_name])

  // Remove connection
  const removeConnection = useCallback(async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId)

      if (error) throw error

      setConnections(prev => prev.filter(conn => conn.id !== connectionId))
    } catch (err) {
      console.error('Error removing connection:', err)
      throw err
    }
  }, [])

  // Cancel sent request
  const cancelConnectionRequest = useCallback(async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId)

      if (error) throw error

      setSentRequests(prev => prev.filter(req => req.id !== connectionId))
    } catch (err) {
      console.error('Error canceling request:', err)
      throw err
    }
  }, [])

  // Block user
  const blockUser = useCallback(async (userId: string) => {
    if (!currentUserId || userId === currentUserId) return

    try {
      const { data: currentSettings } = await supabase
        .from('user_settings')
        .select('blocked_users')
        .eq('id', currentUserId)
        .single()

      const currentBlocked = currentSettings?.blocked_users || []
      const updatedBlocked = [...currentBlocked, userId]

      await supabase.from('user_settings').upsert({
        id: currentUserId,
        blocked_users: updatedBlocked,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

      await loadBlockedUsers()
    } catch (err) {
      console.error('Error blocking user:', err)
      throw err
    }
  }, [currentUserId, loadBlockedUsers])

  // Unblock user
  const unblockUser = useCallback(async (userId: string) => {
    if (!currentUserId) return

    try {
      const { data: currentSettings } = await supabase
        .from('user_settings')
        .select('blocked_users')
        .eq('id', currentUserId)
        .single()

      const currentBlocked = currentSettings?.blocked_users || []
      const updatedBlocked = currentBlocked.filter((id: string) => id !== userId)

      await supabase.from('user_settings').upsert({
        id: currentUserId,
        blocked_users: updatedBlocked,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

      await loadBlockedUsers()
    } catch (err) {
      console.error('Error unblocking user:', err)
      throw err
    }
  }, [currentUserId, loadBlockedUsers])

  // Real-time subscriptions
  useEffect(() => {
    if (!currentUserId) return

    const channel = supabase
      .channel('connections-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connections',
          filter: `receiver_id=eq.${currentUserId}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' && payload.new.status === 'pending') {
            const { data: sender } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', payload.new.sender_id)
              .single()

            const newRequest: Connection = {
              id: payload.new.id,
              created_at: payload.new.created_at,
              sender_id: payload.new.sender_id,
              receiver_id: payload.new.receiver_id,
              status: payload.new.status,
              sender,
              receiver: userProfile as Profile
            }
            setConnectionRequests(prev => [...prev, newRequest])
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new.status === 'accepted') {
              setConnectionRequests(prev => {
                const existingRequest = prev.find(req => req.id === payload.new.id)
                const senderProfile = existingRequest?.sender
                
                const acceptedConnection: Connection = {
                  id: payload.new.id,
                  created_at: payload.new.created_at,
                  sender_id: payload.new.sender_id,
                  receiver_id: payload.new.receiver_id,
                  status: 'accepted',
                  sender: senderProfile,
                  receiver: userProfile as Profile
                }
                
                setConnections(prevConnections => [...prevConnections, acceptedConnection])
                return prev.filter(req => req.id !== payload.new.id)
              })
            } else if (payload.new.status === 'rejected') {
              setConnectionRequests(prev => prev.filter(req => req.id !== payload.new.id))
            }
          } else if (payload.eventType === 'DELETE') {
            setConnectionRequests(prev => prev.filter(req => req.id !== payload.old.id))
            setConnections(prev => prev.filter(conn => conn.id !== payload.old.id))
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connections',
          filter: `sender_id=eq.${currentUserId}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' && payload.new.status === 'pending') {
            const { data: receiver } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', payload.new.receiver_id)
              .single()

            const newSentRequest: Connection = {
              id: payload.new.id,
              created_at: payload.new.created_at,
              sender_id: payload.new.sender_id,
              receiver_id: payload.new.receiver_id,
              status: payload.new.status,
              sender: userProfile as Profile,
              receiver
            }
            setSentRequests(prev => [...prev, newSentRequest])
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new.status === 'accepted') {
              let receiver = payload.old?.receiver
              if (!receiver) {
                const { data: receiverData } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', payload.new.receiver_id)
                  .single()
                receiver = receiverData
              }

              const acceptedConnection: Connection = {
                id: payload.new.id,
                created_at: payload.new.created_at,
                sender_id: payload.new.sender_id,
                receiver_id: payload.new.receiver_id,
                status: 'accepted',
                sender: userProfile as Profile,
                receiver
              }
              setConnections(prev => [...prev, acceptedConnection])
              setSentRequests(prev => prev.filter(req => req.id !== payload.new.id))
            } else if (payload.new.status === 'rejected') {
              setSentRequests(prev => prev.filter(req => req.id !== payload.new.id))
            }
          } else if (payload.eventType === 'DELETE') {
            setConnections(prev => prev.filter(conn => conn.id !== payload.old.id))
            setSentRequests(prev => prev.filter(req => req.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, userProfile])

  // Initial load
  useEffect(() => {
    if (currentUserId) {
      loadConnections()
      loadBlockedUsers()
    }
  }, [currentUserId, loadConnections, loadBlockedUsers])

  return {
    connections,
    connectionRequests,
    sentRequests,
    blockedUserIds,
    blockedByUserIds,
    allHiddenUserIds,
    loadConnections,
    loadBlockedUsers,
    sendConnectionRequest,
    acceptConnectionRequest,
    rejectConnectionRequest,
    removeConnection,
    cancelConnectionRequest,
    blockUser,
    unblockUser
  }
}

