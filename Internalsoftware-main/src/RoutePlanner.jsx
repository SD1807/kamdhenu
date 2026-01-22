import React, { useState } from 'react';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import ExcelJS from 'exceljs';
import Navbar from './Navbar';
import './form.css';

const packagingOptions = [
  "1L JAR",
  "2L JAR",
  "5L PLASTIC JAR",
  "5L STEEL BARNI",
  "10 LTR JAR",
  "10 LTR STEEL BARNI",
  "20 LTR CARBO",
  "20 LTR CAN",
  "20 LTR STEEL BARNI"
];



const RoutePlanner = () => {
  const [date, setDate] = useState('');
  const [routes, setRoutes] = useState([]);
  const [message, setMessage] = useState('');

  const [newLocation, setNewLocation] = useState({
    location: '',
    orders: [{ packaging: '', qty: '' }],
    returns: [{ packaging: '', qty: '' }],
    payment: '',
    contact: '',
    packaging: '',
    remark: ''
  });


  const handleVillageChange = (e) => {
    const value = e.target.value;
    setNewLocation((prev) => ({ ...prev, location: value }));
  };

  const handleAddLocation = () => {
    if (!newLocation.location) return;
    setRoutes([...routes, { ...newLocation, completed: false, verified: false }]);
    setNewLocation({
      location: '',
      orders: [{ packaging: '', qty: '' }],
      returns: [{ packaging: '', qty: '' }],
      payment: '',
      contact: '',
      packaging: '',
      remark: ''
    });
  };

  const handleComplete = (index) => {
    const updated = [...routes];
    updated[index].completed = true;
    setRoutes(updated);
  };

  const handleVerifyPayment = (index) => {
    const updated = [...routes];
    updated[index].verified = true;
    setRoutes(updated);
  };

 const handleSave = async () => {
  if (!date) {
    setMessage("❌ Please select a date before saving.");
    return;
  }

  try {
    await addDoc(collection(db, 'routePlans'), {
      date,
      routes,
      createdAt: new Date().toISOString(),
    });
    setMessage("✅ Route Planner data saved successfully!");
    setRoutes([]);
    setDate('');
  } catch (error) {
    console.error("Error saving data: ", error);
    setMessage("❌ Failed to save data.");
  }
};

  
  const handleExcelImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target.result;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        const worksheet = workbook.worksheets[0];
        if (!worksheet) return;

        // read headers
        const headerRow = worksheet.getRow(1);
        const headers = headerRow.values.slice(1).map(h => (h || '').toString().trim());

        const rows = [];
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const vals = row.values.slice(1);
          const obj = {};
          headers.forEach((h, idx) => {
            obj[h] = vals[idx] !== undefined && vals[idx] !== null ? vals[idx] : '';
          });
          rows.push(obj);
        });

        const importedRoutes = rows.map((row) => ({
          location: row.Location || row.location || '',
          remark: row.Remark || row.remark || '',
          order: row.Order || row.order || '',
          return: row.Return || row.return || '',
          payment: row.Payment || row.payment || '',
          contact: row.Contact || row.contact || '',
          completed: false,
          verified: false,
        }));

        setRoutes(prev => [...prev, ...importedRoutes]);
      } catch (err) {
        console.error('Excel import failed:', err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <>
      <Navbar />
      <div style={{maxWidth: 900, margin: '40px auto', minHeight: 'calc(100vh - 120px)', background:'#f7fafd', borderRadius:18, boxShadow:'0 4px 24px #2563eb22', padding:'24px 0 0 0'}}>
        <h2 style={{marginBottom: 18, color: '#174ea6', fontWeight: 900, fontSize: '2.2rem', letterSpacing: '0.04em', textAlign:'center'}}>Route Planner</h2>
        <form autoComplete="off" style={{width:'100%'}} onSubmit={e => e.preventDefault()}>
          <div className="section-card" style={{marginBottom: 24, textAlign: 'left', borderRadius:14, boxShadow:'0 2px 12px #2563eb11', background:'#fff', padding:'24px 18px'}}>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center', marginBottom: 18}}>
              <div style={{flex: 1, minWidth: 180}}>
                <label>Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{width:'100%', borderRadius:8, padding:8, border:'1.5px solid #b6c7e6', fontFamily:'inherit'}} />
              </div>
              <div style={{flex: 2, minWidth: 180}}>
                <label>Import from Excel</label>
                <input type="file" accept=".xlsx, .xls" onChange={handleExcelImport} style={{width:'100%'}} />
              </div>
            </div>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: 32, marginBottom: 24}}>
              <div style={{flex: 2, minWidth: 200, display:'flex', flexDirection:'column', gap:8}}>
                <label style={{fontWeight:600, marginBottom:2}}>Village Name</label>
                <input type="text" value={newLocation.location} onChange={handleVillageChange} style={{width:'100%', borderRadius:10, padding:12, border:'2px solid #b6c7e6', fontFamily:'inherit', fontSize:'1.08em', background:'#f7fafd'}} placeholder="Village Name" />
              </div>
              <div style={{flex: 4, minWidth: 320, flexDirection:'column', display:'flex', gap:16, background:'#f7fafd', borderRadius:12, padding:'16px 14px', border:'1.5px solid #b6c7e6', boxShadow:'0 1px 6px #2563eb11'}}>
                <label style={{fontWeight:700, marginBottom:6, fontSize:'1.08em', color:'#174ea6'}}>Orders</label>
                {newLocation.orders.map((order, idx) => (
                  <div key={idx} style={{display:'flex', gap:12, alignItems:'center', marginBottom:8, background:'#fff', borderRadius:8, padding:'10px 8px', boxShadow:'0 1px 4px #2563eb11', border:'1.5px solid #e3eefd'}}>
                    <select
                      value={order.packaging}
                      onChange={e => {
                        const updated = [...newLocation.orders];
                        updated[idx].packaging = e.target.value;
                        setNewLocation({ ...newLocation, orders: updated });
                      }}
                      style={{flex:2, borderRadius:8, padding:10, border:'1.5px solid #b6c7e6', fontFamily:'inherit', fontSize:'1em', background:'#f7fafd'}}>
                      <option value="">Select Packaging</option>
                      {packagingOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <input
                      type="number"
                      value={order.qty}
                      min="1"
                      placeholder="Qty"
                      onChange={e => {
                        const updated = [...newLocation.orders];
                        updated[idx].qty = e.target.value;
                        setNewLocation({ ...newLocation, orders: updated });
                      }}
                      style={{flex:1, borderRadius:8, padding:10, border:'1.5px solid #b6c7e6', fontFamily:'inherit', fontSize:'1em', background:'#f7fafd'}}
                    />
                    {newLocation.orders.length > 1 && (
                      <button type="button" onClick={() => {
                        setNewLocation({
                          ...newLocation,
                          orders: newLocation.orders.filter((_, i) => i !== idx)
                        });
                      }} style={{background:'#ef4444', color:'#fff', border:'none', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:'1.1em'}}>✕</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setNewLocation({ ...newLocation, orders: [...newLocation.orders, { packaging: '', qty: '' }] })} style={{marginTop:8, background:'#2563eb', color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', fontWeight:700, fontSize:'1em', cursor:'pointer', boxShadow:'0 1px 4px #2563eb22'}}>+ Add Order</button>
              </div>
              <div style={{flex: 4, minWidth: 320, flexDirection:'column', display:'flex', gap:16, background:'#f7fafd', borderRadius:12, padding:'16px 14px', border:'1.5px solid #b6c7e6', boxShadow:'0 1px 6px #2563eb11'}}>
                <label style={{fontWeight:700, marginBottom:6, fontSize:'1.08em', color:'#174ea6'}}>Returns</label>
                {newLocation.returns.map((ret, idx) => (
                  <div key={idx} style={{display:'flex', gap:12, alignItems:'center', marginBottom:8, background:'#fff', borderRadius:8, padding:'10px 8px', boxShadow:'0 1px 4px #2563eb11', border:'1.5px solid #e3eefd'}}>
                    <select
                      value={ret.packaging}
                      onChange={e => {
                        const updated = [...newLocation.returns];
                        updated[idx].packaging = e.target.value;
                        setNewLocation({ ...newLocation, returns: updated });
                      }}
                      style={{flex:2, borderRadius:8, padding:10, border:'1.5px solid #b6c7e6', fontFamily:'inherit', fontSize:'1em', background:'#f7fafd'}}>
                      <option value="">Select Packaging</option>
                      {packagingOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <input
                      type="number"
                      value={ret.qty}
                      min="1"
                      placeholder="Qty"
                      onChange={e => {
                        const updated = [...newLocation.returns];
                        updated[idx].qty = e.target.value;
                        setNewLocation({ ...newLocation, returns: updated });
                      }}
                      style={{flex:1, borderRadius:8, padding:10, border:'1.5px solid #b6c7e6', fontFamily:'inherit', fontSize:'1em', background:'#f7fafd'}}
                    />
                    {newLocation.returns.length > 1 && (
                      <button type="button" onClick={() => {
                        setNewLocation({
                          ...newLocation,
                          returns: newLocation.returns.filter((_, i) => i !== idx)
                        });
                      }} style={{background:'#ef4444', color:'#fff', border:'none', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:'1.1em'}}>✕</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setNewLocation({ ...newLocation, returns: [...newLocation.returns, { packaging: '', qty: '' }] })} style={{marginTop:8, background:'#2563eb', color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', fontWeight:700, fontSize:'1em', cursor:'pointer', boxShadow:'0 1px 4px #2563eb22'}}>+ Add Return</button>
              </div>
              
              
              <div style={{flex: 1, minWidth: 100}}>
                <label>Payment</label>
                <input type="text" value={newLocation.payment} onChange={e => setNewLocation({ ...newLocation, payment: e.target.value })} style={{width:'100%', borderRadius:8, padding:8, border:'1.5px solid #b6c7e6', fontFamily:'inherit'}} placeholder="Payment" />
              </div>
              <div style={{flex: 1, minWidth: 120}}>
                <label>Contact</label>
                <input type="text" value={newLocation.contact} onChange={e => setNewLocation({ ...newLocation, contact: e.target.value })} style={{width:'100%', borderRadius:8, padding:8, border:'1.5px solid #b6c7e6', fontFamily:'inherit'}} placeholder="Contact" />
              </div>
              <div style={{flex: 2, minWidth: 160}}>
                <label>Remarks</label>
                <input type="text" value={newLocation.remark} onChange={e => setNewLocation({ ...newLocation, remark: e.target.value })} style={{width:'100%', borderRadius:8, padding:8, border:'1.5px solid #b6c7e6', fontFamily:'inherit'}} placeholder="Remarks" />
              </div>
              <div style={{alignSelf:'flex-end', minWidth:120, display:'flex', gap:8}}>
                <button type="button" style={{padding:'10px 24px', fontWeight:700, fontSize:'1em', borderRadius:8, background:'#2563eb', color:'#fff', border:'none', cursor:'pointer'}} onClick={handleAddLocation}>
                  Add Location
                </button>
              </div>
            </div>
          </div>
<table className="preview-table">
  <thead>
    <tr>
      <th>Date</th>
      <th>Location</th>
      <th>Orders</th>
      <th>Payment</th>
      <th>Remark</th>
    </tr>
  </thead>
  <tbody>
    {routes.map((r, idx) => (
      <tr key={idx}>
        <td>{date}</td>
        <td>{r.location}</td>
        <td>
          {r.orders.map((o, oidx) => (
            <div key={oidx}>
              {o.packaging} - {o.qty}
            </div>
          ))}
        </td>
        <td>{r.payment}</td>
        <td>{r.remark || "-"}</td>
      </tr>
    ))}
  </tbody>
</table>


          <div>
            
                <button type="button" style={{padding:'10px 24px', fontWeight:700, fontSize:'1em', borderRadius:8, background:'#2563eb', color:'#fff', border:'none', cursor:'pointer'}}  onClick={handleSave}>FINAL SUBMIT</button>

      {message && <p>{message}</p>}
    </div>



    
        </form>
        <footer className="footer-credit" style={{marginTop: 32, borderTop:'1px solid #e3eefd', paddingTop:12, textAlign:'center'}}>
          <p>MADE WITH AI BY <strong>S&J</strong></p>
          <small>Powered by Parul Chemicals • FS CALCIVAL</small>
        </footer>
      </div>
    </>
  );
};

export default RoutePlanner;
