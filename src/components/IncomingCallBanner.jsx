import React from 'react';
import { useAudioCallContext } from '../contexts/AudioCallContext';
import { Phone, PhoneOff, User } from 'lucide-react';

export default function IncomingCallBanner() {
  const { incomingCall, answerCall, rejectCall, callStatus } = useAudioCallContext();

  if (!incomingCall || callStatus !== 'ringing') return null;

  return (
    <div style={{
      position: 'fixed',
      top: '1rem',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      width: '90%',
      maxWidth: '400px',
      background: 'rgba(26, 27, 38, 0.95)',
      backdropFilter: 'blur(10px)',
      border: '1px solid var(--border)',
      borderRadius: '1rem',
      padding: '1rem',
      boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      animation: 'slideDown 0.3s ease-out'
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: 'var(--primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}>
        {incomingCall.callerProfile?.avatar_url ? (
          <img src={incomingCall.callerProfile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <User color="white" />
        )}
      </div>

      <div style={{ flex: 1 }}>
        <h4 style={{ margin: 0, color: 'white', fontSize: '1rem' }}>
          {incomingCall.callerProfile?.username || 'Unknown Caller'}
        </h4>
        <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>
          Incoming audio call...
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button 
          onClick={() => rejectCall(incomingCall.id)}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'var(--destructive)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <PhoneOff size={20} color="white" />
        </button>
        <button 
          onClick={() => answerCall(incomingCall)}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: '#10b981',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <Phone size={20} color="white" />
        </button>
      </div>

      <style>{`
        @keyframes slideDown {
          from { transform: translate(-50%, -100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
