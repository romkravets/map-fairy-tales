// 'use client'
// import { createContext, useState } from "react";
// export const UserAuthBuilder = createContext({});
//
// function Context({ children }) {
// const [user, setUser] = useState({});
// console.log(user)
//
// return (
//   <UserAuthBuilder.Provider value={{ user, setUser }}>
//    {children}
//   </UserAuthBuilder.Provider >
// );
// }
//
// export default Context
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
  console.log(user ,'user')
  return (
    <UserAuthBuilder.Provider value={{ user, setUser }}>
      {children}
    </UserAuthBuilder.Provider>
  );
};

