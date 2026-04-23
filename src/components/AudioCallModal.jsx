import React, { useEffect, useRef, useState } from 'react';
import { useAudioCallContext } from '../contexts/AudioCallContext';
import { PhoneOff, Mic, MicOff, Volume2, VolumeX, User } from 'lucide-react';

export default function AudioCallModal() {
  const { callStatus, remoteStream, endCall, toggleMute, isMuted, incomingCall } = useAudioCallContext();
  const remoteAudioRef = useRef(null);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Attach remote stream to audio element
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(err => console.warn('Audio play error:', err));
    }
  }, [remoteStream]);

  // Call duration timer
  useEffect(() => {
    let timer;
    if (callStatus === 'active') {
      timer = setInterval(() => setCallDuration(d => d + 1), 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [callStatus]);

  // Speaker toggle — try setSinkId where supported
  const handleSpeakerToggle = async () => {
    const audio = remoteAudioRef.current;
    if (!audio) return;
    const next = !isSpeaker;
    setIsSpeaker(next);
    // setSinkId is supported in Chrome/Edge — routes to default speaker vs earpiece
    if (typeof audio.setSinkId === 'function') {
      try {
        if (next) {
          // Force speaker (default media output)
          await audio.setSinkId('');
        } else {
          // Try to find communications device (earpiece)
          const devices = await navigator.mediaDevices.enumerateDevices();
          const earpiece = devices.find(d => d.kind === 'audiooutput' && d.label.toLowerCase().includes('earpiece'));
          await audio.setSinkId(earpiece?.deviceId || '');
        }
      } catch (err) {
        console.warn('setSinkId not supported:', err);
      }
    }
  };

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (callStatus === 'idle' || (callStatus === 'ringing' && incomingCall)) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1100,
      background: 'linear-gradient(160deg, #12121e 0%, #1a1a2e 50%, #16213e 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      animation: 'fadeIn 0.4s ease-out'
    }}>
      {/* Hidden audio element — playsInline is KEY for Android earpiece routing */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{ display: 'none' }}
      />

      {/* Avatar with pulse ring */}
      <div style={{ position: 'relative', marginBottom: '2rem' }}>
        <div className="pulse-ring-outer" />
        <div className="pulse-ring-inner" />
        <div style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #8839ef, #04a5e5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 1,
          boxShadow: '0 0 40px rgba(136, 57, 239, 0.4)',
        }}>
          <User size={60} color="white" />
        </div>
      </div>

      {/* Status */}
      <h2 style={{ color: 'white', margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: 700 }}>
        {callStatus === 'ringing' ? 'Calling...' : 'Connected'}
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '3rem', fontSize: '1rem', fontFamily: 'monospace' }}>
        {callStatus === 'active' ? formatDuration(callDuration) : 'Waiting for answer...'}
      </p>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
        {/* Mute */}
        <button
          onClick={toggleMute}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: isMuted ? 'rgba(243,139,168,0.2)' : 'rgba(255,255,255,0.1)',
            border: `2px solid ${isMuted ? '#f38ba8' : 'rgba(255,255,255,0.2)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          {isMuted ? <MicOff color="#f38ba8" size={22} /> : <Mic color="white" size={22} />}
          <span style={{ fontSize: '0.6rem', color: isMuted ? '#f38ba8' : 'rgba(255,255,255,0.6)' }}>
            {isMuted ? 'Muted' : 'Mute'}
          </span>
        </button>

        {/* End Call */}
        <button
          onClick={endCall}
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: '#f38ba8',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(243,139,168,0.4)',
            transition: 'transform 0.15s',
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <PhoneOff color="white" size={28} />
        </button>

        {/* Speaker toggle */}
        <button
          onClick={handleSpeakerToggle}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: isSpeaker ? 'rgba(4,165,229,0.2)' : 'rgba(255,255,255,0.1)',
            border: `2px solid ${isSpeaker ? '#04a5e5' : 'rgba(255,255,255,0.2)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          {isSpeaker ? <Volume2 color="#04a5e5" size={22} /> : <VolumeX color="white" size={22} />}
          <span style={{ fontSize: '0.6rem', color: isSpeaker ? '#04a5e5' : 'rgba(255,255,255,0.6)' }}>
            Speaker
          </span>
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .pulse-ring-outer {
          position: absolute;
          inset: -20px;
          border: 2px solid rgba(136, 57, 239, 0.3);
          border-radius: 50%;
          animation: pulseOut 2s ease-out infinite;
        }
        .pulse-ring-inner {
          position: absolute;
          inset: -10px;
          border: 2px solid rgba(136, 57, 239, 0.5);
          border-radius: 50%;
          animation: pulseOut 2s ease-out infinite 0.5s;
        }
        @keyframes pulseOut {
          0%   { transform: scale(0.95); opacity: 0.6; }
          70%  { transform: scale(1.15); opacity: 0; }
          100% { transform: scale(0.95); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
