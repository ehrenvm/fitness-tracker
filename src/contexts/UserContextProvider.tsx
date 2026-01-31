import React, { useState } from 'react';
import { UserContext, UserContextType } from './UserContext';

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userName, setUserName] = useState<string | null>(null);

  const value: UserContextType = {
    userName,
    setUserName,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
