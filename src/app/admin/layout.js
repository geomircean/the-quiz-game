'use client';

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components';
import Loading from '@/components/loading';

// The whole /admin subtree is Quizmaster-only: it renders a Google sign-in
// gate until a non-anonymous user is present. (Client-side gate — there is
// no server; the data itself is protected by owner-only Firestore rules.)
const Layout = ({ children }) => {
  const { user, isLoading, isQuizmaster, signInWithGoogle, logOut } = useAuth();
  const [signInError, setSignInError] = useState(null);

  const onSignIn = async () => {
    setSignInError(null);
    try {
      await signInWithGoogle();
    } catch (error) {
      // Dismissing the popup is a normal action, not an error worth showing.
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') return;
      if (error.code === 'auth/popup-blocked') {
        return setSignInError('Your browser blocked the sign-in popup — allow popups for this site and try again.');
      }
      setSignInError(error.message);
    }
  };

  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-16">
        {isLoading && <Loading/>}
        {!isLoading && !isQuizmaster && (
          <Card className="mx-auto max-w-xl bg-purple-800/40 text-purple-100">
            <CardHeader>
              <CardTitle>Quizmaster sign-in</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-start gap-4">
              <p>Sign in with Google to build and manage your question library.</p>
              <Button onClick={onSignIn}>Sign in with Google</Button>
              {signInError && <div className="error-message">{signInError}</div>}
            </CardContent>
          </Card>
        )}
        {!isLoading && isQuizmaster && (
          <div className="mb-12 text-center">
            <div className="flex justify-end gap-2 pb-2 items-center text-sm">
              <span>{user.displayName || user.email}</span>
              <Button size="sm" variant="outline" onClick={logOut}>Sign out</Button>
            </div>
            {children}
          </div>
        )}
      </div>
    </main>
  );
};

export default Layout;
