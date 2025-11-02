import { useState, useEffect } from 'react';

export type NetworkStatus = 'connected' | 'disconnected' | 'reconnecting';

/**
 * Hook to monitor network status and handle online/offline events
 */
export const useNetworkStatus = () => {
  const [status, setStatus] = useState<NetworkStatus>(
    typeof navigator !== 'undefined' && navigator.onLine ? 'connected' : 'disconnected'
  );

  useEffect(() => {
    const handleOnline = () => {
      console.log('Network: Online');
      setStatus('reconnecting');
      
      // Give it a moment before marking as connected
      setTimeout(() => {
        setStatus('connected');
      }, 1000);
    };

    const handleOffline = () => {
      console.log('Network: Offline');
      setStatus('disconnected');
    };

    // Initial status check
    if (typeof navigator !== 'undefined') {
      setStatus(navigator.onLine ? 'connected' : 'disconnected');
    }

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    status,
    isOnline: status === 'connected',
    isOffline: status === 'disconnected',
    isReconnecting: status === 'reconnecting'
  };
};
