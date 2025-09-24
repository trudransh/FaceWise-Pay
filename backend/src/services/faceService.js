const fetch = global.fetch || ((...args) => import('node-fetch').then(({ default: f }) => f(...args)));
const FormData = require('form-data');

// In-memory storage for MVP (replace with database in production)
const enrolledFaces = new Map();

const apiToken = process.env.LUXAND_API_TOKEN || "20913b25e33641a9815c95a1f78948cf";
const baseUrl = "https://api.luxand.cloud";

async function enrollFace(walletAddress, photoBuffer, photoMimeType) {
  try {
    console.log(`🎭 Enrolling face for wallet: ${walletAddress}`);
    
    // Check if already enrolled
    if (enrolledFaces.has(walletAddress)) {
      return {
        success: false,
        error: 'Wallet already enrolled',
        data: { walletAddress, isEnrolled: true }
      };
    }

    const formData = new FormData();
    formData.append('name', walletAddress);
    formData.append('store', '1');
    formData.append('collections', '');
    formData.append('unique', '0');
    formData.append('photos', photoBuffer, {
      filename: 'enrollment.jpg',
      contentType: photoMimeType || 'image/jpeg'
    });

    const response = await fetch(`${baseUrl}/v2/person`, {
      method: 'POST',
      headers: {
        'token': apiToken,
        ...formData.getHeaders()
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Luxand enrollment failed: ${response.status} ${errorData.message || response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.uuid) {
      throw new Error('Luxand API did not return UUID');
    }

    // Store in memory
    enrolledFaces.set(walletAddress, {
      luxandUuid: result.uuid,
      walletAddress,
      enrolledAt: new Date().toISOString()
    });

    console.log(`✅ Face enrolled successfully: ${result.uuid}`);
    
    return {
      success: true,
      data: {
        luxandUuid: result.uuid,
        walletAddress,
        enrolledAt: new Date().toISOString(),
        isEnrolled: true
      }
    };
  } catch (error) {
    console.error('❌ Face enrollment failed:', error);
    return {
      success: false,
      error: error.message,
      data: { walletAddress, isEnrolled: false }
    };
  }
}

async function recognizeFace(photoBuffer, photoMimeType) {
  try {
    console.log('🔍 Starting face recognition...');

    const formData = new FormData();
    formData.append('photo', photoBuffer, {
      filename: 'recognition.jpg',
      contentType: photoMimeType || 'image/jpeg'
    });
    formData.append('collections', '');

    const response = await fetch(`${baseUrl}/photo/search/v2`, {
      method: 'POST',
      headers: {
        'token': apiToken,
        ...formData.getHeaders()
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Luxand recognition failed: ${response.status} ${errorData.message || response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Face recognition completed');

    const recognized = result.length > 0;
    let walletAddress = null;
    
    if (recognized && result[0].name) {
      walletAddress = result[0].name; // Wallet address is stored as name
    }

    return {
      success: true,
      data: {
        recognized,
        confidence: result[0]?.probability || 0,
        luxandUuid: result[0]?.uuid || null,
        walletAddress,
        recognizedAt: new Date().toISOString(),
        rawResult: result
      }
    };
  } catch (error) {
    console.error('❌ Face recognition failed:', error);
    return {
      success: false,
      error: error.message,
      data: {
        recognized: false,
        recognizedAt: new Date().toISOString()
      }
    };
  }
}

function getEnrolledWallets() {
  return Array.from(enrolledFaces.keys());
}

function isEnrolled(walletAddress) {
  return enrolledFaces.has(walletAddress);
}

function clearEnrollments() {
  enrolledFaces.clear();
  console.log('🗑️ All face enrollments cleared');
}

module.exports = {
  enrollFace,
  recognizeFace,
  getEnrolledWallets,
  isEnrolled,
  clearEnrollments
};