import { useState } from 'react';
import { useRouter } from 'next/router';
import styles from '@/styles/Home.module.css';
import { useAuth } from '@/hooks/useAuth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function RegisterForm() {
  const router = useRouter();
  const { register, isLoading, error } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    hostName: '',
    email: '',
  });
  const [formErrors, setFormErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }
    
    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.hostName.trim()) {
      errors.hostName = 'Host name is required';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      // Remove confirmPassword before sending
      const { confirmPassword, ...registerData } = formData;
      await register(registerData);
      router.push('/dashboard');
    } catch (err) {
      console.error('Registration error:', err);
    }
  };

  return (
    <div className={styles.registerFormContainer}>
      <h2>Register</h2>
      <form onSubmit={handleSubmit} className={styles.authForm}>
        {error && (
          <div className={styles.formError}>{error}</div>
        )}
        
        <Input
          label="Username"
          name="username"
          type="text"
          value={formData.username}
          onChange={handleChange}
          required
          error={formErrors.username}
        />
        
        <Input
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          required
          error={formErrors.password}
        />
        
        <Input
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
          error={formErrors.confirmPassword}
        />
        
        <Input
          label="Host/Organization Name"
          name="hostName"
          type="text"
          value={formData.hostName}
          onChange={handleChange}
          required
          error={formErrors.hostName}
        />
        
        <Input
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          error={formErrors.email}
        />
        
        <Button 
          type="submit" 
          disabled={isLoading}
          className={styles.authButton}
        >
          {isLoading ? 'Registering...' : 'Register'}
        </Button>
      </form>
    </div>
  );
}
