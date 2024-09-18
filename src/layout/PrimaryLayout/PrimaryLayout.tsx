"use client";
import {FC, ReactNode, useContext} from 'react';
import Link from "next/link";
import {UserAuthBuilder} from "../../../context/context";
import {auth} from "@/db/firebase";
import {useRouter} from 'next/navigation';
import Button from '@mui/material/Button';
import logo from '../../../public/assets/map-icon/logo.svg'
import Image from "next/image";
import sunIcon from '../../../public/assets/map-icon/san.svg'
import saturnIcon from '../../../public/assets/map-icon/saturn.svg'

interface PrimaryLayoutProps {
  children: ReactNode;
}

const PrimaryLayout: FC<PrimaryLayoutProps> = ({children}) => {
  const {user, setUser} = useContext(UserAuthBuilder);
  const router = useRouter();
  return (
    <>
      <header>
        <div className="header">
          <div className="logo-container">
            <Link href="/">
              <Image src={logo} alt={'logo'}/>
              AI Stories
            </Link>
          </div>
          <div className="header-account">
            {user.isAuthenticated && user.userId ?
              <>
                <Link
                  component="link"
                  href='/settings'
                  style={{display: 'flex', alignItems: 'center'}}
                >
                  <Image src={sunIcon} alt="AI Stories"/>
                  <span>You Home</span>
                </Link>
                <Button
                  style={{marginLeft: 20}}
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
                    }).then(() => {
                      router.push('/');
                    }).catch((error) => {
                      console.error('Error during sign-out:', error);
                    });
                  }}>SignOut</Button>
              </>
              : <Link
                component="link"
                href="/auth">
                <Image src={saturnIcon} alt="AI Stories"/>
                Login
              </Link>
            }
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
