
import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import notoSansGujarati from "./fonts/NotoSansGujarati-Regular.js";
import { saveAs } from "file-saver";
import { where, writeBatch, collection, addDoc, Timestamp, doc, getDocs ,  serverTimestamp, query, onSnapshot, getDoc } from "firebase/firestore";
import { db, storage } from "./firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import Navbar from "./Navbar";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import "./form.css";
import { toast } from "react-toastify";
import { deleteDoc, updateDoc } from "firebase/firestore";
import ExcelJS from "exceljs";



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

const initialDemoInfo = {
  date: "",
  village: "",
  taluka: "",
  mantri: "",
  totalMilk: "",
  activeSabhasad: "",
  latitude: "",
  longitude: "",
  entryBy: "",
  teamMembers: "",
  demoRemarks: "",
};

const initialCustomer = {
  name: "",
  code: "",
  mobile: "",
  remarks: "",
  orderPackaging: "",
  orderQty: "",
  schemeKey: "",
  manualOffer: "",
};

const initialStock = {
  packaging: "",
  quantity: "",
};

const DemoSalesList = () => {
  
  // State for new village input
  const [newVillageName, setNewVillageName] = useState("");
  const [excelData, setExcelData] = useState([]);
  const [demoInfo, setDemoInfo] = useState(initialDemoInfo);
  const [customers, setCustomers] = useState([]);
  const [customerInput, setCustomerInput] = useState(initialCustomer);
  
  const [photoCapture, setPhotoCapture] = useState("environment");
const [selectedVillage, setSelectedVillage] = useState("");

  // Listen to customers collection for selected village (by villageId, which is the doc ID)
  const [villageOptions, setVillageOptions] = useState([]);
  const [selectedVillageId, setSelectedVillageId] = useState("");

  // 👇 function must be here inside DemoSalesList
 //const [editingIdx, setEditingIdx] = useState(null);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [editingIdx, setEditingIdx] = useState(null);



const [lastAddedCustomer, setLastAddedCustomer] = useState(null);
  // Fetch all villages for dropdown and set selectedVillageId when demoInfo.village changes
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "villages"), (snapshot) => {
      const options = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      setVillageOptions(options);
      // If demoInfo.village is set by name, find its ID
      if (demoInfo.village) {
        const found = options.find(v => v.name === demoInfo.village);
        if (found) setSelectedVillageId(found.id);
      }
    });
    return () => unsub();
  }, [demoInfo.village]);

  useEffect(() => {
  if (!selectedVillageId) return;

  const fetchVillage = async () => {
    const docRef = doc(db, "villages", selectedVillageId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      setSelectedVillage({ id: snap.id, name: snap.data().name });
    }
  };

  fetchVillage();
}, [selectedVillageId]);


  // Listen to customers for selectedVillageId and update entryBy in demoInfo
  useEffect(() => {
    if (!selectedVillageId) {
      setCustomers([]);
      setDemoInfo(prev => ({ ...prev, entryBy: "" }));
      return;
    }
    const q = query(
      collection(db, "customers"),
      where("villageId", "==", selectedVillageId)
    );
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      // Map docs to data and sort by createdAt (ascending) to preserve input order
      const list = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          const at = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : (a.createdAt ? a.createdAt : 0);
          const bt = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : (b.createdAt ? b.createdAt : 0);
          return at - bt;
        });
      setCustomers(list);
      // Get all unique addedByEmail from customers
      const emails = Array.from(new Set(list.map(c => c.addedByEmail || c.addedBy || "").filter(Boolean)));
      // Fetch usernames/displayNames for these emails from users collection
      if (emails.length === 0) {
        setDemoInfo(prev => ({ ...prev, entryBy: "" }));
        return;
      }
      const usersSnapshot = await getDocs(query(collection(db, "users"), where("email", "in", emails)));
      const userMap = {};
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        userMap[data.email] = data.username || data.displayName || data.email;
      });
  // Compose teamMembers string
  const teamNames = emails.map(email => userMap[email] || email);
  setDemoInfo(prev => ({ ...prev, teamMembers: teamNames.join(", ") }));
    });
    return () => unsubscribe();
  }, [selectedVillageId]);

  // When user selects a village from dropdown, update both demoInfo.village (name) and selectedVillageId (id)
  const handleVillageSelect = (e) => {
    const id = e.target.value;
    setSelectedVillageId(id);
    const found = villageOptions.find(v => v.id === id);
    setDemoInfo(prev => ({ ...prev, village: found ? found.name : "" }));
  };


  const handleCustomerInput = (e) => {
    const { name, value } = e.target;
    setCustomerInput((prev) => ({ ...prev, [name]: value }));
  };

  const handleCustomerPhotoChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // Upload to Firebase Storage and save download URL to state
    try {
      const storageRef = ref(storage, `customers/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      uploadTask.on(
        "state_changed",
        () => {},
        (err) => {
          console.error("Upload error:", err);
          toast.error("Failed to upload photo");
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setCustomerInput((prev) => ({ ...prev, photo: url }));
        }
      );
      // show temporary preview while upload (optional)
      const tmpReader = new FileReader();
      tmpReader.onload = () => setCustomerInput((prev) => ({ ...prev, photoPreview: tmpReader.result }));
      tmpReader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      toast.error("Photo upload failed: " + (err.message || err));
    }
  };


  const [stock, setStock] = useState([]);
  const [stockInput, setStockInput] = useState(initialStock);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerData, setCustomerData] = useState([]); // from Excel

  const [randomWinners, setRandomWinners] = useState({ small: null, large: null });

  const [waSummary, setWASummary] = useState("");
  // scheme state removed; 1+1 combos will be chosen from Packaging select

  // Predefined 1+1 scheme combinations: map key -> {label, offer}
  const onePlusOneSchemes = [
    { label: "1L Plastic + 1L Plastic", key: "1P_1P", base: 145 + 145, offer: 250, parts: ["1L Plastic", "1L Plastic"] },
    { label: "1L Plastic + 2L Plastic", key: "1P_2P", base: 145 + 275, offer: 360, parts: ["1L Plastic", "2L Plastic"] },
    { label: "1L Plastic + 5L Plastic", key: "1P_5P", base: 145 + 665, offer: 690, parts: ["1L Plastic", "5L Plastic"] },
    { label: "1L Plastic + 5L Steel", key: "1P_5S", base: 145 + 890, offer: 880, parts: ["1L Plastic", "5L Steel"] },
    { label: "1L Plastic + 10L Plastic", key: "1P_10P", base: 145 + 1340, offer: 1260, parts: ["1L Plastic", "10L Plastic"] },
    { label: "1L Plastic + 10L Steel", key: "1P_10S", base: 145 + 1770, offer: 1630, parts: ["1L Plastic", "10L Steel"] },
    { label: "1L Plastic + 20L Can", key: "1P_20C", base: 145 + 3250, offer: 2885, parts: ["1L Plastic", "20L Can"] },
    { label: "1L Plastic + 20L Steel", key: "1P_20S", base: 145 + 3520, offer: 3115, parts: ["1L Plastic", "20L Steel"] },
    { label: "2L Plastic + 2L Plastic", key: "2P_2P", base: 275 + 275, offer: 470, parts: ["2L Plastic", "2L Plastic"] },
    { label: "2L Plastic + 5L Plastic", key: "2P_5P", base: 275 + 665, offer: 800, parts: ["2L Plastic", "5L Plastic"] },
    { label: "2L Plastic + 5L Steel", key: "2P_5S", base: 275 + 890, offer: 990, parts: ["2L Plastic", "5L Steel"] },
    { label: "2L Plastic + 10L Plastic", key: "2P_10P", base: 275 + 1340, offer: 1370, parts: ["2L Plastic", "10L Plastic"] },
    { label: "2L Plastic + 10L Steel", key: "2P_10S", base: 275 + 1770, offer: 1740, parts: ["2L Plastic", "10L Steel"] },
    { label: "2L Plastic + 20L Can", key: "2P_20C", base: 275 + 3250, offer: 3000, parts: ["2L Plastic", "20L Can"] },
    { label: "2L Plastic + 20L Steel", key: "2P_20S", base: 275 + 3520, offer: 3225, parts: ["2L Plastic", "20L Steel"] },
    { label: "5L Plastic + 5L Plastic", key: "5P_5P", base: 665 + 665, offer: 1130, parts: ["5L Plastic", "5L Plastic"] },
    { label: "5L Plastic + 5L Steel", key: "5P_5S", base: 665 + 890, offer: 1320, parts: ["5L Plastic", "5L Steel"] },
    { label: "5L Plastic + 10L Plastic", key: "5P_10P", base: 665 + 1340, offer: 1700, parts: ["5L Plastic", "10L Plastic"] },
    { label: "5L Plastic + 10L Steel", key: "5P_10S", base: 665 + 1770, offer: 2070, parts: ["5L Plastic", "10L Steel"] },
    { label: "5L Plastic + 20L Can", key: "5P_20C", base: 665 + 3250, offer: 3330, parts: ["5L Plastic", "20L Can"] },
    { label: "5L Plastic + 20L Steel", key: "5P_20S", base: 665 + 3520, offer: 3560, parts: ["5L Plastic", "20L Steel"] },
    { label: "5L Steel + 5L Steel", key: "5S_5S", base: 890 + 890, offer: 1515, parts: ["5L Steel", "5L Steel"] },
    { label: "5L Steel + 10L Plastic", key: "5S_10P", base: 890 + 1340, offer: 1895, parts: ["5L Steel", "10L Plastic"] },
    { label: "5L Steel + 10L Steel", key: "5S_10S", base: 890 + 1770, offer: 2260, parts: ["5L Steel", "10L Steel"] },
    { label: "5L Steel + 20L Can", key: "5S_20C", base: 890 + 3250, offer: 3520, parts: ["5L Steel", "20L Can"] },
    { label: "5L Steel + 20L Steel", key: "5S_20S", base: 890 + 3520, offer: 3750, parts: ["5L Steel", "20L Steel"] },
    { label: "10L Plastic + 10L Plastic", key: "10P_10P", base: 1340 + 1340, offer: 2280, parts: ["10L Plastic", "10L Plastic"] },
    { label: "10L Plastic + 10L Steel", key: "10P_10S", base: 1340 + 1770, offer: 2650, parts: ["10L Plastic", "10L Steel"] },
    { label: "10L Plastic + 20L Can", key: "10P_20C", base: 1340 + 3250, offer: 3900, parts: ["10L Plastic", "20L Can"] },
    { label: "10L Plastic + 20L Steel", key: "10P_20S", base: 1340 + 3520, offer: 4135, parts: ["10L Plastic", "20L Steel"] },
    { label: "10L Steel + 10L Steel", key: "10S_10S", base: 1770 + 1770, offer: 3050, parts: ["10L Steel", "10L Steel"] },
    { label: "10L Steel + 20L Can", key: "10S_20C", base: 1770 + 3250, offer: 4270, parts: ["10L Steel", "20L Can"] },
    { label: "10L Steel + 20L Steel", key: "10S_20S", base: 1770 + 3520, offer: 4500, parts: ["10L Steel", "20L Steel"] },
    { label: "20L Can + 20L Can", key: "20C_20C", base: 3250 + 3250, offer: 5530, parts: ["20L Can", "20L Can"] },
    { label: "20L Steel + 20L Can", key: "20S_20C", base: 3520 + 3250, offer: 5750, parts: ["20L Steel", "20L Can"] },
    { label: "20L Steel + 20L Steel", key: "20S_20S", base: 3520 + 3520, offer: 6000, parts: ["20L Steel", "20L Steel"] },
  ];

  // helper to get scheme details
  const getOnePlusOneByKey = (key) => onePlusOneSchemes.find((s) => s.key === key) || null;
  const [waCopied, setWACopied] = useState(false);
  const [demos, setDemos] = useState([]);
  const [demoId, setDemoId] = useState(null);

async function startDemo() {
  const villageName =
    demoInfo.village ||
    villageOptions.find(v => v.id === selectedVillageId)?.name;

  if (!villageName) {
    toast.error("⚠️ Please select a village first!");
    return;
  }

  const docRef = await addDoc(collection(db, "demosales"), {
    village: villageName,
    customers: [],
    status: "active",
    isAvailableForMembers: false,
    createdAt: new Date(),
  });

  setDemoId(docRef.id);
  toast.success("Demo started!");
}

// Save demoInfo to localStorage on every change
useEffect(() => {
  localStorage.setItem("demoInfo", JSON.stringify(demoInfo));
}, [demoInfo]);


  const addCustomer = async () => {
  if (!customerInput.name || !customerInput.mobile) {
    toast.error("⚠️ Name and Mobile are required");
    return;
  }

  const newCustomer = { ...customerInput };
  // attach scheme information if applicable
  // Detect if selected packaging is a predefined 1+1 combo
  const detectedScheme = onePlusOneSchemes.find((s) => s.label === newCustomer.orderPackaging);
  if (detectedScheme) {
    newCustomer.schemeType = "1+1";
    newCustomer.schemeKey = detectedScheme.key;
    newCustomer.appliedPrice = detectedScheme.offer;
  } else if (newCustomer.manualOffer) {
    newCustomer.schemeType = "CASH_DISCOUNT";
    newCustomer.appliedPrice = parseInt(newCustomer.manualOffer || "") || null;
  }

  // Optionally save to Firestore
  if (selectedVillageId) {
    try {
      const firestoreCustomer = { ...newCustomer };
      // If upload still in progress, warn and prevent premature save
      if (uploadingPhoto) {
        toast.error('Please wait until photo upload completes');
        setSubmitting(false);
        return;
      }
      // Fallback: if photo URL not present but we have a preview (data URL), save preview
      const photoToSave = firestoreCustomer.photo || firestoreCustomer.photoPreview || null;
      await addDoc(collection(db, "customers"), {
        ...firestoreCustomer,
        photo: photoToSave,
        villageId: selectedVillageId,
        createdAt: serverTimestamp(),
      });
      toast.success("✅ Customer added to Firestore");
    } catch (err) {
      toast.error("❌ Failed to add customer: " + err.message);
    }
  }

  setCustomers(prev => [...prev, newCustomer]); // add locally to state
  setCustomerInput(initialCustomer); // reset form
  setEditingIdx(null);
};

// Upload customers (Excel parsing placeholder)
  async function uploadCustomers() {
    const dummyCustomers = [
      { name: "Customer A", phone: "123" },
      { name: "Customer B", phone: "456" },
    ];
    await updateDoc(doc(db, "demosales", demoId), {
      customers: dummyCustomers,
    });
    setCustomers(dummyCustomers);
    alert("Customers added!");
  }


  const handleDemoInfoChange = (e) => {
    const { name, value } = e.target;
    setDemoInfo((prev) => ({ ...prev, [name]: value }));
  };

const handleRemoveCustomer = async (customerId) => {
  if (!window.confirm("Are you sure you want to delete this customer?")) return;

  try {
    await deleteDoc(doc(db, "customers", customerId));

    // Optional: also remove from demosales subcollection if present
    const q = query(collection(db, "demosales"));
    const snap = await getDocs(q);
    snap.forEach(async demo => {
      const demoCustomerRef = doc(db, "demosales", demo.id, "customers", customerId);
      try { await deleteDoc(demoCustomerRef); } catch(e) {}
    });
    
    toast.success("Customer removed successfully");
  } catch (err) {
    console.error(err);
    toast.error("Failed to remove customer");
  }
};
// Removed setDemoData and related useEffect as it's not used anymore

  // Fill "entryBy" from Firebase Auth profile
  // Fill "entryBy" from Firebase Auth profile
useEffect(() => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) return;

  // Only update if entryBy is empty
  if (!demoInfo.entryBy) {
    const q = query(collection(db, "users"), where("email", "==", currentUser.email));
    getDocs(q).then((snapshot) => {
      let username = "";
      let displayName = currentUser.displayName || "";
      let email = currentUser.email || "";
      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data();
        username = userData.username || "";
      }
      setDemoInfo(prev => ({
        ...prev,
        entryBy: prev.entryBy || username || displayName || email,
      }));
    });
  }
}, [demoInfo.entryBy]);





async function addCustomerToSubcollection(demoId, c, userName){
await addDoc(collection(db, "demosales", demoId, "customers"), {
  ...newCustomer,
  orderQty: String(newCustomer.orderQty || "0"),
  addedBy: demoInfo.entryBy || "Leader",
  addedAt: serverTimestamp(),
});

}
  // Location
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setDemoInfo((prev) => ({
          ...prev,
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
        }));
      },
      (error) => {
        alert("Error getting location: " + error.message);
      }
    );
  };


  const handleExcelUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!selectedVillageId) {
      toast.error("⚠️ Please select a village first before uploading Excel.");
      return;
    }

    const toastId = toast.info(`⏳ Uploading "${file.name}"...`, { autoClose: false, isLoading: true });

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.worksheets[0];

      if (!worksheet) {
        toast.dismiss(toastId);
        toast.error("❌ Excel file is empty or invalid!");
        return;
      }

      // Read header row
      const headerRow = worksheet.getRow(1);
      const headers = headerRow.values.slice(1).map(h => (h || "").toString().trim());

      const rows = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // skip header
        const vals = row.values.slice(1);
        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = vals[idx] !== undefined && vals[idx] !== null ? vals[idx] : "";
        });
        rows.push(obj);
      });

      // Map rows to normalized objects (adapt common header names)
      const normalizedData = rows
        .map((r) => ({
          code: (r.code || r.Code || r[Object.keys(r)[0]] || "")?.toString().trim(),
          name: (r.name || r.Name || r[Object.keys(r)[1]] || "")?.toString().trim(),
          mobile: (r.mobile || r.Mobile || r.phone || r.Phone || r[Object.keys(r)[3]] || "")?.toString().trim(),
        }))
        .filter((c) => c.name || c.code || c.mobile);

      if (!normalizedData.length) {
        toast.dismiss(toastId);
        toast.error("❌ No valid customer data found in Excel!");
        return;
      }

      // Update local state
      setExcelData((prev) => [...prev, ...normalizedData]);
      setCustomerData((prev) => [...prev, ...normalizedData]);

      // Firestore batch write
      const batch = writeBatch(db);
      const colRef = collection(db, "excelCustomers", selectedVillageId, "customers");

      normalizedData.forEach((c) => {
        const docRef = doc(colRef);
        batch.set(docRef, { ...c, villageId: selectedVillageId, createdAt: serverTimestamp() });
      });

      await batch.commit();

      toast.dismiss(toastId);
      toast.success(`✅ Excel file "${file.name}" uploaded successfully!`);
    } catch (err) {
      console.error("Excel upload failed:", err);
      try { toast.dismiss(toastId); } catch (e) {}
      toast.error("❌ Error uploading customers: " + (err && err.message ? err.message : err));
    }
  };


const handleCancelExcelUpload = () => {
  if (!excelData.length) return;
  setExcelData([]);
  setCustomerData([]);
  toast.info("❌ Excel upload canceled");
};
  const [searchTerm, setSearchTerm] = useState("");
const [filteredCustomers, setFilteredCustomers] = useState([]);

useEffect(() => {
  if (!searchTerm) {
    setFilteredCustomers([]);
    return;
  }

  const searchLower = searchTerm.toLowerCase(); // 👈 fix

  const results = customerData
    .filter(c =>
      (c.name || "").toLowerCase().includes(searchLower) ||
      (c.mobile || "").toLowerCase().includes(searchLower) ||
      (c.code || "").toLowerCase().includes(searchLower)
    )
    .slice(0, 5);

  setFilteredCustomers(results);
}, [searchTerm, customerData]);

  // Stock section
  const handleStockInput = (e) => {
    const { name, value } = e.target;
    setStockInput((prev) => ({ ...prev, [name]: value }));
  };

  const addStock = (e) => {
    e.preventDefault();
    setStock((prev) => [...prev, stockInput]);
    setStockInput(initialStock);
  };

  const removeStock = (idx) => {
    setStock(stock.filter((_, i) => i !== idx));
  };

  


  const handleQuantityChange = (e, index) => {
    const newQuantity = parseFloat(e.target.value) || 0;
    const updated = [...stock];
    updated[index].quantity = newQuantity;
    setStock(updated);
  };



const handleEditCustomer = (customer) => {
  console.log("EDIT CLICKED →", customer);
  
  setCustomerInput({
    name: customer.name || "",
    code: customer.code || "",
    mobile: customer.mobile || "",
    orderPackaging: customer.orderPackaging || "",
    orderQty: customer.orderQty || "",
    remarks: customer.remarks || "",
    photo: customer.photo || null,
    schemeKey: customer.schemeKey || "",
    manualOffer: customer.manualOffer || "",
  });

  setEditingCustomerId(customer.id); // VERY IMPORTANT
};


const handleUpdateCustomer = async () => {
  if (!editingCustomerId) return;
  if (uploadingPhoto) {
    toast.error('Please wait until photo upload completes');
    return;
  }
  try {
    await updateDoc(doc(db, "customers", editingCustomerId), { ...customerInput });
    toast.success("Customer updated successfully");
   setEditingCustomerId(null);
setCustomerInput(initialCustomer);
setSearchTerm("");
         // clears input field
  setFilteredCustomers([]);
  } catch(err) {
    console.error(err);
    toast.error("Failed to update customer");
  }
};


const handleSelectExcelCustomer = (customer) => {
  setCustomerInput({
    name: customer.name,
    code: customer.code,
    mobile: customer.mobile,
    orderPackaging: customer.orderPackaging || "",
    orderQty: customer.orderQty || "",
    remarks: customer.remarks || "",
  });

  // Reset search state
  setSearchTerm("");          // clears input field
  setFilteredCustomers([]);   // hides dropdown
};


  // Submit to Firestore
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setMsg("");

  

    setSubmitting(true);
    try {
      await addDoc(collection(db, "demoForms"), {
        ...demoInfo,
        customers,
        stockAtDairy: stock,
        createdAt: Timestamp.now(),
      });

      await addDoc(collection(db, "demoHistory"), {
        ...demoInfo,
        customers,
        stockAtDairy: stock,
        savedAt: Timestamp.now(),
      });

      setMsg("Demo sales record submitted and saved to history!");
      setDemoInfo(initialDemoInfo);
      setCustomers([]);
      setCustomerInput(initialCustomer);
      setStock([]);
      setStockInput(initialStock);
      //setEditingIdx(null);
    } catch (err) {
      setSubmitError("Error saving to Firestore: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // PDF export
  const handleExportExcel = async () => {
    try {
      if (customers.length === 0) {
        toast.error("No customers to export");
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Demo Register");

      const resolvedVillage = demoInfo.village || (villageOptions.find(v => v.id === selectedVillageId)?.name) || "-";
      const resolvedTaluka = demoInfo.taluka || "-";
      const resolvedMantri = demoInfo.mantri || "-";
      const resolvedDate = demoInfo.date || "-";

      sheet.mergeCells("A1:H1");
      sheet.getCell("A1").value = `Village: ${resolvedVillage}    Taluka: ${resolvedTaluka}`;
      sheet.mergeCells("A2:H2");
      sheet.getCell("A2").value = `Mantri: ${resolvedMantri}`;
      sheet.mergeCells("A3:H3");
      sheet.getCell("A3").value = `Date: ${resolvedDate}`;

      sheet.addRow([]);
      sheet.addRow([]);
      sheet.addRow(["No", "Name", "Photo", "Mobile Number", "Receipt No", "Packaging", "Quantity", "Amount", "Date / Installment"]);
      sheet.getRow(5).font = { bold: true };

      const exportCustomers = [...customers];
      const hasPending = (customerInput && (customerInput.name || customerInput.mobile || customerInput.code || customerInput.orderQty));
      if (hasPending) exportCustomers.push({ ...customerInput });

      let grandTotal = 0;

      const getBase64FromUrl = async (url) => {
        if (!url) return null;
        if (url.startsWith('data:')) return url.split(',')[1];
        const res = await fetch(url);
        const blob = await res.blob();
        return await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      };

      for (let i = 0; i < exportCustomers.length; i++) {
        const c = exportCustomers[i];
        const qty = parseInt(c.orderQty) || 0;
        let rate = 0;
        if (c.appliedPrice) {
          rate = parseInt(c.appliedPrice) || 0;
        } else {
          const match = packagingOptions.find((opt) => opt.startsWith(c.orderPackaging));
          rate = match ? parseInt((match.match(/₹\s*([\d,]+)/) || [])[1]?.replace(/,/g, "") || 0) : 0;
        }
        const total = rate * qty;
        grandTotal += total;

        sheet.addRow([i + 1, c.name || "", "", c.mobile || "", c.code || "", c.orderPackaging || "", qty, total, demoInfo.date || ""]);
        const rowNumber = sheet.lastRow.number;
        sheet.getRow(rowNumber).height = 60;
        try {
          if (c.photo) {
            const base64 = await getBase64FromUrl(c.photo);
            if (base64) {
              const ext = c.photo.includes('png') ? 'png' : 'jpeg';
              const imageId = workbook.addImage({ base64, extension: ext });
              sheet.addImage(imageId, { tl: { col: 2, row: rowNumber - 1 }, ext: { width: 90, height: 60 } });
            }
          }
        } catch (err) {
          console.warn('Failed to attach image for', c.name, err);
        }
      }

      sheet.addRow([]);
      sheet.addRow(["Total Customers", customers.length]);
      sheet.addRow(["Grand Total Amount", grandTotal]);

      sheet.columns.forEach((col, idx) => {
        if ((idx + 1) === 3) col.width = 15; else col.width = 22;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Demo_Register_${demoInfo.village || "export"}.xlsx`);
    } catch (err) {
      console.error('Excel export failed:', err);
      toast.error('❌ Excel export failed: ' + (err.message || err));
    }
  };
  const handleExportPDF = () => {
    const doc = new jsPDF();

    if (notoSansGujarati && notoSansGujarati.fontName && notoSansGujarati.fontData) {
      doc.addFileToVFS("NotoSansGujarati-Regular.ttf", notoSansGujarati.fontData);
      doc.addFont("NotoSansGujarati-Regular.ttf", "NotoSansGujarati", "normal");
    }

    let y = 10;
    doc.setFontSize(16);
    doc.text("Demo Sales Report", 14, y);
    y += 10;

    doc.setFontSize(11);
    const lines = [
      `Date: ${demoInfo.date || "-"}`,
      `Village: ${demoInfo.village || "-"}`,
      `Taluka: ${demoInfo.taluka || "-"}`,
      `Mantri: ${demoInfo.mantri || "-"}`,
      `Total Milk: ${demoInfo.totalMilk || "-"}`,
      `Active Sabhasad: ${demoInfo.activeSabhasad || "-"}`,
      `Team Members: ${demoInfo.teamMembers || "-"}`,
      `Entry By: ${demoInfo.entryBy || "-"}`,
      `Demo Remarks: ${demoInfo.demoRemarks || "-"}`,
    ];
    lines.forEach((t) => {
      doc.text(t, 14, y);
      y += 7;
    });
    y += 3;

  // Allow PDF export even if no customers
  if (customers.length > 0) {
      doc.setFontSize(13);
      doc.text("Customers", 14, y);
      y += 4;
      doc.autoTable({
        startY: y,
        head: [["Name", "Code", "Mobile", "Packaging", "Qty", "Remarks"]],
        body: customers.map((c) => [
          c.name,
          c.code,
          c.mobile,
          c.orderPackaging,
          c.orderQty,
          c.remarks,
        ]),
        theme: "grid",
        styles: { fontSize: 10 },
        columnStyles: { 5: { font: "NotoSansGujarati" } },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 6;
    }

  // Allow PDF export even if no stock
  if (stock.length > 0) {
      doc.setFontSize(13);
      doc.text("Stock at Dairy", 14, y);
      y += 4;
      doc.autoTable({
        startY: y,
        head: [["Packaging", "Quantity"]],
        body: stock.map((s) => [s.packaging, s.quantity]),
        theme: "grid",
        styles: { fontSize: 10 },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 6;
    }

    doc.save(`DemoSales_${demoInfo.date || "export"}.pdf`);
  };

  // Random winners
  const pickRandomCustomer = () => {
    if (customers.length === 0) return;

    const smallLitres = customers.filter(
      (c) => c.orderPackaging?.includes("1L") || c.orderPackaging?.includes("2L")
    );
    const largeLitres = customers.filter(
      (c) =>
        c.orderPackaging?.includes("5L") ||
        c.orderPackaging?.includes("10") ||
        c.orderPackaging?.includes("20")
    );

    const winner1 =
      smallLitres.length > 0
        ? smallLitres[Math.floor(Math.random() * smallLitres.length)]
        : null;

    const winner2 =
      largeLitres.length > 0
        ? largeLitres[Math.floor(Math.random() * largeLitres.length)]
        : null;

    setRandomWinners({ small: winner1, large: winner2 });
  };

  // WhatsApp summary
  const handleGenerateSummary = () => {
    // Prefer demoInfo.village (set by handleVillageSelect). 
// If not present, try to find the name from villageOptions using selectedVillageId.
const villageName =
  demoInfo.village ||
  (villageOptions.find(v => v.id === selectedVillageId)?.name) ||
  "Village";

  // Group customer orders by packaging
  const salesSummary = {};
  customers.forEach(c => {
    if (!c.orderPackaging || !c.orderQty) return;
    const qty = parseInt(c.orderQty) || 0;
    if (!salesSummary[c.orderPackaging]) salesSummary[c.orderPackaging] = 0;
    salesSummary[c.orderPackaging] += qty;
  });

  // Group stock by packaging
  const stockSummary = {};
  stock.forEach(s => {
    if (!s.packaging || !s.quantity) return;
    const qty = parseInt(s.quantity) || 0;
    if (!stockSummary[s.packaging]) stockSummary[s.packaging] = 0;
    stockSummary[s.packaging] += qty;
  });

  // Convert to text lines
  const salesLines = Object.entries(salesSummary)
    .map(([pkg, qty]) => `𝟭 ${pkg} - ${qty} 𝗻𝗼𝘀`)
    .join("\n");

  const stockLines = Object.entries(stockSummary)
    .map(([pkg, qty]) => `𝟭 ${pkg} - ${qty} 𝗻𝗼𝘀`)
    .join("\n");

  // Grand total litres
  const grandTotalLitres =
    customers.reduce((acc, c) => {
      const match = packagingOptions.find(opt => opt.startsWith(c.orderPackaging));
      if (!match) return acc;
      const litreMatch = match.match(/(\d+)/);
      const litres = litreMatch ? parseInt(litreMatch[1]) : 0;
      const qty = parseInt(c.orderQty) || 0;
      return acc + litres * qty;
    }, 0) +
    stock.reduce((acc, s) => {
      const match = packagingOptions.find(opt => opt.startsWith(s.packaging));
      if (!match) return acc;
      const litreMatch = match.match(/(\d+)/);
      const litres = litreMatch ? parseInt(litreMatch[1]) : 0;
      const qty = parseInt(s.quantity) || 0;
      return acc + litres * qty;
    }, 0);

  // Final formatted WA summary
  const summaryText = 
`𝗩𝗶𝗹𝗹𝗮𝗴𝗲 ${villageName} 𝗗𝗲𝗺𝗼 𝘀𝗲𝗹𝗹:- 
${salesLines || "—"}

𝗦𝘁𝗼𝗰𝗸:- 
${stockLines || "—"}

𝗚𝗿𝗮𝗻𝗱 𝗧𝗼𝘁𝗮𝗹 - ${grandTotalLitres} 𝗟𝗶𝘁𝗿𝗲 

𝗦𝗮𝗯𝗵𝗮𝘀𝗮𝗱 - ${demoInfo.activeSabhasad || 0} 𝗔𝗰𝘁𝗶𝘃𝗲.
𝗠𝗶𝗹𝗸 𝗰𝗼𝗹𝗹𝗲𝗰𝘁𝗶𝗼𝗻 - ${demoInfo.totalMilk || 0} 𝗹𝗶𝘁𝗿𝗲.`;

  setWASummary(summaryText);
};
   

  const currentTotal = (() => {
    const qty = parseInt(customerInput.orderQty) || 0;
    // If packaging matches a predefined 1+1 combo, use its offer price
    const schemeByPack = onePlusOneSchemes.find((s) => s.label === customerInput.orderPackaging);
    if (schemeByPack) {
      return (schemeByPack.offer || schemeByPack.base || 0) * qty;
    }
    // If a manual offer is provided per-customer, use that
    const manual = parseInt(customerInput.manualOffer || "") || 0;
    if (manual > 0) return manual * qty;
    if (!customerInput.orderPackaging) return 0;
    const match = packagingOptions.find((opt) => opt.startsWith(customerInput.orderPackaging));
    if (!match) return 0;
    // Robustly extract the rupee amount using regex
    const priceMatch = match.match(/₹\s*([\d,]+)/) || match.match(/([\d,]+)\s*₹/) || match.match(/([\d,]+)$/);
    let price = 0;
    if (priceMatch && priceMatch[1]) {
      price = parseInt(priceMatch[1].replace(/,/g, "")) || 0;
    } else {
      // fallback: try to extract any number
      const anyNum = match.match(/([\d,]+)/);
      price = anyNum ? parseInt(anyNum[1].replace(/,/g, "")) || 0 : 0;
    }
    return price * qty;
  })();

  const filteredResults = customerData.filter((customer) =>
    Object.values(customer).join(" ").toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function addToMembers() {
    await updateDoc(doc(db, "demosales", demoId), {
      isAvailableForMembers: true,
    });
    alert("Now Members can see this village!");
  }
  
  return (
    <>
      <Navbar />

      <div
        className="form-container"
        style={{
          maxWidth: 900,
          margin: "40px auto 32px auto",
          minHeight: "calc(100vh - 120px)",
          background: "#f7fafd",
          borderRadius: 18,
          boxShadow: "0 4px 24px #2563eb22",
          padding: "18px 0 0 0",
        }}
      >
        <h2
          style={{
            marginBottom: 18,
            color: "#174ea6",
            fontWeight: 900,
            fontSize: "2.2rem",
            letterSpacing: "0.04em",
            textAlign: "center",
          }}
        >
          Demo Sales List
        </h2>

        <form onSubmit={handleSubmit} autoComplete="off" style={{ width: "100%" }}>
          {/* Dairy Info */}
          <div
            className="section-card"
            style={{
              marginBottom: 24,
              textAlign: "left",
              borderRadius: 14,
              boxShadow: "0 2px 12px #2563eb11",
              background: "#fff",
              padding: "24px 18px",
            }}
          >
            <h3
              style={{
                margin: "0 0 18px 0",
                color: "#2563eb",
                fontWeight: 700,
                fontSize: "1.2rem",
              }}
            >
              Dairy Visit Info
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 18,
              }}
              >
              {/* Scheme selection moved into Packaging select (1+1 combos shown there) */}
            </div>  
            
            <div>
                <label>Date*</label>
                <input
                  type="date"
                  name="date"
                  value={demoInfo.date}
                  onChange={handleDemoInfoChange}
                  
                />
              </div>


            <div>
              <label>Village*</label>
              <select value={selectedVillageId} onChange={handleVillageSelect}>
                <option value="">Select Village</option>
                {villageOptions.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Add new village"
                value={newVillageName || ''}
                onChange={e => setNewVillageName(e.target.value)}
                style={{marginLeft: 8, marginRight: 6, padding: '4px 8px', borderRadius: 6, border: '1px solid #b6c7e6'}}
              />
              <button
                type="button"
                style={{ padding: '4px 12px', borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 600 }}
                onClick={async () => {
                  if (!newVillageName || !newVillageName.trim()) {
                    alert('Please enter a village name.');
                    return;
                  }
                  try {
                    
                    const docRef = await addDoc(collection(db, 'villages'), {
                      name: newVillageName.trim(),
                      createdAt: new Date(),
                    });
                    setNewVillageName('');
                    setSelectedVillageId(docRef.id);
                  } catch (err) {
                    alert('Error saving village: ' + err.message);
                  }
                }}
              >
                Add Village
              </button>

              {/* Scheme specific controls */}
              {/* demo-level scheme selectors removed — use per-customer fields below */}

              <div>
  <label>Taluka</label>
  <input
    name="taluka"
    value={demoInfo.taluka}
    onChange={handleDemoInfoChange}
  />
</div>

              <div>
                <label>Mantri*</label>
                <input
                  name="mantri"
                  value={demoInfo.mantri}
                  onChange={handleDemoInfoChange}
                  
                />
              </div>
              <div>
                <label>Total Milk</label>
                <input
                  name="totalMilk"
                  value={demoInfo.totalMilk}
                  onChange={handleDemoInfoChange}
                  />
               </div>
              
              
              <div>
                <label>Active Sabhasad</label>
                <input
                  name="activeSabhasad"
                  value={demoInfo.activeSabhasad}
                  onChange={handleDemoInfoChange}
                />
              </div>
              <div>
                <label>Team Members Went to Demo</label>
                <input
                  name="teamMembers"
                  value={demoInfo.teamMembers}
                  onChange={handleDemoInfoChange}
                  placeholder="Comma separated names"
                />
              </div>
            <div style={{ gridColumn: "1 / -1" }}>
  <label>Entry Made By</label>
  <input
    name="entryBy"
    value={demoInfo.entryBy}
    onChange={handleDemoInfoChange} // optional: allow manual override
  />
</div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label>Demo Remarks</label>
                <textarea
                  name="demoRemarks"
                  value={demoInfo.demoRemarks}
                  onChange={handleDemoInfoChange}
                  rows={2}
                  style={{
                    width: "100%",
                    borderRadius: 8,
                    padding: 8,
                    border: "1.5px solid #b6c7e6",
                    fontFamily: "inherit",
                  }}
                  placeholder="Any remarks about this demo..."
                />
              </div>

   <button
  type="button"
  onClick={startDemo}
  style={{
    marginTop: 16,
    background: "#2563eb", // blue
    color: "#fff",
    padding: "10px 18px",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.2s",
  }}
>
  Start Demo
  </button>

    <div className="form-section">
            <label>Location</label>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button type="button" onClick={handleGetLocation}>
                Get Location
              </button>
              {demoInfo.latitude && demoInfo.longitude && (
                <span>
                  📍 {demoInfo.latitude}, {demoInfo.longitude}
                </span>
              )}
            </div>
          </div>

          {/* Customer Section */}
          <div
            className="section-card"
            style={{
              marginBottom: 24,
              textAlign: "left",
              background: "#e3eefd",
              border: "1.5px solid #b6c7e6",
              boxShadow: "0 2px 12px #2563eb22",
              borderRadius: 14,
              maxWidth: 700,
              marginLeft: "auto",
              marginRight: "auto",
              padding: "24px 18px",
            }}
          >
            <input
  type="file"
  accept=".xlsx, .xls, .csv"
  onChange={handleExcelUpload}
/>
{excelData.length > 0 && (
  <button
    type="button"
    onClick={handleCancelExcelUpload}
    style={{
      marginLeft: "10px",
      padding: "5px 10px",
      backgroundColor: "#ff4d4f",
      color: "white",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
    }}
  >
    Cancel Upload
  </button>
)}
            <div style={{ marginBottom: 20, textAlign: "center" }}>
              <input type="file" accept=".xlsx, .xls,.csv" onChange={handleExcelUpload} />
              <button
                type="button"
                onClick={(event) => {
                  const newInput = document.createElement("input");
                  newInput.type = "file";
                  newInput.accept = ".xlsx, .xls,.csv";
                  newInput.style.marginLeft = "10px";
                  newInput.onchange = handleExcelUpload;
                  event.target.parentNode.insertBefore(newInput, event.target);
                }}
                style={{
                  marginLeft: 10,
                  padding: "6px 18px",
                  fontWeight: 700,
                  fontSize: "1em",
                  borderRadius: 8,
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Add More Excel
              </button>
            </div>
{demos.map((d) => (
  <div key={d.id} style={{border: "1px solid gray", margin: "10px", padding: "10px"}}>
    <h3>{d.village}</h3>
    <p>Status: {d.isAvailableForMembers ? "Available for Members" : "Not yet shared"}</p>
    {!d.isAvailableForMembers && (
      <button type="button" onClick={() => enableForMembers(d.id)}>Add to Members</button>
    )}
        <ul>
            {customers.map((c, i) => (
              <li key={i}>{c.name} - {c.mobile || c.phone} {c.addedBy && (<span style={{color:'#2563eb'}}>[Entry By: {c.addedBy}]</span>)}</li>
            ))}
          </ul>
  </div>
))}

            {/* Search & Select customer */}
           {/* Search Input */}
<div className="relative w-full max-w-md">
  <input
    type="text"
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
      disabled={!!editingCustomerId}
    placeholder="Search customer..."
    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
  />

  {/* Dropdown Suggestions */}
  {/* Dropdown Suggestions */}
{/* Dropdown Suggestions */}
{filteredCustomers.length > 0 && (
  <ul
    className="absolute z-20 w-full bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-72 overflow-y-auto"
    style={{
      padding: 0,
      listStyle: "none",
      fontSize: "1rem",
    }}
  >
  {filteredCustomers.map((cust, idx) => (
  <li
    key={idx}
    onClick={() => {
     if (!editingCustomerId) {
  setCustomerInput((prev) => ({
    ...prev,
    name: cust.name || "",
    code: cust.code || "",
    mobile: cust.mobile || "",
  }));
}

      setSearchTerm(cust.name); // optional: keep searchTerm synced
      setFilteredCustomers([]);
    }}
    className="flex justify-between items-center cursor-pointer px-4 py-3 hover:bg-blue-100 hover:text-blue-800 transition-colors duration-150"
  >
    <div style={{ fontWeight: 600 }}>{cust.name}</div>
    <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
      {cust.code} | {cust.mobile}
    </div>
  </li>
))}

  </ul>
)}


</div>


     

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                background: "#e3eefd",
                padding: "12px 0",
                borderRadius: 8,
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <label>Customer Name</label>
                <input
  name="name"
  value={customerInput.name}
  onChange={handleCustomerInput}
/>

                </div>

                <div style={{ flex: 1, minWidth: 100 }}>
                  <label>Customer Code</label>
                  <input
                    type="text"
                    value={customerInput.code}
                    onChange={(e) =>
                      setCustomerInput({ ...customerInput, code: e.target.value })
                    }
                  />
                </div>

                <div style={{ flex: 1, minWidth: 120 }}>
                  <label>Mobile Number</label>
                  <input
                    type="text"
                    value={customerInput.mobile}
                    onChange={(e) =>
                      setCustomerInput({ ...customerInput, mobile: e.target.value })
                    }
                  />
                </div>

                <div style={{ flex: 1, minWidth: 120 }}>
                  <label>Packaging</label>
                  <select
                    value={customerInput.orderPackaging}
                    onChange={(e) =>
                      setCustomerInput({
                        ...customerInput,
                        orderPackaging: e.target.value,
                      })
                    }
                  >
                    <option value="">Select Packaging</option>
                    {packagingOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                    {/* 1+1 scheme options included in packaging list */}
                    {onePlusOneSchemes.map((s) => (
                      <option key={"scheme-" + s.key} value={s.label}>
                        {s.label} — Offer ₹{s.offer}
                      </option>
                    ))}
                  </select>
                  {/* Show discount input when packaging selected (optional) */}
                  {customerInput.orderPackaging && (
                    <div style={{ marginTop: 6 }}>
                      <label>Discount (optional)</label>
                      <input
                        type="number"
                        value={customerInput.manualOffer || ""}
                        onChange={(e) => setCustomerInput(prev => ({ ...prev, manualOffer: e.target.value }))}
                        placeholder="Enter discount amount"
                      />
                    </div>
                  )}
                </div>
                

                <div style={{ flex: 1, minWidth: 80 }}>
                  <label>Qty</label>
                  <input
                    type="number"
                    name="orderQty"
                    value={customerInput.orderQty}
                    onChange={handleCustomerInput}
                    min="1"
                  />
                </div>

                <div style={{ marginTop: "10px", fontWeight: "bold" }}>
                  Customer Total: ₹{currentTotal}
                </div>

                <div style={{ flex: 2, minWidth: 120 }}>
                  <label>Remarks</label>
                  <input
                    name="remarks"
                    value={customerInput.remarks}
                    onChange={handleCustomerInput}
                    style={{ fontFamily: "Noto Sans Gujarati, sans-serif" }}
                    placeholder="ટિપ્પણી દાખલ કરો"
                  />
                </div>
                <div style={{ minWidth: 180 }}>
                  <label>Photo</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select value={photoCapture} onChange={(e) => setPhotoCapture(e.target.value)} style={{ padding: '6px', borderRadius: 6 }}>
                      <option value="environment">Back Camera (recommended)</option>
                      <option value="user">Front Camera</option>
                    </select>
                    <input
                      type="file"
                      accept="image/*"
                      capture={photoCapture}
                      onChange={handleCustomerPhotoChange}
                    />
                  </div>
                  {(customerInput.photo || customerInput.photoPreview) && (
                    <div style={{ marginTop: 6 }}>
                      <img src={customerInput.photo || customerInput.photoPreview} alt="preview" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }} />
                      {uploadingPhoto && (
                        <div style={{ fontSize: 11, color: '#6b7280' }}>Uploading...</div>
                      )}
                    </div>
                  )}
                </div>
<button
                type="button"
                    className="btn-outline"
                    style={{
                      padding: "8px 8px",
                      fontWeight: 800,
                      fontSize: "1em",
                      borderRadius: 8,
                      height: "40px",
                      background: "#2563eb",
                      color: "#fff",
                      border: "none",
                    }}> Send OTP
</button>

                <div
                  style={{
                    alignSelf: "flex-end",
                    minWidth: 120,
                    display: "flex",
                    gap: 8,
                  }}
                >

<button
  type="button"
  onClick={editingCustomerId ? handleUpdateCustomer : addCustomer}
  disabled={uploadingPhoto}
  title={uploadingPhoto ? 'Wait for photo upload' : ''}
>
  {uploadingPhoto ? 'Uploading...' : (editingCustomerId ? 'Update Customer' : 'Add Customer')}
</button>




               {editingCustomerId && (
  <button
    type="button"
    className="btn-outline"
    style={{
      background: "#b6c7e6",
      color: "#174ea6",
      border: "none",
      borderRadius: 8,
      padding: "8px 18px",
    }}
    onClick={() => {
      setEditingCustomerId(null);
      setCustomerInput(initialCustomer);
    }}
  >
    Cancel
  </button>
)}

                </div>
              </div>
            </div>

            {/* Customer List */}
            {customers.length > 0 && (
              <div style={{ marginTop: 18, overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    textAlign: "center",
                    background: "#fff",
                    borderRadius: 8,
                    boxShadow: "0 1px 6px #2563eb11",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f7fafd", fontWeight: 700, color: "#174ea6" }}>
                      <th>Name</th>
                      <th>Photo</th>
                      <th>Code</th>
                      <th>Mobile</th>
                      <th>Packaging</th>
                      <th>Qty</th>
                      <th>Total</th>
                      <th>Remarks</th>
                      <th>Entry By</th>
                      <th>Edit</th>
                      <th>Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c, idx) => {
                      const qty = parseInt(c.orderQty) || 0;
                      let rate = 0;
                      if (c.appliedPrice) {
                        rate = parseInt(c.appliedPrice) || 0;
                      } else {
                        const match = packagingOptions.find((opt) => opt.startsWith(c.orderPackaging));
                        rate = match ? parseInt((match.match(/₹\s*([\d,]+)/) || [])[1]?.replace(/,/g, "") || 0) : 0;
                      }
                      const total = rate * qty;

                      return (
                        <tr
                          key={idx}
                          className="customer-entry"
                          style={{ background: idx % 2 === 0 ? "#f7fafd" : "#fff" }}
                        >
                          <td>{c.name}</td>
                          <td>
                            {c.photo ? (
                              <img src={c.photo} alt="thumb" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
                            ) : (
                              <span style={{ color: '#9ca3af' }}>—</span>
                            )}
                          </td>
                          <td>{c.code}</td>
                          <td>{c.mobile}</td>
                          <td>{c.orderPackaging}</td>
                          <td>{c.orderQty}</td>
                          <td>
                            <strong>₹{total}</strong>
                          </td>
                          <td>{c.remarks}</td>
                          <td style={{color:'#2563eb', fontWeight:600}}>{c.addedBy || demoInfo.entryBy || ''}</td>
                          <td>
                         <button
  type="button"
  style={{ background: "#2563eb", color: "#fff", padding: "4px 8px", borderRadius: 4 }}
  onClick={() => handleEditCustomer(c)}
>
  Edit
</button>
  

                          </td>
                          <td>
                         <button
  type="button"
  style={{ background: "red", color: "#fff", padding: "4px 8px", borderRadius: 4 }}
  onClick={() => handleRemoveCustomer(c.id)}
>
  Remove
</button>

                          </td>
                        </tr>
                      );
                    })}
                    <tr>
                      <td colSpan="11" style={{ textAlign: "right", fontWeight: "bold" }}>
                        Grand Total: ₹
                        {customers.reduce((acc, c) => {
                          const match = packagingOptions.find((opt) =>
                            opt.startsWith(c.orderPackaging)
                          );
                          const rate = match
                            ? parseInt(match.split("₹")[1].replace(",", ""))
                            : 0;
                          const qty = parseInt(c.orderQty) || 0;
                          return acc + rate * qty;
                        }, 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Stock at Dairy */}
          <div
            className="section-card"
            style={{
              marginBottom: 24,
              textAlign: "left",
              borderRadius: 14,
              boxShadow: "0 2px 12px #2563eb22",
              background: "#fff",
              padding: "24px 18px",
            }}
          >
            <h3 style={{ margin: 0, color: "#174ea6", fontWeight: 700, fontSize: "1.15rem" }}>
              Stock at Dairy
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "end" }}>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label>Packaging</label>
                <select
                  value={stockInput.packaging}
                  onChange={(e) => setStockInput({ ...stockInput, packaging: e.target.value })}
                >
                  <option value="">Select Packaging</option>
                  {packagingOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 80 }}>
                <label>Quantity</label>
                <input
                  type="number"
                  name="quantity"
                  value={stockInput.quantity}
                  onChange={handleStockInput}
                  min="1"
                />
              </div>
              <div>
                <button
                  type="button"
                  className="btn-outline"
                  style={{
                    padding: "8px 18px",
                    fontWeight: 700,
                    fontSize: "1em",
                    borderRadius: 8,
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                  }}
                  onClick={addStock}
                >
                  Add
                </button>
              </div>
            </div>

            {stock.length > 0 && (
              <div style={{ marginTop: 18, overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    textAlign: "center",
                    background: "#fff",
                    borderRadius: 8,
                    boxShadow: "0 1px 6px #2563eb11",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f7fafd", fontWeight: 700, color: "#174ea6" }}>
                      <th>Packaging</th>
                      <th>Quantity</th>
                      <th>Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stock.map((s, idx) => (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? "#f7fafd" : "#fff" }}>
                        <td>{s.packaging}</td>
                        <td>
                          <input
                            type="number"
                            value={s.quantity}
                            onChange={(e) => handleQuantityChange(e, idx)}
                            min="0"
                            style={{ width: 80 }}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-outline"
                            style={{ padding: "4px 12px", borderRadius: 6 }}
                            onClick={() => removeStock(idx)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <p>
                  <strong>
                    Grand Total Stock Value: ₹
                    {stock.reduce((acc, s) => {
                      if (!s.packaging) return acc;
                      const match = packagingOptions.find((opt) => opt.startsWith(s.packaging));
                      if (!match) return acc;
                      const price =
                        parseInt(match.match(/₹([\d,]+)/)?.[1].replace(/,/g, "")) || 0;
                      const qty = parseInt(s.quantity) || 0;
                      return acc + price * qty;
                    }, 0)}
                  </strong>
                </p>
              </div>
            )}
          </div>

          <button type="button" onClick={pickRandomCustomer}>
            Pick Random Winners
          </button>
          {randomWinners.small && <p>🎉 1L/2L Winner: {randomWinners.small.name}</p>}
          {randomWinners.large && <p>🥳 5L/10L/20L Winner: {randomWinners.large.name}</p>}

          {/* Actions */}
          <div
            style={{
              marginTop: 18,
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              className="btn-outline"
              style={{
                padding: "10px 24px",
                fontWeight: 700,
                fontSize: "1.08em",
                borderRadius: 8,
                background: "#fff",
                color: "#2563eb",
                border: "2px solid #2563eb",
              }}
              onClick={handleExportExcel}
            >
              Export to Excel
            </button>

            <button
              type="button"
              className="btn-outline"
              style={{
                padding: "10px 24px",
                fontWeight: 700,
                fontSize: "1.08em",
                borderRadius: 8,
                background: "#fff",
                color: "#2563eb",
                border: "2px solid #2563eb",
              }}
              onClick={handleExportPDF}
            >
              Download PDF
            </button>

            <button
              type="button"
              className="btn-outline"
              style={{
                padding: "10px 24px",
                fontWeight: 700,
                fontSize: "1.08em",
                borderRadius: 8,
                background: "#e3eefd",
                color: "#174ea6",
                border: "2px solid #b6c7e6",
              }}
              onClick={handleGenerateSummary}
            >
              Generate Summary
            </button>

            <button
              type="submit"
              className="btn-primary"
              style={{
                padding: "10px 24px",
                fontWeight: 700,
                fontSize: "1.08em",
                borderRadius: 8,
              }}
              // Allow submit even if submitting (remove lock)
              // disabled={submitting}
            >
              {submitting ? "Submitting..." : "Final Submit"}
            </button>
          </div>

          {/* Summary card */}
          <div
            style={{
              margin: "32px auto 0 auto",
              maxWidth: 700,
              background: "#fff",
              border: "1.5px solid #b6c7e6",
              borderRadius: 10,
              padding: "18px 22px",
              fontFamily: "inherit",
              color: "#174ea6",
              fontSize: "1.08em",
              position: "relative",
              boxShadow: "0 2px 12px #2563eb11",
            }}
          >
            <b>All Entered Data:</b>
            <div style={{ marginTop: 10 }}>
              <b>Dairy Info</b>
              <br />
              Date: {demoInfo.date || "-"}
              <br />
              Village: {demoInfo.village || "-"}
              <br />
              Taluka: {demoInfo.taluka || "-"}
              <br />
              Mantri: {demoInfo.mantri || "-"}
              <br />
              Total Milk: {demoInfo.totalMilk || "-"}
              <br />
              Active Sabhasad: {demoInfo.activeSabhasad || "-"}
              <br />
              Team Members: {demoInfo.teamMembers || "-"}
              <br />
              Entry By: {demoInfo.entryBy || "-"}
              <br />
              Demo Remarks: {demoInfo.demoRemarks || "-"}
              <br />
            </div>

            <div style={{ marginTop: 14 }}>
              <b>Customers</b>
              {customers.length === 0 ? (
                <div style={{ color: "#b91c1c" }}>No customers added.</div>
              ) : (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    marginTop: 6,
                    fontSize: "0.98em",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#e3eefd" }}>
                      <th>Name</th>
                      <th>Code</th>
                      <th>Mobile</th>
                      <th>Packaging</th>
                      <th>Qty</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c, idx) => (
                      <tr
                        key={idx}
                        style={{ background: idx % 2 === 0 ? "#f7fafd" : "#fff" }}
                      >
                        <td>{c.name}</td>
                        <td>{c.code}</td>
                        <td>{c.mobile}</td>
                        <td>{c.orderPackaging}</td>
                        <td>{c.orderQty}</td>
                        <td>{c.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ marginTop: 14 }}>
              <b>Stock at Dairy</b>
              {stock.length === 0 ? (
                <div style={{ color: "#b91c1c" }}>No stock added.</div>
              ) : (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    marginTop: 6,
                    fontSize: "0.98em",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#e3eefd" }}>
                      <th>Packaging</th>
                      <th>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stock.map((s, idx) => (
                      <tr
                        key={idx}
                        style={{ background: idx % 2 === 0 ? "#f7fafd" : "#fff" }}
                      >
                        <td>{s.packaging}</td>
                        <td>{s.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        {/* WhatsApp Summary */}
{waSummary && (
  <div
    style={{
      margin: "18px auto 0 auto",
      maxWidth: 600,
      background: "#f7fafd",
      border: "1.5px solid #b6c7e6",
      borderRadius: 10,
      padding: "16px 18px",
      fontFamily: "monospace",
      whiteSpace: "pre-wrap",   // ✅ important for formatting
      color: "#174ea6",
      fontSize: "1.08em",
      position: "relative",
    }}
  >
    <b>WhatsApp Summary:</b>
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(waSummary);
          setWACopied(true);
          setTimeout(() => setWACopied(false), 1500);
        } catch (e) {
          setWACopied(false);
        }
      }}
      style={{
        position: "absolute",
        top: 14,
        right: 16,
        fontSize: "0.98em",
        padding: "3px 12px",
        borderRadius: 6,
        background: waCopied ? "#22c55e" : "#2563eb",
        color: "#fff",
        border: "none",
        fontWeight: 700,
        cursor: "pointer",
        transition: "background 0.2s",
      }}
      title={waCopied ? "Copied!" : "Copy to clipboard"}
    >
      {waCopied ? "Copied" : "Copy"}
    </button>

    {/* ✅ replace this */}
    <pre style={{ marginTop: 8 }}>{waSummary}</pre>
  </div>
)}

          {msg && (
            <div
              style={{
                marginTop: 14,
                color: msg.startsWith("Error") ? "#b91c1c" : "#2563eb",
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              {msg}
            </div>
          )}
          {submitError && (
            <div
              style={{
                color: "#b91c1c",
                fontWeight: 600,
                marginTop: 14,
                textAlign: "center",
              }}
            >
              {submitError}
            </div>
          )}
          
          </div>
          </div>
          </form>
        <footer
          className="footer-credit"
          style={{ marginTop: 32, borderTop: "1px solid #e3eefd", paddingTop: 12 }}
        >
          <p>
            MADE WITH AI BY <strong>S&J</strong>
          </p>
          <small>Powered by Parul Chemicals • FS CALCIVAL</small>
        </footer>
      </div>  
      
    </>
  );
};

export default DemoSalesList;
