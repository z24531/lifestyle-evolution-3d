import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * 时间轴映射测试（开发契约 §5：滚动 progress → 连续关键帧位 + 相机位姿插值）。
 *
 * 被测对象：src/core/TimelineMap.ts（Lead 提供，纯数学、不依赖 DOM/Three）。
 * 文件未就绪时本文件自动 skip 占位，不阻塞 `npm run test`；文件落地后自动启用。
 *
 * 约定（来自实现注释）：
 *   - 7 个时代 = 10 个关键帧：K0 远景 / K1 过渡 / K2..K8 时代驻留 / K9 收束；
 *   - eraIndex = round(f) - 2，clamp 到 0..eraCount-1；
 *   - progressForEra(i) 的进度正好把相机停到第 i 个时代的驻留关键帧（K(i+2)）。
 */

const timelineModulePath = fileURLToPath(new URL('../src/core/TimelineMap.ts', import.meta.url));
const timelineAvailable = existsSync(timelineModulePath);

const ERA_COUNT = 7;
const EXPECTED_KEYFRAMES = ERA_COUNT + 3;
const EPS = 1e-9;

interface CameraPoseLike {
  position: [number, number, number];
  lookAt: [number, number, number];
}

interface TimelineSampleLike {
  f: number;
  eraIndex: number;
  hotspotOpacity: number;
}

interface TimelineMapLike {
  keyframeCount: number;
  keyframes: CameraPoseLike[];
  keyframeAt(progress: number): number;
  poseAt(f: number): CameraPoseLike;
  eraIndexAt(f: number): number;
  hotspotOpacityAt(f: number): number;
  progressForEra(eraIndex: number): number;
  sample(progress: number): TimelineSampleLike;
}

interface TimelineMapModule {
  TimelineMap: new (eraCount: number) => TimelineMapLike;
  INTRO_END: number;
  ERA_SPAN: number;
}

/** 采样点：序章、每个时代停留点（契约 §5）、结语、越界值。 */
const SAMPLE_PROGRESS = [0, 0.03, 0.06, 0.125, 0.255, 0.385, 0.515, 0.645, 0.775, 0.92, 0.99, 1];

const expectClose = (actual: number, expected: number, message: string): void => {
  expect(
    Math.abs(actual - expected),
    `${message}（实际 ${actual}，期望 ${expected}）`,
  ).toBeLessThan(1e-6);
};

if (timelineAvailable) {
  const module = (await import('../src/core/TimelineMap')) as unknown as TimelineMapModule;
  const map = new module.TimelineMap(ERA_COUNT);

  describe('TimelineMap：构造与关键帧', () => {
    it(`7 个时代生成 ${EXPECTED_KEYFRAMES} 个关键帧`, () => {
      expect(map.keyframeCount).toBe(EXPECTED_KEYFRAMES);
      expect(map.keyframes).toHaveLength(EXPECTED_KEYFRAMES);
      for (const frame of map.keyframes) {
        expect(frame.position).toHaveLength(3);
        expect(frame.lookAt).toHaveLength(3);
        expect([...frame.position, ...frame.lookAt].every(Number.isFinite)).toBe(true);
      }
    });

    it('时代驻留关键帧沿 Y 轴逐层下降（时间之柱）', () => {
      const stayFrames = map.keyframes.slice(2, 2 + ERA_COUNT);
      for (let index = 1; index < stayFrames.length; index += 1) {
        expect(stayFrames[index].position[1]).toBeLessThan(stayFrames[index - 1].position[1]);
        expect(stayFrames[index].lookAt[1]).toBeLessThan(stayFrames[index - 1].lookAt[1]);
      }
    });
  });

  describe('TimelineMap：progress → 连续关键帧位', () => {
    it('导出契约常量 INTRO_END=0.06 / ERA_SPAN=0.13', () => {
      expectClose(module.INTRO_END, 0.06, 'INTRO_END');
      expectClose(module.ERA_SPAN, 0.13, 'ERA_SPAN');
    });

    it('端点与越界值被 clamp 到 [0, K(n)]', () => {
      expectClose(map.keyframeAt(0), 0, 'keyframeAt(0)');
      expectClose(map.keyframeAt(1), EXPECTED_KEYFRAMES - 1, 'keyframeAt(1)');
      expectClose(map.keyframeAt(-0.5), 0, 'keyframeAt(-0.5)');
      expectClose(map.keyframeAt(1.5), EXPECTED_KEYFRAMES - 1, 'keyframeAt(1.5)');
    });

    it('序章结束时到达 K1', () => {
      expectClose(map.keyframeAt(module.INTRO_END), 1, 'keyframeAt(INTRO_END)');
    });

    it('整段 progress 上连续、单调不减且落在 [0, K(n)] 内', () => {
      let previous = -Infinity;
      for (let step = 0; step <= 2000; step += 1) {
        const f = map.keyframeAt(step / 2000);
        expect(f).toBeGreaterThanOrEqual(0);
        expect(f).toBeLessThanOrEqual(EXPECTED_KEYFRAMES - 1);
        expect(f).toBeGreaterThanOrEqual(previous - EPS);
        // 连续性：相邻采样（Δp=0.0005）不应跳变超过 0.05 个关键帧
        if (previous > -Infinity) expect(f - previous).toBeLessThan(0.05);
        previous = f;
      }
    });

    it('progressForEra(i) 正好停在 i 时代的驻留关键帧 K(i+2)', () => {
      for (let eraIndex = 0; eraIndex < ERA_COUNT; eraIndex += 1) {
        const progress = map.progressForEra(eraIndex);
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(1);
        expectClose(map.keyframeAt(progress), eraIndex + 2, `era${eraIndex + 1} 驻留位`);
      }
    });

    it('progressForEra 对越界时代索引做 clamp', () => {
      expectClose(map.progressForEra(-5), map.progressForEra(0), 'progressForEra(-5)');
      expectClose(map.progressForEra(99), map.progressForEra(ERA_COUNT - 1), 'progressForEra(99)');
    });
  });

  describe('TimelineMap：相机位姿插值', () => {
    it('整数关键帧位置精确返回该关键帧位姿', () => {
      for (let index = 0; index < EXPECTED_KEYFRAMES; index += 1) {
        const pose = map.poseAt(index);
        const frame = map.keyframes[index];
        pose.position.forEach((value, axis) =>
          expectClose(value, frame.position[axis], `K${index}.position[${axis}]`),
        );
        pose.lookAt.forEach((value, axis) =>
          expectClose(value, frame.lookAt[axis], `K${index}.lookAt[${axis}]`),
        );
      }
    });

    it('相邻关键帧之间线性插值', () => {
      for (let index = 0; index < EXPECTED_KEYFRAMES - 1; index += 1) {
        const pose = map.poseAt(index + 0.25);
        const from = map.keyframes[index];
        const to = map.keyframes[index + 1];
        pose.position.forEach((value, axis) => {
          expectClose(
            value,
            from.position[axis] + (to.position[axis] - from.position[axis]) * 0.25,
            `t=0.25 position[${axis}]`,
          );
        });
      }
    });

    it('越界的 f 被 clamp 到首尾关键帧', () => {
      expect(map.poseAt(-3)).toEqual(map.keyframes[0]);
      expect(map.poseAt(100)).toEqual(map.keyframes[EXPECTED_KEYFRAMES - 1]);
    });
  });

  describe('TimelineMap：时代索引与热点透明度', () => {
    it('驻留关键帧 K(i+2) 对应 eraIndex=i', () => {
      for (let eraIndex = 0; eraIndex < ERA_COUNT; eraIndex += 1) {
        expect(map.eraIndexAt(eraIndex + 2)).toBe(eraIndex);
      }
    });

    it('eraIndexAt 在整段上单调不减并 clamp 到 [0, eraCount-1]', () => {
      expect(map.eraIndexAt(0)).toBe(0);
      expect(map.eraIndexAt(1)).toBe(0);
      expect(map.eraIndexAt(EXPECTED_KEYFRAMES - 1)).toBe(ERA_COUNT - 1);
      let previous = -1;
      for (let step = 0; step <= 2000; step += 1) {
        const eraIndex = map.eraIndexAt((step / 2000) * (EXPECTED_KEYFRAMES - 1));
        expect(eraIndex).toBeGreaterThanOrEqual(0);
        expect(eraIndex).toBeLessThanOrEqual(ERA_COUNT - 1);
        expect(eraIndex).toBeGreaterThanOrEqual(previous);
        previous = eraIndex;
      }
    });

    it('热点透明度：序章为 0、驻留位为 1、远离时衰减到 0，且始终在 [0,1]', () => {
      expectClose(map.hotspotOpacityAt(0), 0, '序章');
      expectClose(map.hotspotOpacityAt(0.9), 0, '序章末尾');
      for (let eraIndex = 0; eraIndex < ERA_COUNT; eraIndex += 1) {
        expectClose(map.hotspotOpacityAt(eraIndex + 2), 1, `era${eraIndex + 1} 驻留位`);
      }
      // 两个驻留位中间（f=3.5）应明显淡出
      expect(map.hotspotOpacityAt(3.5)).toBeLessThan(0.25);
      for (let step = 0; step <= 2000; step += 1) {
        const opacity = map.hotspotOpacityAt((step / 2000) * (EXPECTED_KEYFRAMES - 1));
        expect(opacity).toBeGreaterThanOrEqual(0);
        expect(opacity).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('TimelineMap：sample 契约', () => {
    it('sample(p) 与 keyframeAt/eraIndexAt/hotspotOpacityAt 保持一致', () => {
      for (const progress of [...SAMPLE_PROGRESS, 0.3333, 0.7777]) {
        const sample = map.sample(progress);
        expectClose(sample.f, map.keyframeAt(progress), `sample(${progress}).f`);
        expect(sample.eraIndex).toBe(map.eraIndexAt(sample.f));
        expectClose(
          sample.hotspotOpacity,
          map.hotspotOpacityAt(sample.f),
          `sample(${progress}).hotspotOpacity`,
        );
      }
    });
  });
} else {
  describe.skip('TimelineMap：progress → 连续关键帧位 / 相机位姿', () => {
    it.skip(`占位：等待 Lead 提供 src/core/TimelineMap.ts（当前不存在：${timelineModulePath}）`, () => {
      // 文件落地后本文件会自动切换到真实测试分支。
    });
  });
}
