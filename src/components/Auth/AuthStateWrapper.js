"use client"
import { useEffect, useContext } from "react";
import { auth } from "../../db/firebase";
import { UserAuthBuilder } from "../../../context/context";

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
          }));
        } catch (error) {
          console.error(error);
        }
      }
    };

    const unsubscribe = auth.onAuthStateChanged(handleAuthStateChanged);
    return () => unsubscribe();
  }, [setUser]);


  return <>{children}</>;
};

export default AuthStateWrapper;
