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
  doc,
  setDoc,
  deleteDoc,
  updateDoc
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getPackagingNames, getPriceByName, getLitresByName } from "./config/packagingConfig";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import Navbar from "./Navbar";
import ExcelJS from "exceljs";
import { toast } from "react-toastify";
import { VillageSelector } from "./components/stock/VillageSelector";
import { compressImage, getBase64SizeInMB } from "./imageCompressionUtils";

export default function MemberPage() {
  const [villages, setVillages] = useState([]);
  const [selectedVillageid, setSelectedVillageid] = useState("");
  const [customers, setCustomers] = useState([]);
  const [excelCustomers, setExcelCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [photoCapture, setPhotoCapture] = useState("environment");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isCustomersCollapsed, setIsCustomersCollapsed] = useState(false);
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  const [demoStockTaken, setDemoStockTaken] = useState([]);
  const [demoStockAtDairy, setDemoStockAtDairy] = useState([]);
  const [stockReturned, setStockReturned] = useState([]);
  const [paymentsCollected, setPaymentsCollected] = useState([]);
  const [remainingStockList, setRemainingStockList] = useState([]);
  
  // Current user email for permission checking
  const [currentUserEmail, setCurrentUserEmail] = useState(null);
  
  const [stockAtDairyInput, setStockAtDairyInput] = useState({ packaging: "", quantity: "" });
  const [returnedStockInput, setReturnedStockInput] = useState({ packaging: "", quantity: "" });
  const [paymentInput, setPaymentInput] = useState({ amount: "", mode: "", givenBy: "", takenBy: "" });
  
  const [customerInput, setCustomerInput] = useState({
    name: "",
    code: "",
    mobile: "",
    orderPackaging: "",
    orderQty: "",
    remarks: "",
    paymentMethod: "",
  });

  // State for editing customer
  const [editingCustomerId, setEditingCustomerId] = useState(null);

  // State for filtering by member
  const [filterByMember, setFilterByMember] = useState("all");

  // Get unique list of members who added customers
  const uniqueMembers = Array.from(
    new Map(
      customers.map(c => [
        c.addedByEmail,
        {
          email: c.addedByEmail,
          name: c.addedByUsername || c.addedByDisplayName || c.addedBy || "Unknown",
        }
      ])
    ).values()
  ).sort((a, b) => {
    // Sort: current user first, then others alphabetically
    if (a.email === currentUserEmail) return -1;
    if (b.email === currentUserEmail) return 1;
    return a.name.localeCompare(b.name);
  });

  // Filter customers based on selected member
  const filteredCustomersByMember = (() => {
    let filtered = customers;
    if (filterByMember !== "all") {
      filtered = customers.filter(c => c.addedByEmail === filterByMember);
    } else {
      // Sort so current user's customers come first
      filtered = [...customers].sort((a, b) => {
        if (a.addedByEmail === currentUserEmail && b.addedByEmail !== currentUserEmail) return -1;
        if (a.addedByEmail !== currentUserEmail && b.addedByEmail === currentUserEmail) return 1;
        return 0;
      });
    }
    return filtered;
  })();

  // Get packaging names from config (without prices)
  const packagingNames = getPackagingNames();

  // Predefined 1+1 scheme combinations
  const onePlusOneSchemes = [
    { label: "1LTR JAR + 1LTR JAR", key: "1P_1P", base: 145 + 145, offer: 250, parts: ["1LTR JAR", "1LTR JAR"] },
    { label: "1LTR JAR + 2LTR JAR", key: "1P_2P", base: 145 + 275, offer: 360, parts: ["1LTR JAR", "2LTR JAR"] },
    { label: "1LTR JAR + 5LTR PLASTIC JAR", key: "1P_5P", base: 145 + 665, offer: 690, parts: ["1LTR JAR", "5LTR PLASTIC JAR"] },
    { label: "1LTR JAR + 5LTR STEEL BARNI", key: "1P_5S", base: 145 + 890, offer: 880, parts: ["1LTR JAR", "5LTR STEEL BARNI"] },
    { label: "1LTR JAR + 10 LTR JAR", key: "1P_10P", base: 145 + 1340, offer: 1260, parts: ["1LTR JAR", "10 LTR JAR"] },
    { label: "1LTR JAR + 10 LTR STEEL", key: "1P_10S", base: 145 + 1770, offer: 1630, parts: ["1LTR JAR", "10 LTR STEEL"] },
    { label: "1LTR JAR + 20 LTR CAN", key: "1P_20C", base: 145 + 3250, offer: 2885, parts: ["1LTR JAR", "20 LTR CAN"] },
    { label: "1LTR JAR + 20 LTR STEEL", key: "1P_20S", base: 145 + 3520, offer: 3115, parts: ["1LTR JAR", "20 LTR STEEL"] },
    { label: "2LTR JAR + 2LTR JAR", key: "2P_2P", base: 275 + 275, offer: 470, parts: ["2LTR JAR", "2LTR JAR"] },
    { label: "2LTR JAR + 5LTR PLASTIC JAR", key: "2P_5P", base: 275 + 665, offer: 800, parts: ["2LTR JAR", "5LTR PLASTIC JAR"] },
    { label: "2LTR JAR + 5LTR STEEL BARNI", key: "2P_5S", base: 275 + 890, offer: 990, parts: ["2LTR JAR", "5LTR STEEL BARNI"] },
    { label: "2LTR JAR + 10 LTR JAR", key: "2P_10P", base: 275 + 1340, offer: 1370, parts: ["2LTR JAR", "10 LTR JAR"] },
    { label: "2LTR JAR + 10 LTR STEEL", key: "2P_10S", base: 275 + 1770, offer: 1740, parts: ["2LTR JAR", "10 LTR STEEL"] },
    { label: "2LTR JAR + 20 LTR CAN", key: "2P_20C", base: 275 + 3250, offer: 3000, parts: ["2LTR JAR", "20 LTR CAN"] },
    { label: "2LTR JAR + 20 LTR STEEL", key: "2P_20S", base: 275 + 3520, offer: 3225, parts: ["2LTR JAR", "20 LTR STEEL"] },
    { label: "5LTR PLASTIC JAR + 5LTR PLASTIC JAR", key: "5P_5P", base: 665 + 665, offer: 1130, parts: ["5LTR PLASTIC JAR", "5LTR PLASTIC JAR"] },
    { label: "5LTR PLASTIC JAR + 5LTR STEEL BARNI", key: "5P_5S", base: 665 + 890, offer: 1320, parts: ["5LTR PLASTIC JAR", "5LTR STEEL BARNI"] },
    { label: "5LTR PLASTIC JAR + 10 LTR JAR", key: "5P_10P", base: 665 + 1340, offer: 1700, parts: ["5LTR PLASTIC JAR", "10 LTR JAR"] },
    { label: "5LTR PLASTIC JAR + 10 LTR STEEL", key: "5P_10S", base: 665 + 1770, offer: 2070, parts: ["5LTR PLASTIC JAR", "10 LTR STEEL"] },
    { label: "5LTR PLASTIC JAR + 20 LTR CAN", key: "5P_20C", base: 665 + 3250, offer: 3330, parts: ["5LTR PLASTIC JAR", "20 LTR CAN"] },
    { label: "5LTR PLASTIC JAR + 20 LTR STEEL", key: "5P_20S", base: 665 + 3520, offer: 3560, parts: ["5LTR PLASTIC JAR", "20 LTR STEEL"] },
    { label: "5LTR STEEL BARNI + 5LTR STEEL BARNI", key: "5S_5S", base: 890 + 890, offer: 1515, parts: ["5LTR STEEL BARNI", "5LTR STEEL BARNI"] },
    { label: "5LTR STEEL BARNI + 10 LTR JAR", key: "5S_10P", base: 890 + 1340, offer: 1895, parts: ["5LTR STEEL BARNI", "10 LTR JAR"] },
    { label: "5LTR STEEL BARNI + 10 LTR STEEL", key: "5S_10S", base: 890 + 1770, offer: 2260, parts: ["5LTR STEEL BARNI", "10 LTR STEEL"] },
    { label: "5LTR STEEL BARNI + 20 LTR CAN", key: "5S_20C", base: 890 + 3250, offer: 3520, parts: ["5LTR STEEL BARNI", "20 LTR CAN"] },
    { label: "5LTR STEEL BARNI + 20 LTR STEEL", key: "5S_20S", base: 890 + 3520, offer: 3750, parts: ["5LTR STEEL BARNI", "20 LTR STEEL"] },
    { label: "10 LTR JAR + 10 LTR JAR", key: "10P_10P", base: 1340 + 1340, offer: 2280, parts: ["10 LTR JAR", "10 LTR JAR"] },
    { label: "10 LTR JAR + 10 LTR STEEL", key: "10P_10S", base: 1340 + 1770, offer: 2650, parts: ["10 LTR JAR", "10 LTR STEEL"] },
    { label: "10 LTR JAR + 20 LTR CAN", key: "10P_20C", base: 1340 + 3250, offer: 3900, parts: ["10 LTR JAR", "20 LTR CAN"] },
    { label: "10 LTR JAR + 20 LTR STEEL", key: "10P_20S", base: 1340 + 3520, offer: 4135, parts: ["10 LTR JAR", "20 LTR STEEL"] },
    { label: "10 LTR STEEL + 10 LTR STEEL", key: "10S_10S", base: 1770 + 1770, offer: 3050, parts: ["10 LTR STEEL", "10 LTR STEEL"] },
    { label: "10 LTR STEEL + 20 LTR CAN", key: "10S_20C", base: 1770 + 3250, offer: 4270, parts: ["10 LTR STEEL", "20 LTR CAN"] },
    { label: "10 LTR STEEL + 20 LTR STEEL", key: "10S_20S", base: 1770 + 3520, offer: 4500, parts: ["10 LTR STEEL", "20 LTR STEEL"] },
    { label: "20 LTR CAN + 20 LTR CAN", key: "20C_20C", base: 3250 + 3250, offer: 5530, parts: ["20 LTR CAN", "20 LTR CAN"] },
    { label: "20 LTR STEEL + 20 LTR CAN", key: "20S_20C", base: 3520 + 3250, offer: 5750, parts: ["20 LTR STEEL", "20 LTR CAN"] },
    { label: "20 LTR STEEL + 20 LTR STEEL", key: "20S_20S", base: 3520 + 3520, offer: 6000, parts: ["20 LTR STEEL", "20 LTR STEEL"] },
  ];

   const handleCustomerPhotoChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert("Please select a valid image file");
      return;
    }

    // Check original file size
    const originalSizeInMB = file.size / (1024 * 1024);
    if (originalSizeInMB > 10) {
      alert("Original file size is too large (>10MB). Please select a smaller image.");
      return;
    }

    try {
      setUploadingPhoto(true);
      
      // Compress the image
      console.log(`Compressing image: ${file.name} (${originalSizeInMB.toFixed(2)}MB)`);
      const compressedBase64 = await compressImage(file, 1200, 1200, 0.8);
      const compressedSizeInMB = getBase64SizeInMB(compressedBase64);
      
      console.log(`✅ Image compressed successfully: ${compressedSizeInMB.toFixed(2)}MB (from ${originalSizeInMB.toFixed(2)}MB)`);
      
      // Store compressed base64 in state - will be saved to Firestore
      setCustomerInput(prev => ({ 
        ...prev, 
        photo: compressedBase64,
        photoPreview: compressedBase64
      }));
      
      setUploadingPhoto(false);
      alert(`Photo loaded and compressed successfully!\nSize: ${compressedSizeInMB.toFixed(2)}MB`);
    } catch (err) {
      console.error('Error processing photo:', err);
      setUploadingPhoto(false);
      alert('Photo processing failed: ' + (err.message || err));
    }
  };

  // 🔹 Get current user email for permission checking
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setCurrentUserEmail(user.email);
      }
    });
    return () => unsubscribe();
  }, []);

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

  // 🔹 Real-time listener for stock at dairy from villageStocks
  useEffect(() => {
    if (!selectedVillageid) {
      setDemoStockAtDairy([]);
      return;
    }

    const dairyUnsub = onSnapshot(
      doc(db, "villageStocks", selectedVillageid),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const dairyStocks = Array.isArray(data?.dairyStocks) ? data.dairyStocks : [];
          setDemoStockAtDairy(dairyStocks);
        } else {
          setDemoStockAtDairy([]);
        }
      },
      (err) => {
        console.error("Error loading dairy stock:", err);
        setDemoStockAtDairy([]);
      }
    );

    return () => dairyUnsub();
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
            paymentMethod: row.paymentMethod || row.PaymentMethod || "",
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

  // 🔹 Check if current user can edit/delete this customer
  const canEditCustomer = (customer) => {
    if (!currentUserEmail) return false;
    return customer.addedByEmail === currentUserEmail;
  };

  // 🔹 Edit Customer - Load customer data into form
  const handleEditCustomer = (customer) => {
    setEditingCustomerId(customer.id);
    setCustomerInput({
      name: customer.name,
      code: customer.code || "",
      mobile: customer.mobile,
      orderPackaging: customer.orderPackaging || "",
      orderQty: customer.orderQty || "",
      remarks: customer.remarks || "",
      paymentMethod: customer.paymentMethod || "",
      photo: customer.photo || null,
    });
    // Scroll to form
    document.querySelector('h3')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // 🔹 Update Customer
  const handleUpdateCustomer = async () => {
    if (!editingCustomerId) return;
    if (uploadingPhoto) { alert('Please wait until photo upload completes'); return; }
    if (!customerInput.name.trim() || !customerInput.mobile.trim()) { alert("Fill required fields"); return; }

    try {
      await updateDoc(doc(db, "customers", editingCustomerId), {
        name: customerInput.name,
        code: customerInput.code || "",
        mobile: customerInput.mobile,
        orderPackaging: customerInput.orderPackaging || "",
        orderQty: customerInput.orderQty || "",
        photo: customerInput.photo || null,
        remarks: customerInput.remarks || "",
        paymentMethod: customerInput.paymentMethod || "",
      });
      toast.success("Customer updated successfully");
      setEditingCustomerId(null);
      setCustomerInput({ name: "", code: "", mobile: "", orderPackaging: "", orderQty: "", remarks: "", paymentMethod: "", photo: null });
    } catch (err) {
      console.error(err);
      toast.error("Failed to update customer");
    }
  };

  // 🔹 Delete Customer
  const handleRemoveCustomer = async (customerId) => {
    if (!window.confirm("Are you sure you want to delete this customer?")) return;

    try {
      await deleteDoc(doc(db, "customers", customerId));
      toast.success("Customer removed successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove customer");
    }
  };

  const handleSaveCustomer = async () => {
    if (!selectedVillageid) { alert("Select a village first"); return; }
    if (uploadingPhoto) { alert('Please wait until photo upload completes'); return; }
    if (!customerInput.name.trim() || !customerInput.mobile.trim()) { alert("Fill required fields"); return; }

    // If editing, call update instead
    if (editingCustomerId) {
      await handleUpdateCustomer();
      return;
    }

    const auth = getAuth();
    const user = auth.currentUser;
    let username = user?.reloadUserInfo?.screenName || user?.providerData?.[0]?.screenName || "";
    if (!username && user) username = user?.displayName || "";
    const displayName = user?.displayName || "";
    const email = user?.email || "";
    const addedBy = username || displayName || email || "Unknown";

    // Detect if selected packaging is a 1+1 scheme
    const detectedScheme = onePlusOneSchemes.find(s => s.label === customerInput.orderPackaging);
    
    const payload = {
      name: customerInput.name,
      code: customerInput.code || "",
      mobile: customerInput.mobile,
      orderPackaging: customerInput.orderPackaging || "",
      orderQty: customerInput.orderQty || "",
      photo: customerInput.photo || null, // Only save actual upload URL, not preview
      remarks: customerInput.remarks || "",
      paymentMethod: customerInput.paymentMethod || "",
    };
    
    // Add scheme info if applicable
    if (detectedScheme) {
      payload.schemeType = "1+1";
      payload.schemeKey = detectedScheme.key;
      payload.appliedPrice = detectedScheme.offer;
    }
    
    payload.villageId = selectedVillageid;
    payload.addedByRole = "member";
    payload.addedBy = addedBy;
    payload.addedByUsername = username;
    payload.addedByDisplayName = displayName;
    payload.addedByEmail = email;
    payload.createdAt = serverTimestamp();

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

      setCustomerInput({ name: "", code: "", mobile: "", orderPackaging: "", orderQty: "", remarks: "", photoPreview: null });
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

  // Calculate grand total litres for member page score card
  const grandTotalLitres =
    customers.reduce((acc, c) => {
      const litres = getLitresByName(c.orderPackaging) || 0;
      const qty = parseInt(c.orderQty) || 0;
      return acc + litres * qty;
    }, 0) +
    demoStockAtDairy.reduce((acc, s) => {
      const litres = getLitresByName(s.packaging) || 0;
      const qty = parseInt(s.quantity) || 0;
      return acc + litres * qty;
    }, 0);

  return (
    <div style={{ padding: 20 }}>
      <Navbar />
      <h1>Member Page</h1>

      {/* Village Selection with Search */}
      {villages.length === 0 ? (
        <p>No villages yet</p>
      ) : (
        <VillageSelector
          villageOptions={villages}
          selectedVillageId={selectedVillageid}
          onVillageChange={(villageId) => setSelectedVillageid(villageId)}
          label="Select Village"
          showLabel={true}
        />
      )}

      {/* MEMBER PAGE LIVE SCORE CARD */}
      {selectedVillageid && (
        <div
          style={{
            marginTop: 24,
            marginBottom: 24,
            textAlign: "center",
            borderRadius: 14,
            boxShadow: "0 8px 32px rgba(37, 99, 235, 0.3)",
            background: "linear-gradient(135deg, #fff 0%, #f0f9ff 100%)",
            padding: "24px 20px",
            border: "3px solid #2563eb",
            maxWidth: 900,
            marginLeft: "auto",
            marginRight: "auto",
            animation: "slideDown 0.5s ease-out"
          }}
        >
          <style>{`
            @keyframes slideDown {
              from {
                opacity: 0;
                transform: translateY(-20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
          
          {/* Title */}
          <h3
            style={{
              margin: "0 0 20px 0",
              color: "#2563eb",
              fontWeight: 900,
              fontSize: "1.4rem",
              letterSpacing: "0.05em",
            }}
          >
            🎯 LIVE SESSION SCORE
          </h3>

          {/* Score Cards Container */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 16,
              padding: "0 12px"
            }}
          >
            {/* Total Customers Card */}
            <div
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                padding: "20px 16px",
                borderRadius: 12,
                color: "#fff",
                boxShadow: "0 4px 16px rgba(37, 99, 235, 0.25)",
                border: "2px solid rgba(255,255,255,0.3)",
              }}
            >
              <div style={{ fontSize: "0.9em", opacity: 0.95, marginBottom: 8 }}>
                👥 CUSTOMERS
              </div>
              <div
                style={{
                  fontSize: "2.4rem",
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                }}
              >
                {customers.length}
              </div>
            </div>

            {/* Total Litres Card */}
            <div
              style={{
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                padding: "20px 16px",
                borderRadius: 12,
                color: "#fff",
                boxShadow: "0 4px 16px rgba(16, 185, 129, 0.25)",
                border: "2px solid rgba(255,255,255,0.3)",
              }}
            >
              <div style={{ fontSize: "0.9em", opacity: 0.95, marginBottom: 8 }}>
                📊 LITRES
              </div>
              <div
                style={{
                  fontSize: "2.4rem",
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                }}
              >
                {grandTotalLitres}
              </div>
            </div>
          </div>

          {/* Real-time status */}
          <div
            style={{
              marginTop: 16,
              fontSize: "0.85em",
              color: "#059669",
              fontWeight: 600,
              letterSpacing: "0.05em",
            }}
          >
            🔴 LIVE — Updates in real-time
          </div>
        </div>
      )}

      {/* Excel Upload */}
      <div style={{ marginBottom: 20 }}>
        <input type="file" accept=".xlsx, .xls, .csv" onChange={handleExcelUpload} />
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ position: "relative", maxWidth: "500px" }}>
          <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
            <span style={{ position: "absolute", left: 12, color: "#2563eb", fontSize: "1.2em" }}>🔍</span>
            <input
              type="text"
              placeholder="Search by name, mobile, or code..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ 
                width: "100%", 
                padding: "12px 12px 12px 40px", 
                borderRadius: 8, 
                border: "2px solid #e0e7ff",
                fontSize: "0.95em",
                transition: "all 0.2s",
                boxShadow: searchTerm ? "0 2px 8px rgba(37, 99, 235, 0.15)" : "none",
                borderColor: searchTerm ? "#2563eb" : "#e0e7ff"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#2563eb";
                e.target.style.boxShadow = "0 2px 8px rgba(37, 99, 235, 0.15)";
              }}
              onBlur={(e) => {
                if (!searchTerm) {
                  e.target.style.borderColor = "#e0e7ff";
                  e.target.style.boxShadow = "none";
                }
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                style={{
                  position: "absolute",
                  right: 12,
                  background: "none",
                  border: "none",
                  fontSize: "1.1em",
                  cursor: "pointer",
                  color: "#9ca3af",
                  padding: "4px 8px",
                  transition: "color 0.2s"
                }}
                onMouseOver={(e) => e.target.style.color = "#2563eb"}
                onMouseOut={(e) => e.target.style.color = "#9ca3af"}
              >
                ✕
              </button>
            )}
          </div>

          {searchTerm && filteredCustomers.length > 0 && (
            <ul style={{ 
              listStyle: "none", 
              padding: "8px 0", 
              maxHeight: 320, 
              overflowY: "auto", 
              marginTop: 8, 
              background: "#fff", 
              borderRadius: 8, 
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)",
              border: "1px solid #e0e7ff",
              position: "relative",
              zIndex: 10
            }}>
              {filteredCustomers.map((c, idx) => (
                <li
                  key={c.id}
                  onClick={() => {
                    setCustomerInput({ name: c.name || "", code: c.code || "", mobile: c.mobile || "", orderPackaging: c.orderPackaging || "", orderQty: c.orderQty || "", remarks: c.remarks || "" });
                    setSearchTerm("");
                  }}
                  style={{ 
                    padding: "12px 16px", 
                    cursor: "pointer", 
                    borderBottom: idx < filteredCustomers.length - 1 ? "1px solid #f0f0f0" : "none",
                    transition: "all 0.15s",
                    background: "#fff"
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "#f0f7ff";
                    e.currentTarget.style.paddingLeft = "20px";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "#fff";
                    e.currentTarget.style.paddingLeft = "16px";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: "#1f2937", fontSize: "0.95em" }}>{c.name}</div>
                      <div style={{ fontSize: "0.8em", color: "#6b7280", marginTop: 2 }}>📱 {c.mobile} {c.code && `• Code: ${c.code}`}</div>
                    </div>
                    <div style={{ color: "#2563eb", fontSize: "1em" }}>→</div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {searchTerm && filteredCustomers.length === 0 && (
            <div style={{ 
              marginTop: 8, 
              padding: "16px", 
              background: "#fef3c7", 
              border: "1px solid #fcd34d",
              borderRadius: 8, 
              textAlign: "center",
              color: "#92400e"
            }}>
              <div style={{ fontSize: "1.4em", marginBottom: 6 }}>🔍</div>
              <div style={{ fontWeight: 600 }}>No customers found</div>
              <div style={{ fontSize: "0.85em", marginTop: 4, opacity: 0.8 }}>Try searching with a different name, mobile, or code</div>
            </div>
          )}
        </div>
      </div>

      {/* Customer Form */}
      <div style={{ marginBottom: 20, background: "#e3eefd", padding: 0, borderRadius: 8, border: "2px solid #2563eb", overflow: "hidden" }}>
        {/* Collapsible Header */}
        <div
          onClick={() => setIsFormCollapsed(!isFormCollapsed)}
          style={{
            background: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
            color: "#fff",
            padding: "14px 18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
            userSelect: "none",
            transition: "all 0.2s"
          }}
          onMouseOver={(e) => e.currentTarget.style.background = "linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)"}
          onMouseOut={(e) => e.currentTarget.style.background = "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)"}
        >
          <h3 style={{ margin: 0, fontWeight: 700, fontSize: "1.05rem", letterSpacing: "0.05em" }}>
            📝 {editingCustomerId ? "Edit Customer" : "Add Customer"}
          </h3>
          <button
            type="button"
            style={{
              background: "rgba(255,255,255,0.2)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.4)",
              padding: "4px 10px",
              borderRadius: 6,
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.8em",
              transition: "all 0.2s"
            }}
            onMouseOver={(e) => {
              e.target.style.background = "rgba(255,255,255,0.3)";
            }}
            onMouseOut={(e) => {
              e.target.style.background = "rgba(255,255,255,0.2)";
            }}
          >
            {isFormCollapsed ? "▶" : "▼"}
          </button>
        </div>
        
        {!isFormCollapsed && (
          <div style={{ padding: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
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
              {packagingNames.map(opt => (
                <option key={opt} value={opt}>{opt} — ₹{getPriceByName(opt)}</option>
              ))}
              {/* 1+1 scheme options */}
              <optgroup label="1+1 Schemes">
                {onePlusOneSchemes.map(scheme => (
                  <option key={"scheme-" + scheme.key} value={scheme.label}>
                    {scheme.label} — Offer ₹{scheme.offer}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label style={{ fontSize: "0.85em", fontWeight: 600, color: "#0369a1", display: "block", marginBottom: 4 }}>Quantity</label>
            <input placeholder="Qty" type="number" name="orderQty" value={customerInput.orderQty} onChange={handleCustomerInput} min="1" style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #b6c7e6", borderRadius: 6 }} />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
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

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: "0.85em", fontWeight: 600, color: "#0369a1", display: "block", marginBottom: 8 }}>Payment Method</label>
          <div style={{ display: 'flex', gap: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="radio"
                name="paymentMethod"
                value="PAVTI"
                checked={customerInput.paymentMethod === 'PAVTI'}
                onChange={handleCustomerInput}
              />
              <span>PAVTI</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="radio"
                name="paymentMethod"
                value="CASH"
                checked={customerInput.paymentMethod === 'CASH'}
                onChange={handleCustomerInput}
              />
              <span>CASH</span>
            </label>
          </div>
        </div>

        <div style={{ fontWeight: "bold", marginTop: 14, padding: 12, background: "#fff", borderRadius: 6, textAlign: "center", color: "#0369a1", fontSize: "1.1em" }}>
          💰 Total Value: ₹{(() => {
            if (!customerInput.orderPackaging) return 0;
            const qty = parseInt(customerInput.orderQty) || 0;
            
            // Check if selected packaging is a 1+1 scheme
            const scheme = onePlusOneSchemes.find(s => s.label === customerInput.orderPackaging);
            if (scheme) {
              return scheme.offer * qty;
            }
            
            // Otherwise, get price from packaging config
            const price = getPriceByName(customerInput.orderPackaging) || 0;
            return price * qty;
          })()}
        </div>

        <button style={{ marginTop: 14, width: "100%", background: "#16a34a", color: "#fff", padding: "12px 20px", borderRadius: 8, fontWeight: 700, fontSize: "1em", border: "none", cursor: "pointer", transition: "all 0.2s" }} onClick={handleSaveCustomer} onMouseOver={(e) => e.target.style.background = "#15803d"} onMouseOut={(e) => e.target.style.background = "#16a34a"}>
          ✓ {editingCustomerId ? "Update Customer" : "Add Customer"}
        </button>
        
        {editingCustomerId && (
          <button style={{ marginTop: 8, width: "100%", background: "#6b7280", color: "#fff", padding: "12px 20px", borderRadius: 8, fontWeight: 700, fontSize: "1em", border: "none", cursor: "pointer", transition: "all 0.2s" }} onClick={() => {
            setEditingCustomerId(null);
            setCustomerInput({ name: "", code: "", mobile: "", orderPackaging: "", orderQty: "", remarks: "", paymentMethod: "", photo: null });
          }} onMouseOver={(e) => e.target.style.background = "#4b5563"} onMouseOut={(e) => e.target.style.background = "#6b7280"}>
            ✕ Cancel
          </button>
        )}
          </div>
        )}
      </div>

      {/* Customers Table - Responsive */}
      {customers.length > 0 && (
        <div style={{ marginTop: 24, background: "#fff", borderRadius: 14, boxShadow: "0 4px 24px rgba(37, 99, 235, 0.15)", border: "2px solid #e0e7ff", overflow: "hidden" }}>
          {/* Collapsible Header */}
          <div
            onClick={() => setIsCustomersCollapsed(!isCustomersCollapsed)}
            style={{
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              color: "#fff",
              padding: "14px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
              userSelect: "none",
              transition: "all 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.background = "linear-gradient(135deg, #0369a1 0%, #0166a8 100%)"}
            onMouseOut={(e) => e.currentTarget.style.background = "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)"}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: "1.15em", letterSpacing: "0.05em" }}>
                👥 CUSTOMERS
              </h3>
              <div style={{ background: "rgba(255,255,255,0.2)", padding: "4px 12px", borderRadius: 8, fontSize: "0.9em", fontWeight: 700 }}>
                <span style={{ fontSize: "1.1em" }}>{filteredCustomersByMember.length}</span>
              </div>
            </div>
            <button
              type="button"
              style={{
                background: "rgba(255,255,255,0.2)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.4)",
                padding: "4px 10px",
                borderRadius: 6,
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "0.8em",
                transition: "all 0.2s"
              }}
              onMouseOver={(e) => {
                e.target.style.background = "rgba(255,255,255,0.3)";
              }}
              onMouseOut={(e) => {
                e.target.style.background = "rgba(255,255,255,0.2)";
              }}
            >
              {isCustomersCollapsed ? "▶" : "▼"}
            </button>
          </div>

          {!isCustomersCollapsed && (
            <div style={{ padding: "16px 18px" }}>
              {/* Search and Filter */}
              <div style={{ marginBottom: 16, display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "flex-end" }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: "0.9em", color: "#374151" }}>Search Customer:</label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#2563eb", fontSize: "1.2em" }}>🔍</span>
                    <input
                      type="text"
                      placeholder="Search by name, mobile, or code..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px 10px 40px",
                        border: "1.5px solid #d1d5db",
                        borderRadius: 6,
                        fontSize: "0.95em",
                        transition: "all 0.2s",
                        boxShadow: searchTerm ? "0 2px 8px rgba(37, 99, 235, 0.15)" : "none",
                        borderColor: searchTerm ? "#2563eb" : "#d1d5db"
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#2563eb";
                        e.target.style.boxShadow = "0 2px 8px rgba(37, 99, 235, 0.15)";
                      }}
                      onBlur={(e) => {
                        if (!searchTerm) {
                          e.target.style.borderColor = "#d1d5db";
                          e.target.style.boxShadow = "none";
                        }
                      }}
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        style={{
                          position: "absolute",
                          right: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          fontSize: "1.1em",
                          cursor: "pointer",
                          color: "#9ca3af",
                          padding: "4px 8px",
                          transition: "color 0.2s"
                        }}
                        onMouseOver={(e) => e.target.style.color = "#2563eb"}
                        onMouseOut={(e) => e.target.style.color = "#9ca3af"}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Dropdown */}
                <select
                  value={filterByMember}
                  onChange={(e) => setFilterByMember(e.target.value)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 6,
                    border: "1.5px solid #d1d5db",
                    background: "#fff",
                    fontSize: "0.95em",
                    fontWeight: 600,
                    color: "#1f2937",
                    cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    transition: "border-color 0.2s"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#2563eb";
                    e.target.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#d1d5db";
                    e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
                  }}
                >
                  <option value="all">🔷 All Members</option>
                  {uniqueMembers.map((member) => (
                    <option key={member.email} value={member.email}>
                      {member.email === currentUserEmail ? `👤 ${member.name} (You)` : `👤 ${member.name}`}
                    </option>
                  ))}
                </select>
              </div>
          
          {/* Card View */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {filteredCustomersByMember.map((c) => (
              <div
                key={c.id}
                style={{
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  padding: 14,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
              >
                {/* Header with Photo and Name */}
                <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "flex-start" }}>
                  <div>
                    {c.photo ? (
                      <img src={c.photo} alt="customer" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 6, border: "1px solid #d1d5db" }} />
                    ) : (
                      <div style={{ width: 60, height: 60, background: "#f3f4f6", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: "1.5em" }}>👤</div>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "1.05em", color: "#1f2937" }}>{c.name}</div>
                    <div style={{ fontSize: "0.85em", color: "#6b7280", marginTop: 2 }}>📱 {c.mobile}</div>
                  </div>
                </div>

                {/* Details Grid */}
                <div style={{ background: "#f9fafb", borderRadius: 6, padding: 10, marginBottom: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: "0.9em" }}>
                    <div>
                      <div style={{ color: "#6b7280", fontSize: "0.8em" }}>📦 Packaging</div>
                      <div style={{ fontWeight: 600, color: "#1f2937", marginTop: 2 }}>{c.orderPackaging}</div>
                    </div>
                    <div>
                      <div style={{ color: "#6b7280", fontSize: "0.8em" }}>📊 Qty</div>
                      <div style={{ fontWeight: 600, color: "#2563eb", marginTop: 2 }}>{c.orderQty}</div>
                    </div>
                  </div>
                </div>

                {/* Payment & Remarks */}
                <div style={{ marginBottom: 10, fontSize: "0.85em" }}>
                  <div style={{ color: "#6b7280" }}>💳 Payment Method:</div>
                  <div style={{ fontWeight: 600, color: c.paymentMethod === 'CASH' ? '#dc2626' : '#0369a1', marginTop: 2 }}>
                    {c.paymentMethod || "—"}
                  </div>
                </div>

                {c.remarks && (
                  <div style={{ marginBottom: 10, fontSize: "0.85em" }}>
                    <div style={{ color: "#6b7280" }}>📝 Remarks:</div>
                    <div style={{ color: "#374151", marginTop: 2 }}>{c.remarks}</div>
                  </div>
                )}

                {/* Added By */}
                <div style={{ fontSize: "0.8em", color: "#6b7280", paddingTop: 10, borderTop: "1px solid #e5e7eb", marginBottom: 10 }}>
                  👤 Added by: <span style={{ color: "#2563eb", fontWeight: 600 }}>{c.addedByUsername || c.addedByDisplayName || c.addedBy}</span>
                </div>
                {/* Action Buttons */}
                {canEditCustomer(c) && (
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button
                      onClick={() => handleEditCustomer(c)}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        background: "#3b82f6",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        fontSize: "0.85em",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                      onMouseOver={(e) => e.target.style.background = "#2563eb"}
                      onMouseOut={(e) => e.target.style.background = "#3b82f6"}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleRemoveCustomer(c.id)}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        background: "#ef4444",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        fontSize: "0.85em",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                      onMouseOver={(e) => e.target.style.background = "#dc2626"}
                      onMouseOut={(e) => e.target.style.background = "#ef4444"}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
            </div>
            </div>
          )}
        </div>
      )}

      {/* Stock Inventory by Packaging Dashboard - Synced with DemoSalesList */}
      {selectedVillageid && (
        <div style={{ marginTop: 32, marginBottom: 28 }}>
          <h3 style={{ color: "#174ea6", fontWeight: 700, marginBottom: 20, fontSize: "1.5rem" }}>📦 STOCK INVENTORY BY PACKAGING</h3>
          <div style={{ overflowX: "auto", borderRadius: 8, border: "2px solid #d1d5db", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#2563eb", fontWeight: 700, color: "#fff" }}>
                  <th style={{ padding: "14px 16px", textAlign: "left", borderRight: "1px solid #1e40af" }}>📌 Package Name</th>
                  <th style={{ padding: "14px 16px", textAlign: "center", borderRight: "1px solid #1e40af" }}>📦 Taken</th>
                  <th style={{ padding: "14px 16px", textAlign: "center", borderRight: "1px solid #1e40af" }}>💰 Sold</th>
                  <th style={{ padding: "14px 16px", textAlign: "center", borderRight: "1px solid #1e40af" }}>🏭 At Dairy</th>
                  <th style={{ padding: "14px 16px", textAlign: "center", borderRight: "1px solid #1e40af" }}>↩️ Returned</th>
                  <th style={{ padding: "14px 16px", textAlign: "center" }}>📈 Remaining</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const packagingMap = {};

                  // Process taken stock from Firebase (synced from DemoSalesList)
                  demoStockTaken.forEach(s => {
                    if (!packagingMap[s.packaging]) {
                      packagingMap[s.packaging] = { taken: 0, sold: 0, dairy: 0, returned: 0 };
                    }
                    packagingMap[s.packaging].taken += parseInt(s.quantity) || 0;
                  });

                  // Process dairy stock from Firebase (synced from DemoSalesList)
                  demoStockAtDairy.forEach(s => {
                    if (!packagingMap[s.packaging]) {
                      packagingMap[s.packaging] = { taken: 0, sold: 0, dairy: 0, returned: 0 };
                    }
                    packagingMap[s.packaging].dairy += parseInt(s.quantity) || 0;
                  });

                  // Process returned stock
                  stockReturned.forEach(s => {
                    if (!packagingMap[s.packaging]) {
                      packagingMap[s.packaging] = { taken: 0, sold: 0, dairy: 0, returned: 0 };
                    }
                    packagingMap[s.packaging].returned += parseInt(s.quantity) || 0;
                  });

                  // Process sold from manual and excel customers (including scheme handling)
                  const processCustomer = (c) => {
                    if (c.orderPackaging) {
                      // Check if it's a scheme
                      const scheme = onePlusOneSchemes.find(s => s.label === c.orderPackaging);
                      const qty = parseInt(c.orderQty) || 1;

                      if (scheme && scheme.parts) {
                        // Deduct each part of the scheme
                        scheme.parts.forEach(part => {
                          if (!packagingMap[part]) {
                            packagingMap[part] = { taken: 0, sold: 0, dairy: 0, returned: 0 };
                          }
                          packagingMap[part].sold += qty; // qty of schemes = qty of each part
                        });
                      } else {
                        // Single packaging
                        if (!packagingMap[c.orderPackaging]) {
                          packagingMap[c.orderPackaging] = { taken: 0, sold: 0, dairy: 0, returned: 0 };
                        }
                        packagingMap[c.orderPackaging].sold += qty;
                      }
                    }
                  };

                  customers.forEach(processCustomer);
                  excelCustomers.forEach(processCustomer);

                  // Convert to array and sort
                  const packagingArray = Object.keys(packagingMap).map(pkg => ({
                    name: pkg,
                    ...packagingMap[pkg],
                    remaining: packagingMap[pkg].taken - packagingMap[pkg].sold - packagingMap[pkg].dairy + packagingMap[pkg].returned
                  })).sort((a, b) => a.name.localeCompare(b.name));

                  if (packagingArray.length === 0) {
                    return (
                      <tr>
                        <td colSpan="6" style={{ padding: "20px", textAlign: "center", color: "#9ca3af" }}>
                          No stock data available. Add stock from DemoSalesList or other sources.
                        </td>
                      </tr>
                    );
                  }

                  return packagingArray.map((pkg, idx) => (
                    <tr key={pkg.name} style={{ background: idx % 2 === 0 ? "#f9fafb" : "#fff", borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "14px 16px", fontWeight: 600, color: "#1f2937" }}>{pkg.name}</td>
                      <td style={{ padding: "14px 16px", textAlign: "center", fontWeight: 600, color: "#0284c7" }}>{pkg.taken}</td>
                      <td style={{ padding: "14px 16px", textAlign: "center", fontWeight: 600, color: "#a855f7" }}>{pkg.sold}</td>
                      <td style={{ padding: "14px 16px", textAlign: "center", fontWeight: 600, color: "#ea580c" }}>{pkg.dairy}</td>
                      <td style={{ padding: "14px 16px", textAlign: "center", fontWeight: 600, color: "#16a34a" }}>{pkg.returned}</td>
                      <td style={{ 
                        padding: "14px 16px", 
                        textAlign: "center", 
                        fontWeight: 700, 
                        color: pkg.remaining >= 0 ? "#22c55e" : "#ef4444",
                        background: pkg.remaining >= 0 ? "#f0fdf4" : "#fef2f2",
                        borderRadius: "6px"
                      }}>
                        {pkg.remaining} {pkg.remaining < 0 && "⚠️"}
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12, padding: "12px 16px", background: "rgba(2, 132, 199, 0.1)", borderRadius: 8, border: "1px solid #0284c7" }}>
            <p style={{ margin: 0, color: "#0369a1", fontSize: "0.9em", fontWeight: 600 }}>
              💡 <strong>Synced with DemoSalesList:</strong> Stock data automatically syncs across both pages. Add stock in DemoSalesList and it will appear here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
 
 
 
