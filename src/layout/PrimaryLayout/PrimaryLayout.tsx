"use client";
import {FC, ReactNode, useContext, useState} from 'react';
import Link from "next/link";
import {UserAuthBuilder} from "../../../context/context";
import {auth} from "@/db/firebase";
import {useRouter, usePathname} from 'next/navigation';
import Button from '@mui/material/Button';
import logo from '../../../public/assets/map-icon/logo.svg'
import Image from "next/image";
import sunIcon from '../../../public/assets/map-icon/san.svg'
import saturnIcon from '../../../public/assets/map-icon/saturn.svg'
import jupiterIcon from '../../../public/assets/map-icon/jupiter.svg'


interface PrimaryLayoutProps {
  children: ReactNode;
}

const PrimaryLayout: FC<PrimaryLayoutProps> = ({children}) => {
  const {user, setUser} = useContext(UserAuthBuilder);
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  const [active, setActive] = useState(false)

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
            <Link
              className={isActive('/') ? 'active-header' : ''}
              onClick={() => setActive(!active)}
              href='/'
              style={{display: 'flex', alignItems: 'center', marginRight: 20}}
            >
              <Image src={sunIcon} alt="" style={{marginRight: 5}}/>
              <span>Home</span>
            </Link>
            {user.isAuthenticated && user.userId ?
              <>
                <Link
                  className={isActive('/settings') ? 'active-header' : ''}
                  onClick={() => setActive(!active)}
                  href='/settings'
                  style={{display: 'flex', alignItems: 'center'}}
                >
                  <Image src={jupiterIcon} alt="AI Stories" style={{marginRight: 5}}/>
                  <span>Account</span>
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
                className={isActive('/auth') ? 'active-header' : ''}
                onClick={() => setActive(!active)}
                href="/auth">
                <Image src={saturnIcon} alt="AI Stories" style={{marginRight: 5}}/>
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
