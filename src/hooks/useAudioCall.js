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

  // Listen for incoming calls
  useEffect(() => {
    if (!userId || !db) return;

    const q = query(
      collection(db, 'calls'),
      where('calleeId', '==', userId),
      where('status', '==', 'ringing')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          setIncomingCall({ id: change.doc.id, ...change.doc.data() });
          setCallStatus('ringing');
        }
      });
    });

    return () => unsubscribe();
  }, [userId]);

  const setupPc = useCallback(async () => {
    const peerConnection = new RTCPeerConnection(servers);
    const local = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const remote = new MediaStream();

    local.getTracks().forEach((track) => {
      peerConnection.addTrack(track, local);
    });

    peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remote.addTrack(track);
      });
    };

    setPc(peerConnection);
    setLocalStream(local);
    setRemoteStream(remote);

    return { peerConnection, local, remote };
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

    // Listen for remote answer
    onSnapshot(callDoc, (snapshot) => {
      const data = snapshot.data();
      if (!peerConnection.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        peerConnection.setRemoteDescription(answerDescription);
        setCallStatus('active');
      }
      if (data?.status === 'ended' || data?.status === 'rejected') {
        cleanupCall();
      }
    });

    // Listen for callee ICE candidates
    onSnapshot(calleeCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          peerConnection.addIceCandidate(new RTCIceCandidate(data));
        }
      });
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
          peerConnection.addIceCandidate(new RTCIceCandidate(data));
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
