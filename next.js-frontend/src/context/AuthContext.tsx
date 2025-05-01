import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { User } from "../types";
import { getCurrentUser, login, logout, register } from "../lib/api";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, organizationName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (err) {
        console.error("Error fetching user:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleLogin = async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const userData = await login({ username, password });
      setUser(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (username: string, password: string, organizationName: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const userData = await register({ username, password, organizationName });
      setUser(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await logout();
      setUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logout failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}