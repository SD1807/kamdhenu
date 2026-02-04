import React, { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Navbar from "./Navbar";
import "./form.css";

// Import custom hooks
import { useStockData, useDairyStockData, useSalesData, useVillages } from "./hooks/useStockData";

// Import services
import {
  calculateRemaining,
  calculateTotal,
  getAllPackagingTypes,
} from "./services/stockService";

// Import components
import VillageSelector from "./components/stock/VillageSelector";
import SummaryCards from "./components/stock/SummaryCards";
import BreakdownTable from "./components/stock/BreakdownTable";

const StockDashboard = () => {
  const [user, setUser] = useState(null);
  const [selectedVillageId, setSelectedVillageId] = useState("");

  // Custom hooks
  const { villageOptions } = useVillages();
  const { stockData } = useStockData(selectedVillageId);
  const { dairyData } = useDairyStockData(selectedVillageId);
  const { salesData } = useSalesData(selectedVillageId);

  // Fetch current user
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Calculate derived values
  const remaining = calculateRemaining(stockData, salesData, dairyData);
  const allPackagings = getAllPackagingTypes(stockData, salesData, dairyData);

  // Calculate totals
  const totalTaken = calculateTotal(stockData);
  const totalSold = calculateTotal(salesData);
  const totalDairy = calculateTotal(dairyData);
  const totalRemaining = totalTaken - totalSold - totalDairy;

  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: "20px" }}>
        <h1>📊 Stock Dashboard</h1>

        {/* Village Selection */}
        <VillageSelector
          villageOptions={villageOptions}
          selectedVillageId={selectedVillageId}
          onVillageChange={setSelectedVillageId}
        />

        {selectedVillageId && (
          <>
            {/* Summary Cards */}
            <SummaryCards
              totalTaken={totalTaken}
              totalSold={totalSold}
              totalDairy={totalDairy}
              totalRemaining={totalRemaining}
            />

            {/* Detailed Breakdown */}
            <BreakdownTable
              packagings={allPackagings}
              stockData={stockData}
              salesData={salesData}
              dairyData={dairyData}
              remaining={remaining}
            />
          </>
        )}
      </div>
    </>
  );
};

export default StockDashboard;
