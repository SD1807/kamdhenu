import React from "react";

/**
 * SummaryCard Component
 * Individual card displaying a stock metric with animation
 */
const SummaryCard = ({ title, value, backgroundColor, borderColor, textColor, subtitle }) => {
  return (
    <div
      style={{
        padding: "clamp(16px, 4vw, 20px)",
        backgroundColor,
        borderRadius: "12px",
        border: `3px solid ${borderColor}`,
        transition: "all 0.3s ease",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        minHeight: "140px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = `0 8px 16px ${borderColor}40`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Animated background accent */}
      <div
        style={{
          position: "absolute",
          top: "-50%",
          right: "-10%",
          width: "120%",
          height: "120%",
          backgroundColor: borderColor,
          opacity: "0.05",
          borderRadius: "50%",
          animation: "float 6s ease-in-out infinite",
        }}
      />
      
      <div style={{ position: "relative", zIndex: 1 }}>
        <h3 style={{ 
          margin: "0 0 10px 0", 
          color: textColor,
          fontSize: "clamp(14px, 3.5vw, 16px)",
          fontWeight: "600",
        }}>
          {title}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: "clamp(24px, 6vw, 32px)",
            fontWeight: "bold",
            color: textColor,
            lineHeight: "1.2",
          }}
        >
          {value}
        </p>
      </div>
      
      <p style={{ 
        margin: "8px 0 0 0", 
        fontSize: "clamp(11px, 2.5vw, 12px)", 
        color: "#666",
        position: "relative",
        zIndex: 1,
      }}>
        {subtitle}
      </p>
    </div>
  );
};

/**
 * SummaryCards Component
 * Dashboard summary showing key stock metrics with animations
 */
export const SummaryCards = ({ totalTaken, totalSold, totalDairy, totalRemaining, isLoading }) => {
  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(10px, -10px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .summary-card-container > div {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
      
      <div
        className="summary-card-container"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(clamp(200px, 100%, 280px), 1fr))",
          gap: "clamp(12px, 3vw, 20px)",
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
    </>
  );
};

export default SummaryCards;
