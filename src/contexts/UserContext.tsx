import React from 'react';

interface UserContextType {
  userName: string | null;
  setUserName: (userName: string | null) => void;
}

export const UserContext = React.createContext<UserContextType>({
  userName: null,
  setUserName: () => {},
});

export const useUser = () => {
  const context = React.useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserContext.Provider');
  }
  return context;
}; 