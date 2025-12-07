import { useState } from 'react';
import Navbar from './Navbar';
import Credits from './Credits';
import '../App.css';

function Expense({ addToast }) {
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
    date: getCurrentDate(),
    time: getCurrentTime(),
    items: [{ name: '', amount: '' }]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index][field] = value;
    setFormData({ ...formData, items: updatedItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { name: '', amount: '' }]
    });
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const updatedItems = formData.items.filter((_, i) => i !== index);
      setFormData({ ...formData, items: updatedItems });
    }
  };

  const calculateTotal = () => {
    return formData.items.reduce((total, item) => {
      const amount = parseFloat(item.amount) || 0;
      return total + amount;
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.date || !formData.time) {
      addToast('Please fill in date and time', 'error');
      return;
    }

    const validItems = formData.items.filter(item => item.name.trim() && item.amount);
    if (validItems.length === 0) {
      addToast('Please add at least one item with name and amount', 'error');
      return;
    }

    // Validate date and time format
    const dateTimeString = `${formData.date}T${formData.time}`;
    const dateTime = new Date(dateTimeString);
    if (isNaN(dateTime.getTime())) {
      addToast('Invalid date or time format', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const expenseData = {
        date: formData.date,
        time: formData.time,
        dateTime: dateTime.toISOString(),
        items: validItems.map(item => ({
          name: item.name.trim(),
          amount: parseFloat(item.amount)
        })),
        totalAmount: calculateTotal(),
        createdAt: new Date().toISOString()
      };

      const response = await fetch(`${import.meta.env.VITE_BASE_API}/api/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expenseData),
      });

      const data = await response.json();

      if (response.ok) {
        addToast('Expense added successfully!', 'success');
        setFormData({
          date: getCurrentDate(),
          time: getCurrentTime(),
          items: [{ name: '', amount: '' }]
        });
      } else {
        addToast(data.error || 'Failed to add expense', 'error');
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
          <h1>Expense Entry</h1>
          <p>Record your business expenses</p>
        </div>

        <div className="person-form">
          <h2 className="form-title">Add Expense</h2>
          <form onSubmit={handleSubmit}>
            {/* Date and Time */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="date">Date</label>
                <input
                  id="date"
                  type="date"
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
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Items */}
            <div className="items-section">
              <div className="items-header">
                <h3>Expense Items</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="add-item-btn"
                  disabled={isSubmitting}
                >
                  + Add Item
                </button>
              </div>

              {formData.items.map((item, index) => (
                <div key={index} className="item-row">
                  <div className="form-group">
                    <label>Item Name</label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                      placeholder="Enter item name"
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="form-group">
                    <label>Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.amount}
                      onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                      placeholder="0.00"
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="remove-item-btn"
                      disabled={isSubmitting}
                      title="Remove item"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}

              {/* Total Amount */}
              <div className="total-section">
                <div className="total-amount">
                  <strong>Total: ₹{calculateTotal().toFixed(2)}</strong>
                </div>
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="loader"></span>
                  Adding Expense...
                </>
              ) : (
                'Add Expense'
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

      {/* Full Screen Loader for Expense Addition */}
      {isSubmitting && (
        <div className="fullscreen-loader">
          <span className="loader"></span>
        </div>
      )}
      <Credits />
    </div>
  );
}

export default Expense;