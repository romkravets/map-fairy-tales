"use client";
import { FC, ReactNode, useContext, useState, useEffect } from "react";
import Link from "next/link";
import { UserAuthBuilder } from "../../../context/context";
import { auth } from "../../db/firebase";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import logo from "../../../public/assets/map-icon/logo.svg";
import sunIcon from "../../../public/assets/map-icon/san.svg";
import saturnIcon from "../../../public/assets/map-icon/saturn.svg";
import jupiterIcon from "../../../public/assets/map-icon/jupiter.svg";
import logoutIcon from "../../../public/assets/map-icon/logout.svg";
import AccessibilityPanel from "@/components/AccessibilityPanel/AccessibilityPanel";
import styles from "./PrimaryLayout.module.css";

interface PrimaryLayoutProps {
  children: ReactNode;
}

const PrimaryLayout: FC<PrimaryLayoutProps> = ({ children }) => {
  const { user, setUser } = useContext(UserAuthBuilder);
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) => pathname === path;
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    closeMenu();
  }, [pathname]);

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
      .then(() => {
        closeMenu();
        router.push("/");
      })
      .catch((err) => console.error("Sign-out error:", err));
  };

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <header>
        <div className={styles.header}>
          {/* ── Logo ── */}
          <div className={styles.logoContainer}>
            <Link href="/" onClick={closeMenu}>
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

          {/* ── Right side: desktop nav + accessibility + hamburger ── */}
          <div className={styles.headerRight}>
            {/* Desktop nav (hidden on mobile via CSS) */}
            <nav className={styles.nav} aria-label="Main navigation">
              <Link
                href="/"
                className={`${styles.navLink} ${isActive("/") ? styles.navLinkActive : ""}`}
                {...(isActive("/") ? { "aria-current": "page" as const } : {})}
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

              <div className={styles.navDivider} aria-hidden="true" />

              <Link
                href="/explore"
                className={`${styles.navLink} ${isActive("/explore") ? styles.navLinkActive : ""}`}
                {...(isActive("/explore") ? { "aria-current": "page" as const } : {})}
              >
                <svg
                  aria-hidden="true"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={styles.navIcon}
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                Explore
              </Link>

              {user.isAuthenticated && user.userId ? (
                <>
                  <div className={styles.navDivider} aria-hidden="true" />
                  <Link
                    href="/settings"
                    className={`${styles.navLink} ${isActive("/settings") ? styles.navLinkActive : ""}`}
                    {...(isActive("/settings") ? { "aria-current": "page" as const } : {})}
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

                  <div className={styles.navDivider} aria-hidden="true" />

                  <button
                    className={styles.signOutBtn}
                    onClick={handleSignOut}
                    aria-label="Sign out of account"
                  >
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
                  <div className={styles.navDivider} aria-hidden="true" />
                  <Link
                    href="/auth"
                    className={`${styles.navLink} ${isActive("/auth") ? styles.navLinkActive : ""}`}
                    {...(isActive("/auth") ? { "aria-current": "page" as const } : {})}
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

            {/* Accessibility panel — always visible */}
            <div className={styles.navDivider} aria-hidden="true" />
            <AccessibilityPanel />

            {/* Hamburger — mobile only */}
            <button
              className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ""}`}
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={menuOpen}
            >
              <span className={styles.hamburgerLine} />
              <span className={styles.hamburgerLine} />
              <span className={styles.hamburgerLine} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile nav backdrop ── */}
      {menuOpen && (
        <div
          className={styles.mobileNavBackdrop}
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile nav overlay ── */}
      <nav
        className={`${styles.mobileNav} ${menuOpen ? styles.mobileNavOpen : ""}`}
        aria-label="Mobile navigation"
        aria-hidden={!menuOpen}
      >
        <Link
          href="/"
          className={`${styles.mobileNavLink} ${isActive("/") ? styles.mobileNavLinkActive : ""}`}
          onClick={closeMenu}
          {...(isActive("/") ? { "aria-current": "page" as const } : {})}
        >
          <Image src={sunIcon} alt="" width={18} height={18} />
          World
        </Link>

        <div className={styles.mobileNavDivider} />

        <Link
          href="/explore"
          className={`${styles.mobileNavLink} ${isActive("/explore") ? styles.mobileNavLinkActive : ""}`}
          onClick={closeMenu}
          {...(isActive("/explore") ? { "aria-current": "page" as const } : {})}
        >
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Explore
        </Link>

        {user.isAuthenticated && user.userId ? (
          <>
            <div className={styles.mobileNavDivider} />
            <Link
              href="/settings"
              className={`${styles.mobileNavLink} ${isActive("/settings") ? styles.mobileNavLinkActive : ""}`}
              onClick={closeMenu}
              {...(isActive("/settings") ? { "aria-current": "page" as const } : {})}
            >
              <Image src={jupiterIcon} alt="" width={18} height={18} />
              My Stories
            </Link>

            <div className={styles.mobileNavDivider} />

            <button
              className={styles.mobileSignOutBtn}
              onClick={handleSignOut}
              aria-label="Sign out of account"
            >
              <Image src={logoutIcon} alt="" width={18} height={18} />
              Sign Out
            </button>
          </>
        ) : (
          <>
            <div className={styles.mobileNavDivider} />
            <Link
              href="/auth"
              className={`${styles.mobileNavLink} ${isActive("/auth") ? styles.mobileNavLinkActive : ""}`}
              onClick={closeMenu}
              {...(isActive("/auth") ? { "aria-current": "page" as const } : {})}
            >
              <Image src={saturnIcon} alt="" width={18} height={18} />
              Sign In / Sign Up
            </Link>
          </>
        )}
      </nav>

      <main id="main-content" className={styles.main}>
        {children}
      </main>
    </>
  );
};

export default PrimaryLayout;
