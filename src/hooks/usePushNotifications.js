import { useEffect } from 'react'
import { PushNotifications } from '@capacitor/push-notifications'
import { db } from '../lib/firebase'
import { doc, setDoc } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'

/**
 * usePushNotifications
 * Registers the device for FCM push notifications and saves
 * the token to Firestore so the server can send targeted pushes.
 */
export function usePushNotifications() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    async function register() {
      try {
        // 1. Check / request permission
        let permStatus = await PushNotifications.checkPermissions()

        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions()
        }

        if (permStatus.receive !== 'granted') {
          console.log('[Push] Permission not granted')
          return
        }

        // 2. Register with APNs / FCM
        await PushNotifications.register()

      } catch (e) {
        // Falls back silently on web
        console.log('[Push] Not available on web:', e.message)
      }
    }

    // 3. Listen for FCM token
    const tokenListener = PushNotifications.addListener('registration', async (token) => {
      console.log('[Push] FCM Token:', token.value)
      // Save token to Firestore so backend can send targeted pushes
      try {
        await setDoc(doc(db, 'push_tokens', user.uid), {
          token: token.value,
          uid: user.uid,
          platform: 'android',
          updated_at: new Date().toISOString(),
        }, { merge: true })
      } catch (e) {
        console.error('[Push] Failed to save token:', e)
      }
    })

    // 4. Handle registration errors
    const errorListener = PushNotifications.addListener('registrationError', (err) => {
      console.error('[Push] Registration error:', err)
    })

    // 5. Handle foreground notifications (app open)
    const notifListener = PushNotifications.addListener(
      'pushNotificationReceived',
      (notification) => {
        console.log('[Push] Received in foreground:', notification)
        // You can show an in-app toast here if desired
      }
    )

    // 6. Handle notification tap (app was backgrounded/closed)
    const actionListener = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action) => {
        console.log('[Push] Tapped:', action)
        // Navigate to the relevant chat using action.notification.data
      }
    )

    register()

    return () => {
      Promise.all([tokenListener, errorListener, notifListener, actionListener])
        .then((handles) => {
          handles.forEach((handle) => {
            if (handle && typeof handle.remove === 'function') {
              handle.remove()
            }
          })
        })
        .catch((err) => console.error('[Push] Cleanup error:', err))
    }
  }, [user])
}
