import { useState, useEffect } from 'react'
import { db } from '../lib/firebase'
import { collection, query, where, onSnapshot, getDocs, doc, setDoc, documentId, writeBatch } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from '../components/Sidebar'
import ChatWindow from '../components/ChatWindow'
import WelcomeScreen from '../components/WelcomeScreen'
import { motion, AnimatePresence } from 'framer-motion'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

export default function ChatPage() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [usersPresence, setUsersPresence] = useState({})
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  // Phase 3: Register for push notifications
  usePushNotifications()

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ... (presence logic remains same)
  useEffect(() => {
    if (!user || !db) return
    const presenceRef = doc(db, 'presence', user.uid)
    
    const setOnline = () => setDoc(presenceRef, { online: true, last_seen: new Date().toISOString() }, { merge: true })
    const setOffline = () => setDoc(presenceRef, { online: false, last_seen: new Date().toISOString() }, { merge: true })

    setOnline()

    const unsubPresence = onSnapshot(collection(db, 'presence'), (snap) => {
      const p = {}
      snap.forEach(d => { p[d.id] = d.data() })
      setUsersPresence(p)
    })

    const handleBeforeUnload = () => {
      setOffline()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Handle Capacitor App State (Background/Foreground)
    let appStateListener
    if (Capacitor.isNativePlatform()) {
      appStateListener = CapApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) setOnline()
        else setOffline()
      })
    }

    return () => {
      unsubPresence()
      setOffline()
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (appStateListener) appStateListener.then(l => l.remove())
    }
  }, [user])

  // ... (conversations logic remains same)
  useEffect(() => {
    if (!user || !db) return

    const conversationQ = query(collection(db, 'conversations'), where('userIds', 'array-contains', user.uid))

    const unsub = onSnapshot(conversationQ, async (snap) => {
      const convs = []
      const allUserIds = new Set()
      snap.docs.forEach(d => {
        const ids = d.data().userIds || []
        ids.forEach(id => allUserIds.add(id))
      })

      const profilesMap = {}
      const userIdArray = Array.from(allUserIds)
      
      for (let i = 0; i < userIdArray.length; i += 10) {
        const batch = userIdArray.slice(i, i + 10)
        const profilesQ = query(collection(db, 'profiles'), where(documentId(), 'in', batch))
        const profilesSnap = await getDocs(profilesQ)
        profilesSnap.forEach(d => { profilesMap[d.id] = d.data() })
      }

      for (const convDoc of snap.docs) {
        const cData = convDoc.data()
        const conversationId = convDoc.id
        const msgsQ = query(collection(db, 'messages'), where('conversation_id', '==', conversationId))
        const msgsSnap = await getDocs(msgsQ)
        const allMsgs = msgsSnap.docs.map(d => d.data())
        allMsgs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        const lastMsg = allMsgs[0]
        const otherMemberId = cData.userIds?.find(uid => uid !== user.uid)
        const otherMember = otherMemberId ? profilesMap[otherMemberId] : null
        const unreadCount = allMsgs.filter(m =>
          m.sender_id !== user.uid &&
          !(m.read_by || []).includes(user.uid)
        ).length

        convs.push({ id: conversationId, ...cData, lastMessage: lastMsg || null, otherMember, unreadCount })
      }

      convs.sort((a, b) => {
        const aTime = a.updated_at || a.created_at
        const bTime = b.updated_at || b.created_at
        return new Date(bTime) - new Date(aTime)
      })

      setConversations(convs)
      setActiveConversation(prev => {
        if (!prev) return prev
        const updatedActive = convs.find(c => c.id === prev.id)
        return updatedActive || null
      })
    })

    return () => unsub()
  }, [user])

  async function deleteConversation(convId) {
    if (!window.confirm("Delete this conversation and all messages?")) return
    try {
      const batch = writeBatch(db)
      batch.delete(doc(db, 'conversations', convId))
      batch.delete(doc(db, 'conversation_members', convId))
      const msgsQ = query(collection(db, 'messages'), where('conversation_id', '==', convId))
      const msgsSnap = await getDocs(msgsQ)
      msgsSnap.docs.forEach(d => batch.delete(d.ref))
      await batch.commit()
      if (activeConversation?.id === convId) setActiveConversation(null)
    } catch (e) {
      console.error("Sidebar delete failed:", e)
    }
  }

  function isOnline(userId) {
    return usersPresence[userId]?.online === true
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--background)', position: 'relative' }}>
      <AnimatePresence initial={false}>
        {(!isMobile || !activeConversation) && (
          <motion.div
            key="sidebar"
            initial={isMobile ? { x: '-100%' } : false}
            animate={{ x: 0 }}
            exit={isMobile ? { x: '-100%' } : false}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{ 
              width: isMobile ? '100%' : '320px', 
              height: '100%', 
              position: isMobile ? 'absolute' : 'relative',
              zIndex: 10,
              background: 'var(--sidebar)'
            }}
          >
            <Sidebar
              conversations={conversations}
              activeId={activeConversation?.id}
              onSelect={setActiveConversation}
              onDelete={deleteConversation}
              isOnline={isOnline}
              isMobile={isMobile}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {activeConversation ? (
          <motion.div
            key={activeConversation.id}
            initial={isMobile ? { x: '100%' } : { opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={isMobile ? { x: '100%' } : { opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{ 
              flex: 1, 
              height: '100%', 
              position: isMobile ? 'absolute' : 'relative',
              width: isMobile ? '100%' : 'auto',
              zIndex: 20,
              background: 'var(--background)'
            }}
          >
            <ChatWindow
              conversation={activeConversation}
              isOnline={isOnline}
              usersPresence={usersPresence}
              isMobile={isMobile}
              onBack={() => setActiveConversation(null)}
            />
          </motion.div>
        ) : (
          !isMobile && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <WelcomeScreen />
            </div>
          )
        )}
      </AnimatePresence>
    </div>
  )
}

