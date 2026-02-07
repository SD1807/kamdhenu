/**
 * Image Compression Utility
 * Compresses images before upload to reduce file size
 */

/**
 * Compress image and convert to base64
 * @param {File} file - Image file to compress
 * @param {number} maxWidth - Max width in pixels (default: 1200)
 * @param {number} maxHeight - Max height in pixels (default: 1200)
 * @param {number} quality - Compression quality 0-1 (default: 0.8)
 * @returns {Promise<string>} - Base64 encoded compressed image
 */
export const compressImage = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    // Validate input
    if (!file || !(file instanceof File)) {
      reject(new Error('Invalid file object'));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64 with compression
        try {
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          
          if (!compressedBase64) {
            reject(new Error('Failed to generate compressed image'));
            return;
          }
          
          resolve(compressedBase64);
        } catch (err) {
          reject(new Error('Canvas compression failed: ' + err.message));
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = event.target.result;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Get file size in MB
 * @param {number} sizeInBytes - Size in bytes
 * @returns {number} - Size in MB
 */
export const getFileSizeInMB = (sizeInBytes) => {
  return sizeInBytes / (1024 * 1024);
};

/**
 * Get compressed image size estimate
 * @param {string} base64String - Base64 encoded image
 * @returns {number} - Size in MB
 */
export const getBase64SizeInMB = (base64String) => {
  // Validate input
  if (!base64String || typeof base64String !== 'string') {
    return 0;
  }

  // Remove data URL prefix
  const parts = base64String.split(',');
  const base64WithoutPrefix = parts.length > 1 ? parts[1] : base64String;
  
  // Ensure we have valid base64
  if (!base64WithoutPrefix) {
    return 0;
  }

  const sizeInBytes = (base64WithoutPrefix.length * 3) / 4;
  return getFileSizeInMB(sizeInBytes);
};
