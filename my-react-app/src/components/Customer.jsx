import { useState, useEffect } from 'react';
import Navbar from './Navbar';
import Credits from './Credits';
import '../App.css';

function Customer({ addToast }) {
  // Get current date and time in YYYY-MM-DD and HH:MM format
  const getCurrentDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  };

  const [formData, setFormData] = useState({
    amount: '',
    paymentMode: '',
    staffName: '',
    date: getCurrentDate(),
    time: getCurrentTime()
  });
  const [staffList, setStaffList] = useState([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch staff data on component mount
  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BASE_API}/api/staff`);
      const data = await response.json();
      if (response.ok) {
        setStaffList(data.staff);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setIsLoadingStaff(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    if (!formData.amount || !formData.paymentMode || !formData.staffName || !formData.date || !formData.time) {
      addToast('Please fill in all fields', 'error');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BASE_API}/api/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok) {
        addToast('Customer added successfully!', 'success');
        setFormData({
          amount: '',
          paymentMode: '',
          staffName: '',
          date: getCurrentDate(),
          time: getCurrentTime()
        });
      } else {
        addToast(data.error || 'Failed to add customer', 'error');
      }
    } catch (error) {
      addToast('Network error. Please try again.', 'error');
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
          <p>Add new customers with payment information</p>
        </div>

        <div className="person-form">
          <h2 className="form-title">Customer Information</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="amount">Amount</label>
              <input
                id="amount"
                type="number"
                name="amount"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="Enter amount"
                required
                disabled={isSubmitting}
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label htmlFor="paymentMode">Payment Mode</label>
              <select
                id="paymentMode"
                name="paymentMode"
                value={formData.paymentMode}
                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                required
                disabled={isSubmitting}
                className="payment-select"
              >
                <option value="">Select Payment Mode</option>
                <option value="Online">Online</option>
                <option value="Cash">Cash</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="staffName">Staff Name</label>
              <select
                id="staffName"
                name="staffName"
                value={formData.staffName}
                onChange={(e) => setFormData({ ...formData, staffName: e.target.value })}
                required
                disabled={isSubmitting || isLoadingStaff}
                className="payment-select"
              >
                <option value="">
                  {isLoadingStaff ? 'Loading staff...' : 'Select Staff Member'}
                </option>
                {staffList.map((staff) => (
                  <option key={staff.id} value={staff.fullName}>
                    {staff.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="date">Date</label>
              <input
                id="date"
                type="date"
                name="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="time">Time</label>
              <input
                id="time"
                type="time"
                name="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
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

      {/* Full Screen Loader for Customer Addition */}
      {isSubmitting && (
        <div className="fullscreen-loader">
          <span className="loader"></span>
        </div>
      )}
      <Credits />
    </div>
  );
}

export default Customer;