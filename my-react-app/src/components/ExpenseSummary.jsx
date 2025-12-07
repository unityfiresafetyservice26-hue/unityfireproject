import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Navbar from './Navbar';
import Credits from './Credits';
import '../App.css';

function ExpenseSummary({ addToast }) {
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editExpense, setEditExpense] = useState(null);
  const [editFormData, setEditFormData] = useState({
    date: '',
    time: '',
    items: [{ name: '', amount: '' }]
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalExpenses: 0,
    limit: 10,
    hasNext: false,
    hasPrev: false
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
    fetchExpenses(1);
  }, [dateFrom, dateTo]);

  const fetchExpenses = async (page = currentPage) => {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');

      if (dateFrom) {
        params.append('dateFrom', dateFrom);
      }

      if (dateTo) {
        params.append('dateTo', dateTo);
      }

      const url = `${import.meta.env.VITE_BASE_API}/api/expenses${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        const expensesData = data.expenses || [];
        // Sort expenses by date descending (latest first) as additional safeguard
        const sortedExpenses = expensesData.sort((a, b) => {
          const dateA = a.dateTime ? new Date(a.dateTime) : new Date((a.createdAt?.seconds || 0) * 1000);
          const dateB = b.dateTime ? new Date(b.dateTime) : new Date((b.createdAt?.seconds || 0) * 1000);
          return dateB - dateA;
        });

        setExpenses(sortedExpenses);
        setFilteredExpenses(sortedExpenses);
        setPagination(data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalExpenses: 0,
          limit: 10,
          hasNext: false,
          hasPrev: false
        });
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchExpenses(page);
    }
  };

  const handlePrevPage = () => {
    if (pagination.hasPrev) {
      handlePageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination.hasNext) {
      handlePageChange(currentPage + 1);
    }
  };

  const handleEditExpense = (expense) => {
    setEditExpense(expense);
    setEditFormData({
      date: expense.date,
      time: expense.time,
      items: expense.items.map(item => ({
        name: item.name,
        amount: item.amount.toString() // Convert to string for input field
      }))
    });
  };

  const handleEditItemChange = (index, field, value) => {
    const updatedItems = [...editFormData.items];
    updatedItems[index][field] = value;
    setEditFormData({ ...editFormData, items: updatedItems });
  };

  const handleAddEditItem = () => {
    setEditFormData({
      ...editFormData,
      items: [...editFormData.items, { name: '', amount: '' }]
    });
  };

  const handleRemoveEditItem = (index) => {
    if (editFormData.items.length > 1) {
      const updatedItems = editFormData.items.filter((_, i) => i !== index);
      setEditFormData({ ...editFormData, items: updatedItems });
    }
  };

  const handleUpdateExpense = async (e) => {
    e.preventDefault();

    // Validation
    if (!editFormData.date || !editFormData.time) {
      addToast('Please fill in date and time', 'error');
      return;
    }

    const validItems = editFormData.items.filter(item => item.name.trim() && item.amount);
    if (validItems.length === 0) {
      addToast('Please add at least one item with name and amount', 'error');
      return;
    }

    setIsUpdating(true);

    try {
      const updateData = {
        date: editFormData.date,
        time: editFormData.time,
        dateTime: new Date(`${editFormData.date}T${editFormData.time}`).toISOString(),
        items: validItems.map(item => ({
          name: item.name.trim(),
          amount: parseFloat(item.amount)
        })),
        totalAmount: validItems.reduce((total, item) => total + parseFloat(item.amount), 0)
      };

      const response = await fetch(`${import.meta.env.VITE_BASE_API}/api/expenses/${editExpense.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        addToast('Expense updated successfully!', 'success');
        await fetchExpenses(currentPage);
        setEditExpense(null);
      } else {
        addToast('Failed to update expense', 'error');
      }
    } catch (error) {
      console.error('Error updating expense:', error);
      addToast('Error updating expense', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BASE_API}/api/expenses/${expenseId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        addToast('Expense deleted successfully!', 'success');
        await fetchExpenses(currentPage);
        setDeleteConfirm(null);
      } else {
        addToast('Failed to delete expense', 'error');
        console.error('Failed to delete expense');
      }
    } catch (error) {
      addToast('Error deleting expense', 'error');
      console.error('Error deleting expense:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportExcel = async () => {
    if (!exportDateFrom || !exportDateTo) {
      addToast('Please select both From and To dates', 'error');
      return;
    }

    setIsExporting(true);
    try {
      // Fetch all expenses within the date range (no pagination)
      const params = new URLSearchParams();
      params.append('dateFrom', exportDateFrom);
      params.append('dateTo', exportDateTo);
      params.append('limit', '10000'); // Large limit to get all records

      const response = await fetch(`${import.meta.env.VITE_BASE_API}/api/expenses?${params.toString()}`);
      const data = await response.json();

      if (!response.ok || !data.expenses) {
        throw new Error('Failed to fetch data for export');
      }

      let expenses = data.expenses;

      // Sort expenses by date descending (latest first) for Excel export
      expenses.sort((a, b) => {
        const dateA = a.dateTime ? new Date(a.dateTime) : new Date((a.createdAt?.seconds || 0) * 1000);
        const dateB = b.dateTime ? new Date(b.dateTime) : new Date((b.createdAt?.seconds || 0) * 1000);
        return dateB - dateA;
      });

      // Prepare data for Excel
      const excelData = [];
      expenses.forEach((expense, index) => {
        // Add main expense row
        excelData.push({
          'Sr. No': index + 1,
          'Date': formatDate(expense.dateTime),
          'Time': formatTime(expense.dateTime),
          'Item Name': '',
          'Item Amount (₹)': '',
          'Total Amount (₹)': expense.totalAmount
        });

        // Add item rows
        expense.items.forEach((item, itemIndex) => {
          excelData.push({
            'Sr. No': '',
            'Date': '',
            'Time': '',
            'Item Name': item.name,
            'Item Amount (₹)': item.amount,
            'Total Amount (₹)': ''
          });
        });

        // Add empty row between expenses
        excelData.push({
          'Sr. No': '',
          'Date': '',
          'Time': '',
          'Item Name': '',
          'Item Amount (₹)': '',
          'Total Amount (₹)': ''
        });
      });

      // Calculate totals
      const totalAmount = expenses.reduce((sum, expense) => sum + (parseFloat(expense.totalAmount) || 0), 0);

      // Add empty rows and totals
      excelData.push({});
      excelData.push({
        'Sr. No': '',
        'Date': '',
        'Time': '',
        'Item Name': '',
        'Item Amount (₹)': '',
        'Total Amount (₹)': ''
      });
      excelData.push({
        'Sr. No': 'TOTAL EXPENSE',
        'Date': '',
        'Time': '',
        'Item Name': '',
        'Item Amount (₹)': '',
        'Total Amount (₹)': totalAmount
      });

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      const colWidths = [
        { wch: 8 }, // Sr. No
        { wch: 12 }, // Date
        { wch: 8 }, // Time
        { wch: 25 }, // Item Name
        { wch: 15 }, // Item Amount
        { wch: 15 } // Total Amount
      ];
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Expense Report');

      // Generate filename with date range
      const fileName = `Expense_Report_${exportDateFrom}_to_${exportDateTo}.xlsx`;

      // Save file
      XLSX.writeFile(wb, fileName);

      addToast('Excel file exported successfully!', 'success');
      setShowExportModal(false);
      setExportDateFrom('');
      setExportDateTo('');

    } catch (error) {
      console.error('Error exporting Excel:', error);
      addToast('Failed to export Excel file. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="dashboard">
      <Navbar addToast={addToast} />
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Expense Summary</h1>
          <p>View and manage all business expenses</p>
        </div>

        {/* Date Filter */}
        <div className="search-container">
          <div className="filters-grid">
            <div className="filter-group">
              <label className="filter-label">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="filter-select"
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="filter-select"
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">Export to Excel</label>
              <button
                className="export-btn"
                onClick={() => setShowExportModal(true)}
                title="Export expense data to Excel"
              >
                📊 Download Excel
              </button>
            </div>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="dashboard-card">
          <div className="table-container">
            {isLoading ? (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Sr. No</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Items</th>
                      <th>Total Amount</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...Array(5)].map((_, index) => (
                      <tr key={index}>
                        <td><div className="skeleton skeleton-text short"></div></td>
                        <td><div className="skeleton skeleton-text medium"></div></td>
                        <td><div className="skeleton skeleton-text short"></div></td>
                        <td>
                          <div className="expense-items">
                            <div className="expense-item">
                              <div className="skeleton skeleton-text long"></div>
                              <div className="skeleton skeleton-text medium"></div>
                            </div>
                          </div>
                        </td>
                        <td><div className="skeleton skeleton-text medium"></div></td>
                        <td><div className="skeleton skeleton-text short"></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="no-customers">
                No expenses found for the selected date range.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Sr. No</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Items</th>
                      <th>Total Amount</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((expense, index) => (
                      <tr key={expense.id}>
                        <td>{((currentPage - 1) * pagination.limit) + index + 1}</td>
                        <td>{formatDate(expense.dateTime)}</td>
                        <td>{formatTime(expense.dateTime)}</td>
                        <td>
                          <div className="expense-items">
                            {expense.items.map((item, itemIndex) => (
                              <div key={itemIndex} className="expense-item">
                                <span className="item-name">{item.name}</span>
                                <span className="item-amount">₹{item.amount.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="amount-cell">₹{expense.totalAmount.toFixed(2)}</td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="edit-btn"
                              onClick={() => handleEditExpense(expense)}
                              title="Edit expense"
                            >
                              ✏️
                            </button>
                            <button
                              className="delete-btn"
                              onClick={() => setDeleteConfirm(expense.id)}
                              title="Delete expense"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Pagination Controls */}
        {pagination.totalExpenses > 0 && (
          <div className="pagination-container">
            <div className="pagination-info">
              Showing {((currentPage - 1) * pagination.limit) + 1} to {Math.min(currentPage * pagination.limit, pagination.totalExpenses)} of {pagination.totalExpenses} expenses (10 per page)
            </div>

            <div className="pagination-controls">
              <button
                className="pagination-btn"
                onClick={handlePrevPage}
                disabled={!pagination.hasPrev}
              >
                ← Previous
              </button>

              <div className="pagination-pages">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      className={`pagination-page ${pageNum === currentPage ? 'active' : ''}`}
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                className="pagination-btn"
                onClick={handleNextPage}
                disabled={!pagination.hasNext}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Edit Expense Modal */}
        {editExpense && (
          <div className="edit-modal-overlay">
            <div className="edit-modal">
              <h3>Edit Expense</h3>
              <form onSubmit={handleUpdateExpense}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Date</label>
                    <input
                      type="date"
                      value={editFormData.date}
                      onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                      required
                      disabled={isUpdating}
                    />
                  </div>
                  <div className="form-group">
                    <label>Time</label>
                    <input
                      type="time"
                      value={editFormData.time}
                      onChange={(e) => setEditFormData({ ...editFormData, time: e.target.value })}
                      required
                      disabled={isUpdating}
                    />
                  </div>
                </div>

                <div className="items-section">
                  <h4>Expense Items</h4>
                  {editFormData.items.map((item, index) => (
                    <div key={index} className="item-row">
                      <div className="form-group">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleEditItemChange(index, 'name', e.target.value)}
                          placeholder="Item name"
                          required
                          disabled={isUpdating}
                        />
                      </div>
                      <div className="form-group">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.amount}
                          onChange={(e) => handleEditItemChange(index, 'amount', e.target.value)}
                          placeholder="0.00"
                          required
                          disabled={isUpdating}
                        />
                      </div>
                      {editFormData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveEditItem(index)}
                          className="remove-item-btn"
                          disabled={isUpdating}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddEditItem}
                    className="add-item-btn"
                    disabled={isUpdating}
                  >
                    + Add Item
                  </button>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setEditExpense(null)}
                    disabled={isUpdating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="update-btn"
                    disabled={isUpdating}
                  >
                    {isUpdating ? 'Updating...' : 'Update Expense'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {deleteConfirm && (
          <div className="delete-confirm-overlay">
            <div className="delete-confirm-dialog">
              <h3>Delete Expense</h3>
              <p>Are you sure you want to delete this expense? This action cannot be undone.</p>
              <div className="delete-confirm-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setDeleteConfirm(null)}
                >
                  Cancel
                </button>
                <button
                  className="confirm-delete-btn"
                  onClick={() => handleDeleteExpense(deleteConfirm)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Export Excel Modal */}
        {showExportModal && (
          <div className="delete-confirm-overlay">
            <div className="delete-confirm-dialog">
              <h3>Export Expenses to Excel</h3>
              <p>Select the date range for the expense data you want to export.</p>
              <div className="export-form">
                <div className="form-group">
                  <label htmlFor="export-from">From Date</label>
                  <input
                    id="export-from"
                    type="date"
                    value={exportDateFrom}
                    onChange={(e) => setExportDateFrom(e.target.value)}
                    required
                    disabled={isExporting}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="export-to">To Date</label>
                  <input
                    id="export-to"
                    type="date"
                    value={exportDateTo}
                    onChange={(e) => setExportDateTo(e.target.value)}
                    required
                    disabled={isExporting}
                  />
                </div>
              </div>
              <div className="delete-confirm-actions">
                <button
                  className="cancel-btn"
                  onClick={() => {
                    setShowExportModal(false);
                    setExportDateFrom('');
                    setExportDateTo('');
                  }}
                  disabled={isExporting}
                >
                  Cancel
                </button>
                <button
                  className="confirm-delete-btn"
                  onClick={handleExportExcel}
                  disabled={isExporting}
                >
                  {isExporting ? 'Exporting...' : 'Export Excel'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Full Screen Loader for Excel Export */}
        {isExporting && (
          <div className="fullscreen-loader">
            <span className="loader"></span>
          </div>
        )}

        {/* Full Screen Loader for Expense Updates */}
        {isUpdating && (
          <div className="fullscreen-loader">
            <span className="loader"></span>
          </div>
        )}

        {/* Full Screen Loader for Expense Deletion */}
        {isDeleting && (
          <div className="fullscreen-loader">
            <span className="loader"></span>
          </div>
        )}
      </div>
      <Credits />
    </div>
  );
}

export default ExpenseSummary;