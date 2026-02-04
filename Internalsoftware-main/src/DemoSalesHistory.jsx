import React, { useEffect, useState } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";
import Navbar from "./Navbar";
import "./form.css";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Attach the plugin to jsPDF
jsPDF.autoTable = autoTable;

import { notoSansGujarati } from "./pdfUtils";

export default function DemoSalesHistory() {
  const [copiedId, setCopiedId] = useState(null);
  const [downloadedId, setDownloadedId] = useState(null);
  // --- Filtering state and logic ---
  const [villageFilter, setVillageFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [salesFilter, setSalesFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  // Download state for Excel per record
  const [downloadingMap, setDownloadingMap] = useState({});
  const [downloadErrorMap, setDownloadErrorMap] = useState({});
  // Helper to update state for a specific record
  const setDownloading = (id, val) => setDownloadingMap(prev => ({...prev, [id]: val}));
  const setDownloadError = (id, val) => setDownloadErrorMap(prev => ({...prev, [id]: val}));

  // Helper function to get demo display name with date
  const getDemoName = (record) => {
    return record.demoName || record.village || "Unknown Demo";
  };

  // Filtering logic must be after records is declared
  const filteredRecords = React.useMemo(() => {
    return records.filter(r => {
      const sales = (r.customers||[]).reduce((sum, c) => sum + (Number(c.orderQty) || 0), 0).toString();
      const stock = (r.stockAtDairy||[]).reduce((sum, s) => sum + (Number(s.quantity) || 0), 0).toString();
      const demoName = getDemoName(r);
      return (
        (!villageFilter || demoName.toLowerCase().includes(villageFilter.toLowerCase())) &&
        (!dateFilter || (r.date||"").toLowerCase().includes(dateFilter.toLowerCase())) &&
        (!salesFilter || sales.includes(salesFilter)) &&
        (!stockFilter || stock.includes(stockFilter))
      );
    });
  }, [records, villageFilter, dateFilter, salesFilter, stockFilter]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "demoForms"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        // Sort by updatedAt (if present) or createdAt, descending
        const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        docs.sort((a, b) => {
          const aTime = a.updatedAt ? (a.updatedAt.seconds || a.updatedAt) : (a.createdAt ? (a.createdAt.seconds || a.createdAt) : 0);
          const bTime = b.updatedAt ? (b.updatedAt.seconds || b.updatedAt) : (b.createdAt ? (b.createdAt.seconds || b.createdAt) : 0);
          return bTime - aTime;
        });
        setRecords(docs);
      } catch (err) {
        alert("Error loading demo sales history: " + err.message);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

   const handleDownloadPDF = (demo) => {
    // demo = one history entry
    // Use jsPDF or any library to generate PDF
    console.log("Download PDF for demo", demo);
  };
  
  // Analytics: total sales and packaging-wise
  const packagingTotals = {};
  let totalQty = 0;
  records.forEach(r => {
    (r.customers || []).forEach(c => {
      totalQty += Number(c.orderQty || 0);
      if (c.orderPackaging) {
        packagingTotals[c.orderPackaging] = (packagingTotals[c.orderPackaging] || 0) + Number(c.orderQty || 0);
      }
    });
  });

  return (
    <>
   
      <div className="form-container" style={{maxWidth: 900, margin: '40px auto 32px auto', minHeight: 'calc(100vh - 120px)'}}>
        <h2 style={{marginBottom: 8, color: '#174ea6', fontWeight: 900, fontSize: '2.1rem', letterSpacing: '0.04em'}}>Demo Sales History</h2>
        {loading ? (
          <div style={{textAlign:'center', marginTop: 40}}>Loading...</div>
        ) : records.length === 0 ? (
          <div style={{textAlign:'center', marginTop: 40}}>No demo sales records found.</div>
        ) : (
          <>
            <div className="section-card" style={{marginBottom: 18}}>
              <h4 style={{margin:0, color:'#174ea6', fontWeight:700}}>Analytics</h4>
              <div>Total Customers: <b>{records.reduce((sum, r) => sum + (r.customers?.length || 0), 0)}</b></div>
              <div>Total Quantity: <b>{totalQty}</b></div>
              <div style={{marginTop:8}}>
                <b>Packaging-wise Sales:</b>
                <ul style={{margin:0, paddingLeft:18}}>
                  {Object.entries(packagingTotals).map(([pack, qty]) => (
                    <li key={pack}>{pack}: <b>{qty}</b></li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="section-card" style={{overflowX:'auto'}}>
              <table style={{width:'100%', borderCollapse:'collapse', textAlign:'center'}}>
                <thead>
                  <tr style={{background:'#f7fafd'}}>
                    <th>
                      Village<br/>
                      <select style={{width:'92%', borderRadius:6, padding:'4px'}} value={villageFilter} onChange={e=>setVillageFilter(e.target.value)}>
                        <option value="">All</option>
                        {[...new Set(records.map(r => r.village).filter(Boolean))].sort().map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </th>
                    <th>
                      Date<br/>
                      <select style={{width:'92%', borderRadius:6, padding:'4px'}} value={dateFilter} onChange={e=>setDateFilter(e.target.value)}>
                        <option value="">All</option>
                        {[...new Set(records.map(r => r.date).filter(Boolean))].sort().map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </th>
                    <th>
                      Sales (Litres)<br/>
                      <select style={{width:'92%', borderRadius:6, padding:'4px'}} value={salesFilter} onChange={e=>setSalesFilter(e.target.value)}>
                        <option value="">All</option>
                        {Array.from({length: 10}, (_, i) => {
                          const min = i*100+1, max = (i+1)*100;
                          return <option key={i} value={`${min}-${max}`}>{min}-{max} L</option>;
                        })}
                      </select>
                    </th>
                    <th>
                      Stock (Litres)<br/>
                      <select style={{width:'92%', borderRadius:6, padding:'4px'}} value={stockFilter} onChange={e=>setStockFilter(e.target.value)}>
                        <option value="">All</option>
                        {Array.from({length: 10}, (_, i) => {
                          const min = i*100+1, max = (i+1)*100;
                          return <option key={i} value={`${min}-${max}`}>{min}-{max} L</option>;
                        })}
                      </select>
                    </th>
                    <th>View</th>
                    <th>Copy</th>
                    <th>Download</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords
                    .filter(r => {
                      // Sales filter by range
                      if (salesFilter) {
                        const sales = (r.customers||[]).reduce((sum, c) => sum + (Number(c.orderQty)||0), 0);
                        const [min,max] = salesFilter.split('-').map(Number);
                        if (!(sales >= min && sales <= max)) return false;
                      }
                      // Stock filter by range
                      if (stockFilter) {
                        const stock = (r.stockAtDairy||[]).reduce((sum, s) => sum + (Number(s.quantity)||0), 0);
                        const [min,max] = stockFilter.split('-').map(Number);
                        if (!(stock >= min && stock <= max)) return false;
                      }
                      return true;
                    })
                    .map((r, idx) => {
                      // ...existing code for waSummary, downloading, downloadError, handleDownload...
                      // ...existing code for <tr> ... </tr> ...
                      let packagingSales = {};
                      let totalSales = 0;
    
                      let packagingStock = {};
                      let totalStock = 0;
                      (r.stockAtDairy||[]).forEach(s => {
                        if (s.packaging) {
                          packagingStock[s.packaging] = (packagingStock[s.packaging] || 0) + Number(s.quantity || 0);
                          totalStock += Number(s.quantity || 0);
                        }
                      });
                      const netSale = totalSales + totalStock;
                      let waSummary = `*${getDemoName(r)}*\nDate: ${r.date || '-'}\nMilk Collection: ${r.totalMilk || '-'}\nSabhasad Active: ${r.activeSabhasad || '-'}\nTeam: ${r.teamMembers || '-'}\n\n*Total Sales: ${totalSales}*\n`;
                      waSummary += `Package-wise Sales:`;
                      Object.entries(packagingSales).forEach(([pack, qty]) => {
                        waSummary += `\n${pack}: ${qty}`;
                      });
                      waSummary += `\n\nStock:`;
                      Object.entries(packagingStock).forEach(([pack, qty]) => {
                        waSummary += `\n${pack}: ${qty}`;
                      });
                      waSummary += `\n\n*Net Sale: ${netSale}*`;
                      waSummary += `\n\nEntry By: ${r.entryBy || '-'}`;
                      waSummary += `\nRemarks: ${r.demoRemarks || '-'}`;

                      const downloading = !!downloadingMap[r.id];
                      const downloadError = downloadErrorMap[r.id] || "";
                     const handleDownload = async (r) => {
  // r = single demo record
  const safe = v => (v === undefined || v === null) ? '' : v;
  setDownloadError(r.id, "");
  setDownloading(r.id, true);

  try {
    // ----- EXCEL EXPORT -----
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Demo Sales");

    let row = 1;

    // Header info
    sheet.addRow(["Demo Name", safe(getDemoName(r))]); row++;
    sheet.addRow(["Date", safe(r.date)]); row++;
    sheet.addRow(["Village", safe(r.village)]); row++;
    sheet.addRow(["Taluka", safe(r.taluka)]); row++;
    sheet.addRow(["Mantri", safe(r.mantri)]); row++;
    sheet.addRow(["Total Milk", safe(r.totalMilk)]); row++;
    sheet.addRow(["Active Sabhasad", safe(r.activeSabhasad)]); row++;
    sheet.addRow(["Team Members", safe(r.teamMembers)]); row++;
    sheet.addRow(["Entry By", safe(r.entryBy)]); row++;
    sheet.addRow(["Demo Remarks", safe(r.demoRemarks)]); row++;
    sheet.addRow([]); row++;

    // Customers table
    sheet.addRow(["Customers"]); row++;
    sheet.addRow(["Name", "Code", "Mobile", "Packaging", "Qty", "Remarks"]); row++;
    (r.customers || []).forEach(c => {
      sheet.addRow([
        safe(c.name),
        safe(c.code),
        safe(c.mobile),
        safe(c.orderPackaging),
        safe(c.orderQty),
        safe(c.remarks)
      ]);
      row++;
    });
    sheet.addRow([]); row++;

    // Stock table
    sheet.addRow(["Stock at Dairy"]); row++;
    sheet.addRow(["Packaging", "Quantity"]); row++;
    (r.stockAtDairy || []).forEach(s => {
      sheet.addRow([
        safe(s.packaging),
        safe(s.quantity)
      ]);
      row++;
    });

    // Style header rows
    [1, 11, 14].forEach(rowNum => {
      const headerRow = sheet.getRow(rowNum);
      headerRow.font = { bold: true, color: { argb: 'FF174EA6' } };
    });

    // Write buffer & save Excel file
    const buf = await workbook.xlsx.writeBuffer();
    const filename = `DemoSales_${safe(r.date)}_${r.id || ''}_${Date.now()}.xlsx`;
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, filename);

    setDownloadedId(r.id);
    setTimeout(() => setDownloadedId(null), 1500);

  } catch (e) {
    setDownloadError(r.id, "Excel export failed: " + (e.message || e));
  } finally {
    setDownloading(r.id, false);
  }
};

// ----- OPTIONAL PDF EXPORT -----
const handleDownloadPDF = (r) => {
  setDownloadError(r.id, "");
  setDownloading(r.id, true);

  try {
    const doc = new jsPDF();
    
    // Register Gujarati font if available
    if (notoSansGujarati && notoSansGujarati.fontName && notoSansGujarati.fontData) {
      doc.addFileToVFS("NotoSansGujarati-Regular.ttf", notoSansGujarati.fontData);
      doc.addFont("NotoSansGujarati-Regular.ttf", "NotoSansGujarati", "normal");
    }

    let y = 10;
    doc.setFontSize(16);
    doc.text("Demo Sales Report", 14, y);
    y += 10;

    doc.setFontSize(11);
    doc.text(`Demo: ${getDemoName(r)}`, 14, y); y += 7;
    doc.text(`Date: ${r.date || "-"}`, 14, y); y += 7;
    doc.text(`Village: ${r.village || "-"}`, 14, y); y += 7;
    doc.text(`Taluka: ${r.taluka || "-"}`, 14, y); y += 7;
    doc.text(`Mantri: ${r.mantri || "-"}`, 14, y); y += 7;
    doc.text(`Total Milk: ${r.totalMilk || "-"}`, 14, y); y += 7;
    doc.text(`Active Sabhasad: ${r.activeSabhasad || "-"}`, 14, y); y += 7;
    doc.text(`Team Members: ${r.teamMembers || "-"}`, 14, y); y += 7;
    doc.text(`Entry By: ${r.entryBy || "-"}`, 14, y); y += 7;
    doc.text(`Demo Remarks: ${r.demoRemarks || "-"}`, 14, y); y += 10;

    // Customers table
    if ((r.customers || []).length > 0 && typeof doc.autoTable === 'function') {
      doc.setFontSize(13);
      doc.text("Customers", 14, y); y += 4;
      doc.autoTable({
        startY: y,
        head: [["Name", "Code", "Mobile", "Packaging", "Qty", "Remarks"]],
        body: (r.customers || []).map(c => [c.name, c.code, c.mobile, c.orderPackaging, c.orderQty, c.remarks]),
        theme: 'grid',
        styles: { fontSize: 10 },
        columnStyles: { 5: { font: "NotoSansGujarati" } },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 6;
    }

    // Stock table
    if ((r.stockAtDairy || []).length > 0 && typeof doc.autoTable === 'function') {
      doc.setFontSize(13);
      doc.text("Stock at Dairy", 14, y); y += 4;
      doc.autoTable({
        startY: y,
        head: [["Packaging", "Quantity"]],
        body: (r.stockAtDairy || []).map(s => [s.packaging, s.quantity]),
        theme: 'grid',
        styles: { fontSize: 10 },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 6;
    }

    doc.save(`DemoSales_${r.date || 'export'}.pdf`);
    setDownloadedId(r.id);
    setTimeout(() => setDownloadedId(null), 1500);

  } catch (e) {
    setDownloadError(r.id, "PDF export failed: " + (e.message || e));
  } finally {
    setDownloading(r.id, false);
  }
};

                      return (
                        <tr key={r.id}>
                          <td>{getDemoName(r)}</td>
                          <td>{r.date}</td>
                          <td>{(r.customers||[]).reduce((sum, c) => sum + (Number(c.orderQty) || 0), 0)}</td>
                          <td>{(r.stockAtDairy||[]).reduce((sum, s) => sum + (Number(s.quantity) || 0), 0)}</td>
                          <td>
                            <button className="btn-outline" style={{padding:'4px 12px', borderRadius:6, background:'#2563eb', color:'#fff', border:'none', fontWeight:700, cursor:'pointer', marginRight:6}} onClick={() => setSelected(r)}>View</button>
                            <button className="btn-outline" style={{padding:'4px 10px', borderRadius:6, background: copiedId===r.id ? '#22c55e' : '#e3eefd', color:'#174ea6', border:'1.5px solid #b6c7e6', fontWeight:700, cursor:'pointer'}} title={copiedId===r.id ? "Copied!" : "Copy WhatsApp Summary"} onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(waSummary);
                                setCopiedId(r.id);
                                setTimeout(() => setCopiedId(null), 1500);
                              } catch (e) {}
                            }}>
                              {copiedId===r.id ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" stroke="#174ea6" strokeWidth="2"/><rect x="3" y="3" width="13" height="13" rx="2" fill="#fff" stroke="#174ea6" strokeWidth="2"/></svg>
                              )}
                            </button>
                            <button className="btn-outline" style={{padding:'4px 8px', borderRadius:6, background:'#fff', color:'#174ea6', border:'1.5px solid #b6c7e6', fontWeight:700, cursor:'pointer', marginLeft:6}} title="Download PDF" onClick={handleDownloadPDF}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M12 5v14m0 0l-6-6m6 6l6-6" stroke="#174ea6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                          </td>
                          <td style={{position:'relative'}}>
                            <button className="btn-outline" style={{padding:'4px 10px', borderRadius:6, background: downloadedId===r.id ? '#22c55e' : downloading ? '#fbbf24' : '#e3eefd', color:'#174ea6', border:'1.5px solid #b6c7e6', fontWeight:700, cursor: downloading ? 'wait' : 'pointer'}} title={downloadedId===r.id ? "Downloaded!" : downloading ? "Downloading..." : "Download Excel"} onClick={handleDownload} disabled={downloading}>
                              {downloadedId===r.id ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              ) : downloading ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="#f59e42" strokeWidth="2" fill="none"/><path d="M12 7v5l3 3" stroke="#f59e42" strokeWidth="2" strokeLinecap="round"/></svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M12 5v14m0 0l-6-6m6 6l6-6" stroke="#174ea6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              )}
                            </button>
                            {downloadError && (
                              <div style={{position:'absolute', left:0, right:0, top:'110%', background:'#fff0f0', color:'#b91c1c', fontSize:'0.95em', border:'1px solid #fca5a5', borderRadius:6, padding:'4px 8px', marginTop:2, zIndex:10}}>
                                {downloadError}
                              </div>
                            )}
                          </td>
                          <td>
                            <button className="btn-outline" style={{padding:'4px 12px', borderRadius:6, background:'#b91c1c', color:'#fff', border:'none', fontWeight:700, cursor:'pointer'}} onClick={async () => {
                              if(window.confirm('Delete this record?')) {
                                try {
                                  await import('firebase/firestore').then(({ deleteDoc, doc }) => deleteDoc(doc(db, 'demoSales', r.id)));
                                  setRecords(prev => prev.filter(rec => rec.id !== r.id));
                                } catch (err) {
                                  alert('Error deleting record: ' + err.message);
                                }
                              }
                            }}>Delete</button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
// --- Filtering state and logic moved to top of component ---
          </>
        )}
        {/* Modal for full record view */}
        {selected && (
          <div style={{position:'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'#0008', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center'}} onClick={() => setSelected(null)}>
            <div style={{background:'#fff', borderRadius:16, padding:'32px 28px', minWidth:320, maxWidth:480, boxShadow:'0 2px 24px #2563eb33', fontSize:'1.08em', lineHeight:1.6}} onClick={e => e.stopPropagation()}>
              <h3 style={{marginTop:0, color:'#174ea6', fontWeight:800, fontSize:'1.3em', letterSpacing:'0.02em', textAlign:'center'}}>Demo Sales Details</h3>
              <table style={{width:'100%', borderCollapse:'collapse', margin:'10px 0 0 0'}}>
                <tbody>
                  <tr><td style={{fontWeight:600, color:'#2563eb'}}>Demo Name</td><td>{getDemoName(selected)}</td></tr>
                  <tr><td style={{fontWeight:600, color:'#2563eb'}}>Date</td><td>{selected.date}</td></tr>
                  <tr><td style={{fontWeight:600, color:'#2563eb'}}>Village</td><td>{selected.village}</td></tr>
                  <tr><td style={{fontWeight:600, color:'#2563eb'}}>Taluka</td><td>{selected.taluka}</td></tr>
                  <tr><td style={{fontWeight:600, color:'#2563eb'}}>Mantri</td><td>{selected.mantri}</td></tr>
                  <tr><td style={{fontWeight:600, color:'#2563eb'}}>Total Milk</td><td>{selected.totalMilk}</td></tr>
                  <tr><td style={{fontWeight:600, color:'#2563eb'}}>Active Sabhasad</td><td>{selected.activeSabhasad}</td></tr>
                  <tr><td style={{fontWeight:600, color:'#2563eb'}}>Team Members</td><td>{selected.teamMembers}</td></tr>
                  <tr><td style={{fontWeight:600, color:'#2563eb'}}>Entry By</td><td>{selected.entryBy}</td></tr>
                  <tr><td style={{fontWeight:600, color:'#2563eb'}}>Total Sales</td><td>{(selected.customers||[]).reduce((sum, c) => sum + (Number(c.orderQty)||0), 0)}</td></tr>
                  <tr><td style={{fontWeight:600, color:'#2563eb'}}>Total Stock</td><td>{(selected.stockAtDairy||[]).reduce((sum, s) => sum + (Number(s.quantity)||0), 0)}</td></tr>
                  <tr><td style={{fontWeight:600, color:'#2563eb'}}>Demo Remarks</td><td>{selected.demoRemarks}</td></tr>
                </tbody>
              </table>
              <div style={{marginTop:18}}>
                <b>Customers:</b>
                <ul style={{margin:0, paddingLeft:18}}>
                  {(selected.customers||[]).map((c,i) => (
                    <li key={i}>{c.name} ({c.code}) - {c.orderPackaging} {c.orderQty} {c.remarks ? `- ${c.remarks}` : ''}</li>
                  ))}
                  {(!selected.customers || selected.customers.length === 0) && <li>—</li>}
                </ul>
              </div>
              <div style={{marginTop:8}}>
                <b>Stock at Dairy:</b>
                <ul style={{margin:0, paddingLeft:18}}>
                  {(selected.stockAtDairy||[]).map((s,i) => (
                    <li key={i}>{s.packaging}: {s.quantity}</li>
                  ))}
                  {(!selected.stockAtDairy || selected.stockAtDairy.length === 0) && <li>—</li>}
                </ul>
              </div>
              <div style={{marginTop:8}}>
                <b>Last Updated:</b> {selected.updatedAt ? (selected.updatedAt.toDate ? selected.updatedAt.toDate().toLocaleString() : new Date(selected.updatedAt * 1000).toLocaleString()) : (selected.createdAt ? (selected.createdAt.toDate ? selected.createdAt.toDate().toLocaleString() : new Date(selected.createdAt * 1000).toLocaleString()) : '—')}
              </div>
              {selected.comment && (
                <div style={{marginTop:8, background:'#f7fafd', borderRadius:6, padding:'8px 12px'}}>
                  <b>Comment:</b> {selected.comment}
                  {selected.reviewer && (
                    <span style={{marginLeft:8, color:'#2563eb', fontWeight:600}}>
                      — by {selected.reviewer}
                    </span>
                  )}
                  {selected.commentDate && (
                    <span style={{marginLeft:8, color:'#888', fontSize:'0.98em'}}>
                      on {selected.commentDate.toDate ? selected.commentDate.toDate().toLocaleString() : new Date(selected.commentDate * 1000).toLocaleString()}
                    </span>
                  )}
                </div>
              )}
              <div style={{marginTop:22, textAlign:'right'}}>
                <button className="btn-outline" style={{padding:'8px 22px', borderRadius:8, fontWeight:700, background:'#2563eb', color:'#fff', border:'none'}} onClick={() => setSelected(null)}>Close</button>
              </div>
            </div>
          </div>
        )}
        <footer className="footer-credit" style={{marginTop: 32}}>
          <p>MADE WITH AI BY <strong>S&J</strong></p>
          <small>Powered by Parul Chemicals • FS CALCIVAL</small>
        </footer>
      </div>
    </>
  );
}
