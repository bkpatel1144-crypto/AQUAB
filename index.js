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
// Create Invoice with auto-generated invoiceNumber
app.post('/api/invoices', async (req, res) => {
  try {
    const { date } = req.body;

    // Convert ISO date "2025-11-05" to DD/MM/YYYY
    const isoDate = new Date(date);
    if (isNaN(isoDate)) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    const day = String(isoDate.getDate()).padStart(2, '0');
    const month = String(isoDate.getMonth() + 1).padStart(2, '0'); // +1 because months are 0-indexed
    const year = isoDate.getFullYear();

    const dateKey = `${day}${month}${year}`; // e.g., "09112025"

    // Find the highest invoice number for this date
    const lastInvoice = await Invoice.findOne(
      { invoiceNumber: { $regex: `^${dateKey}/` } },
      { invoiceNumber: 1 }
    ).sort({ invoiceNumber: -1 });

    let nextSeq = 1;
    if (lastInvoice) {
      const lastSeq = parseInt(lastInvoice.invoiceNumber.split('/')[1]);
      nextSeq = lastSeq + 1;
    }

    const sequential = String(nextSeq).padStart(2, '0');
    const invoiceNumber = `${dateKey}/${sequential}`;

    // Create new invoice with generated invoiceNumber
    const invoiceData = {
      ...req.body,
      invoiceNumber,
    };

    const invoice = new Invoice(invoiceData);
    const savedInvoice = await invoice.save();

    res.status(201).json(savedInvoice);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Invoice number already exists (race condition)' });
    }
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
