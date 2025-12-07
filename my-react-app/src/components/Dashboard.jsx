import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import Credits from './Credits';
import '../App.css';

function Dashboard({ addToast }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    todayRevenue: 0,
    monthlyRevenue: 0,
    totalCustomers: 0,
    onlineTransactions: 0,
    cashTransactions: 0,
    totalExpense: 0,
    todayExpense: 0,
    monthlyExpense: 0
  });
  const [recentCustomers, setRecentCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('loginTime');
    navigate('/');
    addToast('Logged out successfully!', 'info');
    window.location.reload(); // Force reload to reset state
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch all customers for statistics (no pagination)
      const customerResponse = await fetch(`${import.meta.env.VITE_BASE_API}/api/customers?limit=10000`);
      const customerData = await customerResponse.json();

      // Fetch all expenses for statistics (no pagination)
      const expenseResponse = await fetch(`${import.meta.env.VITE_BASE_API}/api/expenses?limit=10000`);
      const expenseData = await expenseResponse.json();

      // Calculate revenue statistics
      let totalRevenue = 0;
      let todayRevenue = 0;
      let monthlyRevenue = 0;
      let totalCustomers = 0;
      let onlineTransactions = 0;
      let cashTransactions = 0;

      if (customerResponse.ok && customerData.customers) {
        const customers = customerData.customers;
        totalCustomers = customers.length;

        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        customers.forEach(customer => {
          const amount = parseFloat(customer.amount) || 0;
          totalRevenue += amount;

          // Count payment modes
          if (customer.paymentMode === 'Online') {
            onlineTransactions += 1;
          } else if (customer.paymentMode === 'Cash') {
            cashTransactions += 1;
          }

          // Check if customer has custom date/time or use createdAt
          let customerDate;
          if (customer.date && customer.time) {
            customerDate = new Date(`${customer.date}T${customer.time}`);
          } else if (customer.createdAt) {
            const timestamp = customer.createdAt.seconds || customer.createdAt._seconds;
            customerDate = timestamp ? new Date(timestamp * 1000) : new Date();
          } else {
            customerDate = new Date();
          }

          // Today revenue
          if (customerDate >= startOfToday) {
            todayRevenue += amount;
          }

          // Monthly revenue
          if (customerDate >= startOfMonth) {
            monthlyRevenue += amount;
          }
        });
      }

      // Calculate expense statistics
      let totalExpense = 0;
      let todayExpense = 0;
      let monthlyExpense = 0;

      if (expenseResponse.ok && expenseData.expenses) {
        const expenses = expenseData.expenses;

        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        expenses.forEach(expense => {
          const amount = parseFloat(expense.totalAmount) || 0;
          totalExpense += amount;

          // Check if expense has custom date/time or use createdAt
          let expenseDate;
          if (expense.date && expense.time) {
            expenseDate = new Date(`${expense.date}T${expense.time}`);
          } else if (expense.createdAt) {
            const timestamp = expense.createdAt.seconds || expense.createdAt._seconds;
            expenseDate = timestamp ? new Date(timestamp * 1000) : new Date();
          } else {
            expenseDate = new Date();
          }

          // Today expense
          if (expenseDate >= startOfToday) {
            todayExpense += amount;
          }

          // Monthly expense
          if (expenseDate >= startOfMonth) {
            monthlyExpense += amount;
          }
        });
      }

      // Get recent 3 customers
      let recent = [];
      if (customerResponse.ok && customerData.customers) {
        recent = customerData.customers
          .sort((a, b) => {
            const dateA = a.dateTime ? new Date(a.dateTime) : new Date((a.createdAt?.seconds || 0) * 1000);
            const dateB = b.dateTime ? new Date(b.dateTime) : new Date((b.createdAt?.seconds || 0) * 1000);
            return dateB - dateA;
          })
          .slice(0, 3);
      }

      setStats({
        totalRevenue,
        todayRevenue,
        monthlyRevenue,
        totalCustomers,
        onlineTransactions,
        cashTransactions,
        totalExpense,
        todayExpense,
        monthlyExpense
      });

      setRecentCustomers(recent);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <Navbar addToast={addToast} />

      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <p>Welcome back! Here's your salon overview.</p>
        </div>

        {/* Revenue & Customer Statistics Section */}
        <div className="stats-section">
          <h2 className="section-title">Revenue & Customer Statistics</h2>
          <div className="stats-grid">
            {isLoading ? (
              // Skeleton loading for revenue stats
              [...Array(6)].map((_, index) => (
                <div key={index} className="stat-card">
                  <div className="skeleton skeleton-avatar" style={{ margin: '0 auto 15px' }}></div>
                  <div className="stat-content">
                    <div className="skeleton skeleton-text medium" style={{ height: '32px', marginBottom: '8px' }}></div>
                    <div className="skeleton skeleton-text short"></div>
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="stat-card">
                  <div className="stat-icon">💰</div>
                  <div className="stat-content">
                    <h3>₹{stats.todayRevenue.toFixed(2)}</h3>
                    <p>Today's Revenue</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">📊</div>
                  <div className="stat-content">
                    <h3>₹{stats.monthlyRevenue.toFixed(2)}</h3>
                    <p>Monthly Revenue</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">💵</div>
                  <div className="stat-content">
                    <h3>₹{stats.totalRevenue.toFixed(2)}</h3>
                    <p>Total Revenue</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">👥</div>
                  <div className="stat-content">
                    <h3>{stats.totalCustomers}</h3>
                    <p>Total Customers</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">💳</div>
                  <div className="stat-content">
                    <h3>{stats.onlineTransactions}</h3>
                    <p>Online Transactions</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">💵</div>
                  <div className="stat-content">
                    <h3>{stats.cashTransactions}</h3>
                    <p>Cash Transactions</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Expense Statistics Section */}
        <div className="stats-section">
          <h2 className="section-title">Expense Statistics</h2>
          <div className="stats-grid">
            {isLoading ? (
              // Skeleton loading for expense stats
              [...Array(3)].map((_, index) => (
                <div key={index} className="stat-card">
                  <div className="skeleton skeleton-avatar" style={{ margin: '0 auto 15px' }}></div>
                  <div className="stat-content">
                    <div className="skeleton skeleton-text medium" style={{ height: '32px', marginBottom: '8px' }}></div>
                    <div className="skeleton skeleton-text short"></div>
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="stat-card">
                  <div className="stat-icon">💸</div>
                  <div className="stat-content">
                    <h3>₹{stats.todayExpense.toFixed(2)}</h3>
                    <p>Today's Expense</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">📈</div>
                  <div className="stat-content">
                    <h3>₹{stats.monthlyExpense.toFixed(2)}</h3>
                    <p>Monthly Expense</p>
                  </div>
                </div>

                <div className="stat-card expense-total-card">
                  <div className="stat-icon">💳</div>
                  <div className="stat-content">
                    <h3>₹{stats.totalExpense.toFixed(2)}</h3>
                    <p>Total Expense</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="dashboard-sections">
          <div className="dashboard-card">
            <h2>Recent Customers</h2>
            {isLoading ? (
              <div className="table-container">
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Amount</th>
                        <th>Payment</th>
                        <th>Staff</th>
                        <th>Date & Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...Array(3)].map((_, index) => (
                        <tr key={index}>
                          <td><div className="skeleton skeleton-text medium"></div></td>
                          <td><div className="skeleton skeleton-text short"></div></td>
                          <td><div className="skeleton skeleton-text medium"></div></td>
                          <td><div className="skeleton skeleton-text long"></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : recentCustomers.length === 0 ? (
              <div className="no-recent">
                No customers added yet.
              </div>
            ) : (
              <div className="table-container">
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Amount</th>
                        <th>Payment</th>
                        <th>Staff</th>
                        <th>Date & Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentCustomers.map((customer, index) => (
                        <tr key={customer.id || index}>
                          <td className="amount-cell">₹{parseFloat(customer.amount).toFixed(2)}</td>
                          <td>
                            <span className={`payment-badge ${customer.paymentMode.toLowerCase()}`}>
                              {customer.paymentMode}
                            </span>
                          </td>
                          <td>{customer.staffName}</td>
                          <td>
                            {customer.date && customer.time
                              ? `${customer.date} ${customer.time}`
                              : 'Date not available'
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="dashboard-card">
            <h2>Quick Actions</h2>
            <div className="quick-actions">
              <Link to="/customer" className="action-btn">Add Customer</Link>
              <Link to="/staff" className="action-btn">Add Staff Member</Link>
              <Link to="/revenue" className="action-btn">Customer Entry</Link>
              <Link to="/expense" className="action-btn">Expense Entry</Link>
              <Link to="/expense-summary" className="action-btn">Expense Summary</Link>
              <button onClick={handleLogout} className="action-btn logout-btn">Logout</button>
            </div>
          </div>
        </div>
      </div>
      <Credits />
    </div>
  );
}

export default Dashboard;