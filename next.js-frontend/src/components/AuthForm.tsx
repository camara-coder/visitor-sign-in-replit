import { useState } from "react";
import { login, register } from "@/lib/api";

interface AuthFormProps {
  onLoginSuccess: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export default function AuthForm({ onLoginSuccess, isLoading, setIsLoading }: AuthFormProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });
  const [registerData, setRegisterData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    organizationName: "",
  });
  const [error, setError] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginData.username || !loginData.password) {
      setError("Username and password are required");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await login(loginData);
      onLoginSuccess();
    } catch (err) {
      console.error("Login error:", err);
      setError("Invalid username or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!registerData.username || !registerData.password) {
      setError("Username and password are required");
      return;
    }
    
    if (registerData.password !== registerData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await register({
        username: registerData.username,
        password: registerData.password,
        organizationName: registerData.organizationName,
      });
      onLoginSuccess();
    } catch (err) {
      console.error("Registration error:", err);
      setError("Failed to register. Username may already exist.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Tab Navigation */}
      <div className="flex border-b">
        <button
          className={`w-1/2 py-3 font-medium text-sm ${
            activeTab === "login"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("login")}
        >
          Login
        </button>
        <button
          className={`w-1/2 py-3 font-medium text-sm ${
            activeTab === "register"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("register")}
        >
          Register
        </button>
      </div>

      {/* Form Content */}
      <div className="p-6">
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {activeTab === "login" ? (
          <form onSubmit={handleLoginSubmit}>
            <div className="mb-4">
              <label
                htmlFor="login-username"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Username
              </label>
              <input
                type="text"
                id="login-username"
                value={loginData.username}
                onChange={(e) =>
                  setLoginData({ ...loginData, username: e.target.value })
                }
                className="input-field"
                placeholder="Enter your username"
              />
            </div>

            <div className="mb-6">
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <input
                type="password"
                id="login-password"
                value={loginData.password}
                onChange={(e) =>
                  setLoginData({ ...loginData, password: e.target.value })
                }
                className="input-field"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit}>
            <div className="mb-4">
              <label
                htmlFor="register-username"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Username
              </label>
              <input
                type="text"
                id="register-username"
                value={registerData.username}
                onChange={(e) =>
                  setRegisterData({ ...registerData, username: e.target.value })
                }
                className="input-field"
                placeholder="Choose a username"
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="register-organization"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Organization Name
              </label>
              <input
                type="text"
                id="register-organization"
                value={registerData.organizationName}
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    organizationName: e.target.value,
                  })
                }
                className="input-field"
                placeholder="Your organization name"
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="register-password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <input
                type="password"
                id="register-password"
                value={registerData.password}
                onChange={(e) =>
                  setRegisterData({ ...registerData, password: e.target.value })
                }
                className="input-field"
                placeholder="Choose a password"
              />
            </div>

            <div className="mb-6">
              <label
                htmlFor="register-confirm-password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Confirm Password
              </label>
              <input
                type="password"
                id="register-confirm-password"
                value={registerData.confirmPassword}
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    confirmPassword: e.target.value,
                  })
                }
                className="input-field"
                placeholder="Confirm your password"
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={isLoading}
            >
              {isLoading ? "Registering..." : "Register"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
