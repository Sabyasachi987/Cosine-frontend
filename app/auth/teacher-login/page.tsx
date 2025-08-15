"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { GraduationCap, Eye, EyeOff, BookOpen, KeyRound, Mail, Shield } from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"

export default function TeacherLoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [showOtpDialog, setShowOtpDialog] = useState(false)
  const [showNewPasswordDialog, setShowNewPasswordDialog] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Add validation before making the request
    if (!formData.email || !formData.password) {
      toast({
        title: "Missing Information",
        description: "Please enter both email and password",
        variant: "destructive",
        duration: 4000,
        className: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/50 dark:text-amber-100"
      })
      setLoading(false)
      return
    }
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const response = await fetch(`${apiUrl}/api/teacher/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      })
      
      const data = await response.json()
      // Login response received

      if (data.success) {
        // Store teacher data and tokens
        localStorage.setItem("teacherUser", JSON.stringify(data.data.user))
        localStorage.setItem("teacherAccessToken", data.data.accessToken)
        localStorage.setItem("teacherRefreshToken", data.data.refreshToken)
        
        toast({
          title: "✓ Welcome back",
          description: `Signed in as ${data.data.user.firstName} ${data.data.user.lastName}`,
          duration: 3000,
          className: "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/50 dark:text-green-100"
        })
        
        router.push("/teacher/dashboard")
      } else {
        // Handle different types of errors with appropriate messaging
        let errorTitle = "Authentication Failed"
        let errorDescription = "Please check your credentials and try again"
        
        if (data.message?.toLowerCase().includes("access denied") || data.message?.toLowerCase().includes("not authorized")) {
          errorTitle = "Access Restricted"
          errorDescription = "This account is not authorized for teacher access. Please contact your administrator."
        } else if (data.message?.toLowerCase().includes("invalid") || data.message?.toLowerCase().includes("incorrect")) {
          errorTitle = "Invalid Credentials"
          errorDescription = "The email or password you entered is incorrect."
        } else if (data.message?.toLowerCase().includes("not found")) {
          errorTitle = "Account Not Found"
          errorDescription = "No teacher account found with this email address."
        } else if (data.message?.toLowerCase().includes("suspended") || data.message?.toLowerCase().includes("deactivated")) {
          errorTitle = "Account Suspended"
          errorDescription = "This account has been suspended. Please contact your administrator."
        } else if (data.message) {
          errorDescription = data.message
        }
        
        toast({
          title: errorTitle,
          description: errorDescription,
          variant: "destructive",
          duration: 5000,
          className: "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/50 dark:text-red-100"
        })
      }
    } catch (error) {
      console.error('Login error:', error)
      toast({
        title: "Connection Error",
        description: "Unable to reach the server. Please check your internet connection and try again.",
        variant: "destructive",
        duration: 5000,
        className: "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-900/50 dark:text-orange-100"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      toast({
        title: "Email Required",
        description: "Please enter your email address to continue",
        variant: "destructive",
        duration: 3000,
        className: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/50 dark:text-amber-100"
      })
      return
    }
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const response = await fetch(`${apiUrl}/api/teacher/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: forgotPasswordEmail })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "✓ OTP Sent Successfully",
          description: "Please check your email for the verification code",
          duration: 4000,
          className: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/50 dark:text-blue-100"
        })
        setShowForgotPassword(false)
        setShowOtpDialog(true)
      } else {
        toast({
          title: "Unable to Send OTP",
          description: data.message || "Please verify your email address and try again",
          variant: "destructive",
          duration: 4000,
          className: "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/50 dark:text-red-100"
        })
      }
    } catch (error) {
      console.error('Forgot password error:', error)
      toast({
        title: "Connection Error",
        description: "Unable to send OTP at this time. Please try again later.",
        variant: "destructive",
        duration: 4000,
        className: "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-900/50 dark:text-orange-100"
      })
    }
  }

  const handleVerifyOtp = async () => {
    if (!otpCode) {
      toast({
        title: "OTP Required",
        description: "Please enter the 6-digit verification code",
        variant: "destructive",
        duration: 3000,
        className: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/50 dark:text-amber-100"
      })
      return
    }
    
    if (otpCode.length !== 6) {
      toast({
        title: "Invalid Code Format",
        description: "Verification code must be exactly 6 digits",
        variant: "destructive",
        duration: 3000,
        className: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/50 dark:text-amber-100"
      })
      return
    }
    
    setShowOtpDialog(false)
    setShowNewPasswordDialog(true)
  }

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Password Required",
        description: "Please fill in both password fields to continue",
        variant: "destructive",
        duration: 3000,
        className: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/50 dark:text-amber-100"
      })
      return
    }
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please ensure both password fields are identical",
        variant: "destructive",
        duration: 3000,
        className: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/50 dark:text-amber-100"
      })
      return
    }
    
    if (newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
        duration: 3000,
        className: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/50 dark:text-amber-100"
      })
      return
    }
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const response = await fetch(`${apiUrl}/api/teacher/auth/reset-password`, {
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
          title: "✓ Password Updated Successfully",
          description: "You can now sign in with your new password",
          duration: 4000,
          className: "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/50 dark:text-green-100"
        })
        setShowNewPasswordDialog(false)
        // Reset all states
        setForgotPasswordEmail("")
        setOtpCode("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        toast({
          title: "Password Reset Failed",
          description: data.message || "Unable to update password. Please try the process again.",
          variant: "destructive",
          duration: 4000,
          className: "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/50 dark:text-red-100"
        })
      }
    } catch (error) {
      console.error('Reset password error:', error)
      toast({
        title: "Connection Error",
        description: "Unable to reset password at this time. Please try again later.",
        variant: "destructive",
        duration: 4000,
        className: "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-900/50 dark:text-orange-100"
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:via-slate-800 dark:to-green-900 flex items-center justify-center p-4 transition-colors duration-300">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="absolute top-4 left-4">
        <Link href="/">
          <Button variant="ghost" className="text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100">
            ← Back to Home
          </Button>
        </Link>
      </div>
      
      <Card className="w-full max-w-md bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 shadow-xl dark:shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="h-8 w-8 text-green-600 dark:text-green-400" />
            <span className="text-2xl font-bold text-gray-900 dark:text-slate-100">Cosine classes</span>
          </div>
          <CardTitle className="text-gray-900 dark:text-slate-100">Teacher Portal</CardTitle>
          <CardDescription className="text-gray-600 dark:text-slate-300">Sign in to your teacher account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 dark:text-slate-200 font-medium">Teacher Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your teacher email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className={`bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:border-green-500 dark:focus:border-green-400 transition-colors duration-200 ${
                  formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) 
                    ? 'border-red-300 focus:border-red-500 dark:border-red-600 dark:focus:border-red-400' 
                    : ''
                }`}
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
                  className={`bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:border-green-500 dark:focus:border-green-400 transition-colors duration-200 ${
                    formData.password && formData.password.length < 3 
                      ? 'border-red-300 focus:border-red-500 dark:border-red-600 dark:focus:border-red-400' 
                      : ''
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
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Signing In...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>Sign In as Teacher</span>
                </div>
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-green-600 dark:text-green-400 hover:underline font-medium p-0"
            >
              Forgot your password?
            </Button>
          </div>

          <div className="mt-6 space-y-4">
            <div className="text-center">
              <Link href="/auth/login" className="text-sm text-green-600 dark:text-green-400 hover:underline font-medium">
                ← Back to Student Login
              </Link>
            </div>
            
            <div className="border-t border-gray-200 dark:border-slate-600 pt-4">
              <p className="text-xs text-gray-500 dark:text-slate-400 text-center">
                New teacher? Contact your administrator to get your login credentials.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-full">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <DialogTitle className="text-center text-xl font-semibold text-gray-900">
              Forgot Password
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600">
              Enter your email address and we'll send you an OTP to reset your password.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Email Address</Label>
              <Input
                type="email"
                placeholder="Enter your teacher email"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowForgotPassword(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleForgotPassword}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Send OTP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OTP Verification Dialog */}
      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full">
              <KeyRound className="w-6 h-6 text-green-600" />
            </div>
            <DialogTitle className="text-center text-xl font-semibold text-gray-900">
              Enter OTP Code
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600">
              We've sent a 6-digit code to {forgotPasswordEmail}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">OTP Code</Label>
              <Input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full text-center text-lg font-mono"
                maxLength={6}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowOtpDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerifyOtp}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              Verify OTP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Password Dialog */}
      <Dialog open={showNewPasswordDialog} onOpenChange={setShowNewPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-purple-100 rounded-full">
              <KeyRound className="w-6 h-6 text-purple-600" />
            </div>
            <DialogTitle className="text-center text-xl font-semibold text-gray-900">
              Set New Password
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600">
              Create a new strong password for your account.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">New Password</Label>
              <Input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Confirm Password</Label>
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                Password must be at least 8 characters long and contain a mix of letters, numbers, and symbols.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowNewPasswordDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  )
}
