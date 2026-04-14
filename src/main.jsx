import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Keyboard } from '@capacitor/keyboard'

// Initialize Capacitor features
const initCapacitor = async () => {
  try {
    // Hide status bar or set color
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#050508' })
    
    // Ensure keyboard doesn't hide the input
    await Keyboard.setResizeMode({ mode: 'native' })
  } catch (e) {
    // Falls back gracefully on web browser
  }
}

initCapacitor()

// Default to dark mode
document.documentElement.classList.add('dark')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

