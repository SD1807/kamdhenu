import React, { useState } from "react";
import DemoSalesHistory from "./DemoSalesHistory";
import History from "./History";
import Navbar from "./Navbar";

export default function UnifiedHistory() {
  const [view, setView] = useState("field");
  return (
    <>
      <Navbar />
      <div className="section-card" style={{marginTop:24, marginBottom:24}}>
        <h2 style={{marginBottom:16}}>History View</h2>
        <div style={{display:'flex',gap:16,marginBottom:16}}>
          <button className={view==="field"?"btn-primary":"btn-outline"} onClick={()=>setView("field")}>Field Officer History</button>
          <button className={view==="demo"?"btn-primary":"btn-outline"} onClick={()=>setView("demo")}>Demo Sales History</button>
        </div>
        {view === "field" ? <History /> : <DemoSalesHistory />}
      </div>
    </>
  );
}
