'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { noop } from '@/utils';

const ToastContext = createContext({ showToast: noop });

// Minimal app-wide toast: one message at a time, auto-dismissing. Lives in
// the root layout so it survives client-side navigation (save → navigate →
// the confirmation still shows on the destination page).
export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((message) => {
    setToast({ message, key: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    timerRef.current = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timerRef.current);
  }, [toast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div
          key={toast.key}
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-purple-400/60 bg-purple-900 px-4 py-2 text-purple-100 shadow-lg animate-in fade-in slide-in-from-bottom-2"
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
