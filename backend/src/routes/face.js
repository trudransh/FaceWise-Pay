const express = require('express');
const multer = require('multer');
const faceService = require('../services/faceService');

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

router.post('/enroll', upload.single('photo'), async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Photo file is required'
      });
    }

    console.log(`📸 Enrolling face for wallet: ${walletAddress}`);
    console.log(`📸 Photo: ${req.file.mimetype}, ${req.file.size} bytes`);

    const result = await faceService.enrollFace(
      walletAddress,
      req.file.buffer,
      req.file.mimetype
    );

    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json({
      ...result,
      message: result.success 
        ? 'Face enrolled successfully' 
        : `Enrollment failed: ${result.error}`
    });
  } catch (error) {
    console.error('Face enrollment error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

router.post('/recognize', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Photo file is required'
      });
    }

    console.log(`🔍 Recognizing face...`);
    console.log(`📸 Photo: ${req.file.mimetype}, ${req.file.size} bytes`);

    const result = await faceService.recognizeFace(
      req.file.buffer,
      req.file.mimetype
    );

    res.json({
      ...result,
      message: result.success 
        ? (result.data.recognized ? 'Face recognized successfully' : 'No matching face found')
        : `Recognition failed: ${result.error}`
    });
  } catch (error) {
    console.error('Face recognition error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

router.get('/enrolled', (req, res) => {
  try {
    const enrolled = faceService.getEnrolledWallets();
    
    res.json({
      success: true,
      data: {
        count: enrolled.length,
        wallets: enrolled
      },
      message: `Found ${enrolled.length} enrolled wallets`
    });
  } catch (error) {
    console.error('Get enrolled error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/check-enrollment', (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    const isEnrolled = faceService.isEnrolled(walletAddress);
    
    res.json({
      success: true,
      data: {
        walletAddress,
        isEnrolled
      },
      message: isEnrolled ? 'Wallet is enrolled' : 'Wallet is not enrolled'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.delete('/clear', (req, res) => {
  try {
    faceService.clearEnrollments();
    
    res.json({
      success: true,
      data: { cleared: true },
      message: 'All enrollments cleared'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Multer error handling
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large',
        message: 'Photo file must be less than 10MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files',
        message: 'Only one photo file is allowed'
      });
    }
  }
  
  if (error.message === 'Only image files are allowed') {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type',
      message: 'Only image files (jpg, png, gif, etc.) are allowed'
    });
  }
  
  next(error);
});

module.exports = router;