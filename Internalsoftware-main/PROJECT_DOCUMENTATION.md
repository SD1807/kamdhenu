# FSC Daily Data Portal - Complete Project Documentation

**Version:** 1.0  
**Last Updated:** January 2026  
**Project Type:** React + Firebase Web Application  
**Purpose:** Internal field officer data management, demo sales tracking, and stock management system

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [System Architecture & Data Flow](#system-architecture--data-flow)
5. [Feature Overview](#feature-overview)
6. [Database Schema](#database-schema)
7. [Component Documentation](#component-documentation)
8. [Setup & Installation](#setup--installation)
9. [Key Workflows](#key-workflows)
10. [Environment & Configuration](#environment--configuration)
11. [Development Guidelines](#development-guidelines)
12. [Common Tasks for Interns](#common-tasks-for-interns)

---

## Project Overview

**FSC Daily Data Portal** is a comprehensive data management platform designed for field sales operations, specifically tailored for dairy/agricultural business management. The system enables:

- **Field officers** to submit daily activity reports
- **Demo managers** to track demo sales and customer orders
- **Inventory teams** to manage stock movements and maintain dairy stock levels
- **Route planners** to optimize delivery routes
- **Minutes of Meeting (MoM)** generation for team meetings

**Key Users:**
- Field Officers (data entry)
- Sales Managers (demo sales tracking)
- Inventory/Stock Managers
- Route Planners
- Senior Management (reporting & analytics)

---

## Tech Stack

### Frontend
- **React 19.1.0** - UI framework
- **React Router 7.8.2** - Client-side routing
- **Vite 7.0.4** - Build tool & dev server
- **TailwindCSS / Custom CSS** - Styling

### Backend & Database
- **Firebase** (Firestore, Auth, Storage)
  - Firestore: Real-time NoSQL database
  - Firebase Auth: User authentication
  - Cloud Storage: File uploads (PDFs, Excel exports)

### Libraries & Utilities
- **jsPDF + jsPDF-AutoTable** - PDF generation with Gujarati font support
- **ExcelJS** - Excel file generation/parsing
- **Chart.js + React-ChartJS-2** - Data visualization
- **React-Toastify** - Toast notifications
- **OpenAI API** - AI features (if implemented)
- **File-Saver** - Client-side file downloads

### Development Tools
- **ESLint** - Code linting
- **Vite + React Plugin** - Fast development experience

---

## Project Structure

```
internalsoftware-main/
├── src/
│   ├── assets/                    # Static assets (logo, images)
│   ├── components/                # Reusable React components
│   │   └── stock/                 # Stock management sub-components
│   │       ├── BreakdownTable.jsx
│   │       ├── StockDashboardRefactored.jsx
│   │       ├── StockEntryTable.jsx
│   │       ├── StockForm.jsx
│   │       ├── StockManagementRefactored.jsx
│   │       ├── SummaryCards.jsx
│   │       └── VillageSelector.jsx
│   ├── hooks/                     # Custom React hooks
│   │   └── useStockData.js       # Stock data fetching hook
│   ├── services/                  # Business logic & API calls
│   │   └── stockService.js       # Stock management services
│   ├── fonts/                     # Custom fonts (Gujarati support)
│   │   └── NotoSansGujarati-Regular.js
│   ├── App.jsx                    # Root component & routing
│   ├── main.jsx                   # React entry point
│   ├── firebase.js                # Firebase configuration
│   ├── form.css                   # Global styles
│   │
│   ├── Pages (Full Page Components):
│   ├── Home.jsx                   # Dashboard landing page
│   ├── login.jsx                  # Authentication page
│   ├── FieldOfficerForm.jsx       # Daily activity report form
│   ├── DemoSalesList.jsx          # Demo sales & customer tracking
│   ├── DeleteRecords.jsx          # Record management & deletion
│   ├── UnifiedHistory.jsx         # Historical data viewer
│   ├── RoutePlanner.jsx           # Route planning & optimization
│   ├── RoutePlanDashboard.jsx     # Route plan dashboard
│   ├── ViewRoute.jsx              # View saved routes
│   ├── StockDashboard.jsx         # Stock analytics dashboard
│   ├── StockManagement.jsx        # Stock entry & management
│   ├── MemberPage.jsx             # User profile management
│   ├── MemberPage_new.jsx         # Updated member page
│   ├── MoMForm.jsx                # Minutes of meeting generator
│   ├── RequireAuth.jsx            # Auth protection wrapper
│   │
│   ├── Utilities:
│   ├── Navbar.jsx                 # Navigation component
│   ├── pdfUtils.js                # PDF generation utilities
│   ├── pdfUtilsFieldOfficer.js    # FO-specific PDF utilities
│   ├── userExcelSearch.js         # Excel search functionality
│   │
│   └── Backup Files (ignore):
│       ├── DemoSalesList.jsx.backup
│       ├── DemoSalesList.jsx.bak
│       └── DemoSalesList.jsx.old
│
├── index.html                     # HTML entry point
├── vite.config.js                 # Vite configuration
├── eslint.config.js               # ESLint rules
├── jsconfig.json                  # JavaScript config
├── package.json                   # Dependencies & scripts
├── vercel.json                    # Vercel deployment config
├── STOCK_FEATURE_DOCUMENTATION.md # Stock feature detailed docs
└── PROJECT_DOCUMENTATION.md       # This file
```

---

## System Architecture & Data Flow

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER INTERFACE (React)                       │
│  (Login → Home → Feature Pages → Data Management)                │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
    ┌─────────┐   ┌─────────────┐  ┌──────────┐
    │ Firebase│   │ Firebase    │  │  Cloud   │
    │ Auth    │   │ Firestore   │  │ Storage  │
    │(Login)  │   │ (Database)  │  │ (Files)  │
    └─────────┘   └─────────────┘  └──────────┘
```

### Data Flow Diagram

```
Field Officer
      │
      ▼
┌──────────────────────┐
│ FieldOfficerForm.jsx │  ─→ Validates & uploads to Firestore
│ (Daily Activity)     │     + Generates PDF
└──────────────────────┘
      │
      └──────→ Firebase Collection: "demosales"
               └──→ Subcollection: "customers"

Demo Manager
      │
      ▼
┌──────────────────────┐
│ DemoSalesList.jsx    │  ─→ Tracks demo locations
│ (Sales Entry)        │     Manages customer orders
└──────────────────────┘     Calculates stock movement
      │
      └──────→ Firebase Collection: "demosales"
               └──→ Subcollection: "customers"

Stock Manager
      │
      ▼
┌──────────────────────┐
│ StockManagement.jsx  │  ─→ Records stock entries
│ (Stock Entry)        │     (Taken to demo / At dairy)
└──────────────────────┘
      │
      └──────→ Firebase Collection: "stock"

      ▼
┌──────────────────────┐
│ StockDashboard.jsx   │  ─→ Real-time analytics
│ (Analytics)          │     Remaining stock calculation
└──────────────────────┘     Formula: Remaining = Demo - Sold - Dairy
      │
      └──────→ Reads from:
               - "stock" collection
               - "demosales" → "customers"

Route Planner
      │
      ▼
┌──────────────────────┐
│ RoutePlanner.jsx     │  ─→ Creates delivery routes
│ (Route Planning)     │     Import/Export Excel
└──────────────────────┘
      │
      └──────→ Firebase Collection: "routePlans"
```

### User Authentication Flow

```
┌──────────┐
│ login.jsx│  ─→  signInWithEmailAndPassword()
└──────┬───┘
       │ (Success)
       ▼
┌──────────────────────┐
│ RequireAuth wrapper  │  ─→  Protects all routes
└──────┬───────────────┘
       │
       ▼
   ┌────────┐
   │  Home  │  ─→ Access all features
   └────────┘
       │
       └──→ user.email stored in Firestore "users" collection
```

---

## Feature Overview

### 1. **Authentication & User Management**

**Location:** `login.jsx`, `RequireAuth.jsx`, `Home.jsx`

**What it does:**
- Email/password login using Firebase Auth
- Route protection (unauthenticated users redirected to login)
- User profile loading from "users" collection
- Logout functionality with confirmation

**Key Files:**
- `login.jsx` - Login form & submission
- `RequireAuth.jsx` - Protected route wrapper
- `firebase.js` - Firebase initialization

**How to extend:**
- Add sign-up functionality
- Implement role-based access control (RBAC)
- Add password reset feature

---

### 2. **Field Officer Daily Report**

**Location:** `FieldOfficerForm.jsx`

**Features:**
- Officer selection (with predefined list)
- Daily activity tracking:
  - Work hours (punch in/out with break time)
  - Distance traveled (KMs)
  - Locations visited
  - Customer interactions
  - Orders taken
- PDF generation with Gujarati font support
- Firestore data storage

**Data Structure:**
```
Form Fields:
- Officer Name (dropdown)
- Date
- Work Hours (calculated from punch in/out)
- Break Time (optional)
- KMs traveled
- Remarks
- Locations visited
- Customer details & orders
- Entry reviewer info
```

**PDF Export:**
- Includes all form data in formatted table
- Supports Gujarati text
- Font: NotoSansGujarati

**Key Functions:**
- `calculateHours()` - Computes work duration minus breaks
- `exportToPDF()` - Generates PDF with custom formatting
- Form validation before submission

---

### 3. **Demo Sales Management**

**Location:** `DemoSalesList.jsx` (3000+ lines - largest component)

**Features:**
- **Demo Entry Creation:**
  - Location (village) selection
  - Team members assignment
  - Date tracking
  - GPS coordinates (latitude/longitude)
  - Total milk produced/collected

- **Customer Management:**
  - Customer name, code, mobile
  - Order packaging selection
  - Quantity tracking
  - Special offers/schemes
  - Remarks

- **Stock Tracking:**
  - Stock taken to demo (which packaging types)
  - Stock remaining after sales
  - Auto-calculation of unsold stock

- **Export Functions:**
  - Excel export with multiple sheets
  - PDF generation with tabular format
  - Data persistence in Firestore

**Database Collections:**
```
demosales/
├── {demoId}/
│   ├── demoInfo (document)
│   │   ├── date
│   │   ├── village
│   │   ├── taluka
│   │   ├── latitude
│   │   ├── longitude
│   │   └── ...
│   └── customers/ (subcollection)
│       ├── {customerId}
│       │   ├── name
│       │   ├── mobile
│       │   ├── orderPackaging
│       │   ├── orderQty
│       │   └── ...
```

**Packaging Options:**
```
1LTR JAR: ₹145
2LTR JAR: ₹275
5LTR PLASTIC JAR: ₹665
5LTR STEEL બરણી: ₹890
10 LTR JAR: ₹1,340
10 LTR STEEL બરણી: ₹1,770
20 LTR CARBO: ₹2,550
20 LTR CANL: ₹3,250
20 LTR STEEL બરણી: ₹3,520
```

---

### 4. **Stock Management System**

**Location:** `StockManagement.jsx`, `StockDashboard.jsx`, `src/components/stock/`

**Key Components:**
- `StockManagement.jsx` - Add/delete stock entries
- `StockDashboard.jsx` - Real-time analytics & visualization
- `StockForm.jsx` - Stock entry form component
- `VillageSelector.jsx` - Village dropdown selector
- `BreakdownTable.jsx` - Detailed stock table
- `SummaryCards.jsx` - KPI display cards

**Features:**

1. **Stock Entry:**
   - Select village
   - Choose packaging type
   - Input quantity
   - Location type (demo or dairy)
   - Date tracking
   - Optional notes

2. **Dashboard Analytics:**
   - Real-time stock visualization
   - Summary cards (4 metrics):
     - Stock Taken to Demo
     - Stock Sold (from demosales)
     - Stock at Dairy
     - Stock Remaining (calculated)
   - Breakdown table by packaging type
   - Color-coded alerts (red for oversold)

3. **Stock Formula:**
   ```
   Remaining Stock = Stock Taken to Demo - Stock Sold - Stock at Dairy
   ```

**Database Collection:**
```
stock/
├── {entryId}
│   ├── villageId
│   ├── villageName
│   ├── packaging (type)
│   ├── quantity
│   ├── location ("demo" or "dairy")
│   ├── date (YYYY-MM-DD)
│   ├── notes
│   ├── entryBy (user email)
│   └── createdAt (timestamp)
```

**Custom Hook:**
- `useStockData.js` - Fetches aggregated stock for selected village

**Service Layer:**
- `stockService.js` - Centralized stock operations:
  - `addStockEntry()`
  - `deleteStockEntry()`
  - `calculateRemaining()`

---

### 5. **Route Planning**

**Location:** `RoutePlanner.jsx`, `ViewRoute.jsx`, `RoutePlanDashboard.jsx`

**Features:**
- Create routes for specific dates
- Add locations with:
  - Order details (packaging & quantity)
  - Returns tracking
  - Payment information
  - Contact person
- Mark routes as completed/verified
- Excel import/export functionality
- Firebase persistence

**Workflow:**
```
1. Select date
2. Add locations to route
3. For each location:
   - Set delivery address
   - Add orders (packaging + qty)
   - Record returns
   - Note payment status
   - Add contact & remarks
4. Mark as completed when visited
5. Verify payment
6. Save to Firebase / Export to Excel
```

---

### 6. **Minutes of Meeting (MoM)**

**Location:** `MoMForm.jsx`

**Features:**
- Auto-capture GPS location
- Date selection
- Participant selection (predefined + custom)
- Discussion points entry
- Auto-summary generation
- PDF export
- Firestore storage

**Participants List:**
```
JASH ILASARIYA, SONAL MADAM, BHAVIN PRAJAPATI, MAULIC SHAH,
JIGAR SHAH, SHUBHAM, MISTRY SIR, JYOTIKA, BHAVISHA, PARUL BEN,
MALA BEN, PRIYANKA BEN, OMKAR SIR, SANKET SIR, ALPESH SIR
```

**Database Collection:**
```
demo_moms/
├── {momId}
│   ├── date
│   ├── location (lat/lng)
│   ├── participants (array)
│   ├── points (discussion points array)
│   └── summary
│       ├── discussion
│       └── actions
```

---

### 7. **Historical Data & Analytics**

**Location:** `UnifiedHistory.jsx`

**Features:**
- View all historical records
- Filter/search capabilities
- Export historical data
- Track changes over time

---

### 8. **Data Management & Cleanup**

**Location:** `DeleteRecords.jsx`

**Features:**
- Bulk delete records
- Search & filter records
- Confirmation before deletion
- Audit trail (deleted by whom)

---

## Database Schema

### Firebase Collections Overview

```
Firestore Database Structure:
├── users/
│   ├── {autoId}
│   │   ├── email (indexed)
│   │   ├── username
│   │   ├── role
│   │   └── createdAt
│
├── demosales/
│   ├── {demoId}
│   │   ├── date
│   │   ├── village
│   │   ├── taluka
│   │   ├── latitude
│   │   ├── longitude
│   │   ├── totalMilk
│   │   ├── activeSabhasad
│   │   ├── teamMembers
│   │   ├── demoRemarks
│   │   ├── entryBy
│   │   └── customers/ (subcollection)
│   │       ├── {customerId}
│   │       │   ├── name
│   │       │   ├── code
│   │       │   ├── mobile
│   │       │   ├── remarks
│   │       │   ├── orderPackaging
│   │       │   ├── orderQty
│   │       │   ├── schemeKey
│   │       │   └── manualOffer
│
├── stock/
│   ├── {entryId}
│   │   ├── villageId
│   │   ├── villageName
│   │   ├── packaging
│   │   ├── quantity
│   │   ├── location ("demo" or "dairy")
│   │   ├── date
│   │   ├── notes
│   │   ├── entryBy
│   │   └── createdAt
│
├── routePlans/
│   ├── {routeId}
│   │   ├── date
│   │   ├── routes (array)
│   │   │   ├── location
│   │   │   ├── orders (array)
│   │   │   ├── returns (array)
│   │   │   ├── payment
│   │   │   ├── contact
│   │   │   ├── completed (boolean)
│   │   │   └── verified (boolean)
│   │   └── createdAt
│
├── demo_moms/
│   ├── {momId}
│   │   ├── date
│   │   ├── location (lat/lng)
│   │   ├── participants (array)
│   │   ├── points (array)
│   │   ├── summary
│   │   └── timestamp
│
└── villages/
    ├── {villageId}
    │   ├── name
    │   ├── taluka
    │   └── metadata
```

---

## Component Documentation

### Page Components (Full Pages)

| Component | Route | Purpose | Auth Required |
|-----------|-------|---------|----------------|
| `Home.jsx` | `/` | Dashboard & feature selection | ✅ Yes |
| `login.jsx` | `/login` | User authentication | ❌ No |
| `FieldOfficerForm.jsx` | `/form` | Daily activity report | ✅ Yes |
| `DemoSalesList.jsx` | `/demo-sales-list` | Demo sales tracking | ✅ Yes |
| `StockManagement.jsx` | `/stock-management` | Stock entry | ✅ Yes |
| `StockDashboard.jsx` | `/stock-dashboard` | Stock analytics | ✅ Yes |
| `RoutePlanner.jsx` | `/route-planner` | Route creation | ✅ Yes |
| `ViewRoute.jsx` | `/view-route` | View saved routes | ✅ Yes |
| `MoMForm.jsx` | `/mom-generator` | MoM generation | ✅ Yes |
| `UnifiedHistory.jsx` | `/history` | Historical data | ✅ Yes |
| `DeleteRecords.jsx` | `/delete` | Record deletion | ✅ Yes |
| `MemberPage.jsx` | `/member-page` | User profile | ✅ Yes |

### Sub-Components (Stock Feature)

| Component | Purpose |
|-----------|---------|
| `StockForm.jsx` | Stock entry form |
| `VillageSelector.jsx` | Village dropdown |
| `BreakdownTable.jsx` | Detailed stock breakdown |
| `SummaryCards.jsx` | KPI metric cards |
| `StockEntryTable.jsx` | Entry table display |

### Utility Components

| Component | Purpose |
|-----------|---------|
| `Navbar.jsx` | Navigation bar |
| `RequireAuth.jsx` | Auth protection wrapper |

### Custom Hooks

| Hook | Purpose |
|------|---------|
| `useStockData.js` | Fetch aggregated stock by village |

### Services

| Service | Purpose |
|---------|---------|
| `stockService.js` | Stock CRUD operations |

### Utilities

| File | Purpose |
|------|---------|
| `pdfUtils.js` | General PDF generation |
| `pdfUtilsFieldOfficer.js` | FO-specific PDF utilities |
| `userExcelSearch.js` | Excel search functionality |

---

## Setup & Installation

### Prerequisites
- Node.js 16+ (with npm)
- Git
- Firebase project (already configured)
- Text editor / IDE (VS Code recommended)

### Installation Steps

1. **Clone Repository:**
   ```bash
   git clone <repository-url>
   cd internalsoftware-main
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Check Configuration:**
   - Verify Firebase config in `src/firebase.js`
   - Ensure `.env` or config is set with Firebase credentials

4. **Start Development Server:**
   ```bash
   npm run dev
   ```
   - Opens at `http://localhost:5173`

5. **Build for Production:**
   ```bash
   npm run build
   ```
   - Creates optimized build in `dist/` folder

6. **Lint Code:**
   ```bash
   npm run lint
   ```

7. **Preview Production Build:**
   ```bash
   npm run preview
   ```

### Firebase Setup

Firebase is already configured in `src/firebase.js`:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyCmzyAPxp6jhYW9YZvPCD8c-lwshBBnR30",
  authDomain: "fo-data-portal.firebaseapp.com",
  projectId: "fo-data-portal",
  storageBucket: "fo-data-portal.appspot.com",
  messagingSenderId: "299000972057",
  appId: "1:299000972057:web:075ef8dbdef9a5fe413b88",
  measurementId: "G-NNVG3BZ8LE"
};
```

**No additional setup needed** - project is already connected to Firebase.

---

## Key Workflows

### Workflow 1: Field Officer Submitting Daily Report

```
1. Login (login.jsx)
   ↓
2. Click "Field Officer Form" (Home.jsx)
   ↓
3. Select officer from dropdown or add new
   ↓
4. Fill form details:
   - Date
   - Work hours (punch in/out)
   - KMs traveled
   - Locations visited
   - Customer interactions
   ↓
5. Add customers with orders
   ↓
6. Generate PDF preview
   ↓
7. Submit to Firebase
   ↓
8. System stores in demosales collection
   ↓
9. Toast notification confirms
```

---

### Workflow 2: Recording Demo Sales & Stock Movement

```
1. Go to Demo Sales List (DemoSalesList.jsx)
   ↓
2. Create new demo entry:
   - Select village
   - Add date & team members
   - Record GPS location
   ↓
3. Add customer to demo:
   - Customer name/code
   - Order packaging & quantity
   - Any special offers
   ↓
4. Record stock taken to demo:
   - Packaging type
   - Quantity taken
   ↓
5. Mark customers as finalized
   ↓
6. Export to Excel or PDF
   ↓
7. System calculates:
   - Stock remaining = Stock taken - Stock sold
   ↓
8. Submit to Firebase
```

---

### Workflow 3: Checking Stock Inventory

```
1. Go to Stock Dashboard (StockDashboard.jsx)
   ↓
2. Select village from dropdown
   ↓
3. Dashboard displays:
   - Total stock taken to demos
   - Total stock sold (from demosales)
   - Stock maintained at dairy
   - Stock remaining (auto-calculated)
   ↓
4. View detailed breakdown table:
   - Per-packaging analysis
   - Color-coded alerts for oversold
   ↓
5. If oversold or low:
   - Go to Stock Management
   - Add new stock entry
   - Select location (demo/dairy)
   ↓
6. System updates dashboard in real-time
```

---

### Workflow 4: Planning Delivery Routes

```
1. Go to Route Planner (RoutePlanner.jsx)
   ↓
2. Select date
   ↓
3. Add locations to route:
   - Village/location name
   - Orders (packaging + qty)
   - Returns (if any)
   - Payment details
   - Contact person
   ↓
4. After visit:
   - Mark location as "Completed"
   - Verify payment received
   ↓
5. Export route to Excel or save to Firebase
   ↓
6. Later, view route in "View Route" page
```

---

## Environment & Configuration

### File: `src/firebase.js`

```javascript
// This is where Firebase is configured
// Currently connected to project: "fo-data-portal"
// All Firestore collections stored in this project

// If changing Firebase project:
// 1. Update the firebaseConfig object
// 2. Ensure new project has same collection structure
// 3. Copy Firestore rules & indexes
```

### File: `vite.config.js`

```javascript
// Build configuration
export default defineConfig({
  plugins: [react()],      // React support
  build: {
    outDir: 'dist'         // Output directory
  },
  base: '/'                // Base path for routing
});
```

### File: `.eslintrc.js`

ESLint rules for code quality. Run `npm run lint` to check.

### File: `package.json`

- **Scripts:**
  - `npm run dev` - Start dev server
  - `npm run build` - Production build
  - `npm run lint` - Check code quality
  - `npm run preview` - Preview production build

---

## Development Guidelines

### Code Style

1. **Component Structure:**
   ```jsx
   import React, { useState, useEffect } from 'react';
   import { useNavigate } from 'react-router-dom';
   
   export default function ComponentName() {
     const navigate = useNavigate();
     const [state, setState] = useState(null);
     
     useEffect(() => {
       // Side effects here
     }, []);
     
     const handleAction = async () => {
       // Logic here
     };
     
     return (
       <div>
         {/* JSX here */}
       </div>
     );
   }
   ```

2. **Firebase Operations:**
   ```javascript
   // Always wrap in try-catch
   try {
     await addDoc(collection(db, "collection"), data);
     toast.success("Success!");
   } catch (error) {
     console.error("Error:", error);
     toast.error("Failed: " + error.message);
   }
   ```

3. **Real-time Data:**
   ```javascript
   // Use onSnapshot for real-time updates
   const unsubscribe = onSnapshot(query, (snapshot) => {
     const data = {};
     snapshot.docs.forEach((doc) => {
       data[doc.id] = doc.data();
     });
     setState(data);
   });
   
   // Always cleanup
   return () => unsubscribe();
   ```

4. **Error Handling:**
   - Always show user feedback via toast notifications
   - Log errors to console for debugging
   - Validate inputs before submission

5. **Performance:**
   - Use `onSnapshot` for real-time data (not repeated getDocs)
   - Lazy-load components where possible
   - Optimize re-renders with proper dependency arrays

---

### Common Development Tasks

#### Task 1: Add a New Route

1. Create component in `src/ComponentName.jsx`
2. Import in `src/App.jsx`
3. Add route:
   ```jsx
   <Route path="/new-path" element={
     <RequireAuth>
       <ComponentName />
     </RequireAuth>
   } />
   ```
4. Add to Navbar links if needed

#### Task 2: Add a New Database Collection

1. In Firebase Console, create collection
2. Add documents with schema matching your needs
3. Create query/snapshot listener in component:
   ```javascript
   const q = query(collection(db, "collectionName"), where(...));
   onSnapshot(q, (snapshot) => {
     // Handle data
   });
   ```

#### Task 3: Export Data to Excel

```javascript
import ExcelJS from 'exceljs';

const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Sheet1');
worksheet.columns = [
  { header: 'Column 1', key: 'col1' },
  { header: 'Column 2', key: 'col2' }
];

data.forEach(item => {
  worksheet.addRow(item);
});

await workbook.xlsx.writeFile('filename.xlsx');
```

#### Task 4: Generate PDF

```javascript
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const doc = new jsPDF();
doc.text('Title', 10, 10);

autoTable(doc, {
  head: [['Col1', 'Col2']],
  body: [['data1', 'data2']]
});

doc.save('filename.pdf');
```

#### Task 5: Add Toast Notifications

```javascript
import { toast } from 'react-toastify';

toast.success("Operation successful!");
toast.error("Something went wrong");
toast.info("Information message");
```

#### Task 6: Add Input Validation

```javascript
const validateForm = (formData) => {
  if (!formData.email) {
    toast.error("Email is required");
    return false;
  }
  if (!/\S+@\S+\.\S+/.test(formData.email)) {
    toast.error("Invalid email format");
    return false;
  }
  return true;
};
```

---

## Common Tasks for Interns

### Task 1: Fix a Bug in Demo Sales List

**Scenario:** Customer orders aren't saving properly.

**Steps:**
1. Open `src/DemoSalesList.jsx`
2. Find the `handleAddCustomer` function
3. Check if data is being formatted correctly
4. Verify Firebase write permissions
5. Check browser console for error messages
6. Add `console.log()` statements to debug
7. Test and verify fix

---

### Task 2: Add a New Field to Stock Entry Form

**Scenario:** Need to add "warehouse location" field.

**Steps:**
1. Open `src/components/stock/StockForm.jsx`
2. Add to form state:
   ```javascript
   const [warehouse, setWarehouse] = useState('');
   ```
3. Add input field:
   ```jsx
   <input 
     value={warehouse}
     onChange={(e) => setWarehouse(e.target.value)}
     placeholder="Warehouse Location"
   />
   ```
4. Include in submission:
   ```javascript
   const stockData = {
     ...otherFields,
     warehouse: warehouse
   };
   ```
5. Update Firebase schema documentation
6. Test submission and data retrieval

---

### Task 3: Create a New Analytics Dashboard

**Scenario:** Want to show sales by packaging type.

**Steps:**
1. Create `src/AnalyticsDashboard.jsx`
2. Import Firebase utilities:
   ```javascript
   import { collection, query, where, getDocs } from 'firebase/firestore';
   import { db } from './firebase';
   ```
3. Fetch demosales data
4. Process data by packaging type
5. Use Chart.js for visualization:
   ```javascript
   import { Chart as ChartJS } from 'chart.js';
   import { Bar } from 'react-chartjs-2';
   ```
6. Add route in `App.jsx`
7. Add to navbar links

---

### Task 4: Implement Data Export Feature

**Scenario:** Need to export stock history to Excel.

**Steps:**
1. Create new button in `src/StockDashboard.jsx`
2. Add Excel export function:
   ```javascript
   const exportToExcel = async () => {
     const workbook = new ExcelJS.Workbook();
     const worksheet = workbook.addWorksheet('Stock History');
     // Add data...
     await workbook.xlsx.writeFile('stock_history.xlsx');
   };
   ```
3. Call function on button click
4. Test export and verify data
5. Add toast notification for success/failure

---

### Task 5: Add Filtering to History Page

**Scenario:** Users want to filter history by date range.

**Steps:**
1. Open `src/UnifiedHistory.jsx`
2. Add state for date filters:
   ```javascript
   const [startDate, setStartDate] = useState('');
   const [endDate, setEndDate] = useState('');
   ```
3. Add input fields for dates
4. Modify Firebase query:
   ```javascript
   const q = query(
     collection(db, "demosales"),
     where("date", ">=", startDate),
     where("date", "<=", endDate)
   );
   ```
5. Update results when filters change
6. Test with various date ranges

---

### Task 6: Create a User Role System

**Scenario:** Different users should see different features.

**Steps:**
1. Update `src/Home.jsx` to check user role:
   ```javascript
   const userRole = profile?.role; // 'fieldOfficer', 'manager', 'admin'
   ```
2. Conditionally show features:
   ```jsx
   {userRole === 'fieldOfficer' && (
     <Link to="/form">Field Officer Form</Link>
   )}
   {userRole === 'manager' && (
     <Link to="/stock-dashboard">Stock Dashboard</Link>
   )}
   ```
3. Protect routes in `App.jsx`:
   ```jsx
   <Route path="/stock-dashboard" element={
     <ProtectByRole role="manager">
       <StockDashboard />
     </ProtectByRole>
   } />
   ```
4. Create `ProtectByRole.jsx` component
5. Test with different user accounts

---

### Task 7: Optimize Performance

**Scenario:** App is slow when loading large datasets.

**Steps:**
1. Identify slow components using React DevTools
2. Check Firestore queries:
   - Add indexes for common filters
   - Paginate results (load 50 at a time)
   - Use `.limit()` in queries
3. Optimize components:
   - Use `React.memo()` for expensive components
   - Check for unnecessary re-renders
   - Optimize `useEffect` dependencies
4. Check network requests in DevTools Network tab
5. Test performance improvements

---

### Task 8: Add Test Coverage

**Scenario:** Need to test stock calculation logic.

**Steps:**
1. Install testing library:
   ```bash
   npm install @testing-library/react @testing-library/jest-dom
   ```
2. Create test file: `src/__tests__/stockService.test.js`
3. Write tests:
   ```javascript
   import { calculateRemaining } from '../services/stockService';
   
   describe('calculateRemaining', () => {
     it('should calculate remaining stock correctly', () => {
       const result = calculateRemaining({...}, {...}, {...});
       expect(result).toBe(expectedValue);
     });
   });
   ```
4. Run tests
5. Add more tests for edge cases

---

### Task 9: Improve UI/UX

**Scenario:** Form looks outdated.

**Steps:**
1. Review form in `src/form.css`
2. Update colors/spacing:
   ```css
   .form-container {
     background: #f8f9fa;
     border-radius: 12px;
     padding: 24px;
     box-shadow: 0 2px 8px rgba(0,0,0,0.1);
   }
   ```
3. Add responsive design:
   ```css
   @media (max-width: 768px) {
     .form-container {
       padding: 16px;
     }
   }
   ```
4. Test on mobile devices
5. Get feedback and iterate

---

### Task 10: Debug Firebase Issues

**Common Problems:**

1. **Data not saving:**
   - Check Firebase write permissions
   - Verify Firestore rules
   - Check console for errors
   - Ensure data matches schema

2. **Real-time updates not working:**
   - Verify `onSnapshot` listener is set up
   - Check unsubscribe cleanup
   - Monitor Firestore connection in DevTools

3. **Authentication issues:**
   - Check user is logged in
   - Verify `RequireAuth` wrapper
   - Check user record in Firestore users collection

4. **Slow queries:**
   - Create Firestore indexes for filtered queries
   - Add `limit()` to queries
   - Monitor database usage in Firebase Console

---

## Quick Reference Commands

### Development
```bash
npm install              # Install dependencies
npm run dev             # Start dev server (port 5173)
npm run build           # Create production build
npm run lint            # Check code quality
npm run preview         # Preview production build
```

### Git
```bash
git clone <url>         # Clone repo
git status              # Check changes
git add .               # Stage all changes
git commit -m "message" # Commit changes
git push                # Push to remote
git pull                # Pull latest changes
```

### Firebase
- **Console:** https://console.firebase.google.com/
- **Project:** `fo-data-portal`
- Collections visible in Firestore tab

---

## Troubleshooting

### "npm install" fails
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- Ensure Node.js 16+ is installed

### Dev server won't start
- Check if port 5173 is in use
- Run `npm run dev` from correct directory
- Clear browser cache (Ctrl+Shift+Delete)

### Firebase connection fails
- Verify internet connection
- Check Firebase credentials in `firebase.js`
- Test in Firebase Console

### PDF export shows garbage characters
- Font file `NotoSansGujarati-Regular.js` must be present
- Verify font is loaded correctly
- Check console for errors

### Real-time data not updating
- Check Firestore rules in Firebase Console
- Verify `onSnapshot` listener is active
- Clear browser cache and reload
- Check network tab for failed requests

---

## Additional Resources

### Documentation Links
- **React:** https://react.dev
- **Vite:** https://vitejs.dev
- **Firebase:** https://firebase.google.com/docs
- **Chart.js:** https://www.chartjs.org
- **ExcelJS:** https://github.com/exceljs/exceljs
- **jsPDF:** https://github.com/parallax/jsPDF

### Firebase Collections to Know
- `users` - User profiles
- `demosales` - Demo sales with nested customers
- `stock` - Stock entries
- `routePlans` - Planned delivery routes
- `demo_moms` - Meeting minutes

### Files to Review First
1. `App.jsx` - App structure & routes
2. `firebase.js` - Firebase config
3. `Home.jsx` - Dashboard & feature overview
4. `DemoSalesList.jsx` - Main business logic
5. `StockDashboard.jsx` - Analytics example

---

## Contact & Support

For questions or issues:
1. Check this documentation first
2. Review related component source code
3. Check browser console (F12) for errors
4. Review Firebase Console for data
5. Reach out to senior developers

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Maintained By:** [Your Team Name]

---
