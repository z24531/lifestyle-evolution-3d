import { defineConfig } from 'vitest/config';

/**
 * 内容 / 纯函数测试配置（交付物 T）。
 * - tests/content.test.ts：直接读 JSON 校验 7 时代 / 23 知识点 / 锚点覆盖；
 * - tests/timeline.test.ts：测 src/core/TimelineMap.ts（未就绪时自动 skip，等 Lead 提供）。
 *
 * 用 Node 环境：这些测试只读 JSON 与纯函数，不需要 jsdom / 浏览器。
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    reporters: ['default'],
    passWithNoTests: false,
  },
});
