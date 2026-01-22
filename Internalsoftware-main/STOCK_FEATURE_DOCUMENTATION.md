# 📦 Stock Management Feature - Documentation

## Overview
A comprehensive stock management system for tracking stock taken to village demos, stock sold to customers, and stock maintained at the dairy. The feature includes real-time dashboard visualization.

## Components Created

### 1. **StockManagement.jsx** (`/stock-management`)
Component for adding and managing stock entries with the following features:

#### Features:
- **Add Stock Entries**
  - Select village for tracking
  - Choose packaging type
  - Input quantity
  - Set date of entry
  - Add optional notes
  - Toggle between "Stock Taken to Demo" and "Stock at Dairy"

- **View Stock Entries**
  - Displays all stock entries in a table format
  - Shows date, packaging, quantity, location, and notes
  - Delete functionality for entries

- **Export to Excel**
  - Export stock data to Excel file with proper formatting
  - Includes all stock information

#### Technical Details:
- Uses Firebase Firestore `stock` collection
- Real-time updates via `onSnapshot`
- User authentication via Firebase Auth
- Toast notifications for user feedback
- Responsive design

#### Database Schema:
```
Collection: stock
{
  villageId: string (references village ID)
  villageName: string
  packaging: string (JAR size/type)
  quantity: number
  location: string ("demo" or "dairy")
  date: string (YYYY-MM-DD)
  notes: string
  entryBy: string (user email)
  createdAt: timestamp
}
```

---

### 2. **StockDashboard.jsx** (`/stock-dashboard`)
Real-time dashboard showing stock analysis with the following features:

#### Dashboard Metrics:
1. **📦 Stock Taken to Demo** - Total units taken to demos
2. **💰 Stock Sold** - Total units sold (calculated from sales)
3. **🏪 Stock at Dairy** - Total units kept at dairy
4. **✅ Stock Remaining** - Auto-calculated remaining stock

#### Formula:
```
Stock Remaining = Stock Taken to Demo - Stock Sold - Stock at Dairy
```

#### Features:
- **Summary Cards**
  - Color-coded cards for each metric
  - Total units display
  - Alerts for oversold inventory

- **Detailed Breakdown Table**
  - Per-packaging type analysis
  - Shows taken, sold, dairy, and remaining columns
  - Color-coded cells for quick visualization
  - Alerts for negative remaining stock

#### Data Sources:
- Stock entries from `stock` collection (location: "demo")
- Sales data from `demosales` > `customers` subcollection
- Dairy stock from `stock` collection (location: "dairy")

#### Real-time Updates:
- Automatic refresh when data changes
- Live calculation of remaining stock

---

## Integration with Existing System

### Connected Collections:
1. **demosales** - Existing demo sales records
   - Contains subcollection `customers` with order information
   - Used for calculating stock sold

2. **villages** - Existing village data
   - Links stock entries to specific villages

3. **stock** - New collection for stock management
   - Tracks all stock movements

---

## How to Use

### Adding Stock (Stock Management Page)

1. **Select Village**
   - Choose the village for which you're adding stock

2. **Choose Type**
   - Select "Stock Taken to Demo" OR "Stock at Dairy"

3. **Fill in Details**
   - Packaging Type: Select from predefined list
   - Quantity: Enter the number of units
   - Date: Set the date of entry
   - Notes: (Optional) Add any additional information

4. **Submit**
   - Click "Add Stock" button
   - Entry appears immediately in the list below

5. **Export**
   - Click "📊 Export to Excel" to download data

---

### Viewing Dashboard (Stock Dashboard Page)

1. **Select Village**
   - Choose the village to analyze

2. **View Summary Cards**
   - See total stock taken, sold, at dairy, and remaining
   - Color-coded for quick insight

3. **Review Detailed Breakdown**
   - View per-packaging breakdown
   - Identify high-demand items
   - Spot oversold items (negative remaining)

---

## Key Features Explained

### Stock Calculation Example:
```
Village: Rajpura
Packaging: 1LTR JAR

Stock Taken to Demo:     50 units
Stock Sold:              35 units
Stock at Dairy:          10 units
Remaining:               50 - 35 - 10 = 5 units ✅
```

### Oversold Detection:
If remaining stock is negative, it displays in red with "⚠️ Oversold!" alert

### Real-time Sync:
- Changes appear instantly across all components
- No page refresh needed
- Live listener updates from Firebase

---

## Navigation

### Routes Added:
- `/stock-management` - Manage stock entries
- `/stock-dashboard` - View real-time dashboard

### Navbar Links:
- "Stock Management" → Opens add/manage page
- "Stock Dashboard" → Opens real-time analytics

---

## Technical Stack

- **Frontend**: React
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Export**: ExcelJS
- **Notifications**: React Toastify
- **UI Framework**: Custom CSS with form.css

---

## Future Enhancements

1. **Low Stock Alerts** - Automatic warnings when stock falls below threshold
2. **Stock Transfer** - Move stock between demo and dairy
3. **Reports** - Generate weekly/monthly stock reports
4. **History Timeline** - Visual timeline of stock movements
5. **Batch Operations** - Add/delete multiple entries at once
6. **Stock Adjustments** - Handle damaged/expired items
7. **Multi-village Dashboard** - Compare across villages
8. **Predictive Analytics** - Stock forecasting based on trends

---

## Notes

- All entries are stamped with the logged-in user's email
- Timestamps are server-generated for accuracy
- Deleting entries shows confirmation dialog
- All data is stored in Firebase Firestore
- Real-time updates ensure data consistency
