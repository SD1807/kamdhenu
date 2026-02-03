/**
 * Packaging configuration with name and price separated
 */

export const PACKAGING_DATA = [
  { id: 1, name: "1LTR JAR", price: 145, litres: 1 },
  { id: 2, name: "2LTR JAR", price: 275, litres: 2 },
  { id: 3, name: "5LTR PLASTIC JAR", price: 665, litres: 5 },
  { id: 4, name: "5LTR STEEL BARNI", price: 890, litres: 5 },
  { id: 5, name: "10 LTR JAR", price: 1340, litres: 10 },
  { id: 6, name: "10 LTR STEEL", price: 1770, litres: 10 },
  { id: 7, name: "20 LTR CARBO", price: 2550, litres: 20 },
  { id: 8, name: "20 LTR CAN", price: 3250, litres: 20 },
  { id: 9, name: "20 LTR STEEL", price: 3520, litres: 20 },
];

/**
 * Get price by packaging name
 * @param {string} packagingName - The name of the packaging
 * @returns {number} The price of the packaging, or 0 if not found
 */
export const getPriceByName = (packagingName) => {
  if (!packagingName) return 0;
  
  const name = packagingName.trim().toLowerCase();
  const packaging = PACKAGING_DATA.find(
    (p) => p.name.toLowerCase() === name
  );
  
  return packaging ? packaging.price : 0;
};

/**
 * Get litres by packaging name
 * @param {string} packagingName - The name of the packaging
 * @returns {number} The litres of the packaging, or 0 if not found
 */
export const getLitresByName = (packagingName) => {
  const packaging = PACKAGING_DATA.find(
    (p) => p.name.toLowerCase() === packagingName?.toLowerCase()
  );
  return packaging ? packaging.litres : 0;
};

/**
 * Get all packaging names as array (for backward compatibility with dropdowns)
 * @returns {array} Array of packaging names
 */
export const getPackagingNames = () => {
  return PACKAGING_DATA.map((p) => p.name);
};

/**
 * Format price with rupee symbol
 * @param {number} price - The price to format
 * @returns {string} Formatted price string
 */
export const formatPrice = (price) => {
  return `₹${price.toLocaleString('en-IN')}`;
};

/**
 * Get packaging object by name
 * @param {string} packagingName - The name of the packaging
 * @returns {object} The packaging object with name and price
 */
export const getPackagingByName = (packagingName) => {
  return PACKAGING_DATA.find(
    (p) => p.name.toLowerCase() === packagingName?.toLowerCase()
  );
};
