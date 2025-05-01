import styles from '@/styles/Home.module.css';

export default function Button({ 
  children, 
  type = 'button', 
  disabled = false, 
  onClick, 
  className = '',
  variant = 'primary',
  size = 'medium',
}) {
  const buttonClassName = `
    ${styles.button} 
    ${styles[`button${variant.charAt(0).toUpperCase() + variant.slice(1)}`]} 
    ${styles[`button${size.charAt(0).toUpperCase() + size.slice(1)}`]}
    ${className}
  `;

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={buttonClassName}
    >
      {children}
    </button>
  );
}
