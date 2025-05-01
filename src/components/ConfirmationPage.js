import styles from '@/styles/Home.module.css';

export default function ConfirmationPage({ event, status }) {
  const isSuccess = status === 'success';
  
  const renderErrorMessage = () => {
    switch (status) {
      case 'duplicate_registration':
        return 'You have already signed in to this event.';
      case 'missing_information':
        return 'There was an issue with your information. Please go back and ensure all required fields are completed.';
      case 'no_event_available':
        return 'This event is not currently available for sign-in.';
      default:
        return 'There was an issue processing your sign-in. Please try again.';
    }
  };

  return (
    <div className={styles.confirmationContainer}>
      {isSuccess ? (
        <>
          <div className={styles.successAnimation}>
            <svg className={styles.checkmark} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
              <circle className={styles.checkmarkCircle} cx="26" cy="26" r="25" fill="none"/>
              <path className={styles.checkmarkCheck} fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
          </div>
          
          <h2 className={styles.welcomeMessage}>Welcome!</h2>
          <p className={styles.thankYouMessage}>
            Thank you for signing in. Your registration has been confirmed.
          </p>
          
          {event && event.socialMedia && (
            <div className={styles.socialMediaContainer}>
              <p>Connect with us:</p>
              <div className={styles.socialIcons}>
                {event.socialMedia.facebook && (
                  <a 
                    href={event.socialMedia.facebook} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className={styles.socialIcon}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-facebook">
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                    </svg>
                  </a>
                )}
                
                {event.socialMedia.instagram && (
                  <a 
                    href={event.socialMedia.instagram} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className={styles.socialIcon}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-instagram">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                    </svg>
                  </a>
                )}
                
                {event.socialMedia.youtube && (
                  <a 
                    href={event.socialMedia.youtube} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="YouTube"
                    className={styles.socialIcon}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-youtube">
                      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
                      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
                    </svg>
                  </a>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className={styles.errorAnimation}>
            <svg className={styles.errorIcon} xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          
          <h2 className={styles.errorTitle}>Sign-In Not Completed</h2>
          <p className={styles.errorMessage}>
            {renderErrorMessage()}
          </p>
          
          <button 
            onClick={() => window.history.back()} 
            className={styles.backButton}
          >
            Go Back
          </button>
        </>
      )}
    </div>
  );
}
