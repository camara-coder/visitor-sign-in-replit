import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { loginUser, logoutUser, registerUser, getCurrentUser } from '@/lib/api';

export function useAuth() {
  const queryClient = useQueryClient();
  const [error, setError] = useState(null);

  // Fetch current user
  const { 
    data: user, 
    isLoading: isUserLoading,
    refetch: refetchUser,
  } = useQuery('currentUser', getCurrentUser, {
    retry: 0,
    onError: () => {
      queryClient.setQueryData('currentUser', null);
    },
  });

  // Login mutation
  const {
    mutate: loginMutate,
    isLoading: isLoginLoading,
  } = useMutation(loginUser, {
    onSuccess: (userData) => {
      queryClient.setQueryData('currentUser', userData);
      setError(null);
    },
    onError: (err) => {
      setError(err.message || 'Failed to login. Please check your credentials.');
    },
  });

  // Register mutation
  const {
    mutate: registerMutate,
    isLoading: isRegisterLoading,
  } = useMutation(registerUser, {
    onSuccess: (userData) => {
      queryClient.setQueryData('currentUser', userData);
      setError(null);
    },
    onError: (err) => {
      setError(err.message || 'Failed to register. Please try again.');
    },
  });

  // Logout mutation
  const {
    mutate: logoutMutate,
    isLoading: isLogoutLoading,
  } = useMutation(logoutUser, {
    onSuccess: () => {
      queryClient.setQueryData('currentUser', null);
      setError(null);
    },
    onError: (err) => {
      setError(err.message || 'Failed to logout. Please try again.');
    },
  });

  const login = useCallback((credentials) => {
    setError(null);
    return loginMutate(credentials);
  }, [loginMutate]);

  const register = useCallback((userData) => {
    setError(null);
    return registerMutate(userData);
  }, [registerMutate]);

  const logout = useCallback(() => {
    setError(null);
    return logoutMutate();
  }, [logoutMutate]);

  const isLoading = isUserLoading || isLoginLoading || isRegisterLoading || isLogoutLoading;

  return {
    user,
    login,
    register,
    logout,
    isLoading,
    error,
    refetchUser,
  };
}
