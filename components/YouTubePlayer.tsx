import React, { useState } from 'react';
import { Play, Loader2, AlertCircle } from 'lucide-react';

interface YouTubePlayerProps {
  videoId: string;
  title: string;
  thumbnail?: string;
  className?: string;
  autoplay?: boolean;
  controls?: boolean;
  modestBranding?: boolean;
  onVideoEnd?: () => void; // Callback when video ends
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  title,
  thumbnail,
  className = '',
  autoplay = false,
  controls = true,
  modestBranding = true,
  onVideoEnd
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(autoplay);

  if (!videoId) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <div className="text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          <p className="text-gray-500">Video not available</p>
        </div>
      </div>
    );
  }

  // Construct YouTube embed URL with optimal parameters for students
  const embedUrl = `https://www.youtube.com/embed/${videoId}?${new URLSearchParams({
    modestbranding: modestBranding ? '1' : '0',
    rel: '0', // Don't show related videos from other channels
    showinfo: '0', // Don't show video info
    controls: controls ? '1' : '0',
    autoplay: autoplay ? '1' : '0',
    enablejsapi: '1', // Enable JavaScript API
    origin: window.location.origin, // Set origin for security
    fs: '1', // Enable fullscreen
    hl: 'en', // Set language to English
    cc_load_policy: '1', // Show captions by default
    iv_load_policy: '3', // Hide video annotations
    playsinline: '1', // Better mobile experience
    widget_referrer: window.location.origin,
    loop: '0', // Don't loop the video
    disablekb: '0', // Keep keyboard controls enabled
    start: '0' // Start from beginning
  }).toString()}`;

  // Fallback thumbnail if not provided
  const thumbnailUrl = thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  const handlePlayClick = () => {
    setIsPlaying(true);
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Simple video end detection
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.youtube.com') return;
      
      try {
        const data = JSON.parse(event.data);
        // Simple check for video ended (playerState 0)
        if (data.info && data.info.playerState === 0 && onVideoEnd) {
          onVideoEnd();
        }
      } catch (e) {
        // Ignore parsing errors
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onVideoEnd]);

  // Reset when video changes
  React.useEffect(() => {
    setIsLoading(true);
  }, [videoId]);

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-64 bg-red-50 rounded-lg border border-red-200">
        <div className="text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-400 mb-2" />
          <p className="text-red-600 font-medium">Failed to load video</p>
          <p className="text-red-500 text-sm mt-1">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
      {/* Aspect ratio container */}
      <div className="relative aspect-video">
        {!isPlaying && !autoplay ? (
          // Custom thumbnail with play button
          <div className="relative h-full cursor-pointer group" onClick={handlePlayClick}>
            <img
              src={thumbnailUrl}
              alt={title}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to medium quality thumbnail
                e.currentTarget.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
              }}
            />
            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 group-hover:bg-opacity-40 transition-all duration-200">
              <div className="bg-red-600 hover:bg-red-700 rounded-full p-4 transform group-hover:scale-110 transition-transform duration-200">
                <Play className="h-8 w-8 text-white fill-current" />
              </div>
            </div>
            {/* Video title overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
              <h3 className="text-white font-medium text-lg leading-tight">{title}</h3>
            </div>
          </div>
        ) : (
          // YouTube iframe player
          <div className="relative h-full">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
            )}
            <iframe
              src={embedUrl}
              title={title}
              className="w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              style={{ border: 'none' }}
            />
          </div>
        )}
      </div>

      {/* Video information */}
      {isPlaying && (
        <div className="absolute top-2 left-2 right-2">
          <div className="bg-black bg-opacity-70 rounded px-3 py-1">
            <p className="text-white text-sm font-medium truncate">{title}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default YouTubePlayer;

// Enhanced version with additional features
export const YouTubePlayerAdvanced: React.FC<YouTubePlayerProps & {
  onPlay?: () => void;
  onPause?: () => void;
  onEnd?: () => void;
  playlist?: string[];
  currentTime?: number;
  duration?: number;
}> = ({
  videoId,
  title,
  thumbnail,
  className = '',
  autoplay = false,
  controls = true,
  modestBranding = true,
  onPlay,
  onPause,
  onEnd,
  playlist,
}) => {
  const [player, setPlayer] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);

  // Enhanced embed URL with playlist support
  const embedUrl = `https://www.youtube.com/embed/${videoId}?${new URLSearchParams({
    modestbranding: modestBranding ? '1' : '0',
    rel: '0', // Don't show related videos from other channels
    showinfo: '0', // Don't show video info
    controls: controls ? '1' : '0',
    autoplay: autoplay ? '1' : '0',
    enablejsapi: '1', // Enable JavaScript API
    origin: window.location.origin, // Set origin for security
    loop: '0', // Don't loop the video
    disablekb: '0', // Keep keyboard controls enabled
    ...(playlist && { playlist: playlist.join(',') })
  }).toString()}`;

  // YouTube Player API integration (if needed)
  React.useEffect(() => {
    // Load YouTube Player API if needed for advanced controls
    if (!(window as any).YT) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(script);
    }
  }, []);

  return (
    <YouTubePlayer
      videoId={videoId}
      title={title}
      thumbnail={thumbnail}
      className={className}
      autoplay={autoplay}
      controls={controls}
      modestBranding={modestBranding}
    />
  );
};
