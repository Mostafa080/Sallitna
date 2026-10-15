// The dashboard reads the app's .env (one level up), so the public Supabase key lives in one place.
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  envDir: '..',
  envPrefix: ['EXPO_PUBLIC_'],
  server: { port: 5199, fs: { allow: ['..'] } }, // allow the app's fonts in ../assets
});
