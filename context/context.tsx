"use client"
import React, { createContext, useState, ReactNode } from 'react';

interface User {
  token: string;
  isError: boolean;
  errorMessage: string;
  userId: string;
  userName: string;
  email: string;
  isAuthenticated: boolean;
}

interface UserAuthBuilderContextType {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User>>;
}

const initialUser: User = {
  token: "",
  isError: false,
  errorMessage: "",
  userId: "",
  userName: "",
  email: "",
  isAuthenticated: false,
};

export const UserAuthBuilder = createContext<UserAuthBuilderContextType>({
  user: initialUser,
  setUser: () => {},
});

export const UserAuthBuilderProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User>(initialUser);
  
  return (
    <UserAuthBuilder.Provider value={{ user, setUser }}>
      {children}
    </UserAuthBuilder.Provider>
  );
};

