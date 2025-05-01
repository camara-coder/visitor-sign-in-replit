import { createContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { loginUser, registerUser, logoutUser, getCurrentUser } from '@/lib/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState(null);

  // Get current user query
  const {
    data: user,
    isLoading: isUserLoading,
    refetch: refetchUser,
  } = useQuery('currentUser', getCurrentUser, {
    retry: 0,
    onError: () => {
      // Clear user data on error
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
      router.push('/auth');
      setError(null);
    },
    onError: (err) => {
      setError(err.message || 'Failed to logout. Please try again.');
    },
  });

  const login = async (credentials) => {
    setError(null);
    return loginMutate(credentials);
  };

  const register = async (userData) => {
    setError(null);
    return registerMutate(userData);
  };

  const logout = async () => {
    setError(null);
    return logoutMutate();
  };

  const isLoading = isUserLoading || isLoginLoading || isRegisterLoading || isLogoutLoading;

  // Clear error when changing routes
  useEffect(() => {
    const handleRouteChange = () => {
      setError(null);
    };

    router.events.on('routeChangeStart', handleRouteChange);
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        isLoading,
        error,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
