import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { authService } from '../services/apiService';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // 🔐 בדיקת התחברות בעת טעינת האפליקציה
  useEffect(() => {
    const initAuth = () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const decoded = jwtDecode(token);
        const now = Date.now() / 1000;

        if (decoded.exp && decoded.exp < now) {
          localStorage.removeItem('token');
          setUser(null);
          setIsAuthenticated(false);
        } else {
          setUser(decoded);
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.error('Invalid token:', err);
        localStorage.removeItem('token');
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // 🔑 Login
  const login = async (credentials) => {
    try {
      setLoading(true);

      const response = await authService.login(credentials);
      const { token } = response.data;

      localStorage.setItem('token', token);

      const decoded = jwtDecode(token);
      setUser(decoded);
      setIsAuthenticated(true);

      // ניתוב לפי תפקיד
      if (decoded.role === 'Manager') {
        navigate('/manager', { replace: true });
      } else {
        navigate('/', { replace: true });
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          'Login failed. Please try again.',
      };
    } finally {
      setLoading(false);
    }
  };

  // 🚪 Logout
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
    navigate('/login', { replace: true });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        login,
        logout,
      }}
    >
      {/* ⏳ לא מרנדרים Routes עד שה-auth נבדק */}
      {!loading && children}
    </AuthContext.Provider>
  );
};
