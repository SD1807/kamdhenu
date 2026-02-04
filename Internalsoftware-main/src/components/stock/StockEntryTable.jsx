import React from "react";

/**
 * StockEntryTable Component
 * Displays all stock entries in a table format with delete functionality
 */
export const StockEntryTable = ({ entries, onDelete, onExport }) => {
  return (
    <div style={{ marginBottom: "30px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
        <h2>Stock Entries ({entries.length})</h2>
        {entries.length > 0 && (
          <button
            onClick={onExport}
            style={{
              padding: "8px 16px",
              backgroundColor: "#2196F3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            📊 Export to Excel
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <p style={{ padding: "20px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
          No stock entries for this village yet.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Date</th>
                <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Packaging</th>
                <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Quantity</th>
                <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Location</th>
                <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Notes</th>
                <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                    {entry.date}
                  </td>
                  <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                    {entry.packaging}
                  </td>
                  <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                    {entry.quantity}
                  </td>
                  <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        backgroundColor:
                          entry.location === "demo" ? "#e3f2fd" : "#fff3e0",
                        color:
                          entry.location === "demo" ? "#1976d2" : "#e65100",
                        fontWeight: "bold",
                      }}
                    >
                      {entry.location === "demo" ? "🚐 Demo" : "🏪 Dairy"}
                    </span>
                  </td>
                  <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                    {entry.notes}
                  </td>
                  <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                    <button
                      onClick={() => onDelete(entry.id)}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#f44336",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StockEntryTable;
