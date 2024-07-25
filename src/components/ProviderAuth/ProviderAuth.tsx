// context/Provider.tsx
import React, { useState } from 'react';
import { UserAuthBuilder } from '../../helpers/context/context';

const Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{
    token: string;
    isError: boolean;
    errorMessage: string;
    userId: string;
    userName: string;
    email: string;
    isAuthenticated: boolean;
  }>({
    token: "",
    isError: false,
    errorMessage: "",
    userId: "",
    userName: "",
    email: "",
    isAuthenticated: false,
  });

  return (
    <UserAuthBuilder.Provider value={{ user, setUser }}>
      {children}
    </UserAuthBuilder.Provider>
  );
};

export default Provider;
