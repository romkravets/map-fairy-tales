"use client";
import { FC, useEffect, useContext, ReactNode } from "react";
import { auth } from "../../db/firebase";
import { UserAuthBuilder } from "../../../context/context";

// interface User {
//   email: string | null; // Allow email to be null
//   displayName: string | null; // Allow displayName to be null
//   uid: string;
//   getIdToken: () => Promise<string>;
// }

const AuthStateWrapper = ({ children }) => {
  const { setUser } = useContext(UserAuthBuilder);

  useEffect(() => {
    const handleAuthStateChanged = async (user) => {
      if (user) {
        try {
          const idToken = await user.getIdToken();
          setUser(prevState => ({
            ...prevState,
            isAuthenticated: true,
            token: idToken,
            email: user.email,
            userName: user.displayName,
            userId: user.uid,
            isError: false, // Adjust according to your context
            errorMessage: '', // Adjust according to your context
          }));
        } catch (error) {
          console.error('Error getting ID token:', error);
          setUser(prevState => ({
            ...prevState,
            isAuthenticated: false,
            token: null,
            email: null,
            userName: null,
            userId: null,
            isError: true,
            errorMessage: error.message || 'An error occurred',
          }));
        }
      } else {
        setUser({
          isAuthenticated: false,
          token: null,
          email: null,
          userName: null,
          userId: null,
          isError: false,
          errorMessage: '',
        });
      }
    };

    const unsubscribe = auth.onAuthStateChanged(handleAuthStateChanged);
    return () => unsubscribe();
  }, [setUser]);

  return <>{children}</>;
};

export default AuthStateWrapper;
