"use client"

import React from 'react'
import { Button } from "@/components/ui/button"
import { RefreshCw, Home, AlertTriangle } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<any> },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ComponentType<any> }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error} />
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
          <div className="text-center bg-white/10 backdrop-blur-lg p-6 sm:p-8 rounded-xl shadow-2xl border border-white/20 max-w-lg w-full">
            {/* Error Icon */}
            <div className="text-orange-400 mb-6">
              <AlertTriangle className="w-16 h-16 mx-auto" />
            </div>
            
            {/* Error Title */}
            <h1 className="text-2xl font-bold text-white mb-3">
              Something went wrong
            </h1>
            
            {/* Error Message */}
            <p className="text-white/70 mb-6 text-sm leading-relaxed">
              An unexpected error occurred while loading the application. 
              This has been logged and will be fixed. Please try refreshing the page.
            </p>
            
            {/* Error Details (only in development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-left">
                <p className="text-red-300 text-xs font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                onClick={() => window.location.reload()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 hover:scale-105"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Page
              </Button>
              
              <Button 
                onClick={() => window.location.href = '/'}
                variant="outline" 
                className="w-full border-white/30 text-white hover:bg-white/10"
              >
                <Home className="w-4 h-4 mr-2" />
                Go to Home
              </Button>
            </div>
            
            {/* Help Text */}
            <div className="mt-6 pt-4 border-t border-white/20">
              <p className="text-white/50 text-xs">
                If this problem persists, please contact support with the error details.
              </p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

// Hook version for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    console.error('Caught error:', error, errorInfo)
    
    // In a real app, you would send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error reporting service
      // errorReportingService.captureException(error, { extra: errorInfo })
    }
  }
}
