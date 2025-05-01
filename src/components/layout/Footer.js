import styles from '@/styles/Home.module.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <div className={styles.footerLogo}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-check-square">
            <polyline points="9 11 12 14 22 4"></polyline>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
          <span>Event Sign-In System</span>
        </div>
        
        <div className={styles.footerCopyright}>
          &copy; {currentYear} All rights reserved
        </div>
        
        <div className={styles.footerLinks}>
          <a href="#privacy" className={styles.footerLink}>Privacy Policy</a>
          <a href="#terms" className={styles.footerLink}>Terms of Service</a>
          <a href="#contact" className={styles.footerLink}>Contact</a>
        </div>
      </div>
    </footer>
  );
}
