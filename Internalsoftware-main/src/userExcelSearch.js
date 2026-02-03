// src/useExcelSearch.js
import { useState, useMemo } from "react";

export default function useExcelSearch(data) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCustomers = useMemo(() => {
    if (!searchTerm || !searchTerm.trim()) return data;
    
    const searchLower = searchTerm.toLowerCase().trim();
    
    return data.filter((record) => {
      // Search only CODE field - handles both "code" key and positional data
      const code = (record.code || "").toString().toLowerCase();
      return code.includes(searchLower);
    });
  }, [searchTerm, data]);

  return { searchTerm, setSearchTerm, filteredCustomers };
}
