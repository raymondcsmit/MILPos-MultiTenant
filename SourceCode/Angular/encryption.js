const { Dpapi } = require('@primno/dpapi');

/**
 * Encrypts data using Windows DPAPI (machine-specific)
 * @param {string} data - Plain text data to encrypt
 * @returns {string} - Base64 encoded encrypted data
 */
function encryptData(data) {
  if (!data) return null;
  try {
    // Convert string to buffer
    const dataBuffer = Buffer.from(data, 'utf8');
    
    // Encrypt using DPAPI (CurrentUser scope is default/most secure for apps)
    const encryptedBuffer = Dpapi.protectData(
      dataBuffer,
      null,  // Optional entropy
      'CurrentUser'
    );
    
    // Return as base64 string
    return encryptedBuffer.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts data using Windows DPAPI
 * @param {string} encryptedData - Base64 encoded encrypted data
 * @returns {string} - Decrypted plain text
 */
function decryptData(encryptedData) {
  if (!encryptedData) return null;
  try {
    // Convert base64 to buffer
    const encryptedBuffer = Buffer.from(encryptedData, 'base64');
    
    // Decrypt using DPAPI
    const decryptedBuffer = Dpapi.unprotectData(
      encryptedBuffer,
      null,  // Optional entropy
      'CurrentUser'
    );
    
    // Return as string
    return decryptedBuffer.toString('utf8');
  } catch (error) {
    console.error('Decryption error:', error);
    // This often happens if the file was moved to a different machine
    throw new Error('Failed to decrypt data - key mismatch or machine mismatch');
  }
}

/**
 * Checks if a string appears to be encrypted (is valid base64 and long enough)
 * @param {string} data 
 * @returns {boolean}
 */
function isEncrypted(data) {
  if (!data || typeof data !== 'string') return false;
  // Simple check: DPAPI encrypted data is usually quite long and base64
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  return data.length > 50 && base64Regex.test(data);
}

module.exports = {
  encryptData,
  decryptData,
  isEncrypted
};
