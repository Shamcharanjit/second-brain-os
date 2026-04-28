import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core — tiny, cache forever
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/") || id.includes("node_modules/react/jsx")) {
            return "react";
          }
          // React Router
          if (id.includes("node_modules/react-router") || id.includes("node_modules/@remix-run")) {
            return "router";
          }
          // Radix UI primitives (used by shadcn) — large, rarely changes
          if (id.includes("node_modules/@radix-ui/")) {
            return "radix";
          }
          // Supabase client
          if (id.includes("node_modules/@supabase/")) {
            return "supabase";
          }
          // Date utilities
          if (id.includes("node_modules/date-fns")) {
            return "date-fns";
          }
          // Lucide icons
          if (id.includes("node_modules/lucide-react")) {
            return "lucide";
          }
          // TanStack Query
          if (id.includes("node_modules/@tanstack/")) {
            return "tanstack";
          }
          // AI / heavy libs
          if (id.includes("node_modules/openai") || id.includes("node_modules/ai")) {
            return "ai";
          }
          // Remaining vendor code
          if (id.includes("node_modules/")) {
            return "vendor";
          }
        },
      },
    },
    // Raise the warning threshold — we know we're splitting intentionally
    chunkSizeWarningLimit: 600,
  },
}));
