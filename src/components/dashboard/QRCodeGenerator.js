import { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import QRCode from 'qrcode.react';
import styles from '@/styles/Home.module.css';
import Button from '@/components/ui/Button';
import { fetchAllEvents } from '@/lib/api';

export default function QRCodeGenerator({ selectedEvent }) {
  const [currentUrl, setCurrentUrl] = useState('');
  const [qrValue, setQrValue] = useState('');
  const [qrSize, setQrSize] = useState(200);
  const [colorDark, setColorDark] = useState('#000000');
  const [colorLight, setColorLight] = useState('#ffffff');
  
  // Fetch all events
  const { data: events, isLoading, error } = useQuery(
    'events', 
    fetchAllEvents
  );

  // Set QR code value when selected event changes
  useEffect(() => {
    if (selectedEvent && typeof window !== 'undefined') {
      const baseUrl = window.location.origin;
      const signInUrl = `${baseUrl}/signin/${selectedEvent.id}`;
      setQrValue(signInUrl);
      setCurrentUrl(signInUrl);
    } else {
      setQrValue('');
      setCurrentUrl('');
    }
  }, [selectedEvent]);

  // Handle download QR code
  const handleDownloadQR = () => {
    const canvas = document.getElementById('qr-code-canvas');
    const pngUrl = canvas
      .toDataURL('image/png')
      .replace('image/png', 'image/octet-stream');
    
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `event-qr-${selectedEvent?.id.substring(0, 8) || 'code'}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  // Handle copy URL to clipboard
  const handleCopyUrl = () => {
    if (navigator.clipboard && qrValue) {
      navigator.clipboard.writeText(qrValue)
        .then(() => {
          alert('URL copied to clipboard!');
        })
        .catch(err => {
          console.error('Failed to copy URL: ', err);
          alert('Failed to copy URL. Please try again.');
        });
    }
  };

  if (!selectedEvent) {
    return (
      <div className={styles.qrCodeContainer}>
        <h2>QR Code Generator</h2>
        <div className={styles.noEventSelected}>
          <p>Please select an event to generate a QR code</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.qrCodeContainer}>
      <h2>QR Code Generator</h2>
      
      <div className={styles.qrContent}>
        <div className={styles.qrOptions}>
          <div className={styles.optionGroup}>
            <h3>Event</h3>
            <div className={styles.selectedEventInfo}>
              <div className={styles.eventInfo}>
                <strong>ID:</strong> #{selectedEvent.id.substring(0, 8)}
              </div>
              <div className={styles.eventStatus}>
                <span className={`${styles.statusIndicator} ${selectedEvent.status === 'enabled' ? styles.enabled : styles.disabled}`}></span>
                {selectedEvent.status === 'enabled' ? 'Active' : 'Inactive'}
              </div>
            </div>
            
            {selectedEvent.status !== 'enabled' && (
              <div className={styles.warningMessage}>
                ⚠️ This event is not active. Visitors won't be able to sign in.
              </div>
            )}
          </div>
          
          <div className={styles.optionGroup}>
            <h3>QR Code Options</h3>
            <div className={styles.optionItem}>
              <label htmlFor="qr-size">Size</label>
              <input
                id="qr-size"
                type="range"
                min="150"
                max="350"
                value={qrSize}
                onChange={(e) => setQrSize(Number(e.target.value))}
                className={styles.rangeInput}
              />
              <span>{qrSize}px</span>
            </div>
            
            <div className={styles.optionItem}>
              <label htmlFor="color-dark">Foreground</label>
              <input
                id="color-dark"
                type="color"
                value={colorDark}
                onChange={(e) => setColorDark(e.target.value)}
                className={styles.colorInput}
              />
            </div>
            
            <div className={styles.optionItem}>
              <label htmlFor="color-light">Background</label>
              <input
                id="color-light"
                type="color"
                value={colorLight}
                onChange={(e) => setColorLight(e.target.value)}
                className={styles.colorInput}
              />
            </div>
          </div>
          
          <div className={styles.optionGroup}>
            <h3>Sign-in URL</h3>
            <div className={styles.urlDisplay}>
              <input
                type="text"
                value={currentUrl}
                readOnly
                className={styles.urlInput}
              />
              <Button 
                onClick={handleCopyUrl}
                className={styles.copyButton}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-copy">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copy
              </Button>
            </div>
          </div>
        </div>
        
        <div className={styles.qrCodeDisplay}>
          <div className={styles.qrWrapper}>
            {qrValue ? (
              <QRCode
                id="qr-code-canvas"
                value={qrValue}
                size={qrSize}
                fgColor={colorDark}
                bgColor={colorLight}
                level="H"
                includeMargin={true}
                renderAs="canvas"
              />
            ) : (
              <div className={styles.noQrCode}>
                <p>No QR code available</p>
              </div>
            )}
          </div>
          
          <div className={styles.qrActions}>
            <Button 
              onClick={handleDownloadQR}
              disabled={!qrValue}
              className={styles.downloadButton}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-download">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download QR Code
            </Button>
          </div>
          
          <div className={styles.qrInstructions}>
            <h4>How to use this QR code:</h4>
            <ol>
              <li>Download the QR code or share the URL directly</li>
              <li>Visitors can scan this code with their smartphone camera</li>
              <li>They'll be directed to your sign-in page</li>
              <li>After completing the form, their attendance will be registered</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
