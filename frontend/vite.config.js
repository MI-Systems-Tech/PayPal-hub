import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/ag-grid-community") ||
              id.includes("node_modules/ag-grid-react")) {
            return "ag-grid";
          }
          if (id.includes("node_modules/three")) {
            return "three-vendor";
          }
        },
      },
    },
  },
});
