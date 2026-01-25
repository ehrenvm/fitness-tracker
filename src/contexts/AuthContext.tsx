import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  User
} from 'firebase/auth';
import { auth } from '../firebase';
import { logAnalyticsEvent } from '../firebase';
import { ANALYTICS_EVENTS } from '../constants/analytics';

interface AuthContextType {
  currentUser: User | null;
  isAdmin: boolean;
  signup: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      
      if (user) {
        void (async () => {
          try {
            const token = await user.getIdTokenResult();
            setIsAdmin(!!token.claims.admin);
          } catch (error) {
            console.error('Error checking admin status:', error);
            setIsAdmin(false);
          }
        })();
      } else {
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signup = async (email: string, password: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      logAnalyticsEvent(ANALYTICS_EVENTS.USER_SIGNUP, {
        userId: result.user.uid,
        email: result.user.email
      });
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      logAnalyticsEvent(ANALYTICS_EVENTS.USER_LOGIN, {
        userId: result.user.uid,
        email: result.user.email
      });
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (currentUser) {
        logAnalyticsEvent(ANALYTICS_EVENTS.USER_LOGOUT, {
          userId: currentUser.uid,
          email: currentUser.email
        });
      }
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value = {
    currentUser,
    isAdmin,
    signup,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 