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

async function generateInvoiceNumber(date) {
  // Convert date from "2025-11-09" to "9112025"
  const dateParts = date.split('-');
  const year = dateParts[0];
  const month = dateParts[1];
  const day = dateParts[2];
  
  // Remove leading zero from day if present
  const dayFormatted = parseInt(day).toString();
  
  // Create date prefix: DDMMYYYY
  const datePrefix = `${dayFormatted}${month}${year}`;
  
  // Find all invoices with this date prefix
  const existingInvoices = await Invoice.find({
    invoiceNumber: { $regex: `^${datePrefix}/` }
  }).sort({ invoiceNumber: 1 });
  
  // Determine the next sequence number
  let nextSequence = 1;
  
  if (existingInvoices.length > 0) {
    // Extract sequence numbers and find the highest
    const sequences = existingInvoices.map(inv => {
      const parts = inv.invoiceNumber.split('/');
      return parseInt(parts[1]) || 0;
    });
    
    const maxSequence = Math.max(...sequences);
    nextSequence = maxSequence + 1;
  }
  
  // Format sequence with leading zero if less than 10
  const sequenceFormatted = nextSequence.toString().padStart(2, '0');
  
  return `${datePrefix}/${sequenceFormatted}`;
}
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
    const invoiceData = req.body;
    
    // Generate invoice number based on date
    const invoiceNumber = await generateInvoiceNumber(invoiceData.date);
    invoiceData.invoiceNumber = invoiceNumber;
    
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
