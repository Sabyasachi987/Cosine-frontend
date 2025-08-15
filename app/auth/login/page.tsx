"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { GraduationCap, Eye, EyeOff, KeyRound, Mail, ArrowLeft, AlertTriangle, RefreshCw, Wifi, WifiOff, Shield } from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"
import ErrorBoundary from "@/components/ErrorBoundary"

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [showOtpDialog, setShowOtpDialog] = useState(false)
  const [showNewPasswordDialog, setShowNewPasswordDialog] = useState(false)
  
  // Enhanced error handling states
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [connectionError, setConnectionError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [securityError, setSecurityError] = useState("")
  const maxRetryAttempts = 3
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "student", // Only students can login through this page
  })
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setConnectionError(false)
      setError("")
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      setConnectionError(true)
      setError("You are offline. Please check your internet connection.")
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Enhanced error handling with retry logic
  const handleApiError = useCallback((error: any, operation: string) => {
    let errorMessage = `Failed to ${operation}`
    
    if (error.message?.includes('timed out')) {
      errorMessage = `Request timed out while trying to ${operation}. Please check your connection and try again.`
    } else if (error.message?.includes('Network error') || error.message?.includes('Failed to fetch')) {
      errorMessage = `Network error while trying to ${operation}. Please check your internet connection.`
      setConnectionError(true)
    } else if (error.message?.includes('Database temporarily unavailable') || error.code === 'DATABASE_UNAVAILABLE') {
      errorMessage = 'Our services are temporarily unavailable. Please try again in a few moments.'
      setConnectionError(true)
    } else if (error.message?.includes('Database connection timeout') || error.code === 'DATABASE_TIMEOUT') {
      errorMessage = 'Connection timeout. Please check your internet connection and try again.'
      setConnectionError(true)
    } else if (error.message?.includes('Database service temporarily unavailable') || error.code === 'DATABASE_ERROR') {
      errorMessage = 'Our database service is temporarily unavailable. Please try again later.'
      setConnectionError(true)
    } else if (error.message?.includes('Invalid credentials')) {
      errorMessage = 'Invalid email or password. Please check your credentials and try again.'
      setSecurityError('Invalid login attempt detected.')
    } else if (error.message?.includes('Account locked')) {
      errorMessage = 'Your account has been temporarily locked due to multiple failed login attempts. Please try again later.'
      setSecurityError('Account security measure activated.')
    } else if (error.message?.includes('Email not verified')) {
      errorMessage = 'Please verify your email address before logging in. Check your email for verification link.'
    } else if (error.message?.includes('Server error')) {
      errorMessage = `Server error while trying to ${operation}. Please try again later.`
    } else if (error.message) {
      errorMessage = error.message
    }
    
    setError(errorMessage)
    setIsLoading(false)
    
    toast({
      title: "Authentication Error",
      description: errorMessage,
      variant: "destructive",
      duration: 5000,
    })
  }, [toast])

  // Enhanced API call function
  const makeApiCall = useCallback(async (endpoint: string, options: RequestInit = {}, timeout: number = 30000) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      
      const response = await fetch(`${apiUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })
      
      clearTimeout(timeoutId)
      
      if (response.status === 401) {
        throw new Error('Invalid credentials. Please check your email and password.')
      }
      
      if (response.status === 403) {
        throw new Error('Account access denied. Please contact support.')
      }
      
      if (response.status === 404) {
        throw new Error('User account not found. Please check your email address.')
      }
      
      if (response.status === 429) {
        throw new Error('Too many login attempts. Please wait a few minutes before trying again.')
      }
      
      if (response.status === 503) {
        const data = await response.json().catch(() => ({}))
        if (data.code === 'DATABASE_UNAVAILABLE') {
          throw new Error('Database temporarily unavailable. Please try again in a few moments.')
        } else if (data.code === 'DATABASE_TIMEOUT') {
          throw new Error('Database connection timeout. Please try again.')
        } else if (data.code === 'DATABASE_ERROR') {
          throw new Error('Database service temporarily unavailable. Please try again later.')
        } else {
          throw new Error('Service temporarily unavailable. Please try again later.')
        }
      }
      
      if (response.status >= 500) {
        throw new Error('Server error. Please try again later.')
      }
      
      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out. Please check your internet connection and try again.')
        }
        
        if (!navigator.onLine) {
          setIsOnline(false)
          setConnectionError(true)
          throw new Error('You are offline. Please check your internet connection.')
        }
      }
      
      throw error
    }
  }, [])

  // Retry mechanism with exponential backoff
  const retryOperation = useCallback(async (operation: () => Promise<any>, operationName: string) => {
    for (let attempt = 1; attempt <= maxRetryAttempts; attempt++) {
      try {
        setRetryCount(attempt - 1)
        const result = await operation()
        setRetryCount(0)
        setError("")
        setConnectionError(false)
        return result
      } catch (error: any) {
        if (attempt === maxRetryAttempts || 
            error.message?.includes('Invalid credentials') ||
            error.message?.includes('Account locked') ||
            error.message?.includes('Too many')) {
          handleApiError(error, operationName)
          throw error
        }
        
        // Exponential backoff: wait 1s, 2s, 4s between retries
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000))
      }
    }
  }, [handleApiError, maxRetryAttempts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSecurityError("")
    
    // Input validation with detailed feedback
    if (!formData.email || !formData.password) {
      setError("Please fill in all fields")
      return
    }

    if (!formData.email.includes("@")) {
      setError("Please enter a valid email address")
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    // Check network connectivity
    if (!isOnline) {
      setError("You are offline. Please check your internet connection.")
      return
    }

    setIsLoading(true)

    try {
      await retryOperation(async () => {
        const data = await makeApiCall('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          })
        })
        
        if (data.success) {
          // Store authentication data with error handling
          try {
            localStorage.setItem("user", JSON.stringify(data.data.user))
            localStorage.setItem("accessToken", data.data.accessToken)
            
            if (data.data.refreshToken) {
              localStorage.setItem("refreshToken", data.data.refreshToken)
            }
          } catch (storageError) {
            console.error("Failed to store authentication data:", storageError)
            throw new Error("Failed to save login session. Please try again.")
          }

          toast({
            title: "Login Successful",
            description: `Welcome back, ${data.data.user.firstName}!`,
            variant: "default",
            duration: 3000,
          })

          // Navigate based on user role with error handling
          try {
            if (data.data.user.role === "student") {
              router.push("/student/dashboard")
            } else if (data.data.user.role === "teacher") {
              router.push("/teacher/dashboard")
            } else {
              throw new Error("Unknown user role. Please contact support.")
            }
          } catch (navigationError) {
            console.error("Navigation error:", navigationError)
            setError("Login successful but navigation failed. Please refresh the page.")
          }
        } else {
          throw new Error(data.message || "Login failed. Please try again.")
        }
      }, 'log in')
      
    } catch (error: any) {
      console.error("Login error:", error)
      
      // Don't show error toast if already handled by retryOperation
      if (!error.message?.includes('Invalid credentials') && 
          !error.message?.includes('Account locked')) {
        // handleApiError already called by retryOperation
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Handle forgot password - send OTP
  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive",
        duration: 4000,
      })
      return
    }

    try {
      setIsLoading(true)
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const response = await fetch(`${apiUrl}/api/students/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: forgotPasswordEmail
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "✓ OTP Sent Successfully",
          description: "Please check your email for the verification code",
          duration: 4000,
          className: "border-green-200 bg-green-50 text-green-800"
        })
        setShowForgotPassword(false)
        setShowOtpDialog(true)
      } else {
        toast({
          title: "Failed to Send OTP",
          description: data.message || "Please try again",
          variant: "destructive",
          duration: 4000,
        })
      }
    } catch (error) {
      toast({
        title: "Network Error",
        description: "Please check your connection and try again",
        variant: "destructive",
        duration: 4000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle OTP verification and password reset
  const handlePasswordReset = async () => {
    if (!otpCode || !newPassword || !confirmPassword) {
      toast({
        title: "All Fields Required",
        description: "Please fill in all fields",
        variant: "destructive",
        duration: 4000,
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please ensure both passwords are identical",
        variant: "destructive",
        duration: 4000,
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
        duration: 4000,
      })
      return
    }

    try {
      setIsLoading(true)
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const response = await fetch(`${apiUrl}/api/students/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: forgotPasswordEmail,
          otp: otpCode,
          newPassword: newPassword
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "✓ Password Reset Successful",
          description: "You can now login with your new password",
          duration: 4000,
          className: "border-green-200 bg-green-50 text-green-800"
        })
        
        // Reset all dialogs and forms
        setShowOtpDialog(false)
        setShowNewPasswordDialog(false)
        setForgotPasswordEmail("")
        setOtpCode("")
        setNewPassword("")
        setConfirmPassword("")
        
        // Update login form with the email
        setFormData(prev => ({ ...prev, email: forgotPasswordEmail }))
      } else {
        toast({
          title: "Password Reset Failed",
          description: data.message || "Please check your OTP and try again",
          variant: "destructive",
          duration: 4000,
        })
      }
    } catch (error) {
      toast({
        title: "Network Error",
        description: "Please check your connection and try again",
        variant: "destructive",
        duration: 4000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-800 dark:to-blue-900 flex items-center justify-center p-4 transition-colors duration-300">
      {/* Back to Home Button */}
      <div className="absolute top-4 left-4">
        <Link href="/">
          <Button variant="outline" size="sm" className="flex items-center gap-2 hover:bg-white/80 dark:hover:bg-slate-700/80">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Home</span>
          </Button>
        </Link>
      </div>
      
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 shadow-xl dark:shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <GraduationCap className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <span className="text-2xl font-bold text-gray-900 dark:text-slate-100">Cosine classes</span>
          </div>
          <CardTitle className="text-gray-900 dark:text-slate-100">Welcome Back</CardTitle>
          <CardDescription className="text-gray-600 dark:text-slate-300">Sign in to your student account</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Enhanced Error Display with Network Status */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                    {error.includes('Network') || error.includes('connection') ? 'Connection Problem' :
                     error.includes('Invalid') || error.includes('credentials') ? 'Authentication Failed' :
                     error.includes('Account locked') ? 'Account Security' :
                     error.includes('timeout') ? 'Request Timeout' :
                     'Login Error'}
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-400 leading-relaxed">{error}</p>
                  
                  {/* Retry Actions */}
                  {(connectionError || error.includes('Network') || error.includes('timeout')) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        onClick={() => {
                          setError("")
                          setConnectionError(false)
                          handleSubmit(new Event('submit') as any)
                        }}
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
                        disabled={!isOnline || isLoading}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Try Again
                      </Button>
                    </div>
                  )}
                  
                  {/* Security Error Additional Info */}
                  {securityError && (
                    <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded text-xs text-orange-700 dark:text-orange-300">
                      <div className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        <span>{securityError}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Network Status Indicator */}
          {!isOnline && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
              <div className="flex items-center gap-2">
                <WifiOff className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
                  You are offline
                </span>
              </div>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                Please check your internet connection to continue.
              </p>
            </div>
          )}

          {/* Retry Information */}
          {retryCount > 0 && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                  Retry attempt {retryCount} of {maxRetryAttempts}
                </span>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                Automatically retrying your request...
              </p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 dark:text-slate-200 font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:border-blue-500 dark:focus:border-blue-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 dark:text-slate-200 font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:border-blue-500 dark:focus:border-blue-400"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Role is automatically set to student */}
            <input type="hidden" name="role" value="student" />

            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
            
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
              >
                Forgot Password?
              </button>
            </div>
          </form>

          <div className="mt-6 text-center space-y-3">
            <p className="text-sm text-gray-600 dark:text-slate-300">
              Don't have an account?{" "}
              <Link href="/auth/signup" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                Sign up
              </Link>
            </p>
            <div className="border-t border-gray-200 dark:border-slate-600 pt-3 space-y-2">
              <Link 
                href="/auth/teacher-login" 
                className="inline-block text-sm text-green-600 dark:text-green-400 hover:underline font-medium"
              >
                🎓 Teacher Login →
              </Link>
              <Link 
                href="/auth/admin-login" 
                className="inline-block text-sm text-purple-600 dark:text-purple-400 hover:underline font-medium ml-4"
              >
                🔐 Admin Login →
              </Link>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Teachers & Admins: Use your respective login portals with credentials from administrator
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a verification code to reset your password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="forgotEmail" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <Input
                id="forgotEmail"
                type="email"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full"
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowForgotPassword(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleForgotPassword}
              disabled={isLoading || !forgotPasswordEmail}
            >
              {isLoading ? "Sending..." : "Send OTP"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OTP Verification Dialog */}
      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Verification Code</DialogTitle>
            <DialogDescription>
              We've sent a 6-digit verification code to {forgotPasswordEmail}. 
              Please enter it below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="otpCode" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Verification Code
              </label>
              <Input
                id="otpCode"
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="w-full text-center text-lg tracking-widest"
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowOtpDialog(false)
                setShowForgotPassword(true)
              }}
              disabled={isLoading}
            >
              Back
            </Button>
            <Button
              onClick={() => {
                setShowOtpDialog(false)
                setShowNewPasswordDialog(true)
              }}
              disabled={isLoading || !otpCode || otpCode.length !== 6}
            >
              Verify Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Password Dialog */}
      <Dialog open={showNewPasswordDialog} onOpenChange={setShowNewPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set New Password</DialogTitle>
            <DialogDescription>
              Enter your new password. Make sure it's at least 6 characters long.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                New Password
              </label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full"
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full"
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowNewPasswordDialog(false)
                setShowOtpDialog(true)
              }}
              disabled={isLoading}
            >
              Back
            </Button>
            <Button
              onClick={handlePasswordReset}
              disabled={isLoading || !newPassword || !confirmPassword}
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Wrap the component with ErrorBoundary for production robustness
function LoginPageWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <LoginPage />
    </ErrorBoundary>
  )
}

export { LoginPageWithErrorBoundary as default }
