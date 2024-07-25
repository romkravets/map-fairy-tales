// context/context.tsx
import { createContext, Dispatch, SetStateAction } from 'react';

interface UserAuthBuilderContextType {
  user: {
    token: string;
    isError: boolean;
    errorMessage: string;
    userId: string;
    userName: string;
    email: string;
    isAuthenticated: boolean;
  };
  setUser: Dispatch<SetStateAction<{
    token: string;
    isError: boolean;
    errorMessage: string;
    userId: string;
    userName: string;
    email: string;
    isAuthenticated: boolean;
  }>>;
}

const initialContextValue: UserAuthBuilderContextType = {
  user: {
    token: "",
    isError: false,
    errorMessage: "",
    userId: "",
    userName: "",
    email: "",
    isAuthenticated: false,
  },
  setUser: () => {} // Default function that does nothing
};

export const UserAuthBuilder = createContext<UserAuthBuilderContextType>(initialContextValue);
