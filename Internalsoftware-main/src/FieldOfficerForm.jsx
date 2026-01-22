// FieldOfficerForm.jsx

import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Navbar from './Navbar';
import './form.css';
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Link, useNavigate } from 'react-router-dom';
import notoSansGujarati from './fonts/NotoSansGujarati-Regular.js';

export default function FieldOfficerForm() {
  const navigate = useNavigate();
  // State and logic
  const [officers, setOfficers] = useState(() => {
    const stored = localStorage.getItem('officers');
    return stored ? JSON.parse(stored) : [
      { name: 'VINIT GADOYA', code: 'GJ03', type: 'Full Time' },
      { name: 'KALPESH MASTER', code: 'GJ16', type: 'Full Time' }
    ];
  });
  const [newOfficer, setNewOfficer] = useState({ name: '', code: '', type: 'Full Time' });
  const [showAddOfficer, setShowAddOfficer] = useState(false);
  const [form, setForm] = useState({
    officerName: '', date: '', kms: '', punchIn: '', punchOut: '',
    remarks: '', notes: '', entryBy: '', reviewer: '', reviewerComment: '',
    workingType: '', breakStart: '',
breakEnd: '',

  });
  const [locations, setLocations] = useState(['']);
  const [newLocation, setNewLocation] = useState("");
  const [customers, setCustomers] = useState([
    { name: '', type: '', address: '', phone: '', remark: '', orders: [{ packaging: '', quantity: '' }] }
  ]);
  useEffect(() => {
    localStorage.setItem('officers', JSON.stringify(officers));
  }, [officers]);
  const handleAddOfficer = () => {
    if (newOfficer.name && newOfficer.code) {
      const newList = [...officers, newOfficer];
      setOfficers(newList);
      setForm({ ...form, officerName: `${newOfficer.name} (${newOfficer.code})` });
      setNewOfficer({ name: '', code: '', type: 'Full Time' });
      setShowAddOfficer(false);
    }
  };
 const calculateHours = () => {
  if (!form.punchIn || !form.punchOut) return 0;

  const [inH, inM] = form.punchIn.split(':').map(Number);
  const [outH, outM] = form.punchOut.split(':').map(Number);
  const inMin = inH * 60 + inM;
  const outMin = outH * 60 + outM;

  let totalWorkMin = outMin - inMin;

  if (form.breakStart && form.breakEnd) {
    const [bStartH, bStartM] = form.breakStart.split(':').map(Number);
    const [bEndH, bEndM] = form.breakEnd.split(':').map(Number);
    const breakMin = (bEndH * 60 + bEndM) - (bStartH * 60 + bStartM);
    totalWorkMin -= breakMin;
  }

  return (totalWorkMin / 60).toFixed(2);
};

  const exportToPDF = () => {
  const doc = new jsPDF();
  doc.addFileToVFS("NotoSansGujarati-Regular.ttf", notoSansGujarati);
  doc.addFont("NotoSansGujarati-Regular.ttf", "NotoSansGujarati", "normal");
  doc.setFont("NotoSansGujarati");

  let y = 10; // Start Y

  const lineGap = 8; // Gap between lines
  const labelFontSize = 11;
  const valueFontSize = 12;
  const maxWidth = 180;

  const addField = (label, value) => {
    doc.setFontSize(labelFontSize);
    doc.text(`${label}`, 14, y);
    y += 5;
    doc.setFontSize(valueFontSize);
    doc.text(value || '-', 14, y, { maxWidth });
    y += lineGap;
  };

  doc.setFontSize(16);
  doc.text("Field Officer Report", 14, y);
  y += lineGap + 2;

  addField("Officer Name", form.officerName);
  addField("Area", form.area);
  addField("Work Type", form.workType);
  addField("Punch In", form.punchIn);
  addField("Punch Out", form.punchOut);
  addField("Break Start", form.breakStart);
  addField("Break End", form.breakEnd);
  addField("Work Description", form.workDescription);
  addField("Other Remarks", form.remarks);

  // Calculate and display total working hours after break
  const totalHours = calculateHours();
  addField("Total Working Hours (after break)", `${totalHours} hrs`);

  // If customerList is present, render table
  if (form.customerList.length > 0) {
    y += 5;
    doc.setFontSize(14);
    doc.text("Customer Details", 14, y);
    y += lineGap;

    const columns = [
      { header: "Name", dataKey: "name" },
      { header: "Mobile", dataKey: "mobile" },
      { header: "Remarks", dataKey: "remarks" }
    ];

    doc.autoTable({
      startY: y,
      head: [columns.map(col => col.header)],
      body: form.customerList.map(row => columns.map(col => row[col.dataKey] || "-")),
      theme: "grid",
      styles: { font: "NotoSansGujarati" }
    });
  }

  doc.save(`FieldOfficerReport_${form.officerName || 'Report'}.pdf`);
};

const getExpense = () => {
  return "No expense recorded"; // or your actual logic to calculate/display expense
};

  // NAVBAR
  const [navOpen, setNavOpen] = useState(false);

  // Submit to Firestore
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, "fieldOfficerForms"), {
        ...form,
        locations,
        customers,
        expenses: getExpense(),
        orderSummary: getOrderSummary(),
        createdAt: new Date().toISOString(),
      });
      // Add the new record to the top of the history list
      setHistory(h => [{
        id: docRef.id,
        ...form,
        locations,
        customers,
        expenses: getExpense(),
        orderSummary: getOrderSummary(),
        createdAt: new Date().toISOString(),
      }, ...h]);
      alert("Form submitted successfully!");
      // Reset form after successful submit
      setForm({
        officerName: '', date: '', kms: '', punchIn: '', punchOut: '',
        remarks: '', notes: '', entryBy: '', reviewer: '', reviewerComment: '',
        workingType: ''
      });
      setLocations(['']);
      setCustomers([{ name: '', type: '', address: '', phone: '', remark: '', orders: [{ packaging: '', quantity: '' }] }]);
      setShowAddOfficer(false);
      // Do NOT navigate away, just show the updated history below
    } catch (err) {
      alert("Error submitting form: " + err.message);
    }
    setSubmitting(false);
  };

  // --- Field Officer History State ---
  const [history, setHistory] = useState([]);
  const [editRecord, setEditRecord] = useState(null); // record being edited
  const [editForm, setEditForm] = useState(null);
  const [editLocations, setEditLocations] = useState([]);
  const [editCustomers, setEditCustomers] = useState([]);
  const [editNewLocation, setEditNewLocation] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // --- Field Officer History Table (improved UI) ---
  // Place this just above the Edit Modal in the return JSX
  // ...existing code...

  // Fetch all field officer forms for history
  useEffect(() => {
    async function fetchHistory() {
      try {
        const snap = await import('firebase/firestore').then(({ getDocs, collection }) => getDocs(collection(db, 'fieldOfficerForms')));
        setHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        // ignore
      }
    }
    fetchHistory();
  }, []);

  // PDF export for a record (reuses exportToPDF logic, but for any record)
  const exportRecordToPDF = async (record) => {
    const doc = new jsPDF();
    doc.setFont('helvetica');
    doc.setFontSize(16);
    doc.text('Field Officer Daily Data', 14, 18);
    doc.setFontSize(11);
    doc.text(`Officer: ${record.officerName || '-'} | Date: ${record.date || '-'}`, 14, 28);
    doc.text(`Working Type: ${record.workingType || '-'} | KMs: ${record.kms || '-'}`, 14, 36);
    doc.text(`Punch In: ${record.punchIn || '-'} | Punch Out: ${record.punchOut || '-'} | Hours: ${record.hours || '-'} `, 14, 44);
    doc.text(`Entry By: ${record.entryBy || '-'}`, 14, 52);
    doc.text(`Reviewer: ${record.reviewer || '-'}`, 14, 60);
    doc.text(`Reviewer Comment: ${record.reviewerComment || '-'}`, 14, 68);
    doc.text('Visited Locations:', 14, 78);
    (record.locations || []).forEach((loc, i) => {
      if (loc) doc.text(`- ${loc}`, 20, 86 + i * 7);
    });
    let y = 86 + (record.locations?.length || 0) * 7 + 6;
    doc.text('Customers:', 14, y);
    y += 6;
    (record.customers || []).forEach((c, i) => {
      if (c.name) {
        doc.text(`${i + 1}. ${c.name} (${c.type || ''})`, 18, y);
        y += 6;
        if (c.address) { doc.text(`Address: ${c.address}`, 22, y); y += 6; }
        if (c.phone) { doc.text(`Phone: ${c.phone}`, 22, y); y += 6; }
        if (c.remark) { doc.text(`Remark: ${c.remark}`, 22, y); y += 6; }
        if (c.orders && c.orders.length > 0) {
          c.orders.forEach((o, j) => {
            if (o.packaging && o.quantity) {
              doc.text(`Order: ${o.packaging} x ${o.quantity}`, 26, y); y += 6;
            }
          });
        }
        y += 2;
      }
    });
    y += 4;
    doc.text('Notes:', 14, y); y += 6;
    doc.text(record.notes || '-', 18, y); y += 8;
    doc.text('Remarks:', 14, y); y += 6;
    doc.text(record.remarks || '-', 18, y); y += 8;
    doc.text('Expenses:', 14, y); y += 6;
    const exp = record.expenses || { food: 0, fuel: 0, total: 0 };
    doc.text(`Food Allowance: ₹${exp.food} | Fuel: ₹${exp.fuel} | Total: ₹${exp.total}`, 18, y);
    doc.save(`FieldOfficer_${record.officerName || 'data'}_${record.date || ''}.pdf`);
  };
const getOrderSummary = () => {
  return " "; // or build your custom logic here
};

  // Open edit modal for a record
  const openEditModal = (rec) => {
    // Ensure all fields are present and arrays have at least one entry for UI
    setEditRecord(rec);
    setEditForm({
      officerName: rec.officerName ?? '',
      date: rec.date ?? '',
      workingType: rec.workingType ?? '',
      punchIn: rec.punchIn ?? '',
      punchOut: rec.punchOut ?? '',
      kms: rec.kms ?? '',
      entryBy: rec.entryBy ?? '',
      notes: rec.notes ?? '',
      remarks: rec.remarks ?? '',
      reviewer: rec.reviewer ?? '',
      reviewerComment: rec.reviewerComment ?? '',
    });
    // Locations: always at least one input
    setEditLocations(Array.isArray(rec.locations) && rec.locations.length > 0 ? [...rec.locations] : ['']);
    // Customers: always at least one customer, each with at least one order
    let customers = Array.isArray(rec.customers) && rec.customers.length > 0 ? JSON.parse(JSON.stringify(rec.customers)) : [{ name: '', type: '', address: '', phone: '', remark: '', orders: [{ packaging: '', quantity: '' }] }];
    customers = customers.map(c => ({
      name: c.name ?? '',
      type: c.type ?? '',
      address: c.address ?? '',
      phone: c.phone ?? '',
      remark: c.remark ?? '',
      orders: Array.isArray(c.orders) && c.orders.length > 0 ? c.orders.map(o => ({
        packaging: o.packaging ?? '',
        quantity: o.quantity ?? ''
      })) : [{ packaging: '', quantity: '' }]
    }));
    setEditCustomers(customers);
    setEditNewLocation("");
  };

  // Save edited record
  const saveEditRecord = async () => {
    setEditSubmitting(true);
    try {
      await import('firebase/firestore').then(({ doc, updateDoc }) => updateDoc(doc(db, 'fieldOfficerForms', editRecord.id), {
        ...editForm,
        locations: editLocations,
        customers: editCustomers,
      }));
      setHistory(h => h.map(r => r.id === editRecord.id ? { ...editForm, locations: editLocations, customers: editCustomers, id: editRecord.id } : r));
      setEditRecord(null);
    } catch (e) {
      alert('Error saving: ' + (e.message || e));
    }
    setEditSubmitting(false);
  };

  return (
    <>
      <Navbar />

      <div className="form-container">
        <form onSubmit={handleSubmit} autoComplete="off">
        {/* Officer Section */}
        <div className="form-section-card">
          <h3>👤 Officer Details</h3>
          <label>Officer Name:</label>
          <select
            value={form.officerName}
            onChange={(e) => setForm({ ...form, officerName: e.target.value })}
          >
            <option value="">Select Officer</option>
            {officers.map((o, i) => (
              <option key={i} value={`${o.name} (${o.code})`}>
                {o.name} ({o.code}) - {o.type}
              </option>
            ))}
          </select>
          <button className="btn-outline" onClick={() => setShowAddOfficer(!showAddOfficer)} type="button">
            {showAddOfficer ? 'Cancel Add Officer' : '➕ Add New Officer'}
          </button>

          {showAddOfficer && (
            <div className="add-officer">
              <label>Officer Name:</label>
              <input value={newOfficer.name} onChange={(e) => setNewOfficer({ ...newOfficer, name: e.target.value })} />
              <label>Officer Code:</label>
              <input value={newOfficer.code} onChange={(e) => setNewOfficer({ ...newOfficer, code: e.target.value })} />
              <label>Officer Type:</label>
              <select value={newOfficer.type} onChange={(e) => setNewOfficer({ ...newOfficer, type: e.target.value })}>
                <option value="Full Time">Full Time</option>
                <option value="Part Time">Part Time</option>
              </select>
              <button className="btn-primary" onClick={handleAddOfficer} type="button">✅ Add Officer</button>
            </div>
          )}
        </div>

        {/* Work Info */}
        <div className="form-section-card">
          <h3>🗓️ Work Information</h3>
          <label>Date:</label>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <label>Working Type:</label>
          <select value={form.workingType} onChange={(e) => setForm({ ...form, workingType: e.target.value })}>
            <option value="">Select</option>
            <option value="Field Work">Field Work</option>
            <option value="Office Work">Office Work</option>
            <option value="Mixed">Mixed</option>
            <option value="Leave">Leave</option>
          </select>
          <label>Punch In:</label>
          <input type="time" value={form.punchIn} onChange={(e) => setForm({ ...form, punchIn: e.target.value })} />
          <label>Punch Out:</label>
          <input type="time" value={form.punchOut} onChange={(e) => setForm({ ...form, punchOut: e.target.value })} />
          <label>Break Start:</label>
<input type="time" value={form.breakStart} onChange={(e) => setForm({ ...form, breakStart: e.target.value })} />

<label>Break End:</label>
<input type="time" value={form.breakEnd} onChange={(e) => setForm({ ...form, breakEnd: e.target.value })} />

          <label>KMs Travelled:</label>
          <input type="number" value={form.kms} onChange={(e) => setForm({ ...form, kms: e.target.value })} />
        </div>

        {/* Visited Locations */}
        <div className="form-section-card">
          <h3>📍 Visited Locations</h3>
          <label>Visited Locations:</label>
          {locations.map((loc, i) => (
            <input
              key={i}
              placeholder={`Location ${i + 1}`}
              value={loc}
              onChange={(e) => {
                const updated = [...locations];
                updated[i] = e.target.value;
                setLocations(updated);
              }}
            />
          ))}
          <div style={{display:'flex', gap:8, marginTop:8}}>
            <input
              type="text"
              placeholder="Add new location"
              value={newLocation}
              onChange={e => setNewLocation(e.target.value)}
              style={{flex:1}}
            />
            <button
              className="btn-outline"
              type="button"
              onClick={() => {
                if (newLocation.trim()) {
                  setLocations([...locations, newLocation.trim()]);
                  setNewLocation("");
                }
              }}
            >
              ➕ Add Location
            </button>
          </div>
        </div>

        {/* Customers */}
        <div className="form-section-card">
          <h3>👥 Customers</h3>
          <label>Customers:</label>
          {customers.map((c, i) => (
            <div key={i} className="customer">
              <input placeholder="Name" value={c.name} onChange={(e) => {
                const updated = [...customers];
                updated[i].name = e.target.value;
                setCustomers(updated);
              }} />
              <input placeholder="Type (Retail/Distributor)" value={c.type} onChange={(e) => {
                const updated = [...customers];
                updated[i].type = e.target.value;
                setCustomers(updated);
              }} />
              <input placeholder="Phone" value={c.phone} onChange={(e) => {
                const val = e.target.value;
                if (val === '' || /^\d{0,10}$/.test(val)) {
                  const updated = [...customers];
                  updated[i].phone = val;
                  setCustomers(updated);
                }
              }}
              onBlur={(e) => {
                if (e.target.value.length !== 10 && e.target.value !== '') {
                  alert('📵 Phone number must be exactly 10 digits.');
                }
              }} />
              <input placeholder="Address" value={c.address} onChange={(e) => {
                const updated = [...customers];
                updated[i].address = e.target.value;
                setCustomers(updated);
              }} />
              <input placeholder="Remarks" value={c.remark} onChange={(e) => {
                const updated = [...customers];
                updated[i].remark = e.target.value;
                setCustomers(updated);
              }} />
              {c.orders.map((o, j) => (
                <div key={j} className="order-entry">
                  <select value={o.packaging} onChange={(e) => {
                    const updated = [...customers];
                    updated[i].orders[j].packaging = e.target.value;
                    setCustomers(updated);
                  }}>
                    <option value="">Select Package</option>
                    <option value="1L JAR">1L JAR</option>
                    <option value="2L JAR">2L JAR</option>
                    <option value="5L PLASTIC JAR">5L PLASTIC JAR</option>
                    <option value="5L STEEL BARNI">5L STEEL BARNI</option>
                    <option value="10 LTR JAR">10 LTR JAR</option>
                    <option value="10 LTR STEEL BARNI">10 LTR STEEL BARNI</option>
                    <option value="20 LTR CARBO">20 LTR CARBO</option>
                    <option value="20 LTR CAN">20 LTR CAN</option>
                    <option value="20 LTR STEEL BARNI">20 LTR STEEL BARNI</option>
                  </select>
                  <input placeholder="Qty" type="number" value={o.quantity} onChange={(e) => {
                    const updated = [...customers];
                    updated[i].orders[j].quantity = e.target.value;
                    setCustomers(updated);
                  }} />
                </div>
              ))}
              <button
                className="btn-outline"
                type="button"
                onClick={() => {
                  const updated = [...customers];
                  updated[i].orders.push({ packaging: '', quantity: '' });
                  setCustomers(updated);
                }}
              >
                ➕ Add Order
              </button>
            </div>
          ))}
          <button
            className="btn-primary"
            type="button"
            onClick={() => setCustomers([...customers, { name: '', type: '', address: '', phone: '', remark: '', orders: [{ packaging: '', quantity: '' }] }])}
          >
            ➕ Add Customer
          </button>
        </div>

        {/* Notes & Remarks */}
        <div className="form-section-card">
          <h3>📝 Notes & Remarks</h3>
          <label>Entry By:</label>
          <input value={form.entryBy} onChange={(e) => setForm({ ...form, entryBy: e.target.value })} />
          <label>Notes:</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <label>Remarks:</label>
          <textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
        </div>

        {/* Reviewer */}
        <div className="form-section-card">
          <h3>🧑‍💼 Reviewer</h3>
          <label>Reviewer:</label>
          <select value={form.reviewer} onChange={(e) => setForm({ ...form, reviewer: e.target.value })}>
            <option value="">Select Reviewer</option>
            <option value="Maulik Shah">Maulik Shah</option>
            <option value="Jigar Shah">Jigar Shah</option>
            <option value="Sonal Madam">Sonal Madam</option>
            <option value="Bhavin Prajapati">Bhavin Prajapati</option>
            <option value="Jash Ilasariya">Jash Ilasariya</option>
            <option value="Shubham">Shubham</option>
          </select>
          <label>Reviewer Comment:</label>
          <textarea value={form.reviewerComment} onChange={(e) => setForm({ ...form, reviewerComment: e.target.value })} />
        </div>

        {/* Summary */}
        <div className="form-section-card summary-section">
          <h3>🧾 Summary</h3>
          <h4>Total Orders:</h4>
          <ul>
            {Object.entries(getOrderSummary()).map(([type, qty], index) => (
              <li key={index}>{type}: <strong>{qty}</strong></li>
            ))}
          </ul>

          <h4>Expenses:</h4>
          <ul>
            <li>Food Allowance: ₹{getExpense().food}</li>
            <li>Fuel Reimbursement: ₹{getExpense().fuel}</li>
            <li><strong>Total: ₹{getExpense().total}</strong></li>
          </ul>
        </div>

        {/* Actions */}
        <div className="form-actions" style={{ display: 'flex', gap: 12 }}>
          <button className="btn-primary" type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit to Company'}</button>
          <button className="btn-glow" type="button" onClick={exportToPDF}>📄 Download PDF</button>
        </div>

        {/* Footer */}
        <footer className="footer-credit">
          <p>MADE WITH AI BY <strong>S&J</strong></p>
          <small>Powered by Parul Chemicals • FS CALCIVAL</small>
        </footer>
        </form>
      </div>
    </>
  );
}