import React, { useEffect, useState } from "react";
import { db, storage } from "./firebase";
import {
  addDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  getDocs
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
  const [customerInput, setCustomerInput] = useState({
    name: "",
    code: "",
    mobile: "",
    orderPackaging: "",
    orderQty: "",
    remarks: "",
  });

  const packagingOptions = [
    "1L JAR: ₹145",
    "2L JAR: ₹275",
    "5L PLASTIC JAR: ₹665",
    "5L STEEL BARNI: ₹890",
    "10 LTR JAR: ₹1,340",
    "10 LTR STEEL BARNI: ₹1,770",
    "20 LTR CARBO: ₹2,550",
    "20 LTR CANL : ₹3,250",
    "20 LTR STEEL BARNI: ₹3,520",
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
    }, err => console.error("Error fetching excel customers:", err));
    return () => unsub();
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
      <div style={{ marginBottom: 20, background: "#e3eefd", padding: 12, borderRadius: 8 }}>
        <h3 style={{ margin: 0, color: "#174ea6", fontWeight: 700 }}>Add Customer</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 10 }}>
          <input placeholder="Name" name="name" value={customerInput.name} onChange={handleCustomerInput} />
          <input placeholder="Code" name="code" value={customerInput.code} onChange={handleCustomerInput} />
          <input placeholder="Mobile" name="mobile" value={customerInput.mobile} onChange={handleCustomerInput} />
          <select name="orderPackaging" value={customerInput.orderPackaging} onChange={handleCustomerInput}>
            <option value="">Select Packaging</option>
            {packagingOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <input placeholder="Qty" type="number" name="orderQty" value={customerInput.orderQty} onChange={handleCustomerInput} min="1" />
          <input
  type="file"
  accept="image/*"
capture="environment"
  onChange={handleCustomerPhotoChange}
/>{customerInput.photo && (
  <img
    src={customerInput.photo || customerInput.photoPreview}
    alt="preview"
     
    style={{ width: 80, height: 80, objectFit: "cover", marginTop: 8 }}
  />
)}
{uploadingPhoto && <div style={{ fontSize: 12, color: '#6b7280' }}>Uploading...</div>}


          <input placeholder="Remarks" name="remarks" value={customerInput.remarks} onChange={handleCustomerInput} />
        </div>
        <div style={{ fontWeight: "bold", marginTop: 10 }}>
          Customer Total: ₹{(() => {
            if (!customerInput.orderPackaging) return 0;
            const match = packagingOptions.find(opt => opt.startsWith(customerInput.orderPackaging));
            if (!match) return 0;
            const price = parseInt(match.split("₹")[1].replace(",", "")) || 0;
            const qty = parseInt(customerInput.orderQty) || 0;
            return price * qty;
          })()}
        </div>
        <button style={{ marginTop: 10, background: "#16a34a", color: "#fff", padding: 10, borderRadius: 8 }} onClick={handleSaveCustomer}>
          Add
        </button>
      </div>

      {/* Customers Table */}
      {customers.length > 0 && (
        <div>
          <h3>Added Customers</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#e3eefd", fontWeight: 700, color: "#174ea6" }}>
                  <th>Name</th><th>Mobile</th><th>Packaging</th><th>Qty</th> <th>Photo</th><th>Remarks</th> <th>Entry By</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.id} style={{ background: "#f7fafd" }}>
                    <td>{c.name}</td>
                    <td>{c.mobile}</td>
                    <td>{c.orderPackaging}</td>
                    <td>{c.orderQty}</td>
                    <td>
  {c.photo && <img src={c.photo} width={40} />}
</td>

                    <td>{c.remarks}</td>
                    <td>{c.addedByUsername || c.addedByDisplayName || c.addedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
