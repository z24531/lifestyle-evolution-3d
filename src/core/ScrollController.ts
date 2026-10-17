export interface EraSegment {
  eraId: string;
  /** 滚动进度 [0,1] 的区间起点。 */
  start: number;
  /** 滚动进度 [0,1] 的区间终点。 */
  end: number;
}

/**
 * 滚动 → 时代进度映射。深模块:调用者只读 progress 或 jumpTo,内部算分段与停留。
 */
export class ScrollController {
  private segments: EraSegment[] = [];

  constructor() {
    window.addEventListener('scroll', () => this.onScroll(), { passive: true });
  }

  /** 当前滚动进度 [0,1]。 */
  get progress(): number {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return max <= 0 ? 0 : window.scrollY / max;
  }

  /** 设置时代分段(由 eras.json 的 index 派生)。 */
  setSegments(segments: EraSegment[]): void {
    this.segments = segments;
  }

  jumpTo(eraId: string): void {
    const seg = this.segments.find((s) => s.eraId === eraId);
    if (!seg) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: seg.start * max, behavior: 'smooth' });
  }

  private onScroll(): void {
    // TODO: 把 progress 分发到 CameraRig / UI(通过订阅者或回调)
  }
}
