import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' permite publicar o build em qualquer pasta (Vercel, GitHub Pages ou dentro do portfólio)
export default defineConfig({
  plugins: [react()],
  base: './',
})
