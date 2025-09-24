const express = require('express');
const multer = require('multer');
const faceService = require('../services/faceService');
const aptosService = require('../services/aptosService');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

router.post('/face-pay', upload.single('photo'), async (req, res) => {
  try {
    const { merchantAddress, amount, fromPrivateKey } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Photo required for face recognition'
      });
    }

    if (!merchantAddress || !amount || !fromPrivateKey) {
      return res.status(400).json({
        success: false,
        error: 'Merchant address, amount, and private key are required'
      });
    }

    const paymentAmount = parseFloat(amount);
    if (paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be greater than 0'
      });
    }

    console.log(`💳 Processing face payment: ${paymentAmount} APT to ${merchantAddress}`);

    // Step 1: Recognize face
    console.log('Step 1: Recognizing customer face...');
    const recognition = await faceService.recognizeFace(
      req.file.buffer,
      req.file.mimetype
    );

    if (!recognition.success) {
      return res.status(500).json({
        success: false,
        error: 'Face recognition failed',
        message: recognition.error
      });
    }

    if (!recognition.data.recognized) {
      return res.status(404).json({
        success: false,
        error: 'Customer not recognized',
        message: 'Please enroll your face first or try again'
      });
    }

    // Step 2: Verify wallet matches recognized face
    const customerAddress = await aptosService.deriveAddressFromPrivateKey(fromPrivateKey);
    if (customerAddress.toLowerCase() !== recognition.data.walletAddress.toLowerCase()) {
      return res.status(400).json({
        success: false,
        error: 'Face-wallet mismatch',
        message: 'Face recognized does not match the provided wallet'
      });
    }

    console.log(`Customer recognized: ${customerAddress} (${recognition.data.confidence}% confidence)`);

    // Step 3: Process payment
    console.log('Step 3: Processing real payment...');
    const paymentResult = await aptosService.processPayment(
      fromPrivateKey,
      merchantAddress,
      paymentAmount
    );

    console.log('✅ Payment processed successfully!');

    res.json({
      success: true,
      data: {
        customer: {
          address: customerAddress,
          confidence: recognition.data.confidence,
          recognizedAt: recognition.data.recognizedAt
        },
        payment: {
          amount: paymentAmount,
          from: customerAddress,
          to: merchantAddress,
          paymentHash: paymentResult.paymentHash,
          rewardHash: paymentResult.rewardHash,
          rewardAmount: paymentResult.rewardAmount,
          explorerUrl: `https://explorer.aptoslabs.com/txn/${hash}?network=testnet`
        },
        timestamp: new Date().toISOString()
      },
      message: `Payment of ${paymentAmount} APT processed successfully! Customer earned ${paymentResult.rewardAmount} FWSE tokens.`
    });
  } catch (error) {
    console.error('Face payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Payment processing failed',
      message: error.message
    });
  }
});

router.post('/simulate', async (req, res) => {
  try {
    const { fromPrivateKey, merchantAddress, amount } = req.body;
    
    if (!fromPrivateKey || !merchantAddress || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Private key, merchant address, and amount are required'
      });
    }

    const paymentAmount = parseFloat(amount);
    console.log(`🧪 Simulating payment: ${paymentAmount} APT`);

    const customerAddress = await aptosService.deriveAddressFromPrivateKey(fromPrivateKey);
    const paymentResult = await aptosService.processPayment(
      fromPrivateKey,
      merchantAddress,
      paymentAmount
    );

    res.json({
      success: true,
      data: {
        customer: customerAddress,
        payment: {
          amount: paymentAmount,
          from: customerAddress,
          to: merchantAddress,
          paymentHash: paymentResult.paymentHash,
          rewardHash: paymentResult.rewardHash,
          explorerUrl: `https://explorer.aptoslabs.com/txn/${hash}?network=testnet`
        },
        timestamp: new Date().toISOString()
      },
      message: `Simulated payment of ${paymentAmount} APT processed successfully!`
    });
  } catch (error) {
    console.error('Payment simulation error:', error);
    res.status(500).json({
      success: false,
      error: 'Payment simulation failed',
      message: error.message
    });
  }
});

router.get('/history/:address', (req, res) => {
  try {
    const { address } = req.params;
    
    // Mock history for MVP
    const mockHistory = [
      {
        id: 1,
        type: 'payment',
        amount: 0.5,
        from: address,
        to: '0x123...merchant',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        status: 'completed'
      },
      {
        id: 2,
        type: 'reward',
        amount: 0.5,
        token: 'FWSE',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        status: 'completed'
      }
    ];

    res.json({
      success: true,
      data: {
        address,
        history: mockHistory,
        count: mockHistory.length
      },
      message: 'Payment history retrieved'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;