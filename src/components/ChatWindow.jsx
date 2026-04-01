import { useState, useEffect, useRef } from 'react'
import { db } from '../lib/firebase'
import { collection, query, where, orderBy, onSnapshot, getDocs, doc, setDoc, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'
import { Send, Paperclip, X, FileText, Loader2, Trash2, MoreVertical, ArrowLeft } from 'lucide-react'
import MessageBubble from './MessageBubble'
import TypingIndicator from './TypingIndicator'
import UserAvatar from './UserAvatar'

export default function ChatWindow({ conversation, isOnline, isMobile, onBack }) {
  const { user, profile } = useAuth()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [members, setMembers] = useState([])
  const [typingUsers, setTypingUsers] = useState([])
  const [filePreview, setFilePreview] = useState(null)
  const [fileObj, setFileObj] = useState(null)
  const [loadingMsgs, setLoadingMsgs] = useState(true)
  
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  useEffect(() => {
    if (!conversation?.id || !db) return
    setLoadingMsgs(true)

    // Setup messages listener
    // Bypass composite index requirement by not using orderBy natively
    const msgsQ = query(collection(db, 'messages'), where('conversation_id', '==', conversation.id))
    
    const unsubMessages = onSnapshot(msgsQ, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      // Sort DESCENDING (Newest first) for column-reverse layout
      msgs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setMessages(msgs)
      setLoadingMsgs(false)
      
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 50)
    })

    // Listen to typing state
    const typingDoc = doc(db, 'typing', conversation.id)
    const unsubTyping = onSnapshot(typingDoc, (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        // data structure: { [uid]: { is_typing: true, username: 'bob' } }
        const typers = Object.entries(data)
          .filter(([uid, val]) => val.is_typing && uid !== user.uid)
          .map(([uid, val]) => val.username)
        setTypingUsers(typers)
      }
    })

    // Fetch members wrapper document (contains userIds) and then profiles
    async function fetchMembers() {
      if (!conversation.userIds || conversation.userIds.length === 0) return
      
      const { documentId } = await import('firebase/firestore')
      const q = query(collection(db, 'profiles'), where(documentId(), 'in', conversation.userIds))
      const membSnap = await getDocs(q)
      setMembers(membSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    }
    
    fetchMembers()
    
    // Auto-scroll
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
    e.preventDefault()
    if (!text.trim() && !fileObj) return
    setSending(true)

    let file_url = null
    if (fileObj) {
      if (fileObj.type.startsWith('image/')) {
        file_url = await compressImage(fileObj, 1200, 1200, 0.7)
        if (file_url.length > 1000000) {
           // Extreme compression fallback if still too large
           file_url = await compressImage(fileObj, 800, 800, 0.4)
        }
      } else {
        if (fileObj.size > 900000) { 
          alert("Documents must be less than 1MB to save as base64 in Firestore!")
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
      profiles: { username: profile?.username, avatar_url: profile?.avatar_url }
    })

    // Update conversation's last updated time to move it to top of sidebar
    await updateDoc(doc(db, 'conversations', conversation.id), {
      updated_at: new Date().toISOString()
    })

    setText('')
    setFileObj(null)
    setFilePreview(null)
    
    // Stop typing
    const typingDoc = doc(db, 'typing', conversation.id)
    await updateDoc(typingDoc, {
        [`${user.uid}.is_typing`]: false
    })

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
    try {
      const batch = writeBatch(db)

      // 1. Delete all messages
      const msgsQ = query(collection(db, 'messages'), where('conversation_id', '==', conversation.id))
      const msgsSnap = await getDocs(msgsQ)
      msgsSnap.docs.forEach(d => batch.delete(d.ref))
      
      // 2. Delete conversation document
      batch.delete(doc(db, 'conversations', conversation.id))
      
      // 3. Delete member association (uses same ID)
      batch.delete(doc(db, 'conversation_members', conversation.id))
      
      await batch.commit()
      // Side effect: ChatPage onSnapshot will trigger and clear the view
    } catch (e) {
      console.error("Delete failed:", e)
    }
  }

  const otherMember = members.find(m => m.username !== profile?.username)
  const headerName = conversation.is_group
    ? conversation.name
    : otherMember?.username || 'Chat'

  return (
    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: isMobile ? '0.75rem 1rem' : '0.875rem 1.25rem',
        borderBottom: '1px solid var(--border)',
        background: 'var(--card)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
      }}>
        {/* Back button on mobile */}
        {isMobile && (
          <button className="btn-ghost" onClick={onBack}
            style={{ padding: '0.375rem', color: 'var(--foreground)', flexShrink: 0 }}
            title="Back">
            <ArrowLeft size={20} />
          </button>
        )}
        <UserAvatar
          name={headerName}
          size={isMobile ? 34 : 38}
          online={!conversation.is_group && otherMember ? isOnline(otherMember.id) : false}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontWeight: 600, fontSize: isMobile ? '0.9rem' : '0.95rem', color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{headerName}</h2>
          <p style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)' }}>
            {conversation.is_group
              ? `${members.length} members`
              : (otherMember && isOnline(otherMember.id) ? 'Online' : 'Offline')
            }
          </p>
        </div>
        
        <button className="btn-ghost" onClick={clearHistory} 
          style={{ padding: '0.5rem', color: 'var(--muted-foreground)', flexShrink: 0 }} 
          title="Delete chat">
          <Trash2 size={18} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '1.25rem', 
        display: 'flex', 
        flexDirection: 'column-reverse', // Newest messages at bottom, scroll stays at bottom
        gap: '0.5rem' 
      }}>
        {/* Placeholder to push content to bottom if few messages */}
        <div ref={bottomRef} style={{ height: 1 }} />
        {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isMine={msg.sender_id === user?.uid}
            showAvatar={!conversation.is_group || msg.sender_id !== messages[i - 1]?.sender_id}
            isGroup={conversation.is_group}
            onDelete={() => deleteMessage(msg.id)}
          />
        ))}
      </div>

      {/* File preview */}
      {filePreview && (
        <div style={{ padding: '0.5rem 1.25rem', background: 'var(--muted)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {filePreview.type === 'image'
            ? <img src={filePreview.url} alt="preview" style={{ height: '56px', width: '56px', objectFit: 'cover', borderRadius: 'var(--radius)' }} />
            : <FileText size={32} style={{ color: 'var(--muted-foreground)' }} />
          }
          <span style={{ fontSize: '0.8rem', color: 'var(--foreground)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {filePreview.name}
          </span>
          <button className="btn-ghost" onClick={() => { setFilePreview(null); setFileObj(null) }}
            style={{ padding: '0.25rem', color: 'var(--muted-foreground)' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={sendMessage} style={{
        padding: '0.875rem 1.25rem',
        borderTop: '1px solid var(--border)',
        background: 'var(--card)',
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'flex-end'
      }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.txt"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button type="button" className="btn-ghost" onClick={() => fileInputRef.current?.click()}
          style={{ padding: '0.5rem', color: 'var(--muted-foreground)', flexShrink: 0 }}>
          <Paperclip size={18} />
        </button>
        <input
          className="input"
          placeholder="Type a message…"
          value={text}
          onChange={e => { setText(e.target.value); handleTyping() }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e) } }}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn-primary" disabled={sending || (!text.trim() && !fileObj)}
          style={{ padding: '0.5rem 0.875rem', display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
          {sending
            ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            : <Send size={16} />
          }
        </button>
      </form>
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
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
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
