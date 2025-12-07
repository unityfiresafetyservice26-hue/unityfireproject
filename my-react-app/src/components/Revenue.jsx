import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Navbar from './Navbar';
import Credits from './Credits';
import '../App.css';

function Revenue({ addToast }) {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCustomers: 0,
    limit: 10,
    hasNext: false,
    hasPrev: false
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [staffList, setStaffList] = useState([]);

  // Fetch customers on component mount
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Fetch customers whenever filters change (server-side filtering)
  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
    fetchCustomers(1);
  }, [searchTerm, paymentFilter, staffFilter, dateFrom, dateTo]);

  // Pagination handlers
  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchCustomers(page);
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

  // Extract unique staff names from customers data
  const getUniqueStaffNames = (customers) => {
    const staffNames = customers
      .map(customer => customer.staffName)
      .filter(name => name && name.trim() !== '')
      .filter((name, index, arr) => arr.indexOf(name) === index) // Remove duplicates
      .sort(); // Sort alphabetically
    return staffNames;
  };


  const fetchAllCustomersForStaff = async () => {
    try {
      // Fetch all customers without pagination to get complete staff list
      const params = new URLSearchParams();
      params.append('limit', '10000'); // Large limit to get all records

      const url = `${import.meta.env.VITE_BASE_API}/api/customers?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok && data.customers) {
        const uniqueStaffNames = getUniqueStaffNames(data.customers);
        setStaffList(uniqueStaffNames);
      }
    } catch (error) {
      console.error('Error fetching all customers for staff list:', error);
    }
  };

  const fetchCustomers = async (page = currentPage) => {
    try {
      // Build query parameters for server-side filtering and pagination
      const params = new URLSearchParams();

      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      if (paymentFilter) {
        params.append('paymentMode', paymentFilter);
      }

      if (staffFilter) {
        params.append('staffName', staffFilter);
      }

      if (dateFrom) {
        params.append('dateFrom', dateFrom);
      }

      if (dateTo) {
        params.append('dateTo', dateTo);
      }

      params.append('page', page.toString());
      params.append('limit', '25'); // 25 customers per page

      const url = `${import.meta.env.VITE_BASE_API}/api/customers${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        // Server-side filtering and pagination returns paginated results
        const customersData = data.customers || [];
        setCustomers(customersData);
        setFilteredCustomers(customersData);

        // Extract unique staff names from all customers (not just paginated ones)
        // We need to fetch all customers to get complete staff list
        if (page === 1) { // Only update staff list on first page load
          fetchAllCustomersForStaff();
        }

        setPagination(data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalCustomers: 0,
          limit: 10,
          hasNext: false,
          hasPrev: false
        });
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BASE_API}/api/customers/${customerId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refetch customers with current filters applied server-side
        await fetchCustomers();
        setDeleteConfirm(null);
        addToast('Customer entry deleted successfully!', 'success');
      } else {
        console.error('Failed to delete customer');
        addToast('Failed to delete customer entry. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      addToast('An error occurred while deleting the customer entry.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDateTime = (customer) => {
    if (customer.date && customer.time) {
      // Use custom date and time
      const dateTimeString = `${customer.date} ${customer.time}`;
      const dateTime = new Date(dateTimeString);
      if (!isNaN(dateTime.getTime())) {
        return {
          date: dateTime.toLocaleDateString(),
          time: dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
        };
      }
    }

    // Fallback to createdAt timestamp
    if (customer.createdAt) {
      try {
        const date = customer.createdAt.seconds || customer.createdAt._seconds;
        if (date) {
          const dateTime = new Date(date * 1000);
          return {
            date: dateTime.toLocaleDateString(),
            time: dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
          };
        }
        const dateTime = new Date(customer.createdAt);
        return {
          date: dateTime.toLocaleDateString(),
          time: dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
        };
      } catch (error) {
        return { date: 'Date not available', time: '' };
      }
    }

    return { date: 'Date not available', time: '' };
  };

  const handleExportExcel = async () => {
    if (!exportDateFrom || !exportDateTo) {
      addToast('Please select both From and To dates', 'error');
      return;
    }

    setIsExporting(true);
    try {
      // Fetch all customers within the date range (no pagination)
      const params = new URLSearchParams();
      params.append('dateFrom', exportDateFrom);
      params.append('dateTo', exportDateTo);
      params.append('limit', '10000'); // Large limit to get all records

      const response = await fetch(`${import.meta.env.VITE_BASE_API}/api/customers?${params.toString()}`);
      const data = await response.json();

      if (!response.ok || !data.customers) {
        throw new Error('Failed to fetch data for export');
      }

      const customers = data.customers;

      // Prepare data for Excel
      const excelData = customers.map((customer, index) => ({
        'Sr. No': index + 1,
        'Date': formatDateTime(customer).date,
        'Time': formatDateTime(customer).time,
        'Amount (₹)': parseFloat(customer.amount) || 0,
        'Payment Mode': customer.paymentMode,
        'Staff Name': customer.staffName
      }));

      // Calculate totals
      const totalAmount = customers.reduce((sum, customer) => sum + (parseFloat(customer.amount) || 0), 0);
      const onlineCustomers = customers.filter(customer => customer.paymentMode === 'Online');
      const cashCustomers = customers.filter(customer => customer.paymentMode === 'Cash');
      const totalOnline = onlineCustomers.reduce((sum, customer) => sum + (parseFloat(customer.amount) || 0), 0);
      const totalCash = cashCustomers.reduce((sum, customer) => sum + (parseFloat(customer.amount) || 0), 0);
      const onlineCount = onlineCustomers.length;
      const cashCount = cashCustomers.length;

      // Add empty row and totals
      excelData.push({});
      excelData.push({
        'Sr. No': '',
        'Date': '',
        'Time': '',
        'Amount (₹)': '',
        'Payment Mode': '',
        'Staff Name': ''
      });
      excelData.push({
        'Sr. No': 'TOTALS',
        'Date': '',
        'Time': '',
        'Amount (₹)': totalAmount,
        'Payment Mode': '',
        'Staff Name': ''
      });
      excelData.push({
        'Sr. No': 'Total Online Transactions',
        'Date': '',
        'Time': '',
        'Amount (₹)': totalOnline,
        'Payment Mode': `Count: ${onlineCount}`,
        'Staff Name': ''
      });
      excelData.push({
        'Sr. No': 'Total Cash Transactions',
        'Date': '',
        'Time': '',
        'Amount (₹)': totalCash,
        'Payment Mode': `Count: ${cashCount}`,
        'Staff Name': ''
      });

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      const colWidths = [
        { wch: 8 }, // Sr. No
        { wch: 12 }, // Date
        { wch: 8 }, // Time
        { wch: 12 }, // Amount
        { wch: 12 }, // Payment Mode
        { wch: 15 } // Staff Name
      ];
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Revenue Report');

      // Generate filename with date range
      const fileName = `Revenue_Report_${exportDateFrom}_to_${exportDateTo}.xlsx`;

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

  return (
    <div className="dashboard">
      <Navbar addToast={addToast} />
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Revenue Management</h1>
          <p>View and search all customer transactions</p>
        </div>

        {/* Search and Filter Section */}
        <div className="search-container">
          <div className="filters-grid">
            <div className="filter-group">
              <label className="filter-label">Export to Excel</label>
              <button
                className="export-btn"
                onClick={() => setShowExportModal(true)}
                title="Export revenue data to Excel"
              >
                📊 Download Excel
              </button>
            </div>
            <div className="filter-group">
              <label className="filter-label">Search</label>
              <div className="search-group">
                <input
                  type="text"
                  placeholder="Search by amount, staff, or payment..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                <span className="search-icon">🔍</span>
              </div>
            </div>

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
              <label className="filter-label">Payment Mode</label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="filter-select"
              >
                <option value="">All Payments</option>
                <option value="Online">Online</option>
                <option value="Cash">Cash</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Staff Member</label>
              <select
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value)}
                className="filter-select"
              >
                <option value="">All Staff</option>
                {staffList.map((staffName) => (
                  <option key={staffName} value={staffName}>
                    {staffName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Customer List */}
        <div className="customer-list-container">
          {isLoading ? (
            <div className="customer-grid">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="customer-card">
                  <div className="customer-header">
                    <div className="skeleton skeleton-text short"></div>
                    <div className="customer-datetime">
                      <div className="skeleton skeleton-text medium"></div>
                      <div className="skeleton skeleton-text short"></div>
                    </div>
                  </div>
                  <div className="customer-details">
                    <div className="detail-row">
                      <div className="skeleton skeleton-text short"></div>
                      <div className="skeleton skeleton-text medium"></div>
                    </div>
                    <div className="detail-row">
                      <div className="skeleton skeleton-text short"></div>
                      <div className="skeleton skeleton-text short"></div>
                    </div>
                    <div className="detail-row">
                      <div className="skeleton skeleton-text short"></div>
                      <div className="skeleton skeleton-text medium"></div>
                    </div>
                  </div>
                  <div className="customer-actions">
                    <div className="skeleton skeleton-text medium"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="no-customers">
              {searchTerm ? 'No customers found matching your search.' : 'No customers added yet.'}
            </div>
          ) : (
            <div className="customer-grid">
              {filteredCustomers.map((customer, index) => (
                <div key={customer.id} className="customer-card">
                  <div className="customer-header">
                    <span className="customer-number">#{index + 1}</span>
                    <div className="customer-datetime">
                      <span className="customer-date">{formatDateTime(customer).date}</span>
                      <span className="customer-time">{formatDateTime(customer).time}</span>
                    </div>
                  </div>

                  <div className="customer-details">
                    <div className="detail-row">
                      <span className="label">Amount:</span>
                      <span className="value">₹{customer.amount}</span>
                    </div>

                    <div className="detail-row">
                      <span className="label">Payment:</span>
                      <span className={`value payment-${customer.paymentMode.toLowerCase()}`}>
                        {customer.paymentMode}
                      </span>
                    </div>

                    <div className="detail-row">
                      <span className="label">Staff:</span>
                      <span className="value">{customer.staffName}</span>
                    </div>
                  </div>

                  <div className="customer-actions">
                    <button
                      className="delete-btn"
                      onClick={() => setDeleteConfirm(customer.id)}
                      title="Delete customer"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.totalCustomers > 0 && (
            <div className="pagination-container">
              <div className="pagination-info">
                Showing {((currentPage - 1) * pagination.limit) + 1} to {Math.min(currentPage * pagination.limit, pagination.totalCustomers)} of {pagination.totalCustomers} customers (25 per page)
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

          {/* Delete Confirmation Dialog */}
          {deleteConfirm && (
            <div className="delete-confirm-overlay">
              <div className="delete-confirm-dialog">
                <h3>Confirm Delete</h3>
                <p>Are you sure you want to delete this customer entry? This action cannot be undone.</p>
                <div className="delete-confirm-actions">
                  <button
                    className="cancel-btn"
                    onClick={() => setDeleteConfirm(null)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    className="confirm-delete-btn"
                    onClick={() => handleDeleteCustomer(deleteConfirm)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Export Excel Modal */}
          {showExportModal && (
            <div className="delete-confirm-overlay">
              <div className="delete-confirm-dialog">
                <h3>Export Revenue to Excel</h3>
                <p>Select the date range for the revenue data you want to export.</p>
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

          {/* Full Screen Loader for Delete */}
          {isDeleting && (
            <div className="fullscreen-loader">
              <span className="loader"></span>
            </div>
          )}
        </div>
      </div>
      <Credits />
    </div>
  );
}

export default Revenue;