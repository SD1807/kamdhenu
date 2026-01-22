// src/useExcelSearch.js
import { useState, useMemo } from "react";

export default function useExcelSearch(data) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return data;
    return data.filter((c) =>
      (c.Name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.Mobile || "").includes(searchTerm)
    );
  }, [searchTerm, data]);

  return { searchTerm, setSearchTerm, filteredCustomers };
}
