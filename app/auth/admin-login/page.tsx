"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GraduationCap, Eye, EyeOff, Shield, Mail, Key } from "lucide-react"
// import { ThemeToggle } from "@/components/ThemeToggle"

type LoginStep = 'credentials' | 'forgot-password' | 'otp-verification' | 'reset-password'

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [step, setStep] = useState<LoginStep>('credentials')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  
  const [forgotPasswordData, setForgotPasswordData] = useState({
    email: "",
  })
  
  const [otpData, setOtpData] = useState({
    email: "",
    otp: "",
    newPassword: "",
  })
  
  const router = useRouter()

  // Regular admin login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const response = await fetch(`${apiUrl}/api/admin/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Store admin data and tokens
        localStorage.setItem('adminUser', JSON.stringify(data.data.user))
        localStorage.setItem('adminAccessToken', data.data.accessToken)
        localStorage.setItem('adminRefreshToken', data.data.refreshToken)
        
        setSuccess('Login successful! Redirecting...')
        setTimeout(() => {
          router.push('/admin/dashboard')
        }, 1000)
      } else {
        setError(data.message || 'Login failed')
      }
    } catch (error) {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Send OTP for password reset
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const response = await fetch(`${apiUrl}/api/admin/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(forgotPasswordData),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setOtpData({ ...otpData, email: forgotPasswordData.email })
        setSuccess('OTP sent to your email! Check your inbox.')
        setStep('otp-verification')
      } else {
        setError(data.message || 'Failed to send OTP')
      }
    } catch (error) {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Reset password with OTP
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const response = await fetch(`${apiUrl}/api/admin/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(otpData),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSuccess('Password reset successful! You can now login.')
        setTimeout(() => {
          setStep('credentials')
          setFormData({ email: otpData.email, password: '' })
          setOtpData({ email: '', otp: '', newPassword: '' })
          setForgotPasswordData({ email: '' })
        }, 2000)
      } else {
        setError(data.message || 'Password reset failed')
      }
    } catch (error) {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 transition-colors duration-300">
      {/* <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div> */}
      <div className="absolute top-4 left-4">
        <Link href="/">
          <Button variant="ghost" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            ← Back to Home
          </Button>
        </Link>
      </div>
      
      <Card className="w-full max-w-md dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">Cosine Classes</span>
          </div>
          <CardTitle className="text-gray-900 dark:text-white">
            {step === 'credentials' && 'Admin Login'}
            {step === 'forgot-password' && 'Forgot Password'}
            {step === 'otp-verification' && 'Enter OTP'}
            {step === 'reset-password' && 'Reset Password'}
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-300">
            {step === 'credentials' && 'Sign in to administrator account'}
            {step === 'forgot-password' && 'Enter your email to receive OTP'}
            {step === 'otp-verification' && 'Check your email for the OTP code'}
            {step === 'reset-password' && 'Enter OTP and new password'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Success/Error Messages */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <p className="text-green-600 dark:text-green-400 text-sm">{success}</p>
            </div>
          )}

          {/* Login Form */}
          {step === 'credentials' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 dark:text-gray-200">Admin Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter admin email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 dark:text-gray-200">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter admin password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="pr-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white"
              >
                {loading ? 'Signing In...' : 'Sign In as Admin'}
              </Button>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep('forgot-password')}
                  className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
            </form>
          )}

          {/* Forgot Password Form */}
          {step === 'forgot-password' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email" className="text-gray-700 dark:text-gray-200">Admin Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="xyz6173@gmail.com"
                    value={forgotPasswordData.email}
                    onChange={(e) => setForgotPasswordData({ ...forgotPasswordData, email: e.target.value })}
                    required
                    className="pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white"
              >
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </Button>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep('credentials')}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}

          {/* OTP Verification & Password Reset Form */}
          {(step === 'otp-verification' || step === 'reset-password') && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-gray-700 dark:text-gray-200">OTP Code</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otpData.otp}
                    onChange={(e) => setOtpData({ ...otpData, otp: e.target.value })}
                    required
                    maxLength={6}
                    className="pl-10 text-center text-lg tracking-widest dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-gray-700 dark:text-gray-200">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new password (min 8 characters)"
                    value={otpData.newPassword}
                    onChange={(e) => setOtpData({ ...otpData, newPassword: e.target.value })}
                    required
                    minLength={8}
                    className="pr-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-xs text-blue-800 dark:text-blue-200">
                <strong>Check your email:</strong> We sent a 6-digit OTP to {otpData.email}
              </div>
              
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white"
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </Button>
              
              <div className="text-center space-x-4">
                <button
                  type="button"
                  onClick={() => setStep('forgot-password')}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
                >
                  Resend OTP
                </button>
                <span className="text-gray-400">|</span>
                <button
                  type="button"
                  onClick={() => setStep('credentials')}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}
          
          <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-300">
            Not an admin?{" "}
            <Link href="/auth/login" className="text-blue-600 dark:text-blue-400 hover:underline">
              Student Login
            </Link>
            {" "} | {" "}
            <Link href="/auth/teacher-login" className="text-green-600 dark:text-green-400 hover:underline">
              Teacher Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
