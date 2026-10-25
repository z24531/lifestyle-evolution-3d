import { defineConfig } from 'vite';

export default defineConfig({
  // 相对路径:让构建产物可部署到 GitHub Pages 项目页(/repo/ 子路径)
  base: './',
  server: { port: 5173 },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // 把 three.js 拆成独立 chunk,利于浏览器缓存(Vite 8/Rolldown 只支持函数式)
        manualChunks(id: string) {
          if (id.includes('node_modules/three')) return 'three';
        },
      },
    },
  },
});
