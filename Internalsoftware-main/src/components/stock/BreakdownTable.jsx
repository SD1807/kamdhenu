import React from "react";

/**
 * BreakdownTable Component
 * Detailed stock breakdown by packaging type
 * Shows: Stock Taken, Stock Sold, Stock at Dairy, and Remaining
 */
export const BreakdownTable = ({ packagings, stockData, salesData, dairyData, remaining }) => {
  return (
    <div
      style={{
        padding: "20px",
        backgroundColor: "#fff",
        border: "1px solid #ddd",
        borderRadius: "8px",
      }}
    >
      <h2>📋 Detailed Stock Breakdown by Packaging</h2>

      {packagings.length === 0 ? (
        <p style={{ padding: "20px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
          No stock data available for this village.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "15px",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <th
                  style={{
                    padding: "12px",
                    border: "1px solid #ddd",
                    textAlign: "left",
                    fontWeight: "bold",
                  }}
                >
                  Packaging Type
                </th>
                <th
                  style={{
                    padding: "12px",
                    border: "1px solid #ddd",
                    textAlign: "center",
                    fontWeight: "bold",
                  }}
                >
                  Stock Taken 📦
                </th>
                <th
                  style={{
                    padding: "12px",
                    border: "1px solid #ddd",
                    textAlign: "center",
                    fontWeight: "bold",
                  }}
                >
                  Stock Sold 💰
                </th>
                <th
                  style={{
                    padding: "12px",
                    border: "1px solid #ddd",
                    textAlign: "center",
                    fontWeight: "bold",
                  }}
                >
                  Stock at Dairy 🏪
                </th>
                <th
                  style={{
                    padding: "12px",
                    border: "1px solid #ddd",
                    textAlign: "center",
                    fontWeight: "bold",
                  }}
                >
                  Remaining ✅
                </th>
              </tr>
            </thead>
            <tbody>
              {packagings.map((packaging) => {
                const taken = stockData[packaging] || 0;
                const sold = salesData[packaging] || 0;
                const dairy = dairyData[packaging] || 0;
                const rem = remaining[packaging] || 0;

                return (
                  <tr key={packaging}>
                    <td
                      style={{
                        padding: "12px",
                        border: "1px solid #ddd",
                        fontWeight: "500",
                      }}
                    >
                      {packaging}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        border: "1px solid #ddd",
                        textAlign: "center",
                        backgroundColor: "#e3f2fd",
                      }}
                    >
                      {taken.toFixed(2)}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        border: "1px solid #ddd",
                        textAlign: "center",
                        backgroundColor: "#f3e5f5",
                      }}
                    >
                      {sold.toFixed(2)}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        border: "1px solid #ddd",
                        textAlign: "center",
                        backgroundColor: "#fff3e0",
                      }}
                    >
                      {dairy.toFixed(2)}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        border: "1px solid #ddd",
                        textAlign: "center",
                        fontWeight: "bold",
                        backgroundColor: rem >= 0 ? "#e8f5e9" : "#ffebee",
                        color: rem >= 0 ? "#2e7d32" : "#d32f2f",
                      }}
                    >
                      {rem.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BreakdownTable;
