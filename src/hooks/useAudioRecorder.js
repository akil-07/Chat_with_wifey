import { useState, useRef, useCallback } from 'react';

// Detect the best supported audio MIME type for this device/browser
function getSupportedMimeType() {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',           // Android WebView & Safari
    'audio/ogg;codecs=opus',
    'audio/ogg',
    '',                    // Let browser decide (last resort)
  ];
  for (const type of types) {
    if (type === '' || MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlobMime, setAudioBlobMime] = useState('audio/webm');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const mimeTypeRef = useRef('audio/webm');

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Pick the best MIME type this device actually supports
      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;

      const options = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstart = () => {
        setIsRecording(true);
        setRecordingTime(0);
        timerRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
      };

      mediaRecorder.onstop = () => {
        setIsRecording(false);
        clearInterval(timerRef.current);
        if (audioChunksRef.current.length > 0) {
          // Use the actual mimeType the recorder used, not hardcoded
          const actualMime = mimeTypeRef.current || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: actualMime });
          setAudioBlobMime(actualMime);
          setAudioUrl(URL.createObjectURL(audioBlob));
        }
      };

      mediaRecorder.onerror = (err) => {
        console.error('MediaRecorder error:', err);
        clearInterval(timerRef.current);
        setIsRecording(false);
      };

      mediaRecorder.start();
    } catch (err) {
      console.error('Failed to start recording:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        alert('Microphone permission denied. Please allow microphone access and try again.');
      } else if (err.name === 'NotFoundError') {
        alert('No microphone found on this device.');
      } else {
        alert('Could not start recording: ' + err.message);
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // Clear chunks BEFORE stopping so onstop creates no blob
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      clearInterval(timerRef.current);
      setRecordingTime(0);
      setAudioUrl(null);
    }
  }, []);

  const getAudioBlob = useCallback(() => {
    if (audioChunksRef.current.length > 0) {
      // Use the actual mimeType recorded, not hardcoded audio/webm
      const actualMime = mimeTypeRef.current || 'audio/webm';
      return new Blob(audioChunksRef.current, { type: actualMime });
    }
    return null;
  }, []);

  const resetRecordingState = useCallback(() => {
    setAudioUrl(null);
    audioChunksRef.current = [];
    setRecordingTime(0);
    setAudioBlobMime('audio/webm');
  }, []);

  return {
    isRecording,
    recordingTime,
    audioUrl,
    audioBlobMime,   // exported so sendAudio() can pick the right file extension
    startRecording,
    stopRecording,
    cancelRecording,
    getAudioBlob,
    resetRecordingState,
  };
}
