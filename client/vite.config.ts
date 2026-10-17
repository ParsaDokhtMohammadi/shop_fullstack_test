import { fileURLToPath } from 'node:url'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// The dev server proxies /api and /uploads to the NestJS app so the browser
// sees one origin in development, exactly as it will behind nginx in
// production. That is not just convenience: auth here is an httpOnly cookie,
// and a same-origin setup means no CORS allow-list and no sameSite surprises
// while developing. Point VITE_DEV_API_PROXY somewhere else if the backend is
// not on localhost:3000.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const target = env.VITE_DEV_API_PROXY || 'http://localhost:3000'

  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
    ],
    // Matches the `@/*` path in tsconfig.app.json. Both are needed: tsconfig
    // teaches the type checker and the editor, this teaches the bundler.
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': { target },
        // Product images and the shop logo are served off disk by NestJS,
        // outside its /api prefix — so they need their own proxy rule.
        '/uploads': { target },
      },
    },
  }
})
