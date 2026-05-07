import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export type UserRole = 'admin' | 'doj' | 'fib' | 'judge';
export type UserStatus = 'pending' | 'active' | 'inactive';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  wallpaperUrl?: string;
  createdAt: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = async () => {
    setProfile(null);
    setUser(null);
    await firebaseSignOut(auth).catch(() => {});
  };

  useEffect(() => {
    // 1. Inicializa o Firebase Auth
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Limpa listener anterior se houver
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      setUser(firebaseUser);
      
      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const userEmail = (firebaseUser.email || '').toLowerCase();
      const isAdminEmail = userEmail === 'nino.byttencourt@gmail.com' || userEmail === 'byttencourt@hotmail.com';
      
      console.log("Auth State Change:", userEmail, "isAdmin:", isAdminEmail);

      // Sync profile from Firestore
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      unsubscribeProfile = onSnapshot(userDocRef, async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          console.log("Perfil Firestore carregado:", data.email, "Status:", data.status);
          setProfile(data);
          setLoading(false);
        } else {
          console.log("Perfil Firestore não existe para:", userEmail, ". Criando perfil automático...");
          // Se o usuário não tem perfil, cria um automático
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Novo Usuário',
            role: isAdminEmail ? 'admin' : 'fib',
            status: isAdminEmail ? 'active' : 'pending',
            createdAt: new Date().toISOString()
          };
          
          try {
            await setDoc(userDocRef, {
              ...newProfile,
              serverTimestamp: serverTimestamp()
            });
            console.log("Perfil criado com sucesso!");
            setProfile(newProfile);
          } catch (e: any) {
            console.error("ERRO ao criar perfil no Firestore:", e.message);
            // Fallback para não travar o app
            setProfile(newProfile);
          }
          setLoading(false);
        }
      }, (error) => {
        console.error("Erro ao escutar mudanças no perfil:", error);
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// --- Firestore Error Handling ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
