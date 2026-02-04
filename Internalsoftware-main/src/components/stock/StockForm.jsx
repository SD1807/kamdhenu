import React from "react";
import { PACKAGING_OPTIONS } from "../../services/stockService";

/**
 * StockForm Component
 * Form for adding new stock entries
 */
export const StockForm = ({
  formData,
  dairyStockMode,
  loading,
  onInputChange,
  onModeToggle,
  onSubmit,
}) => {
  return (
    <div
      style={{
        marginBottom: "30px",
        padding: "20px",
        backgroundColor: "#fff",
        border: "1px solid #ddd",
        borderRadius: "8px",
      }}
    >
      <h2>Add New Stock Entry</h2>

      {/* Mode Toggle */}
      <div style={{ marginBottom: "15px", display: "flex", gap: "20px" }}>
        <label>
          <input
            type="radio"
            checked={!dairyStockMode}
            onChange={() => onModeToggle(false)}
          />
          <span style={{ marginLeft: "5px" }}>Stock Taken to Demo</span>
        </label>
        <label>
          <input
            type="radio"
            checked={dairyStockMode}
            onChange={() => onModeToggle(true)}
          />
          <span style={{ marginLeft: "5px" }}>Stock at Dairy</span>
        </label>
      </div>

      <form onSubmit={onSubmit}>
        <div style={{ marginBottom: "15px" }}>
          <label>Packaging Type</label>
          <select
            name="packaging"
            value={formData.packaging}
            onChange={onInputChange}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ddd",
            }}
          >
            <option value="">-- Select --</option>
            {PACKAGING_OPTIONS.map((pkg) => (
              <option key={pkg} value={pkg}>
                {pkg}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label>Quantity</label>
          <input
            type="number"
            name="quantity"
            value={formData.quantity}
            onChange={onInputChange}
            placeholder="Enter quantity"
            step="0.01"
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ddd",
            }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label>Date</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={onInputChange}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ddd",
            }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label>Notes (Optional)</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={onInputChange}
            placeholder="Add any notes..."
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ddd",
              minHeight: "80px",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 20px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Adding..." : "Add Stock"}
        </button>
      </form>
    </div>
  );
};

export default StockForm;
