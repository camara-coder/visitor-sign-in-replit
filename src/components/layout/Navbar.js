import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '@/styles/Home.module.css';
import { useAuth } from '@/hooks/useAuth';

export default function Navbar() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.navbarContent}>
        <div className={styles.navbarBrand}>
          <Link href="/">
            <span className={styles.logo}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-check-square">
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              Event Sign-In
            </span>
          </Link>
        </div>

        <div className={styles.mobileMenuButton} onClick={toggleMenu}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-menu">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </div>

        <div className={`${styles.navbarLinks} ${isMenuOpen ? styles.open : ''}`}>
          {user ? (
            <>
              <Link href="/dashboard">
                <span className={router.pathname === '/dashboard' ? styles.active : ''}>
                  Dashboard
                </span>
              </Link>
              <div className={styles.userInfo}>
                <span className={styles.userName}>
                  {user.hostName || user.username}
                </span>
                <button onClick={handleLogout} className={styles.logoutButton} disabled={isLoading}>
                  {isLoading ? 'Logging out...' : 'Logout'}
                </button>
              </div>
            </>
          ) : (
            <Link href="/auth">
              <span className={router.pathname === '/auth' ? styles.active : ''}>
                Login
              </span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
