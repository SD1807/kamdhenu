
import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";
import Navbar from './Navbar';
import logo from './assets/logo.png';
import { Link } from "react-router-dom";
import { getFirestore } from "firebase/firestore";

export default function DeleteRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState("");
  const [error, setError] = useState("");
  const [officerFilter, setOfficerFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  useEffect(() => {
    async function fetchRecords() {
      setLoading(true);
      try {
        const q = query(collection(db, "fieldOfficerForms"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const data = [];
        querySnapshot.forEach((docSnap) => {
          data.push({ ...docSnap.data(), id: docSnap.id });
        });
        setRecords(data);
      } catch (err) {
        setError("Error loading records: " + err.message);
      }
      setLoading(false);
    }
    fetchRecords();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    setDeleting(id);
    try {
      await deleteDoc(doc(db, "fieldOfficerForms", id));
      setRecords(records.filter(r => r.id !== id));
    } catch (err) {
      setError("Error deleting record: " + err.message);
    }
    setDeleting("");
  };

  const show = v => (v && v.trim && v.trim() !== "" ? v : "—");

  // Get unique officer names for filter dropdown
  const officerNames = Array.from(new Set(records.map(r => r.officerName).filter(Boolean))).sort();

  // Filter records by officer and month
  const filteredRecords = records.filter(rec => {
    let officerMatch = true;
    let monthMatch = true;
    if (officerFilter) officerMatch = rec.officerName === officerFilter;
    if (monthFilter && rec.createdAt) {
      // rec.createdAt can be a string or Timestamp
      let dateObj = rec.createdAt;
      if (typeof dateObj === 'string') dateObj = new Date(dateObj);
      else if (dateObj && dateObj.toDate) dateObj = dateObj.toDate();
      if (dateObj instanceof Date && !isNaN(dateObj)) {
        const ym = dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0');
        monthMatch = ym === monthFilter;
      }
    }
    return officerMatch && monthMatch;
  });

  // For month filter dropdown, get all months present in data
  const allMonths = Array.from(new Set(records.map(rec => {
    let dateObj = rec.createdAt;
    if (typeof dateObj === 'string') dateObj = new Date(dateObj);
    else if (dateObj && dateObj.toDate) dateObj = dateObj.toDate();
    if (dateObj instanceof Date && !isNaN(dateObj)) {
      return dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0');
    }
    return null;
  }).filter(Boolean))).sort().reverse();

  return (
    <div>
      <Navbar />
      <div className="form-container">
        {/* Filter controls */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 500 }}>
            Field Officer:
            <select value={officerFilter} onChange={e => setOfficerFilter(e.target.value)} style={{ marginLeft: 8, minWidth: 160 }}>
              <option value="">All</option>
              {officerNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
          <label style={{ fontWeight: 500 }}>
            Month:
            <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} style={{ marginLeft: 8, minWidth: 120 }}>
              <option value="">All</option>
              {allMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>
          <span style={{ color: '#7b8ca6', fontSize: 13 }}>
            Showing {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="section-card" style={{ marginBottom: 28, background: '#ffeaea', color: '#b91c1c', fontWeight: 700, fontSize: '1.08em', textAlign: 'center', letterSpacing: '0.03em', border: 0 }}>
          Delete Records
        </div>
        {error && <div style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</div>}
        {loading ? (
          <div className="section-card" style={{ textAlign: "center", color: "#7b8ca6" }}>Loading...</div>
        ) : filteredRecords.length === 0 ? (
          <div className="section-card" style={{ textAlign: "center", color: "#7b8ca6" }}>
            No records found.
          </div>
        ) : (
          <div className="section-card" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
              <thead style={{ background: '#f6f8fa' }}>
                <tr>
                  <th style={{ padding: 8, borderBottom: '1px solid #e3e8ee' }}>Officer</th>
                  <th style={{ padding: 8, borderBottom: '1px solid #e3e8ee' }}>Date</th>
                  <th style={{ padding: 8, borderBottom: '1px solid #e3e8ee' }}>Type</th>
                  <th style={{ padding: 8, borderBottom: '1px solid #e3e8ee' }}>KMs</th>
                  <th style={{ padding: 8, borderBottom: '1px solid #e3e8ee' }}>Entry By</th>
                  <th style={{ padding: 8, borderBottom: '1px solid #e3e8ee' }}>Delete</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((rec) => (
                  <tr key={rec.id}>
                    <td>{show(rec.officerName)}</td>
                    <td>{show(rec.date)}</td>
                    <td>{show(rec.workingType)}</td>
                    <td>{show(rec.kms)}</td>
                    <td>{show(rec.entryBy)}</td>
                    <td>
                      <button className="btn-outline" style={{ color: '#b91c1c', borderColor: '#fca5a5' }} onClick={() => handleDelete(rec.id)} disabled={deleting === rec.id}>
                        {deleting === rec.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
