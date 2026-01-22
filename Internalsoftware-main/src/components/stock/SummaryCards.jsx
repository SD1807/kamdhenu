import React from "react";

/**
 * SummaryCard Component
 * Individual card displaying a stock metric
 */
const SummaryCard = ({ title, value, backgroundColor, borderColor, textColor, subtitle }) => {
  return (
    <div
      style={{
        padding: "20px",
        backgroundColor,
        borderRadius: "8px",
        border: `2px solid ${borderColor}`,
      }}
    >
      <h3 style={{ margin: "0 0 10px 0", color: textColor }}>
        {title}
      </h3>
      <p
        style={{
          margin: 0,
          fontSize: "24px",
          fontWeight: "bold",
          color: textColor,
        }}
      >
        {value}
      </p>
      <p style={{ margin: "5px 0 0 0", fontSize: "12px", color: "#666" }}>
        {subtitle}
      </p>
    </div>
  );
};

/**
 * SummaryCards Component
 * Dashboard summary showing key stock metrics
 */
export const SummaryCards = ({ totalTaken, totalSold, totalDairy, totalRemaining }) => {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: "15px",
        marginBottom: "30px",
      }}
    >
      <SummaryCard
        title="📦 Stock Taken to Demo"
        value={totalTaken.toFixed(2)}
        backgroundColor="#e3f2fd"
        borderColor="#2196F3"
        textColor="#1976d2"
        subtitle="Total units"
      />

      <SummaryCard
        title="💰 Stock Sold"
        value={totalSold.toFixed(2)}
        backgroundColor="#f3e5f5"
        borderColor="#9c27b0"
        textColor="#6a1b9a"
        subtitle="Total units"
      />

      <SummaryCard
        title="🏪 Stock at Dairy"
        value={totalDairy.toFixed(2)}
        backgroundColor="#fff3e0"
        borderColor="#ff9800"
        textColor="#e65100"
        subtitle="Total units"
      />

      <SummaryCard
        title="✅ Stock Remaining"
        value={totalRemaining.toFixed(2)}
        backgroundColor="#e8f5e9"
        borderColor="#4CAF50"
        textColor={totalRemaining >= 0 ? "#2e7d32" : "#d32f2f"}
        subtitle={totalRemaining < 0 ? "⚠️ Oversold!" : "Units left"}
      />
    </div>
  );
};

export default SummaryCards;
