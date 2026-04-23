import { useState, useEffect, useRef } from 'react'
import { db, storage } from '../lib/firebase'
import { collection, query, where, onSnapshot, getDocs, doc, setDoc, updateDoc, writeBatch, deleteDoc, arrayUnion } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { useAuth } from '../contexts/AuthContext'
import { Send, Paperclip, X, FileText, Loader2, Trash2, ArrowLeft, Image, Camera, Mic, Square, Phone } from 'lucide-react'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import MessageBubble from './MessageBubble'
import TypingIndicator from './TypingIndicator'
import UserAvatar from './UserAvatar'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera'
import { useAudioCallContext } from '../contexts/AudioCallContext'

export default function ChatWindow({ conversation, isOnline, usersPresence, isMobile, onBack }) {
  // ... (state and effects remain the same)
  const { user, profile } = useAuth()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [members, setMembers] = useState([])
  const [typingUsers, setTypingUsers] = useState([])
  const [filePreview, setFilePreview] = useState(null)
  const [fileObj, setFileObj] = useState(null)
  const [loadingMsgs, setLoadingMsgs] = useState(true)
  const { isRecording, recordingTime, audioUrl, audioBlobMime, startRecording, stopRecording, cancelRecording, getAudioBlob, resetRecordingState } = useAudioRecorder()
  const { startCall } = useAudioCallContext()
  
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  const triggerHaptic = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light })
    } catch (e) { /* Fallback for web */ }
  }

  const [showAttachMenu, setShowAttachMenu] = useState(false)

  // Native camera/gallery picker (Capacitor)
  async function openNativePicker(source) {
    setShowAttachMenu(false)
    triggerHaptic()
    try {
      const photo = await CapCamera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source,
      })
      setFilePreview({ url: photo.dataUrl, type: 'image', name: 'photo.jpg' })
      // Convert dataUrl blob to a file-like object for the send flow
      setFileObj({ _dataUrl: photo.dataUrl, type: 'image/jpeg', name: 'photo.jpg' })
    } catch (e) {
      if (e.message !== 'User cancelled photos app') {
        console.error('Camera error:', e)
      }
    }
  }

  // Web fallback file picker
  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setFileObj(file)
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setFilePreview({ url, type: 'image', name: file.name })
    } else {
      setFilePreview({ type: 'file', name: file.name })
    }
  }

  useEffect(() => {
    if (!conversation?.id || !db) return
    setLoadingMsgs(true)

    const msgsQ = query(collection(db, 'messages'), where('conversation_id', '==', conversation.id))
    
    const unsubMessages = onSnapshot(msgsQ, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      msgs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setMessages(msgs)
      if (msgs.length > 0) {
        setLoadingMsgs(false)
      } else {
        setTimeout(() => setLoadingMsgs(false), 1200)
      }

      const unread = snap.docs.filter(d => {
        const data = d.data()
        return data.sender_id !== user.uid && !(data.read_by || []).includes(user.uid)
      })
      if (unread.length > 0) {
        const batch = writeBatch(db)
        unread.forEach(d => batch.update(d.ref, { read_by: arrayUnion(user.uid) }))
        // Touch the conversation doc so ChatPage.jsx onSnapshot fires and recalculates unread counts
        const convRef = doc(db, 'conversations', conversation.id)
        batch.update(convRef, { _read_refresh: new Date().toISOString() })
        batch.commit().catch(() => {})
      }

      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 50)
    })

    const typingDoc = doc(db, 'typing', conversation.id)
    const unsubTyping = onSnapshot(typingDoc, (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        const typers = Object.entries(data)
          .filter(([uid, val]) => val.is_typing && uid !== user.uid)
          .map(([uid, val]) => val.username)
        setTypingUsers(typers)
      }
    })

    async function fetchMembers() {
      if (!conversation.userIds || conversation.userIds.length === 0) return
      const { documentId } = await import('firebase/firestore')
      const q = query(collection(db, 'profiles'), where(documentId(), 'in', conversation.userIds))
      const membSnap = await getDocs(q)
      setMembers(membSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    }
    
    fetchMembers()
    
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' })
    }, 100)

    return () => {
      unsubMessages()
      unsubTyping()
    }
  }, [conversation.id, user, conversation.userIds])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleTyping() {
    if (!db) return
    const typingDoc = doc(db, 'typing', conversation.id)
    await setDoc(typingDoc, {
      [user.uid]: { is_typing: true, username: profile?.username || 'Someone' }
    }, { merge: true })

    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(async () => {
      await updateDoc(typingDoc, {
        [`${user.uid}.is_typing`]: false
      })
    }, 3000)
  }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setFileObj(file)
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setFilePreview({ url, type: 'image', name: file.name })
    } else {
      setFilePreview({ type: 'file', name: file.name })
    }
  }

  async function sendMessage(e) {
    if (e) e.preventDefault()
    if (!text.trim() && !fileObj) return
    triggerHaptic()
    setSending(true)

    let file_url = null
    if (fileObj) {
      // Native camera returns a dataUrl directly
      if (fileObj._dataUrl) {
        file_url = fileObj._dataUrl
      } else if (fileObj.type?.startsWith('image/')) {
        file_url = await compressImage(fileObj, 1200, 1200, 0.7)
        if (file_url.length > 1000000) {
          file_url = await compressImage(fileObj, 800, 800, 0.4)
        }
      } else {
        if (fileObj.size > 900000) {
          alert('Documents must be less than 1MB!')
          setSending(false)
          return
        }
        file_url = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(fileObj)
        })
      }
    }

    const newMsgId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    await setDoc(doc(db, 'messages', newMsgId), {
      conversation_id: conversation.id,
      sender_id: user.uid,
      content: text.trim() || null,
      file_url,
      created_at: new Date().toISOString(),
      read_by: [user.uid],
      profiles: { username: profile?.username, avatar_url: profile?.avatar_url }
    })

    await updateDoc(doc(db, 'conversations', conversation.id), {
      updated_at: new Date().toISOString()
    })

    setText('')
    setFileObj(null)
    setFilePreview(null)
    
    const typingDoc = doc(db, 'typing', conversation.id)
    await updateDoc(typingDoc, {
        [`${user.uid}.is_typing`]: false
    })

    setSending(false)
  }

  async function sendAudio() {
    const blob = getAudioBlob()
    if (!blob) {
      console.warn('sendAudio: no blob available')
      return
    }
    
    triggerHaptic()
    setSending(true)
    
    // Max 1MB roughly (base64 adds ~33% overhead, Firestore limit is 1MB per doc)
    if (blob.size > 700000) {
        alert("Audio message is too long. Please keep it under 45 seconds.");
        setSending(false);
        return;
    }

    try {
      // Convert Blob to Base64 Data URL
      const base64AudioUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
      const newMsgId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      await setDoc(doc(db, 'messages', newMsgId), {
        conversation_id: conversation.id,
        sender_id: user.uid,
        content: null,
        file_url: null,
        audio_url: base64AudioUrl,
        created_at: new Date().toISOString(),
        read_by: [user.uid],
        profiles: { username: profile?.username, avatar_url: profile?.avatar_url }
      })
      
      await updateDoc(doc(db, 'conversations', conversation.id), {
        updated_at: new Date().toISOString()
      })
      resetRecordingState()
    } catch (err) {
      console.error('sendAudio failed:', err)
      alert(`Failed to send audio: ${err?.message || 'Unknown error'}.`)
    }
    setSending(false)
  }

  async function deleteMessage(msgId) {
    if (!window.confirm("Delete this message?")) return
    try {
      await deleteDoc(doc(db, 'messages', msgId))
    } catch (e) {
      console.error(e)
    }
  }

  async function clearHistory() {
    if (!window.confirm("Are you sure you want to delete the entire chat and contact?")) return
    triggerHaptic()
    try {
      const batch = writeBatch(db)
      const msgsQ = query(collection(db, 'messages'), where('conversation_id', '==', conversation.id))
      const msgsSnap = await getDocs(msgsQ)
      msgsSnap.docs.forEach(d => batch.delete(d.ref))
      batch.delete(doc(db, 'conversations', conversation.id))
      batch.delete(doc(db, 'conversation_members', conversation.id))
      await batch.commit()
    } catch (e) {
      console.error("Delete failed:", e)
    }
  }

  async function handleReact(msgId, emoji) {
    triggerHaptic()
    const msgRef = doc(db, 'messages', msgId)
    // Dynamic key update
    await updateDoc(msgRef, {
      [`reactions.${user.uid}`]: emoji
    })
  }

  const otherMember = members.find(m => m.username !== profile?.username)
  const headerName = conversation.is_group
    ? conversation.name
    : otherMember?.username || 'Chat'

  return (
    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <div className="mobile-safe-top" style={{
        padding: isMobile ? '0.25rem 1rem 0.75rem' : '0.875rem 1.25rem',
        borderBottom: '1px solid var(--border)',
        background: 'var(--card)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
      }}>
        {isMobile && (
          <button className="btn-ghost" onClick={() => { triggerHaptic(); onBack(); }}
            style={{ padding: '0.375rem', color: 'var(--foreground)', flexShrink: 0 }}>
            <ArrowLeft size={20} />
          </button>
        )}
        <UserAvatar
          name={headerName}
          size={isMobile ? 36 : 40}
          online={!conversation.is_group && otherMember ? isOnline(otherMember.id) : false}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontWeight: 600, fontSize: isMobile ? '0.9rem' : '1rem', color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{headerName}</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
            {conversation.is_group
              ? `${members.length} members`
              : (() => {
                  const pData = usersPresence?.[otherMember?.id]
                  if (pData?.online) return 'Online'
                  if (pData?.last_seen) {
                    const ls = new Date(pData.last_seen)
                    const isToday = ls.toDateString() === new Date().toDateString()
                    const time = ls.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    return isToday ? `Last seen today at ${time}` : `Last seen ${ls.toLocaleDateString()} at ${time}`
                  }
                  return 'Offline'
              })()
            }
          </p>
        </div>
        
        <button className="btn-ghost" onClick={() => { triggerHaptic(); startCall(otherMember?.id, profile); }} 
          disabled={!otherMember}
          style={{ padding: '0.5rem', color: 'var(--primary)', flexShrink: 0 }}>
          <Phone size={18} />
        </button>
        
        <button className="btn-ghost" onClick={clearHistory} 
          style={{ padding: '0.5rem', color: 'var(--muted-foreground)', flexShrink: 0 }}>
          <Trash2 size={18} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '1rem', 
        display: 'flex', 
        flexDirection: 'column-reverse',
        gap: '0.5rem',
        background: 'var(--background)'
      }}>
        <div ref={bottomRef} style={{ height: 1 }} />
        {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}
        {loadingMsgs && messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: '1rem', padding: '1rem 0' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ display: 'flex', justifyContent: i % 2 === 0 ? 'flex-end' : 'flex-start', opacity: 1 - i * 0.15 }} className="animate-pulse">
                <div style={{ width: i % 2 === 0 ? '60%' : '50%', height: 48, borderRadius: '1rem', background: i % 2 === 0 ? 'var(--primary)' : 'var(--muted)', opacity: 0.5 }} />
              </div>
            ))}
          </div>
        ) : (
          messages.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isMine={msg.sender_id === user?.uid}
              showAvatar={!conversation.is_group || msg.sender_id !== messages[i - 1]?.sender_id}
              isGroup={conversation.is_group}
              onDelete={() => deleteMessage(msg.id)}
              onReact={(emoji) => handleReact(msg.id, emoji)}
              conversationUserIds={conversation.userIds || []}
              currentUserId={user?.uid}
            />
          ))
        )}
      </div>

      {/* File preview */}
      {filePreview && (
        <div style={{ padding: '0.5rem 1rem', background: 'var(--muted)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {filePreview.type === 'image'
            ? <img src={filePreview.url} alt="preview" style={{ height: '50px', width: '50px', objectFit: 'cover', borderRadius: '8px' }} />
            : <FileText size={32} style={{ color: 'var(--muted-foreground)' }} />
          }
          <span style={{ fontSize: '0.8rem', color: 'var(--foreground)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {filePreview.name}
          </span>
          <button className="btn-ghost" onClick={() => { setFilePreview(null); setFileObj(null) }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Native Attach Menu */}
      {showAttachMenu && (
        <div style={{
          position: 'absolute', bottom: isMobile ? '70px' : '80px', left: '0.75rem',
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '16px', padding: '0.5rem', zIndex: 100,
          display: 'flex', flexDirection: 'column', gap: '0.25rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          <button
            onClick={() => openNativePicker(CameraSource.Camera)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '12px', background: 'transparent', border: 'none', color: 'var(--foreground)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
          >
            <Camera size={20} style={{ color: 'var(--primary)' }} /> Camera
          </button>
          <button
            onClick={() => openNativePicker(CameraSource.Photos)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '12px', background: 'transparent', border: 'none', color: 'var(--foreground)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
          >
            <Image size={20} style={{ color: 'var(--accent)' }} /> Gallery
          </button>
          {/* Web fallback */}
          <button
            onClick={() => { setShowAttachMenu(false); fileInputRef.current?.click() }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '12px', background: 'transparent', border: 'none', color: 'var(--foreground)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
          >
            <FileText size={20} style={{ color: 'var(--muted-foreground)' }} /> File
          </button>
        </div>
      )}

      {/* Backdrop to close attach menu */}
      {showAttachMenu && (
        <div onClick={() => setShowAttachMenu(false)} style={{ position: 'absolute', inset: 0, zIndex: 99 }} />
      )}

      {/* Input Bar / Audio Recorder */}
      {audioUrl ? (
        <div className="mobile-safe-bottom" style={{
          padding: isMobile ? '0.5rem 0.75rem' : '0.875rem 1.25rem', borderTop: '1px solid var(--border)', background: 'var(--card)', display: 'flex', gap: '0.5rem', alignItems: 'center'
        }}>
          <button type="button" className="btn-ghost" onClick={() => { triggerHaptic(); resetRecordingState(); }} style={{ padding: '0.5rem', color: 'var(--destructive)', flexShrink: 0 }}>
            <Trash2 size={24} />
          </button>
          <div style={{ flex: 1, background: 'var(--input)', borderRadius: '24px', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center' }}>
             <audio src={audioUrl} controls style={{ width: '100%', height: '35px' }} />
          </div>
          <button type="button" onClick={sendAudio} className="btn-primary" disabled={sending}
            style={{ width: '44px', height: '44px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {sending ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
          </button>
        </div>
      ) : isRecording ? (
        <div className="mobile-safe-bottom" style={{
          padding: isMobile ? '0.5rem 0.75rem' : '0.875rem 1.25rem', borderTop: '1px solid var(--border)', background: 'var(--card)', display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <button type="button" className="btn-ghost" onClick={() => { triggerHaptic(); cancelRecording(); }} style={{ padding: '0.5rem', color: 'var(--destructive)' }}>
            <Trash2 size={24} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--destructive)', fontWeight: 600, animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--destructive)' }} />
            {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:{(recordingTime % 60).toString().padStart(2, '0')}
          </div>

          <button type="button" onClick={() => { triggerHaptic(); stopRecording(); }} className="btn-primary" disabled={sending}
            style={{ width: '44px', height: '44px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'var(--destructive)', color: 'white', border: 'none' }}>
            <Square size={16} fill="currentColor" />
          </button>
        </div>
      ) : (
        <form onSubmit={sendMessage} className="mobile-safe-bottom" style={{
          padding: isMobile ? '0.5rem 0.75rem' : '0.875rem 1.25rem',
          borderTop: '1px solid var(--border)',
          background: 'var(--card)',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'flex-end',
          position: 'relative',
        }}>
          {/* Hidden web file input */}
          <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt" style={{ display: 'none' }} onChange={handleFileChange} />

          {/* Attach button */}
          <button type="button" className="btn-ghost"
            onClick={() => { triggerHaptic(); setShowAttachMenu(v => !v) }}
            style={{ padding: '0.5rem', color: showAttachMenu ? 'var(--primary)' : 'var(--muted-foreground)', flexShrink: 0 }}>
            <Paperclip size={20} />
          </button>

          <input
            className="input"
            placeholder="Type a message…"
            value={text}
            onChange={e => { setText(e.target.value); handleTyping() }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !isMobile) { e.preventDefault(); sendMessage(e) } }}
            style={{ flex: 1, borderRadius: '24px', paddingLeft: '1rem', background: 'var(--input)' }}
          />

          {text.trim() || fileObj ? (
            <button type="submit" className="btn-primary" disabled={sending}
              style={{ width: '44px', height: '44px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {sending
                ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                : <Send size={18} />
              }
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={() => { triggerHaptic(); startRecording(); }} disabled={sending}
              style={{ width: '44px', height: '44px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Mic size={18} />
            </button>
          )}
        </form>
      )}
    </main>
  )
}

async function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target.result
      img.onload = () => {
        let width = img.width
        let height = img.height
        if (width > height) {
          if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
        } else {
          if (height > maxHeight) { width = Math.round((width * maxHeight) / height); height = maxHeight; }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = error => reject(error)
    }
    reader.onerror = error => reject(error)
  })
}
