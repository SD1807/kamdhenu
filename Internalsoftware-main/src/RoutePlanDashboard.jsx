import React, { useState } from 'react';
import Navbar from './Navbar';

// Mock data for demonstration
const mockDates = [
  { date: '2025-07-23', completed: true },
  { date: '2025-07-24', completed: false },
  { date: '2025-07-25', completed: false },
];
const mockVillageData = [
  { village: 'Rampur', contact: 'Amit', codes: 'XYZ', return: 'Yes', cash: '₹500' },
  { village: 'Lakshmi Nagar', contact: 'Priya', codes: 'XYZ', return: 'No', cash: '₹300' },
  { village: 'Shivpuri', contact: 'Rahul', codes: 'XYZ', return: 'Yes', cash: '₹200' },
];
const typeOptions = ['Type A', 'Type B', 'Type C'];

export default function RoutePlanDashboard() {
  const [expanded, setExpanded] = useState(null);
  const [order, setOrder] = useState('');
  const [agency, setAgency] = useState('');
  const [cashUpdate, setCashUpdate] = useState('');
  const [type, setType] = useState(typeOptions[0]);
  const [summary, setSummary] = useState({ col1: 'XYZ', col2: 'XYZ', col3: 'XYZ', col4: 'XYZ', col5: 'XYZ' });

  const handleView = (date) => {
    setExpanded(expanded === date ? null : date);
  };
  const handleSave = () => {
    // Save logic here (mock)
    alert('Saved!');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="sticky top-0 z-10 bg-white shadow">
        <h1 className="text-3xl font-bold text-center py-4 text-blue-900">Route Plan</h1>
      </div>
      <div className="max-w-3xl mx-auto p-4">
        {/* Date Selection Cards */}
        <div className="flex flex-wrap gap-4 justify-center mb-6">
          {mockDates.map(({ date, completed }) => (
            <div key={date} className={`flex flex-col items-center border rounded-lg shadow px-6 py-3 bg-white w-44 ${expanded === date ? 'ring-2 ring-blue-400' : ''}`}>
              <span className="text-lg font-semibold mb-2">{date.split('-').reverse().join('-')}</span>
              <span className={`text-2xl mb-2 ${completed ? 'text-green-600' : 'text-gray-400'}`}>{completed ? '✔' : '—'}</span>
              <button
                className="w-full bg-blue-600 text-white rounded py-1 font-semibold hover:bg-blue-700 transition"
                onClick={() => handleView(date)}
              >
                {expanded === date ? 'Hide' : 'View'}
              </button>
            </div>
          ))}
        </div>
        {/* Expanded Section */}
        {expanded && (
          <div className="bg-white rounded-xl shadow p-6 border border-gray-200 mb-6 animate-fade-in">
            <h2 className="text-xl font-bold text-blue-800 mb-4 text-center">Route Details for {expanded.split('-').reverse().join('-')}</h2>
            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 mb-4">
                <thead>
                  <tr className="bg-blue-50">
                    <th className="px-3 py-2 border text-blue-900">Village</th>
                    <th className="px-3 py-2 border text-blue-900">Contact</th>
                    <th className="px-3 py-2 border text-blue-900">Codes</th>
                    <th className="px-3 py-2 border text-blue-900">Return</th>
                    <th className="px-3 py-2 border text-blue-900">Cash</th>
                  </tr>
                </thead>
                <tbody>
                  {mockVillageData.map((row, i) => (
                    <tr key={i} className="hover:bg-blue-50">
                      <td className="px-3 py-2 border">{row.village}</td>
                      <td className="px-3 py-2 border">{row.contact}</td>
                      <td className="px-3 py-2 border">{row.codes}</td>
                      <td className="px-3 py-2 border">{row.return}</td>
                      <td className="px-3 py-2 border">{row.cash}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Order Input Section */}
            <div className="flex flex-wrap gap-4 mb-4">
              <input
                className="flex-1 min-w-[120px] border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Order"
                value={order}
                onChange={e => setOrder(e.target.value)}
              />
              <input
                className="flex-1 min-w-[120px] border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Agency"
                value={agency}
                onChange={e => setAgency(e.target.value)}
              />
              <input
                className="flex-1 min-w-[120px] border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Cash Update"
                value={cashUpdate}
                onChange={e => setCashUpdate(e.target.value)}
              />
              <select
                className="flex-1 min-w-[120px] border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 hover:bg-blue-50"
                value={type}
                onChange={e => setType(e.target.value)}
              >
                {typeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <button
                className="bg-blue-600 text-white rounded px-6 py-2 font-semibold hover:bg-blue-700 transition shadow"
                onClick={handleSave}
              >
                Save
              </button>
            </div>
            {/* Summary Section */}
            <div className="grid grid-cols-5 gap-4 bg-blue-50 rounded-lg p-4 mt-4 text-center font-semibold text-blue-900 shadow-inner">
              <div>{summary.col1}</div>
              <div>{summary.col2}</div>
              <div>{summary.col3}</div>
              <div>{summary.col4}</div>
              <div>{summary.col5}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
