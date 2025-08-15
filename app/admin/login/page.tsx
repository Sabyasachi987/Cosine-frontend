"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GraduationCap, Shield } from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"

export default function AdminLoginPage() {
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  })
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Simple admin credentials (in real app, this would be more secure)
    if (credentials.username === "admin" && credentials.password === "admin123") {
      localStorage.setItem(
        "user",
        JSON.stringify({
          username: credentials.username,
          role: "admin",
          name: "Administrator",
        }),
      )
      router.push("/admin/dashboard")
    } else {
      alert("Invalid admin credentials!")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 dark:from-gray-900 dark:via-slate-800 dark:to-red-900 flex items-center justify-center p-4 transition-colors duration-300">
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
            <Shield className="h-8 w-8 text-red-600 dark:text-red-400" />
            <span className="text-2xl font-bold text-gray-900 dark:text-slate-100">Admin Access</span>
          </div>
          <CardTitle className="text-gray-900 dark:text-slate-100">Administrator Login</CardTitle>
          <CardDescription className="text-gray-600 dark:text-slate-300">Access admin panel to manage teachers</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-700 dark:text-slate-200 font-medium">Admin Username</Label>
              <Input
                id="username"
                placeholder="Enter admin username"
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                required
                className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:border-red-500 dark:focus:border-red-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 dark:text-slate-200 font-medium">Admin Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter admin password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                required
                className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:border-red-500 dark:focus:border-red-400"
              />
            </div>

            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white font-medium">
              Login as Admin
            </Button>
          </form>

          <div className="mt-6 space-y-4">
            <div className="text-center">
              <div className="space-y-2">
                <Link href="/auth/login" className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium block">
                  Student Login
                </Link>
                <Link href="/auth/teacher-login" className="text-sm text-green-600 dark:text-green-400 hover:underline font-medium block">
                  Teacher Login
                </Link>
              </div>
            </div>
            
            <div className="border-t border-gray-200 dark:border-slate-600 pt-4">
              <h4 className="font-semibold text-sm mb-2 text-gray-900 dark:text-slate-100">Demo Credentials:</h4>
              <div className="space-y-1 text-xs text-gray-600 dark:text-slate-300">
                <p>👤 Username: admin</p>
                <p>🔑 Password: admin123</p>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                Secure admin access for platform management
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
