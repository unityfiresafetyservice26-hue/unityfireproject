import { useState, useEffect } from 'react';
import Navbar from './Navbar';
import Credits from './Credits';
import '../App.css';
import * as XLSX from 'xlsx';

function SalaryUpdate({ addToast }) {
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [salary, setSalary] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedStatus, setSelectedStatus] = useState('paid');
  const [borrowEntries, setBorrowEntries] = useState([{ date: '', amount: '' }]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStaffForModal, setSelectedStaffForModal] = useState(null);
  const [displayedStaffCount, setDisplayedStaffCount] = useState(3);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingMonth, setEditingMonth] = useState(null);
  const [editFormData, setEditFormData] = useState({
    salary: '',
    status: 'paid',
    borrowEntries: [{ date: '', amount: '' }]
  });
  const [showForm, setShowForm] = useState(false);

  // Fetch staff data on component mount
  useEffect(() => {
    fetchStaff();
  }, []);

  // Update selected staff and salary when staff selection changes
  useEffect(() => {
    if (selectedStaffId) {
      const staff = staffList.find(s => s.id === selectedStaffId);
      setSelectedStaff(staff);
      setSalary(staff?.salary ? staff.salary.toString() : '');
    } else {
      setSelectedStaff(null);
      setSalary('');
    }
  }, [selectedStaffId, staffList]);

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

  const handlePaid = async () => {
    if (!selectedStaffId || !selectedMonth || !salary) {
      addToast('Please select staff, enter salary, and select month', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert YYYY-MM format to "Month, Year" format
      const [year, month] = selectedMonth.split('-');
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const monthName = monthNames[parseInt(month) - 1];
      const monthYearKey = `${monthName}, ${year}`;

      // Prepare borrow object from entries
      const borrowObj = {};
      borrowEntries.forEach(entry => {
        if (entry.date && entry.amount) {
          borrowObj[entry.date] = parseFloat(entry.amount);
        }
      });

      // Prepare update data
      const updateData = {
        salary: parseFloat(salary),
        salaryStatus: {
          ...selectedStaff.salaryStatus,
          [monthYearKey]: {
            salaryAmount: parseFloat(salary),
            status: selectedStatus,
            ...(Object.keys(borrowObj).length > 0 && { borrow: borrowObj })
          }
        }
      };

      const response = await fetch(`${import.meta.env.VITE_BASE_API}/api/staff/${selectedStaffId}/salary`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();
      if (response.ok) {
        addToast(`Salary updated and marked as ${selectedStatus}!`, 'success');
        // Refresh staff list
        fetchStaff();
        // Reset form
        setSelectedStaffId('');
        setSelectedMonth('');
        setSelectedStatus('paid');
        setBorrowEntries([{ date: '', amount: '' }]);
      } else {
        addToast(data.error || 'Failed to update salary', 'error');
      }
    } catch (error) {
      addToast('Network error. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };


  const addBorrowEntry = () => {
    setBorrowEntries([...borrowEntries, { date: '', amount: '' }]);
  };

  const removeBorrowEntry = (index) => {
    setBorrowEntries(borrowEntries.filter((_, i) => i !== index));
  };

  const updateBorrowEntry = (index, field, value) => {
    const updatedEntries = borrowEntries.map((entry, i) =>
      i === index ? { ...entry, [field]: value } : entry
    );
    setBorrowEntries(updatedEntries);
  };

  const handleEditMonth = (staffId, monthYear, paymentData) => {
    // Handle both old string format and new object format
    const status = typeof paymentData === 'string' ? paymentData : paymentData.status;
    const salaryAmount = typeof paymentData === 'string' ? selectedStaffForModal.salary : paymentData.salaryAmount;
    const borrow = typeof paymentData === 'object' && paymentData.borrow ? paymentData.borrow : {};

    // Convert borrow object to array format for editing
    const borrowArray = Object.entries(borrow).map(([date, amount]) => ({
      date,
      amount: amount.toString()
    }));

    setEditingMonth({ staffId, monthYear });
    setEditFormData({
      salary: salaryAmount.toString(),
      status: status,
      borrowEntries: borrowArray.length > 0 ? borrowArray : [{ date: '', amount: '' }]
    });
  };

  const handleDeleteMonthClick = (staffId, monthYear) => {
    setDeleteConfirm({ staffId, monthYear });
  };

  const handleDeleteMonthConfirm = async () => {
    if (!deleteConfirm) return;

    setIsDeleting(true);

    try {
      // Remove the specific month from salaryStatus
      const currentStaff = staffList.find(s => s.id === deleteConfirm.staffId);
      if (!currentStaff || !currentStaff.salaryStatus) return;

      const updatedSalaryStatus = { ...currentStaff.salaryStatus };
      delete updatedSalaryStatus[deleteConfirm.monthYear];

      const response = await fetch(`${import.meta.env.VITE_BASE_API}/api/staff/${deleteConfirm.staffId}/salary`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          salary: currentStaff.salary,
          salaryStatus: updatedSalaryStatus
        }),
      });

      if (response.ok) {
        addToast(`${deleteConfirm.monthYear} record deleted successfully!`, 'success');
        fetchStaff(); // Refresh the data
        // Update the modal data as well
        if (selectedStaffForModal && selectedStaffForModal.id === deleteConfirm.staffId) {
          setSelectedStaffForModal({
            ...selectedStaffForModal,
            salaryStatus: updatedSalaryStatus
          });
        }
        setDeleteConfirm(null); // Close confirmation modal
      } else {
        addToast('Failed to delete record', 'error');
      }
    } catch (error) {
      addToast('Network error. Please try again.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const addEditBorrowEntry = () => {
    setEditFormData({
      ...editFormData,
      borrowEntries: [...editFormData.borrowEntries, { date: '', amount: '' }]
    });
  };

  const removeEditBorrowEntry = (index) => {
    setEditFormData({
      ...editFormData,
      borrowEntries: editFormData.borrowEntries.filter((_, i) => i !== index)
    });
  };

  const updateEditBorrowEntry = (index, field, value) => {
    const updatedEntries = editFormData.borrowEntries.map((entry, i) =>
      i === index ? { ...entry, [field]: value } : entry
    );
    setEditFormData({
      ...editFormData,
      borrowEntries: updatedEntries
    });
  };

  const handleEditSubmit = async () => {
    if (!editingMonth || !editFormData.salary) {
      addToast('Please enter salary amount', 'error');
      return;
    }

    setIsUpdating(true);

    try {
      // Prepare borrow object from entries
      const borrowObj = {};
      editFormData.borrowEntries.forEach(entry => {
        if (entry.date && entry.amount) {
          borrowObj[entry.date] = parseFloat(entry.amount);
        }
      });

      // Update the specific month in salaryStatus
      const currentStaff = staffList.find(s => s.id === editingMonth.staffId);
      if (!currentStaff || !currentStaff.salaryStatus) return;

      const updatedSalaryStatus = {
        ...currentStaff.salaryStatus,
        [editingMonth.monthYear]: {
          salaryAmount: parseFloat(editFormData.salary),
          status: editFormData.status,
          ...(Object.keys(borrowObj).length > 0 && { borrow: borrowObj })
        }
      };

      const response = await fetch(`${import.meta.env.VITE_BASE_API}/api/staff/${editingMonth.staffId}/salary`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          salary: currentStaff.salary,
          salaryStatus: updatedSalaryStatus
        }),
      });

      if (response.ok) {
        addToast(`${editingMonth.monthYear} record updated successfully!`, 'success');
        fetchStaff(); // Refresh the data
        // Update the modal data as well
        if (selectedStaffForModal && selectedStaffForModal.id === editingMonth.staffId) {
          setSelectedStaffForModal({
            ...selectedStaffForModal,
            salaryStatus: updatedSalaryStatus
          });
        }
        setEditingMonth(null); // Close edit modal
      } else {
        addToast('Failed to update record', 'error');
      }
    } catch (error) {
      addToast('Network error. Please try again.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLoadMore = async () => {
    setIsLoadingMore(true);

    // Simulate loading delay for better UX
    setTimeout(() => {
      setDisplayedStaffCount(prev => prev + 3);
      setIsLoadingMore(false);
    }, 800);
  };

  const handleDownloadExcel = () => {
    // Prepare data for Excel - structured with Field and Value columns
    const data = [];

    staffList.forEach((staff, index) => {
      const salaryStatus = staff.salaryStatus || {};

      // Sort payments by date (latest first)
      const sortedPayments = Object.entries(salaryStatus).sort(([a], [b]) => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
        const [monthA, yearA] = a.split(', ');
        const [monthB, yearB] = b.split(', ');
        const dateA = new Date(parseInt(yearA), months.indexOf(monthA));
        const dateB = new Date(parseInt(yearB), months.indexOf(monthB));
        return dateB - dateA;
      });

      // Format all month payment details
      const monthDetails = sortedPayments.length > 0
        ? sortedPayments.map(([monthYear, paymentData]) => {
            const status = typeof paymentData === 'string' ? paymentData : paymentData.status;
            const salaryAmount = typeof paymentData === 'string' ? staff.salary : paymentData.salaryAmount;
            const displayStatus = status === 'paid' ? 'Paid' : status === 'not paid' ? 'Not Paid' : status;
            return `${monthYear}: ₹${salaryAmount} (${displayStatus})`;
          }).join('\n')
        : 'No payment history';

      // Collect all borrow entries across all months
      const allBorrows = [];
      sortedPayments.forEach(([monthYear, paymentData]) => {
        const borrow = typeof paymentData === 'object' && paymentData.borrow ? paymentData.borrow : {};
        Object.entries(borrow).forEach(([date, amount]) => {
          allBorrows.push(`${new Date(date).toLocaleDateString()}: ₹${amount}`);
        });
      });

      const borrowDetails = allBorrows.length > 0 ? allBorrows.join('\n') : 'No borrow entries';

      // Calculate totals
      const totalPayments = sortedPayments.length;
      const totalSalaryPaid = sortedPayments.reduce((sum, [monthYear, paymentData]) => {
        const salaryAmount = typeof paymentData === 'string' ? (staff.salary || 0) : (paymentData.salaryAmount || 0);
        return sum + parseFloat(salaryAmount);
      }, 0);
      const totalBorrowAmount = allBorrows.reduce((sum, entry) => {
        const amount = parseFloat(entry.split(': ₹')[1]);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

      // Add staff header
      data.push({ 'Field': `STAFF ${index + 1}`, 'Value': '' });

      // Add each field
      data.push({ 'Field': 'ID', 'Value': staff.id });
      data.push({ 'Field': 'Name', 'Value': staff.fullName });
      data.push({ 'Field': 'Current Salary', 'Value': staff.salary || 'Not set' });
      data.push({ 'Field': 'Joining Date', 'Value': staff.joiningDate ? new Date(staff.joiningDate).toLocaleDateString() : 'Not specified' });
      data.push({ 'Field': 'All Borrow Details', 'Value': borrowDetails });
      data.push({ 'Field': 'All Month Payment Details', 'Value': monthDetails });
      data.push({ 'Field': 'Total Borrow Amount', 'Value': totalBorrowAmount });
      data.push({ 'Field': 'Number of Borrow Entries', 'Value': allBorrows.length });

      // Add blank row for separation
      data.push({ 'Field': '', 'Value': '' });
    });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(data);

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff Salary Data');

    // Generate filename with current date
    const date = new Date().toISOString().split('T')[0];
    const filename = `staff_salary_data_${date}.xlsx`;

    // Download the file
    XLSX.writeFile(wb, filename);
    addToast('Excel file downloaded successfully!', 'success');
  };

  return (
    <div className="dashboard">
      <Navbar addToast={addToast} />
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Salary Update</h1>
          <p>Update staff salaries and mark payments</p>
        </div>

        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <button
            type="button"
            className="add-borrow-btn"
            onClick={() => setShowForm(!showForm)}
            style={{ fontSize: '16px', padding: '12px 24px' }}
          >
            {showForm ? 'Close Staff Salary Entry' : 'Add Staff Salary Entry'}
          </button>
        </div>

        {showForm && (
          <div className="person-form">
          <h2 className="form-title">Salary Management</h2>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="staffSelect">Select Staff Member</label>
              <select
                id="staffSelect"
                className="filter-select"
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                disabled={isLoadingStaff || isSubmitting}
              >
                <option value="">Choose a staff member...</option>
                {staffList.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="salary">Salary Amount</label>
              <input
                id="salary"
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="Enter salary amount"
                min="0"
                step="0.01"
                disabled={!selectedStaffId || isSubmitting}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="monthSelect">Select Month & Year</label>
              <input
                id="monthSelect"
                type="month"
                className="filter-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                disabled={isSubmitting}
                min="2020-01"
                max="2030-12"
              />
            </div>

            <div className="form-group">
              <label htmlFor="statusSelect">Payment Status</label>
              <select
                id="statusSelect"
                className="filter-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="paid">Paid</option>
                <option value="not paid">Not Paid</option>
              </select>
            </div>
          </div>

          {/* Borrow Section */}
          <div className="borrow-section">
            <h3>Borrow Entries (Optional)</h3>
            {borrowEntries.map((entry, index) => (
              <div key={index} className="borrow-entry">
                <div className="form-row">
                  <div className="form-group">
                    <label>Date</label>
                    <input
                      type="date"
                      value={entry.date}
                      onChange={(e) => updateBorrowEntry(index, 'date', e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="form-group">
                    <label>Amount</label>
                    <input
                      type="number"
                      value={entry.amount}
                      onChange={(e) => updateBorrowEntry(index, 'amount', e.target.value)}
                      placeholder="Enter amount"
                      min="0"
                      step="0.01"
                      disabled={isSubmitting}
                    />
                  </div>
                  {borrowEntries.length > 1 && (
                    <div className="form-group">
                      <label>&nbsp;</label>
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => removeBorrowEntry(index)}
                        disabled={isSubmitting}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <button
              type="button"
              className="add-borrow-btn"
              onClick={addBorrowEntry}
              disabled={isSubmitting}
            >
              + Add Borrow Entry
            </button>
          </div>

          <button
            type="button"
            className="submit-btn"
            onClick={handlePaid}
            disabled={isSubmitting || !selectedStaffId || !salary || !selectedMonth}
          >
            {isSubmitting ? (
              <>
                <span className="loader"></span>
                Updating...
              </>
            ) : (
              `Mark as ${selectedStatus === 'paid' ? 'Paid' : 'Not Paid'}`
            )}
          </button>
        </div>
        )}

        {/* Staff Salary Status Overview */}
        <div className="dashboard-card">
          <h2>Staff Salary Status</h2>
          {isLoadingStaff ? (
            <div className="staff-salary-list">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="staff-salary-item">
                  <div className="staff-basic-info">
                    <div className="skeleton skeleton-text medium" style={{ width: '150px', marginBottom: '8px' }}></div>
                    <div className="skeleton skeleton-text short" style={{ width: '120px', marginBottom: '4px' }}></div>
                    <div className="skeleton skeleton-text short" style={{ width: '100px' }}></div>
                  </div>
                  <div className="view-details">
                    <div className="skeleton skeleton-text short" style={{ width: '120px' }}></div>
                    <div className="skeleton skeleton-text short" style={{ width: '20px', marginTop: '4px' }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : staffList.length === 0 ? (
            <p className="no-staff">No staff members found.</p>
          ) : (
            <>
              <div className="staff-salary-list">
                {staffList.slice(0, displayedStaffCount).map((staff, index) => (
                  <div
                    key={staff.id}
                    className="staff-salary-item"
                    onClick={() => setSelectedStaffForModal(staff)}
                  >
                    <div className="staff-basic-info">
                      <span className="staff-name">{staff.fullName}</span>
                      {staff.joiningDate && (
                        <span className="staff-joining">Joined: {new Date(staff.joiningDate).toLocaleDateString()}</span>
                      )}
                      {staff.salary && (
                        <span className="staff-salary">Salary: ₹{staff.salary}</span>
                      )}
                    </div>
                    <div className="view-details">
                      <span className="view-details-text">Click to view details</span>
                      <span className="view-details-icon">👁️</span>
                    </div>
                  </div>
                ))}

                {/* Loading more skeleton */}
                {isLoadingMore && (
                  <>
                    {[...Array(3)].map((_, index) => (
                      <div key={`loading-${index}`} className="staff-salary-item">
                        <div className="staff-basic-info">
                          <div className="skeleton skeleton-text medium" style={{ width: '150px', marginBottom: '8px' }}></div>
                          <div className="skeleton skeleton-text short" style={{ width: '120px', marginBottom: '4px' }}></div>
                          <div className="skeleton skeleton-text short" style={{ width: '100px' }}></div>
                        </div>
                        <div className="view-details">
                          <div className="skeleton skeleton-text short" style={{ width: '120px' }}></div>
                          <div className="skeleton skeleton-text short" style={{ width: '20px', marginTop: '4px' }}></div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Load More and Download Buttons */}
              <div className="load-more-container">
                {displayedStaffCount < staffList.length && !isLoadingMore && (
                  <button
                    className="load-more-btn"
                    onClick={handleLoadMore}
                  >
                    Load More Staff
                  </button>
                )}
                <button
                  className="export-btn"
                  onClick={handleDownloadExcel}
                  disabled={staffList.length === 0}
                >
                  📥 Download Excel
                </button>
              </div>

              {/* All loaded message */}
              {displayedStaffCount >= staffList.length && staffList.length > 3 && (
                <div className="all-loaded-message">
                  <p>All staff members loaded</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Fullscreen Loader for Deleting */}
        {isDeleting && (
          <div className="fullscreen-loader">
            <span className="loader"></span>
          </div>
        )}

        {/* Fullscreen Loader for Updating */}
        {isUpdating && (
          <div className="fullscreen-loader">
            <span className="loader"></span>
          </div>
        )}

        {/* Fullscreen Loader for Submitting */}
        {isSubmitting && (
          <div className="fullscreen-loader">
            <span className="loader"></span>
          </div>
        )}

        {/* Edit Month Modal */}
        {editingMonth && (
          <div className="modal-overlay edit-modal-overlay" onClick={() => setEditingMonth(null)}>
            <div className="modal-content edit-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Edit {editingMonth.monthYear} Record</h3>
                <button
                  className="modal-close"
                  onClick={() => setEditingMonth(null)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="editSalary">Salary Amount</label>
                    <input
                      id="editSalary"
                      type="number"
                      value={editFormData.salary}
                      onChange={(e) => setEditFormData({ ...editFormData, salary: e.target.value })}
                      placeholder="Enter salary amount"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="editStatus">Payment Status</label>
                    <select
                      id="editStatus"
                      className="filter-select"
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    >
                      <option value="paid">Paid</option>
                      <option value="not paid">Not Paid</option>
                    </select>
                  </div>
                </div>

                {/* Borrow Section */}
                <div className="borrow-section">
                  <h3>Borrow Entries (Optional)</h3>
                  {editFormData.borrowEntries.map((entry, index) => (
                    <div key={index} className="borrow-entry">
                      <div className="form-row">
                        <div className="form-group">
                          <label>Date</label>
                          <input
                            type="date"
                            value={entry.date}
                            onChange={(e) => updateEditBorrowEntry(index, 'date', e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label>Amount</label>
                          <input
                            type="number"
                            value={entry.amount}
                            onChange={(e) => updateEditBorrowEntry(index, 'amount', e.target.value)}
                            placeholder="Enter amount"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        {editFormData.borrowEntries.length > 1 && (
                          <div className="form-group">
                            <label>&nbsp;</label>
                            <button
                              type="button"
                              className="remove-btn"
                              onClick={() => removeEditBorrowEntry(index)}
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="add-borrow-btn"
                    onClick={addEditBorrowEntry}
                  >
                    + Add Borrow Entry
                  </button>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setEditingMonth(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="update-btn"
                    onClick={handleEditSubmit}
                  >
                    Update Record
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="modal-overlay delete-confirm-overlay" onClick={() => setDeleteConfirm(null)}>
            <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Delete Record</h3>
                <button
                  className="modal-close"
                  onClick={() => setDeleteConfirm(null)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="delete-confirm-content">
                  <div className="delete-warning-icon">⚠️</div>
                  <p className="delete-message">
                    Are you sure you want to delete the <strong>{deleteConfirm.monthYear}</strong> record?
                  </p>
                  <p className="delete-warning">
                    This action cannot be undone.
                  </p>
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setDeleteConfirm(null)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="delete-confirm-btn"
                    onClick={handleDeleteMonthConfirm}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <span className="loader"></span>
                        Deleting...
                      </>
                    ) : (
                      'Delete Record'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Staff Details Modal */}
        {selectedStaffForModal && (
          <div className={`modal-overlay ${editingMonth ? 'blurred' : ''}`} onClick={() => !editingMonth && setSelectedStaffForModal(null)}>
            <div className={`modal-content ${editingMonth ? 'blurred' : ''}`} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{selectedStaffForModal.fullName} - Salary Details</h3>
                <button
                  className="modal-close"
                  onClick={() => setSelectedStaffForModal(null)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="staff-summary">
                  <div className="summary-item">
                    <strong>Joining Date:</strong> {selectedStaffForModal.joiningDate ? new Date(selectedStaffForModal.joiningDate).toLocaleDateString() : 'Not specified'}
                  </div>
                  <div className="summary-item">
                    <strong>Current Salary:</strong> ₹{selectedStaffForModal.salary || 'Not specified'}
                  </div>
                </div>

                {selectedStaffForModal.salaryStatus && Object.keys(selectedStaffForModal.salaryStatus).length > 0 ? (
                  <div className="payment-history">
                    <h4>Payment History</h4>
                    {Object.entries(selectedStaffForModal.salaryStatus)
                      .sort(([a], [b]) => {
                        // Sort by date - latest first
                        const months = ['January', 'February', 'March', 'April', 'May', 'June',
                                      'July', 'August', 'September', 'October', 'November', 'December'];
                        const [monthA, yearA] = a.split(', ');
                        const [monthB, yearB] = b.split(', ');

                        const dateA = new Date(parseInt(yearA), months.indexOf(monthA));
                        const dateB = new Date(parseInt(yearB), months.indexOf(monthB));

                        return dateB - dateA; // Latest first
                      })
                      .map(([monthYear, paymentData]) => {
                      // Handle both old string format and new object format
                      const status = typeof paymentData === 'string' ? paymentData : paymentData.status;
                      const displayStatus = status === 'paid' ? 'Paid' : status === 'not paid' ? 'Not Paid' : status;
                      const salaryAmount = typeof paymentData === 'string' ? selectedStaffForModal.salary : paymentData.salaryAmount;
                      const borrow = typeof paymentData === 'object' && paymentData.borrow ? paymentData.borrow : null;
                      const cssClass = status === 'not paid' ? 'status-notpaid' : `status-${status.toLowerCase()}`;

                      return (
                        <div key={monthYear} className="payment-entry-detailed">
                          <div className="payment-header">
                            <span className="month-year">{monthYear}</span>
                            <div className="payment-actions">
                              <button
                                className="edit-btn-small"
                                onClick={() => handleEditMonth(selectedStaffForModal.id, monthYear, paymentData)}
                                title="Edit this month's record"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                className="delete-btn-small"
                                onClick={() => handleDeleteMonthClick(selectedStaffForModal.id, monthYear)}
                                title="Delete this month's record"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </div>
                          <div className="payment-details">
                            <div className="detail-item">
                              <strong>Salary Amount:</strong> ₹{salaryAmount}
                            </div>
                            <div className="detail-item">
                              <strong>Status:</strong> <span className={cssClass}>{displayStatus}</span>
                            </div>
                            {borrow && Object.keys(borrow).length > 0 && (
                              <div className="borrow-section-modal">
                                <strong>Borrow History:</strong>
                                <div className="borrow-list">
                                  {Object.entries(borrow).map(([date, amount]) => (
                                    <div key={date} className="borrow-entry-modal">
                                      <span className="borrow-date">{new Date(date).toLocaleDateString()}</span>
                                      <span className="borrow-amount">₹{amount}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="no-history">
                    <p>No payment history available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <Credits />
    </div>
  );
}

export default SalaryUpdate;