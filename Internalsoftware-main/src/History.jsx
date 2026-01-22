

import React, { useEffect, useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from './firebase';
import Navbar from './Navbar';
import NotoSansGujarati from './fonts/NotoSansGujarati-Regular';
import { collection, addDoc, Timestamp } from "firebase/firestore";
const REVIEWERS = [
  'Maulik Shah',
  'Jigar Shah',
  'Sonal Madam',
  'Bhavin Prajapati',
  'Jash Ilasariya',
  'Shubham',
];

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [officerFilter, setOfficerFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [commentModal, setCommentModal] = useState({ open: false, id: null, reviewer: '', text: '' });

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      setError(null);
      try {
        const snap = await import('firebase/firestore').then(({ getDocs, collection, query, orderBy }) =>
          getDocs(query(collection(db, 'fieldOfficerForms'), orderBy('createdAt', 'desc')))
        );
        setHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        setError('Failed to load history');
      }
      setLoading(false);
    }
    fetchHistory();
  }, []);

  // Officer list for filter
  const officerList = useMemo(() => {
    const set = new Set();
    history.forEach(r => r.officerName && set.add(r.officerName));
    return Array.from(set).sort();
  }, [history]);

 

  // Filtering
  const filtered = useMemo(() => {
    return history.filter(r => {
      if (officerFilter && r.officerName !== officerFilter) return false;
      if (dateFrom && (!r.date || r.date < dateFrom)) return false;
      if (dateTo && (!r.date || r.date > dateTo)) return false;
      if (search) {
        const s = search.toLowerCase();
        const inLoc = (r.locations||[]).join(',').toLowerCase().includes(s);
        const inCust = (r.customers||[]).some(c =>
          (c.name||'').toLowerCase().includes(s) || (c.phone||'').toLowerCase().includes(s)
        );
        if (!inLoc && !inCust) return false;
      }
      return true;
    });
  }, [history, officerFilter, dateFrom, dateTo, search]);

  // PDF export (matches FieldOfficerForm format)
  const exportRecordToPDF = async (record) => {
    const doc = new jsPDF();
    doc.setFont('helvetica');
    doc.setFontSize(16);
    doc.text('Field Officer Daily Data', 14, 18);
    doc.setFontSize(11);
    doc.text(`Officer: ${record.officerName || '-'} | Date: ${record.date || '-'}`, 14, 28);
    doc.text(`Working Type: ${record.workingType || '-'} | KMs: ${record.kms || '-'}`, 14, 36);
    doc.text(`Punch In: ${record.punchIn || '-'} | Punch Out: ${record.punchOut || '-'} | Hours: ${record.hours || '-'}`, 14, 44);
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

  // Add/Edit Comment
  const openCommentModal = (id, currentReviewer, currentText) => {
    setCommentModal({ open: true, id, reviewer: currentReviewer || '', text: currentText || '' });
  };
  const closeCommentModal = () => setCommentModal({ open: false, id: null, reviewer: '', text: '' });
  const saveComment = async () => {
    if (!commentModal.reviewer) return alert('Select reviewer');
    try {
      await import('firebase/firestore').then(({ doc, updateDoc, serverTimestamp }) =>
        updateDoc(doc(db, 'fieldOfficerForms', commentModal.id), {
          commentedBy: commentModal.reviewer,
          commentText: commentModal.text,
          commentTimestamp: new Date().toISOString(),
        })
      );
      setHistory(h => h.map(r => r.id === commentModal.id ? {
        ...r,
        commentedBy: commentModal.reviewer,
        commentText: commentModal.text,
        commentTimestamp: new Date().toISOString(),
      } : r));
      closeCommentModal();
    } catch (e) {
      alert('Failed to save comment');
    }
  };

  // Delete report
  const deleteReport = async (id) => {
    if (!window.confirm('Delete this report?')) return;
    try {
      await import('firebase/firestore').then(({ doc, deleteDoc }) => deleteDoc(doc(db, 'fieldOfficerForms', id)));
      setHistory(h => h.filter(r => r.id !== id));
    } catch (e) {
      alert('Failed to delete');
    }
  };

  // Responsive, light theme, icons for actions
  return (
    <>
      <div className="form-container">
        <h2 style={{color:'#174ea6', fontWeight:800, marginBottom:16}}>Field Officer Report History</h2>
        <div className="section-card" style={{marginBottom:16, display:'flex', flexWrap:'wrap', gap:12, alignItems:'center'}}>
          <label>Officer:</label>
          <select value={officerFilter} onChange={e=>setOfficerFilter(e.target.value)} style={{minWidth:120}}>
            <option value="">All</option>
            {officerList.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <label>Date From:</label>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
          <label>Date To:</label>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} />
          <input type="text" placeholder="Search location, customer, phone..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:1, minWidth:180}} />
        </div>
        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div style={{color:'red'}}>{error}</div>
        ) : filtered.length === 0 ? (
          <div style={{color:'#888'}}>No reports available.</div>
        ) : (
          <table className="history-table" style={{width:'100%', borderCollapse:'collapse', fontSize:'1em', background:'#fff', borderRadius:8, overflow:'hidden'}}>
            <thead>
              <tr style={{background:'#f7fafd'}}>
                <th>Date</th>
                <th>Officer</th>
                <th>Latest Comment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <React.Fragment key={r.id}>
                  <tr style={{background: expandedId === r.id ? '#e3edfa' : undefined, cursor:'pointer'}} onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                    <td>{r.date || '-'}</td>
                    <td>{r.officerName || '-'}</td>
                    <td style={{fontSize:'0.98em'}}>
                      {r.commentedBy && r.commentText ? (
                        <span>
                          Commented by <b>{r.commentedBy}</b><br/>
                          <span style={{fontSize:'0.93em',color:'#555'}}>{r.commentTimestamp ? new Date(r.commentTimestamp).toLocaleString() : ''}</span>
                        </span>
                      ) : <span style={{color:'#aaa'}}>No comment</span>}
                    </td>
                    <td style={{display:'flex',gap:8,alignItems:'center'}}>
                      <button title="Download PDF" className="btn-glow" type="button" onClick={e => {e.stopPropagation(); exportRecordToPDF(r);}}>🧾</button>
                      <button title="View" className="btn-outline" type="button" onClick={e => {e.stopPropagation(); setExpandedId(expandedId === r.id ? null : r.id);}}>👁</button>
                      <button title="Edit" className="btn-outline" type="button" disabled>✏️</button>
                      <button title="Delete" className="btn-outline" type="button" onClick={e => {e.stopPropagation(); deleteReport(r.id);}}>🗑️</button>
                      <button title={r.commentedBy ? "Edit Comment" : "Add Comment"} className="btn-outline" type="button" onClick={e => {e.stopPropagation(); openCommentModal(r.id, r.commentedBy, r.commentText);}}>�</button>
                    </td>
                  </tr>
                  {expandedId === r.id && (
                    <tr>
                      <td colSpan={4} style={{background:'#f7fafd', padding:0}}>
                        <div className="section-card" style={{margin:0, border:'none', boxShadow:'none', padding:'16px 8px'}}>
                          <div style={{display:'flex', flexWrap:'wrap', gap:24}}>
                            <div style={{minWidth:220, flex:1}}>
                              <strong>Officer:</strong> {r.officerName || '-'}<br/>
                              <strong>Date:</strong> {r.date || '-'}<br/>
                              <strong>Working Type:</strong> {r.workingType || '-'}<br/>
                              <strong>KMs Travelled:</strong> {r.kms || '-'}<br/>
                              <strong>Entry By:</strong> {r.entryBy || '-'}<br/>
                              <strong>Reviewer:</strong> {r.reviewer || '-'}<br/>
                              <strong>Reviewer Comment:</strong> {r.reviewerComment || '-'}<br/>
                            </div>
                            <div style={{minWidth:220, flex:2}}>
                              <strong>Visited Locations:</strong>
                              <ul style={{margin:'4px 0 8px 16px'}}>
                                {(r.locations||[]).filter(Boolean).map((loc,i) => <li key={i}>{loc}</li>)}
                              </ul>
                              <strong>Customers:</strong>
                              <ul style={{margin:'4px 0 8px 16px'}}>
                                {(r.customers||[]).filter(c=>c.name).map((c,i) => (
                                  <li key={i}>
                                    <b>{c.name}</b> {c.phone ? `(${c.phone})` : ''} {c.type ? `- ${c.type}` : ''}<br/>
                                    {c.orders && c.orders.length > 0 && (
                                      <span>Orders: {c.orders.map((o,j) => `${o.packaging} x ${o.quantity}`).join(', ')}</span>
                                    )}<br/>
                                    {c.address && <span>Address: {c.address}<br/></span>}
                                    {c.remark && <span>Remark: {c.remark}<br/></span>}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div style={{minWidth:220, flex:1}}>
                              <strong>Notes:</strong><br/>
                              <span style={{whiteSpace:'pre-line'}}>{r.notes || '-'}</span><br/>
                              <strong>Remarks:</strong><br/>
                              <span style={{whiteSpace:'pre-line'}}>{r.remarks || '-'}</span><br/>
                              <strong>Expense Summary:</strong><br/>
                              <span>Food: ₹{r.expenses?.food ?? '-'}<br/>Fuel: ₹{r.expenses?.fuel ?? '-'}<br/>Total: ₹{r.expenses?.total ?? '-'}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
        {/* Comment Modal */}
        {commentModal.open && (
          <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'#0006',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div className="section-card" style={{background:'#fff',borderRadius:12,padding:24,minWidth:320,maxWidth:400,boxShadow:'0 2px 24px #2563eb33'}}>
              <h3 style={{marginTop:0,marginBottom:12}}>Add/Edit Comment</h3>
              <label>Reviewer:</label>
              <select value={commentModal.reviewer} onChange={e=>setCommentModal(m=>({...m,reviewer:e.target.value}))} style={{width:'100%',marginBottom:8}}>
                <option value="">Select Reviewer</option>
                {REVIEWERS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <label>Comment:</label>
              <textarea value={commentModal.text} onChange={e=>setCommentModal(m=>({...m,text:e.target.value}))} style={{width:'100%',minHeight:60,marginBottom:16}} />
              <div style={{display:'flex',gap:12,justifyContent:'flex-end'}}>
                <button className="btn-outline" type="button" onClick={closeCommentModal}>Cancel</button>
                <button className="btn-primary" type="button" onClick={saveComment}>Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
