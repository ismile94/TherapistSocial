import React from 'react';
import { NetworkStatus } from '../hooks/useNetworkStatus';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface ConnectionStatusBannerProps {
  status: NetworkStatus;
  onRetry?: () => void;
}

export const ConnectionStatusBanner: React.FC<ConnectionStatusBannerProps> = ({ 
  status,
  onRetry 
}) => {
  if (status === 'connected') {
    return null;
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] text-white text-center py-2 text-sm font-medium transition-all duration-300 ${
        status === 'disconnected'
          ? 'bg-yellow-600'
          : status === 'reconnecting'
          ? 'bg-blue-600'
          : ''
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        {status === 'disconnected' ? (
          <>
            <WifiOff className="w-4 h-4" />
            <span>You're offline. Some features may not work.</span>
          </>
        ) : status === 'reconnecting' ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Reconnecting...</span>
          </>
        ) : null}
        
        {status === 'disconnected' && onRetry && (
          <button
            onClick={onRetry}
            className="ml-4 underline hover:no-underline"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};
