import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * Hook to fetch stock data (taken to demo) for a selected village
 * Returns aggregated stock data for demo location only
 */
export const useStockData = (villageId) => {
  const [stockData, setStockData] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!villageId) {
      setStockData({});
      return;
    }

    setLoading(true);

    // Fetch aggregated stock by packaging (demo location only)
    const stockQ = query(
      collection(db, "stock"),
      where("villageId", "==", villageId),
      where("location", "==", "demo")
    );

    const unsubscribe = onSnapshot(stockQ, (snapshot) => {
      const stocks = {};

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        stocks[data.packaging] = (stocks[data.packaging] || 0) + data.quantity;
      });

      setStockData(stocks);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [villageId]);

  return { stockData, loading };
};

/**
 * Hook to fetch all stock entries (demo and dairy) for a selected village
 * Returns all entries for management/viewing purposes
 */
export const useAllStockEntries = (villageId) => {
  const [stockEntries, setStockEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!villageId) {
      setStockEntries([]);
      return;
    }

    setLoading(true);

    // Fetch ALL stock entries regardless of location
    const stockQ = query(
      collection(db, "stock"),
      where("villageId", "==", villageId)
    );

    const unsubscribe = onSnapshot(stockQ, (snapshot) => {
      const entries = [];

      snapshot.docs.forEach((doc) => {
        entries.push({ id: doc.id, ...doc.data() });
      });

      setStockEntries(entries);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [villageId]);

  return { stockEntries, loading };
};

/**
 * Hook to fetch dairy stock data for a selected village
 * Returns aggregated dairy stock by packaging
 */
export const useDairyStockData = (villageId) => {
  const [dairyData, setDairyData] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!villageId) {
      setDairyData({});
      return;
    }

    setLoading(true);

    const dairyQ = query(
      collection(db, "stock"),
      where("villageId", "==", villageId),
      where("location", "==", "dairy")
    );

    const unsubscribe = onSnapshot(dairyQ, (snapshot) => {
      const dairy = {};

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        dairy[data.packaging] = (dairy[data.packaging] || 0) + data.quantity;
      });

      setDairyData(dairy);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [villageId]);

  return { dairyData, loading };
};

/**
 * Hook to fetch sales data for a selected village
 * Returns aggregated sales by packaging type with real-time updates
 * For combo offers, breaks down into component parts
 */
export const useSalesData = (villageId) => {
  const [salesData, setSalesData] = useState({});
  const [loading, setLoading] = useState(false);

  // Define combo schemes (must match DemoSalesList.jsx onePlusOneSchemes)
  const comboSchemes = [
    { label: "1LTR JAR + 1LTR JAR", parts: ["1LTR JAR", "1LTR JAR"] },
    { label: "1LTR JAR + 2LTR JAR", parts: ["1LTR JAR", "2LTR JAR"] },
    { label: "1LTR JAR + 5LTR PLASTIC JAR", parts: ["1LTR JAR", "5LTR PLASTIC JAR"] },
    { label: "1LTR JAR + 5LTR STEEL BARNI", parts: ["1LTR JAR", "5LTR STEEL BARNI"] },
    { label: "1LTR JAR + 10 LTR JAR", parts: ["1LTR JAR", "10 LTR JAR"] },
    { label: "1LTR JAR + 10 LTR STEEL", parts: ["1LTR JAR", "10 LTR STEEL"] },
    { label: "1LTR JAR + 20 LTR CAN", parts: ["1LTR JAR", "20 LTR CAN"] },
    { label: "1LTR JAR + 20 LTR STEEL", parts: ["1LTR JAR", "20 LTR STEEL"] },
    { label: "2LTR JAR + 2LTR JAR", parts: ["2LTR JAR", "2LTR JAR"] },
    { label: "2LTR JAR + 5LTR PLASTIC JAR", parts: ["2LTR JAR", "5LTR PLASTIC JAR"] },
    { label: "2LTR JAR + 5LTR STEEL BARNI", parts: ["2LTR JAR", "5LTR STEEL BARNI"] },
    { label: "2LTR JAR + 10 LTR JAR", parts: ["2LTR JAR", "10 LTR JAR"] },
    { label: "2LTR JAR + 10 LTR STEEL", parts: ["2LTR JAR", "10 LTR STEEL"] },
    { label: "2LTR JAR + 20 LTR CAN", parts: ["2LTR JAR", "20 LTR CAN"] },
    { label: "2LTR JAR + 20 LTR STEEL", parts: ["2LTR JAR", "20 LTR STEEL"] },
    { label: "5LTR PLASTIC JAR + 5LTR PLASTIC JAR", parts: ["5LTR PLASTIC JAR", "5LTR PLASTIC JAR"] },
    { label: "5LTR PLASTIC JAR + 5LTR STEEL BARNI", parts: ["5LTR PLASTIC JAR", "5LTR STEEL BARNI"] },
    { label: "5LTR PLASTIC JAR + 10 LTR JAR", parts: ["5LTR PLASTIC JAR", "10 LTR JAR"] },
    { label: "5LTR PLASTIC JAR + 10 LTR STEEL", parts: ["5LTR PLASTIC JAR", "10 LTR STEEL"] },
    { label: "5LTR PLASTIC JAR + 20 LTR CAN", parts: ["5LTR PLASTIC JAR", "20 LTR CAN"] },
    { label: "5LTR PLASTIC JAR + 20 LTR STEEL", parts: ["5LTR PLASTIC JAR", "20 LTR STEEL"] },
    { label: "5LTR STEEL BARNI + 5LTR STEEL BARNI", parts: ["5LTR STEEL BARNI", "5LTR STEEL BARNI"] },
    { label: "5LTR STEEL BARNI + 10 LTR JAR", parts: ["5LTR STEEL BARNI", "10 LTR JAR"] },
    { label: "5LTR STEEL BARNI + 10 LTR STEEL", parts: ["5LTR STEEL BARNI", "10 LTR STEEL"] },
    { label: "5LTR STEEL BARNI + 20 LTR CAN", parts: ["5LTR STEEL BARNI", "20 LTR CAN"] },
    { label: "5LTR STEEL BARNI + 20 LTR STEEL", parts: ["5LTR STEEL BARNI", "20 LTR STEEL"] },
    { label: "10 LTR JAR + 10 LTR JAR", parts: ["10 LTR JAR", "10 LTR JAR"] },
    { label: "10 LTR JAR + 10 LTR STEEL", parts: ["10 LTR JAR", "10 LTR STEEL"] },
    { label: "10 LTR JAR + 20 LTR CAN", parts: ["10 LTR JAR", "20 LTR CAN"] },
    { label: "10 LTR JAR + 20 LTR STEEL", parts: ["10 LTR JAR", "20 LTR STEEL"] },
    { label: "10 LTR STEEL + 10 LTR STEEL", parts: ["10 LTR STEEL", "10 LTR STEEL"] },
    { label: "10 LTR STEEL + 20 LTR CAN", parts: ["10 LTR STEEL", "20 LTR CAN"] },
    { label: "10 LTR STEEL + 20 LTR STEEL", parts: ["10 LTR STEEL", "20 LTR STEEL"] },
    { label: "20 LTR CAN + 20 LTR CAN", parts: ["20 LTR CAN", "20 LTR CAN"] },
    { label: "20 LTR STEEL + 20 LTR CAN", parts: ["20 LTR STEEL", "20 LTR CAN"] },
    { label: "20 LTR STEEL + 20 LTR STEEL", parts: ["20 LTR STEEL", "20 LTR STEEL"] },
  ];

  useEffect(() => {
    if (!villageId) {
      setSalesData({});
      return;
    }

    setLoading(true);
    let isMounted = true;

    const fetchSalesData = async () => {
      const sales = {};
      
      try {
        const salesQ = query(
          collection(db, "demosales"),
          where("selectedVillageId", "==", villageId)
        );

        const salesSnapshot = await getDocs(salesQ);

        // Fetch customers from each demosale
        for (const doc of salesSnapshot.docs) {
          const custSnapshot = await getDocs(
            collection(db, "demosales", doc.id, "customers")
          );

          custSnapshot.docs.forEach((custDoc) => {
            const custData = custDoc.data();
            const packaging = custData.orderPackaging || "Unknown";
            const qty = parseFloat(custData.orderQty) || 0;

            // Check if this is a combo offer
            const comboScheme = comboSchemes.find(s => s.label === packaging);
            
            if (comboScheme) {
              // Break down combo into individual parts
              comboScheme.parts.forEach(part => {
                sales[part] = (sales[part] || 0) + qty;
              });
            } else {
              // Regular packaging - just add as-is
              sales[packaging] = (sales[packaging] || 0) + qty;
            }
          });
        }

        if (isMounted) {
          setSalesData(sales);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching sales data:", error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Subscribe to demosales changes to refetch when they change
    const unsubscribe = onSnapshot(
      query(
        collection(db, "demosales"),
        where("selectedVillageId", "==", villageId)
      ),
      () => {
        // When demosales change, refetch all data
        fetchSalesData();
      }
    );

    // Initial fetch
    fetchSalesData();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [villageId]);

  return { salesData, loading };
};

/**
 * Hook to fetch all villages
 * Returns list of villages for dropdown selection
 */
export const useVillages = () => {
  const [villageOptions, setVillageOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);

    const unsubscribe = onSnapshot(collection(db, "villages"), (snapshot) => {
      const options = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
      }));
      setVillageOptions(options);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { villageOptions, loading };
};
