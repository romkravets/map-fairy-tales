"use client";
import {FC, ReactNode, useContext} from 'react';
import Link from "next/link";
import {UserAuthBuilder} from "../../../context/context";
import {auth} from "@/db/firebase";
import { usePathname } from 'next/navigation';

interface PrimaryLayoutProps {
  children: ReactNode;
}

const PrimaryLayout: FC<PrimaryLayoutProps> = ({children}) => {
  const {user, setUser} = useContext(UserAuthBuilder);
  const pathname = usePathname();

  return (
    <div>
      <header>
        <div>
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
        </div>
        <div>
          {pathname != '/' && <Link href="/">Back</Link>}
        </div>
      </header>
      {children}
    </div>
  )
}

export default PrimaryLayout
