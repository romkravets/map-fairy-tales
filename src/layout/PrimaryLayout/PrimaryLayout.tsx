"use client";
import { FC, ReactNode, useContext, useState } from "react";
import Link from "next/link";
import { UserAuthBuilder } from "../../../context/context";
import { auth } from "@/db/firebase";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import logo from "../../../public/assets/map-icon/logo.svg";
import sunIcon from "../../../public/assets/map-icon/san.svg";
import saturnIcon from "../../../public/assets/map-icon/saturn.svg";
import jupiterIcon from "../../../public/assets/map-icon/jupiter.svg";
import logoutIcon from "../../../public/assets/map-icon/logout.svg";
import styles from "./PrimaryLayout.module.css";

interface PrimaryLayoutProps {
  children: ReactNode;
}

const PrimaryLayout: FC<PrimaryLayoutProps> = ({ children }) => {
  const { user, setUser } = useContext(UserAuthBuilder);
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  const handleSignOut = () => {
    auth
      .signOut()
      .then(() => {
        setUser((prev) => ({
          ...prev,
          isAuthenticated: false,
          token: "",
          email: "",
          userName: "",
          userId: "",
        }));
      })
      .then(() => router.push("/"))
      .catch((err) => console.error("Sign-out error:", err));
  };

  return (
    <>
      <header>
        <div className={styles.header}>
          {/* ── Logo ── */}
          <div className={styles.logoContainer}>
            <Link href="/">
              <Image
                src={logo}
                alt="AI Stories logo"
                width={32}
                height={32}
                className={styles.logoImg}
              />
              <span className={styles.logoText}>Stories</span>
            </Link>
          </div>

          {/* ── Navigation ── */}
          <nav className={styles.nav}>
            <Link
              href="/"
              className={`${styles.navLink} ${isActive("/") ? styles.navLinkActive : ""}`}
            >
              <Image
                src={sunIcon}
                alt=""
                width={16}
                height={16}
                className={styles.navIcon}
              />
              World
            </Link>

            {user.isAuthenticated && user.userId ? (
              <>
                <div className={styles.navDivider} />

                <Link
                  href="/settings"
                  className={`${styles.navLink} ${isActive("/settings") ? styles.navLinkActive : ""}`}
                >
                  <Image
                    src={jupiterIcon}
                    alt=""
                    width={16}
                    height={16}
                    className={styles.navIcon}
                  />
                  My stories
                </Link>

                <div className={styles.navDivider} />

                <button className={styles.signOutBtn} onClick={handleSignOut}>
                  <Image
                    src={logoutIcon}
                    alt=""
                    width={16}
                    height={16}
                    className={styles.navIcon}
                  />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <div className={styles.navDivider} />
                <Link
                  href="/auth"
                  className={`${styles.navLink} ${isActive("/auth") ? styles.navLinkActive : ""}`}
                >
                  <Image
                    src={saturnIcon}
                    alt=""
                    width={16}
                    height={16}
                    className={styles.navIcon}
                  />
                  Sign In / Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className={styles.main}>{children}</main>
    </>
  );
};

export default PrimaryLayout;
