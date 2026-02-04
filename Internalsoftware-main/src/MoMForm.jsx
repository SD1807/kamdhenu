import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import { db } from "./firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import Navbar from "./Navbar";


const participantsList = ["JASH ILASARIYA", "SONAL MADAM", "BHAVIN PRAJAPATI", "MAULIC SHAH", "JIGAR SHAH", "SHUBHAM", "MISTRY SIR", "JYOTIKA", "BHAVISHA", "PARUL BEN", "MALA BEN", "PRIYANKA BEN ", "OMKAR SIR", "SANKET SIR", "ALPESH SIR"];

const MoMForm = () => {
  const [date, setDate] = useState("");
  const [location, setLocation] = useState({ lat: "", lng: "" });
  const [participants, setParticipants] = useState([]);
  const [manualParticipant, setManualParticipant] = useState("");
  const [points, setPoints] = useState([]);
  const [currentPoint, setCurrentPoint] = useState("");
  const [summary, setSummary] = useState(null);
//const [participants, setParticipants] = useState([]);

const handleParticipantChange = (selectedOptions) => {
  setParticipants(selectedOptions.map(option => option.value));
};

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
    setDate(new Date().toISOString().split("T")[0]);
  }, []);

  const handleAddPoint = () => {
    if (currentPoint.trim()) {
      setPoints([...points, currentPoint.trim()]);
      setCurrentPoint("");
    }
  };

  const generateSummary = () => {
    const discussion = points.map((pt, i) => `${i + 1}. ${pt}`).join("\n");
    const actions = points
      .filter((pt) => pt.toLowerCase().includes("action") || pt.toLowerCase().includes("to do"))
      .map((pt) => `- ${pt}`)
      .join("\n");

    setSummary({ discussion, actions });
  };

  const saveToFirestore = async () => {
    const payload = {
      date,
      location,
      participants,
      manualParticipant,
      points,
      summary,
      timestamp: Timestamp.now()
    };
    await addDoc(collection(db, "demo_moms"), payload);
    alert("MoM Saved to Firestore");
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Minutes of Meeting", 20, 20);
    doc.setFontSize(10);
    doc.text(`Date: ${date}`, 20, 30);
    doc.text(`Location: ${location.lat}, ${location.lng}`, 20, 36);
    doc.text(`Participants: ${[...participants, manualParticipant].filter(Boolean).join(", ")}`, 20, 42);
    doc.text("Discussion Summary:", 20, 52);
    doc.text(summary?.discussion || "", 20, 58);
    doc.text("Action Items:", 20, 90);
    doc.text(summary?.actions || "None", 20, 96);
    doc.save("MoM.pdf");
  };

  return (
    <> 
    <Navbar />


    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Minutes of Meeting</h2>
      <label>Date: <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border p-1 ml-2" /></label>
      <div className="my-2">
        <label>Location: {location.lat && `${location.lat}, ${location.lng}`}</label>
      </div>
        <div className="my-2">
        <label>Participants:</label>

       <select multiple value={participants} onChange={handleParticipantChange} className="border p-2 w-full mt-1">
          {participantsList.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <input
          type="text"
          value={manualParticipant}
          placeholder="Add manual participant"
          onChange={(e) => setManualParticipant(e.target.value)}
          className="border p-1 mt-2 w-full"
        />
      </div>
      <div className="my-2">
        <label>Add Point:</label>
        <textarea
          value={currentPoint}
          onChange={(e) => setCurrentPoint(e.target.value)}
          className="border w-full p-2"
        ></textarea>
        <button onClick={handleAddPoint} className="bg-green-500 text-white px-4 py-1 mt-2">Add</button>
      </div>
      <div className="my-2">
        <h4 className="font-semibold">All Points:</h4>
        <ul className="list-disc ml-6">
          {points.map((pt, i) => (<li key={i}>{pt}</li>))}
        </ul>
      </div>
      <div className="my-4">
        <button onClick={generateSummary} className="bg-blue-500 text-white px-4 py-1 mr-2">Generate Summary</button>
        <button onClick={saveToFirestore} className="bg-purple-600 text-white px-4 py-1 mr-2">Save</button>
        <button onClick={generatePDF} className="bg-red-600 text-white px-4 py-1">PDF</button>
      </div>
      {summary && (
        <div className="mt-4">
          <h4 className="font-semibold">Summary Preview:</h4>
          <p className="whitespace-pre-line text-sm mt-2">{summary.discussion}</p>
          <h4 className="font-semibold mt-2">Action Items:</h4>
          <p className="whitespace-pre-line text-sm">{summary.actions}</p>
        </div>
        
      )}
    </div>




    </>
  );
};

export default MoMForm;
