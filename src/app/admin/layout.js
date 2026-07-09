'use client';

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import Loading from '@/components/loading';

// The whole /admin subtree is Quizmaster-only: it renders a Google sign-in
// gate until a non-anonymous user is present. (Client-side gate — there is
// no server; the data itself is protected by owner-only Firestore rules.)
// Navy + gold "Quiz Studio" app-shell (design bundle "Quiz Authoring").
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

  if (isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background">
        <Loading/>
      </main>
    );
  }

  if (!isQuizmaster) {
    return (
      <main className="relative flex min-h-dvh items-center justify-center bg-background px-5 text-foreground">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-primary"/>
        <div className="flex w-full max-w-[440px] flex-col items-center gap-2 rounded-[20px] p-11 text-center" style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,.08)' }}>
          <div className="flex items-center justify-center rounded-[14px] bg-primary font-display text-primary-foreground" style={{ width: 56, height: 56, fontSize: 34 }}>Q</div>
          <div className="mt-2.5 font-display tracking-[0.06em]" style={{ fontSize: 32 }}>QUIZ STUDIO</div>
          <p className="max-w-[300px] text-[16px] leading-relaxed" style={{ color: '#9FB4DE' }}>
            Sign in to build questions, assemble quizzes, and run live games.
          </p>
          <button
            type="button"
            onClick={onSignIn}
            className="mt-5 flex w-full items-center justify-center gap-3 rounded-[12px] bg-[#F2F5FF] py-3.5 text-[16px] font-bold text-[#1a1a1a] hover:brightness-95"
          >
            <span className="flex items-center justify-center rounded-full border-2 border-[#C7D2EC] font-display text-[#4285F4]" style={{ width: 22, height: 22, fontSize: 13 }}>G</span>
            Sign in with Google
          </button>
          {signInError && <div className="error-message mt-3">{signInError}</div>}
          <p className="mt-3 text-xs" style={{ color: '#6E82B0' }}>Only the Quizmaster needs an account — players join with a code.</p>
        </div>
      </main>
    );
  }

  const label = user.displayName || user.email || '?';
  const initials = label.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean).map((s) => s[0]).slice(0, 2).join('').toUpperCase() || 'Q';

  return (
    <main className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex flex-none items-center gap-3.5 border-b border-primary/30 bg-popover px-5 sm:px-6" style={{ height: 60 }}>
        <a href="/admin/" className="flex items-center gap-3.5">
          <span className="flex items-center justify-center rounded-lg bg-primary font-display text-primary-foreground" style={{ width: 34, height: 34, fontSize: 21 }}>Q</span>
          <span className="font-display tracking-[0.06em]" style={{ fontSize: 20 }}>QUIZ STUDIO</span>
        </a>
        <div className="ml-auto flex items-center gap-3">
          <span className="flex flex-none items-center justify-center rounded-full font-extrabold text-[#04121F]" style={{ width: 34, height: 34, background: 'var(--sky)', fontSize: 14 }}>{initials}</span>
          <div className="leading-tight">
            <div className="text-sm font-semibold">{label}</div>
            <button type="button" onClick={logOut} className="text-xs hover:text-foreground" style={{ color: '#7C8DB5' }}>Sign out</button>
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </main>
  );
};

export default Layout;
