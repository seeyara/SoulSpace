'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Error info:', errorInfo);
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback component if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} retry={this.retry} />;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-6">
              We're sorry, but something unexpected happened. Please try again.
            </p>
            <div className="space-y-3">
              <button
                onClick={this.retry}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-xl hover:bg-purple-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Refresh Page
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-6 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer">Error Details</summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {this.state.error.message}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for error handling in functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    console.error('Component error:', error);
    if (errorInfo) {
      console.error('Error info:', errorInfo);
    }
  };
}