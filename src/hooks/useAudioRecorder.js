import { useState, useRef, useCallback } from 'react';

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
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
        // Only create blob if there's actual data (not cancelled)
        if (audioChunksRef.current.length > 0) {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            setAudioUrl(URL.createObjectURL(audioBlob));
        }
      };

      mediaRecorder.start();
    } catch (err) {
      console.error('Failed to start recording:', err);
      // Fallback for browsers without webm support (e.g. Safari sometimes)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream); // Let browser choose mimeType
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
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp4' }); // or webm/mp4
              setAudioUrl(URL.createObjectURL(audioBlob));
          }
        };
        mediaRecorder.start();
      } catch (innerErr) {
        alert('Microphone recording permissions denied or not supported.');
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
      // Clear out the chunks so it doesn't create a valid blob
      audioChunksRef.current = []; 
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setRecordingTime(0);
      setAudioUrl(null);
    }
  }, []);

  const getAudioBlob = useCallback(() => {
    if (audioChunksRef.current.length > 0) {
      // It is safer to determine the type dynamically, but audio/webm is mostly supported or falls back.
      return new Blob(audioChunksRef.current, { type: 'audio/webm' }); 
    }
    return null;
  }, []);

  const resetRecordingState = useCallback(() => {
     setAudioUrl(null);
     audioChunksRef.current = [];
     setRecordingTime(0);
  }, []);

  return {
    isRecording,
    recordingTime,
    audioUrl,
    startRecording,
    stopRecording,
    cancelRecording,
    getAudioBlob,
    resetRecordingState
  };
}
