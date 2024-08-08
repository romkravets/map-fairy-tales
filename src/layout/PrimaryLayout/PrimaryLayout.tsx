"use client";
import {FC, ReactNode, useContext} from 'react';
import Link from "next/link";
import {UserAuthBuilder} from "../../../context/context";

interface PrimaryLayoutProps {
  children: ReactNode;
}

const PrimaryLayout: FC<PrimaryLayoutProps> = ({ children }) => {
  const { user } = useContext(UserAuthBuilder);
  console.log('PrimaryLayout', user)
  return (
    <div>
      <header>
        <Link href="/auth/login">Login</Link>
      </header>
      {children}
    </div>
  )
}

export default PrimaryLayout
