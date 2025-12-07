import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Staff from './components/Staff';
import SalaryUpdate from './components/SalaryUpdate';
import Customer from './components/Customer';
import Revenue from './components/Revenue';
import Expense from './components/Expense';
import ExpenseSummary from './components/ExpenseSummary';
import ChangePassword from './components/ChangePassword';
import Toast from './components/Toast';
import './App.css';

function LoginPage({ onLogin, addToast }) {
  const [password, setPassword] = useState('');
  const [loginMessage, setLoginMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginMessage('');

    try {
      // console.log('env:', import.meta.env.VITE_BASE_API);
      const response = await fetch(`${import.meta.env.VITE_BASE_API}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (response.ok) {
        setLoginMessage('');
        addToast('Login successful!', 'success');
        onLogin();
      } else {
        addToast(data.error || 'Login failed', 'error');
        setLoginMessage(data.error || 'Login failed');
      }
    } catch (error) {
      addToast('Network error. Please try again.', 'error');
      setLoginMessage('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <div className="login-container">
        <div className="login-header">
          <img src="/Unity Fire Logo.jpg" alt="Unity Unisex Salon Logo" className="login-logo" />
          <h1>Unity Unisex Salon Management</h1>
        </div>

        <form className="login-form" onSubmit={handleLoginSubmit}>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={isLoading}
                style={{ paddingRight: '45px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: '#7f8c8d',
                  padding: '0',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                disabled={isLoading}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-credits">
          <p style={{ fontWeight: 'bold', fontStyle: 'italic' }}>Made by Jaimin Pansuriya x Jalpesh Patel</p>
        </div>

        {loginMessage && (
          <div className="error-message">
            {loginMessage}
          </div>
        )}
      </div>

      {/* Full Screen Loader Overlay */}
      {isLoading && (
        <div className="fullscreen-loader">
          <span className="loader"></span>
        </div>
      )}
    </div>
  );
}

function CustomerPage() {
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    try {
      const response = await fetch(`${import.meta.env.VITE_BASE_API}/api/persons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage('Person added successfully!');
        setFormData({ name: '', phone: '', email: '' });
      } else {
        setMessage(data.error || 'Failed to add person');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dashboard">
      <Navbar addToast={addToast} />
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Add Customer</h1>
          <p>Add new customers to your salon database</p>
        </div>

        <div className="person-form">
          <h2 className="form-title">Customer Information</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter customer's full name"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                id="phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
                required
                disabled={isSubmitting}
              />
            </div>

            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="loader"></span>
                  Adding Customer...
                </>
              ) : (
                'Add Customer'
              )}
            </button>
          </form>

          {message && (
            <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Session timeout duration: 8 hours (in milliseconds)
  const SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours

  useEffect(() => {
    const checkLoginStatus = () => {
      const token = localStorage.getItem('token');
      const loginTime = localStorage.getItem('loginTime');

      if (token && loginTime) {
        const currentTime = new Date().getTime();
        const sessionAge = currentTime - parseInt(loginTime);

        if (sessionAge < SESSION_TIMEOUT) {
          setIsLoggedIn(true);
        } else {
          // Session expired
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('loginTime');
          addToast('Session expired. Please login again.', 'info');
        }
      }
    };

    checkLoginStatus();

    // Check session status every minute
    const interval = setInterval(checkLoginStatus, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleLogin = () => {
    setIsLoggedIn(true);
    localStorage.setItem('loginTime', new Date().getTime().toString());
  };

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('loginTime');
    setIsLoggedIn(false);
    addToast('Logged out successfully!', 'info');
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            isLoggedIn ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LoginPage onLogin={handleLogin} addToast={addToast} />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            isLoggedIn ? (
              <Dashboard addToast={addToast} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/customers"
          element={
            isLoggedIn ? (
              <CustomerPage addToast={addToast} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/customer"
          element={
            isLoggedIn ? (
              <Customer addToast={addToast} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/staff"
          element={
            isLoggedIn ? (
              <Staff addToast={addToast} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/salary-update"
          element={
            isLoggedIn ? (
              <SalaryUpdate addToast={addToast} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/revenue"
          element={
            isLoggedIn ? (
              <Revenue addToast={addToast} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/expense"
          element={
            isLoggedIn ? (
              <Expense addToast={addToast} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/expense-summary"
          element={
            isLoggedIn ? (
              <ExpenseSummary addToast={addToast} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/change-password"
          element={
            isLoggedIn ? (
              <ChangePassword addToast={addToast} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/appointments"
          element={
            isLoggedIn ? (
              <div className="dashboard">
                <Navbar onLogout={handleLogout} />
                <div className="dashboard-content">
                  <div className="dashboard-header">
                    <h1>Appointments</h1>
                    <p>Manage your salon appointments</p>
                  </div>
                  <div className="dashboard-card">
                    <p>Appointments feature coming soon...</p>
                  </div>
                </div>
              </div>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
      <Toast toasts={toasts} removeToast={removeToast} />
    </Router>
  );
}

export default App
