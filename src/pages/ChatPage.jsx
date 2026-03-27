import { useState, useEffect } from 'react'
import { db } from '../lib/firebase'
import { collection, query, where, onSnapshot, getDocs, orderBy, doc, getDoc, setDoc } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from '../components/Sidebar'
import ChatWindow from '../components/ChatWindow'
import WelcomeScreen from '../components/WelcomeScreen'

export default function ChatPage() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  
  // Realtime profiles listener (online status is simulated via timestamp in a real app,
  // but for simplicity we will just manage a basic user list)
  const [usersPresence, setUsersPresence] = useState({})

  // Update presence status on mount
  useEffect(() => {
    if (!user || !db) return
    const presenceRef = doc(db, 'presence', user.uid)
    setDoc(presenceRef, { online: true, last_seen: new Date().toISOString() }, { merge: true })

    const unsubPresence = onSnapshot(collection(db, 'presence'), (snap) => {
      const p = {}
      snap.forEach(d => { p[d.id] = d.data() })
      setUsersPresence(p)
    })

    const handleBeforeUnload = () => {
      // In a real app Firebase Realtime Database is better for presence, but this is a simple fallback
      setDoc(presenceRef, { online: false, last_seen: new Date().toISOString() }, { merge: true })
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      unsubPresence()
      handleBeforeUnload()
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [user])

  // Listen to user's conversations
  useEffect(() => {
    if (!user || !db) return

    // Listen to user's conversations directly where user is a member
    const conversationQ = query(collection(db, 'conversations'), where('userIds', 'array-contains', user.uid))

    const unsub = onSnapshot(conversationQ, async (snap) => {
      const convs = []
      
      for (const convDoc of snap.docs) {
        const cData = convDoc.data()
        const conversationId = convDoc.id
        
        // Fetch latest preview message (still sorting manually to avoid index issues)
        const msgsQ = query(collection(db, 'messages'), where('conversation_id', '==', conversationId))
        const msgsSnap = await getDocs(msgsQ)
        const allMsgs = msgsSnap.docs.map(d => d.data())
        allMsgs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        const lastMsg = allMsgs[0]
        
        convs.push({
          id: conversationId,
          ...cData,
          lastMessage: lastMsg || null
        })
      }

      // Sort by updated_at or fallback to created_at
      convs.sort((a, b) => {
        const aTime = a.updated_at || a.created_at
        const bTime = b.updated_at || b.created_at
        return new Date(bTime) - new Date(aTime)
      })

      setConversations(convs)
      
      // Update active conversation reference if it changed
      if (activeConversation) {
        const updatedActive = convs.find(c => c.id === activeConversation.id)
        if (updatedActive) setActiveConversation(updatedActive)
      }
    })

    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  function isOnline(userId) {
    return usersPresence[userId]?.online === true
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--background)' }}>
      <Sidebar
        conversations={conversations}
        activeId={activeConversation?.id}
        onSelect={setActiveConversation}
        isOnline={isOnline}
      />
      {activeConversation
        ? <ChatWindow
            key={activeConversation.id}
            conversation={activeConversation}
            isOnline={isOnline}
          />
        : <WelcomeScreen />
      }
    </div>
  )
}
