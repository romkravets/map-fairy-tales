import { FC, ReactNode } from 'react';
import Link from "next/link";

interface PrimaryLayoutProps {
  children: ReactNode;
}

const PrimaryLayout: FC<PrimaryLayoutProps> = ({ children }) => {
  return (
    <div>
      <div><Link href="/auth/login">Login</Link></div>
      {children}
    </div>
  )
}

export default PrimaryLayout
