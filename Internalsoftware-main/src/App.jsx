import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './Home';
import FieldOfficerForm from './FieldOfficerForm';
import DemoSalesList from './DemoSalesList';
import DeleteRecords from './DeleteRecords';
import UnifiedHistory from './UnifiedHistory';
import RoutePlanner from './RoutePlanner';
import Login from "./login.jsx";
import MoMForm from './MoMForm.jsx';
import ViewRoute from './ViewRoute.jsx';
import RequireAuth from './RequireAuth';
import MemberPage from './MemberPage';
import './form.css';

// ✅ import ToastContainer once at the top level
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/member-page" element={<MemberPage />} />
        <Route path="/" element={
          <RequireAuth>
            <Home />
          </RequireAuth>
        } />

        <Route path="/form" element={
          <RequireAuth>
            <FieldOfficerForm />
          </RequireAuth>
        } />
        <Route path="/history" element={
          <RequireAuth>
            <UnifiedHistory />
          </RequireAuth>
        } />

        <Route path="/mom-generator" element={<MoMForm />} />

        <Route path="/demo-sales-list" element={
          <RequireAuth>
            <DemoSalesList />
          </RequireAuth>
        } />
        <Route path="/delete" element={
          <RequireAuth>
            <DeleteRecords />
          </RequireAuth>
        } />
        <Route path="/route-planner" element={
          <RequireAuth>
            <RoutePlanner />
          </RequireAuth>
        } />
        <Route path="/view-route" element={
          <RequireAuth>
            <ViewRoute />
          </RequireAuth>
        } />
        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>

      {/* ✅ Toast container at the root so it works everywhere */}
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
}
