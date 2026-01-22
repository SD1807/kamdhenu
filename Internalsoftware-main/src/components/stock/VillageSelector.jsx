import React from "react";

/**
 * VillageSelector Component
 * Reusable dropdown to select a village
 */
export const VillageSelector = ({ villageOptions, selectedVillageId, onVillageChange }) => {
  return (
    <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#f5f5f5", borderRadius: "8px" }}>
      <label style={{ fontWeight: "bold", display: "block", marginBottom: "10px" }}>
        Select Village
      </label>
      <select
        value={selectedVillageId}
        onChange={(e) => onVillageChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px",
          fontSize: "16px",
          borderRadius: "4px",
          border: "1px solid #ddd",
        }}
      >
        <option value="">-- Choose Village --</option>
        {villageOptions.map((village) => (
          <option key={village.id} value={village.id}>
            {village.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default VillageSelector;
