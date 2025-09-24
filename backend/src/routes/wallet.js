const express = require('express');
const aptosService = require('../services/aptosService');

const router = express.Router();

router.post('/create', async (req, res) => {
  try {
    console.log('🔑 Creating new wallet...');
    const wallet = await aptosService.createWallet();
    
    res.json({
      success: true,
      data: wallet,
      message: 'Wallet created successfully'
    });
  } catch (error) {
    console.error('Create wallet error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create wallet',
      message: error.message
    });
  }
});

router.post('/balance', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    console.log(`💰 Checking balance for: ${address}`);
    const balance = await aptosService.getBalance(address);
    
    res.json({
      success: true,
      data: { address, ...balance },
      message: 'Balance retrieved successfully'
    });
  } catch (error) {
    console.error('Balance check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get balance',
      message: error.message
    });
  }
});

router.post('/mint', async (req, res) => {
  try {
    const { address, amount } = req.body;
    
    if (!address || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Address and amount are required'
      });
    }

    console.log(`🪙 Minting ${amount} FWSE tokens to ${address}`);
    const result = await aptosService.mintTokens(address, parseFloat(amount));
    
    res.json({
      success: true,
      data: {
        ...result,
        explorerUrl: `https://explorer.aptoslabs.com/txn/${hash}?network=testnet`
      },
      message: `${amount} FWSE tokens minted successfully`
    });
  } catch (error) {
    console.error('Token minting failed:', error);
    res.status(500).json({
      success: false,
      error: 'Token minting failed',
      message: error.message
    });
  }
});

router.post('/faucet', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    console.log(`🚰 Requesting test tokens for: ${address}`);
    const result = await aptosService.requestTestTokens(address);
    
    res.json({
      success: true,
      data: result,
      message: 'Test tokens requested successfully'
    });
  } catch (error) {
    console.error('Faucet request failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to request test tokens',
      message: error.message
    });
  }
});

router.get('/status', (req, res) => {
  try {
    const status = aptosService.getStatus();
    res.json({
      success: true,
      data: status,
      message: 'Service status retrieved'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get service status',
      message: error.message
    });
  }
});

module.exports = router;