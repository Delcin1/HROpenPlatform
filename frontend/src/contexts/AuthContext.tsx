import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiClient } from '../api/config';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, confirmPassword: string) => Promise<void>;
  restore: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setIsAuthenticated(false);
    if (location.pathname !== '/login') {
      navigate('/login', { replace: true });
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    const validateToken = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        // Try to get profile to validate token
        await apiClient.get('/api/v1/profile');
        setIsAuthenticated(true);
      } catch (error) {
        console.log('Token validation failed, trying refresh...');
        // If token is invalid, try to refresh
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          try {
            const response = await apiClient.post('/api/v1/auth/refresh', null, {
              headers: {
                Authorization: `Bearer ${refreshToken}`,
              },
            });
            const { access_token, refresh_token } = response.data;
            localStorage.setItem('access_token', access_token);
            localStorage.setItem('refresh_token', refresh_token);
            setIsAuthenticated(true);
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            handleLogout();
          }
        } else {
          handleLogout();
        }
      } finally {
        setIsLoading(false);
      }
    };

    validateToken();
  }, [handleLogout]);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.post('/api/v1/auth/login', {
        email,
        password,
      });

      const { access_token, refresh_token } = response.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      setIsAuthenticated(true);
      navigate('/', { replace: true });
    } catch (error: any) {
      console.error('Login failed:', error.response?.data || error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/api/v1/auth/logout');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      handleLogout();
    }
  };

  const register = async (email: string, password: string, confirmPassword: string) => {
    try {
      const response = await apiClient.post('/api/v1/auth/register', {
        email,
        password,
        confirm_password: confirmPassword,
      });

      const { access_token, refresh_token } = response.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      setIsAuthenticated(true);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const restore = async (email: string) => {
    try {
      await apiClient.post('/api/v1/auth/restore', { email });
    } catch (error) {
      console.error('Password restoration failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        login,
        logout,
        register,
        restore,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 