import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";
import "./form.css";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function RouteViewer() {
  const [summary, setSummary] = useState({ totalRoutes: 0, totalPayment: 0, paymentTarget: 0, totalOrders: 0 });
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    const fetchRoutes = async () => {
      const snapshot = await getDocs(collection(db, "routePlans"));
      const data = snapshot.docs.map(doc => doc.data());

      const dateList = [...new Set(data.map(d => d.date))];
      setDates(dateList);

      let totalRoutes = data.length;
      let totalPayment = 0;
      let paymentTarget = 0;
      let totalOrders = 0;

      data.forEach(plan => {
        if (plan.routes) {
          plan.routes.forEach(route => {
            paymentTarget += Number(route.paymentTarget || 0);
            totalPayment += Number(route.paymentCollected || 0);
            if (route.actualStock) {
              route.actualStock.forEach(stock => {
                totalOrders += Number(stock.qty || 0);
              });
            }
          });
        }
      });

      setSummary({ totalRoutes, totalPayment, paymentTarget, totalOrders });
    };

    fetchRoutes();
  }, []);

  const paymentChartData = {
    labels: ["Collected", "Pending"],
    datasets: [
      {
        data: [summary.totalPayment, summary.paymentTarget - summary.totalPayment],
        backgroundColor: ["#4CAF50", "#FF9800"],
      }
    ]
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    console.log("Selected date:", e.target.value);
    // Later: fetch filtered villages for that date
  };

  return (
    <div className="route-dashboard">
      <div className="dashboard-card">
        <h2>Route Summary</h2>
        
        <div className="date-select">
          <label>Select Date:</label>
          <select value={selectedDate} onChange={handleDateChange}>
            <option value="">--Choose--</option>
            {dates.map((date, index) => (
              <option key={index} value={date}>{date}</option>
            ))}
          </select>
        </div>

        <div className="card-content">
          <div className="chart-container">
            <Pie data={paymentChartData} />
          </div>
          <div className="stats">
            <p><strong>Routes:</strong> {summary.totalRoutes}</p>
            <p><strong>Collected:</strong> ₹{summary.totalPayment}</p>
            <p><strong>Target:</strong> ₹{summary.paymentTarget}</p>
            <p><strong>Orders:</strong> {summary.totalOrders}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
