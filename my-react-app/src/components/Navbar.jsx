import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import '../App.css';

function Navbar({ addToast }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('loginTime');
    if (addToast) {
      addToast('Logged out successfully!', 'info');
    }
    navigate('/');
    // Delay reload to allow toast to show
    setTimeout(() => {
      window.location.reload(); // Force reload to reset state
    }, 1000);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const closeDropdown = () => {
    setIsDropdownOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
           <img src="/Unity Fire Logo.jpg" alt="Unity Fire Logo" className="navbar-logo" />
           <h2>Unity Unisex Salon Management</h2>
         </div>

        <div className="navbar-menu">
           <Link to="/dashboard" className={`navbar-link ${location.pathname === '/dashboard' ? 'active' : ''}`} onClick={closeDropdown}>
             Dashboard
           </Link>
           <Link to="/customer" className={`navbar-link ${location.pathname === '/customer' ? 'active' : ''}`} onClick={closeDropdown}>
             Add Customer
           </Link>
           <Link to="/staff" className={`navbar-link ${location.pathname === '/staff' ? 'active' : ''}`} onClick={closeDropdown}>
             Add Staff
           </Link>
           <Link to="/salary-update" className={`navbar-link ${location.pathname === '/salary-update' ? 'active' : ''}`} onClick={closeDropdown}>
             Salary Update
           </Link>
           <Link to="/revenue" className={`navbar-link ${location.pathname === '/revenue' ? 'active' : ''}`} onClick={closeDropdown}>
             Customer Entry
           </Link>
           <Link to="/expense" className={`navbar-link ${location.pathname === '/expense' ? 'active' : ''}`} onClick={closeDropdown}>
             Expense Entry
           </Link>
           <Link to="/expense-summary" className={`navbar-link ${location.pathname === '/expense-summary' ? 'active' : ''}`} onClick={closeDropdown}>
             Expense Summary
           </Link>
           <Link to="/change-password" className={`navbar-link ${location.pathname === '/change-password' ? 'active' : ''}`} onClick={closeDropdown}>
             Change Password
           </Link>
           <button onClick={handleLogout} className="navbar-logout">
             Exit
           </button>
         </div>

        <button className="navbar-toggle" onClick={toggleDropdown}>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>

        {isDropdownOpen && (
           <div className="navbar-dropdown">
             <Link to="/dashboard" className={`dropdown-link ${location.pathname === '/dashboard' ? 'active' : ''}`} onClick={closeDropdown}>
               Dashboard
             </Link>
             <Link to="/customer" className={`dropdown-link ${location.pathname === '/customer' ? 'active' : ''}`} onClick={closeDropdown}>
               Add Customer
             </Link>
             <Link to="/staff" className={`dropdown-link ${location.pathname === '/staff' ? 'active' : ''}`} onClick={closeDropdown}>
               Add Staff Member
             </Link>
             <Link to="/salary-update" className={`dropdown-link ${location.pathname === '/salary-update' ? 'active' : ''}`} onClick={closeDropdown}>
               Salary Update
             </Link>
             <Link to="/revenue" className={`dropdown-link ${location.pathname === '/revenue' ? 'active' : ''}`} onClick={closeDropdown}>
               Customer Entry
             </Link>
             <Link to="/expense" className={`dropdown-link ${location.pathname === '/expense' ? 'active' : ''}`} onClick={closeDropdown}>
               Expense Entry
             </Link>
             <Link to="/expense-summary" className={`dropdown-link ${location.pathname === '/expense-summary' ? 'active' : ''}`} onClick={closeDropdown}>
               Expense Summary
             </Link>
             <Link to="/change-password" className={`dropdown-link ${location.pathname === '/change-password' ? 'active' : ''}`} onClick={closeDropdown}>
               Change Password
             </Link>
             <button onClick={handleLogout} className="dropdown-logout">
               Logout
             </button>
           </div>
         )}
      </div>
    </nav>
  );
}

export default Navbar;