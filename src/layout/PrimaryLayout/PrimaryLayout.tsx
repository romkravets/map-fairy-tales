"use client";
import {FC, ReactNode, useContext} from 'react';
import Link from "next/link";
import {UserAuthBuilder} from "../../../context/context";
import {auth} from "@/db/firebase";

interface PrimaryLayoutProps {
  children: ReactNode;
}

const PrimaryLayout: FC<PrimaryLayoutProps> = ({children}) => {
  const {user, setUser} = useContext(UserAuthBuilder);
  return (
    <div>
      <header>
        <Link href="/">Logo</Link>
        {user.isAuthenticated && user.userId ?
          <>
          <button onClick={() => {
          auth.signOut().then(() => {
            setUser(prevState => ({
              ...prevState,
              isAuthenticated: false,
              token: '',
              email: '',
              userName: '',
              userId: '',
            }));
          })
        }}>SignOut</button>
            <Link href='/settings'>User</Link>
          </>
        : <Link href="/auth">Login</Link>}

      </header>
      {children}
    </div>
  )
}

export default PrimaryLayout
