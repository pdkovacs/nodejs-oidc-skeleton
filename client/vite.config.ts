import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
		cors: false,
    open: true,
		proxy: {
			"/login": {
				target: "http://localhost:45678",
				changeOrigin: true
			},
			"/api": {
				target: "http://localhost:45678",
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, "")
			}
		}
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "src/setupTests",
    mockReset: true,
  },
})
