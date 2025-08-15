'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UploadProgress {
  uploadId: string;
  userId: string;
  phase: 'receiving' | 'processing' | 'compressing' | 'uploading' | 'completed' | 'error';
  progress: number; // 0-100
  bytesUploaded: number;
  totalBytes: number;
  speed: number; // bytes per second
  eta: number; // seconds remaining
  startTime: number;
  fileName: string;
  fileType: string;
  message?: string;
  error?: string;
}

interface UseSocketProps {
  serverURL?: string;
  autoConnect?: boolean;
}

export function useSocket({ 
  serverURL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000',
  autoConnect = true 
}: UseSocketProps = {}) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (!autoConnect) return;

    // Create socket connection
    socketRef.current = io(serverURL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    // Connection event handlers
    socket.on('connect', () => {
      // Socket connected
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on('disconnect', (reason) => {
      // Socket disconnected
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 Socket connection error:', error);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        // Cleaning up socket connection
        socket.disconnect();
      }
    };
  }, [serverURL, autoConnect]);

  const connect = () => {
    if (socketRef.current && !socketRef.current.connected) {
      socketRef.current.connect();
    }
  };

  const disconnect = () => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.disconnect();
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    connect,
    disconnect,
  };
}

interface UseUploadProgressProps {
  uploadId?: string;
  userId?: string;
  onProgress?: (progress: UploadProgress) => void;
  onComplete?: (progress: UploadProgress) => void;
  onError?: (progress: UploadProgress) => void;
}

export function useUploadProgress({
  uploadId,
  userId,
  onProgress,
  onComplete,
  onError,
}: UseUploadProgressProps = {}) {
  const { socket, isConnected } = useSocket();
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    if (!socket || !isConnected || !uploadId || !userId) return;

    // Join the upload progress room
    socket.emit('join-upload-progress', { uploadId, userId });
    setIsTracking(true);

    // Listen for progress updates
    const handleProgress = (progressData: UploadProgress) => {
      // Upload progress update received
      setProgress(progressData);
      
      if (onProgress) {
        onProgress(progressData);
      }

      if (progressData.phase === 'completed' && onComplete) {
        onComplete(progressData);
      }

      if (progressData.phase === 'error' && onError) {
        onError(progressData);
      }
    };

    socket.on('upload-progress', handleProgress);

    // Cleanup
    return () => {
      socket.off('upload-progress', handleProgress);
      socket.emit('leave-upload-progress', { uploadId });
      setIsTracking(false);
    };
  }, [socket, isConnected, uploadId, userId, onProgress, onComplete, onError]);

  const joinProgress = (newUploadId: string, newUserId: string) => {
    if (!socket || !isConnected) return;

    // Leave current room if tracking
    if (isTracking && uploadId) {
      socket.emit('leave-upload-progress', { uploadId });
    }

    // Join new room
    socket.emit('join-upload-progress', { uploadId: newUploadId, userId: newUserId });
    setIsTracking(true);
  };

  const leaveProgress = () => {
    if (!socket || !uploadId) return;
    
    socket.emit('leave-upload-progress', { uploadId });
    setIsTracking(false);
    setProgress(null);
  };

  return {
    progress,
    isTracking,
    joinProgress,
    leaveProgress,
    isConnected,
  };
}

// Utility functions for formatting progress data
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const formatSpeed = (bytesPerSecond: number): string => {
  return formatBytes(bytesPerSecond) + '/s';
};

export const formatTime = (seconds: number): string => {
  if (!seconds || seconds === Infinity) return '--';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

export const getPhaseMessage = (phase: UploadProgress['phase']): string => {
  switch (phase) {
    case 'receiving':
      return 'Receiving file...';
    case 'processing':
      return 'Processing file...';
    case 'compressing':
      return 'Compressing video...';
    case 'uploading':
      return 'Uploading to server...';
    case 'completed':
      return 'Upload completed!';
    case 'error':
      return 'Upload failed';
    default:
      return 'Processing...';
  }
};

export const getPhaseColor = (phase: UploadProgress['phase']): string => {
  switch (phase) {
    case 'receiving':
      return 'text-blue-600';
    case 'processing':
      return 'text-yellow-600';
    case 'compressing':
      return 'text-orange-600';
    case 'uploading':
      return 'text-purple-600';
    case 'completed':
      return 'text-green-600';
    case 'error':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};
