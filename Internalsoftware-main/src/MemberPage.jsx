import React, { useEffect, useState } from "react";
import { db, storage } from "./firebase";
import {
  addDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  getDocs,
  doc
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import Navbar from "./Navbar";
import ExcelJS from "exceljs";

export default function MemberPage() {
  const [villages, setVillages] = useState([]);
  const [selectedVillageid, setSelectedVillageid] = useState("");
  const [customers, setCustomers] = useState([]);
  const [excelCustomers, setExcelCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [photoCapture, setPhotoCapture] = useState("environment");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [demoStockTaken, setDemoStockTaken] = useState([]);
  const [demoStockAtDairy, setDemoStockAtDairy] = useState([]);
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
  const handleCustomerPhotoChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      setUploadingPhoto(true);
      // temporary preview
      const tmpReader = new FileReader();
      tmpReader.onload = () => setCustomerInput(prev => ({ ...prev, photoPreview: tmpReader.result }));
      tmpReader.readAsDataURL(file);

      const storageRef = ref(storage, `members/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      uploadTask.on('state_changed', () => {}, (err) => {
        console.error('Upload error', err);
        setUploadingPhoto(false);
        alert('Photo upload failed');
      }, async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        setCustomerInput(prev => ({ ...prev, photo: url }));
        setUploadingPhoto(false);
      });
    } catch (err) {
      console.error(err);
      setUploadingPhoto(false);
      alert('Failed to upload photo: ' + err.message);
    }
  };
  // 🔹 Fetch villages
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "villages"), snapshot => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVillages(data);
      if (data.length > 0 && !selectedVillageid) setSelectedVillageid(data[0].id);
    });
    return () => unsub();
  }, [selectedVillageid]);

  // 🔹 Real-time listener for manual customers
  useEffect(() => {
    if (!selectedVillageid) return;
    const q = query(collection(db, "customers"), where("villageId", "==", selectedVillageid));
    const unsub = onSnapshot(q, snapshot => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCustomers(data);
    }, err => {
      console.error("Error fetching manual customers:", err);
      setCustomers([]);
    });
    return () => unsub();
  }, [selectedVillageid]);

  // 🔹 Real-time listener for excel customers
  useEffect(() => {
    if (!selectedVillageid) return;
    const q = collection(db, "excelCustomers", selectedVillageid, "customers");
    const unsub = onSnapshot(q, snapshot => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExcelCustomers(data);
    }, err => {
      console.error("Error fetching excel customers:", err);
      setExcelCustomers([]);
    });
    return () => unsub();
  }, [selectedVillageid]);

  // 🔹 Real-time listener for stock from villageStocks 
  useEffect(() => {
    if (!selectedVillageid) {
      setDemoStockTaken([]);
      return;
    }

    const stockUnsub = onSnapshot(
      doc(db, "villageStocks", selectedVillageid),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const stocks = Array.isArray(data?.stocks) ? data.stocks : [];
          setDemoStockTaken(stocks);
        } else {
          setDemoStockTaken([]);
        }
      },
      (err) => {
        console.error("Error loading stock:", err);
        setDemoStockTaken([]);
      }
    );

    return () => stockUnsub();
  }, [selectedVillageid]);

  const handleCustomerInput = (e) => {
    const { name, value } = e.target;
    setCustomerInput(prev => ({ ...prev, [name]: value }));
  };

  // 🔹 Excel upload
  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target.result;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        const worksheet = workbook.worksheets[0];
        if (!worksheet) return;

        // read headers
        const headerRow = worksheet.getRow(1);
        const headers = headerRow.values.slice(1).map(h => (h || '').toString().trim());

        const rows = [];
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const vals = row.values.slice(1);
          const obj = {};
          headers.forEach((h, idx) => {
            obj[h] = vals[idx] !== undefined && vals[idx] !== null ? vals[idx] : '';
          });
          rows.push(obj);
        });

        const auth = getAuth();
        const user = auth.currentUser;
        let username = user?.reloadUserInfo?.screenName || user?.providerData?.[0]?.screenName || "";
        if (!username && user) username = user?.displayName || "";
        const displayName = user?.displayName || "";
        const email = user?.email || "";
        const addedBy = username || displayName || email || "Unknown";

        for (const row of rows) {
          const payload = {
            name: row.name || row.Name || "",
            code: row.code || row.Code || "",
            mobile: row.mobile || row.Mobile || "",
            orderPackaging: row.orderPackaging || row.OrderPackaging || "",
            orderQty: row.orderQty || row.OrderQty || "",
            remarks: row.remarks || row.Remarks || "",
            villageId: selectedVillageid,
            addedByRole: "member",
            addedBy,
            addedByUsername: username,
            addedByDisplayName: displayName,
            addedByEmail: email,
            createdAt: serverTimestamp(),
          };
          try {
            await addDoc(collection(db, "excelCustomers", selectedVillageid, "customers"), payload);
          } catch (err) {
            console.error("Error saving Excel row:", err);
          }
        }
        alert("Excel data uploaded successfully!");
      } catch (err) {
        console.error('Excel upload failed:', err);
        alert('Excel upload failed: ' + (err.message || err));
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSaveCustomer = async () => {
    if (!selectedVillageid) { alert("Select a village first"); return; }
    if (uploadingPhoto) { alert('Please wait until photo upload completes'); return; }
    if (!customerInput.name.trim() || !customerInput.mobile.trim()) { alert("Fill required fields"); return; }

    const auth = getAuth();
    const user = auth.currentUser;
    let username = user?.reloadUserInfo?.screenName || user?.providerData?.[0]?.screenName || "";
    if (!username && user) username = user?.displayName || "";
    const displayName = user?.displayName || "";
    const email = user?.email || "";
    const addedBy = username || displayName || email || "Unknown";

    const payload = {
      name: customerInput.name,
      code: customerInput.code || "",
      mobile: customerInput.mobile,
      orderPackaging: customerInput.orderPackaging || "",
      orderQty: customerInput.orderQty || "",
      photo: customerInput.photo || customerInput.photoPreview || "",
      remarks: customerInput.remarks || "",

      villageId: selectedVillageid,
      addedByRole: "member",
      addedBy,
      addedByUsername: username,
      addedByDisplayName: displayName,
      addedByEmail: email,
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "customers"), payload);

      // Add to active demo if exists
      const q = query(
        collection(db, "demosales"),
        where("village", "==", villages.find(v => v.id === selectedVillageid)?.name || ""),
        where("status", "==", "active")
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const demoDoc = snap.docs[0];
        await addDoc(collection(db, "demosales", demoDoc.id, "customers"), payload);
      }

      setCustomerInput({ name: "", code: "", mobile: "", orderPackaging: "", orderQty: "", remarks: "" });
      alert("Customer added successfully!");
    } catch (err) {
      alert("Error saving customer: " + err.message);
    }
  };

  const filteredCustomers = excelCustomers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.mobile.includes(searchTerm) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: 20 }}>
      <Navbar />
      <h1>Member Page</h1>

      {/* Village Selection */}
      {villages.length === 0 ? <p>No villages yet</p> : (
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ fontWeight: 600, marginRight: "0.5rem" }}>Select Village:</label>
          <select value={selectedVillageid} onChange={e => setSelectedVillageid(e.target.value)}>
            {villages.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
      )}

      {/* Excel Upload */}
      <div style={{ marginBottom: 20 }}>
        <input type="file" accept=".xlsx, .xls, .csv" onChange={handleExcelUpload} />
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search customers by name, mobile, or code..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
        />
        {searchTerm && filteredCustomers.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0, maxHeight: 200, overflowY: "auto", marginTop: 8, background: "#fff", borderRadius: 8, boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}>
            {filteredCustomers.map(c => (
              <li
                key={c.id}
                onClick={() => {
                  setCustomerInput({ name: c.name || "", code: c.code || "", mobile: c.mobile || "", orderPackaging: c.orderPackaging || "", orderQty: c.orderQty || "", remarks: c.remarks || "" });
                  setSearchTerm("");
                }}
                style={{ padding: 10, cursor: "pointer", borderBottom: "1px solid #eee" }}
              >
                <strong>{c.name}</strong> — {c.mobile} ({c.code})
              </li>
            ))}
          </ul>
        )}
        {searchTerm && filteredCustomers.length === 0 && <p style={{ color: "red", marginTop: 8 }}>No customers found</p>}
      </div>

      {/* Customer Form */}
      <div style={{ marginBottom: 20, background: "#e3eefd", padding: 18, borderRadius: 8, border: "2px solid #2563eb" }}>
        <h3 style={{ margin: "0 0 16px 0", color: "#174ea6", fontWeight: 700, fontSize: "1.3rem" }}>📝 Add Customer</h3>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: "0.85em", fontWeight: 600, color: "#0369a1", display: "block", marginBottom: 4 }}>Name *</label>
            <input placeholder="Customer name" name="name" value={customerInput.name} onChange={handleCustomerInput} style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #b6c7e6", borderRadius: 6 }} />
          </div>

          <div>
            <label style={{ fontSize: "0.85em", fontWeight: 600, color: "#0369a1", display: "block", marginBottom: 4 }}>Code</label>
            <input placeholder="Customer code" name="code" value={customerInput.code} onChange={handleCustomerInput} style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #b6c7e6", borderRadius: 6 }} />
          </div>

          <div>
            <label style={{ fontSize: "0.85em", fontWeight: 600, color: "#0369a1", display: "block", marginBottom: 4 }}>Mobile *</label>
            <input placeholder="Phone number" name="mobile" value={customerInput.mobile} onChange={handleCustomerInput} style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #b6c7e6", borderRadius: 6 }} />
          </div>

          <div>
            <label style={{ fontSize: "0.85em", fontWeight: 600, color: "#0369a1", display: "block", marginBottom: 4 }}>Packaging</label>
            <select name="orderPackaging" value={customerInput.orderPackaging} onChange={handleCustomerInput} style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #b6c7e6", borderRadius: 6 }}>
              <option value="">Select Packaging</option>
              {packagingOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: "0.85em", fontWeight: 600, color: "#0369a1", display: "block", marginBottom: 4 }}>Quantity</label>
            <input placeholder="Qty" type="number" name="orderQty" value={customerInput.orderQty} onChange={handleCustomerInput} min="1" style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #b6c7e6", borderRadius: 6 }} />
          </div>

          <div>
            <label style={{ fontSize: "0.85em", fontWeight: 600, color: "#0369a1", display: "block", marginBottom: 4 }}>Photo</label>
            <input type="file" accept="image/*" capture="environment" onChange={handleCustomerPhotoChange} style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #b6c7e6", borderRadius: 6 }} />
            {uploadingPhoto && <div style={{ fontSize: "0.8em", color: "#6b7280", marginTop: 4 }}>⏳ Uploading...</div>}
          </div>
        </div>

        {/* Photo Preview */}
        {(customerInput.photo || customerInput.photoPreview) && (
          <div style={{ marginBottom: 16, textAlign: "center" }}>
            <div style={{ fontSize: "0.9em", fontWeight: 600, color: "#0369a1", marginBottom: 8 }}>📸 Photo Preview</div>
            <img
              src={customerInput.photo || customerInput.photoPreview}
              alt="preview"
              style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 8, border: "2px solid #0284c7", boxShadow: "0 2px 8px rgba(2, 132, 199, 0.2)" }}
            />
          </div>
        )}

        <div>
          <label style={{ fontSize: "0.85em", fontWeight: 600, color: "#0369a1", display: "block", marginBottom: 4 }}>Remarks</label>
          <input placeholder="Any remarks..." name="remarks" value={customerInput.remarks} onChange={handleCustomerInput} style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #b6c7e6", borderRadius: 6 }} />
        </div>

        <div style={{ fontWeight: "bold", marginTop: 14, padding: 12, background: "#fff", borderRadius: 6, textAlign: "center", color: "#0369a1", fontSize: "1.1em" }}>
          💰 Total Value: ₹{(() => {
            if (!customerInput.orderPackaging) return 0;
            const match = packagingOptions.find(opt => opt.startsWith(customerInput.orderPackaging));
            if (!match) return 0;
            const price = parseInt(match.split("₹")[1].replace(",", "")) || 0;
            const qty = parseInt(customerInput.orderQty) || 0;
            return price * qty;
          })()}
        </div>

        <button style={{ marginTop: 14, width: "100%", background: "#16a34a", color: "#fff", padding: "12px 20px", borderRadius: 8, fontWeight: 700, fontSize: "1em", border: "none", cursor: "pointer", transition: "all 0.2s" }} onClick={handleSaveCustomer} onMouseOver={(e) => e.target.style.background = "#15803d"} onMouseOut={(e) => e.target.style.background = "#16a34a"}>
          ✓ Add Customer
        </button>
      </div>

      {/* Customers Table */}
      {customers.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ color: "#174ea6", fontWeight: 700, marginBottom: 16 }}>👥 Added Customers ({customers.length})</h3>
          <div style={{ overflowX: "auto", borderRadius: 8, border: "2px solid #d1d5db", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#2563eb", fontWeight: 700, color: "#fff" }}>
                  <th style={{ padding: "12px 14px", textAlign: "left", borderRight: "1px solid #1e40af" }}>Name</th>
                  <th style={{ padding: "12px 14px", textAlign: "left", borderRight: "1px solid #1e40af" }}>Mobile</th>
                  <th style={{ padding: "12px 14px", textAlign: "left", borderRight: "1px solid #1e40af" }}>Packaging</th>
                  <th style={{ padding: "12px 14px", textAlign: "left", borderRight: "1px solid #1e40af" }}>Qty</th>
                  <th style={{ padding: "12px 14px", textAlign: "center", borderRight: "1px solid #1e40af" }}>Photo</th>
                  <th style={{ padding: "12px 14px", textAlign: "left", borderRight: "1px solid #1e40af" }}>Remarks</th>
                  <th style={{ padding: "12px 14px", textAlign: "left" }}>Added By</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, idx) => (
                  <tr key={c.id} style={{ background: idx % 2 === 0 ? "#f9fafb" : "#fff", borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "12px 14px", fontWeight: 600, color: "#1f2937" }}>{c.name}</td>
                    <td style={{ padding: "12px 14px", color: "#4b5563" }}>{c.mobile}</td>
                    <td style={{ padding: "12px 14px", color: "#4b5563" }}>{c.orderPackaging}</td>
                    <td style={{ padding: "12px 14px", fontWeight: 600, color: "#2563eb" }}>{c.orderQty}</td>
                    <td style={{ padding: "12px 14px", textAlign: "center" }}>
                      {c.photo ? (
                        <img src={c.photo} alt="customer" style={{ width: 50, height: 50, borderRadius: 6, objectFit: "cover", border: "1px solid #d1d5db" }} />
                      ) : (
                        <span style={{ color: "#9ca3af", fontSize: "0.85em" }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 14px", color: "#6b7280", fontSize: "0.9em" }}>{c.remarks || "-"}</td>
                    <td style={{ padding: "12px 14px", color: "#4b5563", fontSize: "0.9em" }}>{c.addedByUsername || c.addedByDisplayName || c.addedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Inventory by Packaging Dashboard */}
      <div style={{ marginTop: 32, marginBottom: 28 }}>
        <h3 style={{ color: "#174ea6", fontWeight: 700, marginBottom: 20, fontSize: "1.5rem" }}>📦 STOCK INVENTORY BY PACKAGING</h3>
        <div style={{ overflowX: "auto", borderRadius: 8, border: "2px solid #d1d5db", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#2563eb", fontWeight: 700, color: "#fff" }}>
                <th style={{ padding: "14px 16px", textAlign: "left", borderRight: "1px solid #1e40af" }}>📌 Package Name</th>
                <th style={{ padding: "14px 16px", textAlign: "center", borderRight: "1px solid #1e40af" }}>📦 Taken</th>
                <th style={{ padding: "14px 16px", textAlign: "center", borderRight: "1px solid #1e40af" }}>💰 Sold</th>
                <th style={{ padding: "14px 16px", textAlign: "center" }}>📈 Remaining</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const packagingMap = {};

                // Process taken stock
                demoStockTaken.forEach(s => {
                  if (!packagingMap[s.packaging]) {
                    packagingMap[s.packaging] = { taken: 0, sold: 0 };
                  }
                  packagingMap[s.packaging].taken += parseInt(s.quantity) || 0;
                });

                // Process sold from manual customers
                customers.forEach(c => {
                  if (c.orderPackaging) {
                    if (!packagingMap[c.orderPackaging]) {
                      packagingMap[c.orderPackaging] = { taken: 0, sold: 0 };
                    }
                    packagingMap[c.orderPackaging].sold += parseInt(c.orderQty) || 0;
                  }
                });

                // Process sold from excel customers
                excelCustomers.forEach(c => {
                  if (c.orderPackaging) {
                    if (!packagingMap[c.orderPackaging]) {
                      packagingMap[c.orderPackaging] = { taken: 0, sold: 0 };
                    }
                    packagingMap[c.orderPackaging].sold += parseInt(c.orderQty) || 0;
                  }
                });

                // Convert to array and sort
                const packagingArray = Object.keys(packagingMap).map(pkg => ({
                  name: pkg,
                  ...packagingMap[pkg],
                  remaining: packagingMap[pkg].taken - packagingMap[pkg].sold
                })).sort((a, b) => a.name.localeCompare(b.name));

                if (packagingArray.length === 0) {
                  return (
                    <tr>
                      <td colSpan="4" style={{ padding: "20px", textAlign: "center", color: "#9ca3af" }}>
                        No stock data available
                      </td>
                    </tr>
                  );
                }

                return packagingArray.map((pkg, idx) => (
                  <tr key={pkg.name} style={{ background: idx % 2 === 0 ? "#f9fafb" : "#fff", borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "14px 16px", fontWeight: 600, color: "#1f2937" }}>{pkg.name}</td>
                    <td style={{ padding: "14px 16px", textAlign: "center", fontWeight: 600, color: "#0284c7" }}>{pkg.taken}</td>
                    <td style={{ padding: "14px 16px", textAlign: "center", fontWeight: 600, color: "#a855f7" }}>{pkg.sold}</td>
                    <td style={{ 
                      padding: "14px 16px", 
                      textAlign: "center", 
                      fontWeight: 700, 
                      color: pkg.remaining >= 0 ? "#22c55e" : "#ef4444",
                      background: pkg.remaining >= 0 ? "#f0fdf4" : "#fef2f2",
                      borderRadius: "6px"
                    }}>
                      {pkg.remaining}
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
