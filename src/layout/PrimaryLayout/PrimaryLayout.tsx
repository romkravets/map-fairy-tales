"use client";
import {FC, ReactNode, useContext} from 'react';
import Link from "next/link";
import {UserAuthBuilder} from "../../../context/context";
import {auth} from "@/db/firebase";
import {usePathname} from 'next/navigation';
import Button from '@mui/material/Button';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import logo from '../../../public/assets/map-icon/logo.svg'
import Image from "next/image";

interface PrimaryLayoutProps {
  children: ReactNode;
}

const PrimaryLayout: FC<PrimaryLayoutProps> = ({children}) => {
  const {user, setUser} = useContext(UserAuthBuilder);
  const pathname = usePathname();

  return (
    <>
      <header>
        <div className="header">
          <div className="logo-container">
            <Link href="/"><Image src={logo} alt={'logo'}/></Link>
          </div>
          <div className="header-account">
            {user.isAuthenticated && user.userId ?
              <>
                <Link
                  component="link"
                  href='/settings'>YOU HOME</Link>
              </>
              : <Link
                component="link"
                href="/auth">Login</Link>}
            <Button
              variant="contained"
              onClick={() => {
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
              }}>SignOut</Button>
          </div>
        </div>
      </header>
      <main>
        {children}
      </main>
    </>
  )
}

export default PrimaryLayout
