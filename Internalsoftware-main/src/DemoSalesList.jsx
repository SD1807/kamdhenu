import React, { useState, useEffect, useRef } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import notoSansGujarati from "./fonts/NotoSansGujarati-Regular.js";
import { saveAs } from "file-saver";
import { where, writeBatch, collection, addDoc, Timestamp, doc, getDocs, serverTimestamp, query, onSnapshot, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import Navbar from "./Navbar";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import "./form.css";
import { toast } from "react-toastify";
import { deleteDoc, updateDoc } from "firebase/firestore";
import ExcelJS from "exceljs";
import { VillageSelector } from "./components/stock/VillageSelector";
import { PACKAGING_DATA, getPriceByName, getPackagingNames, getLitresByName } from "./config/packagingConfig";
import { compressImage, getBase64SizeInMB } from "./imageCompressionUtils";

const storage = getStorage();

// Get packaging names array for dropdown display (without prices)
const packagingNames = getPackagingNames();

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
  appliedPrice: "",
  paymentMethod: "",
  photo: null,
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
  // Ref for customer form section to enable auto-scroll
  const customerFormRef = useRef(null);
  
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
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [filterByMember, setFilterByMember] = useState("all");
  const [filterByPackage, setFilterByPackage] = useState("all");
  const [filterByPayment, setFilterByPayment] = useState("all");
  const [isDashboardCollapsed, setIsDashboardCollapsed] = useState(false);
  const [isStockTakenCollapsed, setIsStockTakenCollapsed] = useState(false);
  const [isFileUploadCollapsed, setIsFileUploadCollapsed] = useState(true);
  const [lastVillageId, setLastVillageId] = useState(null);
  const [lastVillageName, setLastVillageName] = useState(null);

  // Get current user email from auth and load last village
  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      setCurrentUserEmail("");
      setLastVillageId(null);
      setLastVillageName(null);
      return;
    }

    setCurrentUserEmail(currentUser.email || "");

    // Load last village from Firebase userPreferences
    const loadLastVillage = async () => {
      try {
        const userPrefSnap = await getDoc(doc(db, "userPreferences", currentUser.uid));
        console.log("User preferences doc exists:", userPrefSnap.exists()); // Debug
        console.log("User preferences data:", userPrefSnap.data()); // Debug
        
        if (userPrefSnap.exists()) {
          const pref = userPrefSnap.data();
          if (pref.lastVillageId && pref.lastVillageName) {
            console.log("Setting last village:", pref.lastVillageId, pref.lastVillageName); // Debug
            setLastVillageId(pref.lastVillageId);
            setLastVillageName(pref.lastVillageName);
          }
        }
      } catch (err) {
        console.error("Error loading last village:", err);
      }
    };

    loadLastVillage();
  }, []);

  // Check if current user can edit a customer
  const canEditCustomer = (customer) => {
    return customer.addedByEmail === currentUserEmail;
  };

  // Get unique members list and compute filtered customers
  const uniqueMembers = [
    ...new Map(
      customers
        .filter(c => c.addedByEmail || c.addedByUsername || c.addedByDisplayName)
        .map(c => [c.addedByEmail || c.addedByUsername || c.addedByDisplayName, { email: c.addedByEmail, username: c.addedByUsername, displayName: c.addedByDisplayName }])
    ).values()
  ].sort((a, b) => {
    if (a.email === currentUserEmail) return -1;
    if (b.email === currentUserEmail) return 1;
    return 0;
  });

  // Filter customers based on selected member
  const filteredCustomersByMember = filterByMember === "all"
    ? [
        ...customers.filter(c => c.addedByEmail === currentUserEmail),
        ...customers.filter(c => c.addedByEmail !== currentUserEmail)
      ]
    : customers.filter(c => (c.addedByEmail || c.addedByUsername || c.addedByDisplayName) === filterByMember);

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

// Real-time listener for stock at dairy from Firebase
useEffect(() => {
  if (!selectedVillageId) {
    setStockAtDairy([]);
    return;
  }

  const unsub = onSnapshot(
    doc(db, "villageStocks", selectedVillageId),
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setStockAtDairy(Array.isArray(data.dairyStocks) ? data.dairyStocks : []);
      } else {
        setStockAtDairy([]);
      }
    },
    (err) => {
      console.error("Error loading dairy stock:", err);
      setStockAtDairy([]);
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
  const handleVillageSelect = async (e) => {
    const id = e.target.value;
    setSelectedVillageId(id);
    const found = villageOptions.find(v => v.id === id);
    const villageName = found ? found.name : "";
    setDemoInfo(prev => ({ ...prev, village: villageName }));

    // Save last village to Firebase userPreferences
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (currentUser && id) {
      try {
        await setDoc(doc(db, "userPreferences", currentUser.uid), {
          lastVillageId: id,
          lastVillageName: villageName,
          lastUpdated: serverTimestamp(),
        }, { merge: true });
        
        // Update local state
        setLastVillageId(id);
        setLastVillageName(villageName);
      } catch (err) {
        console.error("Error saving last village:", err);
      }
    }
  };

  const handleCustomerInput = (e) => {
    const { name, value } = e.target;
    setCustomerInput((prev) => ({ ...prev, [name]: value }));
  };



  const handleCustomerPhotoChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select a valid image file");
      return;
    }

    // Check original file size
    const originalSizeInMB = file.size / (1024 * 1024);
    if (originalSizeInMB > 10) {
      toast.error("Original file size is too large (>10MB). Please select a smaller image.");
      return;
    }

    try {
      setUploadingPhoto(true);
      
      // Compress the image
      console.log(`Compressing image: ${file.name} (${originalSizeInMB.toFixed(2)}MB)`);
      const compressedBase64 = await compressImage(file, 1200, 1200, 0.8);
      const compressedSizeInMB = getBase64SizeInMB(compressedBase64);
      
      console.log(`✅ Image compressed successfully: ${compressedSizeInMB.toFixed(2)}MB (from ${originalSizeInMB.toFixed(2)}MB)`);
      
      // Store compressed base64 in state
      setCustomerInput(prev => ({ 
        ...prev, 
        photo: compressedBase64,
        photoPreview: compressedBase64
      }));
      
      setUploadingPhoto(false);
      toast.success(`Photo loaded and compressed to ${(compressedSizeInMB * 1024).toFixed(0)}KB ✓`);
    } catch (err) {
      console.error('Error processing photo:', err);
      setUploadingPhoto(false);
      toast.error('Photo processing failed: ' + (err.message || err));
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

  // helper to get scheme details
  const getOnePlusOneByKey = (key) => onePlusOneSchemes.find((s) => s.key === key) || null;
  
  // Helper to calculate total litres sold from customers
  const calculateTotalLitres = () => {
    return customers.reduce((total, customer) => {
      const packaging = customer.orderPackaging;
      const qty = parseInt(customer.orderQty) || 0;
      const litresPerUnit = getLitresByName(packaging);
      return total + (litresPerUnit * qty);
    }, 0);
  };
  
  const [waCopied, setWACopied] = useState(false);
  const [demoId, setDemoId] = useState(null);
  const [isInsightsSidebarCollapsed, setIsInsightsSidebarCollapsed] = useState(true);
  const [insightsPosition, setInsightsPosition] = useState({ x: 20, y: 100 });
  const [isDraggingInsights, setIsDraggingInsights] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [soldSummary, setSoldSummary] = useState({});
  const [remainingStockList, setRemainingStockList] = useState([]);

  // Handle global drag events for smooth dragging
  useEffect(() => {
    if (!isDraggingInsights) return;

    const handleMouseMove = (e) => {
      setInsightsPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => {
      setIsDraggingInsights(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingInsights, dragOffset]);

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

// Auto-save demoInfo to Firebase villageDemo when it changes
useEffect(() => {
  if (!selectedVillageId) return;

  const saveData = async () => {
    try {
      await setDoc(doc(db, "villageDemo", selectedVillageId), {
        demoInfo: demoInfo,
        lastUpdated: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.error("Error saving demoInfo:", err);
    }
  };

  const timer = setTimeout(saveData, 500); // Debounce 500ms
  return () => clearTimeout(timer);
}, [demoInfo, selectedVillageId]);

// Auto-save paymentsCollected to Firebase
useEffect(() => {
  if (!selectedVillageId) return;

  const saveData = async () => {
    try {
      await setDoc(doc(db, "villageDemo", selectedVillageId), {
        paymentsCollected: paymentsCollected,
        lastUpdated: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.error("Error saving payments:", err);
    }
  };

  const timer = setTimeout(saveData, 500);
  return () => clearTimeout(timer);
}, [paymentsCollected, selectedVillageId]);

// Auto-save stockReturned to Firebase
useEffect(() => {
  if (!selectedVillageId) return;

  const saveData = async () => {
    try {
      await setDoc(doc(db, "villageDemo", selectedVillageId), {
        stockReturned: stockReturned,
        lastUpdated: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.error("Error saving stock returned:", err);
    }
  };

  const timer = setTimeout(saveData, 500);
  return () => clearTimeout(timer);
}, [stockReturned, selectedVillageId]);

// Load villageDemo data when village is selected
useEffect(() => {
  if (!selectedVillageId) {
    // Reset all data when no village selected
    setDemoInfo(initialDemoInfo);
    setPaymentsCollected([]);
    setStockReturned([]);
    setStockTaken([]);
    setStockAtDairy([]);
    return;
  }

  const loadData = async () => {
    try {
      // Load villageDemo data
      const demoDocSnap = await getDoc(doc(db, "villageDemo", selectedVillageId));
      if (demoDocSnap.exists()) {
        const data = demoDocSnap.data();
        
        // Load demoInfo if it exists
        if (data.demoInfo) {
          setDemoInfo(prev => ({
            ...prev,
            ...data.demoInfo,
            village: prev.village || data.demoInfo.village || ""
          }));
        }
        
        // Load paymentsCollected
        if (Array.isArray(data.paymentsCollected)) {
          setPaymentsCollected(data.paymentsCollected);
        }
        
        // Load stockReturned
        if (Array.isArray(data.stockReturned)) {
          setStockReturned(data.stockReturned);
        }
      } else {
        // New village - initialize with fresh data
        setPaymentsCollected([]);
        setStockReturned([]);
      }

      // Load villageStocks data
      const stockDocSnap = await getDoc(doc(db, "villageStocks", selectedVillageId));
      if (stockDocSnap.exists()) {
        const stockData = stockDocSnap.data();
        
        // Load stockTaken
        if (Array.isArray(stockData.stocks)) {
          setStockTaken(stockData.stocks);
        } else {
          setStockTaken([]);
        }
        
        // Load stockAtDairy
        if (Array.isArray(stockData.dairyStocks)) {
          setStockAtDairy(stockData.dairyStocks);
        } else {
          setStockAtDairy([]);
        }
      } else {
        setStockTaken([]);
        setStockAtDairy([]);
      }
    } catch (err) {
      console.error("Error loading village demo data:", err);
    }
  };

  loadData();
}, [selectedVillageId]);

// Auto-save stockTaken to Firebase villageStocks (for demo)
useEffect(() => {
  if (!selectedVillageId || stockTaken.length === 0) return;

  const saveData = async () => {
    try {
      await setDoc(doc(db, 'villageStocks', selectedVillageId), {
        stocks: stockTaken,
        villageName: demoInfo.village || (villageOptions.find(v => v.id === selectedVillageId)?.name) || "",
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.error('Error saving stockTaken:', err);
    }
  };

  const timer = setTimeout(saveData, 1000); // Debounce 1s
  return () => clearTimeout(timer);
}, [stockTaken, selectedVillageId, demoInfo.village, villageOptions]);

// Auto-save stockAtDairy to Firebase villageStocks (dairy inventory)
useEffect(() => {
  if (!selectedVillageId || stockAtDairy.length === 0) return;

  const saveData = async () => {
    try {
      await setDoc(doc(db, 'villageStocks', selectedVillageId), {
        dairyStocks: stockAtDairy,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.error('Error saving stockAtDairy:', err);
    }
  };

  const timer = setTimeout(saveData, 1000);
  return () => clearTimeout(timer);
}, [stockAtDairy, selectedVillageId]);

  // Helper function to deduct stock from stockTaken (shared by customers and dairy)
  const deductFromStock = (packLabel, qty) => {
    // Map between different packaging naming conventions
    const packagingMap = {
      "1LTR JAR": "1LTR JAR",
      "2LTR JAR": "2LTR JAR",
      "5LTR PLASTIC JAR": "5LTR PLASTIC JAR",
      "5LTR STEEL BARNI": "5LTR STEEL BARNI",
      "10 LTR JAR": "10 LTR JAR",
      "10 LTR STEEL": "10 LTR STEEL",
      "20 LTR CARBO": "20 LTR CARBO",
      "20 LTR CAN": "20 LTR CAN",
      "20 LTR STEEL": "20 LTR STEEL",
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
      "1LTR JAR": "1LTR JAR",
      "2LTR JAR": "2LTR JAR",
      "5LTR PLASTIC JAR": "5LTR PLASTIC JAR",
      "5LTR STEEL BARNI": "5LTR STEEL BARNI",
      "10 LTR JAR": "10 LTR JAR",
      "10 LTR STEEL": "10 LTR STEEL",
      "20 LTR CARBO": "20 LTR CARBO",
      "20 LTR CAN": "20 LTR CAN",
      "20 LTR STEEL": "20 LTR STEEL",
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

  // If upload still in progress, warn and prevent premature save
  if (uploadingPhoto) {
    toast.error('Please wait until photo upload completes');
    return;
  }

  // Get current user info
  const auth = getAuth();
  const user = auth.currentUser;
  let username = user?.reloadUserInfo?.screenName || user?.providerData?.[0]?.screenName || "";
  if (!username && user) username = user?.displayName || "";
  const displayName = user?.displayName || "";
  const email = user?.email || "";
  const addedBy = username || displayName || email || "Unknown";

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
      // Only save the actual uploaded photo URL, not the preview data URL
      const photoToSave = firestoreCustomer.photo || null;
      await addDoc(collection(db, "customers"), {
        ...firestoreCustomer,
        photo: photoToSave,
        photoPreview: null, // Don't save preview to database
        villageId: selectedVillageId,
        addedBy: addedBy,
        addedByUsername: username,
        addedByDisplayName: displayName,
        addedByEmail: email,
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

      // Map rows to normalized objects by POSITION (Column 1=Code, 2=Name, 4=Mobile)
      const normalizedData = rows
        .map((r) => {
          const keys = Object.keys(r);
          return {
            code: (r[keys[0]] || "")?.toString().trim(),           // Column 1: CODE
            name: (r[keys[1]] || "")?.toString().trim(),           // Column 2: NAME
            mobile: (r[keys[3]] || "")?.toString().trim(),         // Column 4: MOBILE
          };
        })
        .filter((c) => c.code || c.name || c.mobile); // Accept if ANY field has data

      console.log("✅ Loaded", normalizedData.length, "customers from Excel");

      if (normalizedData.length === 0) {
        toast.dismiss(toastId);
        toast.error("❌ No valid customer data found in Excel!");
        return;
      }

      // Update local state
      setExcelData((prev) => [...prev, ...normalizedData]);
      setCustomerData((prev) => [...prev, ...normalizedData]);

      toast.dismiss(toastId);
      toast.success(`✅ Successfully uploaded ${normalizedData.length} customers!`);

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
  if (!searchTerm || !searchTerm.trim()) {
    setFilteredCustomers([]);
    return;
  }

  const searchLower = searchTerm.toLowerCase().trim();

  const results = customerData
    .filter(c =>
      (c.code || "").toString().toLowerCase().includes(searchLower)
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
    const updatedStockAtDairy = [...stockAtDairy, { packaging: pkg, quantity: String(qty) }];
    setStockAtDairy(updatedStockAtDairy);
    toast.success(`✅ Noted ${qty} ${pkg} stored at Dairy`);
    
    // Auto-save to Firebase
    if (selectedVillageId) {
      setDoc(doc(db, 'villageStocks', selectedVillageId), {
        dairyStocks: updatedStockAtDairy,
        villageName: demoInfo.village || (villageOptions.find(v => v.id === selectedVillageId)?.name) || "",
        updatedAt: serverTimestamp(),
      }, { merge: true }).catch((err) => {
        console.error('Failed to save dairy stock:', err);
      });
    }
    
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
      
      // Auto-save to Firebase
      if (selectedVillageId) {
        setDoc(doc(db, 'villageStocks', selectedVillageId), {
          dairyStocks: updated,
          villageName: demoInfo.village || (villageOptions.find(v => v.id === selectedVillageId)?.name) || "",
          updatedAt: serverTimestamp(),
        }, { merge: true }).catch((err) => {
          console.error('Failed to save dairy stock changes:', err);
        });
      }
      
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
    
    // Auto-save to Firebase
    if (selectedVillageId) {
      setDoc(doc(db, 'villageStocks', selectedVillageId), {
        dairyStocks: updated,
        villageName: demoInfo.village || (villageOptions.find(v => v.id === selectedVillageId)?.name) || "",
        updatedAt: serverTimestamp(),
      }, { merge: true }).catch((err) => {
        console.error('Failed to save dairy stock changes:', err);
      });
    }
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
    appliedPrice: customer.appliedPrice || "",
    paymentMethod: customer.paymentMethod || "",
  });

  setEditingCustomerId(customer.id); // VERY IMPORTANT
  
  // Auto-scroll to customer form
  if (customerFormRef.current) {
    setTimeout(() => {
      customerFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }
};


const handleUpdateCustomer = async () => {
  if (!editingCustomerId) return;
  if (uploadingPhoto) {
    toast.error('Please wait until photo upload completes');
    return;
  }
  try {
    // Keep the original addedBy fields when updating
    const updateData = { ...customerInput };
    // Preserve the original addedBy fields
    const originalCustomer = customers.find(c => c.id === editingCustomerId);
    if (originalCustomer) {
      updateData.addedBy = originalCustomer.addedBy;
      updateData.addedByEmail = originalCustomer.addedByEmail;
      updateData.addedByUsername = originalCustomer.addedByUsername;
      updateData.addedByDisplayName = originalCustomer.addedByDisplayName;
    }
    await updateDoc(doc(db, "customers", editingCustomerId), updateData);
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

      // Clear stocks in Firebase after successful submission
      if (selectedVillageId) {
        await setDoc(doc(db, 'villageStocks', selectedVillageId), {
          stocks: [],
          dairyStocks: [],
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

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
  const handleExportDemoRegister = async () => {
    try {
      if (customers.length === 0) {
        toast.error("No customers to export");
        return;
      }

      const resolvedVillage = demoInfo.village || (villageOptions.find(v => v.id === selectedVillageId)?.name) || "-";
      const resolvedTaluka = demoInfo.taluka || "-";
      const resolvedMantri = demoInfo.mantri || "-";
      const resolvedDate = demoInfo.date || "-";

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

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Demo Register");

      sheet.mergeCells("A1:H1");
      sheet.getCell("A1").value = `Village: ${resolvedVillage}    Taluka: ${resolvedTaluka}`;
      sheet.mergeCells("A2:H2");
      sheet.getCell("A2").value = `Mantri: ${resolvedMantri}`;
      sheet.mergeCells("A3:H3");
      sheet.getCell("A3").value = `Date: ${resolvedDate}`;

      sheet.addRow([]);
      sheet.addRow([]);
      sheet.addRow(["No", "Name", "Photo", "Mobile Number", "Receipt No", "Packaging", "Quantity", "Amount", "Payment Method", "Date / Installment"]);
      sheet.getRow(5).font = { bold: true };

      const exportCustomers = [...customers];
      const hasPending = (customerInput && (customerInput.name || customerInput.mobile || customerInput.code || customerInput.orderQty));
      if (hasPending) exportCustomers.push({ ...customerInput });

      let grandTotal = 0;

      for (let i = 0; i < exportCustomers.length; i++) {
        const c = exportCustomers[i];
        const qty = parseInt(c.orderQty) || 0;
        let rate = 0;
        if (c.appliedPrice) {
          rate = parseInt(c.appliedPrice) || 0;
        } else {
          rate = getPriceByName(c.orderPackaging) || 0;
        }
        const total = rate * qty;
        grandTotal += total;

        sheet.addRow([i + 1, c.name || "", "", c.mobile || "", c.code || "", c.orderPackaging || "", qty, total, c.paymentMethod || "", demoInfo.date || ""]);
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
      toast.success("✓ Demo Register exported successfully!");
    } catch (err) {
      console.error('Excel export failed:', err);
      toast.error('❌ Excel export failed: ' + (err.message || err));
    }
  };

  const handleExportMantriReport = async () => {
    try {
      const pavtiCustomers = customers.filter(c => c.paymentMethod === "PAVTI");
      
      if (pavtiCustomers.length === 0) {
        toast.error("❌ No PAVTI customers found for Mantri report");
        return;
      }

      const resolvedVillage = demoInfo.village || (villageOptions.find(v => v.id === selectedVillageId)?.name) || "-";
      const resolvedTaluka = demoInfo.taluka || "-";
      const resolvedMantri = demoInfo.mantri || "-";
      const resolvedDate = demoInfo.date || "-";

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

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Mantri Report");

      sheet.mergeCells("A1:H1");
      sheet.getCell("A1").value = `Village: ${resolvedVillage}    Taluka: ${resolvedTaluka}`;
      sheet.mergeCells("A2:H2");
      sheet.getCell("A2").value = `Mantri: ${resolvedMantri}`;
      sheet.mergeCells("A3:H3");
      sheet.getCell("A3").value = `Date: ${resolvedDate}`;

      sheet.addRow([]);
      sheet.addRow([]);
      sheet.addRow(["No", "Name", "Photo", "Mobile Number", "Receipt No", "Packaging", "Quantity", "Amount", "Payment Method", "Date / Installment"]);
      sheet.getRow(5).font = { bold: true };

      let grandTotal = 0;

      for (let i = 0; i < pavtiCustomers.length; i++) {
        const c = pavtiCustomers[i];
        const qty = parseInt(c.orderQty) || 0;
        let rate = 0;
        if (c.appliedPrice) {
          rate = parseInt(c.appliedPrice) || 0;
        } else {
          rate = getPriceByName(c.orderPackaging) || 0;
        }
        const total = rate * qty;
        grandTotal += total;

        sheet.addRow([i + 1, c.name || "", "", c.mobile || "", c.code || "", c.orderPackaging || "", qty, total, c.paymentMethod || "", demoInfo.date || ""]);
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
      sheet.addRow(["Total PAVTI Customers", pavtiCustomers.length]);
      sheet.addRow(["Grand Total Amount", grandTotal]);

      sheet.columns.forEach((col, idx) => {
        if ((idx + 1) === 3) col.width = 15; else col.width = 22;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Mantri_Report_${demoInfo.village || "export"}.xlsx`);
      toast.success("✓ Mantri Report (PAVTI Only) exported successfully!");
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
            const match = packagingNames.find((opt) =>
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
        const match = packagingNames.find((opt) => opt.startsWith(c.orderPackaging));
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
      ...packagingNames,
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

  // Group stock at dairy by packaging (only dairy stock)
  const stockSummary = {};
  stockAtDairy.forEach(s => {
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

  // Grand total litres = customer sales + dairy stock
  const grandTotalLitres =
    customers.reduce((acc, c) => {
      const litres = getLitresByName(c.orderPackaging) || 0;
      const qty = parseInt(c.orderQty) || 0;
      return acc + litres * qty;
    }, 0) +
    stockAtDairy.reduce((acc, s) => {
      const litres = getLitresByName(s.packaging) || 0;
      const qty = parseInt(s.quantity) || 0;
      return acc + litres * qty;
    }, 0);

  // Final formatted WA summary
  const summaryText = 
`𝗩𝗶𝗹𝗹𝗮𝗴𝗲 ${villageName} 𝗗𝗲𝗺𝗼 𝘀𝗲𝗹𝗹:- 
${salesLines || "—"}

STOCK AT DAIRY:-
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
    if (qty === 0 || !customerInput.orderPackaging) return 0;
    
    // If packaging matches a predefined 1+1 combo, use its offer price
    const schemeByPack = onePlusOneSchemes.find((s) => s.label === customerInput.orderPackaging);
    if (schemeByPack) {
      return (schemeByPack.offer || schemeByPack.base || 0) * qty;
    }
    
    // If a manual offer is provided per-customer, use that
    const manual = parseInt(customerInput.manualOffer || "") || 0;
    if (manual > 0) return manual * qty;
    
    // Get price from packaging config
    const price = getPriceByName(customerInput.orderPackaging);
    
    // Debug: log if price is 0 to help identify issues
    if (!price) {
      console.warn(`Price not found for packaging: "${customerInput.orderPackaging}"`);
    }
    
    return price * qty;
  })();

  const filteredResults = customerData.filter((customer) =>
    Object.values(customer).join(" ").toLowerCase().includes(searchQuery.toLowerCase())
  );
  
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

            {/* Village Selection with Search */}
            <VillageSelector
              villageOptions={villageOptions}
              selectedVillageId={selectedVillageId}
              onVillageChange={(id) => {
                setSelectedVillageId(id);
                const found = villageOptions.find(v => v.id === id);
                const villageName = found ? found.name : "";
                setDemoInfo(prev => ({ ...prev, village: villageName }));
                
                // Save last village to Firebase
                const auth = getAuth();
                const currentUser = auth.currentUser;
                if (currentUser && id) {
                  setDoc(doc(db, "userPreferences", currentUser.uid), {
                    lastVillageId: id,
                    lastVillageName: villageName,
                    lastUpdated: serverTimestamp(),
                  }, { merge: true }).catch(err => console.error("Error saving last village:", err));
                  
                  setLastVillageId(id);
                  setLastVillageName(villageName);
                }
              }}
              label="Village*"
              showLabel={true}
            />

            {/* LAST VILLAGE ADDED */}
            <div style={{
              gridColumn: "1 / -1",
              marginTop: 8,
              padding: "6px 0",
              textAlign: "center",
              fontSize: "0.8em"
            }}>
              {lastVillageId && lastVillageName ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVillageId(lastVillageId);
                    setDemoInfo(prev => ({ ...prev, village: lastVillageName }));
                  }}
                  style={{
                    background: "transparent",
                    color: "#9ca3af",
                    border: "1px solid #e5e7eb",
                    padding: "4px 8px",
                    borderRadius: 4,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontSize: "0.8em",
                    transition: "all 0.2s"
                  }}
                  onMouseOver={(e) => {
                    e.target.style.color = "#6366f1";
                    e.target.style.borderColor = "#6366f1";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.color = "#9ca3af";
                    e.target.style.borderColor = "#e5e7eb";
                  }}
                >
                  ⏰ Last: {lastVillageName}
                </button>
              ) : null}
            </div>

            <div>              <div>
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

  {/* ========== DEMO INSIGHTS SIDEBAR - DRAGGABLE ========== */}
  {demoId && (
    <div
      style={{
        position: "fixed",
        left: insightsPosition.x,
        top: insightsPosition.y,
        zIndex: 50,
        background: isInsightsSidebarCollapsed ? "#2563eb" : "#ffffff",
        border: isInsightsSidebarCollapsed ? "none" : "1px solid #e5e7eb",
        borderRadius: isInsightsSidebarCollapsed ? "50%" : "12px",
        padding: isInsightsSidebarCollapsed ? "8px" : "14px",
        boxShadow: isInsightsSidebarCollapsed 
          ? "0 6px 20px rgba(37, 99, 235, 0.3)" 
          : "0 4px 16px rgba(0, 0, 0, 0.12)",
        width: isInsightsSidebarCollapsed ? "50px" : "auto",
        height: isInsightsSidebarCollapsed ? "50px" : "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transition: isDraggingInsights ? "none" : "all 0.25s ease",
        userSelect: "none",
      }}
    >
      {/* Toggle Button - Draggable Handle */}
      <button
        type="button"
        onMouseDown={(e) => {
          if (isInsightsSidebarCollapsed && !isDraggingInsights) {
            // Get the parent container position
            const container = e.currentTarget.parentElement;
            const rect = container.getBoundingClientRect();
            
            // Calculate offset from click point to widget center
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            setDragOffset({
              x: e.clientX - centerX,
              y: e.clientY - centerY,
            });
            setIsDraggingInsights(true);
            e.preventDefault();
            e.currentTarget.style.cursor = "grabbing";
          }
        }}
        onMouseUp={(e) => {
          if (isInsightsSidebarCollapsed) {
            e.currentTarget.style.cursor = "grab";
          }
        }}
        onClick={() => {
          if (isInsightsSidebarCollapsed && !isDraggingInsights) {
            setIsInsightsSidebarCollapsed(false);
          } else if (!isInsightsSidebarCollapsed) {
            setIsInsightsSidebarCollapsed(true);
          }
        }}
        style={{
          background: "none",
          border: "none",
          fontSize: isInsightsSidebarCollapsed ? "1.6em" : "1.2em",
          cursor: isInsightsSidebarCollapsed ? "grab" : "pointer",
          padding: "0",
          color: isInsightsSidebarCollapsed ? "#fff" : "#2563eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s",
          lineHeight: 1,
        }}
        title={isInsightsSidebarCollapsed ? "Drag to move • Click to expand" : "Click to close"}
      >
        {isInsightsSidebarCollapsed ? "📊" : "✕"}
      </button>

      {/* Expanded Content */}
      {!isInsightsSidebarCollapsed && (
        <div style={{ marginTop: 8, width: "100%" }}>
          {/* Total Customers */}
          <div style={{ textAlign: "center", marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid #f0f0f0" }}>
            <div style={{ fontSize: "0.65em", color: "#6b7280", fontWeight: 600, marginBottom: 3, textTransform: "uppercase" }}>👥</div>
            <div style={{ fontSize: "1.4em", fontWeight: 800, color: "#2563eb" }}>{customers.length}</div>
          </div>

          {/* Total Liters */}
          <div style={{ textAlign: "center", marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid #f0f0f0" }}>
            <div style={{ fontSize: "0.65em", color: "#6b7280", fontWeight: 600, marginBottom: 3, textTransform: "uppercase" }}>🥛</div>
            <div style={{ fontSize: "1.4em", fontWeight: 800, color: "#10b981" }}>{calculateTotalLitres()}L</div>
          </div>

          {/* Demo Status */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.65em", color: "#6b7280", fontWeight: 600, marginBottom: 3, textTransform: "uppercase" }}>Status</div>
            <div style={{ fontSize: "0.75em", fontWeight: 700, color: "#16a34a" }}>🟢 Live</div>
          </div>
        </div>
      )}
    </div>
  )}

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
          <div style={{ padding: "14px 16px 10px 16px", background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", borderRadius: "11px 11px 0 0", color: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: "1.15em", letterSpacing: "0.05em" }}>
                  📦 STOCK TAKEN
                </h3>
                <button
                  type="button"
                  onClick={() => setIsStockTakenCollapsed(!isStockTakenCollapsed)}
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
                  {isStockTakenCollapsed ? "▶" : "▼"}
                </button>
              </div>
              {(() => {
                const totalQty = stockTaken.reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);
                return (
                  <div style={{ background: "rgba(255,255,255,0.25)", padding: "6px 12px", borderRadius: 8, fontSize: "0.9em", fontWeight: 700 }}>
                    <span style={{ fontSize: "1.1em" }}>{totalQty}</span>
                    <div style={{ fontSize: "0.75em", opacity: 0.9 }}>Units</div>
                  </div>
                );
              })()}
            </div>
            <p style={{ margin: 0, fontSize: "0.85em", opacity: 0.9 }}>Add packaging items for village</p>
          </div>

          {!isStockTakenCollapsed && (
            <>
              {/* Input Form Section */}
              <div style={{ padding: "10px 14px", background: "#fff", borderBottom: "1px solid #e0f2fe" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, alignItems: "flex-end" }}>
                  <div>
                    <label style={{ fontWeight: 700, color: "#0369a1", display: "block", marginBottom: 4, fontSize: "0.9em" }}>Select Packaging Type</label>
                    <select 
                      value={stockInput.packaging} 
                      onChange={(e) => setStockInput({ ...stockInput, packaging: e.target.value })} 
                      style={{ 
                        width: "100%", 
                        padding: "8px 10px", 
                        borderRadius: 6, 
                        border: "2px solid #bfdbfe", 
                        background: "#fff", 
                        color: "#000",
                        fontSize: "0.9em",
                        fontWeight: 600
                      }}
                    >
                      <option value="">-- Select Packaging --</option>
                      {packagingNames.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontWeight: 700, color: "#0369a1", display: "block", marginBottom: 4, fontSize: "0.9em" }}>Quantity</label>
                    <input 
                      type="number" 
                      name="quantity" 
                      value={stockInput.quantity} 
                      onChange={handleStockInput} 
                      min="1" 
                      placeholder="Enter qty" 
                      style={{ 
                        width: "100%", 
                        padding: "8px 10px", 
                        borderRadius: 6, 
                        border: "2px solid #bfdbfe", 
                        background: "#fff",
                        fontSize: "0.9em",
                        fontWeight: 600
                      }} 
                    />
                  </div>

                  <button 
                    type="button" 
                    onClick={addStock} 
                    style={{ 
                      padding: "8px 18px", 
                      background: "#10b981", 
                      color: "#fff", 
                      border: "none", 
                      borderRadius: 8, 
                      fontWeight: 700, 
                      fontSize: "0.9em", 
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
              <div style={{ padding: "10px 14px" }}>
                {stockTaken.length === 0 ? (
                  <div style={{ 
                    textAlign: "center", 
                    color: '#6b7280', 
                    padding: "16px 10px", 
                    fontSize: "0.9em",
                    background: "#f8fafc",
                    borderRadius: 6,
                    border: "1px dashed #cbd5e1"
                  }}>
                    <div style={{ fontSize: "2em", marginBottom: 4 }}>📭</div>
                    <div>No stock added yet. Add packaging and quantity above to get started.</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "flex", overflowX: "auto", gap: 10, marginBottom: 12, paddingBottom: 6 }}>
                      {stockTaken.map((t, idx) => (
                        <div 
                          key={idx} 
                          style={{ 
                            background: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
                            padding: "12px", 
                            borderRadius: 10, 
                            border: "2px solid #06b6d4", 
                            display: "flex", 
                            justifyContent: "space-between", 
                            alignItems: "center",
                            boxShadow: "0 2px 8px #06b6d422",
                            minWidth: 210,
                            flexShrink: 0,
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 800, color: "#0369a1", fontSize: "0.95em" }}>{t.packaging}</div>
                            <div style={{ color: "#0891b2", fontSize: "0.85em", marginTop: 2, fontWeight: 700 }}>Qty: {t.quantity}</div>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => removeStockTaken(idx)} 
                            style={{ 
                              padding: '6px 10px', 
                              borderRadius: 6, 
                              background: '#ef4444', 
                              color: '#fff', 
                              border: 'none', 
                              cursor: 'pointer', 
                              fontWeight: 700, 
                              fontSize: "0.85em", 
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
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button 
                        type="button" 
                        onClick={saveStockToVillage} 
                        style={{ 
                          flex: 1, 
                          padding: "8px 12px", 
                          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", 
                          color: "#fff", 
                          border: "none", 
                          borderRadius: 8, 
                          fontWeight: 700, 
                          fontSize: "0.9em",
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
            </>
          )}
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
            ref={customerFormRef}
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
            {/* File Upload Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 12, borderBottom: "2px solid #b6c7e6" }}>
              <h4 style={{ margin: 0, fontWeight: 700, color: "#0369a1", fontSize: "1.05em" }}>📁 Upload Customers</h4>
              <button
                type="button"
                onClick={() => setIsFileUploadCollapsed(!isFileUploadCollapsed)}
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "0.85em",
                  transition: "all 0.2s"
                }}
                onMouseOver={(e) => e.target.style.background = "#1d4ed8"}
                onMouseOut={(e) => e.target.style.background = "#2563eb"}
              >
                {isFileUploadCollapsed ? "▶ Expand" : "▼ Collapse"}
              </button>
            </div>

            {/* File Upload Content */}
            {!isFileUploadCollapsed && (
              <div style={{ marginBottom: 20, padding: "12px 0" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                  <input type="file" accept=".xlsx, .xls,.csv" onChange={handleExcelUpload} />
                  {excelData.length > 0 && (
                    <button
                      type="button"
                      onClick={handleCancelExcelUpload}
                      style={{
                        padding: "5px 10px",
                        backgroundColor: "#ff4d4f",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "0.9em"
                      }}
                    >
                      Cancel Upload
                    </button>
                  )}
                </div>
                <span style={{ color: "#6b7280", fontSize: "0.85em" }}>📝 Upload will add to existing customers</span>
              </div>
            )}

            {/* Search & Select customer */}
            <div style={{ marginTop: 16, marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: "0.9em", color: "#374151" }}>🔍 Search Customer:</label>
            </div>
            <div style={{ position: "relative", width: "100%", maxWidth: "500px" }}>
              <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
                <span style={{ position: "absolute", left: 12, color: "#2563eb", fontSize: "1.2em" }}>🔍</span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search customer by name, mobile, code..."
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

              {filteredCustomers.length > 0 && (
                <ul
                  style={{
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
                    zIndex: 20
                  }}
                >
                  {filteredCustomers.slice(0, 6).map((cust, idx) => (
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
                        setSearchTerm(cust.name);
                        setFilteredCustomers([]);
                      }}
                      style={{
                        padding: "12px 16px",
                        cursor: "pointer",
                        borderBottom: idx < Math.min(filteredCustomers.length - 1, 5) ? "1px solid #f0f0f0" : "none",
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
                          <div style={{ fontWeight: 600, color: "#1f2937", fontSize: "0.95em" }}>📋 {cust.name}</div>
                          <div style={{ fontSize: "0.8em", color: "#6b7280", marginTop: 2 }}>📱 {cust.mobile || "N/A"} {cust.code && `• Code: ${cust.code}`}</div>
                        </div>
                        <div style={{ color: "#2563eb", fontSize: "1em" }}>→</div>
                      </div>
                    </li>
                  ))}
                  {filteredCustomers.length > 6 && (
                    <li style={{ padding: "8px 16px", textAlign: "center", color: "#9ca3af", fontSize: "0.85em", borderTop: "1px solid #f0f0f0" }}>
                      ... {filteredCustomers.length - 6} more results
                    </li>
                  )}
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
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
                    {packagingNames.map((opt) => (
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

                <div style={{ marginTop: "10px", fontWeight: "bold", gridColumn: "1 / -1" }}>
                  Customer Total: ₹{currentTotal}
                </div>

                <div style={{ flex: 2, minWidth: 120, gridColumn: "1 / -1" }}>
                  <label>Remarks</label>
                  <input
                    name="remarks"
                    value={customerInput.remarks}
                    onChange={handleCustomerInput}
                    style={{ fontFamily: "Noto Sans Gujarati, sans-serif" }}
                    placeholder="ટિપ્પણી દાખલ કરો"
                  />
                </div>

                <div style={{ flex: 1, minWidth: 150, gridColumn: "1 / -1" }}>
                  <label>Payment Method</label>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
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

                <div style={{ minWidth: 180, gridColumn: "1 / -1" }}>
                  <label>Photo</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: "wrap" }}>
                    <select value={photoCapture} onChange={(e) => setPhotoCapture(e.target.value)} style={{ padding: '6px', borderRadius: 6, flex: 1, minWidth: 150 }}>
                      <option value="environment">Back Camera (recommended)</option>
                      <option value="user">Front Camera</option>
                    </select>
                    <input
                      type="file"
                      accept="image/*"
                      capture={photoCapture}
                      onChange={handleCustomerPhotoChange}
                      style={{ flex: 1, minWidth: 150 }}
                    />
                  </div>
                  {(customerInput.photo || customerInput.photoPreview) && (
                    <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <img src={customerInput.photo || customerInput.photoPreview} alt="preview" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }} />
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerInput(prev => ({ ...prev, photo: '', photoPreview: '' }));
                          toast.success("Photo removed");
                        }}
                        style={{
                          padding: '6px 10px',
                          background: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '0.9em',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.background = '#dc2626'}
                        onMouseOut={(e) => e.target.style.background = '#ef4444'}
                        title="Delete photo"
                      >
                        ✕ Delete
                      </button>
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
                  }}
                > Send OTP
                </button>

                <div
                  style={{
                    minWidth: 120,
                    display: "flex",
                    gap: 8,
                    gridColumn: "1 / -1",
                    flexWrap: "wrap"
                  }}
                >

<button
  type="button"
  onClick={editingCustomerId ? handleUpdateCustomer : addCustomer}
  disabled={uploadingPhoto}
  title={uploadingPhoto ? 'Wait for photo upload' : ''}
  style={{ flex: 1, minWidth: 120 }}
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
      flex: 1,
      minWidth: 120
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

            {/* Customer List - Responsive */}
            {customers.length > 0 && (
              <div style={{ marginTop: 18 }}>
                {/* Search Bar */}
                <div style={{ marginBottom: 14, display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: "0.9em", color: "#374151" }}>Search Customer:</label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by Code, Name, or Mobile..."
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: 6,
                        fontSize: "0.95em",
                        background: "#fff"
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!searchQuery.trim()) {
                        setSearchQuery("");
                      }
                    }}
                    style={{
                      padding: "8px 16px",
                      background: "#2563eb",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: "0.9em",
                      transition: "all 0.2s"
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = "#1d4ed8";
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = "#2563eb";
                    }}
                  >
                    🔍 Search
                  </button>
                </div>

                {/* Combined Filter Dropdown */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: "0.9em", color: "#374151" }}>Quick Filter:</label>
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.startsWith("member:")) {
                        setFilterByMember(val.substring(7));
                        setFilterByPackage("all");
                        setFilterByPayment("all");
                      } else if (val.startsWith("package:")) {
                        setFilterByPackage(val.substring(8));
                        setFilterByMember("all");
                        setFilterByPayment("all");
                      } else if (val.startsWith("payment:")) {
                        setFilterByPayment(val.substring(8));
                        setFilterByMember("all");
                        setFilterByPackage("all");
                      } else {
                        setFilterByMember("all");
                        setFilterByPackage("all");
                        setFilterByPayment("all");
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: 6,
                      fontSize: "0.95em",
                      background: "#fff",
                      cursor: "pointer"
                    }}
                  >
                    <option value="">— All Customers —</option>
                    
                    <optgroup label="👤 Members">
                      {uniqueMembers.map((member) => (
                        <option key={member.email} value={`member:${member.email || member.username || member.displayName}`}>
                          {member.email === currentUserEmail ? `${member.username || member.displayName || member.email} (You)` : `${member.username || member.displayName || member.email}`}
                        </option>
                      ))}
                    </optgroup>

                    <optgroup label="📦 Packages">
                      {[...new Set(customers.map(c => c.orderPackaging).filter(Boolean))].sort().map((pkg) => (
                        <option key={pkg} value={`package:${pkg}`}>{pkg}</option>
                      ))}
                    </optgroup>

                    <optgroup label="💳 Payment Methods">
                      <option value="payment:CASH">💵 CASH</option>
                      <option value="payment:PAVTI">📋 PAVTI</option>
                    </optgroup>
                  </select>
                </div>

                {/* Calculate filtered list */}
                {(() => {
                  let displayList = filteredCustomersByMember;

                  // Package filter
                  if (filterByPackage !== "all") {
                    displayList = displayList.filter(c => c.orderPackaging === filterByPackage);
                  }

                  // Payment filter
                  if (filterByPayment !== "all") {
                    displayList = displayList.filter(c => c.paymentMethod === filterByPayment);
                  }

                  // Search filter: code, name, mobile
                  if (searchQuery.trim()) {
                    const query = searchQuery.toLowerCase();
                    displayList = displayList.filter(c =>
                      (c.code && c.code.toLowerCase().includes(query)) ||
                      (c.name && c.name.toLowerCase().includes(query)) ||
                      (c.mobile && c.mobile.toLowerCase().includes(query))
                    );
                  } else {
                    // Show only 5 recent entries if no search
                    displayList = displayList.slice(-5).reverse();
                  }

                  return (
                    <>
                      {searchQuery && <div style={{ marginBottom: 12, fontSize: "0.9em", color: "#6b7280" }}>Found {displayList.length} customer(s)</div>}
                      {/* Card View - Horizontal Scroll */}
                      <div style={{ display: "flex", overflowX: "auto", gap: 12, paddingBottom: 8 }}>
                        {displayList.map((c, idx) => {
                          const qty = parseInt(c.orderQty) || 0;
                          let rate = 0;
                          if (c.appliedPrice) {
                            rate = parseInt(c.appliedPrice) || 0;
                          } else {
                            rate = getPriceByName(c.orderPackaging) || 0;
                          }
                          const total = rate * qty;

                          return (
                            <div
                              key={idx}
                              style={{
                                background: "#fff",
                                border: "1px solid #e5e7eb",
                                borderRadius: 10,
                                padding: 14,
                                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                                minWidth: 280,
                                flexShrink: 0,
                              }}
                            >
                              {/* Header with Photo and Name */}
                              <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "flex-start" }}>
                                <div>
                                  {c.photo ? (
                                    <img src={c.photo} alt="customer" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: "1px solid #d1d5db" }} />
                                  ) : (
                                    <div style={{ width: 60, height: 60, background: "#f3f4f6", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: "1.5em" }}>📷</div>
                                  )}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 700, fontSize: "1.05em", color: "#1f2937" }}>{c.name}</div>
                                  <div style={{ fontSize: "0.85em", color: "#6b7280", marginTop: 2 }}>📱 {c.mobile}</div>
                                  {c.code && <div style={{ fontSize: "0.85em", color: "#6b7280" }}>📋 Code: {c.code}</div>}
                                </div>
                              </div>

                              {/* Details Grid */}
                              <div style={{ background: "#f9fafb", borderRadius: 6, padding: 10, marginBottom: 12 }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: "0.9em" }}>
                                  <div>
                                    <div style={{ color: "#6b7280", fontSize: "0.8em" }}>� Code</div>
                                    <div style={{ fontWeight: 600, color: "#1f2937", marginTop: 2 }}>{c.code || '—'}</div>
                                  </div>
                                  <div>
                                    <div style={{ color: "#6b7280", fontSize: "0.8em" }}>�📦 Packaging</div>
                                    <div style={{ fontWeight: 600, color: "#1f2937", marginTop: 2 }}>{c.orderPackaging}</div>
                                  </div>
                                  <div>
                                    <div style={{ color: "#6b7280", fontSize: "0.8em" }}>📊 Qty</div>
                                    <div style={{ fontWeight: 600, color: "#2563eb", marginTop: 2 }}>{qty}</div>
                                  </div>
                                  <div>
                                    <div style={{ color: "#6b7280", fontSize: "0.8em" }}>💰 Total</div>
                                    <div style={{ fontWeight: 700, color: "#16a34a", marginTop: 2, fontSize: "1.1em" }}>₹{total}</div>
                                  </div>
                                  <div>
                                    <div style={{ color: "#6b7280", fontSize: "0.8em" }}>💳 Payment</div>
                                    <div style={{ fontWeight: 600, color: c.paymentMethod === 'CASH' ? '#dc2626' : '#0369a1', marginTop: 2 }}>{c.paymentMethod || '—'}</div>
                                  </div>
                                </div>
                              </div>

                              {/* Additional Info */}
                              {c.remarks && (
                                <div style={{ marginBottom: 10, fontSize: "0.85em" }}>
                                  <div style={{ color: "#6b7280" }}>📝 Remarks:</div>
                                  <div style={{ color: "#374151", marginTop: 2 }}>{c.remarks}</div>
                                </div>
                              )}

                              {/* Entry By */}
                              <div style={{ fontSize: "0.8em", color: "#6b7280", marginBottom: 10 }}>
                                👤 By: <span style={{ color: "#2563eb", fontWeight: 600 }}>{c.addedByUsername || c.addedByDisplayName || c.addedBy || demoInfo.entryBy || ''}</span>
                              </div>

                              {/* Action Buttons */}
                              <div style={{ display: "flex", gap: 8 }}>
                                {canEditCustomer(c) ? (
                                  <>
                                    <button
                                type="button"
                                style={{
                                  flex: 1,
                                  background: "#2563eb",
                                  color: "#fff",
                                  padding: "8px 12px",
                                  borderRadius: 6,
                                  border: "none",
                                  fontWeight: 600,
                                  fontSize: "0.9em",
                                  cursor: "pointer",
                                }}
                                onClick={() => handleEditCustomer(c)}
                              >
                                ✏️ Edit
                              </button>
                              <button
                                type="button"
                                style={{
                                  flex: 1,
                                  background: "#ef4444",
                                  color: "#fff",
                                  padding: "8px 12px",
                                  borderRadius: 6,
                                  border: "none",
                                  fontWeight: 600,
                                  fontSize: "0.9em",
                                  cursor: "pointer",
                                }}
                                onClick={() => handleRemoveCustomer(c.id)}
                              >
                                🗑️ Remove
                              </button>
                            </>
                          ) : (
                            <div style={{ width: "100%", textAlign: "center", fontSize: "0.85em", color: "#9ca3af", padding: "8px 12px" }}>Added by {c.addedByUsername || c.addedByDisplayName || c.addedBy}</div>
                          )}
                        </div>
                      </div>
                    );
                        })}
                      </div>
                    </>
                  );
                })()}

                {/* Grand Total - Always Visible on Mobile */}
                <div style={{ marginTop: 14, padding: 14, background: "linear-gradient(135deg, #f0f7ff 0%, #e0f2fe 100%)", border: "2px solid #0284c7", borderRadius: 8, textAlign: "center" }}>
                  <div style={{ color: "#0369a1", fontSize: "0.9em", fontWeight: 600, marginBottom: 6 }}>Grand Total</div>
                  <div style={{ fontSize: "1.5em", fontWeight: 700, color: "#1e40af" }}>
                    ₹{filteredCustomersByMember.reduce((acc, c) => {
                      let rate = 0;
                      if (c.appliedPrice) {
                        rate = parseInt(c.appliedPrice) || 0;
                      } else {
                        rate = getPriceByName(c.orderPackaging) || 0;
                      }
                      const qty = parseInt(c.orderQty) || 0;
                      return acc + rate * qty;
                    }, 0)}
                  </div>
                </div>
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
                  {packagingNames.map((opt) => (
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
              <div style={{ marginTop: 18 }}>
                <div style={{ display: "flex", overflowX: "auto", gap: 14, marginBottom: 16, paddingBottom: 8 }}>
                  {stockAtDairy.map((s, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                        padding: "16px",
                        borderRadius: 10,
                        border: "2px solid #f59e0b",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        boxShadow: "0 2px 8px #f59e0b22",
                        minWidth: 240,
                        flexShrink: 0,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, color: "#d97706", fontSize: "1.05em" }}>{s.packaging}</div>
                        <div style={{ color: "#b45309", fontSize: "0.95em", marginTop: 4, fontWeight: 700 }}>
                          Qty: 
                          <input
                            type="number"
                            value={parseInt(s.quantity) || 0}
                            onChange={(e) => handleQuantityChangeAtDairy(e, idx)}
                            min="0"
                            style={{ 
                              width: 60, 
                              marginLeft: 6,
                              padding: "4px 6px",
                              borderRadius: 4,
                              border: "1px solid #f59e0b",
                              fontSize: "0.9em"
                            }}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeStockAtDairy(idx);
                        }}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 6,
                          background: "#ef4444",
                          color: "#fff",
                          border: "none",
                          fontWeight: 600,
                          cursor: "pointer",
                          fontSize: "0.9em",
                          transition: "all 0.2s",
                          boxShadow: "0 2px 4px #ef444444"
                        }}
                        onMouseOver={(e) => {
                          e.target.style.background = "#dc2626";
                          e.target.style.transform = "scale(1.05)";
                        }}
                        onMouseOut={(e) => {
                          e.target.style.background = "#ef4444";
                          e.target.style.transform = "scale(1)";
                        }}
                      >
                        ✕ Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ padding: "12px 14px", background: "#f0f9ff", borderRadius: 8, border: "1px solid #0284c7", textAlign: "center" }}>
                  <strong style={{ color: "#0369a1" }}>
                    Grand Total Stock Value: ₹
                    {stockAtDairy.reduce((acc, s) => {
                      if (!s.packaging) return acc;
                      const price = getPriceByName(s.packaging) || 0;
                      const qty = parseInt(s.quantity) || 0;
                      return acc + price * qty;
                    }, 0)}
                  </strong>
                </div>
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
              padding: "clamp(14px, 4vw, 20px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <h3 style={{ margin: 0, color: "#174ea6", fontWeight: 700, fontSize: "clamp(1rem, 4vw, 1.15rem)" }}>
                📊 Realtime Stock Dashboard
              </h3>
              <button
                type="button"
                onClick={() => setIsDashboardCollapsed(!isDashboardCollapsed)}
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.9em",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.2s"
                }}
                onMouseOver={(e) => e.target.style.background = "#1d4ed8"}
                onMouseOut={(e) => e.target.style.background = "#2563eb"}
              >
                {isDashboardCollapsed ? "▶ Expand" : "▼ Collapse"}
              </button>
            </div>
            
            {!isDashboardCollapsed && (
              <>
                <p style={{ marginTop: 8, color: "#6b7280", fontSize: "clamp(0.875rem, 3vw, 0.95rem)" }}>
                  Shows sold, returned, and remaining stock (derived from customers and village stock).
                </p>

                <style>{`
                  @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                  }
                  .stock-dashboard-table {
                    animation: fadeIn 0.3s ease-out;
                  }
                `}</style>

                <div className="stock-dashboard-table" style={{ marginTop: 12, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: "clamp(0.9rem, 3vw, 0.95rem)", minWidth: "100%" }}>
                <thead>
                  <tr style={{ textAlign: "left", backgroundColor: "#f0f7ff", borderBottom: "3px solid #2563eb" }}>
                    <th style={{ padding: "clamp(8px, 2vw, 12px)", fontWeight: 700, color: "#1f2937", whiteSpace: "nowrap" }}>
                      <div>Packaging</div>
                      <div style={{ fontSize: "0.75rem", color: "#2e7d32", marginTop: "2px" }}>✅ Remaining</div>
                    </th>
                    <th style={{ padding: "clamp(8px, 2vw, 12px)", fontWeight: 700, color: "#1976d2", textAlign: "center", whiteSpace: "nowrap" }}>
                      <div>📦 Stock Taken</div>
                    </th>
                    <th style={{ padding: "clamp(8px, 2vw, 12px)", fontWeight: 700, color: "#6a1b9a", textAlign: "center", whiteSpace: "nowrap" }}>
                      <div>💰 Stock Sold</div>
                    </th>
                    <th style={{ padding: "clamp(8px, 2vw, 12px)", fontWeight: 700, color: "#e65100", textAlign: "center", whiteSpace: "nowrap" }}>
                      <div>🏪 At Dairy</div>
                    </th>
                    <th style={{ padding: "clamp(8px, 2vw, 12px)", fontWeight: 700, color: "#d97706", textAlign: "center", whiteSpace: "nowrap" }}>
                      <div>🔄 Returned</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {remainingStockList.map((r, idx) => (
                    <tr 
                      key={idx} 
                      style={{ 
                        background: idx % 2 === 0 ? "#fff" : "#fbfdff",
                        borderBottom: "1px solid #e0e7ff",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f0f7ff";
                        e.currentTarget.style.boxShadow = "inset 0 0 8px rgba(37, 99, 235, 0.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = idx % 2 === 0 ? "#fff" : "#fbfdff";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <td style={{ padding: "clamp(8px, 2vw, 12px)", fontWeight: 600, color: "#1f2937", whiteSpace: "nowrap" }}>
                        <div>{r.packaging}</div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: r.remaining < 0 ? "#b91c1c" : "#2e7d32", marginTop: "2px" }}>
                          {r.remaining}
                        </div>
                      </td>
                      <td style={{ padding: "clamp(8px, 2vw, 12px)", textAlign: "center", backgroundColor: "#e3f2fd", fontWeight: 600, color: "#1976d2", whiteSpace: "nowrap" }}>{r.stock}</td>
                      <td style={{ padding: "clamp(8px, 2vw, 12px)", textAlign: "center", backgroundColor: "#f3e5f5", fontWeight: 600, color: "#6a1b9a", whiteSpace: "nowrap" }}>{r.sold}</td>
                      <td style={{ padding: "clamp(8px, 2vw, 12px)", textAlign: "center", backgroundColor: "#fff3e0", fontWeight: 600, color: "#e65100", whiteSpace: "nowrap" }}>{r.dairy}</td>
                      <td style={{ padding: "clamp(8px, 2vw, 12px)", textAlign: "center", backgroundColor: "#fef3c7", fontWeight: 600, color: "#d97706", whiteSpace: "nowrap" }}>{r.returned}</td>
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
                  {packagingNames.map((opt) => (
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
              </>
            )}
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

            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
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
                onClick={handleExportDemoRegister}
                onMouseOver={(e) => {
                  e.target.style.transform = "translateY(-3px)";
                  e.target.style.boxShadow = "0 8px 20px #10b98155";
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 4px 12px #10b98144";
                }}
              >
                📊 Export Demo Register
              </button>

              <button
                type="button"
                className="btn-outline"
                style={{
                  padding: "14px 32px",
                  fontWeight: 800,
                  fontSize: "1.1em",
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  boxShadow: "0 4px 12px #8b5cf644",
                  minWidth: 200,
                  letterSpacing: "0.03em"
                }}
                onClick={handleExportMantriReport}
                onMouseOver={(e) => {
                  e.target.style.transform = "translateY(-3px)";
                  e.target.style.boxShadow = "0 8px 20px #8b5cf655";
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 4px 12px #8b5cf644";
                }}
              >
                👨 Export Mantri Report (PAVTI Only)
              </button>
            </div>

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
