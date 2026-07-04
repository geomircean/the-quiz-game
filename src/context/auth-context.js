'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInAnonymously,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { noop } from '@/utils';

const AuthContext = createContext({
  user: null,
  isLoading: true,
  isQuizmaster: false,
  signInWithGoogle: noop,
  signInAsGuest: noop,
  logOut: noop,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => onAuthStateChanged(auth, (nextUser) => {
    setUser(nextUser);
    setIsLoading(false);
  }), []);

  // The Quizmaster signs in with Google; players get an invisible guest
  // identity (anonymous auth). LOCAL persistence keeps the same uid across
  // refreshes, which is what lets a locked phone slide back into its team.
  const signInWithGoogle = async () => {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithPopup(auth, new GoogleAuthProvider());
  };

  const signInAsGuest = async () => {
    await setPersistence(auth, browserLocalPersistence);
    await signInAnonymously(auth);
  };

  const logOut = () => signOut(auth);

  // Mirror the security rules: a Quizmaster is specifically a Google account
  // (firestore.rules checks sign_in_provider == 'google.com').
  const isQuizmaster = !!user && !user.isAnonymous
    && user.providerData.some((p) => p.providerId === 'google.com');

  return (
    <AuthContext.Provider value={{ user, isLoading, isQuizmaster, signInWithGoogle, signInAsGuest, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
