"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Upload, Video, FileText, CheckCircle, X, Youtube } from "lucide-react"
import Link from "next/link"

export default function UploadPage() {
  const [user, setUser] = useState<any>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "",
    class: "",
    subject: "",
    chapter: "",
    file: null as File | null,
  })
  const [uploading, setUploading] = useState(false)
  const [subjects, setSubjects] = useState<any[]>([])
  const [chapters, setChapters] = useState<any[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [loadingChapters, setLoadingChapters] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [uploadedContent, setUploadedContent] = useState<any>(null)
  const [uploadProgress, setUploadProgress] = useState({
    stage: '',
    percentage: 0,
    message: '',
    uploadedSize: 0,
    totalSize: 0,
    needsCompression: false
  })
  const router = useRouter()

  // API Functions
  const fetchSubjects = async (classLevel: string) => {
    if (!classLevel) return
    
    setLoadingSubjects(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const response = await fetch(`${apiUrl}/api/teachers/subjects/${classLevel}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('teacherAccessToken')}`
        }
      })
      const data = await response.json()
      if (data.success) {
        setSubjects(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching subjects:', error)
      setSubjects([])
    } finally {
      setLoadingSubjects(false)
    }
  }

  const fetchChapters = async (subjectId: string) => {
    if (!subjectId) return
    
    setLoadingChapters(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const response = await fetch(`${apiUrl}/api/teachers/chapters/${subjectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('teacherAccessToken')}`
        }
      })
      const data = await response.json()
      if (data.success) {
        setChapters(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching chapters:', error)
      setChapters([])
    } finally {
      setLoadingChapters(false)
    }
  }

  const createSubjectIfNotExists = async (subjectName: string, classLevel: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const response = await fetch(`${apiUrl}/api/teachers/subjects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('teacherAccessToken')}`
        },
        body: JSON.stringify({
          name: subjectName,
          classLevel: parseInt(classLevel)
        })
      })
      const data = await response.json()
      return data.success ? data.data.subject : null
    } catch (error) {
      console.error('Error creating subject:', error)
      return null
    }
  }

  const createChapterIfNotExists = async (chapterTitle: string, subjectId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const response = await fetch(`${apiUrl}/api/teachers/chapters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('teacherAccessToken')}`
        },
        body: JSON.stringify({
          title: chapterTitle,
          subjectId: parseInt(subjectId),
          description: `Chapter for ${chapterTitle}`
        })
      })
      const data = await response.json()
      return data.success ? data.data.chapter : null
    } catch (error) {
      console.error('Error creating chapter:', error)
      return null
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

  // Fetch subjects when class changes
  useEffect(() => {
    if (formData.class) {
      fetchSubjects(formData.class)
      // Reset subject and chapter when class changes
      setFormData(prev => ({ ...prev, subject: "", chapter: "" }))
      setChapters([])
    }
  }, [formData.class])

  // Fetch chapters when subject changes
  useEffect(() => {
    if (formData.subject) {
      fetchChapters(formData.subject)
      // Reset chapter when subject changes
      setFormData(prev => ({ ...prev, chapter: "" }))
    }
  }, [formData.subject])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData({ ...formData, file })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)
    setUploadProgress({ stage: 'preparing', percentage: 0, message: 'Preparing upload...', uploadedSize: 0, totalSize: 0, needsCompression: false })

    try {
      // Validate required fields
      if (!formData.file || !formData.title || !formData.type || !formData.class) {
        alert('Please fill in all required fields and select a file.')
        setUploading(false)
        setUploadProgress({ stage: '', percentage: 0, message: '', uploadedSize: 0, totalSize: 0, needsCompression: false })
        return
      }

      setUploadProgress({ stage: 'validating', percentage: 10, message: 'Validating content...', uploadedSize: 0, totalSize: formData.file?.size || 0, needsCompression: false })

      // Check if video needs compression (> 100MB or certain formats)
      let needsCompression = false
      if (formData.type === 'video' && formData.file) {
        const fileSizeMB = formData.file.size / (1024 * 1024)
        const fileExtension = formData.file.name.split('.').pop()?.toLowerCase()
        needsCompression = fileSizeMB > 100 || !['mp4', 'webm'].includes(fileExtension || '')
      }

      setUploadProgress(prev => ({ ...prev, needsCompression }))

      // Step 1: Handle subject creation/selection
      let subjectId = formData.subject
      if (!subjectId) {
        setUploadProgress(prev => ({ ...prev, stage: 'subject', percentage: 20, message: 'Creating subject...' }))
        const defaultSubjectName = "General"
        const subject = await createSubjectIfNotExists(defaultSubjectName, formData.class)
        if (!subject) {
          throw new Error('Failed to create subject')
        }
        subjectId = subject.id.toString()
      }

      // Step 2: Handle chapter creation/selection
      let chapterId = formData.chapter
      if (!chapterId) {
        setUploadProgress(prev => ({ ...prev, stage: 'chapter', percentage: 30, message: 'Creating chapter...' }))
        const defaultChapterTitle = formData.title
        const chapter = await createChapterIfNotExists(defaultChapterTitle, subjectId)
        if (!chapter) {
          throw new Error('Failed to create chapter')
        }
        chapterId = chapter.id.toString()
      }

      // Step 3: Upload file with progress tracking
      const fileFormData = new FormData()
      fileFormData.append(formData.type, formData.file)
      fileFormData.append('title', formData.title)
      fileFormData.append('description', formData.description || '')
      
      // Add subject for video uploads (required by backend)
      if (formData.type === 'video') {
        const selectedSubject = subjects.find(s => s.id.toString() === subjectId)
        fileFormData.append('subject', selectedSubject?.name || 'General')
      }
      
      // Set initial upload stage
      if (needsCompression) {
        setUploadProgress(prev => ({ ...prev, stage: 'compression', percentage: 40, message: 'Compressing video for optimal upload...' }))
        // Simulate compression progress from 40% to 50%
        setTimeout(() => {
          setUploadProgress(prev => ({ ...prev, stage: 'uploading', percentage: 50, message: 'Starting upload...', uploadedSize: 0 }))
        }, 2000)
      } else {
        setUploadProgress(prev => ({ ...prev, stage: 'uploading', percentage: 40, message: 'Starting upload...', uploadedSize: 0 }))
      }
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      
      // Create XMLHttpRequest for upload progress tracking
      const uploadPromise = new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const uploadedMB = (event.loaded / (1024 * 1024)).toFixed(1)
            const totalMB = (event.total / (1024 * 1024)).toFixed(1)
            const uploadPercentage = Math.round((event.loaded / event.total) * 100)
            
            // Calculate adjusted percentage based on stage
            // If compression needed: 0-40% (prep), 40-50% (compression), 50-90% (upload), 90-100% (content)
            // If no compression: 0-40% (prep), 40-90% (upload), 90-100% (content)
            let adjustedPercentage
            if (needsCompression) {
              // Upload takes 50% to 90% (40% range)
              adjustedPercentage = 50 + (uploadPercentage * 0.4)
            } else {
              // Upload takes 40% to 90% (50% range)
              adjustedPercentage = 40 + (uploadPercentage * 0.5)
            }
            
            setUploadProgress(prev => ({
              ...prev,
              stage: 'uploading',
              percentage: Math.min(90, Math.round(adjustedPercentage)),
              message: `Uploading... ${uploadedMB}MB / ${totalMB}MB`,
              uploadedSize: event.loaded,
              totalSize: event.total
            }))
          }
        })
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText))
          } else {
            reject(new Error('Upload failed'))
          }
        })
        
        xhr.addEventListener('error', () => reject(new Error('Upload failed')))
        
        xhr.open('POST', `${apiUrl}/api/upload/${formData.type}`)
        xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('teacherAccessToken')}`)
        xhr.send(fileFormData)
      })
      
      const uploadResult = await uploadPromise
      
      if (!(uploadResult as any)?.success) {
        throw new Error((uploadResult as any)?.message || 'File upload failed')
      }

      setUploadProgress(prev => ({ ...prev, stage: 'content', percentage: 90, message: 'Creating content record...' }))

      // Step 4: Create content record with YouTube URL (if video)
      const contentData = {
        title: formData.title,
        description: formData.description || "",
        contentType: formData.type,
        fileUrl: (uploadResult as any)?.data?.file?.path || (uploadResult as any)?.data?.file?.embedUrl,
        fileSize: (uploadResult as any)?.data?.file?.size,
        chapterId: parseInt(chapterId),
        duration: formData.type === 'video' ? (uploadResult as any)?.data?.file?.duration : null,
        isFree: true,
        // Add YouTube-specific data if video
        ...(formData.type === 'video' && (uploadResult as any)?.data?.file?.youtubeVideoId && {
          youtubeVideoId: (uploadResult as any).data.file.youtubeVideoId,
          embedUrl: (uploadResult as any).data.file.embedUrl,
          watchUrl: (uploadResult as any).data.file.watchUrl,
          thumbnailUrl: (uploadResult as any).data.file.thumbnailUrl
        })
      }
      
      const contentResponse = await fetch(`${apiUrl}/api/teachers/content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('teacherAccessToken')}`
        },
        body: JSON.stringify(contentData)
      })
      
      if (!contentResponse.ok) {
        throw new Error('Content creation failed')
      }
      
      const contentResult = await contentResponse.json()
      if (!contentResult.success) {
        throw new Error(contentResult.message || 'Content creation failed')
      }

      setUploadProgress(prev => ({ ...prev, stage: 'complete', percentage: 100, message: 'Upload complete!' }))

      // Store uploaded content info and show success modal
      setUploadedContent({
        title: formData.title,
        type: formData.type,
        class: formData.class,
        subject: subjects.find(s => s.id.toString() === subjectId)?.name || "General",
        chapter: chapters.find(c => c.id.toString() === chapterId)?.title || formData.title,
        fileName: formData.file?.name || '',
        // Add YouTube data if available
        ...(formData.type === 'video' && (uploadResult as any)?.data?.file?.youtubeVideoId && {
          youtubeVideoId: (uploadResult as any).data.file.youtubeVideoId,
          youtubeUrl: (uploadResult as any).data.file.watchUrl,
          platform: 'YouTube',
          processingStatus: (uploadResult as any).data.file.processingStatus,
          note: (uploadResult as any).data.note
        }),
        ...(formData.type === 'document' && {
          platform: 'Cloudinary'
        })
      })
      setShowSuccessModal(true)

    } catch (error) {
      console.error('Upload error:', error)
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setUploadProgress({ stage: '', percentage: 0, message: '', uploadedSize: 0, totalSize: 0, needsCompression: false })
    } finally {
      setUploading(false)
    }
  }

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false)
    setUploadedContent(null)
    setUploadProgress({ stage: '', percentage: 0, message: '', uploadedSize: 0, totalSize: 0, needsCompression: false })
    // Reset form
    setFormData({
      title: "",
      description: "",
      type: "",
      class: "",
      subject: "",
      chapter: "",
      file: null,
    })
    // Navigate to dashboard
    router.push('/teacher/dashboard')
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-5 w-5 text-blue-600" />
      case "document":
        return <FileText className="h-5 w-5 text-green-600" />
      default:
        return <Upload className="h-5 w-5" />
    }
  }

  if (!user) return <div>Loading...</div>

  return (
    <>
      {/* Success Modal */}
      {showSuccessModal && uploadedContent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-full">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold">Upload Successful!</h3>
                </div>
                <button
                  onClick={() => {
                    setShowSuccessModal(false)
                    setUploadedContent(null)
                    setUploadProgress({ stage: '', percentage: 0, message: '', uploadedSize: 0, totalSize: 0, needsCompression: false })
                    // Reset form but stay on upload page
                    setFormData({
                      title: "",
                      description: "",
                      type: "",
                      class: "",
                      subject: "",
                      chapter: "",
                      file: null,
                    })
                  }}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors duration-200"
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-300 text-lg">
                  Your content is now live and visible to students!
                </p>
              </div>
              
              {/* Content Details */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    {uploadedContent.type === 'video' ? (
                      <Video className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                      {uploadedContent.title}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {uploadedContent.fileName}
                    </p>
                    {uploadedContent.platform && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        📺 Hosted on {uploadedContent.platform}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* YouTube URL if available */}
                {uploadedContent.youtubeUrl && (
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-4 h-4 bg-red-600 rounded-sm flex items-center justify-center">
                        <span className="text-white text-xs font-bold">▶</span>
                      </div>
                      <span className="text-sm font-medium text-red-800 dark:text-red-200">YouTube Video</span>
                    </div>
                    <p className="text-xs text-red-700 dark:text-red-300 break-all">
                      {uploadedContent.youtubeUrl}
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(uploadedContent.youtubeUrl)
                        alert('YouTube URL copied to clipboard!')
                      }}
                      className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                    >
                      Copy URL
                    </button>
                  </div>
                )}

                {/* Processing Status Info for Videos */}
                {uploadedContent.type === 'video' && uploadedContent.note && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-4 h-4 bg-blue-600 rounded-sm flex items-center justify-center">
                        <span className="text-white text-xs font-bold">ℹ</span>
                      </div>
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Video Quality Info</span>
                    </div>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      {uploadedContent.note}
                    </p>
                    {uploadedContent.processingStatus?.isProcessing && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        🔄 YouTube is optimizing your video for different quality levels. This typically takes 1-2 minutes for small files.
                      </p>
                    )}
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Class:</span>
                    <p className="font-medium text-gray-900 dark:text-white">Class {uploadedContent.class}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Subject:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{uploadedContent.subject}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500 dark:text-gray-400">Chapter:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{uploadedContent.chapter}</p>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleSuccessModalClose}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0"
                >
                  Go to Dashboard
                </Button>
                <Button
                  onClick={() => {
                    setShowSuccessModal(false)
                    setUploadedContent(null)
                    setUploadProgress({ stage: '', percentage: 0, message: '', uploadedSize: 0, totalSize: 0, needsCompression: false })
                    // Reset form but stay on upload page
                    setFormData({
                      title: "",
                      description: "",
                      type: "",
                      class: "",
                      subject: "",
                      chapter: "",
                      file: null,
                    })
                  }}
                  variant="outline"
                  className="flex-1 border-gray-300 hover:bg-gray-50"
                >
                  Upload More
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    <div className="min-h-screen bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      {/* Enhanced Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-green-100 dark:border-gray-700 sticky top-0 z-50 transition-colors duration-300">
        <div className="w-full px-0 py-3 sm:py-4">
          <div className="flex items-center justify-between px-3 sm:px-4">
            {/* Left side - Upload Content */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-green-100 dark:bg-green-800 rounded-lg transition-colors duration-300">
                <Upload className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-300" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Upload Content</h1>
                <p className="text-xs text-gray-600 dark:text-gray-300 hidden sm:block">Share educational resources</p>
              </div>
            </div>
            
            {/* Right side - Back button and Welcome */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/teacher/dashboard">
                <Button variant="outline" size="sm" className="hover:bg-green-50 hover:text-green-600 hover:border-green-200 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2">
                  <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Back to Dashboard</span>
                  <span className="sm:hidden">Back</span>
                </Button>
              </Link>
              <div className="text-right hidden lg:block">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Welcome back,</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">{user?.name || 'Teacher'}</p>
              </div>
            </div>
          </div>
          {/* Mobile welcome message */}
          <div className="mt-2 lg:hidden text-right px-3 sm:px-4">
            <p className="text-xs text-gray-600 dark:text-gray-300">Welcome back, {user?.name || 'Teacher'}</p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-2xl">
        <Card className="border-green-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-green-900">
              <Upload className="h-5 w-5 sm:h-6 sm:w-6" />
              Upload Educational Content
            </CardTitle>
            <CardDescription className="text-green-700 text-sm">Share videos on YouTube and documents on secure storage - completely free!</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">Title</Label>
                <Input
                  id="title"
                  placeholder="Enter content title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the content..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type" className="text-sm font-medium">Content Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger className="border-gray-300 focus:border-green-500 focus:ring-green-500">
                      <SelectValue placeholder="Select content type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4 text-blue-600" />
                          <span className="text-sm">Video Tutorial</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="document">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-green-600" />
                          <span className="text-sm">Study Notes</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="class" className="text-sm font-medium">Class</Label>
                  <Select value={formData.class} onValueChange={(value) => setFormData({ ...formData, class: value })}>
                    <SelectTrigger className="border-gray-300 focus:border-green-500 focus:ring-green-500">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="9">Class 9</SelectItem>
                      <SelectItem value="10">Class 10</SelectItem>
                      <SelectItem value="11">Class 11</SelectItem>
                      <SelectItem value="12">Class 12</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject" className="text-sm font-medium">Subject</Label>
                <Select 
                  value={formData.subject} 
                  onValueChange={(value) => setFormData({ ...formData, subject: value })}
                  disabled={!formData.class || loadingSubjects}
                >
                  <SelectTrigger className="border-gray-300 focus:border-green-500 focus:ring-green-500">
                    <SelectValue placeholder={
                      !formData.class ? "Select class first" :
                      loadingSubjects ? "Loading subjects..." :
                      subjects.length === 0 ? "No subjects available" :
                      "Select subject"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id.toString()}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!formData.class && (
                  <p className="text-xs text-gray-500">Please select a class first to see available subjects</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="chapter" className="text-sm font-medium">Chapter</Label>
                <Select 
                  value={formData.chapter} 
                  onValueChange={(value) => setFormData({ ...formData, chapter: value })}
                  disabled={!formData.subject || loadingChapters}
                >
                  <SelectTrigger className="border-gray-300 focus:border-green-500 focus:ring-green-500">
                    <SelectValue placeholder={
                      !formData.subject ? "Select subject first" :
                      loadingChapters ? "Loading chapters..." :
                      chapters.length === 0 ? "No chapters available - will create new" :
                      "Select chapter (optional)"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {chapters.map((chapter) => (
                      <SelectItem key={chapter.id} value={chapter.id.toString()}>
                        {chapter.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {!formData.subject ? "Please select a subject first" : 
                   "Optional: If no chapter is selected, a new one will be created based on your content title"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file" className="text-sm font-medium">Upload File</Label>
                <div className="border-2 border-dashed border-green-300 rounded-lg p-4 sm:p-6 text-center hover:border-green-400 hover:bg-green-50/50 transition-all duration-300">
                  <input
                    id="file"
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    accept={formData.type === "video" ? "video/*" : ".pdf,.doc,.docx,.txt"}
                    required
                  />
                  <label htmlFor="file" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-2 bg-green-100 rounded-lg">
                        {getTypeIcon(formData.type)}
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {formData.file ? formData.file.name : "Click to upload file"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formData.type === "video" 
                          ? "Videos will be uploaded to YouTube (free hosting) • Supports: MP4, AVI, MKV, MOV" 
                          : "Documents will be uploaded to Cloudinary • Supports: PDF, DOC, DOCX, TXT"}
                      </span>
                    </div>
                  </label>
                </div>
                
                {/* Upload Progress */}
                {uploading && uploadProgress.stage && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span className="text-sm font-medium text-blue-900">{uploadProgress.message}</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${uploadProgress.percentage}%` }}
                      ></div>
                    </div>
                    <div className="mt-2 flex justify-between items-center text-xs text-blue-700">
                      <span>{uploadProgress.percentage}% complete</span>
                      {uploadProgress.stage === 'uploading' && uploadProgress.totalSize > 0 && (
                        <span>
                          {(uploadProgress.uploadedSize / (1024 * 1024)).toFixed(1)}MB / {(uploadProgress.totalSize / (1024 * 1024)).toFixed(1)}MB
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-blue-700">
                      {uploadProgress.stage === 'compression' && '🔄 Compressing video for optimal upload...'}
                      {uploadProgress.stage === 'uploading' && '📤 Uploading to server...'}
                      {uploadProgress.stage === 'content' && '📝 Finalizing content record...'}
                      {uploadProgress.stage === 'complete' && '✅ Upload successful!'}
                      {uploadProgress.stage === 'preparing' && '⏳ Preparing upload...'}
                      {uploadProgress.stage === 'validating' && '🔍 Validating content...'}
                      {uploadProgress.stage === 'subject' && '📚 Setting up subject...'}
                      {uploadProgress.stage === 'chapter' && '📖 Setting up chapter...'}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
                <Button 
                  type="submit" 
                  disabled={uploading} 
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {uploadProgress.stage === 'compression' ? 'Compressing...' : 
                       uploadProgress.stage === 'uploading' ? 'Uploading...' :
                       uploadProgress.message || 'Processing...'}
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
                <Link href="/teacher/dashboard" className="flex-1 sm:flex-none">
                  <Button type="button" variant="outline" className="w-full hover:bg-gray-50" disabled={uploading}>
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  )
}
