/**
 * TimelineMap —— 滚动进度 ↔ 相机关键帧的纯数学映射(可单测,不依赖 DOM/Three)。
 *
 * 关键帧序列:
 *   K0 高空远景 → K1 推近 → K2..K(eraCount+1) 每个时代的环绕驻留位 → K(eraCount+2) 收束位
 * 7 个时代 = 10 个关键帧。
 *
 * 滚动分镜(设计文档 §5):
 *   0–6%      序章(缓缓前推)
 *   6%–84%    时代 1–6,每段 13%(预留两端减速悬停)
 *   84%–100%  降到智能时代 → 驻留 → 收束
 */
import { ERA_SPACING } from '../scene/layout';

export interface CameraPose {
  position: [number, number, number];
  lookAt: [number, number, number];
}

export interface TimelineSample {
  /** 连续关键帧位置,整数 = 正好停在某关键帧。 */
  f: number;
  /** 当前时代索引(0-based),用于 UI 高亮。 */
  eraIndex: number;
  /** 当前时代热点的不透明度(0–1)。 */
  hotspotOpacity: number;
}

/** 序章占用的滚动进度。 */
export const INTRO_END = 0.06;
/** 每个时代段占用的滚动进度(最后一段吃满剩余)。 */
export const ERA_SPAN = 0.13;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const smoothstep = (t: number): number => t * t * (3 - 2 * t);

/** 两端带驻留平台段的缓动:前 18% / 后 18% 静止,中间平滑移动。 */
function shaped(t: number): number {
  const hold = 0.18;
  const clamped = clamp01(t);
  if (clamped <= hold) return 0;
  if (clamped >= 1 - hold) return 1;
  return smoothstep((clamped - hold) / (1 - 2 * hold));
}

export class TimelineMap {
  readonly keyframes: CameraPose[];

  constructor(readonly eraCount: number) {
    const frames: CameraPose[] = [];
    // K0:高空鸟瞰「时间之柱」(构图偏右,给标题留左侧留白)
    frames.push({ position: [0, 54, 238], lookAt: [-72, -66, 0] });
    // K1:缓缓前推后的过渡位
    frames.push({ position: [16, 30, 96], lookAt: [-30, -12, 0] });
    // K2..K(eraCount+1):每个时代平台外围绕行
    for (let i = 0; i < eraCount; i += 1) {
      const angle = 0.35 + i * 0.62;
      const radius = 30;
      frames.push({
        position: [Math.sin(angle) * radius, -i * ERA_SPACING + 13, Math.cos(angle) * radius],
        lookAt: [0, -i * ERA_SPACING + 1.0, 0],
      });
    }
    // K(eraCount+2):智能时代收束(拉近、略抬头)
    const last = eraCount - 1;
    const endAngle = 0.35 + last * 0.62 + 0.55;
    frames.push({
      position: [Math.sin(endAngle) * 23, -last * ERA_SPACING + 16, Math.cos(endAngle) * 23],
      lookAt: [0, -last * ERA_SPACING + 2.0, 0],
    });
    this.keyframes = frames;
  }

  /** 关键帧总数(eraCount + 3)。 */
  get keyframeCount(): number {
    return this.keyframes.length;
  }

  /** 滚动进度 [0,1] → 连续关键帧位置。 */
  keyframeAt(progress: number): number {
    const p = clamp01(progress);
    const lastBandStart = INTRO_END + (this.eraCount - 1) * ERA_SPAN;
    if (p < INTRO_END) {
      // 序章:0 → 1(缓缓前推)
      return smoothstep(p / INTRO_END);
    }
    if (p >= lastBandStart) {
      const u = (p - lastBandStart) / (1 - lastBandStart);
      // 前 55% 从上一时代降到最后一个时代,后 45% 收束
      if (u < 0.55) return this.eraCount + shaped(u / 0.55);
      return this.eraCount + 1 + shaped((u - 0.55) / 0.45);
    }
    const band = Math.min(this.eraCount - 2, Math.max(0, Math.floor((p - INTRO_END) / ERA_SPAN)));
    const start = INTRO_END + band * ERA_SPAN;
    const t = (p - start) / ERA_SPAN;
    return 1 + band + shaped(t);
  }

  /** 连续关键帧位置 → 相机位姿(线性插值)。 */
  poseAt(f: number): CameraPose {
    const max = this.keyframes.length - 1;
    const clamped = Math.min(max, Math.max(0, f));
    const index = Math.min(max - 1, Math.floor(clamped));
    const t = clamped - index;
    const from = this.keyframes[index];
    const to = this.keyframes[index + 1];
    return {
      position: [
        from.position[0] + (to.position[0] - from.position[0]) * t,
        from.position[1] + (to.position[1] - from.position[1]) * t,
        from.position[2] + (to.position[2] - from.position[2]) * t,
      ],
      lookAt: [
        from.lookAt[0] + (to.lookAt[0] - from.lookAt[0]) * t,
        from.lookAt[1] + (to.lookAt[1] - from.lookAt[1]) * t,
        from.lookAt[2] + (to.lookAt[2] - from.lookAt[2]) * t,
      ],
    };
  }

  /** 连续关键帧位置 → 当前时代索引(热点/标题/滑块高亮用)。 */
  eraIndexAt(f: number): number {
    const index = Math.round(f) - 2;
    return Math.min(this.eraCount - 1, Math.max(0, index));
  }

  /** 当前时代热点的淡入淡出:相机越接近该时代驻留位越明显。 */
  hotspotOpacityAt(f: number): number {
    if (f < 1.15) return 0;
    const eraIndex = this.eraIndexAt(f);
    const distance = Math.abs(f - (2 + eraIndex));
    return 1 - smoothstep(Math.min(1, Math.max(0, (distance - 0.1) / 0.55)));
  }

  /** 滑块跳转:某时代的滚动进度(相机正好停在该时代驻留位)。 */
  progressForEra(eraIndex: number): number {
    const index = Math.min(this.eraCount - 1, Math.max(0, Math.round(eraIndex)));
    if (index >= this.eraCount - 1) {
      // 最后一段:f = eraCount+1 时正好在最后一个时代驻留位
      const lastBandStart = INTRO_END + (this.eraCount - 1) * ERA_SPAN;
      // shaped(u/0.55)=1 → u ≈ 0.55*0.82
      return lastBandStart + (1 - lastBandStart) * 0.55 * 0.82;
    }
    return INTRO_END + index * ERA_SPAN + ERA_SPAN * 0.85;
  }

  /** 采样:进度 → (关键帧位置, 时代, 热点透明度)。 */
  sample(progress: number): TimelineSample {
    const f = this.keyframeAt(progress);
    return {
      f,
      eraIndex: this.eraIndexAt(f),
      hotspotOpacity: this.hotspotOpacityAt(f),
    };
  }
}
