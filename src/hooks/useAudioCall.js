import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, doc, setDoc, updateDoc, onSnapshot, 
  addDoc, deleteDoc, getDocs, query, where, serverTimestamp 
} from 'firebase/firestore';

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

export function useAudioCall(userId) {
  const [pc, setPc] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callId, setCallId] = useState(null);
  const [callStatus, setCallStatus] = useState('idle'); // idle, ringing, active, ended
  const [isMuted, setIsMuted] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (pc) {
        pc.close();
      }
    };
  }, [localStream, pc]);

  // Listen for incoming calls — only filter by calleeId (single field, no composite index needed)
  // Status is filtered in JavaScript below
  useEffect(() => {
    if (!userId || !db) return;

    const q = query(
      collection(db, 'calls'),
      where('calleeId', '==', userId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            // Filter status in JS — avoids needing a Firestore composite index
            if (data.status === 'ringing') {
              setIncomingCall({ id: change.doc.id, ...data });
              setCallStatus('ringing');
            }
          }
          if (change.type === 'modified') {
            const data = change.doc.data();
            // If the call we're ringing for was rejected/ended remotely
            if (data.status === 'ended' || data.status === 'rejected') {
              setIncomingCall(null);
              setCallStatus('idle');
            }
          }
        });
      },
      (error) => {
        // Silently handle permission errors — don't crash the app
        console.warn('Calls listener error (check Firestore rules):', error.code, error.message);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const setupPc = useCallback(async () => {
    const peerConnection = new RTCPeerConnection(servers);
    // Voice-call constraints: these hint to Android to use earpiece instead of speaker
    const local = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
      video: false
    });

    local.getTracks().forEach((track) => {
      peerConnection.addTrack(track, local);
    });

    peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else {
        const inboundStream = new MediaStream();
        inboundStream.addTrack(event.track);
        setRemoteStream(inboundStream);
      }
    };

    setPc(peerConnection);
    setLocalStream(local);

    return { peerConnection, local };
  }, []);

  const startCall = async (calleeId, callerProfile) => {
    const { peerConnection, local } = await setupPc();
    
    const callDoc = doc(collection(db, 'calls'));
    const callerCandidates = collection(callDoc, 'callerCandidates');
    const calleeCandidates = collection(callDoc, 'calleeCandidates');

    setCallId(callDoc.id);

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(callerCandidates, event.candidate.toJSON());
      }
    };

    const offerDescription = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await setDoc(callDoc, { 
      callerId: userId, 
      calleeId, 
      offer, 
      status: 'ringing',
      callerProfile,
      createdAt: serverTimestamp() 
    });

    setCallStatus('ringing');
    const candidateQueue = [];

    // Listen for callee ICE candidates immediately, queue if remote description not ready
    onSnapshot(calleeCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidateData = change.doc.data();
          const candidate = new RTCIceCandidate(candidateData);
          if (peerConnection.remoteDescription) {
            peerConnection.addIceCandidate(candidate).catch(e => console.error('Error adding ICE candidate', e));
          } else {
            candidateQueue.push(candidate);
          }
        }
      });
    });

    // Listen for remote answer
    onSnapshot(callDoc, async (snapshot) => {
      const data = snapshot.data();
      if (peerConnection.signalingState === 'have-local-offer' && data?.answer) {
        try {
          const answerDescription = new RTCSessionDescription(data.answer);
          await peerConnection.setRemoteDescription(answerDescription);
          setCallStatus('active');
          
          // Process any queued candidates
          candidateQueue.forEach(candidate => {
            peerConnection.addIceCandidate(candidate).catch(e => console.error('Error adding queued ICE candidate', e));
          });
          candidateQueue.length = 0; // Clear queue
        } catch (err) {
          console.error('Error setting remote description:', err);
        }
      }
      if (data?.status === 'ended' || data?.status === 'rejected') {
        cleanupCall();
      }
    });
  };

  const answerCall = async (incomingCallData) => {
    const { peerConnection, local } = await setupPc();
    const callDoc = doc(db, 'calls', incomingCallData.id);
    const callerCandidates = collection(callDoc, 'callerCandidates');
    const calleeCandidates = collection(callDoc, 'calleeCandidates');

    setCallId(incomingCallData.id);
    setIncomingCall(null);

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(calleeCandidates, event.candidate.toJSON());
      }
    };

    const offerDescription = incomingCallData.offer;
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offerDescription));

    const answerDescription = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    await updateDoc(callDoc, { answer, status: 'active' });
    setCallStatus('active');

    // Listen for caller ICE candidates
    onSnapshot(callerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          peerConnection.addIceCandidate(new RTCIceCandidate(data)).catch(e => console.error('Error adding ICE candidate', e));
        }
      });
    });

    // Listen for call termination
    onSnapshot(callDoc, (snapshot) => {
      const data = snapshot.data();
      if (data?.status === 'ended') {
        cleanupCall();
      }
    });
  };

  const rejectCall = async (incomingCallId) => {
    const callDoc = doc(db, 'calls', incomingCallId);
    await updateDoc(callDoc, { status: 'rejected', endedAt: serverTimestamp() });
    setIncomingCall(null);
    setCallStatus('idle');
  };

  const endCall = async () => {
    if (callId) {
      const callDoc = doc(db, 'calls', callId);
      await updateDoc(callDoc, { status: 'ended', endedAt: serverTimestamp() });
    }
    cleanupCall();
  };

  const cleanupCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (pc) {
      pc.close();
    }
    setPc(null);
    setLocalStream(null);
    setRemoteStream(null);
    setCallId(null);
    setCallStatus('idle');
    setIncomingCall(null);
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  return {
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    localStream,
    remoteStream,
    callStatus,
    isMuted,
    incomingCall,
    callId
  };
}
