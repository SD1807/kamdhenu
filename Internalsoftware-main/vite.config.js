import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'pdf': ['jspdf', 'html2canvas', 'jspdf-autotable'],
          'charts': ['chart.js', 'react-chartjs-2'],
          'excel': ['xlsx', 'exceljs', 'file-saver']
        }
      }
    }
  },
  base: '/'
});
