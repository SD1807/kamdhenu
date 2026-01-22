import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "./Navbar";
import "./form.css";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "./firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function Home() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        console.log("Auth UID:", currentUser.uid);
        console.log("Auth Email:", currentUser.email);

        try {
          // Query Firestore by email because doc ID is random
          const q = query(
            collection(db, "users"),
            where("email", "==", currentUser.email)
          );
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            querySnapshot.forEach((doc) => {
              console.log("Firestore Data:", doc.data());
              setProfile(doc.data());
            });
          } else {
            console.log("No user found with this email in Firestore");
          }
        } catch (err) {
          console.error("Firestore error:", err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <>
      <Navbar />
      <div
        className="form-container"
        style={{ maxWidth: 480, marginTop: 40, textAlign: "center" }}
      >
        {user && (
          <h2
            style={{
              color: "#2c3e50",
              fontWeight: 700,
              marginBottom: 20,
              fontSize: "1.6rem",
            }}
          >
            Hello {profile?.username || user.displayName || user.email}, 🚀<br />
            Let’s get going!
          </h2>
        )}

        <h1
          style={{
            color: "#1976d2",
            fontWeight: 900,
            fontSize: "2.1rem",
            marginBottom: 8,
            letterSpacing: "0.04em",
          }}
        >
          FSC DAILY DATA PORTAL
        </h1>
        <p
          style={{
            color: "#7b8ca6",
            fontWeight: 500,
            marginBottom: 32,
            fontSize: "1.08em",
          }}
        >
          Welcome! Choose an action below to get started.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            marginBottom: 32,
          }}
        >
          <Link
            to="/form"
            className="btn-primary"
            style={{ fontSize: "1.1em", padding: "16px 0" }}
          >
            📝 Fill Daily Form
          </Link>
          <Link
            to="/demo-sales-list"
            className="btn-outline"
            style={{ fontSize: "1.1em", padding: "16px 0" }}
          >
            🧾 Demo Sales List
          </Link>
          <Link
            to="/demo-history"
            className="btn-outline"
            style={{ fontSize: "1.1em", padding: "16px 0" }}
          >
            📊 Demo Sales History
          </Link>
          <Link
            to="/MoM-generator"
            className="btn-outline"
            style={{ fontSize: "1.1em", padding: "16px 0" }}
          >
            📝 Generate MoM
          </Link>
          <Link
            to="/member-page"
            className="btn-outline"
            style={{ fontSize: "1.1em", padding: "16px 0" }}
          >
            Member Demo Entry
          </Link>
          <Link
            to="/history"
            className="btn-outline"
            style={{ fontSize: "1.1em", padding: "16px 0" }}
          >
            📜 View Submission History
          </Link>
        </div>

        <div
          className="section-card"
          style={{
            background: "#f7fafd",
            margin: "0 auto",
            marginBottom: 0,
            padding: 18,
          }}
        >
          <h3
            style={{
              color: "#2563eb",
              fontWeight: 700,
              margin: 0,
              marginBottom: 8,
              fontSize: "1.08em",
            }}
          >
            Dashboard (Coming Soon)
          </h3>
          <ul
            style={{
              color: "#7b8ca6",
              fontWeight: 500,
              fontSize: "1em",
              margin: 0,
              padding: 0,
              listStyle: "none",
            }}
          >
            <li>• Quick stats and analytics will appear here.</li>
            <li>• Recent submissions, expense totals, and more.</li>
          </ul>
        </div>

        <footer className="footer-credit" style={{ marginTop: 32 }}>
          <small>Powered by Parul Chemicals • FS CALCIVAL</small>
        </footer>
      </div>
    </>
  );
}
