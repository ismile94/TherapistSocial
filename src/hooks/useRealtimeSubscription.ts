import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeSubscriptionOptions {
  channel: string;
  table: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  callback: (payload: any) => void | Promise<void>;
  enabled?: boolean;
}

/**
 * Centralized real-time subscription manager hook
 * Handles subscription lifecycle, cleanup, and reconnection
 */
export const useRealtimeSubscription = ({
  channel,
  table,
  filter = '',
  event = '*',
  callback,
  enabled = true
}: UseRealtimeSubscriptionOptions) => {
  const subscriptionRef = useRef<RealtimeChannel | null>(null);
  const callbackRef = useRef(callback);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) {
      // Cleanup if disabled
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      return;
    }

    // Cleanup existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    // Create unique channel name to avoid conflicts
    const channelName = `${channel}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create new subscription
    const realtimeChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
          ...(filter && { filter })
        },
        async (payload) => {
          try {
            await callbackRef.current(payload);
          } catch (error) {
            console.error(`Error in ${channel} subscription callback:`, error);
          }
        }
      )
      .subscribe((status) => {
        console.log(`${channel} subscription status:`, status);
        
        if (status === 'SUBSCRIBED') {
          console.log(`✅ ${channel} subscribed successfully`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ ${channel} subscription error`);
        } else if (status === 'TIMED_OUT') {
          console.warn(`⏱️ ${channel} subscription timed out`);
        }
      });

    subscriptionRef.current = realtimeChannel;

    // Cleanup on unmount or when dependencies change
    return () => {
      if (subscriptionRef.current) {
        console.log(`Cleaning up ${channel} subscription`);
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [channel, table, filter, event, enabled]);

  return {
    channel: subscriptionRef.current,
    unsubscribe: () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    }
  };
};
