import { addDoc, deleteDoc, doc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-toastify";

/**
 * Stock Service - Centralized business logic for stock management
 */

/**
 * Add a new stock entry to Firebase
 * @param {Object} stockData - Stock entry data
 * @returns {Promise}
 */
export const addStockEntry = async (stockData) => {
  try {
    await addDoc(collection(db, "stock"), {
      ...stockData,
      createdAt: serverTimestamp(),
    });
    toast.success("Stock entry added successfully");
    return true;
  } catch (error) {
    console.error("Error adding stock entry:", error);
    toast.error("Failed to add stock: " + error.message);
    throw error;
  }
};

/**
 * Delete a stock entry from Firebase
 * @param {string} id - Document ID to delete
 * @returns {Promise}
 */
export const deleteStockEntry = async (id) => {
  try {
    await deleteDoc(doc(db, "stock", id));
    toast.success("Stock entry deleted");
    return true;
  } catch (error) {
    console.error("Error deleting stock entry:", error);
    toast.error("Failed to delete stock");
    throw error;
  }
};

/**
 * Calculate remaining stock for all packaging types
 * Formula: Stock Remaining = Stock Taken to Demo - Stock Sold - Stock at Dairy
 * @param {Object} stockData - Stock taken to demo
 * @param {Object} salesData - Stock sold
 * @param {Object} dairyData - Stock at dairy
 * @returns {Object} Remaining stock by packaging
 */
export const calculateRemaining = (stockData, salesData, dairyData) => {
  const remaining = {};
  const allPackagings = new Set([
    ...Object.keys(stockData),
    ...Object.keys(salesData),
    ...Object.keys(dairyData),
  ]);

  allPackagings.forEach((packaging) => {
    const taken = stockData[packaging] || 0;
    const sold = salesData[packaging] || 0;
    const dairy = dairyData[packaging] || 0;
    remaining[packaging] = taken - sold - dairy;
  });

  return remaining;
};

/**
 * Calculate total across all packaging types
 * @param {Object} data - Object with packaging as keys and quantities as values
 * @returns {number} Total quantity
 */
export const calculateTotal = (data) => {
  return Object.values(data).reduce((a, b) => a + b, 0);
};

/**
 * Get sorted list of all unique packaging types
 * @param {Object} stockData - Stock taken to demo
 * @param {Object} salesData - Stock sold
 * @param {Object} dairyData - Stock at dairy
 * @returns {Array} Sorted array of packaging types
 */
export const getAllPackagingTypes = (stockData, salesData, dairyData) => {
  const allPackagings = new Set([
    ...Object.keys(stockData),
    ...Object.keys(salesData),
    ...Object.keys(dairyData),
  ]);
  return Array.from(allPackagings).sort();
};

/**
 * Validate stock entry data
 * @param {Object} formData - Form data to validate
 * @param {string} villageId - Selected village ID
 * @returns {string} Error message if validation fails, empty string if valid
 */
export const validateStockEntry = (formData, villageId) => {
  if (!villageId) {
    return "Please select a village";
  }

  if (!formData.packaging) {
    return "Please select packaging";
  }

  const qty = parseFloat(formData.quantity);
  if (!qty || qty <= 0) {
    return "Please enter valid quantity";
  }

  return "";
};

/**
 * Packaging options for the dropdown
 */
export const PACKAGING_OPTIONS = [
  "1LTR JAR",
  "2LTR JAR",
  "5LTR PLASTIC JAR",
  "5LTR STEEL બરણી",
  "10 LTR JAR",
  "10 LTR STEEL બરણી",
  "20 LTR CARBO",
  "20 LTR CANL",
  "20 LTR STEEL બરણી",
];

/**
 * Initial stock entry form state
 */
export const getInitialStockEntry = () => ({
  packaging: "",
  quantity: "",
  location: "demo",
  date: new Date().toISOString().split("T")[0],
  notes: "",
});
