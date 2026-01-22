import React, { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Navbar from "./Navbar";
import { toast } from "react-toastify";
import ExcelJS from "exceljs";
import "./form.css";

// Import custom hooks
import { useAllStockEntries, useVillages } from "./hooks/useStockData";

// Import services
import {
  addStockEntry,
  deleteStockEntry,
  validateStockEntry,
  getInitialStockEntry,
} from "./services/stockService";

// Import components
import VillageSelector from "./components/stock/VillageSelector";
import StockForm from "./components/stock/StockForm";
import StockEntryTable from "./components/stock/StockEntryTable";

const StockManagement = () => {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState(getInitialStockEntry());
  const [loading, setLoading] = useState(false);
  const [selectedVillageId, setSelectedVillageId] = useState("");
  const [dairyStockMode, setDairyStockMode] = useState(false);

  // Custom hooks
  const { villageOptions } = useVillages();
  const { stockEntries } = useAllStockEntries(selectedVillageId);

  // Fetch current user
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddStock = async (e) => {
    e.preventDefault();

    // Validate form
    const error = validateStockEntry(formData, selectedVillageId);
    if (error) {
      toast.error(error);
      return;
    }

    try {
      setLoading(true);

      const selectedVillageName =
        villageOptions.find((v) => v.id === selectedVillageId)?.name || "";

      await addStockEntry({
        villageId: selectedVillageId,
        villageName: selectedVillageName,
        packaging: formData.packaging,
        quantity: parseFloat(formData.quantity),
        location: dairyStockMode ? "dairy" : "demo",
        date: formData.date,
        notes: formData.notes,
        entryBy: user?.email || "unknown",
      });

      setFormData(getInitialStockEntry());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStock = async (id) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) {
      return;
    }

    try {
      await deleteStockEntry(id);
    } catch (error) {
      console.error(error);
    }
  };

  const handleExportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Stock Data");

      worksheet.columns = [
        { header: "Date", key: "date", width: 12 },
        { header: "Village", key: "villageName", width: 15 },
        { header: "Packaging", key: "packaging", width: 18 },
        { header: "Quantity", key: "quantity", width: 10 },
        { header: "Location", key: "location", width: 10 },
        { header: "Notes", key: "notes", width: 20 },
        { header: "Entry By", key: "entryBy", width: 15 },
      ];

      stockEntries.forEach((entry) => {
        worksheet.addRow(entry);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stock_${selectedVillageId}_${Date.now()}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success("Exported to Excel");
    } catch (error) {
      console.error(error);
      toast.error("Export failed");
    }
  };

  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: "20px" }}>
        <h1>📦 Stock Management</h1>

        {/* Village Selection */}
        <VillageSelector
          villageOptions={villageOptions}
          selectedVillageId={selectedVillageId}
          onVillageChange={setSelectedVillageId}
        />

        {selectedVillageId && (
          <>
            {/* Add Stock Form */}
            <StockForm
              formData={formData}
              dairyStockMode={dairyStockMode}
              loading={loading}
              onInputChange={handleInputChange}
              onModeToggle={setDairyStockMode}
              onSubmit={handleAddStock}
            />

            {/* Stock Entries List */}
            <StockEntryTable
              entries={stockEntries}
              onDelete={handleDeleteStock}
              onExport={handleExportToExcel}
            />
          </>
        )}
      </div>
    </>
  );
};

export default StockManagement;
