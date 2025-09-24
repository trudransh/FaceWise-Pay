const fetch = global.fetch || ((...args) => import('node-fetch').then(({ default: f }) => f(...args)));
const FormData = require('form-data');

const apiToken = process.env.LUXAND_API_TOKEN;
const baseUrl = 'https://api.luxand.cloud';
const enrolledFaces = new Map();

console.log('🎭 Face Service loaded');

async function enrollFace(walletAddress, photoBuffer, photoMimeType = 'image/jpeg') {
  try {
    if (!apiToken) throw new Error('Missing LUXAND_API_TOKEN');
    if (enrolledFaces.has(walletAddress)) {
      return { success: false, error: 'Already enrolled', data: { walletAddress, isEnrolled: true } };
    }

    const formData = new FormData();
    formData.append('name', walletAddress);
    formData.append('store', '1');
    formData.append('photos', photoBuffer, { filename: 'face.jpg', contentType: photoMimeType });

    const response = await fetch(`${baseUrl}/v2/person`, {
      method: 'POST',
      headers: { token: apiToken, ...formData.getHeaders() },
      body: formData
    });
    if (!response.ok) throw new Error(`Luxand error: ${response.status}`);

    const result = await response.json();
    if (!result.uuid) throw new Error('No UUID from Luxand');

    enrolledFaces.set(walletAddress, result.uuid);
    console.log(`Enrolled: ${walletAddress} -> ${result.uuid}`);

    return { success: true, data: { walletAddress, luxandUuid: result.uuid, enrolledAt: new Date().toISOString(), isEnrolled: true } };
  } catch (error) {
    console.error('Enrollment failed:', error);
    return { success: false, error: error.message, data: { walletAddress, isEnrolled: false } };
  }
}

async function recognizeFace(photoBuffer, photoMimeType = 'image/jpeg') {
  try {
    if (!apiToken) throw new Error('Missing LUXAND_API_TOKEN');

    const formData = new FormData();
    formData.append('photo', photoBuffer, { filename: 'recognition.jpg', contentType: photoMimeType });

    const response = await fetch(`${baseUrl}/photo/search/v2`, {
      method: 'POST',
      headers: { token: apiToken, ...formData.getHeaders() },
      body: formData
    });
    if (!response.ok) throw new Error(`Recognition error: ${response.status}`);

    const results = await response.json();
    if (!results || results.length === 0) {
      return { success: true, data: { recognized: false, walletAddress: null, confidence: 0 } };
    }

    const bestMatch = results[0];
    const walletAddress = bestMatch.name;
    const confidence = bestMatch.probability || 0;

    console.log(`Recognized: ${walletAddress} (${confidence}%)`);

    return { success: true, data: { recognized: true, walletAddress, confidence, luxandUuid: bestMatch.uuid, recognizedAt: new Date().toISOString() } };
  } catch (error) {
    console.error('Recognition failed:', error);
    return { success: false, error: error.message, data: { recognized: false, walletAddress: null, confidence: 0 } };
  }
}

function isEnrolled(walletAddress) { return enrolledFaces.has(walletAddress); }
function getEnrolledWallets() { return Array.from(enrolledFaces.keys()); }
function clearEnrollments() { enrolledFaces.clear(); console.log('Enrollments cleared'); }

module.exports = {
  enrollFace,
  recognizeFace,
  isEnrolled,
  getEnrolledWallets,
  clearEnrollments,
  baseUrl
};