import { useState } from 'react';
import { useRouter } from 'next/router';
import styles from '@/styles/Home.module.css';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { registerVisitor } from '@/lib/api';

export default function SignInForm({ eventId, event }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    address: '',
    phoneNumber: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    // Basic phone validation
    if (formData.phoneNumber && !/^\+?[\d\s()-]{8,15}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await registerVisitor({
        ...formData,
        eventId,
      });
      
      // Redirect to confirmation page with status
      router.push(`/confirmation/${eventId}?status=${response.status}`);
    } catch (error) {
      console.error('Error registering visitor:', error);
      
      if (error.message === 'duplicate_registration') {
        setErrors({ general: 'You have already signed in to this event.' });
      } else if (error.message === 'missing_information') {
        setErrors({ general: 'Please fill in all required fields.' });
      } else if (error.message === 'no_event_available') {
        setErrors({ general: 'This event is not currently available for sign-in.' });
      } else {
        setErrors({ general: 'An error occurred while signing in. Please try again.' });
      }
      
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <h2>Sign In to Event</h2>
      {event && (
        <div className={styles.eventInfo}>
          <p>Please fill in your information below to sign in to this event.</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className={styles.form}>
        {errors.general && (
          <div className={styles.errorMessage}>{errors.general}</div>
        )}
        
        <div className={styles.formRow}>
          <Input
            label="First Name"
            name="firstName"
            type="text"
            value={formData.firstName}
            onChange={handleChange}
            required
            error={errors.firstName}
          />
          
          <Input
            label="Last Name"
            name="lastName"
            type="text"
            value={formData.lastName}
            onChange={handleChange}
            required
            error={errors.lastName}
          />
        </div>
        
        <Input
          label="Address"
          name="address"
          type="text"
          value={formData.address}
          onChange={handleChange}
        />
        
        <Input
          label="Phone Number"
          name="phoneNumber"
          type="tel"
          value={formData.phoneNumber}
          onChange={handleChange}
          error={errors.phoneNumber}
        />
        
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className={styles.continueButton}
        >
          {isSubmitting ? 'Processing...' : 'Continue'}
        </Button>
      </form>
    </div>
  );
}
