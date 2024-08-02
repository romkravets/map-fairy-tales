// components/BuilderLayout.tsx
import { useRouter } from "next/router";
import Link from "next/link";
import { useContext } from "react";
import { UserAuthBuilder } from "../../helpers/context/context";
import { auth } from "@/db/firebase";
import { FC, ReactNode } from 'react';

interface BuilderLayoutProps {
  children: ReactNode;
}

const BuilderLayout: FC<BuilderLayoutProps> = ({ children }) => {
  const contextUserData = useContext(UserAuthBuilder);
  const router = useRouter();

  if (!contextUserData) {
    throw new Error('contextUserData must be used within a UserAuthBuilder Provider');
  }

  return (
    <div className="builder">
      <nav className="builder-nav">
        <ul className="builder-ul">
          <li className="builder-li-main"><Link href="/">Головна</Link></li>
          <li className="builder-li-builder"><Link href="/builder">Конструктор</Link></li>
          <li className="builder-li-profile">
            <Link href="/builder/settings">Налаштування</Link>
          </li>
          <li className="builder-li-exit">
            <button onClick={() => {
              auth.signOut().then(() => {
                contextUserData.setUser(prevState => ({
                  ...prevState,
                  isAuthenticated: false,
                  userName: '',
                  userId: '',
                  email: '',
                  token: ''
                }));
                router.push('/');
              }).catch((error) => {
                console.error('Sign Out Error', error);
              });
            }}>Вихід</button>
          </li>
        </ul>
      </nav>
      {children}
    </div>
  );
};

export default BuilderLayout;
