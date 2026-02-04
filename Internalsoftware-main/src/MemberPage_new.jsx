import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import {
  addDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  doc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import Navbar from "./Navbar";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getPackagingNames, getPriceByName } from "./config/packagingConfig";

export default function MemberPage() {
  // State for Excel-imported customers
  const [excelCustomers, setExcelCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [villages, setVillages] = useState([]);
  const [selectedVillage, setSelectedVillage] = useState("");
 const [photoCapture, setPhotoCapture] = useState("environment");
  // Always select the first village by default if available
  useEffect(() => {
    if (villages.length > 0 && !selectedVillage) {
      setSelectedVillage(villages[0].id);
    }
  }, [villages, selectedVillage]);

  const [customerInput, setCustomerInput] = useState({
    name: "",
    code: "",
    mobile: "",
    orderPackaging: "",
    orderQty: "",
    remarks: "",
  });

  const [stockData, setStockData] = useState({});
  const [salesData, setSalesData] = useState({});
  const [dairyData, setDairyData] = useState({});
  const [remainingStockList, setRemainingStockList] = useState([]);

const packagingNames = getPackagingNames();

 const handleCustomerPhotoChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCustomerInput((prev) => ({ ...prev, photo: reader.result }));
    };
    reader.readAsDataURL(file);
  };
  // Real-time listener for Excel-imported customers
  useEffect(() => {
    if (!selectedVillage) {
      setExcelCustomers([]);
      setFilteredCustomers([]);
      return;
    }

    const q = query(
      collection(db, "customers"),
      where("villageId", "==", selectedVillage),
      where("isExcelImported", "==", true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const customers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setExcelCustomers(customers);
      setFilteredCustomers(customers);
    });

    return () => unsubscribe();
  }, [selectedVillage]);

  // Fetch stock data for selected village
  useEffect(() => {
    if (!selectedVillage) {
      setStockData({});
      setSalesData({});
      setDairyData({});
      setRemainingStockList([]);
      return;
    }

    const stockRef = doc(db, "stock", selectedVillage);
    const unsubscribeStock = onSnapshot(stockRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        // Handle both data.packaging and direct packaging data
        setStockData(data.packaging || data || {});
      } else {
        setStockData({});
      }
    });

    return () => unsubscribeStock();
  }, [selectedVillage]);

  // Fetch sales data
  useEffect(() => {
    if (!selectedVillage) {
      setSalesData({});
      return;
    }

    const q = query(
      collection(db, "orders"),
      where("villageId", "==", selectedVillage)
    );

    const unsubscribeSales = onSnapshot(q, (snapshot) => {
      const sales = {};
      snapshot.docs.forEach((doc) => {
        const order = doc.data();
        const pkg = order.orderPackaging;
        if (pkg) {
          sales[pkg] = (sales[pkg] || 0) + (order.orderQty || 0);
        }
      });
      setSalesData(sales);
    });

    return () => unsubscribeSales();
  }, [selectedVillage]);

  // Fetch dairy data
  useEffect(() => {
    if (!selectedVillage) {
      setDairyData({});
      return;
    }

    const dairyRef = doc(db, "dairyStock", selectedVillage);
    const unsubscribeDairy = onSnapshot(dairyRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        // Handle both data.packaging and direct packaging data
        setDairyData(data.packaging || data || {});
      } else {
        setDairyData({});
      }
    });

    return () => unsubscribeDairy();
  }, [selectedVillage]);

  // Calculate remaining stock
  useEffect(() => {
    const allPackagings = new Set([
      ...Object.keys(stockData || {}),
      ...Object.keys(salesData || {}),
      ...Object.keys(dairyData || {}),
    ]);

    const remaining = Array.from(allPackagings).map((pkg) => {
      const stock = stockData[pkg] || 0;
      const sold = salesData[pkg] || 0;
      const dairy = dairyData[pkg] || 0;
      const rem = stock - sold - dairy;
      return { packaging: pkg, stock, sold, dairy, returned: 0, remaining: rem };
    });

    setRemainingStockList(remaining);
  }, [stockData, salesData, dairyData]);

  // Handle search
  const handleSearch = (term) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredCustomers(excelCustomers);
      return;
    }

    const results = excelCustomers.filter(customer => 
      customer.name?.toLowerCase().includes(term.toLowerCase()) ||
      customer.code?.toLowerCase().includes(term.toLowerCase()) ||
      customer.mobile?.includes(term)
    );
    setFilteredCustomers(results);
  };


  
  // Handle customer input changes
  const handleCustomerInput = (e) => {
    const { name, value } = e.target;
    setCustomerInput(prev => ({ ...prev, [name]: value }));
  };
  

  // Handle save customer order
  const handleSaveCustomer = async () => {
    if (!selectedCustomer || !customerInput.orderPackaging || !customerInput.orderQty) {
      toast.error("Please fill in all required fields");
      return;
    }

    const auth = getAuth();
    const user = auth.currentUser;
    const addedBy = user?.displayName || user?.email || "Unknown";

    try {
      await addDoc(collection(db, "orders"), {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerCode: selectedCustomer.code,
        customerMobile: selectedCustomer.mobile,
        villageId: selectedVillage,
        orderPackaging: customerInput.orderPackaging,
        orderQty: customerInput.orderQty,
        remarks: customerInput.remarks,
         photo: customerInput.photo || "",
        addedBy,
        createdAt: serverTimestamp(),
        status: "pending"
      });

      // Reset form
      setCustomerInput({
        name: "",
        code: "",
        mobile: "",
        photo: "",
        orderPackaging: "",
        orderQty: "",
        remarks: "",
      });
      setSelectedCustomer(null);
      toast.success("Order added successfully");
    } catch (error) {
      console.error("Error adding order:", error);
      toast.error("Error adding order");
    }
  };

  // 🔹 Real-time listener for villages
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "villages"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setVillages(data);
    });
    return () => unsub();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <Navbar />
      <h1>Member Page</h1>

      {/* Excel Customer Search Section */}
      <div style={{ marginBottom: "2rem", background: "#f0f9ff", padding: "1rem", borderRadius: "8px" }}>
        <h3 style={{ marginTop: 0, color: "#0369a1" }}>Search Excel-Imported Customers</h3>
        
        {/* Village Selection */}
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>Select Village:</label>
          <select
            value={selectedVillage}
            onChange={(e) => setSelectedVillage(e.target.value)}
            style={{ width: "100%", padding: "0.5rem" }}
          >
            <option value="">Select Village</option>
            {villages.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div style={{ marginBottom: "1rem" }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name, code, or mobile number..."
            style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #cbd5e1" }}
          />
        </div>

        {/* Search Results */}
        {filteredCustomers.length > 0 ? (
          <div style={{ marginBottom: "1rem" }}>
            <h4 style={{ margin: "0 0 0.5rem 0" }}>Found {filteredCustomers.length} Customers</h4>
            <div style={{ maxHeight: "300px", overflowY: "auto", background: "white", borderRadius: "4px", border: "1px solid #e5e7eb" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#e0f2fe" }}>
                    <th style={{ padding: "0.5rem", textAlign: "left" }}>Name</th>
                    <th style={{ padding: "0.5rem", textAlign: "left" }}>Code</th>
                    <th style={{ padding: "0.5rem", textAlign: "left" }}>Mobile</th>
                    <th style={{ padding: "0.5rem", textAlign: "left" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr 
                      key={customer.id} 
                      style={{ 
                        borderBottom: "1px solid #e5e7eb",
                        backgroundColor: selectedCustomer?.id === customer.id ? "#f0f9ff" : "transparent"
                      }}
                    >
                      <td style={{ padding: "0.5rem" }}>{customer.name}</td>
                      <td style={{ padding: "0.5rem" }}>{customer.code}</td>
                      <td style={{ padding: "0.5rem" }}>{customer.mobile}</td>
                      <td style={{ padding: "0.5rem" }}>
                        <button
                          onClick={() => setSelectedCustomer(customer)}
                          style={{
                            padding: "0.25rem 0.5rem",
                            backgroundColor: selectedCustomer?.id === customer.id ? "#0284c7" : "#2563eb",
                            color: "white",
                            borderRadius: "4px",
                            border: "none",
                            cursor: "pointer"
                          }}
                        >
                          {selectedCustomer?.id === customer.id ? "Selected" : "Select"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
            {searchTerm ? "No customers found matching your search" : "No Excel-imported customers found in this village"}
          </div>
        )}

        {/* Order Form for Selected Customer */}
        {selectedCustomer && (
          <div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "white", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
            <h4 style={{ margin: "0 0 1rem 0" }}>Add Order for {selectedCustomer.name}</h4>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 200px" }}>
                <label>Package Type</label>
                <select
                  value={customerInput.orderPackaging}
                  onChange={handleCustomerInput}
                  name="orderPackaging"
                  style={{ width: "100%", padding: "0.5rem" }}
                >
                  <option value="">Select Package</option>
                  {packagingNames.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: "1 1 100px" }}>
                <label>Quantity</label>
                <input
                  type="number"
                  name="orderQty"
                  value={customerInput.orderQty}
                  onChange={handleCustomerInput}
                  min="1"
                  style={{ width: "100%", padding: "0.5rem" }}
                />
              </div>

               <div style={{ minWidth: 180 }}>
                  <label>Photo </label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select value={photoCapture} onChange={(e) => setPhotoCapture(e.target.value)} style={{ padding: '6px', borderRadius: 6 }}>
                      <option value="environment">Back Camera (recommended)</option>
                      <option value="user">Front Camera</option>
                    </select>
 <input
  type="file"
  accept="image/*"
  onChange={handleCustomerPhotoChange}
  style={{ border: "1px solid red", padding: 8 }}
/>



                  </div>
                  {customerInput.photo && (
                    <div style={{ marginTop: 6 }}>
                      <img src={customerInput.photo} alt="preview" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }} />
                    </div>
                  )}
                </div>
              <div style={{ flex: "1 1 200px" }}>
                <label>Remarks</label>
                <input
                  type="text"
                  name="remarks"
                  value={customerInput.remarks}
                  onChange={handleCustomerInput}
                  style={{ width: "100%", padding: "0.5rem" }}
                />
              </div>
            </div>
            <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: "bold" }}>
                Total: ₹{(() => {
                  if (!customerInput.orderPackaging) return 0;
                  const price = getPriceByName(customerInput.orderPackaging) || 0;
                  const qty = parseInt(customerInput.orderQty) || 0;
                  return price * qty;
                })()}
              </div>
              <div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#dc2626",
                    color: "white",
                    borderRadius: "4px",
                    border: "none",
                    cursor: "pointer",
                    marginRight: "0.5rem"
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCustomer}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#16a34a",
                    color: "white",
                    borderRadius: "4px",
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  Add Order
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Realtime Stock Dashboard */}
      {selectedVillage && (
        <div style={{ 
          marginTop: "2rem",
          marginBottom: "2rem",
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 2px 12px #2563eb11",
          padding: "clamp(14px, 4vw, 20px)",
        }}>
          <h3 style={{ margin: 0, color: "#174ea6", fontWeight: 700, fontSize: "clamp(1.05rem, 4vw, 1.2rem)", marginBottom: "8px" }}>📊 Realtime Stock Dashboard</h3>
          <p style={{ marginTop: 0, marginBottom: 16, color: "#6b7280", fontSize: "clamp(0.9rem, 3vw, 0.95rem)" }}>Stock inventory by packaging type.</p>
          
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            .stock-cards-container {
              animation: fadeIn 0.3s ease-out;
            }
          `}</style>

          <div className="stock-cards-container" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(clamp(150px, 100%, 220px), 1fr))", gap: "clamp(12px, 3vw, 16px)" }}>
            {remainingStockList.length > 0 ? (
              remainingStockList.map((r, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "#f9fafb",
                    borderRadius: "10px",
                    border: "1px solid #e5e7eb",
                    overflow: "hidden",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.15)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {/* Packaging Name Header */}
                  <div style={{ padding: "clamp(10px, 3vw, 12px)", backgroundColor: "#f0f7ff", borderBottom: "1px solid #e0e7ff" }}>
                    <div style={{ fontSize: "clamp(0.9rem, 3vw, 0.95rem)", fontWeight: 700, color: "#1f2937" }}>
                      {r.packaging}
                    </div>
                    <div style={{ fontSize: "clamp(1rem, 4vw, 1.3rem)", fontWeight: 700, color: r.remaining < 0 ? "#b91c1c" : "#2e7d32", marginTop: "4px" }}>
                      {r.remaining}
                    </div>
                  </div>

                  {/* Data Cells */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    <div style={{ padding: "clamp(8px, 3vw, 10px)", backgroundColor: "#e3f2fd", borderBottom: "1px solid #f0f7ff", textAlign: "center", color: "#1976d2", fontWeight: 600, fontSize: "clamp(0.85rem, 3vw, 0.9rem)" }}>
                      📦 {r.stock}
                    </div>
                    <div style={{ padding: "clamp(8px, 3vw, 10px)", backgroundColor: "#f3e5f5", borderBottom: "1px solid #f0f7ff", textAlign: "center", color: "#6a1b9a", fontWeight: 600, fontSize: "clamp(0.85rem, 3vw, 0.9rem)" }}>
                      💰 {r.sold}
                    </div>
                    <div style={{ padding: "clamp(8px, 3vw, 10px)", backgroundColor: "#fff3e0", borderBottom: "1px solid #f0f7ff", textAlign: "center", color: "#e65100", fontWeight: 600, fontSize: "clamp(0.85rem, 3vw, 0.9rem)" }}>
                      🏪 {r.dairy}
                    </div>
                    <div style={{ padding: "clamp(8px, 3vw, 10px)", backgroundColor: "#fef3c7", textAlign: "center", color: "#d97706", fontWeight: 600, fontSize: "clamp(0.85rem, 3vw, 0.9rem)" }}>
                      🔄 {r.returned}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: "2rem", textAlign: "center", color: "#999", gridColumn: "1/-1" }}>
                No stock data available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
