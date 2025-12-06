import { defineConfig } from 'vite'; 
import react from '@vitejs/plugin-react'; 

// https://vitejs.dev/config/ 
export default defineConfig({ 
  plugins: [react()], 
  optimizeDeps: {
    include: ['lucide-react'], 
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js', '@supabase/auth-helpers-react'],
          'vendor-ui': ['framer-motion', 'lucide-react', 'react-icons'],
          'vendor-map': ['leaflet', 'react-leaflet'],
        }
      }
    }
  }
});