import { createContext, useContext } from 'react';
import { useAudioCall } from '../hooks/useAudioCall';
import { useAuth } from './AuthContext';

const AudioCallContext = createContext(null);

export function AudioCallProvider({ children }) {
  const { user } = useAuth();
  const audioCall = useAudioCall(user?.uid);

  return (
    <AudioCallContext.Provider value={audioCall}>
      {children}
    </AudioCallContext.Provider>
  );
}

export function useAudioCallContext() {
  const context = useContext(AudioCallContext);
  if (!context) {
    throw new Error('useAudioCallContext must be used within an AudioCallProvider');
  }
  return context;
}
