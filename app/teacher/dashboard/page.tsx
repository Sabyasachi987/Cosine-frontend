"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Plus, Video, FileText, BookOpen, Users, LogOut, Edit, Trash2, CheckCircle, Clock, ChevronRight, Eye, EyeOff, Download, Upload, AlertTriangle, RefreshCw, Wifi, WifiOff } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import ErrorBoundary from "@/components/ErrorBoundary"

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("teacherAccessToken")
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }
}

interface Subject {
  id: number
  name: string
  classLevel: number
  description?: string
  isVisible?: boolean
  chapters?: Chapter[]
}

interface Chapter {
  id: number
  title: string
  description?: string
  subjectId: number
  orderIndex: number
  status?: "not-started" | "in-progress" | "completed"
  isVisible?: boolean
  subject?: Subject
  content?: Content[]
}

interface Content {
  id: number
  title: string
  contentType: string
  chapterId: number
  chapter?: Chapter
  approved: boolean
  isVisible?: boolean
  fileUrl?: string
  teacher?: {
    firstName: string
    lastName: string
  }
  duration?: string
  fileSize?: string
}

function TeacherDashboard() {
  const [user, setUser] = useState<any>(null)
  const [selectedClass, setSelectedClass] = useState<string>("")
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null)
  const [view, setView] = useState<"classes" | "subjects" | "chapters" | "content">("classes")
  const [showAddSubject, setShowAddSubject] = useState(false)
  const [showAddChapter, setShowAddChapter] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState("")
  const [newSubjectDescription, setNewSubjectDescription] = useState("")
  const [newChapterName, setNewChapterName] = useState("")
  const [newChapterDescription, setNewChapterDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [contentFilter, setContentFilter] = useState<'all' | 'video' | 'notes'>('all')
  
  // Enhanced error handling states
  const [error, setError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [retryCount, setRetryCount] = useState(0)
  const [connectionError, setConnectionError] = useState(false)
  const maxRetryAttempts = 3
  
  // Real data from backend
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [contents, setContents] = useState<Content[]>([])
  
  const router = useRouter()
  const { toast } = useToast()

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setConnectionError(false)
      setError(null)
      // Retry failed operations when connection is restored
      if (retryCount < maxRetryAttempts && selectedClass) {
        fetchSubjects(selectedClass)
      }
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      setConnectionError(true)
      setError('You are offline. Please check your internet connection.')
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [retryCount, selectedClass])

  // Enhanced error handling with retry logic
  const handleApiError = useCallback((error: any, operation: string) => {
    let errorMessage = `Failed to ${operation}`
    
    if (error.message?.includes('timed out')) {
      errorMessage = `Request timed out while trying to ${operation}. Please check your connection and try again.`
    } else if (error.message?.includes('Network error') || error.message?.includes('Failed to fetch')) {
      errorMessage = `Network error while trying to ${operation}. Please check your internet connection.`
      setConnectionError(true)
    } else if (error.message?.includes('Authentication expired')) {
      errorMessage = 'Your session has expired. Please log in again.'
      setTimeout(() => {
        localStorage.clear()
        router.push('/auth/login')
      }, 2000)
    } else if (error.message?.includes('Access denied')) {
      errorMessage = `You don't have permission to ${operation}. Please contact support.`
    } else if (error.message?.includes('not found')) {
      errorMessage = `The requested content was not found. It may have been removed.`
    } else if (error.message?.includes('Server error')) {
      errorMessage = `Server error while trying to ${operation}. Please try again later.`
    } else if (error.message) {
      errorMessage = error.message
    }
    
    setError(errorMessage)
    setLoading(false)
    
    toast({
      title: "Error",
      description: errorMessage,
      variant: "destructive",
      duration: 5000,
    })
  }, [router, toast])

  // Retry mechanism with exponential backoff
  const retryOperation = useCallback(async (operation: () => Promise<any>, operationName: string, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        setRetryCount(attempt - 1)
        const result = await operation()
        setRetryCount(0)
        setError(null)
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

  // Enhanced API call function
  const makeApiCall = useCallback(async (endpoint: string, options: RequestInit = {}, timeout: number = 30000) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    try {
      const token = localStorage.getItem("teacherAccessToken")
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      
      const response = await fetch(`${apiUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
      })
      
      clearTimeout(timeoutId)
      
      if (response.status === 401) {
        localStorage.clear()
        router.push('/auth/login')
        throw new Error('Authentication expired. Please login again.')
      }
      
      if (response.status === 403) {
        throw new Error('Access denied. You do not have permission to perform this action.')
      }
      
      if (response.status === 404) {
        throw new Error('Content not found. It may have been removed.')
      }
      
      if (response.status >= 500) {
        throw new Error('Server error. Please try again later.')
      }
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.statusText}`)
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
  }, [router])

  // Enhanced API Functions with comprehensive error handling
  const fetchSubjects = async (classLevel: string) => {
    try {
      setLoading(true)
      setError(null)
      
      await retryOperation(async () => {
        const data = await makeApiCall(`/api/teachers/subjects/${classLevel}`)
        if (data.success) {
          setSubjects(data.data)
        } else {
          throw new Error(data.message || 'Failed to fetch subjects')
        }
      }, 'load subjects')
      
    } catch (error: any) {
      console.error('Error fetching subjects:', error)
      if (!error.message?.includes('Authentication expired')) {
        handleApiError(error, 'load subjects')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchChapters = async (subjectId: number) => {
    try {
      setLoading(true)
      setError(null)
      
      await retryOperation(async () => {
        const data = await makeApiCall(`/api/teachers/chapters/${subjectId}`)
        if (data.success) {
          setChapters(data.data)
        } else {
          throw new Error(data.message || 'Failed to fetch chapters')
        }
      }, 'load chapters')
      
    } catch (error: any) {
      console.error('Error fetching chapters:', error)
      if (!error.message?.includes('Authentication expired')) {
        handleApiError(error, 'load chapters')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchContents = async (chapterId: number) => {
    try {
      setLoading(true)
      setError(null)
      
      await retryOperation(async () => {
        const data = await makeApiCall(`/api/teachers/content/${chapterId}`)
        if (data.success) {
          setContents(data.data)
        } else {
          throw new Error(data.message || 'Failed to fetch content')
        }
      }, 'load content')
      
    } catch (error: any) {
      console.error('Error fetching content:', error)
      if (!error.message?.includes('Authentication expired')) {
        handleApiError(error, 'load content')
      }
    } finally {
      setLoading(false)
    }
  }

  const createSubject = async (name: string, classLevel: string, description: string = '') => {
    try {
      setLoading(true)
      setError(null)
      
      await retryOperation(async () => {
        const data = await makeApiCall('/api/teachers/subjects', {
          method: 'POST',
          body: JSON.stringify({
            name,
            classLevel,
            description
          })
        })
        
        if (data.success) {
          toast({
            title: "Success",
            description: "Subject created successfully!",
            variant: "default",
            duration: 3000,
          })
          await fetchSubjects(classLevel)
          setNewSubjectName("")
          setNewSubjectDescription("")
          setShowAddSubject(false)
          return true
        } else {
          throw new Error(data.message || 'Failed to create subject')
        }
      }, 'create subject')
      
      return true
    } catch (error: any) {
      console.error('Error creating subject:', error)
      if (!error.message?.includes('Authentication expired')) {
        handleApiError(error, 'create subject')
      }
      return false
    } finally {
      setLoading(false)
    }
  }

  const createChapter = async (name: string, subjectId: number, description: string = '') => {
    try {
      setLoading(true)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const response = await fetch(`${apiUrl}/api/teachers/chapters`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name,
          subjectId,
          description
        })
      })
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "✓ Chapter Created",
          description: `${name} has been added successfully`,
          duration: 3000,
          className: "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/50 dark:text-green-100"
        })
        await fetchChapters(subjectId) // Refresh chapters
        return true
      } else {
        toast({
          title: "Failed to Create Chapter",
          description: data.message || "Please try again",
          variant: "destructive",
          duration: 4000,
          className: "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/50 dark:text-red-100"
        })
        return false
      }
    } catch (error) {
      console.error('Error creating chapter:', error)
      toast({
        title: "Error",
        description: "Unable to create chapter. Please try again.",
        variant: "destructive",
        duration: 4000,
        className: "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/50 dark:text-red-100"
      })
      return false
    } finally {
      setLoading(false)
    }
  }

  const updateChapterStatus = async (chapterId: number, newStatus: "not-started" | "in-progress" | "completed") => {
    try {
      // Update local state immediately for better UX
      setChapters(prevChapters => 
        prevChapters.map(chapter => 
          chapter.id === chapterId 
            ? { ...chapter, status: newStatus }
            : chapter
        )
      )

      // TODO: Add API call to update status in backend
      // const response = await fetch(`http://localhost:5000/api/teachers/chapters/${chapterId}/status`, {
      //   method: 'PATCH',
      //   headers: getAuthHeaders(),
      //   body: JSON.stringify({ status: newStatus })
      // })
      
      toast({
        title: "✓ Status Updated",
        description: `Chapter marked as ${newStatus.replace('-', ' ')}`,
        duration: 2000,
        className: "border-green-200 bg-green-50 text-green-800"
      })
    } catch (error) {
      console.error('Error updating chapter status:', error)
      toast({
        title: "Error",
        description: "Failed to update chapter status",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  // Visibility toggle functions
  const toggleSubjectVisibility = async (subjectId: number) => {
    try {
      // Update local state immediately for better UX
      setSubjects(prevSubjects => 
        prevSubjects.map(subject => 
          subject.id === subjectId 
            ? { ...subject, isVisible: subject.isVisible === false ? true : false }
            : subject
        )
      )

      const subject = subjects.find(s => s.id === subjectId)
      const newVisibility = subject?.isVisible === false ? true : false

      // API call to update visibility in backend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const response = await fetch(`${apiUrl}/api/teachers/subjects/${subjectId}/visibility`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isVisible: newVisibility })
      })

      const data = await response.json()
      
      if (!data.success) {
        // Revert local state if API call failed
        setSubjects(prevSubjects => 
          prevSubjects.map(subj => 
            subj.id === subjectId 
              ? { ...subj, isVisible: subject?.isVisible }
              : subj
          )
        )
        
        toast({
          title: "Error",
          description: data.message || "Failed to update subject visibility",
          variant: "destructive",
          duration: 3000,
        })
        return
      }
      
      toast({
        title: newVisibility ? "✓ Subject Visible" : "✓ Subject Hidden",
        description: `Subject is now ${newVisibility ? 'visible to' : 'hidden from'} students`,
        duration: 2000,
        className: newVisibility ? "border-green-200 bg-green-50 text-green-800" : "border-orange-200 bg-orange-50 text-orange-800"
      })
    } catch (error) {
      console.error('Error updating subject visibility:', error)
      
      // Revert local state on error
      const subject = subjects.find(s => s.id === subjectId)
      setSubjects(prevSubjects => 
        prevSubjects.map(subj => 
          subj.id === subjectId 
            ? { ...subj, isVisible: subject?.isVisible }
            : subj
        )
      )
      
      toast({
        title: "Error",
        description: "Failed to update subject visibility",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  const toggleChapterVisibility = async (chapterId: number) => {
    try {
      // Update local state immediately for better UX
      setChapters(prevChapters => 
        prevChapters.map(chapter => 
          chapter.id === chapterId 
            ? { ...chapter, isVisible: chapter.isVisible === false ? true : false }
            : chapter
        )
      )

      const chapter = chapters.find(c => c.id === chapterId)
      const newVisibility = chapter?.isVisible === false ? true : false

      // API call to update visibility in backend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const response = await fetch(`${apiUrl}/api/teachers/chapters/${chapterId}/visibility`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isVisible: newVisibility })
      })

      const data = await response.json()
      
      if (!data.success) {
        // Revert local state if API call failed
        setChapters(prevChapters => 
          prevChapters.map(chap => 
            chap.id === chapterId 
              ? { ...chap, isVisible: chapter?.isVisible }
              : chap
          )
        )
        
        toast({
          title: "Error",
          description: data.message || "Failed to update chapter visibility",
          variant: "destructive",
          duration: 3000,
        })
        return
      }
      
      toast({
        title: newVisibility ? "✓ Chapter Visible" : "✓ Chapter Hidden",
        description: `Chapter is now ${newVisibility ? 'visible to' : 'hidden from'} students`,
        duration: 2000,
        className: newVisibility ? "border-green-200 bg-green-50 text-green-800" : "border-orange-200 bg-orange-50 text-orange-800"
      })
    } catch (error) {
      console.error('Error updating chapter visibility:', error)
      
      // Revert local state on error
      const chapter = chapters.find(c => c.id === chapterId)
      setChapters(prevChapters => 
        prevChapters.map(chap => 
          chap.id === chapterId 
            ? { ...chap, isVisible: chapter?.isVisible }
            : chap
        )
      )
      
      toast({
        title: "Error",
        description: "Failed to update chapter visibility",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  const toggleContentVisibility = async (contentId: number) => {
    try {
      // Get current content state before updating
      const currentContent = selectedChapter?.content?.find(c => c.id === contentId)
      
      // Update local state immediately for better UX
      if (selectedChapter?.content) {
        const updatedContent = selectedChapter.content.map(content => 
          content.id === contentId 
            ? { ...content, isVisible: content.isVisible === false ? true : false }
            : content
        )
        
        setSelectedChapter(prev => prev ? { ...prev, content: updatedContent } : null)
        
        // Also update in chapters state
        setChapters(prevChapters => 
          prevChapters.map(chapter => 
            chapter.id === selectedChapter.id 
              ? { ...chapter, content: updatedContent }
              : chapter
          )
        )
      }

      const content = selectedChapter?.content?.find(c => c.id === contentId)
      const newVisibility = content?.isVisible === false ? true : false

      // API call to update visibility in backend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const response = await fetch(`${apiUrl}/api/teachers/content/${contentId}/visibility`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isVisible: newVisibility })
      })

      const data = await response.json()
      
      if (!data.success) {
        // Revert local state if API call failed
        if (selectedChapter?.content && currentContent) {
          const revertedContent = selectedChapter.content.map(content => 
            content.id === contentId 
              ? { ...content, isVisible: currentContent.isVisible }
              : content
          )
          
          setSelectedChapter(prev => prev ? { ...prev, content: revertedContent } : null)
          
          setChapters(prevChapters => 
            prevChapters.map(chapter => 
              chapter.id === selectedChapter.id 
                ? { ...chapter, content: revertedContent }
                : chapter
            )
          )
        }
        
        toast({
          title: "Error",
          description: data.message || "Failed to update content visibility",
          variant: "destructive",
          duration: 3000,
        })
        return
      }
      
      toast({
        title: newVisibility ? "✓ Content Visible" : "✓ Content Hidden",
        description: `Content is now ${newVisibility ? 'visible to' : 'hidden from'} students`,
        duration: 2000,
        className: newVisibility ? "border-green-200 bg-green-50 text-green-800" : "border-orange-200 bg-orange-50 text-orange-800"
      })
    } catch (error) {
      console.error('Error updating content visibility:', error)
      
      // Revert local state on error
      const currentContent = selectedChapter?.content?.find(c => c.id === contentId)
      if (selectedChapter?.content && currentContent) {
        const revertedContent = selectedChapter.content.map(content => 
          content.id === contentId 
            ? { ...content, isVisible: currentContent.isVisible }
            : content
        )
        
        setSelectedChapter(prev => prev ? { ...prev, content: revertedContent } : null)
        
        setChapters(prevChapters => 
          prevChapters.map(chapter => 
            chapter.id === selectedChapter.id 
              ? { ...chapter, content: revertedContent }
              : chapter
          )
        )
      }
      
      toast({
        title: "Error",
        description: "Failed to update content visibility",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  const handleContentAction = async (content: Content, action: 'view' | 'download') => {
    try {
      if (!content.fileUrl) {
        toast({
          title: "File Not Found",
          description: `No file URL available for "${content.title}".`,
          variant: "destructive",
          duration: 3000,
        })
        return
      }

      // Check if the URL is already a full Cloudinary URL or a local path
      const isCloudinaryUrl = content.fileUrl.startsWith('https://res.cloudinary.com') || content.fileUrl.startsWith('http')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const fullUrl = isCloudinaryUrl 
        ? content.fileUrl 
        : `${apiUrl}${content.fileUrl.startsWith('/') ? content.fileUrl : '/' + content.fileUrl}`
      
      if (action === 'view') {
        if (isCloudinaryUrl) {
          // For PDFs and documents, create a custom viewer with header
          if (content.contentType === 'pdf' || content.contentType === 'document') {
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
                  </style>
                </head>
                <body>
                  <div class="header">${content.title}</div>
                  <iframe class="viewer" src="https://docs.google.com/gview?url=${encodeURIComponent(fullUrl)}&embedded=true"></iframe>
                </body>
                </html>
              `
              
            // Create a blob URL with the custom HTML
            const blob = new Blob([customViewerHTML], { type: 'text/html' })
            const customUrl = URL.createObjectURL(blob)
            window.open(customUrl, '_blank')
            
            // Clean up the blob URL after a short delay
            setTimeout(() => {
              URL.revokeObjectURL(customUrl)
            }, 1000)
          } else {
            // For other files (videos, images), open directly
            window.open(fullUrl, '_blank')
          }
        } else {
          // For local files
          window.open(fullUrl, '_blank')
        }
      } else if (action === 'download') {
        try {
          // Download action initiated for secure file access
          
          // Universal secure download approach for both mobile and desktop
          
          // Create proper filename with extension
          const sanitizedTitle = content.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
          let extension = 'file'
          
          if (content.contentType === 'pdf' || content.contentType === 'document') extension = 'pdf'
          else if (content.contentType === 'video') extension = 'mp4'
          else if (content.contentType === 'image') extension = 'jpg'
          
          const filename = `${sanitizedTitle}.${extension}`
          const token = localStorage.getItem('teacherAccessToken')
          
          // Use backend proxy for secure downloads (works for both mobile and desktop)
          const proxyUrl = `${apiUrl}/api/download/proxy?url=${encodeURIComponent(fullUrl)}&filename=${encodeURIComponent(filename)}`
          
          try {
            // Using secure backend proxy for download
            
            // Fetch the file through the secure proxy
            const response = await fetch(proxyUrl, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            })
            
            if (!response.ok) {
              throw new Error(`Proxy download failed: ${response.status}`)
            }
            
            // Get the file as blob
            const blob = await response.blob()
            // Secure blob created for download
            
            // Create download link with blob
            const blobUrl = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = blobUrl
            link.download = filename
            link.style.display = 'none'
            
            document.body.appendChild(link)
            link.click()
            
            // Cleanup
            setTimeout(() => {
              if (document.body.contains(link)) {
                document.body.removeChild(link)
              }
              window.URL.revokeObjectURL(blobUrl)
            }, 1000)
            
            toast({
              title: "Download Complete",
              description: `${content.title} has been downloaded securely.`,
              duration: 3000,
              className: "border-green-200 bg-green-50 text-green-800"
            })
            
          } catch (proxyError) {
            console.error('Secure proxy download failed:', proxyError)
            
            // Fallback: Try direct Cloudinary download with attachment parameter
            const fallbackUrl = fullUrl.includes('?') 
              ? `${fullUrl}&fl_attachment=true`
              : `${fullUrl}?fl_attachment=true`
            
            window.open(fallbackUrl, '_blank', 'noopener,noreferrer')
            
            toast({
              title: "Download Started",
              description: `${content.title} download started. If prompted about security, choose "Keep" to save the file.`,
              duration: 5000,
              className: "border-orange-200 bg-orange-50 text-orange-800"
            })
          }
          
        } catch (downloadError) {
          console.error('Download failed:', downloadError)
          // Fallback to opening in new tab if download fails
          window.open(fullUrl, '_blank')
          toast({
            title: "Download Failed",
            description: "Direct download failed, opened file in new tab instead.",
            variant: "destructive",
            duration: 3000,
          })
        }
      }
    } catch (error) {
      console.error('Error handling content action:', error)
      toast({
        title: "Error",
        description: "Unable to access content. Please try again.",
        variant: "destructive",
        duration: 4000,
      })
    }
  }

  const getNextStatus = (currentStatus?: string) => {
    switch (currentStatus) {
      case "not-started":
      case undefined:
        return "in-progress"
      case "in-progress":
        return "completed"
      case "completed":
        return "not-started"
      default:
        return "not-started"
    }
  }

  useEffect(() => {
    const userData = localStorage.getItem("teacherUser")
    const accessToken = localStorage.getItem("teacherAccessToken")
    
    if (userData && accessToken) {
      const parsedUser = JSON.parse(userData)
      if (parsedUser.role !== "teacher") {
        alert("Access denied. Only teachers can access this page.")
        router.push("/auth/teacher-login")
        return
      }
      setUser(parsedUser)
    } else {
      router.push("/auth/teacher-login")
    }
  }, [router])

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault()
      setShowLogoutConfirm(true)
      // Push the current state back to prevent actual navigation
      window.history.pushState(null, '', window.location.href)
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = "Are you sure you want to leave? You will be logged out."
      return "Are you sure you want to leave? You will be logged out."
    }

    // Add a history entry when component mounts
    window.history.pushState(null, '', window.location.href)
    
    // Listen for back button
    window.addEventListener('popstate', handlePopState)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  const handleLogout = () => {
    // Remove event listeners before logout to prevent interference
    window.removeEventListener('popstate', () => {})
    window.removeEventListener('beforeunload', () => {})
    
    localStorage.removeItem("teacherUser")
    localStorage.removeItem("teacherAccessToken")
    localStorage.removeItem("teacherRefreshToken")
    setShowLogoutConfirm(false)
    
    toast({
      title: "Logged Out Successfully", 
      description: "You have been securely logged out",
      duration: 2000,
      className: "border-green-200 bg-green-50 text-green-800"
    })
    
    // Use window.location for reliable navigation
    window.location.href = "/"
  }

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true)
  }

  const handleClassSelect = (classNum: string) => {
    setSelectedClass(classNum)
    setSelectedSubject(null)
    setSelectedChapter(null)
    setView("subjects")
    fetchSubjects(classNum)
  }

  const handleSubjectSelect = (subject: Subject) => {
    setSelectedSubject(subject)
    setSelectedChapter(null)
    setView("chapters")
    fetchChapters(subject.id)
  }

  const handleChapterSelect = (chapter: Chapter) => {
    setSelectedChapter(chapter)
    setView("content")
  }

  const handleBackToClasses = () => {
    setSelectedClass("")
    setSelectedSubject(null)
    setSelectedChapter(null)
    setView("classes")
    setSubjects([])
    setChapters([])
  }

  const handleBackToSubjects = () => {
    setSelectedSubject(null)
    setSelectedChapter(null)
    setView("subjects")
    setChapters([])
  }

  const handleBackToChapters = () => {
    setSelectedChapter(null)
    setView("chapters")
  }

  const handleAddSubject = async () => {
    if (newSubjectName.trim()) {
      const success = await createSubject(newSubjectName.trim(), selectedClass, newSubjectDescription.trim())
      if (success) {
        setNewSubjectName("")
        setNewSubjectDescription("")
        setShowAddSubject(false)
      }
    }
  }

  const handleAddChapter = async () => {
    if (newChapterName.trim() && selectedSubject) {
      const success = await createChapter(newChapterName.trim(), selectedSubject.id, newChapterDescription.trim())
      if (success) {
        setNewChapterName("")
        setNewChapterDescription("")
        setShowAddChapter(false)
      }
    }
  }

  if (!user) return <div>Loading...</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      {/* Enhanced Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-green-100 dark:border-gray-700 sticky top-0 z-50 transition-colors duration-300">
        <div className="w-full px-0 py-2 sm:py-4">
          <div className="flex items-center justify-between px-3 sm:px-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 bg-green-100 dark:bg-green-800 rounded-lg transition-colors duration-300">
                <BookOpen className="h-4 w-4 sm:h-6 sm:w-6 text-green-600 dark:text-green-300" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Teacher Dashboard</h1>
                <p className="text-xs text-gray-600 dark:text-gray-300 hidden sm:block">Content Management Portal</p>
              </div>
              <Badge className="bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700 text-xs px-2 py-1 hidden lg:inline-flex ml-2">
                <Users className="h-3 w-3 mr-1" />
                <span>Educator</span>
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-right hidden lg:block">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Welcome back,</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">{user.name}</p>
              </div>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 hidden lg:block"></div>
              <Button variant="outline" size="sm" onClick={handleLogoutClick} className="hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-xs px-2 py-1">
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline ml-1">Exit</span>
              </Button>
            </div>
          </div>
          <div className="mt-2 lg:hidden text-right px-3 sm:px-4">
            <p className="text-xs text-gray-600 dark:text-gray-300">Welcome back, {user.name}</p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 sm:py-8">
        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 hover:shadow-lg transition-all duration-300 dark:from-blue-950/50 dark:to-blue-900/50 dark:border-blue-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-blue-900 dark:text-blue-100">Subjects</CardTitle>
              <div className="p-1.5 sm:p-2 bg-blue-200 dark:bg-blue-800 rounded-lg">
                <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 text-blue-700 dark:text-blue-300" />
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-xl sm:text-3xl font-bold text-blue-900 dark:text-blue-100">{subjects.length}</div>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1 hidden sm:block">Active subjects</p>
            </CardContent>
          </Card>
          
          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100/50 hover:shadow-lg transition-all duration-300 dark:from-green-950/50 dark:to-green-900/50 dark:border-green-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-green-900 dark:text-green-100">Chapters</CardTitle>
              <div className="p-1.5 sm:p-2 bg-green-200 dark:bg-green-800 rounded-lg">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-green-700 dark:text-green-300" />
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-xl sm:text-3xl font-bold text-green-900 dark:text-green-100">
                {subjects.reduce((total, subject) => total + (subject.chapters?.length || 0), 0)}
              </div>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1 hidden sm:block">Total chapters</p>
            </CardContent>
          </Card>
          
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 hover:shadow-lg transition-all duration-300 dark:from-purple-950/50 dark:to-purple-900/50 dark:border-purple-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-purple-900 dark:text-purple-100">Content</CardTitle>
              <div className="p-1.5 sm:p-2 bg-purple-200 dark:bg-purple-800 rounded-lg">
                <Video className="h-3 w-3 sm:h-4 sm:w-4 text-purple-700 dark:text-purple-300" />
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-xl sm:text-3xl font-bold text-purple-900 dark:text-purple-100">
                {chapters.reduce((total, chapter) => total + (chapter.content?.length || 0), 0)}
              </div>
              <p className="text-xs text-purple-700 dark:text-purple-300 mt-1 hidden sm:block">Total content</p>
            </CardContent>
          </Card>
          
          <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50 hover:shadow-lg transition-all duration-300 dark:from-orange-950/50 dark:to-orange-900/50 dark:border-orange-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-orange-900 dark:text-orange-100">Classes</CardTitle>
              <div className="p-1.5 sm:p-2 bg-orange-200 dark:bg-orange-800 rounded-lg">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 text-orange-700 dark:text-orange-300" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-3xl font-bold text-orange-900">4</div>
              <p className="hidden sm:block text-xs text-orange-700 mt-1">9th to 12th</p>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Content Management */}
        <Card className="border-green-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-lg sm:text-xl text-green-900">Content Management</CardTitle>
                <CardDescription className="text-sm text-green-700 mt-1">
                  {view === "classes" && "Select a class"}
                  {view === "subjects" && `Class ${selectedClass}`}
                  {view === "chapters" && `${selectedClass} - ${selectedSubject?.name}`}
                  {view === "content" && `${selectedClass} - ${selectedSubject?.name} - ${selectedChapter?.title}`}
                </CardDescription>
              </div>
              
              {/* Breadcrumb Navigation */}
              <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm overflow-x-auto">
                {view !== "classes" && (
                  <Button variant="outline" size="sm" onClick={handleBackToClasses} className="text-green-600 hover:bg-green-50 text-xs px-2 py-1">
                    Classes
                  </Button>
                )}
                {(view === "chapters" || view === "content") && (
                  <>
                    <span className="text-gray-400 text-xs">/</span>
                    <Button variant="outline" size="sm" onClick={handleBackToSubjects} className="text-green-600 hover:bg-green-50 text-xs px-2 py-1">
                      {selectedClass ? `Class ${selectedClass}` : "Subjects"}
                    </Button>
                  </>
                )}
                {view === "content" && (
                  <>
                    <span className="text-gray-400 text-xs">/</span>
                    <Button variant="outline" size="sm" onClick={handleBackToChapters} className="text-green-600 hover:bg-green-50">
                      {selectedSubject?.name}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-3 sm:p-6">
            {/* Class Selection View */}
            {view === "classes" && (
              <div className="space-y-4 sm:space-y-6">
                <div className="text-center mb-4 sm:mb-8">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">Select a Class to Manage</h3>
                  <p className="text-sm text-gray-600 hidden sm:block">Choose the class you want to upload content for</p>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                  {["9", "10", "11", "12"].map((classNum) => (
                    <Card 
                      key={classNum} 
                      className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-green-300 group"
                      onClick={() => handleClassSelect(classNum)}
                    >
                      <CardContent className="p-3 sm:p-6 text-center">
                        <div className="text-2xl sm:text-4xl font-bold text-green-600 mb-1 sm:mb-2 group-hover:scale-110 transition-transform">
                          Class {classNum}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-4">
                          Click to manage subjects
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Subject Selection View */}
            {view === "subjects" && (
              <div className="space-y-4 sm:space-y-6">
                <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200">
                  <h3 className="text-base sm:text-lg font-semibold text-green-900 mb-1 sm:mb-2">Class {selectedClass} Subjects</h3>
                  <p className="text-green-700 text-sm hidden sm:block">Select a subject to view chapters and content</p>
                </div>
                
                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                    {[...Array(3)].map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="p-3 sm:p-6">
                          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
                            <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-gray-200 rounded" />
                              <div className="h-3 bg-gray-200 rounded w-3/4" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  subjects.length === 0 ? (
                    <div className="text-center py-12">
                      <Dialog open={showAddSubject} onOpenChange={setShowAddSubject}>
                        <DialogTrigger asChild>
                          <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 border-dashed border-gray-300 hover:border-green-300 group mx-auto max-w-sm">
                            <CardContent className="p-6 text-center">
                              <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors mx-auto w-fit mb-4">
                                <Plus className="h-12 w-12 text-green-600" />
                              </div>
                              <p className="text-sm text-gray-500">
                                Add subjects that students will be able to access in their portal.
                              </p>
                            </CardContent>
                          </Card>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Add New Subject</DialogTitle>
                            <p className="text-sm text-muted-foreground">Create a new subject for Class {selectedClass}</p>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <Label htmlFor="subject-name">Subject Name</Label>
                              <Input
                                id="subject-name"
                                placeholder="Enter subject name"
                                value={newSubjectName}
                                onChange={(e) => setNewSubjectName(e.target.value)}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="subject-description">Description (Optional)</Label>
                              <Textarea
                                id="subject-description"
                                placeholder="Enter subject description"
                                value={newSubjectDescription}
                                onChange={(e) => setNewSubjectDescription(e.target.value)}
                                className="mt-1 min-h-[80px]"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setShowAddSubject(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleAddSubject} disabled={!newSubjectName.trim()}>
                              Create Subject
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Subjects Found</h3>
                        <p className="text-gray-600">
                          Class {selectedClass} is empty. Create your first subject to get started.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                      {subjects.map((subject) => (
                        <Card 
                          key={subject.id} 
                          className={`hover:shadow-lg transition-all duration-300 border-2 hover:border-blue-300 group relative ${
                            subject.isVisible === false ? 'opacity-60 border-gray-300' : ''
                          }`}
                        >
                          <CardContent className="p-3 sm:p-6">
                            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
                              <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                                <BookOpen className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" />
                              </div>
                              <div 
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => handleSubjectSelect(subject)}
                              >
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{subject.name}</h4>
                                  {subject.isVisible === false && (
                                    <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600">
                                      Hidden
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs sm:text-sm text-gray-600">
                                  {subject.chapters?.length || 0} chapters
                                </p>
                                {subject.description && (
                                  <p className="text-xs text-gray-500 mt-1 truncate">{subject.description}</p>
                                )}
                              </div>
                              {/* Visibility Toggle Button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleSubjectVisibility(subject.id)
                                }}
                                className={`p-2 rounded-lg transition-colors ${
                                  subject.isVisible === false 
                                    ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100' 
                                    : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                                }`}
                                title={subject.isVisible === false ? 'Hidden from students - Click to show' : 'Visible to students - Click to hide'}
                              >
                                {subject.isVisible === false ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      {/* Add New Subject Card for when subjects exist */}
                      <Dialog open={showAddSubject} onOpenChange={setShowAddSubject}>
                        <DialogTrigger asChild>
                          <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 border-dashed border-gray-300 hover:border-green-300 group">
                            <CardContent className="p-3 sm:p-6 text-center">
                              <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors mx-auto w-fit mb-2 sm:mb-3">
                                <Plus className="h-4 w-4 sm:h-6 sm:w-6 text-green-600" />
                              </div>
                              <h4 className="font-semibold text-gray-900 text-sm sm:text-base mb-1 sm:mb-2">Add New Subject</h4>
                              <p className="text-xs sm:text-sm text-gray-600">
                                Create for Class {selectedClass}
                              </p>
                            </CardContent>
                          </Card>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Add New Subject</DialogTitle>
                            <p className="text-sm text-muted-foreground">Create a new subject for Class {selectedClass}</p>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <Label htmlFor="subject-name">Subject Name</Label>
                              <Input
                                id="subject-name"
                                placeholder="Enter subject name"
                                value={newSubjectName}
                                onChange={(e) => setNewSubjectName(e.target.value)}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="subject-description">Description (Optional)</Label>
                              <Textarea
                                id="subject-description"
                                placeholder="Enter subject description"
                                value={newSubjectDescription}
                                onChange={(e) => setNewSubjectDescription(e.target.value)}
                                className="mt-1 min-h-[80px]"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setShowAddSubject(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleAddSubject} disabled={!newSubjectName.trim()}>
                              Create Subject
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )
                )}
              </div>
            )}

            {/* Chapter Selection View */}
            {view === "chapters" && (
              <div className="space-y-4 sm:space-y-6">
                <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
                  <h3 className="text-base sm:text-lg font-semibold text-blue-900 mb-1 sm:mb-2">{selectedSubject?.name} - Class {selectedClass}</h3>
                  <p className="text-blue-700 text-sm hidden sm:block">Select a chapter to view and manage content</p>
                </div>
                
                {loading ? (
                  <div className="grid gap-3 sm:gap-4">
                    {[...Array(3)].map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="p-3 sm:p-6">
                          <div className="flex items-center gap-2 sm:gap-4">
                            <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                            <div className="flex-1 space-y-2">
                              <div className="h-5 bg-gray-200 rounded" />
                              <div className="h-4 bg-gray-200 rounded w-3/4" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-3 sm:gap-4">
                    {chapters.length === 0 ? (
                      <div className="text-center py-12">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Chapters Found</h3>
                        <p className="text-gray-600 mb-4">
                          {selectedSubject?.name} doesn't have any chapters yet. Create your first chapter to get started.
                        </p>
                        <p className="text-sm text-gray-500">
                          Chapters will organize your content and be visible to students.
                        </p>
                      </div>
                    ) : (
                      chapters.map((chapter) => (
                        <Card 
                          key={chapter.id} 
                          className={`hover:shadow-lg transition-all duration-300 border-l-4 border-l-purple-500 hover:border-l-purple-600 group relative ${
                            chapter.isVisible === false ? 'opacity-60 border-gray-300' : ''
                          }`}
                        >
                          <CardContent className="p-3 sm:p-6">
                            <div className="flex items-center justify-between gap-2 sm:gap-4">
                              <div 
                                className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 cursor-pointer"
                                onClick={() => handleChapterSelect(chapter)}
                              >
                                <div className="p-2 sm:p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors flex-shrink-0">
                                  <BookOpen className="h-4 w-4 sm:h-6 sm:w-6 text-purple-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-gray-900 text-sm sm:text-lg truncate">{chapter.title}</h4>
                                    {chapter.isVisible === false && (
                                      <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600">
                                        Hidden
                                      </Badge>
                                    )}
                                  </div>
                                  {chapter.description && (
                                    <p className="text-xs sm:text-sm text-gray-600 mt-1">{chapter.description}</p>
                                  )}
                                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                    {chapter.content?.length || 0} content items
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {/* Visibility Toggle Button */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleChapterVisibility(chapter.id)
                                  }}
                                  className={`p-2 rounded-lg transition-colors ${
                                    chapter.isVisible === false 
                                      ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100' 
                                      : 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
                                  }`}
                                  title={chapter.isVisible === false ? 'Hidden from students - Click to show' : 'Visible to students - Click to hide'}
                                >
                                  {chapter.isVisible === false ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className={`flex items-center gap-1 text-xs px-2 py-1 transition-all ${
                                    chapter.status === "completed" 
                                      ? "text-green-600 bg-green-100 border-green-200 hover:bg-green-200" 
                                      : chapter.status === "in-progress"
                                      ? "text-yellow-600 bg-yellow-100 border-yellow-200 hover:bg-yellow-200"
                                      : "text-gray-600 bg-gray-100 border-gray-200 hover:bg-gray-200"
                                  }`}
                                  title={`Click to change status. Current: ${chapter.status === "not-started" || !chapter.status ? "Not Started" : chapter.status?.replace('-', ' ')}`}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const nextStatus = getNextStatus(chapter.status)
                                    updateChapterStatus(chapter.id, nextStatus as "not-started" | "in-progress" | "completed")
                                  }}
                                >
                                  {chapter.status === "completed" && <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />}
                                  {chapter.status === "in-progress" && <Clock className="h-3 w-3 sm:h-4 sm:w-4" />}
                                  {(!chapter.status || chapter.status === "not-started") && <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />}
                                  <span className="capitalize hidden sm:inline">
                                    {chapter.status === "not-started" || !chapter.status ? "Not Started" : chapter.status?.replace('-', ' ')}
                                  </span>
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                    
                    {/* Add New Chapter Card */}
                    <Dialog open={showAddChapter} onOpenChange={setShowAddChapter}>
                      <DialogTrigger asChild>
                        <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 border-dashed border-gray-300 hover:border-purple-300 group">
                          <CardContent className="p-6 text-center">
                            <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors mx-auto w-fit mb-3">
                              <Plus className="h-6 w-6 text-purple-600" />
                            </div>
                            <h4 className="font-semibold text-gray-900 mb-2">Add New Chapter</h4>
                            <p className="text-sm text-gray-600">Create a new chapter for {selectedSubject?.name}</p>
                          </CardContent>
                        </Card>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Add New Chapter</DialogTitle>
                          <p className="text-sm text-muted-foreground">Create a new chapter for {selectedSubject?.name}</p>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <Label htmlFor="chapter-name">Chapter Name</Label>
                            <Input
                              id="chapter-name"
                              placeholder="Enter chapter name"
                              value={newChapterName}
                              onChange={(e) => setNewChapterName(e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="chapter-description">Description (Optional)</Label>
                            <Textarea
                              id="chapter-description"
                              placeholder="Enter chapter description"
                              value={newChapterDescription}
                              onChange={(e) => setNewChapterDescription(e.target.value)}
                              className="mt-1 min-h-[80px]"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setShowAddChapter(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleAddChapter} disabled={!newChapterName.trim()}>
                            Create Chapter
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            )}

            {/* Content Management View */}
            {view === "content" && (
              <div className="space-y-4 sm:space-y-6">
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h3 className="text-lg font-semibold text-purple-900 mb-2">{selectedChapter?.title} - {selectedSubject?.name} - Class {selectedClass}</h3>
                  <p className="text-purple-700 text-sm">Upload and manage content for this chapter</p>
                </div>
                
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-gray-200 rounded" />
                              <div className="h-3 bg-gray-200 rounded w-3/4" />
                            </div>
                            <div className="w-20 h-8 bg-gray-200 rounded" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Content Filter Buttons */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                          <button
                            onClick={() => setContentFilter('all')}
                            className={`flex-1 sm:flex-none sm:w-auto flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all duration-300 ${
                              contentFilter === 'all'
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md border-2 border-green-400'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                            }`}
                          >
                            <BookOpen className="h-4 w-4" />
                            <span className="hidden sm:inline">All Content</span>
                            <span className="sm:hidden">All</span>
                            <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                              contentFilter === 'all' ? 'bg-white/20 text-white' : 'bg-white text-gray-600'
                            }`}>
                              {selectedChapter?.content?.filter(c => c.approved).length || 0}
                            </div>
                          </button>
                          
                          <button
                            onClick={() => setContentFilter('video')}
                            className={`flex-1 sm:flex-none sm:w-auto flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all duration-300 ${
                              contentFilter === 'video'
                                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md border-2 border-blue-400'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                            }`}
                          >
                            <Video className="h-4 w-4" />
                            <span className="hidden sm:inline">Videos</span>
                            <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                              contentFilter === 'video' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'
                            }`}>
                              {selectedChapter?.content?.filter(c => c.approved && c.contentType === 'video').length || 0}
                            </div>
                          </button>
                          
                          <button
                            onClick={() => setContentFilter('notes')}
                            className={`flex-1 sm:flex-none sm:w-auto flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all duration-300 ${
                              contentFilter === 'notes'
                                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md border-2 border-orange-400'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                            }`}
                          >
                            <FileText className="h-4 w-4" />
                            <span className="hidden sm:inline">Notes</span>
                            <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                              contentFilter === 'notes' ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-600'
                            }`}>
                              {selectedChapter?.content?.filter(c => c.approved && (c.contentType === 'pdf' || c.contentType === 'document')).length || 0}
                            </div>
                          </button>
                        </div>
                        
                        {/* Upload Content Button */}
                        <Button 
                          onClick={() => router.push('/teacher/upload')}
                          className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto"
                          size="sm"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">Upload Content</span>
                          <span className="sm:hidden">Upload</span>
                        </Button>
                      </div>
                    </div>

                    {/* Content Display */}
                    {selectedChapter?.content && selectedChapter.content.length > 0 ? (
                      <div className="space-y-4">
                        {/* Video Lessons Section */}
                        {(contentFilter === 'all' || contentFilter === 'video') && 
                         selectedChapter.content.filter(c => c.approved && c.contentType === 'video').length > 0 && (
                          <div className="space-y-2 bg-gradient-to-br from-blue-500/15 via-cyan-500/10 to-blue-500/15 backdrop-blur-lg rounded-2xl p-3 sm:p-4 border border-blue-400/20 shadow-xl">
                            <div className="flex items-center gap-2 px-1 mb-3">
                              <div className="p-1.5 bg-blue-500/30 backdrop-blur-sm rounded-lg border border-blue-400/40">
                                <Video className="h-4 w-4 text-blue-800" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900 text-sm">Video Lessons</h3>
                                <p className="text-xs text-gray-700">{selectedChapter.content.filter(c => c.approved && c.contentType === 'video').length} videos to manage</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              {selectedChapter.content
                                .filter(c => c.approved && c.contentType === 'video')
                                .map((content, index) => (
                                <div 
                                  key={content.id} 
                                  className={`group relative overflow-hidden backdrop-blur-sm rounded-lg border p-3 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02] ${
                                    content.isVisible === false 
                                      ? 'bg-gray-100/50 border-gray-300 opacity-60' 
                                      : 'bg-white/10 border-white/20 hover:border-blue-400/50 hover:bg-white/15'
                                  }`}
                                  style={{ animationDelay: `${index * 100}ms` }}
                                >
                                  <div className={`absolute top-0 left-0 w-full h-0.5 ${
                                    content.isVisible === false 
                                      ? 'bg-gradient-to-r from-gray-400 via-gray-300 to-gray-400' 
                                      : 'bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400'
                                  }`}></div>
                                  
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0 pr-3">
                                      <div className="flex items-start gap-2">
                                        <div className={`p-1.5 rounded-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-300 ${
                                          content.isVisible === false 
                                            ? 'bg-gray-300/50' 
                                            : 'bg-blue-500/20'
                                        }`}>
                                          <Video className={`h-3 w-3 ${
                                            content.isVisible === false ? 'text-gray-500' : 'text-blue-700'
                                          }`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1">
                                            <h4 className={`font-medium text-xs sm:text-sm leading-tight group-hover:transition-colors ${
                                              content.isVisible === false 
                                                ? 'text-gray-600' 
                                                : 'text-gray-900 group-hover:text-blue-800'
                                            }`}>
                                              {content.title}
                                            </h4>
                                            {content.isVisible === false && (
                                              <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600">
                                                Hidden
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <div className="flex items-center gap-1">
                                              <div className={`w-1.5 h-1.5 rounded-full ${
                                                content.isVisible === false ? 'bg-gray-400' : 'bg-green-400 animate-pulse'
                                              }`}></div>
                                              <span className={`text-xs font-medium ${
                                                content.isVisible === false ? 'text-gray-500' : 'text-gray-700'
                                              }`}>
                                                by {content.teacher?.firstName} {content.teacher?.lastName}
                                              </span>
                                            </div>
                                            {content.duration && (
                                              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full ${
                                                content.isVisible === false 
                                                  ? 'bg-gray-300/50' 
                                                  : 'bg-blue-500/20'
                                              }`}>
                                                <Clock className={`h-2.5 w-2.5 ${
                                                  content.isVisible === false ? 'text-gray-500' : 'text-blue-700'
                                                }`} />
                                                <span className={`text-xs font-medium ${
                                                  content.isVisible === false ? 'text-gray-600' : 'text-blue-800'
                                                }`}>
                                                  {content.duration} min
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {/* Visibility Toggle Button */}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          toggleContentVisibility(content.id)
                                        }}
                                        className={`p-2 rounded-lg transition-colors ${
                                          content.isVisible === false 
                                            ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100' 
                                            : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                                        }`}
                                        title={content.isVisible === false ? 'Hidden from students - Click to show' : 'Visible to students - Click to hide'}
                                      >
                                        {content.isVisible === false ? (
                                          <EyeOff className="h-4 w-4" />
                                        ) : (
                                          <Eye className="h-4 w-4" />
                                        )}
                                      </Button>
                                      <button 
                                        onClick={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          // Video preview action
                                          handleContentAction(content, 'view')
                                        }}
                                        onTouchStart={() => {}}
                                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 sm:px-3 sm:py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-medium rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 touch-manipulation min-h-[40px] sm:min-h-auto"
                                        style={{ WebkitTapHighlightColor: 'transparent' }}
                                      >
                                        <Eye className="h-4 w-4 sm:h-3 sm:w-3" />
                                        <span className="hidden sm:inline">Preview</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Study Materials Section */}
                        {(contentFilter === 'all' || contentFilter === 'notes') && 
                         selectedChapter.content.filter(c => c.approved && (c.contentType === 'pdf' || c.contentType === 'document')).length > 0 && (
                          <div className="space-y-2 bg-gradient-to-br from-orange-500/15 via-amber-500/10 to-orange-500/15 backdrop-blur-lg rounded-2xl p-3 sm:p-4 border border-orange-400/20 shadow-xl">
                            <div className="flex items-center gap-2 px-1 mb-3">
                              <div className="p-1.5 bg-orange-500/30 backdrop-blur-sm rounded-lg border border-orange-400/40">
                                <FileText className="h-4 w-4 text-orange-800" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900 text-sm">Study Materials</h3>
                                <p className="text-xs text-gray-700">{selectedChapter.content.filter(c => c.approved && (c.contentType === 'pdf' || c.contentType === 'document')).length} documents to study</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              {selectedChapter.content
                                .filter(c => c.approved && (c.contentType === 'pdf' || c.contentType === 'document'))
                                .map((content, index) => (
                                <div 
                                  key={content.id} 
                                  className={`group relative overflow-hidden backdrop-blur-sm rounded-lg border p-3 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02] ${
                                    content.isVisible === false 
                                      ? 'bg-gray-100/50 border-gray-300 opacity-60' 
                                      : 'bg-white/10 border-white/20 hover:border-orange-400/50 hover:bg-white/15'
                                  }`}
                                  style={{ animationDelay: `${index * 100}ms` }}
                                >
                                  <div className={`absolute top-0 left-0 w-full h-0.5 ${
                                    content.isVisible === false 
                                      ? 'bg-gradient-to-r from-gray-400 via-gray-300 to-gray-400' 
                                      : 'bg-gradient-to-r from-orange-400 via-amber-400 to-orange-400'
                                  }`}></div>
                                  
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0 pr-3">
                                      <div className="flex items-start gap-2">
                                        <div className={`p-1.5 rounded-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-300 ${
                                          content.isVisible === false 
                                            ? 'bg-gray-300/50' 
                                            : 'bg-orange-500/20'
                                        }`}>
                                          <FileText className={`h-3 w-3 ${
                                            content.isVisible === false ? 'text-gray-500' : 'text-orange-700'
                                          }`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1">
                                            <h4 className={`font-medium text-xs sm:text-sm leading-tight group-hover:transition-colors ${
                                              content.isVisible === false 
                                                ? 'text-gray-600' 
                                                : 'text-gray-900 group-hover:text-orange-800'
                                            }`}>
                                              {content.title}
                                            </h4>
                                            {content.isVisible === false && (
                                              <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600">
                                                Hidden
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <div className="flex items-center gap-1">
                                              <div className={`w-1.5 h-1.5 rounded-full ${
                                                content.isVisible === false ? 'bg-gray-400' : 'bg-green-400 animate-pulse'
                                              }`}></div>
                                              <span className={`text-xs font-medium ${
                                                content.isVisible === false ? 'text-gray-500' : 'text-gray-700'
                                              }`}>
                                                by {content.teacher?.firstName} {content.teacher?.lastName}
                                              </span>
                                            </div>
                                            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full ${
                                              content.isVisible === false 
                                                ? 'bg-gray-300/50' 
                                                : 'bg-orange-500/20'
                                            }`}>
                                              <span className={`text-xs font-medium uppercase ${
                                                content.isVisible === false ? 'text-gray-600' : 'text-orange-800'
                                              }`}>
                                                {content.contentType}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {/* Visibility Toggle Button */}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          toggleContentVisibility(content.id)
                                        }}
                                        className={`p-2 rounded-lg transition-colors ${
                                          content.isVisible === false 
                                            ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100' 
                                            : 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'
                                        }`}
                                        title={content.isVisible === false ? 'Hidden from students - Click to show' : 'Visible to students - Click to hide'}
                                      >
                                        {content.isVisible === false ? (
                                          <EyeOff className="h-4 w-4" />
                                        ) : (
                                          <Eye className="h-4 w-4" />
                                        )}
                                      </Button>
                                      <button 
                                        onClick={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          // View action triggered
                                          handleContentAction(content, 'view')
                                        }}
                                        className="flex items-center justify-center gap-1 px-3 py-2.5 sm:px-2 sm:py-1.5 bg-gradient-to-r from-orange-600 to-amber-600 text-white text-xs font-medium rounded-lg hover:from-orange-700 hover:to-amber-700 transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 touch-manipulation min-h-[40px] sm:min-h-auto"
                                        style={{ WebkitTapHighlightColor: 'transparent' }}
                                      >
                                        <Eye className="h-4 w-4 sm:h-3 sm:w-3" />
                                        <span className="hidden sm:inline">View</span>
                                      </button>
                                      <button 
                                        onClick={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          // Download action triggered
                                          handleContentAction(content, 'download')
                                        }}
                                        onTouchStart={() => {}}
                                        className="flex items-center justify-center gap-1 px-3 py-2.5 sm:px-2 sm:py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-xs font-medium rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 touch-manipulation min-h-[40px] sm:min-h-auto"
                                        style={{ WebkitTapHighlightColor: 'transparent' }}
                                      >
                                        <Download className="h-4 w-4 sm:h-3 sm:w-3" />
                                        <span className="hidden sm:inline">Get</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* No Content in Selected Filter */}
                        {((contentFilter === 'video' && selectedChapter.content.filter(c => c.approved && c.contentType === 'video').length === 0) ||
                          (contentFilter === 'notes' && selectedChapter.content.filter(c => c.approved && (c.contentType === 'pdf' || c.contentType === 'document')).length === 0)) && (
                          <div className="text-center py-8 bg-gradient-to-br from-gray-500/10 via-slate-500/5 to-gray-500/10 backdrop-blur-lg rounded-2xl border border-gray-400/20">
                            <div className="bg-gradient-to-br from-gray-500/20 to-slate-500/20 backdrop-blur-sm rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center border border-gray-400/30">
                              {contentFilter === 'video' ? <Video className="h-8 w-8 text-gray-700" /> : <FileText className="h-8 w-8 text-gray-700" />}
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              No {contentFilter === 'video' ? 'Videos' : 'Documents'} Found
                            </h3>
                            <p className="text-gray-700 text-sm">
                              No {contentFilter === 'video' ? 'video content' : 'study materials'} has been uploaded for this chapter yet.
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Empty State - No Content */
                      <div className="text-center py-12 bg-gradient-to-br from-gray-500/10 via-slate-500/5 to-gray-500/10 backdrop-blur-lg rounded-2xl border border-gray-400/20">
                        <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 backdrop-blur-sm rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center border border-purple-400/30">
                          <Upload className="h-10 w-10 text-gray-700" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Content Uploaded</h3>
                        <p className="text-gray-700 mb-4 text-sm">
                          This chapter doesn't have any content yet. Upload videos and documents to get started.
                        </p>
                        <Button 
                          onClick={() => router.push('/teacher/upload')}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Upload Content
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <LogOut className="h-5 w-5" />
              Confirm Logout
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 mb-4">
              Are you sure you want to leave the teacher dashboard? 
            </p>
            <p className="text-sm text-gray-500">
              You will be logged out and need to login again to access your account.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button 
              variant="outline" 
              onClick={() => setShowLogoutConfirm(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleLogout}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Yes, Logout
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <Toaster />
    </div>
  )
}

// Wrap the component with ErrorBoundary for production robustness
function TeacherDashboardWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <TeacherDashboard />
    </ErrorBoundary>
  )
}

export { TeacherDashboardWithErrorBoundary as default }
