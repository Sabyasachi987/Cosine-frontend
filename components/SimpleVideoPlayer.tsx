"use client"

import React from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import YouTubePlayer from './YouTubePlayer'
import { Button } from "@/components/ui/button"

interface VideoContent {
  id: number
  title: string
  description: string
  contentType: "video"
  fileUrl: string
  duration?: number
  youtubeVideoId?: string
  embedUrl?: string
  watchUrl?: string
  thumbnailUrl?: string
  teacher: {
    firstName: string
    lastName: string
  }
  createdAt: string
}

interface SimpleVideoPlayerProps {
  content: VideoContent
  allContent: VideoContent[]
  onClose: () => void
  onNext?: () => void
  onPrevious?: () => void
}

const SimpleVideoPlayer: React.FC<SimpleVideoPlayerProps> = ({
  content,
  allContent,
  onClose,
  onNext,
  onPrevious
}) => {
  const currentIndex = allContent.findIndex(item => item.id === content.id)
  const hasNext = currentIndex < allContent.length - 1
  const hasPrevious = currentIndex > 0

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header with controls */}
      <div className="flex items-center justify-between p-4 bg-black bg-opacity-90">
        <div className="flex items-center space-x-4">
          {hasPrevious && onPrevious && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrevious}
              className="text-white hover:bg-white/20"
            >
              <ChevronLeft className="h-5 w-5" />
              Previous
            </Button>
          )}
          
          {hasNext && onNext && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onNext}
              className="text-white hover:bg-white/20"
            >
              Next
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}
        </div>

        <div className="flex-1 text-center">
          <h2 className="text-white text-lg font-medium truncate px-4">
            {content.title}
          </h2>
          <p className="text-gray-300 text-sm">
            by {content.teacher.firstName} {content.teacher.lastName}
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-white hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Video Player */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-6xl">
          {content.youtubeVideoId ? (
            <YouTubePlayer
              videoId={content.youtubeVideoId}
              title={content.title}
              thumbnail={content.thumbnailUrl}
              autoplay={true}
              controls={true}
              modestBranding={false} // Show YouTube branding for better controls
              className="w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-64 bg-gray-800 rounded-lg">
              <p className="text-white">Video not available</p>
            </div>
          )}
        </div>
      </div>

      {/* Video Description */}
      {content.description && (
        <div className="p-4 bg-gray-900 max-h-32 overflow-y-auto">
          <p className="text-gray-300 text-sm">{content.description}</p>
        </div>
      )}
    </div>
  )
}

export default SimpleVideoPlayer
