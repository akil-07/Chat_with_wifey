import React from 'react';
import { useAudioCallContext } from '../contexts/AudioCallContext';
import { Phone, PhoneOff, User } from 'lucide-react';

export default function IncomingCallBanner() {
  const { incomingCall, answerCall, rejectCall, callStatus } = useAudioCallContext();

  if (!incomingCall || callStatus !== 'ringing') return null;

  return (
    <>
      {/* Dimmed backdrop */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 999,
        backdropFilter: 'blur(4px)',
      }} />

      {/* Banner — anchored to bottom so browser address bar never covers it */}
      <div style={{
        position: 'fixed',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        width: 'calc(100% - 2rem)',
        maxWidth: '400px',
        background: 'rgba(26, 27, 38, 0.98)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(136, 57, 239, 0.4)',
        borderRadius: '1.25rem',
        padding: '1.25rem',
        boxShadow: '0 -4px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(136,57,239,0.1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.25rem',
        animation: 'slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        {/* Caller info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', width: '100%' }}>
          {/* Pulsing avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              position: 'absolute',
              inset: '-6px',
              borderRadius: '50%',
              border: '2px solid rgba(136,57,239,0.5)',
              animation: 'ringPulse 1.4s ease-out infinite',
            }} />
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #8839ef, #04a5e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {incomingCall.callerProfile?.avatar_url ? (
                <img
                  src={incomingCall.callerProfile.avatar_url}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <User color="white" size={26} />
              )}
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '2px' }}>
              Incoming Voice Call
            </p>
            <h4 style={{ margin: 0, color: 'white', fontSize: '1.1rem', fontWeight: 700 }}>
              {incomingCall.callerProfile?.username || 'Unknown'}
            </h4>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '1.5rem', width: '100%', justifyContent: 'center' }}>
          {/* Decline */}
          <button
            onClick={() => rejectCall(incomingCall.id)}
            style={{
              flex: 1,
              maxWidth: '140px',
              height: '52px',
              borderRadius: '1rem',
              background: 'rgba(243,139,168,0.15)',
              border: '1.5px solid #f38ba8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              color: '#f38ba8',
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'all 0.15s',
            }}
          >
            <PhoneOff size={18} />
            Decline
          </button>

          {/* Accept */}
          <button
            onClick={() => answerCall(incomingCall)}
            style={{
              flex: 1,
              maxWidth: '140px',
              height: '52px',
              borderRadius: '1rem',
              background: 'linear-gradient(135deg, #40b081, #10b981)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.9rem',
              boxShadow: '0 4px 15px rgba(16,185,129,0.4)',
              transition: 'all 0.15s',
            }}
          >
            <Phone size={18} />
            Accept
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translate(-50%, 100%); opacity: 0; }
          to   { transform: translate(-50%, 0);    opacity: 1; }
        }
        @keyframes ringPulse {
          0%   { transform: scale(1);    opacity: 0.7; }
          70%  { transform: scale(1.35); opacity: 0; }
          100% { transform: scale(1);    opacity: 0; }
        }
      `}</style>
    </>
  );
}
