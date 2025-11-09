const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// MongoDB connection
// mongoose.connect('mongodb+srv://marketingstarlinkjewels:QWMRHmsvLxRQ5ETS@cluster0.dcunkj1.mongodb.net/', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });


mongoose.connect("mongodb+srv://bkpatel1144_db_user:nehdGlj0AbPo9e43@cluster0.tzvbohe.mongodb.net/", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Invoice گسترده
const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  date: { type: String, required: true },
  terms: { type: String, required: true },
  customer: {
    name: { type: String, required: true },
    phone: { type: String },
    address: { type: String },
    city: { type: String },
  },
  items: [{
    stockId: { type: String },
    description: { type: String },
    pieces: { type: Number, default: 0 },
    weight: { type: Number, default: 0 },
    pricePerUnit: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  }],
  charges: {
    subtotal: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
  },
});

const Invoice = mongoose.model('Invoice', invoiceSchema);

// Root route to show MongoDB status
app.get('/', async (req, res) => {
  try {
    const status = mongoose.connection.readyState;
    const statusMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
      99: 'uninitialized',
    };
    res.json({
      mongodbStatus: statusMap[status] || 'unknown',
      message: 'MongoDB connection status',
    });
  } catch (error) {
    res.status(500).json({ message: 'Error checking MongoDB status', error: error.message });
  }
});

// CRUD Routes

// Create Invoice
app.post('/api/invoices', async (req, res) => {
  try {
    // Get date from req.body (format: YYYY-MM-DD, e.g., "2025-11-05")
    const dateStr = req.body.date;
    if (!dateStr) {
      throw new Error('Date is required');
    }

    // Parse the date
    const invoiceDate = new Date(dateStr);
    if (isNaN(invoiceDate.getTime())) {
      throw new Error('Invalid date format');
    }

    // Normalize to start and end of the day for querying
    const startOfDay = new Date(invoiceDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(invoiceDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Count existing invoices for this date
    const count = await Invoice.countDocuments({
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    // Generate sequence number
    const seq = count + 1;
    const seqStr = seq.toString().padStart(2, '0');

    // Generate date part: DDMMYYYY
    const dayStr = invoiceDate.getDate().toString().padStart(2, '0');
    const monthStr = (invoiceDate.getMonth() + 1).toString().padStart(2, '0');
    const yearStr = invoiceDate.getFullYear().toString();
    const base = `${dayStr}${monthStr}${yearStr}`;

    // Set invoice number, e.g., 05112025/01
    const invoiceNumber = `${base}/${seqStr}`;

    // Create invoice
    const invoiceData = {
      ...req.body,
      // date: invoiceDate,
      invoiceNumber: invoiceNumber
    };
    const invoice = new Invoice(invoiceData);
    const savedInvoice = await invoice.save();

    res.status(201).json(savedInvoice);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get All Invoices
app.get('/api/invoices', async (req, res) => {
  try {
    const invoices = await Invoice.find();
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get Single Invoice
app.get('/api/invoices/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update Invoice
app.put('/api/invoices/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete Invoice
app.delete('/api/invoices/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json({ message: 'Invoice deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
