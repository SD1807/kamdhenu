import React from "react";

/**
 * BreakdownTable Component
 * Detailed stock breakdown by packaging type
 * Shows: Stock Taken, Stock Sold, Stock at Dairy, and Remaining
 * Responsive design for mobile and desktop
 */
export const BreakdownTable = ({ packagings, stockData, salesData, dairyData, remaining }) => {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  if (packagings.length === 0) {
    return (
      <div
        style={{
          padding: "clamp(20px, 5vw, 30px)",
          backgroundColor: "#fff",
          border: "2px solid #ddd",
          borderRadius: "12px",
          textAlign: "center",
        }}
      >
        <p style={{ color: "#666", fontSize: "clamp(14px, 3.5vw, 16px)", margin: 0 }}>
          📭 No stock data available for this village.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "clamp(20px, 5vw, 30px)",
        backgroundColor: "#fff",
        border: "2px solid #e0e7ff",
        borderRadius: "12px",
      }}
    >
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .breakdown-table-row {
          animation: slideIn 0.3s ease-out;
        }
        @media (max-width: 768px) {
          .breakdown-table-wrapper {
            display: block;
          }
          .breakdown-table-row-mobile {
            display: flex;
            flex-direction: column;
            border: 1px solid #e0e7ff;
            border-radius: 8px;
            padding: 0;
            margin-bottom: 12px;
            background: #f9fafb;
            overflow: hidden;
          }
          .breakdown-table-row-mobile:hover {
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
          }
          .breakdown-data-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            border-bottom: 1px solid #e0e7ff;
          }
          .breakdown-data-item:last-child {
            border-bottom: none;
          }
          .breakdown-data-label {
            font-weight: 600;
            color: #666;
            font-size: 12px;
            min-width: 100px;
          }
          .breakdown-data-value {
            font-weight: 600;
            font-size: 14px;
          }
        }
      `}</style>

      <h2 style={{ margin: "0 0 20px 0", fontSize: "clamp(18px, 4.5vw, 22px)" }}>
        📋 Stock Breakdown by Packaging
      </h2>

      {/* Desktop Table */}
      <div style={{ overflowX: "auto", display: "none" }} className="desktop-table">
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: "0",
            marginTop: "15px",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f0f7ff" }}>
              <th
                style={{
                  padding: "clamp(12px, 2.5vw, 16px)",
                  textAlign: "left",
                  fontWeight: "700",
                  color: "#1f2937",
                  fontSize: "clamp(13px, 3vw, 14px)",
                  borderBottom: "3px solid #2563eb",
                }}
              >
                Packaging Type
              </th>
              <th
                style={{
                  padding: "clamp(12px, 2.5vw, 16px)",
                  textAlign: "center",
                  fontWeight: "700",
                  color: "#1976d2",
                  fontSize: "clamp(13px, 3vw, 14px)",
                  borderBottom: "3px solid #2196F3",
                }}
              >
                📦 Taken
              </th>
              <th
                style={{
                  padding: "clamp(12px, 2.5vw, 16px)",
                  textAlign: "center",
                  fontWeight: "700",
                  color: "#6a1b9a",
                  fontSize: "clamp(13px, 3vw, 14px)",
                  borderBottom: "3px solid #9c27b0",
                }}
              >
                💰 Sold
              </th>
              <th
                style={{
                  padding: "clamp(12px, 2.5vw, 16px)",
                  textAlign: "center",
                  fontWeight: "700",
                  color: "#e65100",
                  fontSize: "clamp(13px, 3vw, 14px)",
                  borderBottom: "3px solid #ff9800",
                }}
              >
                🏪 Dairy
              </th>
              <th
                style={{
                  padding: "clamp(12px, 2.5vw, 16px)",
                  textAlign: "center",
                  fontWeight: "700",
                  color: "#2e7d32",
                  fontSize: "clamp(13px, 3vw, 14px)",
                  borderBottom: "3px solid #4CAF50",
                }}
              >
                ✅ Remaining
              </th>
            </tr>
          </thead>
          <tbody>
            {packagings.map((packaging, idx) => {
              const taken = stockData[packaging] || 0;
              const sold = salesData[packaging] || 0;
              const dairy = dairyData[packaging] || 0;
              const rem = remaining[packaging] || 0;

              return (
                <tr
                  key={packaging}
                  style={{
                    backgroundColor: idx % 2 === 0 ? "#fff" : "#f9fafb",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f0f7ff";
                    e.currentTarget.style.boxShadow =
                      "0 2px 8px rgba(37, 99, 235, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      idx % 2 === 0 ? "#fff" : "#f9fafb";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <td
                    style={{
                      padding: "clamp(12px, 2.5vw, 14px)",
                      borderBottom: "1px solid #e0e7ff",
                      fontWeight: "500",
                      fontSize: "clamp(13px, 3vw, 14px)",
                      color: "#1f2937",
                    }}
                  >
                    {packaging}
                  </td>
                  <td
                    style={{
                      padding: "clamp(12px, 2.5vw, 14px)",
                      borderBottom: "1px solid #e0e7ff",
                      textAlign: "center",
                      backgroundColor: "#e3f2fd",
                      fontWeight: "600",
                      fontSize: "clamp(13px, 3vw, 14px)",
                      color: "#1976d2",
                    }}
                  >
                    {taken.toFixed(2)}
                  </td>
                  <td
                    style={{
                      padding: "clamp(12px, 2.5vw, 14px)",
                      borderBottom: "1px solid #e0e7ff",
                      textAlign: "center",
                      backgroundColor: "#f3e5f5",
                      fontWeight: "600",
                      fontSize: "clamp(13px, 3vw, 14px)",
                      color: "#6a1b9a",
                    }}
                  >
                    {sold.toFixed(2)}
                  </td>
                  <td
                    style={{
                      padding: "clamp(12px, 2.5vw, 14px)",
                      borderBottom: "1px solid #e0e7ff",
                      textAlign: "center",
                      backgroundColor: "#fff3e0",
                      fontWeight: "600",
                      fontSize: "clamp(13px, 3vw, 14px)",
                      color: "#e65100",
                    }}
                  >
                    {dairy.toFixed(2)}
                  </td>
                  <td
                    style={{
                      padding: "clamp(12px, 2.5vw, 14px)",
                      borderBottom: "1px solid #e0e7ff",
                      textAlign: "center",
                      fontWeight: "700",
                      backgroundColor: rem >= 0 ? "#e8f5e9" : "#ffebee",
                      color: rem >= 0 ? "#2e7d32" : "#d32f2f",
                      fontSize: "clamp(13px, 3vw, 14px)",
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

      {/* Mobile Card View */}
      <div className="breakdown-table-wrapper">
        {packagings.map((packaging, idx) => {
          const taken = stockData[packaging] || 0;
          const sold = salesData[packaging] || 0;
          const dairy = dairyData[packaging] || 0;
          const rem = remaining[packaging] || 0;

          return (
            <div
              key={packaging}
              className="breakdown-table-row-mobile breakdown-table-row"
              style={{ "--animation-delay": `${idx * 50}ms` }}
            >
              <div
                style={{
                  padding: "clamp(14px, 4vw, 16px)",
                  backgroundColor: "#f0f7ff",
                  borderBottom: "1px solid #e0e7ff",
                }}
              >
                <h3
                  style={{
                    margin: "0",
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontWeight: "700",
                    color: "#1f2937",
                  }}
                >
                  {packaging}
                </h3>
              </div>

              <div className="breakdown-data-item">
                <span className="breakdown-data-label">📦 Stock Taken</span>
                <span
                  className="breakdown-data-value"
                  style={{ color: "#1976d2" }}
                >
                  {taken.toFixed(2)}
                </span>
              </div>

              <div className="breakdown-data-item">
                <span className="breakdown-data-label">💰 Stock Sold</span>
                <span
                  className="breakdown-data-value"
                  style={{ color: "#6a1b9a" }}
                >
                  {sold.toFixed(2)}
                </span>
              </div>

              <div className="breakdown-data-item">
                <span className="breakdown-data-label">🏪 At Dairy</span>
                <span
                  className="breakdown-data-value"
                  style={{ color: "#e65100" }}
                >
                  {dairy.toFixed(2)}
                </span>
              </div>

              <div
                className="breakdown-data-item"
                style={{
                  backgroundColor: rem >= 0 ? "#e8f5e9" : "#ffebee",
                  borderBottom: "none",
                }}
              >
                <span className="breakdown-data-label">✅ Remaining</span>
                <span
                  className="breakdown-data-value"
                  style={{
                    color: rem >= 0 ? "#2e7d32" : "#d32f2f",
                  }}
                >
                  {rem.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show desktop table on larger screens */}
      <style>{`
        @media (min-width: 768px) {
          .desktop-table {
            display: block !important;
          }
          .breakdown-table-wrapper {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default BreakdownTable;
