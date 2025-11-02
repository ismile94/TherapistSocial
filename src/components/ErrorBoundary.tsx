import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useToast } from './useToast';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Component error:', error, errorInfo);
    
    // Try to show toast notification (may not work if error is in toast system)
    try {
      // Use window.dispatchEvent as fallback
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: {
          message: 'Something went wrong. Please refresh the page.',
          type: 'error'
        }
      }));
    } catch (e) {
      console.error('Failed to show error toast:', e);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">
              An unexpected error occurred. Please refresh the page.
            </p>
            {this.state.error && (
              <details className="text-left bg-gray-100 p-4 rounded mb-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                  Error details
                </summary>
                <pre className="text-xs text-gray-600 overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
