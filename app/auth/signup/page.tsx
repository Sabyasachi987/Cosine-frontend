"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { GraduationCap, Eye, EyeOff, AlertTriangle, RefreshCw, Wifi, WifiOff, Shield, CheckCircle, ArrowLeft } from "lucide-react"
import ErrorBoundary from "@/components/ErrorBoundary"

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const searchParams = useSearchParams()
  const defaultRole = searchParams.get("role") || ""

  // Enhanced error handling states
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [connectionError, setConnectionError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  const maxRetryAttempts = 3

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student", // Always student for public signup
    classLevel: "",
  })
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

  // Enhanced form validation
  const validateForm = useCallback(() => {
    const errors: {[key: string]: string} = {}
    
    if (!formData.firstName.trim()) {
      errors.firstName = "First name is required"
    } else if (formData.firstName.length < 2) {
      errors.firstName = "First name must be at least 2 characters"
    }
    
    if (!formData.lastName.trim()) {
      errors.lastName = "Last name is required"
    } else if (formData.lastName.length < 2) {
      errors.lastName = "Last name must be at least 2 characters"
    }
    
    if (!formData.email.trim()) {
      errors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address"
    }
    
    if (!formData.password) {
      errors.password = "Password is required"
    } else if (formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters long"
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    }
    
    if (!formData.confirmPassword) {
      errors.confirmPassword = "Please confirm your password"
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords don't match"
    }
    
    if (!formData.classLevel) {
      errors.classLevel = "Please select your class level"
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }, [formData])

  // Enhanced error handling with retry logic
  const handleApiError = useCallback((error: any, operation: string) => {
    let errorMessage = `Failed to ${operation}`
    
    if (error.message?.includes('timed out')) {
      errorMessage = `Request timed out while trying to ${operation}. Please check your connection and try again.`
    } else if (error.message?.includes('Network error') || error.message?.includes('Failed to fetch')) {
      errorMessage = `Network error while trying to ${operation}. Please check your internet connection.`
      setConnectionError(true)
    } else if (error.message?.includes('Email already exists')) {
      errorMessage = 'An account with this email address already exists. Please use a different email or try logging in.'
    } else if (error.message?.includes('Invalid email format')) {
      errorMessage = 'Please enter a valid email address.'
    } else if (error.message?.includes('Password too weak')) {
      errorMessage = 'Password is too weak. Please choose a stronger password with at least 8 characters, including uppercase, lowercase, and numbers.'
    } else if (error.message?.includes('Server error')) {
      errorMessage = `Server error while trying to ${operation}. Please try again later.`
    } else if (error.message) {
      errorMessage = error.message
    }
    
    setError(errorMessage)
    setIsLoading(false)
    
    toast({
      title: "Registration Error",
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
      
      if (response.status === 400) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Invalid registration data. Please check your information.')
      }
      
      if (response.status === 409) {
        throw new Error('Email already exists. Please use a different email address.')
      }
      
      if (response.status === 429) {
        throw new Error('Too many registration attempts. Please wait a few minutes before trying again.')
      }
      
      if (response.status >= 500) {
        throw new Error('Server error. Please try again later.')
      }
      
      if (!response.ok) {
        throw new Error(`Registration failed: ${response.statusText}`)
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
            error.message?.includes('Email already exists') ||
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
    
    // Clear previous errors
    setError("")
    setValidationErrors({})
    
    // Check network connectivity
    if (!isOnline) {
      setError("You are offline. Please check your internet connection and try again.")
      setConnectionError(true)
      return
    }
    
    // Enhanced form validation
    if (!validateForm()) {
      setError("Please fix the validation errors below.")
      return
    }
    
    setIsLoading(true)
    setConnectionError(false)
    
    try {
      // Registration with retry logic
      const data = await retryOperation(async () => {
        const response = await makeApiCall('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            email: formData.email.toLowerCase().trim(),
            password: formData.password,
            role: 'student',
            classLevel: parseInt(formData.classLevel),
            schoolName: 'Default High School' // You can make this a form field later
          }),
        })
        
        return response
      }, 'create account')
      
      // Success handling
      setIsLoading(false)
      
      if (data.success) {
        // Store tokens securely
        try {
          localStorage.setItem('accessToken', data.data.accessToken)
          localStorage.setItem('refreshToken', data.data.refreshToken)
          localStorage.setItem('user', JSON.stringify(data.data.user))
        } catch (storageError) {
          // Handle storage errors
          setError("Unable to save login information. Please try logging in manually after registration.")
        }
        
        toast({
          title: "Registration Successful!",
          description: "Welcome! Redirecting to your dashboard...",
          variant: "default",
          duration: 3000,
        })
        
        // Redirect to student dashboard
        router.push("/student/dashboard")
      } else {
        throw new Error(data.message || 'Registration failed')
      }
      
    } catch (error: any) {
      setIsLoading(false)
      // Error already handled by retryOperation and handleApiError
    }
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-800 dark:to-blue-900 flex items-center justify-center p-4 transition-colors duration-300">
        <Card className="w-full max-w-md bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 shadow-xl dark:shadow-2xl">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <GraduationCap className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <span className="text-2xl font-bold text-gray-900 dark:text-slate-100">Cosine classes</span>
            </div>
            <Link 
              href="/" 
              className="absolute top-4 left-4 flex items-center text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium">Home</span>
            </Link>
            <CardTitle className="text-gray-900 dark:text-slate-100">Create Student Account</CardTitle>
            <CardDescription className="text-gray-600 dark:text-slate-300">Join our educational platform as a student</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Network Status Indicator */}
            {!isOnline && (
              <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 rounded-md text-sm flex items-center gap-2">
                <WifiOff className="h-4 w-4" />
                You are offline. Please check your internet connection.
              </div>
            )}
            
            {/* Error Display with Enhanced Information */}
            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-md text-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p>{error}</p>
                    {connectionError && (
                      <div className="mt-2 space-y-2">
                        <p className="text-xs">Troubleshooting tips:</p>
                        <ul className="text-xs list-disc list-inside space-y-1">
                          <li>Check your internet connection</li>
                          <li>Try refreshing the page</li>
                          <li>Ensure the backend server is running</li>
                        </ul>
                      </div>
                    )}
                    {retryCount > 0 && (
                      <p className="mt-2 text-xs flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" />
                        Retry attempt: {retryCount} of {maxRetryAttempts}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Connection Status */}
            {isOnline && !connectionError && (
              <div className="mb-4 p-2 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 rounded-md text-xs flex items-center gap-2">
                <Wifi className="h-3 w-3" />
                Connected
              </div>
            )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-gray-700 dark:text-slate-200 font-medium">First Name</Label>
              <Input
                id="firstName"
                placeholder="Enter your first name"
                value={formData.firstName}
                onChange={(e) => {
                  setFormData({ ...formData, firstName: e.target.value })
                  if (validationErrors.firstName) {
                    setValidationErrors({ ...validationErrors, firstName: '' })
                  }
                }}
                required
                className={`bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:border-blue-500 dark:focus:border-blue-400 ${
                  validationErrors.firstName ? 'border-red-500 dark:border-red-400' : ''
                }`}
              />
              {validationErrors.firstName && (
                <p className="text-red-600 dark:text-red-400 text-xs mt-1">{validationErrors.firstName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-gray-700 dark:text-slate-200 font-medium">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Enter your last name"
                value={formData.lastName}
                onChange={(e) => {
                  setFormData({ ...formData, lastName: e.target.value })
                  if (validationErrors.lastName) {
                    setValidationErrors({ ...validationErrors, lastName: '' })
                  }
                }}
                required
                className={`bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:border-blue-500 dark:focus:border-blue-400 ${
                  validationErrors.lastName ? 'border-red-500 dark:border-red-400' : ''
                }`}
              />
              {validationErrors.lastName && (
                <p className="text-red-600 dark:text-red-400 text-xs mt-1">{validationErrors.lastName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 dark:text-slate-200 font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value })
                  if (validationErrors.email) {
                    setValidationErrors({ ...validationErrors, email: '' })
                  }
                }}
                required
                className={`bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:border-blue-500 dark:focus:border-blue-400 ${
                  validationErrors.email ? 'border-red-500 dark:border-red-400' : ''
                }`}
              />
              {validationErrors.email && (
                <p className="text-red-600 dark:text-red-400 text-xs mt-1">{validationErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 dark:text-slate-200 font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value })
                    if (validationErrors.password) {
                      setValidationErrors({ ...validationErrors, password: '' })
                    }
                  }}
                  required
                  className={`bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:border-blue-500 dark:focus:border-blue-400 ${
                    validationErrors.password ? 'border-red-500 dark:border-red-400' : ''
                  }`}
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
              {validationErrors.password && (
                <p className="text-red-600 dark:text-red-400 text-xs mt-1">{validationErrors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-700 dark:text-slate-200 font-medium">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => {
                  setFormData({ ...formData, confirmPassword: e.target.value })
                  if (validationErrors.confirmPassword) {
                    setValidationErrors({ ...validationErrors, confirmPassword: '' })
                  }
                }}
                required
                className={`bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:border-blue-500 dark:focus:border-blue-400 ${
                  validationErrors.confirmPassword ? 'border-red-500 dark:border-red-400' : ''
                }`}
              />
              {validationErrors.confirmPassword && (
                <p className="text-red-600 dark:text-red-400 text-xs mt-1">{validationErrors.confirmPassword}</p>
              )}
            </div>

            {/* Role is automatically set to student - teachers are added by admin */}
            <input type="hidden" name="role" value="student" />

            {/* Class selection is required for all students */}
            <div className="space-y-2">
              <Label htmlFor="classLevel" className="text-gray-700 dark:text-slate-200 font-medium">Class</Label>
              <Select 
                value={formData.classLevel} 
                onValueChange={(value) => {
                  setFormData({ ...formData, classLevel: value })
                  if (validationErrors.classLevel) {
                    setValidationErrors({ ...validationErrors, classLevel: '' })
                  }
                }}
              >
                <SelectTrigger className={`bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500 text-gray-900 dark:text-slate-100 ${
                  validationErrors.classLevel ? 'border-red-500 dark:border-red-400' : ''
                }`}>
                  <SelectValue placeholder="Select your class" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500">
                  <SelectItem value="9" className="text-gray-900 dark:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-600">Class 9</SelectItem>
                  <SelectItem value="10" className="text-gray-900 dark:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-600">Class 10</SelectItem>
                  <SelectItem value="11" className="text-gray-900 dark:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-600">Class 11</SelectItem>
                  <SelectItem value="12" className="text-gray-900 dark:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-600">Class 12</SelectItem>
                </SelectContent>
              </Select>
              {validationErrors.classLevel && (
                <p className="text-red-600 dark:text-red-400 text-xs mt-1">{validationErrors.classLevel}</p>
              )}
            </div>

            <Button 
              type="submit" 
              disabled={isLoading || !isOnline || connectionError}
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Creating Account...
                  {retryCount > 0 && (
                    <span className="text-xs">
                      (Attempt {retryCount + 1})
                    </span>
                  )}
                </div>
              ) : !isOnline || connectionError ? (
                <div className="flex items-center justify-center gap-2">
                  <WifiOff className="h-4 w-4" />
                  No Connection
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Create Account
                </div>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-slate-300">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
      <Toaster />
    </div>
    </ErrorBoundary>
  )
}
