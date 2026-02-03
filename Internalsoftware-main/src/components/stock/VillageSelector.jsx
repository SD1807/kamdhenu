import React, { useState, useMemo, useRef, useEffect } from "react";
import { db } from "../../firebase";
import { addDoc, collection } from "firebase/firestore";

/**
 * VillageSelector Component
 * Compact village search with fuzzy matching and keyboard navigation
 */

// Fuzzy search function - finds matches even with typos
const fuzzySearch = (searchTerm, villages) => {
  if (!searchTerm.trim()) return [];
  
  const term = searchTerm.toLowerCase();
  
  return villages
    .map((village) => {
      const name = village?.name?.toLowerCase() || "";
      let score = 0;
      
      // Exact match at start = highest score
      if (name.startsWith(term)) score = 1000;
      // Exact match anywhere = high score
      else if (name.includes(term)) score = 500;
      // Fuzzy match
      else {
        let searchIdx = 0;
        for (let i = 0; i < name.length && searchIdx < term.length; i++) {
          if (name[i] === term[searchIdx]) {
            score += 100 - i; // Earlier matches score higher
            searchIdx++;
          }
        }
        if (searchIdx < term.length) return null; // Doesn't match
      }
      
      return { ...village, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
};

export const VillageSelector = ({ villageOptions, selectedVillageId, onVillageChange, label = "Select Village", showLabel = true }) => {
  const [addNewInput, setAddNewInput] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [newlyAddedVillageName, setNewlyAddedVillageName] = useState(null);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Filter villages with fuzzy search
  const filteredVillages = useMemo(() => {
    return fuzzySearch(searchInput, villageOptions);
  }, [searchInput, villageOptions]);

  // Get the name of selected village for display
  const selectedVillageName = newlyAddedVillageName || villageOptions.find((v) => v.id === selectedVillageId)?.name || "";

  // Reset highlight when results change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filteredVillages]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && 
          searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleVillageSelect = (villageId) => {
    onVillageChange(villageId);
    setSearchInput("");
    setShowSearchResults(false);
    setHighlightedIndex(-1);
    setNewlyAddedVillageName(null);
  };

  const handleCreateNewVillage = async () => {
    if (addNewInput.trim()) {
      const newVillageName = addNewInput.trim();
      try {
        // Save to Firebase villages collection
        const docRef = await addDoc(collection(db, "villages"), {
          name: newVillageName,
          createdAt: new Date(),
        });
        
        // Use the actual Firebase document ID
        onVillageChange(docRef.id);
        setNewlyAddedVillageName(newVillageName);
        setAddNewInput("");
      } catch (err) {
        console.error("Error creating village:", err);
        alert("Failed to add village: " + (err.message || err));
      }
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSearchResults) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setShowSearchResults(true);
        setHighlightedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < filteredVillages.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleVillageSelect(filteredVillages[highlightedIndex].id);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowSearchResults(false);
        setHighlightedIndex(-1);
        break;
      default:
        break;
    }
  };

  return (
    <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#f5f5f5", borderRadius: "8px" }}>
      {showLabel && (
        <label style={{ fontWeight: "bold", display: "block", marginBottom: "10px" }}>
          {label}
        </label>
      )}

      {/* Selected Village Display - Prominent */}
      {selectedVillageId && (
        <div style={{ 
          marginBottom: "15px", 
          padding: "14px 16px", 
          backgroundColor: "#1976d2", 
          borderRadius: "6px", 
          fontSize: "16px", 
          color: "#fff", 
          fontWeight: "600",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(25, 118, 210, 0.3)"
        }}>
          <span>✅ Selected: {selectedVillageName}</span>
          <button
            type="button"
            onClick={() => {
              onVillageChange(null);
              setSearchInput("");
              setShowSearchResults(false);
            }}
            style={{
              padding: "6px 12px",
              background: "rgba(255,255,255,0.3)",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "12px",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => e.target.style.background = "rgba(255,255,255,0.5)"}
            onMouseLeave={(e) => e.target.style.background = "rgba(255,255,255,0.3)"}
          >
            Change
          </button>
        </div>
      )}
      
      {/* Add New Village Section */}
      <div style={{ marginBottom: "15px" }}>
        <div style={{ fontSize: "12px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>
          ➕ Add New Village
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Enter village name"
            value={addNewInput}
            onChange={(e) => setAddNewInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && addNewInput.trim()) {
                handleCreateNewVillage();
              }
            }}
            style={{
              flex: 1,
              padding: "10px",
              fontSize: "14px",
              borderRadius: "4px",
              border: "1px solid #ddd",
              boxSizing: "border-box",
              backgroundColor: "#fff",
            }}
          />
          <button
            type="button"
            onClick={handleCreateNewVillage}
            disabled={!addNewInput.trim()}
            style={{
              padding: "10px 14px",
              background: addNewInput.trim() ? "#2563eb" : "#ccc",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: addNewInput.trim() ? "pointer" : "not-allowed",
              fontWeight: "600",
              fontSize: "14px",
            }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Search Village Section */}
      <div style={{ marginBottom: "10px", position: "relative" }}>
        <div style={{ fontSize: "12px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>
          🔍 Search Old Village
        </div>
        <div style={{ position: "relative" }}>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Type village name..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => searchInput && setShowSearchResults(true)}
            onKeyDown={handleKeyDown}
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: "14px",
              borderRadius: "4px",
              border: "1px solid #ddd",
              boxSizing: "border-box",
              backgroundColor: "#fff",
            }}
          />
          
          {/* Search Results Dropdown - Compact */}
          {showSearchResults && searchInput.trim() && (
            <div
              ref={dropdownRef}
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                border: "1px solid #ddd",
                borderTop: "none",
                borderRadius: "0 0 4px 4px",
                backgroundColor: "#fff",
                maxHeight: "220px",
                overflowY: "auto",
                zIndex: 10,
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              }}
            >
              {filteredVillages.length === 0 ? (
                <div style={{ padding: "12px", color: "#999", textAlign: "center", fontSize: "14px" }}>
                  No villages found
                </div>
              ) : (
                <>
                  <div style={{ fontSize: "11px", color: "#999", padding: "6px 12px", backgroundColor: "#fafafa", fontWeight: "500" }}>
                    Found {filteredVillages.length} village{filteredVillages.length > 1 ? "s" : ""}
                  </div>
                  {filteredVillages.map((village, index) => (
                    <div
                      key={village.id}
                      onClick={() => handleVillageSelect(village.id)}
                      style={{
                        padding: "10px 12px",
                        cursor: "pointer",
                        backgroundColor: 
                          highlightedIndex === index ? "#e3f2fd" : 
                          selectedVillageId === village.id ? "#f0f0f0" : 
                          "#fff",
                        borderBottom: "1px solid #eee",
                        fontWeight: highlightedIndex === index || selectedVillageId === village.id ? "600" : "400",
                        color: "#000",
                        transition: "background-color 0.15s",
                      }}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      {village.name}
                      {selectedVillageId === village.id && " ✓"}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
        <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>
          Type to search • ↓↑ to navigate • Enter to select • Esc to close
        </div>
      </div>
    </div>
  );
};

export default VillageSelector;
