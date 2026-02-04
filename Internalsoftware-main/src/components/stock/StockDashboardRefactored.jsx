import React, { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Navbar from "../Navbar";
import "../form.css";

// Import custom hooks
import { useStockData, useDairyStockData, useSalesData, useVillages } from "../../hooks/useStockData";

// Import services
import {
  calculateRemaining,
  calculateTotal,
  getAllPackagingTypes,
} from "../../services/stockService";

// Import components
import VillageSelector from "../stock/VillageSelector";
import SummaryCards from "../stock/SummaryCards";
import BreakdownTable from "../stock/BreakdownTable";

const StockDashboard = () => {
  const [user, setUser] = useState(null);
  const [selectedVillageId, setSelectedVillageId] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRealTimeActive, setIsRealTimeActive] = useState(true);

  // Custom hooks
  const { villageOptions, loading: villagesLoading } = useVillages();
  const { stockData, loading: stockLoading } = useStockData(selectedVillageId);
  const { dairyData, loading: dairyLoading } = useDairyStockData(selectedVillageId);
  const { salesData, loading: salesLoading } = useSalesData(selectedVillageId);

  // Fetch current user
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Update timestamp when data changes
  useEffect(() => {
    if (selectedVillageId && (stockData || salesData || dairyData)) {
      setLastUpdated(new Date());
      setIsRealTimeActive(true);
    }
  }, [stockData, salesData, dairyData, selectedVillageId]);

  // Calculate derived values
  const remaining = calculateRemaining(stockData, salesData, dairyData);
  const allPackagings = getAllPackagingTypes(stockData, salesData, dairyData);

  // Calculate totals
  const totalTaken = calculateTotal(stockData);
  const totalSold = calculateTotal(salesData);
  const totalDairy = calculateTotal(dairyData);
  const totalRemaining = totalTaken - totalSold - totalDairy;

  // Check if loading
  const isLoading = stockLoading || salesLoading || dairyLoading;

  // Format last updated time
  const formatLastUpdated = () => {
    if (!lastUpdated) return "Loading...";
    const now = new Date();
    const diffMs = now - lastUpdated;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins === 0) return "Just now";
    if (diffMins === 1) return "1 min ago";
    if (diffMins < 60) return `${diffMins} mins ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return "1 hour ago";
    return `${diffHours} hours ago`;
  };

  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: "20px" }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "15px",
          marginBottom: "20px"
        }}>
          <h1 style={{ margin: 0 }}>📊 Stock Dashboard</h1>
          
          {/* Real-time Status Indicator */}
          {selectedVillageId && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "8px 12px",
              backgroundColor: isRealTimeActive ? "#e8f5e9" : "#fff3e0",
              borderRadius: "20px",
              fontSize: "clamp(12px, 3vw, 13px)",
              border: `1px solid ${isRealTimeActive ? "#4CAF50" : "#ff9800"}`
            }}>
              <span style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: isRealTimeActive ? "#4CAF50" : "#ff9800",
                animation: isRealTimeActive ? "pulse 2s infinite" : "none"
              }}></span>
              <span style={{ color: isRealTimeActive ? "#2e7d32" : "#e65100" }}>
                {isLoading ? "Updating..." : "Live"} • {formatLastUpdated()}
              </span>
            </div>
          )}
        </div>

        {/* Add animation styles */}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .stock-dashboard-content {
            animation: slideDown 0.3s ease-in-out;
          }
        `}</style>

        {/* Village Selection */}
        <VillageSelector
          villageOptions={villageOptions}
          selectedVillageId={selectedVillageId}
          onVillageChange={setSelectedVillageId}
        />

        {selectedVillageId && (
          <div className="stock-dashboard-content">
            {/* Loading Skeleton or Summary Cards */}
            {isLoading ? (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "15px",
                marginBottom: "30px"
              }}>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    style={{
                      padding: "20px",
                      backgroundColor: "#f0f0f0",
                      borderRadius: "8px",
                      minHeight: "120px",
                      animation: "pulse 1.5s infinite"
                    }}
                  />
                ))}
              </div>
            ) : (
              <SummaryCards
                totalTaken={totalTaken}
                totalSold={totalSold}
                totalDairy={totalDairy}
                totalRemaining={totalRemaining}
                isLoading={isLoading}
              />
            )}

            {/* Detailed Breakdown */}
            {!isLoading && (
              <BreakdownTable
                packagings={allPackagings}
                stockData={stockData}
                salesData={salesData}
                dairyData={dairyData}
                remaining={remaining}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default StockDashboard;
