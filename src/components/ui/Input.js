import styles from '@/styles/Home.module.css';

export default function Input({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  disabled = false,
}) {
  return (
    <div className={styles.inputContainer}>
      {label && (
        <label htmlFor={name} className={styles.inputLabel}>
          {label}
          {required && <span className={styles.requiredStar}>*</span>}
        </label>
      )}
      
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`${styles.input} ${error ? styles.inputError : ''}`}
      />
      
      {error && (
        <div className={styles.errorMessage}>{error}</div>
      )}
    </div>
  );
}
