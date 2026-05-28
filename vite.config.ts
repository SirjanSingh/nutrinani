import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env files including non-VITE_ vars (server-side use only).
  const env = loadEnv(mode, process.cwd(), "");
  const openaiKey = env.OPENAI_API_KEY || "";

  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        "/off": {
          target: "https://world.openfoodfacts.org",
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/off/, ""),
          headers: {
            "User-Agent": "NutriNani-Dev/0.1 (local)",
          },
        },
        "/openai": {
          target: "https://api.openai.com",
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/openai/, ""),
          configure: (proxy) => {
            // Inject the bearer token in the proxy layer so the key never
            // reaches the browser.
            proxy.on("proxyReq", (proxyReq) => {
              if (openaiKey) {
                proxyReq.setHeader("Authorization", `Bearer ${openaiKey}`);
              }
            });
          },
        },
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
