import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

interface UserContextType {
  selectedUser: string | null;
  setSelectedUser: (user: string | null) => void;
}

const UserContext = createContext<UserContextType | null>(null);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  useEffect(() => {
    const loadLastUser = async () => {
      try {
        const lastUser = localStorage.getItem('lastSelectedUser');
        if (lastUser) {
          // Verify user still exists in database
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('name', '==', lastUser));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            setSelectedUser(lastUser);
          } else {
            localStorage.removeItem('lastSelectedUser');
          }
        }
      } catch (error) {
        console.error('Error loading last user:', error);
      }
    };

    loadLastUser();
  }, []);

  const handleSetSelectedUser = (user: string | null) => {
    setSelectedUser(user);
    if (user) {
      localStorage.setItem('lastSelectedUser', user);
    } else {
      localStorage.removeItem('lastSelectedUser');
    }
  };

  return (
    <UserContext.Provider value={{ selectedUser, setSelectedUser: handleSetSelectedUser }}>
      {children}
    </UserContext.Provider>
  );
};