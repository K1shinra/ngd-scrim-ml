import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  authMethod?: 'google' | 'squad_account';
  linkedIgn?: string | null;
}

interface AuthContextValue {
  user: AppUser | null;
  idToken: string | null;
  loading: boolean;
  signingIn: boolean;
  authError: string | null;
  authErrorCode: string | null;
  linkedIgn: string | null;
  linkMyIgn: (ign: string) => void;
  unlinkMyIgn: () => void;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<{ ok: boolean; error?: string; code?: string }>;
  signInWithSquadAccount: (params: {
    displayName: string;
    email: string;
    linkedIgn?: string;
  }) => void;
  signOut: () => Promise<void>;
  getFreshToken: () => Promise<string | null>;
}

const SQUAD_ACCOUNT_STORAGE_KEY = 'ngd_scrim_squad_user_v1';
const LINKED_IGN_PREFIX = 'ngd_linked_ign_';

const AuthContext = createContext<AuthContextValue>({
  user: null,
  idToken: null,
  loading: true,
  signingIn: false,
  authError: null,
  authErrorCode: null,
  linkedIgn: null,
  linkMyIgn: () => {},
  unlinkMyIgn: () => {},
  clearAuthError: () => {},
  signInWithGoogle: async () => ({ ok: false }),
  signInWithSquadAccount: () => {},
  signOut: async () => {},
  getFreshToken: async () => null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [fallbackUser, setFallbackUser] = useState<AppUser | null>(() => {
    try {
      const raw = localStorage.getItem(SQUAD_ACCOUNT_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.email === 'string') {
        return parsed as AppUser;
      }
      return null;
    } catch {
      return null;
    }
  });
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authErrorCode, setAuthErrorCode] = useState<string | null>(null);
  const [linkedIgn, setLinkedIgn] = useState<string | null>(null);

  // Sync linkedIgn when user changes
  useEffect(() => {
    const email = firebaseUser?.email || fallbackUser?.email;
    if (email) {
      try {
        const saved = localStorage.getItem(`${LINKED_IGN_PREFIX}${email.toLowerCase()}`);
        if (saved) {
          setLinkedIgn(saved);
          return;
        }
      } catch {
        // Ignore storage error
      }
    }
    // If fallbackUser has linkedIgn
    if (fallbackUser?.linkedIgn) {
      setLinkedIgn(fallbackUser.linkedIgn);
    } else {
      setLinkedIgn(null);
    }
  }, [firebaseUser, fallbackUser]);

  const linkMyIgn = (ign: string) => {
    const clean = ign.trim();
    if (!clean) return;
    setLinkedIgn(clean);
    const email = firebaseUser?.email || fallbackUser?.email;
    if (email) {
      try {
        localStorage.setItem(`${LINKED_IGN_PREFIX}${email.toLowerCase()}`, clean);
      } catch {
        // Ignore storage error
      }
    }
    if (fallbackUser) {
      const updated = { ...fallbackUser, linkedIgn: clean };
      setFallbackUser(updated);
      try {
        localStorage.setItem(SQUAD_ACCOUNT_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
    }
  };

  const unlinkMyIgn = () => {
    setLinkedIgn(null);
    const email = firebaseUser?.email || fallbackUser?.email;
    if (email) {
      try {
        localStorage.removeItem(`${LINKED_IGN_PREFIX}${email.toLowerCase()}`);
      } catch {
        // Ignore storage error
      }
    }
    if (fallbackUser) {
      const updated = { ...fallbackUser, linkedIgn: null };
      setFallbackUser(updated);
      try {
        localStorage.setItem(SQUAD_ACCOUNT_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setFirebaseUser(currentUser);
      if (currentUser) {
        setAuthError(null);
        setAuthErrorCode(null);
        try {
          const token = await currentUser.getIdToken();
          setIdToken(token);
        } catch {
          setIdToken(null);
        }
      } else {
        setIdToken(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const clearAuthError = () => {
    setAuthError(null);
    setAuthErrorCode(null);
  };

  const signInWithGoogle = async (): Promise<{
    ok: boolean;
    error?: string;
    code?: string;
  }> => {
    if (signingIn) return { ok: false };
    setSigningIn(true);
    setAuthError(null);
    setAuthErrorCode(null);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const token = await cred.user.getIdToken();
      setIdToken(token);
      return { ok: true };
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: string }).code)
          : '';
      const hostname =
        typeof window !== 'undefined' ? window.location.hostname : 'domain';

      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request'
      ) {
        const msg =
          'Isinara ang Google Sign-In popup bago matapos ang pag-login. Kung kusa itong nagsara sa deployed site, gamitin ang Direct Squad Account Sign-In sa ibaba.';
        setAuthError(msg);
        setAuthErrorCode(code);
        return { ok: false, error: msg, code };
      }

      let msg = 'Hindi natuloy ang Google Sign-In. Pakisubukan ulit o gamitin ang Direct Squad Account Sign-In sa ibaba.';
      if (code === 'auth/popup-blocked') {
        msg =
          'Na-block ng browser ang Google Sign-In popup. Pakipayagan ang pop-ups sa browser o gamitin ang Direct Squad Account Sign-In sa ibaba.';
      } else if (code === 'auth/unauthorized-domain') {
        msg = `Hindi pa naka-whitelist ang deployed domain na ito (${hostname}) sa Firebase Google Popup. Maaari kang mag-sign in gamit ang Direct Squad Account Sign-In sa ibaba.`;
      } else if (code === 'auth/operation-not-supported-in-this-environment') {
        msg =
          'Hindi suportado ang Google Popup sa in-app browser (hal. Messenger/FB). Buksan sa Chrome/Safari o gamitin ang Direct Squad Account Sign-In sa ibaba.';
      }

      setAuthError(msg);
      setAuthErrorCode(code || 'auth/error');
      return { ok: false, error: msg, code: code || 'auth/error' };
    } finally {
      setSigningIn(false);
    }
  };

  const signInWithSquadAccount = ({
    displayName,
    email,
  }: {
    displayName: string;
    email: string;
  }) => {
    const cleanName = displayName.trim() || email.split('@')[0] || 'NGD Player';
    const cleanEmail = email.trim().toLowerCase();
    const newUser: AppUser = {
      uid: `squad_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`,
      displayName: cleanName,
      email: cleanEmail,
      authMethod: 'squad_account',
    };
    setFallbackUser(newUser);
    setAuthError(null);
    setAuthErrorCode(null);
    try {
      localStorage.setItem(SQUAD_ACCOUNT_STORAGE_KEY, JSON.stringify(newUser));
    } catch {
      // Ignore storage error
    }
  };

  const signOut = async () => {
    setAuthError(null);
    setAuthErrorCode(null);
    setFallbackUser(null);
    try {
      localStorage.removeItem(SQUAD_ACCOUNT_STORAGE_KEY);
    } catch {
      // Ignore storage error
    }
    try {
      await firebaseSignOut(auth);
      setIdToken(null);
    } catch {
      // Ignore sign-out errors gracefully
    }
  };

  const getFreshToken = async (): Promise<string | null> => {
    if (!auth.currentUser) return null;
    try {
      const token = await auth.currentUser.getIdToken();
      setIdToken(token);
      return token;
    } catch {
      return null;
    }
  };

  const activeUser: AppUser | null = firebaseUser
    ? {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        authMethod: 'google',
        linkedIgn,
      }
    : fallbackUser
      ? {
          ...fallbackUser,
          linkedIgn,
        }
      : null;

  return (
    <AuthContext.Provider
      value={{
        user: activeUser,
        idToken,
        loading,
        signingIn,
        authError,
        authErrorCode,
        linkedIgn,
        linkMyIgn,
        unlinkMyIgn,
        clearAuthError,
        signInWithGoogle,
        signInWithSquadAccount,
        signOut,
        getFreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
