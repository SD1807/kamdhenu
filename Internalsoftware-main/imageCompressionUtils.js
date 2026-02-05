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
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
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
  // Remove data URL prefix
  const base64WithoutPrefix = base64String.split(',')[1];
  const sizeInBytes = (base64WithoutPrefix.length * 3) / 4;
  return getFileSizeInMB(sizeInBytes);
};
