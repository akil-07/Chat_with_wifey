import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser ? 'User present' : 'No user');
      setUser(firebaseUser)
      if (firebaseUser) {
        console.log('Fetching profile for:', firebaseUser.uid);
        await fetchProfile(firebaseUser.uid)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    if (!db) {
      console.warn('Firestore (db) not initialized in fetchProfile');
      setLoading(false);
      return;
    }
    try {
      const snap = await getDoc(doc(db, 'profiles', userId))
      if (snap.exists()) {
        console.log('Profile found:', snap.data().username);
        setProfile({ id: snap.id, ...snap.data() })
      } else {
        console.warn('No profile document found for user:', userId);
      }
    } catch (e) {
      console.error('Error fetching profile:', e)
    } finally {
      setLoading(false)
    }
  }

  async function signOut() {
    if (auth) await firebaseSignOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
