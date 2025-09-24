const express = require('express');
const multer = require('multer');
const Joi = require('joi');
const faceService = require('../services/faceService');
const aptosService = require('../services/aptosService');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Only image files are allowed'), false),
});

router.post('/face-pay', upload.single('photo'), async (req, res) => {
  try {
    const schema = Joi.object({
      merchantAddress: Joi.string().required(),
      amount: Joi.number().positive().required(),
      fromPrivateKey: Joi.string().required(), // Sui-style (custodial) flow
    });

    const { error, value } = schema.validate({ ...req.body, fromPrivateKey: req.body.fromPrivateKey });
    if (error) {
      return res.status(400).json({ success: false, error: 'Validation error', message: error.details[0].message });
    }
    if (!req.file) return res.status(400).json({ success: false, error: 'Photo required for face recognition' });

    const { merchantAddress, amount, fromPrivateKey } = value;

    const recognition = await faceService.recognizeFace(req.file.buffer, req.file.mimetype);
    if (!recognition.success) {
      return res.status(500).json({ success: false, error: 'Face recognition failed', message: recognition.error });
    }
    if (!recognition.data.recognized) {
      return res.status(404).json({ success: false, error: 'Customer not recognized', message: 'Please enroll your face first' });
    }

    const customerDerived = await aptosService.deriveAddressFromPrivateKey(fromPrivateKey);
    if (customerDerived.toLowerCase() !== recognition.data.walletAddress.toLowerCase()) {
      return res.status(400).json({ success: false, error: 'Face-wallet mismatch', message: 'Face recognized does not match the provided private key' });
    }

    const result = await aptosService.processPayment(fromPrivateKey, merchantAddress, Number(amount));

    return res.json({
      success: true,
      data: {
        customer: { address: customerDerived, confidence: recognition.data.confidence, recognizedAt: recognition.data.recognizedAt },
        payment: {
          amount: Number(amount),
          from: customerDerived,
          to: merchantAddress,
          paymentHash: result.paymentHash,
          rewardHash: result.rewardHash,
          rewardAmount: result.rewardAmount,
          explorerUrl: `https://explorer.aptoslabs.com/txn/${result.paymentHash}?network=${process.env.APTOS_NETWORK || 'devnet'}`,
        },
        timestamp: new Date().toISOString(),
      },
      message: `Payment processed. Rewards minted.`,
    });
  } catch (error) {
    console.error('Face payment error:', error);
    return res.status(500).json({ success: false, error: 'Payment processing failed', message: error.message });
  }
});

router.post('/simulate', async (req, res) => {
  try {
    const schema = Joi.object({
      fromPrivateKey: Joi.string().required(),
      merchantAddress: Joi.string().required(),
      amount: Joi.number().positive().required(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ success: false, error: 'Validation error', message: error.details[0].message });

    const customer = await aptosService.deriveAddressFromPrivateKey(value.fromPrivateKey);
    const result = await aptosService.processPayment(value.fromPrivateKey, value.merchantAddress, Number(value.amount));

    return res.json({
      success: true,
      data: {
        customer,
        paymentHash: result.paymentHash,
        rewardHash: result.rewardHash,
        explorerUrl: `https://explorer.aptoslabs.com/txn/${result.paymentHash}?network=${process.env.APTOS_NETWORK || 'devnet'}`,
      },
      message: 'Simulated payment executed on-chain',
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/tx/:hash', async (req, res) => {
  try {
    const tx = await aptosService.getTransaction(req.params.hash);
    return res.json({ success: true, data: tx });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

// Multer error adapter
router.use((error, req, res, next) => {
  if (error && error.message === 'Only image files are allowed') {
    return res.status(400).json({ success: false, error: 'Invalid file type', message: 'Only image files are allowed' });
  }
  return next(error);
});

module.exports = router;