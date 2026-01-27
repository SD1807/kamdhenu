import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import notoSansGujarati from "./fonts/NotoSansGujarati-Regular.js";
import { saveAs } from "file-saver";
import { where, writeBatch, collection, addDoc, Timestamp, doc, getDocs ,  serverTimestamp, query, onSnapshot, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
const storage = getStorage();
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

// New: For returned stock
const initialReturnedStock = {
  packaging: "",
  quantity: "",
};

// New: For payment collection
const initialPaymentEntry = {
  amount: "",
  mode: "",
  givenBy: "",
  takenBy: "",
};

const DemoSalesList = () => {
  // New: Stock returned from demo
  const [stockReturned, setStockReturned] = useState([]);
  const [returnedStockInput, setReturnedStockInput] = useState(initialReturnedStock);
  
  // New: Payment collection
  const [paymentsCollected, setPaymentsCollected] = useState([]);
  const [paymentInput, setPaymentInput] = useState(initialPaymentEntry);
  
  // State for new village input
  const [newVillageName, setNewVillageName] = useState("");
  const [excelData, setExcelData] = useState([]);
  const [demoInfo, setDemoInfo] = useState(initialDemoInfo);
  const [customers, setCustomers] = useState([]);
  const [customerInput, setCustomerInput] = useState(initialCustomer);
  
  // Handler for returned stock input
  const handleReturnedStockInput = (e) => {
    const { name, value } = e.target;
    setReturnedStockInput((prev) => ({ ...prev, [name]: value }));
  };

  // Add returned stock
  const addReturnedStock = (e) => {
    e.preventDefault();
    if (!returnedStockInput.packaging) {
      toast.error('Please select packaging');
      return;
    }
    const qty = parseFloat(returnedStockInput.quantity) || 0;
    if (qty <= 0) {
      toast.error('Quantity must be greater than zero');
      return;
    }
    setStockReturned((prev) => [...prev, { packaging: returnedStockInput.packaging, quantity: String(qty) }]);
    setReturnedStockInput(initialReturnedStock);
  };

  // Remove returned stock
  const removeReturnedStock = (idx) => {
    setStockReturned((prev) => prev.filter((_, i) => i !== idx));
  };

  // Handler for payment input
  const handlePaymentInput = (e) => {
    const { name, value } = e.target;
    setPaymentInput((prev) => ({ ...prev, [name]: value }));
  };

  // Add payment
  const addPayment = (e) => {
    e.preventDefault();
    if (!paymentInput.amount) {
      toast.error('Please enter amount');
      return;
    }
    const amount = parseFloat(paymentInput.amount) || 0;
    if (amount <= 0) {
      toast.error('Amount must be greater than zero');
      return;
    }
    if (!paymentInput.mode) {
      toast.error('Please select payment mode');
      return;
    }
    if (!paymentInput.givenBy) {
      toast.error('Please enter who gave the payment');
      return;
    }
    if (!paymentInput.takenBy) {
      toast.error('Please enter who took the payment');
      return;
    }
    setPaymentsCollected((prev) => [...prev, { amount: String(amount), mode: paymentInput.mode, givenBy: paymentInput.givenBy, takenBy: paymentInput.takenBy }]);
    setPaymentInput(initialPaymentEntry);
    toast.success('Payment added successfully');
  };

  // Remove payment
  const removePayment = (idx) => {
    setPaymentsCollected((prev) => prev.filter((_, i) => i !== idx));
  };
  
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

// Real-time listener for stock from Firebase
useEffect(() => {
  if (!selectedVillageId) {
    setStockTaken([]);
    return;
  }

  const unsub = onSnapshot(
    doc(db, "villageStocks", selectedVillageId),
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setStockTaken(Array.isArray(data.stocks) ? data.stocks : []);
      } else {
        setStockTaken([]);
      }
    },
    (err) => {
      console.error("Error loading stock:", err);
      setStockTaken([]);
    }
  );

  return () => unsub();
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


  // stockTaken: items moved to demo (linked to village)
  const [stockTaken, setStockTaken] = useState([]);
  // stockAtDairy: inventory kept at dairy (separate)
  const [stockAtDairy, setStockAtDairy] = useState([]);
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
  const [demoId, setDemoId] = useState(null);
  const [soldSummary, setSoldSummary] = useState({});
  const [remainingStockList, setRemainingStockList] = useState([]);

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
    createdAt: new Date(),
  });

  setDemoId(docRef.id);
  toast.success("Demo started!");
}

// Save demoInfo to localStorage on every change
useEffect(() => {
  localStorage.setItem("demoInfo", JSON.stringify(demoInfo));
}, [demoInfo]);


  // Helper function to deduct stock from stockTaken (shared by customers and dairy)
  const deductFromStock = (packLabel, qty) => {
    // Map between different packaging naming conventions
    const packagingMap = {
      "1L Plastic": "1LTR JAR: ₹145",
      "2L Plastic": "2LTR JAR: ₹275",
      "5L Plastic": "5LTR PLASTIC JAR: ₹665",
      "5L Steel": "5LTR STEEL બરણી: ₹890",
      "10L Plastic": "10 LTR JAR: ₹1,340",
      "10L Steel": "10 LTR STEEL બરણી: ₹1,770",
      "20L Can": "20 LTR CANL : ₹3,250",
      "20L Steel": "20 LTR STEEL બરણી: ₹3,520",
    };
    
    setStockTaken((current) => {
      const newTaken = [...current];
      let remainToDeduct = qty;
      
      // Map the label if it's a scheme part (short name)
      const mappedLabel = packagingMap[packLabel] || packLabel;
      
      // Try exact match first
      let idx = newTaken.findIndex(s => s.packaging === mappedLabel);
      
      // Try with original label if mapped didn't work
      if (idx < 0) {
        idx = newTaken.findIndex(s => s.packaging === packLabel);
      }
      
      // Try size match as fallback (extract 1L, 2L, 5L, 10L, 20L)
      if (idx < 0) {
        const extractSize = (s) => {
          const match = (s || "").match(/(\d+)\s*L(?:TR)?/i);
          return match ? match[1] + "L" : null;
        };
        
        const targetSize = extractSize(mappedLabel) || extractSize(packLabel);
        if (targetSize) {
          idx = newTaken.findIndex(s => extractSize(s.packaging) === targetSize);
        }
      }

      if (idx >= 0) {
        const available = parseInt(newTaken[idx].quantity) || 0;
        const used = Math.min(available, remainToDeduct);
        newTaken[idx].quantity = String(available - used);
        remainToDeduct -= used;
        if ((parseInt(newTaken[idx].quantity) || 0) <= 0) newTaken.splice(idx, 1);
      }
      
      return newTaken;
    });
  };

  // Consolidated deduction for multiple parts (like 1+1 schemes) - single state update
  const deductMultipleFromStock = (parts, qty) => {
    const packagingMap = {
      "1L Plastic": "1LTR JAR: ₹145",
      "2L Plastic": "2LTR JAR: ₹275",
      "5L Plastic": "5LTR PLASTIC JAR: ₹665",
      "5L Steel": "5LTR STEEL બરણી: ₹890",
      "10L Plastic": "10 LTR JAR: ₹1,340",
      "10L Steel": "10 LTR STEEL બરણી: ₹1,770",
      "20L Can": "20 LTR CANL : ₹3,250",
      "20L Steel": "20 LTR STEEL બરણી: ₹3,520",
    };

    setStockTaken((current) => {
      let newTaken = [...current];
      
      // Calculate all deductions needed (map each part to how much to deduct from which index)
      const deductions = [];
      
      parts.forEach((packLabel) => {
        const mappedLabel = packagingMap[packLabel] || packLabel;
        
        // Try exact match first
        let idx = newTaken.findIndex(s => s.packaging === mappedLabel);

        // Try with original label if mapped didn't work
        if (idx < 0) {
          idx = newTaken.findIndex(s => s.packaging === packLabel);
        }

        // Try size match as fallback
        if (idx < 0) {
          const extractSize = (s) => {
            const match = (s || "").match(/(\d+)\s*L(?:TR)?/i);
            return match ? match[1] + "L" : null;
          };

          const targetSize = extractSize(mappedLabel) || extractSize(packLabel);
          if (targetSize) {
            idx = newTaken.findIndex(s => extractSize(s.packaging) === targetSize);
          }
        }

        if (idx >= 0) {
          deductions.push({ idx, qty });
        }
      });
      
      // Apply all deductions in one pass
      deductions.forEach(({ idx, qty: deductQty }) => {
        const available = parseInt(newTaken[idx].quantity) || 0;
        const used = Math.min(available, deductQty);
        newTaken[idx].quantity = String(available - used);
      });
      
      // Remove zero-quantity items
      newTaken = newTaken.filter(s => (parseInt(s.quantity) || 0) > 0);

      return newTaken;
    });
  };

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





// Removed: addCustomerToSubcollection is not used in current flow
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
    // basic validation
    if (!stockInput.packaging) {
      toast.error('Please select packaging');
      return;
    }
    const qty = parseFloat(stockInput.quantity) || 0;
    if (qty <= 0) {
      toast.error('Quantity must be greater than zero');
      return;
    }

    // Add to stockTaken
    const updatedStockTaken = [...stockTaken, { packaging: stockInput.packaging, quantity: String(qty) }];
    setStockTaken(updatedStockTaken);
    toast.success(`✅ Added ${qty} ${stockInput.packaging} to Stock Taken`);
    
    // Auto-save to Firebase
    if (selectedVillageId) {
      setDoc(doc(db, 'villageStocks', selectedVillageId), {
        stocks: updatedStockTaken,
        villageName: demoInfo.village || (villageOptions.find(v => v.id === selectedVillageId)?.name) || "",
        updatedAt: serverTimestamp(),
      }, { merge: true }).catch((err) => {
        console.error('Failed to save stock:', err);
      });
    }
    
    setStockInput(initialStock);
  };

  const addStockAtDairy = (e) => {
    e.preventDefault();
    if (!stockInput.packaging) { toast.error('Please select packaging'); return; }
    const qty = parseFloat(stockInput.quantity) || 0;
    if (qty <= 0) { toast.error('Quantity must be greater than zero'); return; }
    
    const pkg = stockInput.packaging;
    
    // Add to stockAtDairy (NO deduction from Stock Taken - dairy is just where the stock is stored)
    setStockAtDairy((prev) => [...prev, { packaging: pkg, quantity: String(qty) }]);
    toast.success(`✅ Noted ${qty} ${pkg} stored at Dairy`);
    setStockInput(initialStock);
  };

  const removeStockTaken = (idx) => {
    setStockTaken((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeStockAtDairy = (idx) => {
    console.log("🗑️ Removing stock at dairy at index:", idx);
    setStockAtDairy((prev) => {
      const updated = prev.filter((_, i) => i !== idx);
      console.log("📦 Updated stockAtDairy:", updated);
      return updated;
    });
  };

  


  const handleQuantityChange = (e, index) => {
    const newQuantity = parseFloat(e.target.value) || 0;
    const updated = [...stockTaken];
    updated[index].quantity = newQuantity;
    setStockTaken(updated);
  };

  const handleQuantityChangeAtDairy = (e, index) => {
    const newQuantity = e.target.value;
    const updated = [...stockAtDairy];
    updated[index].quantity = String(newQuantity || 0);
    setStockAtDairy(updated);
  };

// Persist stock for the currently selected village
const saveStockToVillage = async () => {
  if (!selectedVillageId) {
    toast.error('Please select a village first to save stock');
    return;
  }
  try {
    await setDoc(doc(db, 'villageStocks', selectedVillageId), {
      stocks: stockTaken,
      villageName: demoInfo.village || (villageOptions.find(v => v.id === selectedVillageId)?.name) || "",
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    toast.success('✅ Stock saved successfully');
  } catch (err) {
    console.error('Failed to save stock:', err);
    toast.error('Failed to save stock: ' + (err.message || err));
  }
};



const handleEditCustomer = (customer) => {
  
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
        stockTaken,
        stockAtDairy,
        stockReturned,
        createdAt: Timestamp.now(),
      });

      await addDoc(collection(db, "demoHistory"), {
        ...demoInfo,
        customers,
        stockTaken,
        stockAtDairy,
        stockReturned,
        savedAt: Timestamp.now(),
      });

      setMsg("Demo sales record submitted and saved to history!");
      setDemoInfo(initialDemoInfo);
      setCustomers([]);
      setCustomerInput(initialCustomer);
      setStockTaken([]);
      setStockAtDairy([]);
      setStockReturned([]);
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

  // Include Stock Taken (for Demo) if present
  if (stockTaken.length > 0) {
      doc.setFontSize(13);
      doc.text("Stock Taken (for Demo)", 14, y);
      y += 4;
      doc.autoTable({
        startY: y,
        head: [["Packaging", "Quantity"]],
        body: stockTaken.map((s) => [s.packaging, s.quantity]),
        theme: "grid",
        styles: { fontSize: 10 },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 6;
    }

  // Include Stock at Dairy
  if (stockAtDairy.length > 0) {
      doc.setFontSize(13);
      doc.text("Stock at Dairy", 14, y);
      y += 4;
      doc.autoTable({
        startY: y,
        head: [["Packaging", "Quantity"]],
        body: stockAtDairy.map((s) => [s.packaging, s.quantity]),
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

  // Helper function to calculate remaining stock
  const calculateSoldAndRemaining = () => {
    const sold = {};

    customers.forEach((c) => {
      const qty = parseInt(c.orderQty) || 0;
      if (!qty) return;

      if (c.schemeKey) {
        const scheme = getOnePlusOneByKey(c.schemeKey);
        if (scheme && Array.isArray(scheme.parts)) {
          scheme.parts.forEach((part) => {
            const match = packagingOptions.find((opt) =>
              opt.toLowerCase().includes(part.toLowerCase())
            );
            const key = match || part;
            sold[key] = (sold[key] || 0) + qty;
          });
        } else {
          const key = c.orderPackaging || "Unknown";
          sold[key] = (sold[key] || 0) + qty;
        }
      } else {
        const match = packagingOptions.find((opt) => opt.startsWith(c.orderPackaging));
        const key = match || c.orderPackaging || "Unknown";
        sold[key] = (sold[key] || 0) + qty;
      }
    });

    // Calculate dairy deductions
    const dairy = {};
    stockAtDairy.forEach((s) => {
      const qty = parseInt(s.quantity) || 0;
      dairy[s.packaging] = (dairy[s.packaging] || 0) + qty;
    });

    const allKeys = new Set([
      ...Object.keys(sold),
      ...stockTaken.map((s) => s.packaging),
      ...stockReturned.map((s) => s.packaging),
      ...packagingOptions,
    ]);

    const remainingList = Array.from(allKeys).map((k) => {
      const stockItem = stockTaken.find((s) => s.packaging === k) || { quantity: 0 };
      const returnedItem = stockReturned.find((s) => s.packaging === k) || { quantity: 0 };
      const stockQty = parseInt(stockItem.quantity) || 0;
      const soldQty = parseInt(sold[k] || 0) || 0;
      const dairyQty = parseInt(dairy[k] || 0) || 0;
      const returnedQty = parseInt(returnedItem.quantity) || 0;
      // Remaining = Stock Taken - Sold - Kept at Dairy + Returned
      return { packaging: k, stock: stockQty, sold: soldQty, dairy: dairyQty, returned: returnedQty, remaining: stockQty - soldQty - dairyQty + returnedQty };
    });

    return { sold, dairy, remainingList };
  };

  // Realtime dashboard: compute sold and remaining stock per packaging
  useEffect(() => {
    const { sold, dairy, remainingList } = calculateSoldAndRemaining();
    setSoldSummary(sold);
    setRemainingStockList(remainingList);
  }, [customers, stockTaken, stockAtDairy, stockReturned]);

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
  stockTaken.forEach(s => {
    if (!s.packaging || !s.quantity) return;
    const qty = parseInt(s.quantity) || 0;
    if (!stockSummary[s.packaging]) stockSummary[s.packaging] = 0;
    stockSummary[s.packaging] += qty;
  });

  // Group payments by mode
  const paymentSummary = {};
  paymentsCollected.forEach(p => {
    if (!p.mode) return;
    if (!paymentSummary[p.mode]) paymentSummary[p.mode] = 0;
    paymentSummary[p.mode] += parseFloat(p.amount) || 0;
  });

  // Convert to text lines
  const salesLines = Object.entries(salesSummary)
    .map(([pkg, qty]) => `𝟭 ${pkg} - ${qty} 𝗻𝗼𝘀`)
    .join("\n");

  const stockLines = Object.entries(stockSummary)
    .map(([pkg, qty]) => `𝟭 ${pkg} - ${qty} 𝗻𝗼𝘀`)
    .join("\n");

  // Payment lines
  const paymentLines = Object.entries(paymentSummary)
    .map(([mode, amount]) => `𝟭 ${mode} - ₹${amount.toFixed(2)}`)
    .join("\n");

  // Total payment collected
  const totalPayment = paymentsCollected.reduce((acc, p) => acc + parseFloat(p.amount), 0);

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
    stockTaken.reduce((acc, s) => {
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

𝗣𝗮𝘆𝗺𝗲𝗻𝘁 𝗖𝗼𝗹𝗹𝗲𝗰𝘁𝗲𝗱:- 
${paymentLines || "—"}
𝗧𝗼𝘁𝗮𝗹 𝗣𝗮𝘆𝗺𝗲𝗻𝘁 - ₹${totalPayment.toFixed(2)}

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
  
  return (
    <>
      <Navbar />
      <div style={{ backgroundColor: "#FFD700", padding: "12px", textAlign: "center", fontWeight: "bold", fontSize: "16px", color: "red" }}>🔥 STOCK FEATURE LOADED - v2.1</div>
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

        {/* ========== STOCK TAKEN TO VILLAGE SECTION ========== */}
        <div
          className="section-card"
          style={{
            marginTop: 24,
            marginBottom: 24,
            textAlign: "left",
            borderRadius: 14,
            boxShadow: "0 4px 24px #2563eb33",
            background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
            padding: "0",
            border: "3px solid #0284c7",
            maxWidth: 900,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {/* Header with gradient */}
          <div style={{ padding: "24px 24px 16px 24px", background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", borderRadius: "11px 11px 0 0", color: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: "1.5em", letterSpacing: "0.05em" }}>
                📦 STOCK TAKEN TO VILLAGE
              </h3>
              {(() => {
                const totalQty = stockTaken.reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);
                return (
                  <div style={{ background: "rgba(255,255,255,0.25)", padding: "10px 18px", borderRadius: 8, fontSize: "1em", fontWeight: 700 }}>
                    <span style={{ fontSize: "1.4em" }}>{totalQty}</span>
                    <div style={{ fontSize: "0.8em", opacity: 0.9 }}>Total Units</div>
                  </div>
                );
              })()}
            </div>
            <p style={{ margin: 0, fontSize: "0.95em", opacity: 0.95 }}>Add packaging items and quantities that will be taken to the village for demonstration and sales</p>
          </div>

          {/* Input Form Section */}
          <div style={{ padding: "18px 24px", background: "#fff", borderBottom: "2px solid #e0f2fe" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, alignItems: "flex-end" }}>
              <div>
                <label style={{ fontWeight: 700, color: "#0369a1", display: "block", marginBottom: 6 }}>Select Packaging Type</label>
                <select 
                  value={stockInput.packaging} 
                  onChange={(e) => setStockInput({ ...stockInput, packaging: e.target.value })} 
                  style={{ 
                    width: "100%", 
                    padding: "10px 12px", 
                    borderRadius: 6, 
                    border: "2px solid #bfdbfe", 
                    background: "#fff", 
                    color: "#000",
                    fontSize: "0.95em",
                    fontWeight: 600
                  }}
                >
                  <option value="">-- Select Packaging --</option>
                  {packagingOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontWeight: 700, color: "#0369a1", display: "block", marginBottom: 6 }}>Quantity</label>
                <input 
                  type="number" 
                  name="quantity" 
                  value={stockInput.quantity} 
                  onChange={handleStockInput} 
                  min="1" 
                  placeholder="Enter qty" 
                  style={{ 
                    width: "100%", 
                    padding: "10px 12px", 
                    borderRadius: 6, 
                    border: "2px solid #bfdbfe", 
                    background: "#fff",
                    fontSize: "0.95em",
                    fontWeight: 600
                  }} 
                />
              </div>

              <button 
                type="button" 
                onClick={addStock} 
                style={{ 
                  padding: "10px 28px", 
                  background: "#10b981", 
                  color: "#fff", 
                  border: "none", 
                  borderRadius: 8, 
                  fontWeight: 700, 
                  fontSize: "0.95em", 
                  cursor: "pointer", 
                  transition: "all 0.3s",
                  boxShadow: "0 2px 8px #10b98144",
                  width: "100%"
                }} 
                onMouseOver={(e) => {
                  e.target.style.background = "#059669";
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 4px 12px #10b98155";
                }} 
                onMouseOut={(e) => {
                  e.target.style.background = "#10b981";
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 2px 8px #10b98144";
                }}
              >
                ✓ ADD TO STOCK
              </button>
            </div>
          </div>

          {/* Stock Items Display */}
          <div style={{ padding: "20px 24px" }}>
            {stockTaken.length === 0 ? (
              <div style={{ 
                textAlign: "center", 
                color: '#6b7280', 
                padding: "40px 20px", 
                fontSize: "1.05em",
                background: "#f8fafc",
                borderRadius: 8,
                border: "2px dashed #cbd5e1"
              }}>
                <div style={{ fontSize: "3em", marginBottom: 8 }}>📭</div>
                <div>No stock added yet. Add packaging and quantity above to get started.</div>
              </div>
            ) : (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14, marginBottom: 16 }}>
                  {stockTaken.map((t, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        background: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
                        padding: "16px", 
                        borderRadius: 10, 
                        border: "2px solid #06b6d4", 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center",
                        boxShadow: "0 2px 8px #06b6d422"
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, color: "#0369a1", fontSize: "1.05em" }}>{t.packaging}</div>
                        <div style={{ color: "#0891b2", fontSize: "0.95em", marginTop: 4, fontWeight: 700 }}>Qty: {t.quantity}</div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeStockTaken(idx)} 
                        style={{ 
                          padding: '8px 12px', 
                          borderRadius: 6, 
                          background: '#ef4444', 
                          color: '#fff', 
                          border: 'none', 
                          cursor: 'pointer', 
                          fontWeight: 700, 
                          fontSize: "0.9em", 
                          transition: "all 0.2s",
                          boxShadow: "0 2px 4px #ef444444"
                        }} 
                        onMouseOver={(e) => {
                          e.target.style.background = '#dc2626';
                          e.target.style.transform = "scale(1.05)";
                        }} 
                        onMouseOut={(e) => {
                          e.target.style.background = '#ef4444';
                          e.target.style.transform = "scale(1)";
                        }}
                      >
                        ✕ Remove
                      </button>
                    </div>
                  ))}
                </div>

                {/* Save to Village Button */}
                <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
                  <button 
                    type="button" 
                    onClick={saveStockToVillage} 
                    style={{ 
                      flex: 1, 
                      padding: "14px 20px", 
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", 
                      color: "#fff", 
                      border: "none", 
                      borderRadius: 8, 
                      fontWeight: 700, 
                      fontSize: "1.05em",
                      cursor: "pointer", 
                      transition: "all 0.3s",
                      boxShadow: "0 4px 12px #10b98144"
                    }} 
                    onMouseOver={(e) => {
                      e.target.style.transform = "translateY(-2px)";
                      e.target.style.boxShadow = "0 6px 16px #10b98155";
                    }} 
                    onMouseOut={(e) => {
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = "0 4px 12px #10b98144";
                    }}
                  >
                    💾 SAVE STOCK FOR VILLAGE
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

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
              <span style={{ marginLeft: 10, color: "#6b7280", fontSize: "0.9em" }}>
                (Upload will add to existing customers)
              </span>
            </div>

            {/* Search & Select customer */}
           {/* Search Input */}
<div className="relative w-full max-w-md">
  <input
    type="text"
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
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
                          let rate = 0;
                          if (match) {
                            const priceMatch = match.match(/₹\s*([\d,]+)/);
                            rate = priceMatch ? parseInt(priceMatch[1].replace(/,/g, "")) : 0;
                          }
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
                  onClick={addStockAtDairy}
                >
                  Add
                </button>
              </div>
            </div>

            {stockAtDairy.length > 0 && (
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
                    {stockAtDairy.map((s, idx) => (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? "#f7fafd" : "#fff" }}>
                        <td>{s.packaging}</td>
                        <td>
                          <input
                            type="number"
                            value={parseInt(s.quantity) || 0}
                            onChange={(e) => handleQuantityChangeAtDairy(e, idx)}
                            min="0"
                            style={{ width: 80 }}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            style={{ 
                              padding: "4px 12px", 
                              borderRadius: 6,
                              background: "#ef4444",
                              color: "#fff",
                              border: "none",
                              fontWeight: 600,
                              cursor: "pointer",
                              fontSize: "0.9em"
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              removeStockAtDairy(idx);
                            }}
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
                    {stockAtDairy.reduce((acc, s) => {
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

          {/* Realtime Stock Dashboard + Returned Stock */}
          <div
            className="section-card"
            style={{
              marginBottom: 12,
              textAlign: "left",
              borderRadius: 14,
              boxShadow: "0 2px 12px #2563eb11",
              background: "#fff",
              padding: "14px 18px",
            }}
          >
            <h3 style={{ margin: 0, color: "#174ea6", fontWeight: 700, fontSize: "1.05rem" }}>Realtime Stock Dashboard</h3>
            <p style={{ marginTop: 8, color: "#6b7280" }}>Shows sold, returned, and remaining stock (derived from customers and village stock).</p>
            <div style={{ overflowX: "auto", marginTop: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95rem" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid #e6eefc" }}>
                    <th style={{ padding: "6px 8px" }}>Packaging</th>
                    <th style={{ padding: "6px 8px" }}>Stock Taken</th>
                    <th style={{ padding: "6px 8px" }}>Sold to Customers</th>
                    <th style={{ padding: "6px 8px" }}>Kept at Dairy</th>
                    <th style={{ padding: "6px 8px" }}>Returned</th>
                    <th style={{ padding: "6px 8px" }}>Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {remainingStockList.map((r, idx) => (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? "#fff" : "#fbfdff" }}>
                      <td style={{ padding: "6px 8px" }}>{r.packaging}</td>
                      <td style={{ padding: "6px 8px" }}>{r.stock}</td>
                      <td style={{ padding: "6px 8px" }}>{r.sold}</td>
                      <td style={{ padding: "6px 8px" }}>{r.dairy}</td>
                      <td style={{ padding: "6px 8px" }}>{r.returned}</td>
                      <td style={{ padding: "6px 8px", color: r.remaining < 0 ? "#b91c1c" : "#174ea6", fontWeight: 700 }}>{r.remaining}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Returned Stock Input Section */}
            <div style={{ marginTop: 18, background: '#f7fafd', borderRadius: 8, padding: 12 }}>
              <h4 style={{ margin: 0, color: '#174ea6', fontWeight: 700, fontSize: '1em' }}>Add Returned Stock</h4>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                <select name="packaging" value={returnedStockInput.packaging} onChange={handleReturnedStockInput} style={{ padding: '8px', borderRadius: 6, minWidth: 150 }}>
                  <option value="">Select Packaging</option>
                  {packagingOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <input type="number" name="quantity" value={returnedStockInput.quantity} onChange={handleReturnedStockInput} min="1" placeholder="Qty" style={{ width: 100, padding: '8px', borderRadius: 6 }} />
                <button type="button" onClick={addReturnedStock} style={{ padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '1em', cursor: 'pointer' }}>Add Returned</button>
              </div>
              {/* List of returned stock */}
              {stockReturned.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <b>Returned Stock List:</b>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {stockReturned.map((s, idx) => (
                      <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span>{s.packaging} - Qty: {s.quantity}</span>
                        <button type="button" onClick={() => removeReturnedStock(idx)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: '0.9em', cursor: 'pointer' }}>Remove</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Payment Collection Section */}
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
            <h3 style={{ margin: 0, color: "#174ea6", fontWeight: 700, fontSize: "1.15rem", marginBottom: 16 }}>
              💳 Payment Collected
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "end", marginBottom: 14 }}>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label>Amount*</label>
                <input
                  type="number"
                  name="amount"
                  value={paymentInput.amount}
                  onChange={handlePaymentInput}
                  placeholder="Enter amount"
                  min="1"
                  step="0.01"
                  style={{ width: "100%" }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label>Payment Mode*</label>
                <select
                  name="mode"
                  value={paymentInput.mode}
                  onChange={handlePaymentInput}
                  style={{ width: "100%" }}
                >
                  <option value="">Select Mode</option>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Card">Card</option>
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label>Given By*</label>
                <input
                  type="text"
                  name="givenBy"
                  value={paymentInput.givenBy}
                  onChange={handlePaymentInput}
                  placeholder="Customer name"
                  style={{ width: "100%" }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label>Taken By*</label>
                <input
                  type="text"
                  name="takenBy"
                  value={paymentInput.takenBy}
                  onChange={handlePaymentInput}
                  placeholder="Your name"
                  style={{ width: "100%" }}
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
                    cursor: "pointer",
                  }}
                  onClick={addPayment}
                >
                  Add Payment
                </button>
              </div>
            </div>

            {paymentsCollected.length > 0 && (
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
                      <th>Amount (₹)</th>
                      <th>Mode</th>
                      <th>Given By</th>
                      <th>Taken By</th>
                      <th>Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentsCollected.map((p, idx) => (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? "#f7fafd" : "#fff" }}>
                        <td>
                          <strong>₹{parseFloat(p.amount).toFixed(2)}</strong>
                        </td>
                        <td>{p.mode}</td>
                        <td>{p.givenBy}</td>
                        <td>{p.takenBy}</td>
                        <td>
                          <button
                            type="button"
                            style={{
                              padding: "4px 12px",
                              borderRadius: 6,
                              background: "#ef4444",
                              color: "#fff",
                              border: "none",
                              fontWeight: 600,
                              cursor: "pointer",
                              fontSize: "0.9em",
                            }}
                            onClick={() => removePayment(idx)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: "#f0f9ff", fontWeight: "bold" }}>
                      <td colSpan="5" style={{ textAlign: "right", padding: "12px 8px" }}>
                        Total Payment Collected: ₹
                        {paymentsCollected.reduce((acc, p) => acc + parseFloat(p.amount), 0).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <button type="button" onClick={pickRandomCustomer}>
            Pick Random Winners
          </button>
          {randomWinners.small && <p>🎉 1L/2L Winner: {randomWinners.small.name}</p>}
          {randomWinners.large && <p>🥳 5L/10L/20L Winner: {randomWinners.large.name}</p>}

          {/* Stock Summary Dashboard - POSITIONED BEFORE EXPORT */}
          <div
            className="section-card"
            style={{
              marginTop: 32,
              marginBottom: 28,
              textAlign: "center",
              borderRadius: 16,
              boxShadow: "0 6px 32px #2563eb22",
              background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
              padding: "32px 24px",
              border: "3px solid #0284c7",
              maxWidth: 1000,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ 
                margin: "0 0 8px 0", 
                color: "#0369a1", 
                fontWeight: 900, 
                fontSize: "2rem",
                letterSpacing: "0.05em"
              }}>
                📊 STOCK INVENTORY DASHBOARD
              </h3>
              <p style={{ 
                margin: "8px 0 0 0", 
                color: "#0891b2", 
                fontWeight: 600, 
                fontSize: "1em"
              }}>
                Real-time inventory tracking: Taken vs Sold vs Stored vs Remaining
              </p>
            </div>

            {/* Cards Grid */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", 
              gap: 20, 
              maxWidth: 1100, 
              marginLeft: "auto", 
              marginRight: "auto",
              marginBottom: 24
            }}>
              {/* Stock Taken Card */}
              <div style={{ 
                padding: "24px 20px", 
                backgroundColor: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)", 
                borderRadius: "14px", 
                border: "3px solid #0284c7", 
                textAlign: "center", 
                boxShadow: "0 4px 12px #0284c722",
                transition: "all 0.3s",
                cursor: "default"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 20px #0284c733";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px #0284c722";
              }}>
                <h4 style={{ margin: "0 0 12px 0", color: "#0369a1", fontSize: "1.25rem", fontWeight: 800 }}>
                  📦 Stock Taken
                </h4>
                <p style={{ 
                  margin: 0, 
                  fontSize: "3.2rem", 
                  fontWeight: 900, 
                  color: "#0284c7",
                  letterSpacing: "0.05em"
                }}>
                  {(() => {
                    const total = stockTaken.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
                    return total;
                  })()}
                </p>
                <p style={{ 
                  margin: "8px 0 0 0", 
                  fontSize: "0.95rem", 
                  color: "#0891b2", 
                  fontWeight: 700 
                }}>
                  units to village
                </p>
              </div>

              {/* Stock Sold Card */}
              <div style={{ 
                padding: "24px 20px", 
                backgroundColor: "linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)",
                borderRadius: "14px", 
                border: "3px solid #a855f7", 
                textAlign: "center", 
                boxShadow: "0 4px 12px #a855f722",
                transition: "all 0.3s",
                cursor: "default"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 20px #a855f733";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px #a855f722";
              }}>
                <h4 style={{ margin: "0 0 12px 0", color: "#7e22ce", fontSize: "1.25rem", fontWeight: 800 }}>
                  💰 Stock Sold
                </h4>
                <p style={{ 
                  margin: 0, 
                  fontSize: "3.2rem", 
                  fontWeight: 900, 
                  color: "#a855f7",
                  letterSpacing: "0.05em"
                }}>
                  {(() => {
                    const total = customers.reduce((sum, c) => sum + (parseInt(c.orderQty) || 0), 0);
                    return total;
                  })()}
                </p>
                <p style={{ 
                  margin: "8px 0 0 0", 
                  fontSize: "0.95rem", 
                  color: "#d946ef", 
                  fontWeight: 700 
                }}>
                  to customers
                </p>
              </div>

              {/* Stock at Dairy Card */}
              <div style={{ 
                padding: "24px 20px", 
                backgroundColor: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                borderRadius: "14px", 
                border: "3px solid #f59e0b", 
                textAlign: "center", 
                boxShadow: "0 4px 12px #f59e0b22",
                transition: "all 0.3s",
                cursor: "default"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 20px #f59e0b33";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px #f59e0b22";
              }}>
                <h4 style={{ margin: "0 0 12px 0", color: "#d97706", fontSize: "1.25rem", fontWeight: 800 }}>
                  🏪 At Dairy
                </h4>
                <p style={{ 
                  margin: 0, 
                  fontSize: "3.2rem", 
                  fontWeight: 900, 
                  color: "#f59e0b",
                  letterSpacing: "0.05em"
                }}>
                  {(() => {
                    const total = stockAtDairy.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
                    return total;
                  })()}
                </p>
                <p style={{ 
                  margin: "8px 0 0 0", 
                  fontSize: "0.95rem", 
                  color: "#b45309", 
                  fontWeight: 700 
                }}>
                  kept for storage
                </p>
              </div>

              {/* Stock Remaining Card */}
              <div style={{ 
                padding: "24px 20px", 
                backgroundColor: (() => {
                  const taken = stockTaken.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
                  const sold = customers.reduce((sum, c) => sum + (parseInt(c.orderQty) || 0), 0);
                  const dairy = stockAtDairy.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
                  const remaining = taken - sold - dairy;
                  return remaining >= 0 ? "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)" : "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)";
                })(),
                borderRadius: "14px", 
                border: (() => {
                  const taken = stockTaken.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
                  const sold = customers.reduce((sum, c) => sum + (parseInt(c.orderQty) || 0), 0);
                  const dairy = stockAtDairy.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
                  const remaining = taken - sold - dairy;
                  return remaining >= 0 ? "3px solid #22c55e" : "3px solid #ef4444";
                })(),
                textAlign: "center", 
                boxShadow: (() => {
                  const taken = stockTaken.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
                  const sold = customers.reduce((sum, c) => sum + (parseInt(c.orderQty) || 0), 0);
                  const dairy = stockAtDairy.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
                  const remaining = taken - sold - dairy;
                  return remaining >= 0 ? "0 4px 12px #22c55e22" : "0 4px 12px #ef444422";
                })(),
                transition: "all 0.3s",
                cursor: "default"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = (() => {
                  const taken = stockTaken.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
                  const sold = customers.reduce((sum, c) => sum + (parseInt(c.orderQty) || 0), 0);
                  const dairy = stockAtDairy.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
                  const remaining = taken - sold - dairy;
                  return remaining >= 0 ? "0 8px 20px #22c55e33" : "0 8px 20px #ef444433";
                })();
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = (() => {
                  const taken = stockTaken.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
                  const sold = customers.reduce((sum, c) => sum + (parseInt(c.orderQty) || 0), 0);
                  const dairy = stockAtDairy.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
                  const remaining = taken - sold - dairy;
                  return remaining >= 0 ? "0 4px 12px #22c55e22" : "0 4px 12px #ef444422";
                })();
              }}>
                <h4 style={{ 
                  margin: "0 0 12px 0", 
                  color: (() => {
                    const taken = stockTaken.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
                    const sold = customers.reduce((sum, c) => sum + (parseInt(c.orderQty) || 0), 0);
                    const dairy = stockAtDairy.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
                    const remaining = taken - sold - dairy;
                    return remaining >= 0 ? "#16a34a" : "#dc2626";
                  })(),
                  fontSize: "1.25rem", 
                  fontWeight: 800 
                }}>
                  ✅ Remaining
                </h4>
                <p style={{ 
                  margin: 0, 
                  fontSize: "3.2rem", 
                  fontWeight: 900, 
                  color: (() => {
                    const taken = stockTaken.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
                    const sold = customers.reduce((sum, c) => sum + (parseInt(c.orderQty) || 0), 0);
                    const dairy = stockAtDairy.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
                    const remaining = taken - sold - dairy;
                    return remaining >= 0 ? "#22c55e" : "#ef4444";
                  })(),
                  letterSpacing: "0.05em"
                }}>
                  {(() => {
                    const taken = stockTaken.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
                    const sold = customers.reduce((sum, c) => sum + (parseInt(c.orderQty) || 0), 0);
                    const dairy = stockAtDairy.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
                    return taken - sold - dairy;
                  })()}
                </p>
                <p style={{ 
                  margin: "8px 0 0 0", 
                  fontSize: "0.95rem", 
                  color: (() => {
                    const taken = stockTaken.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
                    const sold = customers.reduce((sum, c) => sum + (parseInt(c.orderQty) || 0), 0);
                    const dairy = stockAtDairy.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
                    const remaining = taken - sold - dairy;
                    return remaining < 0 ? "#dc2626" : "#16a34a";
                  })(),
                  fontWeight: 700 
                }}>
                  {(() => {
                    const taken = stockTaken.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
                    const sold = customers.reduce((sum, c) => sum + (parseInt(c.orderQty) || 0), 0);
                    const dairy = stockAtDairy.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
                    const remaining = taken - sold - dairy;
                    return remaining < 0 ? "⚠️ OVERSOLD!" : "units available";
                  })()}
                </p>
              </div>
            </div>

            {/* Calculation Formula */}
            <div style={{ 
              background: "rgba(2, 132, 199, 0.1)", 
              padding: "16px", 
              borderRadius: 10, 
              border: "2px dashed #0284c7",
              marginBottom: 0
            }}>
              <p style={{ 
                margin: 0, 
                color: "#0369a1", 
                fontWeight: 700,
                fontSize: "0.95em"
              }}>
                📐 Calculation: <strong>Remaining = Stock Taken - (Sold to Customers + Kept at Dairy)</strong>
              </p>
            </div>
          </div>

          {/* EXPORT & ACTIONS SECTION */}
          <div
            style={{
              marginTop: 28,
              marginBottom: 28,
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
              padding: "20px",
              background: "linear-gradient(135deg, #f0f9ff 0%, #f5f3ff 100%)",
              borderRadius: 14,
              border: "2px solid #0284c7",
              maxWidth: 1000,
              marginLeft: "auto",
              marginRight: "auto",
              boxShadow: "0 4px 16px #0284c722"
            }}
          >
            <div style={{ 
              width: "100%", 
              textAlign: "center", 
              marginBottom: 12,
              paddingBottom: 12,
              borderBottom: "2px solid #bfdbfe"
            }}>
              <h3 style={{
                margin: 0,
                color: "#0369a1",
                fontWeight: 900,
                fontSize: "1.4rem",
                letterSpacing: "0.05em"
              }}>
                📤 EXPORT OPTIONS
              </h3>
              <p style={{
                margin: "6px 0 0 0",
                color: "#0891b2",
                fontWeight: 600,
                fontSize: "0.95em"
              }}>
                Save your demo sales record in multiple formats
              </p>
            </div>

            <button
              type="button"
              className="btn-outline"
              style={{
                padding: "14px 32px",
                fontWeight: 800,
                fontSize: "1.1em",
                borderRadius: 10,
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                transition: "all 0.3s",
                boxShadow: "0 4px 12px #10b98144",
                minWidth: 200,
                letterSpacing: "0.03em"
              }}
              onClick={handleExportExcel}
              onMouseOver={(e) => {
                e.target.style.transform = "translateY(-3px)";
                e.target.style.boxShadow = "0 8px 20px #10b98155";
              }}
              onMouseOut={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 4px 12px #10b98144";
              }}
            >
              📊 Export to Excel
            </button>

            <button
              type="button"
              className="btn-outline"
              style={{
                padding: "14px 32px",
                fontWeight: 800,
                fontSize: "1.1em",
                borderRadius: 10,
                background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                transition: "all 0.3s",
                boxShadow: "0 4px 12px #3b82f644",
                minWidth: 200,
                letterSpacing: "0.03em"
              }}
              onClick={handleExportPDF}
              onMouseOver={(e) => {
                e.target.style.transform = "translateY(-3px)";
                e.target.style.boxShadow = "0 8px 20px #3b82f655";
              }}
              onMouseOut={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 4px 12px #3b82f644";
              }}
            >
              📄 Download PDF
            </button>

            <button
              type="button"
              className="btn-outline"
              style={{
                padding: "14px 32px",
                fontWeight: 800,
                fontSize: "1.1em",
                borderRadius: 10,
                background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                transition: "all 0.3s",
                boxShadow: "0 4px 12px #ec489944",
                minWidth: 200,
                letterSpacing: "0.03em"
              }}
              onClick={handleGenerateSummary}
              onMouseOver={(e) => {
                e.target.style.transform = "translateY(-3px)";
                e.target.style.boxShadow = "0 8px 20px #ec489955";
              }}
              onMouseOut={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 4px 12px #ec489944";
              }}
            >
              💬 WhatsApp Summary
            </button>

            <button
              type="submit"
              className="btn-primary"
              style={{
                padding: "14px 40px",
                fontWeight: 900,
                fontSize: "1.15em",
                borderRadius: 10,
                background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                transition: "all 0.3s",
                boxShadow: "0 4px 12px #8b5cf644",
                minWidth: 240,
                letterSpacing: "0.05em"
              }}
              onMouseOver={(e) => {
                e.target.style.transform = "translateY(-3px)";
                e.target.style.boxShadow = "0 8px 20px #8b5cf655";
              }}
              onMouseOut={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 4px 12px #8b5cf644";
              }}
            >
              {submitting ? "⏳ Submitting..." : "✅ FINAL SUBMIT"}
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
              {stockAtDairy.length === 0 ? (
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
                    {stockAtDairy.map((s, idx) => (
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

            <div style={{ marginTop: 14 }}>
              <b>Payment Collected</b>
              {paymentsCollected.length === 0 ? (
                <div style={{ color: "#b91c1c" }}>No payments added.</div>
              ) : (
                <>
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
                        <th>Amount</th>
                        <th>Mode</th>
                        <th>Given By</th>
                        <th>Taken By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentsCollected.map((p, idx) => (
                        <tr
                          key={idx}
                          style={{ background: idx % 2 === 0 ? "#f7fafd" : "#fff" }}
                        >
                          <td>₹{parseFloat(p.amount).toFixed(2)}</td>
                          <td>{p.mode}</td>
                          <td>{p.givenBy}</td>
                          <td>{p.takenBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: 8, fontWeight: "bold", color: "#2563eb" }}>
                    Total Payment: ₹{paymentsCollected.reduce((acc, p) => acc + parseFloat(p.amount), 0).toFixed(2)}
                  </div>
                </>
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