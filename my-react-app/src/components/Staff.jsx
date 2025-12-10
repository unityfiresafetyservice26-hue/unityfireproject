import { useState, useEffect } from 'react';
import Navbar from './Navbar';
import Credits from './Credits';
import '../App.css';
import * as XLSX from 'xlsx';

function Staff({ addToast }) {
  const [formData, setFormData] = useState({
    fullName: '',
    salary: '',
    joiningDate: '',
    password: ''
  });
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editPasswordConfirm, setEditPasswordConfirm] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

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

    console.log('DEBUG: Form data before submission:', formData);

    try {
      // Prepare data for submission
      const submitData = {
        fullName: formData.fullName,
        salary: formData.salary || null,
        joiningDate: formData.joiningDate || null,
        password: formData.password,
      };

      console.log('DEBUG: Submit data:', submitData);

      const response = await fetch(`${import.meta.env.VITE_BASE_API}/api/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });
      const data = await response.json();
      if (response.ok) {
        addToast('Staff member added successfully!', 'success');
        setFormData({
          fullName: '',
          salary: '',
          joiningDate: '',
          password: ''
        });
        // Refresh the staff list
        fetchStaff();
      } else {
        addToast(data.error || 'Failed to add staff member', 'error');
      }
    } catch (error) {
      addToast('Network error. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async (staffId) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BASE_API}/api/staff/${staffId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        addToast('Staff member deleted successfully!', 'success');
        // Refresh the staff list
        fetchStaff();
        setDeleteConfirm(null);
      } else {
        addToast('Failed to delete staff member', 'error');
      }
    } catch (error) {
      addToast('Error deleting staff member', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdatePassword = async (staffId) => {
    if (!newPassword || newPassword.length < 6) {
      addToast('Password must be at least 6 characters long', 'error');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BASE_API}/api/staff/${staffId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: newPassword }),
      });

      if (response.ok) {
        addToast('Password updated successfully!', 'success');
        setEditPasswordConfirm(null);
        setNewPassword('');
        // Refresh the staff list
        fetchStaff();
      } else {
        const data = await response.json();
        addToast(data.error || 'Failed to update password', 'error');
      }
    } catch (error) {
      addToast('Error updating password', 'error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDownloadExcel = () => {
    // Prepare data for Excel
    const data = staffList.map((staff, index) => ({
      'S.No': index + 1,
      'ID': staff.id,
      'Full Name': staff.fullName,
      'Salary': staff.salary || 'Not specified',
      'Joining Date': staff.joiningDate ? new Date(staff.joiningDate).toLocaleDateString() : 'Not specified',
      'Created At': staff.createdAt ?
        (() => {
          try {
            const timestamp = staff.createdAt;
            const seconds = timestamp.seconds || timestamp._seconds;
            if (seconds) {
              return new Date(seconds * 1000).toLocaleDateString();
            }
            return new Date(timestamp).toLocaleDateString();
          } catch (error) {
            return 'Date not available';
          }
        })() : 'Date not available'
    }));

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(data);

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff Members');

    // Generate filename with current date
    const date = new Date().toISOString().split('T')[0];
    const filename = `staff_members_${date}.xlsx`;

    // Download the file
    XLSX.writeFile(wb, filename);
    addToast('Excel file downloaded successfully!', 'success');
  };

  return (
    <div className="dashboard">
      <Navbar addToast={addToast} />
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Add Staff Member</h1>
          <p>Add new staff members to your salon</p>
        </div>

        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <button
            type="button"
            className="add-borrow-btn"
            onClick={() => setShowForm(!showForm)}
            style={{ fontSize: '16px', padding: '12px 24px' }}
          >
            {showForm ? 'Close Staff Member' : 'Add Staff Member'}
          </button>
        </div>

        {showForm && (
          <div className="person-form">
          <h2 className="form-title">Staff Information</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Enter staff member's full name"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="salary">Salary</label>
              <input
                id="salary"
                type="number"
                name="salary"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                placeholder="Enter salary amount"
                min="0"
                step="0.01"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="joiningDate">Joining Date</label>
              <input
                id="joiningDate"
                type="date"
                name="joiningDate"
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter password (minimum 6 characters)"
                required
                disabled={isSubmitting}
                minLength="6"
              />
            </div>

            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="loader"></span>
                  Adding Staff...
                </>
              ) : (
                'Add Staff Member'
              )}
            </button>
          </form>

          {message && (
            <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}
        </div>
        )}

        {/* Staff List Section */}
        <div className="dashboard-card">
          <h2>All Staff Members</h2>
          {isLoadingStaff ? (
            <div className="staff-list">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="staff-item">
                  <div className="staff-info">
                    <span className="staff-number">#{index + 1}</span>
                    <div className="staff-basic-info">
                      <div className="skeleton skeleton-text medium" style={{ width: '150px', marginBottom: '4px' }}></div>
                      <div className="skeleton skeleton-text short" style={{ width: '120px' }}></div>
                    </div>
                  </div>
                  <div className="staff-date">
                    <div className="skeleton skeleton-text medium" style={{ width: '100px' }}></div>
                  </div>
                  <div className="staff-actions">
                    <div className="skeleton skeleton-text short" style={{ width: '60px', height: '30px' }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : staffList.length === 0 ? (
            <p className="no-staff">No staff members added yet.</p>
          ) : (
            <div className="staff-list">
              {staffList.map((staff, index) => (
                <div key={staff.id} className="staff-item">
                  <div className="staff-info">
                    <span className="staff-number">#{index + 1}</span>
                    <div className="staff-basic-info">
                      <span className="staff-name">{staff.fullName}</span>
                      <span className="staff-joining">
                        Joined: {staff.joiningDate ? new Date(staff.joiningDate).toLocaleDateString() : 'Not specified'}
                      </span>
                    </div>
                  </div>
                  <div className="staff-date">
                    {staff.createdAt ?
                      (() => {
                        try {
                          // Handle Firestore timestamp format
                          const timestamp = staff.createdAt;
                          const seconds = timestamp.seconds || timestamp._seconds;
                          if (seconds) {
                            return new Date(seconds * 1000).toLocaleDateString();
                          }
                          // Handle ISO string format
                          return new Date(timestamp).toLocaleDateString();
                        } catch (error) {
                          return 'Date not available';
                        }
                      })() :
                      'Date not available'
                    }
                  </div>
                  <div className="staff-actions">
                    <button
                      className="edit-btn"
                      onClick={() => setEditPasswordConfirm(staff.id)}
                      title="Edit password"
                      style={{ marginRight: '8px' }}
                    >
                      🔑 Edit Password
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => setDeleteConfirm(staff.id)}
                      title="Delete staff member"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        {deleteConfirm && (
          <div className="delete-confirm-overlay">
            <div className="delete-confirm-dialog">
              <h3>Delete Staff Member</h3>
              <p>Are you sure you want to delete this staff member? This action cannot be undone.</p>
              <div className="delete-confirm-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setDeleteConfirm(null)}
                >
                  Cancel
                </button>
                <button
                  className="confirm-delete-btn"
                  onClick={() => handleDeleteStaff(deleteConfirm)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Password Modal */}
        {editPasswordConfirm && (
          <div className="delete-confirm-overlay">
            <div className="delete-confirm-dialog">
              <h3>Edit Password</h3>
              <p>Enter the new password for this staff member:</p>
              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (minimum 6 characters)"
                    minLength="6"
                    required
                    disabled={isUpdatingPassword}
                    style={{
                      marginBottom: '15px',
                      paddingRight: '45px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
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
                    disabled={isUpdatingPassword}
                  >
                    {showNewPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <div className="delete-confirm-actions">
                <button
                  className="cancel-btn"
                  onClick={() => {
                    setEditPasswordConfirm(null);
                    setNewPassword('');
                    setShowNewPassword(false);
                  }}
                  disabled={isUpdatingPassword}
                >
                  Cancel
                </button>
                <button
                  className="confirm-delete-btn"
                  onClick={() => handleUpdatePassword(editPasswordConfirm)}
                  disabled={isUpdatingPassword || !newPassword || newPassword.length < 6}
                >
                  {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Full Screen Loader for Staff Addition */}
        {isSubmitting && (
          <div className="fullscreen-loader">
            <span className="loader"></span>
          </div>
        )}

        {/* Full Screen Loader for Staff Deletion */}
        {isDeleting && (
          <div className="fullscreen-loader">
            <span className="loader"></span>
          </div>
        )}

        {/* Full Screen Loader for Password Update */}
        {isUpdatingPassword && (
          <div className="fullscreen-loader">
            <span className="loader"></span>
          </div>
        )}
      </div>
      <Credits />
    </div>
  );
}

export default Staff;