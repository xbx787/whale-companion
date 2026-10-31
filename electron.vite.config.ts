import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        // 原生模块由 node_modules 提供，不能打进 bundle。
        external: ['uiohook-napi']
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
          settings: resolve(__dirname, 'src/preload/settings.ts'),
          onboarding: resolve(__dirname, 'src/preload/onboarding.ts')
        }
      }
    }
  },
  renderer: {
    // Live2D model JSON resolves its textures, physics and expressions via
    // relative URLs. Keep the whole resource tree intact beside avatar.html
    // instead of emitting hashed individual files.
    publicDir: resolve(__dirname, 'resources'),
    build: {
      // 本机 esbuild 0.28 处理大 chunk 时删临时文件必失败（Access denied）。
      // Electron 的 Chromium 直接支持 esnext，关掉 chunk 级转译即可绕过；
      // 压缩交给打包脚本里的 electron-builder，不再走 esbuild。
      target: 'esnext',
      minify: false,
      copyPublicDir: true,
      rollupOptions: {
        input: {
          avatar: resolve(__dirname, 'src/renderer/avatar.html'),
          settings: resolve(__dirname, 'src/renderer/settings.html'),
          onboarding: resolve(__dirname, 'src/renderer/onboarding.html')
        }
      }
    }
  }
})
