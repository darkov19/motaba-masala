import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(() => {
  const debugFrontend = process.env.MASALA_DEBUG_FRONTEND === "1";

  return {
    plugins: [react()],
    build: {
      sourcemap: debugFrontend,
      minify: debugFrontend ? false : "esbuild",
    },
  };
});
