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
      
      {/* Search Village Section */}
      <div style={{ marginBottom: "10px", position: "relative" }}>
        <div style={{ fontSize: "12px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>
          🔍 Search Old Village
        </div>
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
            <span style={{ position: "absolute", left: 12, color: "#2563eb", fontSize: "1.2em" }}>🔍</span>
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
                padding: "12px 12px 12px 40px",
                fontSize: "14px",
                borderRadius: "6px",
                border: "2px solid #e0e7ff",
                boxSizing: "border-box",
                backgroundColor: "#fff",
                transition: "all 0.2s",
                boxShadow: searchInput ? "0 2px 8px rgba(37, 99, 235, 0.15)" : "none",
                borderColor: searchInput ? "#2563eb" : "#e0e7ff"
              }}
              onMouseEnter={(e) => {
                if (searchInput) {
                  e.target.style.borderColor = "#2563eb";
                  e.target.style.boxShadow = "0 2px 8px rgba(37, 99, 235, 0.15)";
                }
              }}
              onMouseLeave={(e) => {
                if (!searchInput) {
                  e.target.style.borderColor = "#e0e7ff";
                  e.target.style.boxShadow = "none";
                }
              }}
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput("");
                  setShowSearchResults(false);
                }}
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
          
          {/* Search Results Dropdown - Enhanced */}
          {showSearchResults && searchInput.trim() && (
            <div
              ref={dropdownRef}
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                border: "1px solid #e0e7ff",
                borderTop: "none",
                borderRadius: "0 0 6px 6px",
                backgroundColor: "#fff",
                maxHeight: 280,
                overflowY: "auto",
                zIndex: 10,
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)",
              }}
            >
              {filteredVillages.length === 0 ? (
                <div style={{ padding: "16px", color: "#92400e", textAlign: "center", fontSize: "14px", background: "#fef3c7" }}>
                  <div style={{ fontSize: "1.2em", marginBottom: 6 }}>🔍</div>
                  No villages found
                </div>
              ) : (
                <>
                  <div style={{ fontSize: "11px", color: "#999", padding: "8px 12px", backgroundColor: "#fafafa", fontWeight: "500", borderBottom: "1px solid #e0e7ff" }}>
                    Found {filteredVillages.length} village{filteredVillages.length > 1 ? "s" : ""}
                  </div>
                  {filteredVillages.map((village, index) => (
                    <div
                      key={village.id}
                      onClick={() => handleVillageSelect(village.id)}
                      style={{
                        padding: "12px 16px",
                        cursor: "pointer",
                        backgroundColor: 
                          highlightedIndex === index ? "#f0f7ff" : 
                          selectedVillageId === village.id ? "#f0f0f0" : 
                          "#fff",
                        borderBottom: "1px solid #f0f0f0",
                        fontWeight: highlightedIndex === index || selectedVillageId === village.id ? "600" : "400",
                        color: "#1f2937",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        setHighlightedIndex(index);
                        e.currentTarget.style.background = "#f0f7ff";
                        e.currentTarget.style.paddingLeft = "20px";
                      }}
                      onMouseLeave={(e) => {
                        if (highlightedIndex === index) {
                          e.currentTarget.style.background = "#f0f7ff";
                          e.currentTarget.style.paddingLeft = "16px";
                        } else if (selectedVillageId === village.id) {
                          e.currentTarget.style.background = "#f0f0f0";
                          e.currentTarget.style.paddingLeft = "16px";
                        } else {
                          e.currentTarget.style.background = "#fff";
                          e.currentTarget.style.paddingLeft = "16px";
                        }
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>{village.name}</span>
                        {selectedVillageId === village.id && <span style={{ color: "#16a34a", fontWeight: "bold" }}>✓</span>}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
        <div style={{ fontSize: "11px", color: "#999", marginTop: "6px" }}>
          💡 Type to search • ↓↑ to navigate • Enter to select • Esc to close
        </div>
      </div>

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
    </div>
  );
};

export default VillageSelector;
