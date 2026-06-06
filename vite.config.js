import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/tennis-tournament-organizer/', // <-- ADD THIS LINE (Replace with your exact repo name)
})
