const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({ 
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'], 
  credentials: true 
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const walletRoutes = require('./routes/wallet');
const faceRoutes = require('./routes/face');
const paymentRoutes = require('./routes/payment');

// Mount routes
app.use('/api/wallet', walletRoutes);
app.use('/api/face', faceRoutes);
app.use('/api/payment', paymentRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'FaceWise-Pay API',
    version: '1.0.0',
    status: 'running',
    blockchain: 'Aptos',
    endpoints: {
      wallet: [
        'POST /api/wallet/create',
        'POST /api/wallet/balance', 
        'POST /api/wallet/mint',
        'POST /api/wallet/faucet',
        'GET /api/wallet/status'
      ],
      face: [
        'POST /api/face/enroll', 
        'POST /api/face/recognize', 
        'GET /api/face/enrolled',
        'POST /api/face/check-enrollment',
        'DELETE /api/face/clear'
      ],
      payment: [
        'POST /api/payment/face-pay', 
        'POST /api/payment/simulate',
        'GET /api/payment/history/:address'
      ]
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  const aptosService = require('./services/aptosService');
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    aptos: aptosService.getStatus()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 FaceWise-Pay Backend running on port ${PORT}`);
  console.log(`🌐 Network: ${process.env.APTOS_NETWORK || 'devnet'}`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
  console.log(`📖 API Docs: http://localhost:${PORT}/api`);
});