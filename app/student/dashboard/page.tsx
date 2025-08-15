"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Search, Video, FileText, BookOpen, Users, LogOut, Play, Download, Eye, ChevronDown, ChevronRight, GraduationCap, Clock, CheckCircle2, X } from "lucide-react"
import { useRouter } from "next/navigation"
import YouTubePlayer from "@/components/YouTubePlayer"
import ErrorBoundary from "@/components/ErrorBoundary"

interface Content {
  id: number
  title: string
  contentType: "video" | "pdf" | "document"
  description: string
  fileUrl: string
  duration?: number
  fileSize?: number
  youtubeVideoId?: string
  embedUrl?: string
  watchUrl?: string
  thumbnailUrl?: string
  createdAt: string
  approved: boolean
  teacher: {
    firstName: string
    lastName: string
  }
}

interface Chapter {
  id: number
  title: string
  content: Content[]
}

interface Subject {
  id: number
  name: string
  description: string
  chapters: Chapter[]
}

interface Class {
  classLevel: number
  subjects: Subject[]
  enrollmentCount: number
  contentCount: number
  isEnrolled: boolean
}

function StudentDashboard() {
  const [user, setUser] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [classes, setClasses] = useState<Class[]>([])
  const [currentView, setCurrentView] = useState<'classes' | 'subjects' | 'chapters' | 'content'>('classes')
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null)
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  const [contentFilter, setContentFilter] = useState<'all' | 'video' | 'notes'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [retryCount, setRetryCount] = useState(0)
  const [isOnline, setIsOnline] = useState(true)
  const [connectionError, setConnectionError] = useState(false)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [showVideoPlayer, setShowVideoPlayer] = useState(false)
  const [currentVideo, setCurrentVideo] = useState<Content | null>(null)
  const [playlistVideos, setPlaylistVideos] = useState<Content[]>([])
  const [dbStatus, setDbStatus] = useState<'unknown' | 'healthy' | 'unhealthy'>('unknown')
  const router = useRouter()
  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setConnectionError(false)
      // Retry failed requests when connection is restored
      if (retryCount < 3) {
        fetchDashboardData()
      }
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      setConnectionError(true)
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [retryCount])

  // Enhanced error handling with retry logic
  const handleApiError = useCallback((error: any, operation: string) => {
    let errorMessage = `Failed to ${operation}`
    
    if (error.message.includes('timed out')) {
      errorMessage = `Request timed out while trying to ${operation}. Please check your connection and try again.`
    } else if (error.message.includes('Network error') || error.message.includes('Failed to fetch')) {
      errorMessage = `Network error while trying to ${operation}. Please check your internet connection.`
      setConnectionError(true)
    } else if (error.message.includes('Authentication expired')) {
      errorMessage = 'Your session has expired. Please log in again.'
    } else if (error.message.includes('Access denied')) {
      errorMessage = `You don't have permission to ${operation}. Please contact your teacher.`
    } else if (error.message.includes('not found')) {
      errorMessage = `The requested content was not found. It may have been removed.`
    } else if (error.message.includes('Server error')) {
      errorMessage = `Server error while trying to ${operation}. Please try again later.`
    } else if (error.message) {
      errorMessage = error.message
    }
    
    setError(errorMessage)
    setIsLoading(false)
  }, [])

  // Retry mechanism with exponential backoff
  const retryOperation = useCallback(async (operation: () => Promise<any>, operationName: string, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        setRetryCount(attempt - 1)
        const result = await operation()
        setRetryCount(0)
        setError("")
        setConnectionError(false)
        return result
      } catch (error: any) {
        if (attempt === maxRetries) {
          handleApiError(error, operationName)
          throw error
        }
        
        // Exponential backoff: wait 1s, 2s, 4s between retries
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000))
      }
    }
  }, [handleApiError])

  // API helper function with comprehensive error handling
  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('accessToken')
    
    try {
      // Making API call to backend
      
      // Use environment variable for API URL, fallback to localhost
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
      })
      
      clearTimeout(timeoutId)
      
      // API response received
      
      if (response.status === 401) {
        // Authentication failed - redirect to login
        localStorage.removeItem('user')
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        router.push('/auth/login')
        throw new Error('Authentication expired. Please login again.')
      }
      
      if (response.status === 403) {
        throw new Error('Access denied. You do not have permission to view this content.')
      }
      
      if (response.status === 404) {
        throw new Error('Content not found. It may have been removed or you may not have access.')
      }
      
      if (response.status === 500) {
        throw new Error('Server error. Please try again later or contact support.')
      }
      
      if (response.status >= 400) {
        throw new Error(`Request failed: ${response.statusText}`)
      }
      
      if (!response.ok) {
        throw new Error(`Network error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      // Processing response data
      return data
      
    } catch (error: any) {
      // Handle different types of errors
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please check your internet connection and try again.')
      }
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Network error. Please check your internet connection and try again.')
      }
      
      // Re-throw the error with context
      throw error
    }
  }, [router])

  // Database health check function
  const checkDatabaseHealth = useCallback(async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const response = await fetch(`${baseUrl}/api/health/database`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        setDbStatus('healthy')
      } else {
        setDbStatus('unhealthy')
      }
    } catch (error) {
      console.error('Database health check failed:', error)
      setDbStatus('unhealthy')
    }
  }, [])

  // Database health monitoring - placed after function definition
  useEffect(() => {
    // Check health immediately
    checkDatabaseHealth()
    
    // Set up periodic health checks every 30 seconds
    const healthCheckInterval = setInterval(checkDatabaseHealth, 30000)
    
    return () => {
      clearInterval(healthCheckInterval)
    }
  }, [checkDatabaseHealth])

  // Fetch student dashboard data with enhanced error handling
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError("")
      setConnectionError(false)
      
      // Use retry mechanism for critical data loading
      await retryOperation(async () => {
        // Starting dashboard data fetch
        
        // Get student dashboard info with class-based structure
        const dashboardData = await apiCall('/api/students/dashboard')
        
        if (dashboardData.success && dashboardData.data.classes) {
          if (Array.isArray(dashboardData.data.classes) && dashboardData.data.classes.length > 0) {
            setClasses(dashboardData.data.classes)
            // Classes loaded successfully
          } else {
            // No classes enrolled - this is valid state
            setClasses([])
            setError("You haven't enrolled in any classes yet. Contact your teacher for enrollment.")
          }
        } else {
          // Invalid response structure
          setClasses([])
          throw new Error("Invalid response from server. Please try again.")
        }
        
        // Dashboard data fetch completed
        
      }, 'load your dashboard')
      
    } catch (error: any) {
      // Enhanced error logging and user feedback
      console.error('❌ Error fetching dashboard data:', error)
      
      if (error.message.includes('Authentication expired')) {
        // Already handled by apiCall, just return
        return
      }
      
      // Set user-friendly error message
      handleApiError(error, 'load your dashboard')
      
    } finally {
      setIsLoading(false)
    }
  }, [apiCall, retryOperation, handleApiError])

  useEffect(() => {
    const userData = localStorage.getItem("user")
    const token = localStorage.getItem("accessToken")
    
    // Checking authentication status
    
    if (userData && token) {
      try {
        const parsedUser = JSON.parse(userData)
        // User authenticated successfully
        
        if (parsedUser.role !== "student") {
          console.error('🚫 User is not a student:', parsedUser.role)
          alert("Access denied. Student access required.")
          router.push("/auth/login")
          return
        }
        setUser(parsedUser)
        
        // Fetch dashboard data from backend
        fetchDashboardData()
      } catch (error) {
        console.error('❌ Error parsing user data:', error)
        localStorage.clear()
        router.push("/auth/login")
      }
    } else {
      // No authentication data found - redirecting to login
      router.push("/auth/login")
    }
  }, [router, fetchDashboardData])

  // Handle browser back button and page unload events
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'Are you sure you want to leave? You will be logged out.'
      return 'Are you sure you want to leave? You will be logged out.'
    }

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault()
      
      // If video player is open, close it instead of showing logout dialog
      if (showVideoPlayer) {
        handleVideoClose()
        return
      }
      
      setShowLogoutDialog(true)
      // Push the current state back to prevent navigation
      window.history.pushState(null, '', window.location.pathname)
    }

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)
    
    // Push initial state to handle back button
    window.history.pushState(null, '', window.location.pathname)

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [showVideoPlayer])

  const handleLogout = () => {
    localStorage.removeItem("user")
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")
    router.push("/auth/login")
  }

  const confirmLogout = () => {
    setShowLogoutDialog(false)
    handleLogout()
  }

  const cancelLogout = () => {
    setShowLogoutDialog(false)
  }

  // Video player functions
  const handleVideoNext = () => {
    if (!currentVideo || !playlistVideos.length) return
    
    const currentIndex = playlistVideos.findIndex(v => v.id === currentVideo.id)
    const nextIndex = currentIndex + 1
    
    if (nextIndex < playlistVideos.length) {
      setCurrentVideo(playlistVideos[nextIndex])
    }
  }

  const handleVideoPrevious = () => {
    if (!currentVideo || !playlistVideos.length) return
    
    const currentIndex = playlistVideos.findIndex(v => v.id === currentVideo.id)
    const prevIndex = currentIndex - 1
    
    if (prevIndex >= 0) {
      setCurrentVideo(playlistVideos[prevIndex])
    }
  }

  const handleVideoClose = () => {
    setShowVideoPlayer(false)
    setCurrentVideo(null)
    setPlaylistVideos([])
    
    // Push a new state to handle the next back button press
    window.history.pushState(null, '', window.location.pathname)
  }

  // Helper functions for the new navigation system
  const handleClassClick = (classData: Class) => {
    setSelectedClass(classData)
    setSelectedSubject(null)
    setSelectedChapter(null)
    setSearchTerm("") // Reset search when switching classes
    setCurrentView('subjects')
  }

  const handleSubjectClick = (subject: Subject) => {
    setSelectedSubject(subject)
    setSelectedChapter(null)
    setSearchTerm("") // Reset search when switching subjects
    setCurrentView('chapters')
  }

  const handleChapterClick = (chapter: Chapter) => {
    setSelectedChapter(chapter)
    setContentFilter('all') // Reset filter when entering new chapter
    setSearchTerm("") // Reset search when switching chapters
    setCurrentView('content')
  }

  const handleBackToClasses = () => {
    setCurrentView('classes')
    setSelectedClass(null)
    setSelectedSubject(null)
    setSelectedChapter(null)
    setSearchTerm("") // Reset search when going back to classes
  }

  const handleBackToSubjects = () => {
    setCurrentView('subjects')
    setSelectedSubject(null)
    setSelectedChapter(null)
    setSearchTerm("") // Reset search when going back to subjects
  }

  const handleBackToChapters = () => {
    setCurrentView('chapters')
    setSelectedChapter(null)
    setContentFilter('all') // Reset filter when going back
    setSearchTerm("") // Reset search when going back to chapters
  }

  const toggleChapter = (chapterKey: string) => {
    const newExpanded = new Set(expandedChapters)
    if (newExpanded.has(chapterKey)) {
      newExpanded.delete(chapterKey)
    } else {
      newExpanded.add(chapterKey)
    }
    setExpandedChapters(newExpanded)
  }

  const handleEnrollment = async (classLevel: number) => {
    try {
      // Find subjects for this class level and enroll in the first one as an example
      const classData = classes.find(c => c.classLevel === classLevel)
      if (classData && classData.subjects.length > 0) {
        const firstSubject = classData.subjects[0]
        await apiCall(`/api/students/enroll/${firstSubject.id}`, {
          method: 'POST'
        })
        
        // Refresh the dashboard data
        fetchDashboardData()
        // Enrolled in subject successfully
      }
    } catch (error) {
      console.error('❌ Enrollment failed:', error)
      alert('Failed to enroll. Please try again.')
    }
  }

  // Filter data based on current view and search term (class-specific)
  const getFilteredData = (): Class[] | Subject[] | Chapter[] | Content[] => {
    if (currentView === 'classes') {
      // For classes view, return all classes without search filtering
      // Students must select a class first before they can search
      return classes
    } else if (currentView === 'subjects' && selectedClass) {
      return selectedClass.subjects.filter(subject => {
        if (!searchTerm) return true
        return subject.name.toLowerCase().includes(searchTerm.toLowerCase())
      })
    } else if (currentView === 'chapters' && selectedSubject) {
      return selectedSubject.chapters.filter(chapter => {
        if (!searchTerm) return true
        return chapter.title.toLowerCase().includes(searchTerm.toLowerCase())
      })
    } else if (currentView === 'content' && selectedChapter) {
      return selectedChapter.content.filter(content => {
        if (!searchTerm) return true
        return content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          `${content.teacher.firstName} ${content.teacher.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
      })
    }
    return []
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" />
      case "pdf":
      case "document":
        return <FileText className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "video":
        return "bg-blue-100 text-blue-800"
      case "pdf":
      case "document":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleContentAction = async (content: Content, action: 'view' | 'download') => {
    // Validate content and action parameters
    if (!content || !content.id) {
      setError('Invalid content. Please refresh the page and try again.')
      return
    }

    if (!action || !['view', 'download'].includes(action)) {
      setError('Invalid action. Please try again.')
      return
    }

    // Check network connectivity
    if (!isOnline) {
      setError('You are offline. Please check your internet connection and try again.')
      return
    }

    try {
      setError("") // Clear any previous errors
      
      if (action === 'view' && content.contentType === 'video') {
        // Video action triggered - tracking progress and opening custom video player
        
        try {
          // Track progress with retry mechanism
          await retryOperation(async () => {
            await apiCall(`/api/students/progress`, {
              method: 'POST',
              body: JSON.stringify({
                contentId: content.id,
                action: 'start_viewing'
              })
            })
          }, 'track video progress')
          
        } catch (progressError) {
          // Don't block video viewing if progress tracking fails
          console.error('Progress tracking failed:', progressError)
        }
        
        // Get all videos from current chapter for playlist
        if (selectedChapter) {
          const allVideos = selectedChapter.content.filter(c => 
            c.approved && c.contentType === 'video'
          )
          // All videos in chapter processed
          
          if (allVideos.length === 0) {
            setError('No approved videos found in this chapter.')
            return
          }
          
          setPlaylistVideos(allVideos)
          setCurrentVideo(content)
          setShowVideoPlayer(true)
          
          // Push a state to history so back button can close video player
          window.history.pushState({ videoPlayer: true }, '', window.location.pathname)
        } else {
          setError('Chapter not selected. Please navigate properly through the interface.')
          return
        }
        return
        
      } else if (action === 'view' || action === 'download') {
        // For notes/documents, track progress
        try {
          await retryOperation(async () => {
            await apiCall(`/api/students/progress`, {
              method: 'POST', 
              body: JSON.stringify({
                contentId: content.id,
                action: action === 'view' ? 'view_document' : 'download_document'
              })
            })
          }, 'track document progress')
          
        } catch (progressError) {
          // Don't block document access if progress tracking fails
          console.error('Progress tracking failed:', progressError)
        }
      }
      
      // Validate file URL
      if (!content.fileUrl) {
        setError('File not available. The content may have been removed or you may not have access.')
        return
      }
      
      // Handle content access based on action
      try {
        // Check if the URL is already a full Cloudinary URL or a local path
        const isCloudinaryUrl = content.fileUrl.startsWith('https://res.cloudinary.com')
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
        
        // Fix URL construction - ensure proper slash handling
        const fullUrl = isCloudinaryUrl 
          ? content.fileUrl 
          : `${baseUrl}${content.fileUrl.startsWith('/') ? '' : '/'}${content.fileUrl}`
        
        if (action === 'view') {
          // For Cloudinary URLs, handle different file types appropriately
          if (isCloudinaryUrl) {
            // For PDFs and documents, use Google Docs Viewer for reliable display
            if (content.contentType === 'pdf' || content.contentType === 'document') {
              try {
                // Create a custom HTML page to display the PDF with the correct title
                const customViewerHTML = `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <title>${content.title}</title>
                    <meta charset="UTF-8">
                    <style>
                      body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                      .header { 
                        background: #1f2937; 
                        color: white; 
                        padding: 12px 20px; 
                        font-size: 16px; 
                        font-weight: 600;
                        border-bottom: 1px solid #374151;
                      }
                      .viewer { 
                        width: 100%; 
                        height: calc(100vh - 60px); 
                        border: none; 
                      }
                      .error {
                        padding: 20px;
                        text-align: center;
                        font-size: 18px;
                        color: #dc2626;
                      }
                    </style>
                  </head>
                  <body>
                    <div class="header">${content.title}</div>
                    <iframe class="viewer" src="https://docs.google.com/gview?url=${encodeURIComponent(fullUrl)}&embedded=true" 
                            onerror="document.querySelector('.viewer').style.display='none'; document.body.innerHTML += '<div class=\\"error\\">Unable to load document. <a href=\\"${fullUrl}\\" target=\\"_blank\\">Click here to download</a></div>'">
                    </iframe>
                  </body>
                  </html>
                `
                
                // Create a blob URL with the custom HTML
                const blob = new Blob([customViewerHTML], { type: 'text/html' })
                const customUrl = URL.createObjectURL(blob)
                const newWindow = window.open(customUrl, '_blank')
                
                if (!newWindow) {
                  throw new Error('Popup blocked. Please allow popups for this site.')
                }
                
                // Clean up the blob URL after a short delay
                setTimeout(() => {
                  URL.revokeObjectURL(customUrl)
                }, 1000)
                
              } catch (viewerError) {
                // Fallback to direct URL opening
                console.error('Custom viewer failed:', viewerError)
                const newWindow = window.open(fullUrl, '_blank')
                if (!newWindow) {
                  setError('Unable to open document. Please allow popups or try downloading instead.')
                  return
                }
              }
            } else {
              // For other files (videos, images), open directly
              const newWindow = window.open(fullUrl, '_blank')
              if (!newWindow) {
                setError('Unable to open file. Please allow popups for this site.')
                return
              }
            }
          } else {
            // For local files
            const newWindow = window.open(fullUrl, '_blank')
            if (!newWindow) {
              setError('Unable to open file. Please allow popups for this site.')
              return
            }
          }
          
        } else if (action === 'download') {
          try {
            // For Cloudinary URLs, we can download directly
            // For local URLs, we need to use the backend with auth
            if (isCloudinaryUrl) {
              // Direct download from Cloudinary with timeout
              const controller = new AbortController()
              const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout for downloads
              
              const response = await fetch(fullUrl, {
                signal: controller.signal
              })
              
              clearTimeout(timeoutId)
              
              if (!response.ok) {
                throw new Error(`Failed to fetch file from Cloudinary: ${response.status} ${response.statusText}`)
              }
              
              const blob = await response.blob()
              
              // Validate file size (prevent memory issues)
              if (blob.size > 500 * 1024 * 1024) { // 500MB limit
                throw new Error('File too large to download directly. Please contact your teacher.')
              }
              
              // Get file extension from content type or URL
              let extension = 'file'
              const contentType = response.headers.get('content-type')
              
              if (contentType) {
                if (contentType.includes('pdf')) extension = 'pdf'
                else if (contentType.includes('video/mp4')) extension = 'mp4'
                else if (contentType.includes('video')) extension = 'mp4'
                else if (contentType.includes('image/jpeg')) extension = 'jpg'
                else if (contentType.includes('image/png')) extension = 'png'
                else if (contentType.includes('image')) extension = 'jpg'
                else if (contentType.includes('text')) extension = 'txt'
                else if (contentType.includes('document')) extension = 'doc'
              }
              
              // If we couldn't determine from content-type, try to get from content.contentType
              if (extension === 'file' && content.contentType) {
                if (content.contentType === 'pdf' || content.contentType === 'document') extension = 'pdf'
                else if (content.contentType === 'video') extension = 'mp4'
                else if (content.contentType === 'image') extension = 'jpg'
              }
              
              const sanitizedTitle = content.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
              const filename = `${sanitizedTitle}.${extension}`
              
              // Create download link
              const url = window.URL.createObjectURL(blob)
              const link = document.createElement('a')
              link.href = url
              link.download = filename
              link.style.display = 'none'
              document.body.appendChild(link)
              link.click()
              
              // Cleanup
              setTimeout(() => {
                document.body.removeChild(link)
                window.URL.revokeObjectURL(url)
              }, 100)
              
            } else {
              // Original logic for local files with auth
              const token = localStorage.getItem('accessToken')
              
              if (!token) {
                throw new Error('Authentication required. Please log in again.')
              }
              
              const controller = new AbortController()
              const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout
              
              const response = await fetch(fullUrl, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              })
              
              clearTimeout(timeoutId)
              
              if (response.status === 401) {
                throw new Error('Authentication expired. Please log in again.')
              }
              
              if (response.status === 403) {
                throw new Error('Access denied. You do not have permission to download this file.')
              }
              
              if (response.status === 404) {
                throw new Error('File not found. It may have been moved or deleted.')
              }
              
              if (!response.ok) {
                throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`)
              }
              
              // Get the file blob
              const blob = await response.blob()
              
              // Validate file size
              if (blob.size > 500 * 1024 * 1024) { // 500MB limit
                throw new Error('File too large to download directly. Please contact your teacher.')
              }
              
              // Extract file extension from URL or use PDF as default
              const urlParts = content.fileUrl.split('.')
              const extension = urlParts.length > 1 ? urlParts.pop() : 'pdf'
              
              // Create filename from content title
              const sanitizedTitle = content.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
              const filename = `${sanitizedTitle}.${extension}`
              
              // Create download link
              const url = window.URL.createObjectURL(blob)
              const link = document.createElement('a')
              link.href = url
              link.download = filename
              link.style.display = 'none'
              document.body.appendChild(link)
              link.click()
              
              // Cleanup
              setTimeout(() => {
                document.body.removeChild(link)
                window.URL.revokeObjectURL(url)
              }, 100)
            }
            
          } catch (downloadError: any) {
            console.error('Download failed:', downloadError)
            
            // Provide specific error messages
            let errorMessage = 'Download failed. '
            
            if (downloadError.name === 'AbortError') {
              errorMessage += 'Download timed out. Please try again with a stable internet connection.'
            } else if (downloadError.message.includes('Failed to fetch')) {
              errorMessage += 'Network error. Please check your connection and try again.'
            } else if (downloadError.message.includes('too large')) {
              errorMessage += downloadError.message
            } else if (downloadError.message.includes('Authentication')) {
              errorMessage += 'Please log in again to download files.'
            } else if (downloadError.message.includes('Access denied')) {
              errorMessage += 'You do not have permission to download this file.'
            } else if (downloadError.message.includes('not found')) {
              errorMessage += 'File not found. Please contact your teacher.'
            } else {
              errorMessage += 'Please try viewing the file instead, or contact your teacher.'
            }
            
            setError(errorMessage)
            
            // Fallback to opening in new tab for some cases
            if (!downloadError.message.includes('Authentication') && 
                !downloadError.message.includes('Access denied') &&
                !downloadError.message.includes('too large')) {
              setTimeout(() => {
                const newWindow = window.open(fullUrl, '_blank')
                if (newWindow) {
                  setError(errorMessage + ' Opened file in new tab instead.')
                }
              }, 2000)
            }
          }
        }
        
      } catch (urlError: any) {
        console.error('URL handling error:', urlError)
        setError('Unable to process file URL. Please contact your teacher or try again later.')
      }
      
    } catch (error: any) {
      console.error('Error handling content action:', error)
      
      // Provide user-friendly error messages based on error type
      let errorMessage = 'Unable to access content. '
      
      if (error.message.includes('Authentication expired')) {
        errorMessage = 'Your session has expired. Please log in again.'
        // Redirect handled by apiCall
        return
      } else if (error.message.includes('Network error') || error.message.includes('Failed to fetch')) {
        errorMessage += 'Please check your internet connection and try again.'
      } else if (error.message.includes('timeout')) {
        errorMessage += 'Request timed out. Please try again.'
      } else if (error.message.includes('Access denied')) {
        errorMessage += 'You do not have permission to access this content.'
      } else if (error.message.includes('not found')) {
        errorMessage += 'Content not found. It may have been removed.'
      } else {
        errorMessage += 'Please try again or contact your teacher if the problem persists.'
      }
      
      setError(errorMessage)
    }
  }

  const getActionButton = (content: Content) => {
    switch (content.contentType) {
      case "video":
        return (
          <Button 
            size="sm" 
            className="bg-blue-600 hover:bg-blue-700 text-white h-8"
            onClick={() => handleContentAction(content, 'view')}
          >
            <Play className="h-3 w-3 mr-1" />
            Watch
          </Button>
        )
      case "pdf":
      case "document":
        return (
          <div className="flex gap-1">
            <Button 
              size="sm" 
              variant="outline" 
              className="h-8"
              onClick={() => handleContentAction(content, 'view')}
            >
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
            <Button 
              size="sm" 
              className="bg-green-600 hover:bg-green-700 text-white h-8"
              onClick={() => handleContentAction(content, 'download')}
            >
              <Download className="h-3 w-3 mr-1" />
              Get
            </Button>
          </div>
        )
      default:
        return null
    }
  }

  if (!user) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
        <p className="text-white/80">Loading your dashboard...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="text-center bg-white/10 backdrop-blur-lg p-6 sm:p-8 rounded-xl shadow-2xl border border-white/20 max-w-md w-full">
        {/* Error Icon */}
        <div className="text-red-400 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        {/* Error Title */}
        <h3 className="text-xl font-semibold text-white mb-3">
          {error.includes('Authentication') || error.includes('session') ? 'Session Expired' :
           error.includes('Network') || error.includes('connection') ? 'Connection Problem' :
           error.includes('Access denied') ? 'Access Denied' :
           error.includes('not found') ? 'Content Not Found' :
           'Something Went Wrong'}
        </h3>
        
        {/* Error Message */}
        <p className="text-white/70 mb-6 text-sm leading-relaxed">{error}</p>
        
        {/* Network Status Indicator */}
        {!isOnline && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
            <div className="flex items-center justify-center gap-2 text-red-300 text-sm">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
              <span>You are offline</span>
            </div>
          </div>
        )}
        
        {connectionError && isOnline && (
          <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
            <div className="flex items-center justify-center gap-2 text-yellow-300 text-sm">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              <span>Connection unstable</span>
            </div>
          </div>
        )}
        
        {/* Retry Information */}
        {retryCount > 0 && (
          <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <p className="text-blue-300 text-sm">
              Retry attempt {retryCount} of 3
            </p>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={fetchDashboardData} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 hover:scale-105"
            disabled={!isOnline}
          >
            {!isOnline ? 'Waiting for connection...' : 'Try Again'}
          </Button>
          
          {/* Additional helpful actions */}
          {error.includes('Authentication') || error.includes('session') ? (
            <Button 
              onClick={() => {
                localStorage.clear()
                router.push('/auth/login')
              }}
              variant="outline" 
              className="w-full border-white/30 text-white hover:bg-white/10"
            >
              Sign In Again
            </Button>
          ) : (
            <Button 
              onClick={() => router.push('/')}
              variant="outline" 
              className="w-full border-white/30 text-white hover:bg-white/10"
            >
              Go to Home
            </Button>
          )}
        </div>
        
        {/* Help Text */}
        <div className="mt-6 pt-4 border-t border-white/20">
          <p className="text-white/50 text-xs">
            {error.includes('Authentication') ? 
              'Please sign in again to continue accessing your content.' :
             error.includes('Network') || error.includes('connection') ?
              'Check your internet connection and try again.' :
             error.includes('Access denied') ?
              'Contact your teacher if you believe this is an error.' :
              'If the problem persists, please contact support.'}
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        {/* Large gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
        <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-full blur-3xl animate-pulse delay-3000"></div>
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
        
        {/* Floating particles */}
        <div className="absolute top-1/4 left-1/2 w-2 h-2 bg-white/30 rounded-full animate-ping"></div>
        <div className="absolute top-1/2 left-1/4 w-1 h-1 bg-blue-400/40 rounded-full animate-ping delay-500"></div>
        <div className="absolute top-3/4 right-1/3 w-1.5 h-1.5 bg-purple-400/40 rounded-full animate-ping delay-1000"></div>
        <div className="absolute bottom-1/3 left-2/3 w-1 h-1 bg-green-400/40 rounded-full animate-ping delay-1500"></div>
      </div>
      
      {/* Content overlay */}
      <div className="relative z-10">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-800/95 via-purple-900/90 to-slate-800/95 backdrop-blur-xl sticky top-0 z-50 shadow-2xl border-b border-white/10">
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500/30 to-purple-500/30 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20 shadow-lg">
                  <BookOpen className="h-5 w-5 text-white drop-shadow-lg" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg bg-gradient-to-r from-white to-blue-100 bg-clip-text">Cosine Portals</h1>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <Badge className="bg-gradient-to-r from-blue-500/30 to-purple-500/30 text-white border-white/30 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                  <Users className="h-3 w-3 mr-1 drop-shadow-sm" />
                  <span className="drop-shadow-sm">Student</span>
                </Badge>
                {user.studentProfile?.classLevel && (
                  <Badge variant="outline" className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-white border-emerald-400/40 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <span className="drop-shadow-sm">Class {user.studentProfile.classLevel}</span>
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Network Status Indicator */}
              <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-sm border transition-all duration-300 ${
                !isOnline 
                  ? 'bg-red-500/20 border-red-500/30 text-red-300' 
                  : connectionError 
                  ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300'
                  : 'bg-green-500/20 border-green-500/30 text-green-300'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  !isOnline 
                    ? 'bg-red-400 animate-pulse' 
                    : connectionError 
                    ? 'bg-yellow-400 animate-pulse'
                    : 'bg-green-400'
                }`}></div>
                <span className="text-xs font-medium">
                  {!isOnline ? 'Offline' : connectionError ? 'Unstable' : 'Online'}
                </span>
              </div>
              
              <div className="text-right">
                <div className="hidden md:flex items-center gap-2 bg-gradient-to-r from-white/15 to-white/10 backdrop-blur-lg rounded-xl px-4 py-2.5 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                  <div className="w-7 h-7 bg-gradient-to-br from-blue-500/40 to-purple-500/40 rounded-full flex items-center justify-center border border-white/30 shadow-md">
                    <Users className="h-3.5 w-3.5 text-white drop-shadow-sm" />
                  </div>
                  <span className="text-sm text-white font-medium drop-shadow-sm">{user.firstName} {user.lastName}</span>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowLogoutDialog(true)} 
                className="text-white hover:bg-gradient-to-r hover:from-red-500/20 hover:to-pink-500/20 border-2 border-white/30 hover:border-red-400/50 backdrop-blur-sm transition-all duration-300 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 hover:-translate-y-0.5"
              >
                <LogOut className="h-4 w-4 drop-shadow-sm" />
              </Button>
            </div>
          </div>
          {/* Mobile layout - Minimal and Essential */}
          <div className="sm:hidden mt-3 pt-3 border-t border-white/20">
            <div className="flex items-center justify-between">
              {/* Essential user info */}
              <div className="flex items-center gap-3">
                <Badge className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border-blue-400/40 backdrop-blur-sm text-xs shadow-md">
                  <span className="drop-shadow-sm">{user.firstName} {user.lastName}</span>
                </Badge>
                {user.studentProfile?.classLevel && (
                  <Badge className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-white border-emerald-400/40 backdrop-blur-sm text-xs shadow-md">
                    <span className="drop-shadow-sm">Class {user.studentProfile.classLevel}</span>
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="px-3 sm:px-6 lg:px-8 py-3 sm:py-6 lg:py-8">
        {/* Compact Breadcrumb Navigation */}
        {currentView !== 'classes' && (
          <div className="mb-3 sm:mb-4">
            <div className="flex items-center gap-1 px-3 py-2 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 overflow-x-auto">
              <button
                onClick={handleBackToClasses}
                className="text-blue-400 hover:text-blue-300 font-medium text-xs flex items-center gap-1 transition-colors whitespace-nowrap hover:bg-white/10 px-2 py-1 rounded"
              >
                <ChevronRight className="h-3 w-3 rotate-180" />
                <span>Classes</span>
              </button>
              
              {currentView === 'subjects' && selectedClass && (
                <>
                  <ChevronRight className="h-3 w-3 text-white/30 mx-0.5" />
                  <span className="text-white/80 font-medium text-xs px-2 py-1 bg-white/10 rounded whitespace-nowrap">
                    Class {selectedClass.classLevel}
                  </span>
                </>
              )}
              
              {currentView === 'chapters' && selectedClass && selectedSubject && (
                <>
                  <ChevronRight className="h-3 w-3 text-white/30 mx-0.5" />
                  <button
                    onClick={handleBackToSubjects}
                    className="text-blue-400 hover:text-blue-300 font-medium text-xs transition-colors whitespace-nowrap hover:bg-white/10 px-2 py-1 rounded"
                  >
                    Class {selectedClass.classLevel}
                  </button>
                  <ChevronRight className="h-3 w-3 text-white/30 mx-0.5" />
                  <span className="text-white/80 font-medium text-xs px-2 py-1 bg-white/10 rounded truncate max-w-24 sm:max-w-none">
                    {selectedSubject.name}
                  </span>
                </>
              )}
              
              {currentView === 'content' && selectedClass && selectedSubject && selectedChapter && (
                <>
                  <ChevronRight className="h-3 w-3 text-white/30 mx-0.5" />
                  <button
                    onClick={handleBackToSubjects}
                    className="text-blue-400 hover:text-blue-300 font-medium text-xs transition-colors whitespace-nowrap hover:bg-white/10 px-2 py-1 rounded"
                  >
                    Class {selectedClass.classLevel}
                  </button>
                  <ChevronRight className="h-3 w-3 text-white/30 mx-0.5" />
                  <button
                    onClick={handleBackToChapters}
                    className="text-blue-400 hover:text-blue-300 font-medium text-xs transition-colors hover:bg-white/10 px-2 py-1 rounded truncate max-w-20 sm:max-w-none"
                  >
                    {selectedSubject.name}
                  </button>
                  <ChevronRight className="h-3 w-3 text-white/30 mx-0.5" />
                  <span className="text-white/80 font-medium text-xs px-2 py-1 bg-white/10 rounded truncate max-w-16 sm:max-w-none">
                    {selectedChapter.title}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Search Bar - Class-Specific Search */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 shadow-2xl p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="mb-3 sm:mb-4">
            <h2 className="text-sm sm:text-base lg:text-lg font-semibold text-white mb-1">
              {currentView === 'classes' ? 'Select Your Class' : 'Find Your Content'}
            </h2>
            <p className="text-xs text-white/70">
              {currentView === 'classes' 
                ? 'Choose a class to access your learning materials' 
                : `Search within Class ${selectedClass?.classLevel} learning materials`
              }
            </p>
          </div>
          
          {/* Compact Search Section */}
          {currentView !== 'classes' && (
            <div className="space-y-2">
              {/* Combined Search Bar with Context */}
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1 bg-blue-500/20 rounded">
                    <GraduationCap className="h-3 w-3 text-blue-300" />
                  </div>
                  <span className="text-blue-300 font-medium text-xs">
                    Class {selectedClass?.classLevel}
                  </span>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/60" />
                  <Input
                    placeholder={`Search ${
                      currentView === 'subjects' ? 'subjects...' :
                      currentView === 'chapters' ? 'chapters...' :
                      'content and teachers...'
                    }`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-9 text-sm border-white/30 focus:border-blue-400 focus:ring-blue-400 bg-white/10 backdrop-blur-sm text-white placeholder-white/60"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Class Selection Hint - Compact */}
          {currentView === 'classes' && (
            <div className="flex items-center gap-2 p-2 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
              <div className="p-1 bg-white/10 rounded">
                <BookOpen className="h-3 w-3 text-white/80" />
              </div>
              <span className="text-white/80 text-xs">
                Select a class below to start searching for specific content
              </span>
            </div>
          )}
        </div>

        {/* Inline Error Display for Content Access Issues */}
        {error && currentView !== 'classes' && (
          <div className="bg-red-500/10 backdrop-blur-lg rounded-xl border border-red-500/30 shadow-lg p-4 mb-4 sm:mb-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 mt-0.5">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-red-300 mb-1">
                  {error.includes('Authentication') || error.includes('session') ? 'Session Issue' :
                   error.includes('Network') || error.includes('connection') ? 'Connection Issue' :
                   error.includes('Access denied') ? 'Access Issue' :
                   error.includes('not found') ? 'Content Issue' :
                   'Error'}
                </h4>
                <p className="text-xs text-red-200/80 leading-relaxed">{error}</p>
                
                {/* Retry Actions */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setError('')
                      if (error.includes('load your dashboard')) {
                        fetchDashboardData()
                      }
                    }}
                    className="px-3 py-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg text-red-200 transition-all duration-200 hover:scale-105"
                    disabled={!isOnline}
                  >
                    {!isOnline ? 'Waiting...' : 'Retry'}
                  </button>
                  
                  <button
                    onClick={() => setError('')}
                    className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg text-white/80 transition-all duration-200"
                  >
                    Dismiss
                  </button>
                  
                  {(error.includes('Authentication') || error.includes('session')) && (
                    <button
                      onClick={() => {
                        localStorage.clear()
                        router.push('/auth/login')
                      }}
                      className="px-3 py-1.5 text-xs bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded-lg text-blue-200 transition-all duration-200"
                    >
                      Sign In Again
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Content Based on Current View - Only show when not loading */}
        {!isLoading && currentView === 'classes' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {(getFilteredData() as Class[]).map((classData) => (
              <div
                key={classData.classLevel} 
                className="group relative overflow-hidden rounded-xl cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
                onClick={() => handleClassClick(classData)}
              >
                {/* Gradient Background */}
                <div className={`h-full p-3 sm:p-4 relative ${
                  classData.classLevel === 9 ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-700' :
                  classData.classLevel === 10 ? 'bg-gradient-to-br from-purple-500 via-purple-600 to-pink-700' :
                  classData.classLevel === 11 ? 'bg-gradient-to-br from-green-500 via-emerald-600 to-teal-700' :
                  'bg-gradient-to-br from-orange-500 via-red-500 to-pink-600'
                }`}>
                  
                  {/* Decorative Elements - Compact */}
                  <div className="absolute top-0 right-0 w-16 h-16 opacity-10">
                    <div className="absolute top-1 right-1 w-6 h-6 bg-white rounded-full"></div>
                    <div className="absolute top-2 right-2 w-4 h-4 bg-white rounded-full"></div>
                    <div className="absolute top-3 right-3 w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  
                  {/* Class Icon and Level */}
                  <div className="relative z-10 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg">
                        <GraduationCap className="h-4 w-4 text-white" />
                      </div>
                      <div className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                        <span className="text-white text-xs font-medium">Class {classData.classLevel}</span>
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-bold text-white mb-1">
                      Class {classData.classLevel}
                    </h3>
                    <p className="text-white/80 text-xs">
                      Explore your learning journey
                    </p>
                  </div>
                  
                  {/* Stats Section - Compact */}
                  <div className="relative z-10 space-y-2">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xl font-bold text-white">{classData.subjects.length}</div>
                          <div className="text-white/80 text-xs">Subjects</div>
                        </div>
                        <div className="p-1 bg-white/20 rounded">
                          <BookOpen className="h-3 w-3 text-white" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Quick Stats - Horizontal layout */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="bg-white/10 backdrop-blur-sm rounded p-1.5 border border-white/20">
                        <div className="flex items-center gap-1">
                          <Video className="h-3 w-3 text-white" />
                          <span className="text-white text-xs font-medium">
                            {classData.subjects.reduce((total: number, subject) => 
                              total + subject.chapters.reduce((chapterTotal: number, chapter) => 
                                chapterTotal + chapter.content.filter((c: Content) => c.approved && c.contentType === 'video').length, 0
                              ), 0
                            )}
                          </span>
                        </div>
                        <div className="text-white/80 text-xs mt-0.5">Videos</div>
                      </div>
                      
                      <div className="bg-white/10 backdrop-blur-sm rounded p-1.5 border border-white/20">
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3 text-white" />
                          <span className="text-white text-xs font-medium">
                            {classData.subjects.reduce((total: number, subject) => 
                              total + subject.chapters.reduce((chapterTotal: number, chapter) => 
                                chapterTotal + chapter.content.filter((c: Content) => c.approved && (c.contentType === 'pdf' || c.contentType === 'document')).length, 0
                              ), 0
                            )}
                          </span>
                        </div>
                        <div className="text-white/80 text-xs mt-0.5">Notes</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Button - Compact */}
                  <div className="relative z-10 mt-3">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleClassClick(classData)
                      }}
                      className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-lg py-2 px-3 text-white text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1 group-hover:bg-white/30"
                    >
                      <span>Explore Class</span>
                      <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                  
                  {/* Bottom Glow Effect */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && currentView === 'subjects' && selectedClass && (
          <div className="space-y-3 sm:space-y-4">
            {/* Search Results Info */}
            {searchTerm && (
              <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-3">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-white/80" />
                  <span className="text-sm text-white/80">
                    {getFilteredData().length > 0 
                      ? `Found ${getFilteredData().length} subject${getFilteredData().length === 1 ? '' : 's'} matching "${searchTerm}"`
                      : `No subjects found matching "${searchTerm}"`
                    }
                  </span>
                </div>
              </div>
            )}
            
            {getFilteredData().length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-white/10 backdrop-blur-sm rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center border border-white/20">
                  <Search className="h-10 w-10 text-white/60" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No subjects found</h3>
                <p className="text-white/70">
                  {searchTerm ? 'Try adjusting your search terms' : 'No subjects are available for this class'}
                </p>
              </div>
            ) : (
              (getFilteredData() as Subject[]).map((subject, index) => (
              <div 
                key={subject.id} 
                className="group relative overflow-hidden rounded-xl cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => handleSubjectClick(subject)}
              >
                {/* Beautiful Gradient Glass Background with Subject-Specific Colors */}
                <div className={`relative p-4 backdrop-blur-lg border-2 transition-all duration-300 shadow-lg hover:shadow-2xl ${
                  subject.name.toLowerCase().includes('biology') || subject.name.toLowerCase().includes('bio') 
                    ? 'bg-gradient-to-br from-emerald-400/20 via-green-500/15 to-teal-500/20 border-emerald-400/30 hover:border-emerald-300/50 hover:from-emerald-400/25 hover:to-teal-500/25' :
                  subject.name.toLowerCase().includes('chemistry') || subject.name.toLowerCase().includes('chem')
                    ? 'bg-gradient-to-br from-purple-400/20 via-violet-500/15 to-indigo-500/20 border-purple-400/30 hover:border-purple-300/50 hover:from-purple-400/25 hover:to-indigo-500/25' :
                  subject.name.toLowerCase().includes('physics') || subject.name.toLowerCase().includes('phy')
                    ? 'bg-gradient-to-br from-blue-400/20 via-cyan-500/15 to-sky-500/20 border-blue-400/30 hover:border-blue-300/50 hover:from-blue-400/25 hover:to-sky-500/25' :
                  subject.name.toLowerCase().includes('math') || subject.name.toLowerCase().includes('maths')
                    ? 'bg-gradient-to-br from-orange-400/20 via-amber-500/15 to-yellow-500/20 border-orange-400/30 hover:border-orange-300/50 hover:from-orange-400/25 hover:to-yellow-500/25' :
                  subject.name.toLowerCase().includes('english') || subject.name.toLowerCase().includes('eng')
                    ? 'bg-gradient-to-br from-rose-400/20 via-pink-500/15 to-fuchsia-500/20 border-rose-400/30 hover:border-rose-300/50 hover:from-rose-400/25 hover:to-fuchsia-500/25' :
                  subject.name.toLowerCase().includes('history') || subject.name.toLowerCase().includes('hist')
                    ? 'bg-gradient-to-br from-amber-400/20 via-orange-500/15 to-red-500/20 border-amber-400/30 hover:border-amber-300/50 hover:from-amber-400/25 hover:to-red-500/25' :
                  // Beautiful default gradients for other subjects
                  [
                    'bg-gradient-to-br from-indigo-400/20 via-purple-500/15 to-pink-500/20 border-indigo-400/30 hover:border-indigo-300/50 hover:from-indigo-400/25 hover:to-pink-500/25',
                    'bg-gradient-to-br from-cyan-400/20 via-teal-500/15 to-emerald-500/20 border-cyan-400/30 hover:border-cyan-300/50 hover:from-cyan-400/25 hover:to-emerald-500/25', 
                    'bg-gradient-to-br from-violet-400/20 via-purple-500/15 to-indigo-500/20 border-violet-400/30 hover:border-violet-300/50 hover:from-violet-400/25 hover:to-indigo-500/25',
                    'bg-gradient-to-br from-rose-400/20 via-pink-500/15 to-purple-500/20 border-rose-400/30 hover:border-rose-300/50 hover:from-rose-400/25 hover:to-purple-500/25'
                  ][index % 4]
                }`}>
                  
                  {/* Content Layout */}
                  <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Left Side - Subject Info */}
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2.5 rounded-xl border-2 flex-shrink-0 shadow-lg transition-all duration-300 group-hover:scale-110 ${
                        subject.name.toLowerCase().includes('biology') || subject.name.toLowerCase().includes('bio') 
                          ? 'bg-emerald-400/30 border-emerald-300/50 shadow-emerald-500/20' :
                        subject.name.toLowerCase().includes('chemistry') || subject.name.toLowerCase().includes('chem')
                          ? 'bg-purple-400/30 border-purple-300/50 shadow-purple-500/20' :
                        subject.name.toLowerCase().includes('physics') || subject.name.toLowerCase().includes('phy')
                          ? 'bg-blue-400/30 border-blue-300/50 shadow-blue-500/20' :
                        subject.name.toLowerCase().includes('math') || subject.name.toLowerCase().includes('maths')
                          ? 'bg-orange-400/30 border-orange-300/50 shadow-orange-500/20' :
                        subject.name.toLowerCase().includes('english') || subject.name.toLowerCase().includes('eng')
                          ? 'bg-rose-400/30 border-rose-300/50 shadow-rose-500/20' :
                        subject.name.toLowerCase().includes('history') || subject.name.toLowerCase().includes('hist')
                          ? 'bg-amber-400/30 border-amber-300/50 shadow-amber-500/20' :
                        [
                          'bg-indigo-400/30 border-indigo-300/50 shadow-indigo-500/20',
                          'bg-cyan-400/30 border-cyan-300/50 shadow-cyan-500/20',
                          'bg-violet-400/30 border-violet-300/50 shadow-violet-500/20',
                          'bg-rose-400/30 border-rose-300/50 shadow-rose-500/20'
                        ][index % 4]
                      }`}>
                        <BookOpen className="h-5 w-5 text-white drop-shadow-lg" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-white text-lg mb-1 group-hover:text-white/95 transition-colors drop-shadow-sm">
                          {subject.name}
                        </h4>
                        <p className="text-xs text-white/90 line-clamp-1 drop-shadow-sm">
                          {subject.description || 'Explore engaging content and master key concepts'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Right Side - Stats and Action (Desktop) / Below on Mobile */}
                    <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
                      {/* Stats - Horizontal on all screens */}
                      <div className="flex gap-2 lg:gap-3 justify-center lg:justify-start">
                        {/* Chapters */}
                        <div className="bg-white/20 backdrop-blur-sm border-2 border-white/40 rounded-xl px-3 py-2 text-center min-w-[60px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <BookOpen className="h-3 w-3 text-white drop-shadow-sm" />
                            <span className="text-sm font-bold text-white drop-shadow-sm sm:inline">{subject.chapters.length}</span>
                          </div>
                          <div className="text-xs text-white/90 font-medium hidden sm:block drop-shadow-sm">Chapters</div>
                        </div>
                        
                        {/* Videos */}
                        <div className="bg-white/20 backdrop-blur-sm border-2 border-white/40 rounded-xl px-3 py-2 text-center min-w-[60px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Video className="h-3 w-3 text-white drop-shadow-sm" />
                            <span className="text-sm font-bold text-white drop-shadow-sm sm:inline">
                              {subject.chapters.reduce((total: number, chapter) => 
                                total + chapter.content.filter((c: Content) => c.approved && c.contentType === 'video').length, 0
                              )}
                            </span>
                          </div>
                          <div className="text-xs text-white/90 font-medium hidden sm:block drop-shadow-sm">Videos</div>
                        </div>
                        
                        {/* Notes */}
                        <div className="bg-white/20 backdrop-blur-sm border-2 border-white/40 rounded-xl px-3 py-2 text-center min-w-[60px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <FileText className="h-3 w-3 text-white drop-shadow-sm" />
                            <span className="text-sm font-bold text-white drop-shadow-sm sm:inline">
                              {subject.chapters.reduce((total: number, chapter) => 
                                total + chapter.content.filter((c: Content) => c.approved && (c.contentType === 'pdf' || c.contentType === 'document')).length, 0
                              )}
                            </span>
                          </div>
                          <div className="text-xs text-white/90 font-medium hidden sm:block drop-shadow-sm">Notes</div>
                        </div>
                      </div>
                      
                      {/* Action Button */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSubjectClick(subject)
                        }}
                        className="bg-gradient-to-r from-white/30 to-white/20 hover:from-white/40 hover:to-white/30 backdrop-blur-sm border-2 border-white/50 hover:border-white/70 rounded-xl py-2.5 px-4 text-white font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap min-w-[120px] shadow-lg hover:shadow-xl transform hover:scale-105 hover:-translate-y-0.5"
                      >
                        <span className="drop-shadow-sm">Explore</span>
                        <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-1 drop-shadow-sm" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
            )}
          </div>
        )}

        {!isLoading && currentView === 'chapters' && selectedSubject && (
          <div className="space-y-3 sm:space-y-4">
            {/* Search Results Info */}
            {searchTerm && (
              <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-3">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-white/80" />
                  <span className="text-sm text-white/80">
                    {getFilteredData().length > 0 
                      ? `Found ${getFilteredData().length} chapter${getFilteredData().length === 1 ? '' : 's'} matching "${searchTerm}"`
                      : `No chapters found matching "${searchTerm}"`
                    }
                  </span>
                </div>
              </div>
            )}
            
            {getFilteredData().length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-white/10 backdrop-blur-sm rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center border border-white/20">
                  <Search className="h-10 w-10 text-white/60" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No chapters found</h3>
                <p className="text-white/70">
                  {searchTerm ? 'Try adjusting your search terms' : 'No chapters are available for this subject'}
                </p>
              </div>
            ) : (
              (getFilteredData() as Chapter[]).map((chapter, index) => (
              <div 
                key={chapter.id} 
                className="group relative overflow-hidden rounded-xl cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => handleChapterClick(chapter)}
              >
                {/* Beautiful Gradient Glass Background with Dynamic Colors */}
                <div className={`relative p-4 backdrop-blur-lg border-2 transition-all duration-300 shadow-lg hover:shadow-2xl ${[
                  'bg-gradient-to-br from-emerald-400/20 via-teal-500/15 to-cyan-500/20 border-emerald-400/30 hover:border-emerald-300/50 hover:from-emerald-400/25 hover:to-cyan-500/25',
                  'bg-gradient-to-br from-blue-400/20 via-indigo-500/15 to-violet-500/20 border-blue-400/30 hover:border-blue-300/50 hover:from-blue-400/25 hover:to-violet-500/25', 
                  'bg-gradient-to-br from-orange-400/20 via-red-500/15 to-pink-500/20 border-orange-400/30 hover:border-orange-300/50 hover:from-orange-400/25 hover:to-pink-500/25',
                  'bg-gradient-to-br from-violet-400/20 via-purple-500/15 to-fuchsia-500/20 border-violet-400/30 hover:border-violet-300/50 hover:from-violet-400/25 hover:to-fuchsia-500/25',
                  'bg-gradient-to-br from-green-400/20 via-emerald-500/15 to-teal-500/20 border-green-400/30 hover:border-green-300/50 hover:from-green-400/25 hover:to-teal-500/25',
                  'bg-gradient-to-br from-rose-400/20 via-pink-500/15 to-purple-500/20 border-rose-400/30 hover:border-rose-300/50 hover:from-rose-400/25 hover:to-purple-500/25'
                ][index % 6]}`}>
                  
                  {/* Content Layout */}
                  <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Left Side - Chapter Info */}
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2.5 rounded-xl border-2 flex-shrink-0 shadow-lg transition-all duration-300 group-hover:scale-110 ${[
                        'bg-emerald-400/30 border-emerald-300/50 shadow-emerald-500/20',
                        'bg-blue-400/30 border-blue-300/50 shadow-blue-500/20',
                        'bg-orange-400/30 border-orange-300/50 shadow-orange-500/20',
                        'bg-violet-400/30 border-violet-300/50 shadow-violet-500/20',
                        'bg-green-400/30 border-green-300/50 shadow-green-500/20',
                        'bg-rose-400/30 border-rose-300/50 shadow-rose-500/20'
                      ][index % 6]}`}>
                        <BookOpen className="h-5 w-5 text-white drop-shadow-lg" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-white text-lg mb-1 group-hover:text-white/95 transition-colors drop-shadow-sm">
                          {chapter.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          <div className="px-2.5 py-1 bg-white/25 backdrop-blur-sm rounded-lg border border-white/40 shadow-sm">
                            <span className="text-xs font-bold text-white drop-shadow-sm">
                              Chapter {index + 1}
                            </span>
                          </div>
                          <span className="text-xs text-white/90 font-medium drop-shadow-sm">
                            {chapter.content.filter((c: Content) => c.approved).length} items
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right Side - Stats and Action (Desktop) / Below on Mobile */}
                    <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
                      {/* Stats - Horizontal on all screens */}
                      <div className="flex gap-2 lg:gap-3 justify-center lg:justify-start">
                        {/* Videos */}
                        <div className="bg-white/20 backdrop-blur-sm border-2 border-white/40 rounded-xl px-3 py-2 text-center min-w-[60px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Video className="h-3 w-3 text-white drop-shadow-sm" />
                            <span className="text-sm font-bold text-white drop-shadow-sm sm:inline">
                              {chapter.content.filter((c: Content) => c.approved && c.contentType === 'video').length}
                            </span>
                          </div>
                          <div className="text-xs text-white/90 font-medium hidden sm:block drop-shadow-sm">Videos</div>
                        </div>
                        
                        {/* Notes */}
                        <div className="bg-white/20 backdrop-blur-sm border-2 border-white/40 rounded-xl px-3 py-2 text-center min-w-[60px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <FileText className="h-3 w-3 text-white drop-shadow-sm" />
                            <span className="text-sm font-bold text-white drop-shadow-sm sm:inline">
                              {chapter.content.filter((c: Content) => c.approved && (c.contentType === 'pdf' || c.contentType === 'document')).length}
                            </span>
                          </div>
                          <div className="text-xs text-white/90 font-medium hidden sm:block drop-shadow-sm">Notes</div>
                        </div>
                      </div>
                      
                      {/* Action Button */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleChapterClick(chapter)
                        }}
                        className="bg-gradient-to-r from-white/30 to-white/20 hover:from-white/40 hover:to-white/30 backdrop-blur-sm border-2 border-white/50 hover:border-white/70 rounded-xl py-2.5 px-4 text-white font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap min-w-[120px] shadow-lg hover:shadow-xl transform hover:scale-105 hover:-translate-y-0.5"
                      >
                        <span className="drop-shadow-sm">Explore</span>
                        <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-1 drop-shadow-sm" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4 sm:space-y-6">
            {/* Loading Cards - Match actual class card design */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="group relative overflow-hidden rounded-xl animate-pulse">
                  {/* Gradient skeleton background */}
                  <div className={`h-full p-3 sm:p-4 relative ${
                    i === 1 ? 'bg-gradient-to-br from-blue-500/20 via-blue-600/20 to-cyan-700/20' :
                    i === 2 ? 'bg-gradient-to-br from-purple-500/20 via-purple-600/20 to-pink-700/20' :
                    i === 3 ? 'bg-gradient-to-br from-green-500/20 via-emerald-600/20 to-teal-700/20' :
                    'bg-gradient-to-br from-orange-500/20 via-red-500/20 to-pink-600/20'
                  }`}>
                    
                    {/* Decorative Elements Skeleton */}
                    <div className="absolute top-0 right-0 w-16 h-16 opacity-5">
                      <div className="absolute top-1 right-1 w-6 h-6 bg-white/30 rounded-full"></div>
                      <div className="absolute top-2 right-2 w-4 h-4 bg-white/30 rounded-full"></div>
                      <div className="absolute top-3 right-3 w-2 h-2 bg-white/30 rounded-full"></div>
                    </div>
                    
                    {/* Header skeleton */}
                    <div className="relative z-10 mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg w-8 h-8"></div>
                        <div className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                          <div className="w-12 h-3 bg-white/30 rounded"></div>
                        </div>
                      </div>
                      
                      <div className="w-16 h-5 bg-white/30 rounded mb-1"></div>
                      <div className="w-32 h-3 bg-white/20 rounded"></div>
                    </div>
                    
                    {/* Stats skeleton */}
                    <div className="relative z-10 space-y-2">
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="w-6 h-6 bg-white/30 rounded mb-1"></div>
                            <div className="w-12 h-3 bg-white/20 rounded"></div>
                          </div>
                          <div className="p-1 bg-white/20 rounded w-5 h-5"></div>
                        </div>
                      </div>
                      
                      {/* Quick Stats skeleton */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="bg-white/10 backdrop-blur-sm rounded p-1.5 border border-white/20">
                          <div className="flex items-center gap-1 mb-1">
                            <div className="w-3 h-3 bg-white/30 rounded"></div>
                            <div className="w-4 h-3 bg-white/30 rounded"></div>
                          </div>
                          <div className="w-8 h-2 bg-white/20 rounded"></div>
                        </div>
                        
                        <div className="bg-white/10 backdrop-blur-sm rounded p-1.5 border border-white/20">
                          <div className="flex items-center gap-1 mb-1">
                            <div className="w-3 h-3 bg-white/30 rounded"></div>
                            <div className="w-4 h-3 bg-white/30 rounded"></div>
                          </div>
                          <div className="w-8 h-2 bg-white/20 rounded"></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Button skeleton */}
                    <div className="relative z-10 mt-3">
                      <div className="w-full bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg py-2 px-3 flex items-center justify-center gap-1">
                        <div className="w-20 h-3 bg-white/30 rounded"></div>
                        <div className="w-3 h-3 bg-white/30 rounded"></div>
                      </div>
                    </div>
                    
                    {/* Bottom Glow skeleton */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Loading Text */}
            <div className="text-center py-6 sm:py-8">
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-400"></div>
                <div className="text-base sm:text-lg font-medium text-white">Loading your classes...</div>
              </div>
              <p className="text-white/70 text-xs sm:text-sm">Please wait while we fetch your learning materials</p>
            </div>
          </div>
        )}

        {/* Empty State - Only show when not loading and on classes view */}
        {!isLoading && currentView === 'classes' && classes.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center border border-white/20">
              <Search className="h-10 w-10 text-white/60" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No classes available</h3>
            <p className="text-white/70">
              No classes are currently available for your account
            </p>
          </div>
        )}

        {!isLoading && currentView === 'content' && selectedChapter && (
          <div className="space-y-6">
            {/* Content Filter Buttons */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl p-3 sm:p-4">
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                <button
                  onClick={() => setContentFilter('all')}
                  className={`flex-1 sm:flex-none sm:w-auto flex items-center justify-center gap-1 sm:gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg font-medium text-xs transition-all duration-300 ${
                    contentFilter === 'all'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg transform scale-105 border border-white/30'
                      : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white border border-white/20 hover:border-white/40'
                  }`}
                >
                  <div className={`p-1 rounded ${contentFilter === 'all' ? 'bg-white/20' : 'bg-white/10'}`}>
                    <BookOpen className="h-3 w-3" />
                  </div>
                  <span className="hidden sm:inline">All Content</span>
                  <span className="sm:hidden">All</span>
                  <div className={`px-1 sm:px-1.5 py-0.5 rounded-full text-xs font-medium ${
                    contentFilter === 'all' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70'
                  }`}>
                    {selectedChapter.content.filter(c => c.approved).length}
                  </div>
                </button>
                
                <button
                  onClick={() => setContentFilter('video')}
                  className={`flex-1 sm:flex-none sm:w-auto flex items-center justify-center gap-1 sm:gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg font-medium text-xs transition-all duration-300 ${
                    contentFilter === 'video'
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg transform scale-105 border border-white/30'
                      : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white border border-white/20 hover:border-white/40'
                  }`}
                >
                  <div className={`p-1 rounded ${contentFilter === 'video' ? 'bg-white/20' : 'bg-blue-500/20'}`}>
                    <Video className="h-3 w-3" />
                  </div>
                  <span className="hidden sm:inline">Videos</span>
                  {(() => {
                    const videoCount = selectedChapter.content.filter(c => c.approved && c.contentType === 'video').length
                    return (
                      <div className={`px-1 sm:px-1.5 py-0.5 rounded-full text-xs font-medium ${
                        contentFilter === 'video' ? 'bg-white/20 text-white' : 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                      }`}>
                        {videoCount}
                      </div>
                    )
                  })()}
                </button>
                
                <button
                  onClick={() => setContentFilter('notes')}
                  className={`flex-1 sm:flex-none sm:w-auto flex items-center justify-center gap-1 sm:gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg font-medium text-xs transition-all duration-300 ${
                    contentFilter === 'notes'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg transform scale-105 border border-white/30'
                      : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white border border-white/20 hover:border-white/40'
                  }`}
                >
                  <div className={`p-1 rounded ${contentFilter === 'notes' ? 'bg-white/20' : 'bg-green-500/20'}`}>
                    <FileText className="h-3 w-3" />
                  </div>
                  <span className="hidden sm:inline">Notes</span>
                  {(() => {
                    const notesCount = selectedChapter.content.filter(c => c.approved && (c.contentType === 'pdf' || c.contentType === 'document')).length
                    return (
                      <div className={`px-1 sm:px-1.5 py-0.5 rounded-full text-xs font-medium ${
                        contentFilter === 'notes' ? 'bg-white/20 text-white' : 'bg-green-500/20 text-green-300 border border-green-400/30'
                      }`}>
                        {notesCount}
                      </div>
                    )
                  })()}
                </button>
              </div>
            </div>

            {(() => {
              // Get filtered content based on search term
              const searchFilteredContent = getFilteredData() as Content[]
              // Then filter by approval status
              const approvedContent = searchFilteredContent.filter(content => content.approved)
              
              let filteredContent = approvedContent
              
              if (contentFilter === 'video') {
                filteredContent = approvedContent.filter(content => content.contentType === 'video')
              } else if (contentFilter === 'notes') {
                filteredContent = approvedContent.filter(content => content.contentType === 'pdf' || content.contentType === 'document')
              }
              
              const videoContent = filteredContent.filter(content => content.contentType === 'video')
              const notesContent = filteredContent.filter(content => content.contentType === 'pdf' || content.contentType === 'document')
              
              // Show search results info if there's a search term
              const hasSearchResults = searchTerm && searchFilteredContent.length > 0
              const noSearchResults = searchTerm && searchFilteredContent.length === 0
              
              return (
                <div className="space-y-4">
                  {/* Search Results Info */}
                  {searchTerm && (
                    <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-3">
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-white/80" />
                        <span className="text-sm text-white/80">
                          {hasSearchResults 
                            ? `Found ${searchFilteredContent.length} result${searchFilteredContent.length === 1 ? '' : 's'} for "${searchTerm}"`
                            : `No results found for "${searchTerm}"`
                          }
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* No Results State - Only for search results */}
                  {noSearchResults && (
                    <div className="text-center py-12">
                      <div className="bg-white/10 backdrop-blur-sm rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center border border-white/20">
                        <Search className="h-10 w-10 text-white/60" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">No content found</h3>
                      <p className="text-white/70">
                        Try adjusting your search terms or browse all content
                      </p>
                    </div>
                  )}
                  {/* Videos Section */}
                  {(contentFilter === 'all' || contentFilter === 'video') && videoContent.length > 0 && (
                    <div className="space-y-2 bg-gradient-to-br from-blue-500/15 via-cyan-500/10 to-blue-500/15 backdrop-blur-lg rounded-2xl p-3 sm:p-4 border border-blue-400/20 shadow-xl">
                      <div className="flex items-center gap-2 px-1 mb-3">
                        <div className="p-1.5 bg-blue-500/30 backdrop-blur-sm rounded-lg border border-blue-400/40">
                          <Video className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white text-sm">Video Lessons</h3>
                          <p className="text-xs text-blue-200">{videoContent.length} videos to watch</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {videoContent.map((content, index) => (
                          <div 
                            key={content.id} 
                            className="group relative overflow-hidden bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-3 hover:border-blue-400/50 hover:shadow-lg hover:bg-white/15 transition-all duration-300 transform hover:scale-[1.02]"
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            {/* Video thumbnail overlay effect */}
                            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400"></div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0 pr-3">
                                <div className="flex items-start gap-2">
                                  <div className="p-1.5 bg-blue-500/20 rounded-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                                    <Play className="h-3 w-3 text-blue-300" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-white text-xs sm:text-sm leading-tight mb-1 group-hover:text-blue-200 transition-colors">
                                      {content.title}
                                    </h4>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <div className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                                        <span className="text-xs text-white/80 font-medium">
                                          {content.teacher.firstName} {content.teacher.lastName}
                                        </span>
                                      </div>
                                      {content.duration && (
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/20 rounded-full">
                                          <Clock className="h-2.5 w-2.5 text-blue-300" />
                                          <span className="text-xs text-blue-200 font-medium">
                                            {Math.floor(content.duration / 60)}m {content.duration % 60}s
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <button 
                                onClick={() => handleContentAction(content, 'view')}
                                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-medium rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                              >
                                <Play className="h-3 w-3" />
                                <span className="hidden sm:inline">Watch</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes Section */}
                  {(contentFilter === 'all' || contentFilter === 'notes') && notesContent.length > 0 && (
                    <div className="space-y-2 bg-gradient-to-br from-green-500/15 via-emerald-500/10 to-green-500/15 backdrop-blur-lg rounded-2xl p-3 sm:p-4 border border-green-400/20 shadow-xl">
                      <div className="flex items-center gap-2 px-1 mb-3">
                        <div className="p-1.5 bg-green-500/30 backdrop-blur-sm rounded-lg border border-green-400/40">
                          <FileText className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-white">Study Materials</h3>
                          <p className="text-xs text-green-200">{notesContent.length} documents to study</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {notesContent.map((content, index) => (
                          <div 
                            key={content.id} 
                            className="group relative overflow-hidden bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-3 hover:border-green-400/50 hover:shadow-lg hover:bg-white/15 transition-all duration-300 transform hover:scale-[1.02]"
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            {/* Document type indicator */}
                            <div className={`absolute top-0 left-0 w-full h-0.5 ${
                              content.contentType === 'pdf' 
                                ? 'bg-gradient-to-r from-red-400 via-red-500 to-red-400'
                                : 'bg-gradient-to-r from-green-400 via-emerald-400 to-green-400'
                            }`}></div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0 pr-3">
                                <div className="flex items-start gap-2">
                                  <div className={`p-1.5 rounded-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-300 ${
                                    content.contentType === 'pdf' 
                                      ? 'bg-red-500/20' 
                                      : 'bg-green-500/20'
                                  }`}>
                                    <FileText className={`h-3 w-3 ${
                                      content.contentType === 'pdf' ? 'text-red-300' : 'text-green-300'
                                    }`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-white text-xs sm:text-sm leading-tight mb-1 group-hover:text-green-200 transition-colors">
                                      {content.title}
                                    </h4>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <div className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                                        <span className="text-xs text-white/80 font-medium">
                                          {content.teacher.firstName} {content.teacher.lastName}
                                        </span>
                                      </div>
                                      {/* Show file size on desktop, file type on mobile */}
                                      {content.fileSize && (
                                        <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 bg-green-500/20 rounded-full">
                                          <div className={`w-1.5 h-1.5 rounded-full ${
                                            content.contentType === 'pdf' ? 'bg-red-400' : 'bg-green-400'
                                          }`}></div>
                                          <span className="text-xs text-green-200 font-medium">
                                            {(content.fileSize / (1024 * 1024)).toFixed(1)} MB
                                          </span>
                                        </div>
                                      )}
                                      <div className="px-1.5 py-0.5 bg-white/10 rounded-full">
                                        <span className="text-xs text-white/70 font-medium uppercase">
                                          {content.contentType === 'pdf' ? 'PDF' : content.contentType === 'document' ? 'DOC' : content.contentType}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => handleContentAction(content, 'view')}
                                  className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-300 hover:scale-110"
                                >
                                  <Eye className="h-3 w-3" />
                                </button>
                                <button 
                                  onClick={() => handleContentAction(content, 'download')}
                                  className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs font-medium rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                                >
                                  <Download className="h-3 w-3" />
                                  <span className="hidden sm:inline">Get</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty State */}
                  {((contentFilter === 'video' && videoContent.length === 0) ||
                    (contentFilter === 'notes' && notesContent.length === 0)) && (
                    <div className="text-center py-8 px-6">
                      <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3 border border-white/20">
                        {contentFilter === 'video' ? (
                          <Video className="h-6 w-6 text-white/60" />
                        ) : (
                          <FileText className="h-6 w-6 text-white/60" />
                        )}
                      </div>
                      <h3 className="text-sm font-medium text-white mb-1">
                        {contentFilter === 'video' ? 'No videos available' : 'No notes available'}
                      </h3>
                      <p className="text-xs text-white/70">
                        Content will appear here once uploaded by teachers
                      </p>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}
      </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-red-500" />
              Confirm Logout
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Are you sure you want to logout? You will need to sign in again to access your dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel 
              onClick={cancelLogout}
              className="flex-1"
            >
              Stay Logged In
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmLogout}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              Yes, Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Video Player */}
      {showVideoPlayer && currentVideo && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <YouTubePlayer
            videoId={currentVideo.youtubeVideoId || ''}
            title={currentVideo.title}
            thumbnail={currentVideo.thumbnailUrl}
            autoplay={true}
            controls={true}
            modestBranding={false}
            className="w-full max-w-6xl h-full"
            onVideoEnd={() => {
              // Auto-close video player when video ends
              setShowVideoPlayer(false);
              setCurrentVideo(null);
            }}
          />
          <button
            onClick={handleVideoClose}
            className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 z-10"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      )}
      </div>
    </div>
  )
}

// Export wrapped with ErrorBoundary for production robustness
export default function StudentDashboardPage() {
  return (
    <ErrorBoundary>
      <StudentDashboard />
    </ErrorBoundary>
  )
}
