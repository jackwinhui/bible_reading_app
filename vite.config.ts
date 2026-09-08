import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const publicBuild = mode === 'public' || process.env.VITE_PUBLIC_BUILD === '1'
  return {
    plugins: [react(), tailwindcss()],
    base: './',
    envDir: publicBuild ? false : undefined,
    envPrefix: publicBuild ? [] : 'VITE_',
    define: publicBuild ? {
      'import.meta.env.VITE_PUBLIC_BUILD': JSON.stringify('1'),
      'import.meta.env.VITE_ESV_API_KEY': JSON.stringify(''),
      'import.meta.env.VITE_SCRIPTURE_API_KEY': JSON.stringify(''),
    } : undefined,
  }
})
