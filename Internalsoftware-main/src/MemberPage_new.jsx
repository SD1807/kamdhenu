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

const packagingOptions = [
  "1LTR JAR: ₹145",
  "2LTR JAR: ₹275",
  "5LTR PLASTIC JAR: ₹665",
  "5LTR STEEL બરણી: ₹890",
  "10 LTR JAR: ₹1,340",
  "10 LTR STEEL બરણી: ₹1,770",
  "20 LTR CARBO: ₹2,550",
  "20 LTR CANL : ₹3,250",
  "20 LTR STEEL બરણી: ₹3,520",
];

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
                  {packagingOptions.map(opt => (
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
                  const match = packagingOptions.find(opt => opt.startsWith(customerInput.orderPackaging));
                  if (!match) return 0;
                  const price = parseInt(match.split("₹")[1].replace(",", "")) || 0;
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
    </div>
  );
}