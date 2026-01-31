import React from 'react';

export interface UserContextType {
  userName: string | null;
  setUserName: (userName: string | null) => void;
}

export const UserContext = React.createContext<UserContextType | undefined>(undefined);

export const useUser = (): UserContextType => {
  const context = React.useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserContext.Provider');
  }
  return context;
};
