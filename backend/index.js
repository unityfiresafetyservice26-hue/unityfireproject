const express = require('express');
const admin = require('firebase-admin');
require('dotenv').config();

// Add global error handlers at the very top
process.on('uncaughtException', (error) => {
  console.error('🔥 UNCAUGHT EXCEPTION:', error);
  console.error('Stack:', error.stack);
  // Don't exit immediately, let's see what happens
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

console.log('🚀 Starting server...');

const app = express();
const PORT = process.env.PORT || 6000;

// Check if Firebase file exists
console.log('📁 Checking Firebase credentials...');

// Firebase Admin SDK
try {
  console.log('🔧 Initializing Firebase...');
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
  };
  console.log('🔑 Service account loaded:', !!serviceAccount);

  // const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  console.error('Full error:', error);
  // Don't exit, let's see if we can still run the server
}

const db = admin.firestore();

// CORS Middleware
app.use((req, res, next) => {
  const allowedOrigins = [
  'https://unityfireproject.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175'
];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Test endpoint - this should work even without Firebase
app.get('/api/health', (req, res) => {
  console.log('✅ Health check called');
  res.json({ 
    status: 'Server is running', 
    timestamp: new Date(),
    firebase: !!admin.apps.length
  });
});

// ---------------- LOGIN API ----------------
app.post('/api/login', async (req, res) => {
  console.log('🔐 Login attempt');
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const docRef = db.collection('password').doc('password');
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(500).json({ error: 'Login configuration not found' });
    }

    const storedPassword = doc.data().loginpassword;

    if (password === storedPassword) {
      res.status(200).json({ message: 'Login successful' });
    } else {
      res.status(401).json({ error: 'Invalid password' });
    }

  } catch (error) {
    console.error('❌ Error during login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ---------------- STAFF LOGIN API ----------------
app.post('/api/staff-login', async (req, res) => {
  console.log('👷 Staff login attempt');
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const staffRef = db.collection('staff');
    const snapshot = await staffRef.where('fullName', '==', username).get();

    if (snapshot.empty) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const staffDoc = snapshot.docs[0];
    const staffData = staffDoc.data();

    if (staffData.password === password) {
      res.status(200).json({ message: 'Login successful', role: 'staff', staffId: staffDoc.id });
    } else {
      res.status(401).json({ error: 'Invalid username or password' });
    }

  } catch (error) {
    console.error('❌ Error during staff login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ---------------- CHANGE PASSWORD API ----------------
app.post('/api/change-password', async (req, res) => {
  console.log('🔑 Change password attempt');
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const docRef = db.collection('password').doc('password');
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(500).json({ error: 'Password configuration not found' });
    }

    const storedPassword = doc.data().loginpassword;

    if (currentPassword !== storedPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update the password
    await docRef.update({
      loginpassword: newPassword,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('❌ Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ---------------- ADD PERSON API ----------------
app.post('/api/persons', async (req, res) => {
  console.log('👤 Adding person');
  try {
    const { name, phone, email } = req.body;

    const docRef = await db.collection('persons').add({
      name,
      phone,
      email,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(201).json({ id: docRef.id, message: 'Person added successfully' });

  } catch (error) {
    console.error('❌ Error adding person:', error);
    res.status(500).json({ error: 'Failed to add person' });
  }
});

// ---------------- GET STAFF API ----------------
app.get('/api/staff', async (req, res) => {
  console.log('📋 Fetching staff members');
  try {
    const staffRef = db.collection('staff');
    const snapshot = await staffRef.orderBy('createdAt', 'desc').get();

    const staff = [];
    snapshot.forEach(doc => {
      staff.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.status(200).json({ staff });

  } catch (error) {
    console.error('❌ Error fetching staff:', error);
    res.status(500).json({ error: 'Failed to fetch staff members' });
  }
});

// ---------------- ADD STAFF API ----------------
app.post('/api/staff', async (req, res) => {
  console.log('👷 Adding staff member');
  console.log('DEBUG: Received request body:', req.body);
  try {
    const { fullName, salary, joiningDate, password, salaryStatus } = req.body;

    console.log('DEBUG: fullName:', fullName, 'salary:', salary, 'joiningDate:', joiningDate, 'password:', password ? '[REDACTED]' : 'not provided');

    if (!fullName) {
      console.log('DEBUG: Full name validation failed - fullName is empty');
      return res.status(400).json({ error: 'Full name is required' });
    }

    if (!salary || salary === '') {
      console.log('DEBUG: Salary validation failed - salary is empty');
      return res.status(400).json({ error: 'Salary is required' });
    }

    if (!joiningDate || joiningDate === '') {
      console.log('DEBUG: Joining date validation failed - joiningDate is empty');
      return res.status(400).json({ error: 'Joining date is required' });
    }

    if (!password || password.length < 6) {
      console.log('DEBUG: Password validation failed - password is empty or too short');
      return res.status(400).json({ error: 'Password is required and must be at least 6 characters long' });
    }

    // Validate salary
    let salaryValue = null;
    console.log('DEBUG: Validating salary:', salary);
    salaryValue = parseFloat(salary);
    if (isNaN(salaryValue) || salaryValue < 0) {
      console.log('DEBUG: Salary validation failed');
      return res.status(400).json({ error: 'Salary must be a valid non-negative number' });
    }
    console.log('DEBUG: Salary validated:', salaryValue);

    // Validate joining date
    console.log('DEBUG: Validating joining date:', joiningDate);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(joiningDate)) {
      console.log('DEBUG: Joining date validation failed');
      return res.status(400).json({ error: 'Joining date must be in YYYY-MM-DD format' });
    }
    console.log('DEBUG: Joining date validated');

    // Validate salaryStatus if provided
    if (salaryStatus && typeof salaryStatus !== 'object') {
      return res.status(400).json({ error: 'Salary status must be an object' });
    }

    const staffData = {
      fullName: fullName.trim(),
      password: password, // Store the password
      salaryStatus: {}, // Always include empty salaryStatus map
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (salaryValue !== null) {
      staffData.salary = salaryValue;
    }

    if (joiningDate) {
      staffData.joiningDate = joiningDate;
    }

    if (salaryStatus) {
      staffData.salaryStatus = salaryStatus;
    }

    const docRef = await db.collection('staff').add(staffData);

    res.status(201).json({ id: docRef.id, message: 'Staff member added successfully' });

  } catch (error) {
    console.error('❌ Error adding staff member:', error);
    res.status(500).json({ error: 'Failed to add staff member' });
  }
});

// ---------------- UPDATE STAFF SALARY API ----------------
app.put('/api/staff/:id/salary', async (req, res) => {
  console.log('💰 Updating staff salary');
  try {
    const { id } = req.params;
    const { salary, salaryStatus } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Staff ID is required' });
    }

    // Validate salary if provided
    let salaryValue = null;
    if (salary !== undefined && salary !== null && salary !== '') {
      salaryValue = parseFloat(salary);
      if (isNaN(salaryValue) || salaryValue < 0) {
        return res.status(400).json({ error: 'Salary must be a valid non-negative number' });
      }
    }

    // Validate salaryStatus if provided
    if (salaryStatus && typeof salaryStatus !== 'object') {
      return res.status(400).json({ error: 'Salary status must be an object' });
    }

    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (salaryValue !== null) {
      updateData.salary = salaryValue;
    }

    if (salaryStatus) {
      updateData.salaryStatus = salaryStatus;
    }

    await db.collection('staff').doc(id).update(updateData);

    res.status(200).json({ message: 'Staff salary updated successfully' });

  } catch (error) {
    console.error('❌ Error updating staff salary:', error);
    res.status(500).json({ error: 'Failed to update staff salary' });
  }
});

// ---------------- DELETE STAFF API ----------------
app.delete('/api/staff/:id', async (req, res) => {
  console.log('🗑️ Deleting staff member');
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Staff ID is required' });
    }

    await db.collection('staff').doc(id).delete();

    res.status(200).json({ message: 'Staff member deleted successfully' });

  } catch (error) {
    console.error('❌ Error deleting staff member:', error);
    res.status(500).json({ error: 'Failed to delete staff member' });
  }
});

// ---------------- UPDATE STAFF PASSWORD API ----------------
app.put('/api/staff/:id/password', async (req, res) => {
  console.log('🔑 Updating staff password');
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Staff ID is required' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    await db.collection('staff').doc(id).update({
      password: password,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({ message: 'Staff password updated successfully' });

  } catch (error) {
    console.error('❌ Error updating staff password:', error);
    res.status(500).json({ error: 'Failed to update staff password' });
  }
});

// ---------------- GET CUSTOMERS API ----------------
app.get('/api/customers', async (req, res) => {
  console.log('📊 Fetching customers with filters and pagination');
  try {
    const {
      search,
      paymentMode,
      staffName,
      dateFrom,
      dateTo,
      page = 1,
      limit = 10
    } = req.query;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    let query = db.collection('customers');

    // Apply filters at database level where possible
    if (paymentMode) {
      query = query.where('paymentMode', '==', paymentMode);
    }

    if (staffName) {
      query = query.where('staffName', '==', staffName);
    }

    // Get all customers first (since Firestore has limitations with complex queries)
    const snapshot = await query.orderBy('createdAt', 'desc').get();

    let customers = [];
    snapshot.forEach(doc => {
      customers.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Apply client-side filters for complex queries (search and date range)
    if (search && search.trim() !== '') {
      const searchLower = search.toLowerCase();
      customers = customers.filter(customer =>
        customer.amount.toString().includes(searchLower) ||
        customer.staffName.toLowerCase().includes(searchLower) ||
        customer.paymentMode.toLowerCase().includes(searchLower)
      );
    }

    // Apply date range filtering
    if (dateFrom || dateTo) {
      customers = customers.filter(customer => {
        // Get customer date
        let customerDate;
        if (customer.date && customer.time) {
          customerDate = new Date(`${customer.date}T${customer.time}`);
        } else if (customer.createdAt) {
          const timestamp = customer.createdAt.seconds || customer.createdAt._seconds;
          customerDate = timestamp ? new Date(timestamp * 1000) : new Date();
        } else {
          customerDate = new Date();
        }

        const customerDateStr = customerDate.toISOString().split('T')[0];

        // Check date range
        if (dateFrom && customerDateStr < dateFrom) return false;
        if (dateTo && customerDateStr > dateTo) return false;

        return true;
      });
    }

    // Sort filtered results by dateTime descending (latest first)
    customers.sort((a, b) => {
      const dateA = a.dateTime ? new Date(a.dateTime) : new Date((a.createdAt?.seconds || 0) * 1000);
      const dateB = b.dateTime ? new Date(b.dateTime) : new Date((b.createdAt?.seconds || 0) * 1000);
      return dateB - dateA;
    });

    // Calculate pagination
    const totalCustomers = customers.length;
    const totalPages = Math.ceil(totalCustomers / limitNum);

    // Apply pagination
    const paginatedCustomers = customers.slice(offset, offset + limitNum);

    res.status(200).json({
      customers: paginatedCustomers,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCustomers,
        limit: limitNum,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('❌ Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// ---------------- DELETE CUSTOMER API ----------------
app.delete('/api/customers/:id', async (req, res) => {
  console.log('🗑️ Deleting customer');
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    await db.collection('customers').doc(id).delete();

    res.status(200).json({ message: 'Customer deleted successfully' });

  } catch (error) {
    console.error('❌ Error deleting customer:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// ---------------- ADD CUSTOMER API ----------------
app.post('/api/customers', async (req, res) => {
  console.log('👤 Adding customer');
  try {
    const { amount, paymentMode, staffName, date, time } = req.body;

    if (!amount || !paymentMode || !staffName || !date || !time) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      return res.status(400).json({ error: 'Amount must be a valid positive number' });
    }

    if (!['Online', 'Cash'].includes(paymentMode)) {
      return res.status(400).json({ error: 'Invalid payment mode' });
    }

    // Validate date and time format
    const dateTimeString = `${date}T${time}`;
    const dateTime = new Date(dateTimeString);
    if (isNaN(dateTime.getTime())) {
      return res.status(400).json({ error: 'Invalid date or time format' });
    }

    const docRef = await db.collection('customers').add({
      amount: amountValue,
      paymentMode,
      staffName: staffName.trim(),
      date,
      time,
      dateTime: dateTime.toISOString(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(201).json({ id: docRef.id, message: 'Customer added successfully' });

  } catch (error) {
    console.error('❌ Error adding customer:', error);
    res.status(500).json({ error: 'Failed to add customer' });
  }
});

// ---------------- GET EXPENSES API ----------------
app.get('/api/expenses', async (req, res) => {
  console.log('💸 Fetching expenses with filters and pagination');
  try {
    const {
      dateFrom,
      dateTo,
      page = 1,
      limit = 10
    } = req.query;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    let query = db.collection('expenses');

    // Get all expenses first (since Firestore has limitations with complex queries)
    const snapshot = await query.orderBy('createdAt', 'desc').get();

    let expenses = [];
    snapshot.forEach(doc => {
      expenses.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Apply date range filtering
    if (dateFrom || dateTo) {
      expenses = expenses.filter(expense => {
        // Get expense date
        let expenseDate;
        if (expense.date && expense.time) {
          expenseDate = new Date(`${expense.date}T${expense.time}`);
        } else if (expense.createdAt) {
          const timestamp = expense.createdAt.seconds || expense.createdAt._seconds;
          expenseDate = timestamp ? new Date(timestamp * 1000) : new Date();
        } else {
          expenseDate = new Date();
        }

        const expenseDateStr = expenseDate.toISOString().split('T')[0];

        // Check date range
        if (dateFrom && expenseDateStr < dateFrom) return false;
        if (dateTo && expenseDateStr > dateTo) return false;

        return true;
      });
    }

    // Global sort by dateTime descending (latest first across entire filtered dataset)
    expenses.sort((a, b) => {
      // Use dateTime field directly for sorting (ISO strings sort correctly lexicographically)
      const dateA = a.dateTime || '1970-01-01T00:00:00.000Z';
      const dateB = b.dateTime || '1970-01-01T00:00:00.000Z';

      // Sort descending (latest first) - ISO strings sort correctly
      if (dateB > dateA) return -1;
      if (dateB < dateA) return 1;
      return 0;
    });

    // Calculate pagination
    const totalExpenses = expenses.length;
    const totalPages = Math.ceil(totalExpenses / limitNum);

    // Apply pagination
    const paginatedExpenses = expenses.slice(offset, offset + limitNum);

    res.status(200).json({
      expenses: paginatedExpenses,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalExpenses,
        limit: limitNum,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('❌ Error fetching expenses:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// ---------------- ADD EXPENSE API ----------------
app.post('/api/expenses', async (req, res) => {
  console.log('💸 Adding expense');
  try {
    const { date, time, items, totalAmount, dateTime } = req.body;

    if (!date || !time || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Date, time, and at least one item are required' });
    }

    // Validate items
    for (const item of items) {
      if (!item.name || !item.name.trim() || !item.amount || isNaN(parseFloat(item.amount)) || parseFloat(item.amount) <= 0) {
        return res.status(400).json({ error: 'Each item must have a valid name and positive amount' });
      }
    }

    // Validate date and time format
    const expenseDateTime = new Date(dateTime);
    if (isNaN(expenseDateTime.getTime())) {
      return res.status(400).json({ error: 'Invalid date or time format' });
    }

    const docRef = await db.collection('expenses').add({
      date,
      time,
      dateTime,
      items: items.map(item => ({
        name: item.name.trim(),
        amount: parseFloat(item.amount)
      })),
      totalAmount: parseFloat(totalAmount),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(201).json({ id: docRef.id, message: 'Expense added successfully' });

  } catch (error) {
    console.error('❌ Error adding expense:', error);
    res.status(500).json({ error: 'Failed to add expense' });
  }
});

// ---------------- UPDATE EXPENSE API ----------------
app.put('/api/expenses/:id', async (req, res) => {
  console.log('✏️ Updating expense');
  try {
    const { id } = req.params;
    const { date, time, items, totalAmount, dateTime } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Expense ID is required' });
    }

    if (!date || !time || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Date, time, and at least one item are required' });
    }

    // Validate items
    for (const item of items) {
      if (!item.name || !item.name.trim() || !item.amount || isNaN(parseFloat(item.amount)) || parseFloat(item.amount) <= 0) {
        return res.status(400).json({ error: 'Each item must have a valid name and positive amount' });
      }
    }

    // Validate date and time format
    const expenseDateTime = new Date(dateTime);
    if (isNaN(expenseDateTime.getTime())) {
      return res.status(400).json({ error: 'Invalid date or time format' });
    }

    const updateData = {
      date,
      time,
      dateTime,
      items: items.map(item => ({
        name: item.name.trim(),
        amount: parseFloat(item.amount)
      })),
      totalAmount: parseFloat(totalAmount),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('expenses').doc(id).update(updateData);

    res.status(200).json({ message: 'Expense updated successfully' });

  } catch (error) {
    console.error('❌ Error updating expense:', error);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// ---------------- DELETE EXPENSE API ----------------
app.delete('/api/expenses/:id', async (req, res) => {
  console.log('🗑️ Deleting expense');
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Expense ID is required' });
    }

    await db.collection('expenses').doc(id).delete();

    res.status(200).json({ message: 'Expense deleted successfully' });

  } catch (error) {
    console.error('❌ Error deleting expense:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// Start server
console.log('📡 Starting Express server...');
const server = app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 CORS enabled for: http://localhost:5173, http://localhost:5174, http://localhost:5175`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`⏰ Started at: ${new Date()}`);
});

// Keep the process alive
server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

// Log when server closes
server.on('close', () => {
  console.log('🔒 Server closed');
});

// Keep alive forever
setInterval(() => {
  // Keep the process alive
  if (Math.random() < 0.0001) { // Very rarely log to not spam
    console.log('💓 Server heartbeat');
  }
}, 60000); // Every minute

// Handle graceful shutdown
const shutdown = () => {
  console.log('🛑 Shutdown signal received');
  server.close(() => {
    console.log('✅ Server closed gracefully');
    process.exit(0);
  });
  
  // Force shutdown after 5 seconds
  setTimeout(() => {
    console.error('❌ Forcing shutdown');
    process.exit(1);
  }, 5000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log('👂 Listening for requests...');
