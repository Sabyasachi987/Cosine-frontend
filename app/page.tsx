"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Users, Video, FileText, GraduationCap } from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"
import LoadingScreen from "@/components/LoadingScreen"

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 4000) // Show loading for 4 seconds

    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return <LoadingScreen />
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50 border-gray-200 dark:border-gray-700 transition-colors duration-300">
        <div className="w-full px-0 py-3 sm:py-4">
          <div className="flex items-center justify-between px-3 sm:px-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
              <div className="flex flex-col">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">Cosine classes</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium hidden sm:block">by Debabrata Mahanta</p>
              </div>
            </div>
            
            {/* Clean, minimal navigation */}
            <div className="flex items-center gap-2 sm:gap-4">
              <ThemeToggle />
              <Link href="/auth/login">
                <Button variant="ghost" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-xs sm:text-sm px-2 sm:px-4">
                  <span className="hidden sm:inline">Student Login</span>
                  <span className="sm:hidden">Login</span>
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-3 sm:px-6 text-xs sm:text-sm">
                  <span className="hidden sm:inline">Get Started</span>
                  <span className="sm:hidden">Start</span>
                </Button>
              </Link>
            </div>
          </div>
          {/* Mobile founder info */}
          <div className="mt-1 sm:hidden px-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">by Debabrata Mahanta</p>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-8 sm:py-16 text-center px-3 sm:px-0">
        <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 text-center leading-tight">
          Learn & Teach with
          <span className="text-blue-600 dark:text-blue-400"> Cosine classes</span>
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4 sm:mb-6 font-medium">
          Founded by Debabrata Mahanta
        </p>
        <p className="text-sm sm:text-lg text-gray-600 dark:text-gray-300 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
          A comprehensive platform for teachers to share educational content and students to access learning materials
          for classes 9-12.
        </p>
      </section>

      {/* Access Portal Cards - Compact Design */}
      <section className="py-6 sm:py-8 bg-gradient-to-r from-slate-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 transition-colors duration-300">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="text-center mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">Choose Your Portal</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm px-4">Select your role to access the platform</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {/* Student Portal Card */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 rounded-xl blur-sm opacity-25 group-hover:opacity-60 transition-all duration-500"></div>
              <div className="relative bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-lg h-full border border-blue-100 dark:border-blue-900/50 transition-all duration-300 group-hover:scale-102">
                {/* Icon & Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="relative">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md">
                      <GraduationCap className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="px-2 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-bold rounded-full">
                    STUDENT
                  </div>
                </div>
                
                {/* Title */}
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Learn & Grow
                </h4>
                
                {/* Description */}
                <p className="text-gray-600 dark:text-gray-300 text-xs mb-4 leading-relaxed">
                  Access videos, notes & study materials for classes 9-12
                </p>
                
                {/* Feature Icons */}
                <div className="flex justify-center gap-4 mb-4">
                  <div className="text-center">
                    <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-md mb-1">
                      <Video className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Videos</span>
                  </div>
                  <div className="text-center">
                    <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-md mb-1">
                      <FileText className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Notes</span>
                  </div>
                  <div className="text-center">
                    <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-md mb-1">
                      <BookOpen className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Materials</span>
                  </div>
                </div>
                
                {/* CTA Button */}
                <Link href="/auth/login">
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-sm">
                    Enter Student Portal
                  </Button>
                </Link>
              </div>
            </div>

            {/* Teacher Portal Card */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 via-green-500 to-emerald-600 rounded-xl blur-sm opacity-25 group-hover:opacity-60 transition-all duration-500"></div>
              <div className="relative bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-lg h-full border border-green-100 dark:border-green-900/50 transition-all duration-300 group-hover:scale-102">
                {/* Icon & Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="relative">
                    <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="px-2 py-1 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-bold rounded-full">
                    TEACHER
                  </div>
                </div>
                
                {/* Title */}
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                  Teach & Share
                </h4>
                
                {/* Description */}
                <p className="text-gray-600 dark:text-gray-300 text-xs mb-4 leading-relaxed">
                  Upload content, organize classes & track student progress
                </p>
                
                {/* Feature Icons */}
                <div className="flex justify-center gap-4 mb-4">
                  <div className="text-center">
                    <div className="p-1.5 bg-green-50 dark:bg-green-900/30 rounded-md mb-1">
                      <span className="text-sm">📤</span>
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Upload</span>
                  </div>
                  <div className="text-center">
                    <div className="p-1.5 bg-green-50 dark:bg-green-900/30 rounded-md mb-1">
                      <span className="text-sm">📊</span>
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Manage</span>
                  </div>
                  <div className="text-center">
                    <div className="p-1.5 bg-green-50 dark:bg-green-900/30 rounded-md mb-1">
                      <span className="text-sm">📈</span>
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Track</span>
                  </div>
                </div>
                
                {/* CTA Button */}
                <Link href="/auth/teacher-login">
                  <Button className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-sm">
                    Enter Teacher Portal
                  </Button>
                </Link>
              </div>
            </div>

            {/* Admin Portal Card */}
            <div className="group relative sm:col-span-2 lg:col-span-1">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-purple-500 to-pink-600 rounded-xl blur-sm opacity-25 group-hover:opacity-60 transition-all duration-500"></div>
              <div className="relative bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-lg h-full border border-purple-100 dark:border-purple-900/50 transition-all duration-300 group-hover:scale-102">
                {/* Icon & Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="relative">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-md">
                      <BookOpen className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="px-2 py-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-bold rounded-full">
                    ADMIN
                  </div>
                </div>
                
                {/* Title */}
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  Control & Manage
                </h4>
                
                {/* Description */}
                <p className="text-gray-600 dark:text-gray-300 text-xs mb-4 leading-relaxed">
                  Oversee platform operations & manage system settings
                </p>
                
                {/* Feature Icons */}
                <div className="flex justify-center gap-4 mb-4">
                  <div className="text-center">
                    <div className="p-1.5 bg-purple-50 dark:bg-purple-900/30 rounded-md mb-1">
                      <span className="text-sm">👥</span>
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Users</span>
                  </div>
                  <div className="text-center">
                    <div className="p-1.5 bg-purple-50 dark:bg-purple-900/30 rounded-md mb-1">
                      <span className="text-sm">⚙️</span>
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Settings</span>
                  </div>
                  <div className="text-center">
                    <div className="p-1.5 bg-purple-50 dark:bg-purple-900/30 rounded-md mb-1">
                      <span className="text-sm">🔐</span>
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Security</span>
                  </div>
                </div>
                
                {/* CTA Button */}
                <Link href="/auth/admin-login">
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-sm">
                    Enter Admin Portal
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-8 sm:py-16 bg-white dark:bg-gray-900 transition-colors duration-300">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h3 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">Why Choose Cosine classes?</h3>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto text-sm sm:text-base px-4">
              Our platform is designed to make learning and teaching more effective and engaging for everyone involved.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
            <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 dark:border-gray-600">
              <CardHeader className="p-4 sm:p-6">
                <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-900 rounded-xl w-fit mx-auto mb-3 sm:mb-4">
                  <Video className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-gray-900 dark:text-white text-base sm:text-lg">Interactive Content</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <CardDescription className="text-gray-600 dark:text-gray-300 text-sm">
                  High-quality educational videos, comprehensive notes, and interactive materials designed for effective learning.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-700 dark:border-gray-600">
              <CardHeader className="p-4 sm:p-6">
                <div className="p-2 sm:p-3 bg-green-100 dark:bg-green-900 rounded-xl w-fit mx-auto mb-3 sm:mb-4">
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-gray-900 dark:text-white text-base sm:text-lg">Teacher-Friendly</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <CardDescription className="text-gray-600 dark:text-gray-300 text-sm">
                  Easy-to-use tools for teachers to upload, organize, and manage their educational content with intuitive controls.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 dark:border-gray-600 sm:col-span-2 lg:col-span-1">
              <CardHeader className="p-4 sm:p-6">
                <div className="p-2 sm:p-3 bg-purple-100 dark:bg-purple-900 rounded-xl w-fit mx-auto mb-3 sm:mb-4">
                  <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle className="text-gray-900 dark:text-white text-base sm:text-lg">Comprehensive</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <CardDescription className="text-gray-600 dark:text-gray-300 text-sm">
                  Complete curriculum coverage for classes 9-12 with organized content by subjects and chapters.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-white py-8 sm:py-12 transition-colors duration-300">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <div className="sm:col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <GraduationCap className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
                <h4 className="text-lg sm:text-xl font-bold">Cosine classes</h4>
              </div>
              <p className="text-gray-400 mb-4 max-w-md text-sm sm:text-base">
                Empowering education through technology. Connect teachers and students with quality learning materials 
                for a better academic experience.
              </p>
            </div>
            
            <div>
              <h5 className="font-semibold mb-3 text-sm sm:text-base">Quick Links</h5>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/auth/login" className="hover:text-white transition-colors">Student Login</Link></li>
                <li><Link href="/auth/teacher-login" className="hover:text-white transition-colors">Teacher Login</Link></li>
                <li><Link href="/auth/admin-login" className="hover:text-white transition-colors">Admin Access</Link></li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-semibold mb-3 text-sm sm:text-base">Support</h5>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-xs sm:text-sm text-gray-400">
            <p>&copy; 2024 Cosine classes. All rights reserved. Designed for educational excellence.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
