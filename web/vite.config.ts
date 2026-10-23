import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({ registerType: "autoUpdate", manifest: false, workbox: { globPatterns: ["**/*.{js,css,html,png,svg,json}"] } })],
});
