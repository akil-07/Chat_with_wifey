import React, { useEffect, useRef } from 'react';
import { useAudioCallContext } from '../contexts/AudioCallContext';
import { PhoneOff, Mic, MicOff, User } from 'lucide-react';

export default function AudioCallModal() {
  const { callStatus, remoteStream, endCall, toggleMute, isMuted, incomingCall } = useAudioCallContext();
  const remoteAudioRef = useRef(null);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (callStatus === 'idle' || (callStatus === 'ringing' && incomingCall)) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1100,
      background: 'rgba(10, 11, 18, 0.95)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      animation: 'fadeIn 0.4s ease-out'
    }}>
      <audio ref={remoteAudioRef} autoPlay />

      <div style={{
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        background: 'var(--primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '2rem',
        boxShadow: '0 0 50px rgba(136, 57, 239, 0.3)',
        position: 'relative'
      }}>
        {/* Pulsing ring animation */}
        <div className="pulse-ring" />
        <User size={60} color="white" />
      </div>

      <h2 style={{ color: 'white', margin: '0 0 0.5rem', fontSize: '1.5rem' }}>
        {callStatus === 'ringing' ? 'Calling...' : 'In Call'}
      </h2>
      <p style={{ color: 'var(--muted-foreground)', marginBottom: '3rem' }}>
        {callStatus === 'active' ? 'Connected' : 'Connecting...'}
      </p>

      <div style={{ display: 'flex', gap: '2rem' }}>
        <button 
          onClick={toggleMute}
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: isMuted ? 'var(--destructive)' : 'rgba(255,255,255,0.1)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {isMuted ? <MicOff color="white" /> : <Mic color="white" />}
        </button>

        <button 
          onClick={endCall}
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--destructive)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 5px 15px rgba(243, 139, 168, 0.3)'
          }}
        >
          <PhoneOff color="white" />
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .pulse-ring {
          position: absolute;
          inset: -10px;
          border: 2px solid var(--primary);
          border-radius: 50%;
          animation: pulse 2s infinite;
          opacity: 0;
        }
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.5; }
          70% { transform: scale(1.2); opacity: 0; }
          100% { transform: scale(0.95); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
