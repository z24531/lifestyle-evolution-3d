/**
 * ScrollController —— 把页面滚动变成平滑进度,并支持:
 *  - 浮层打开时锁定滚动(锁定期间恢复到打开时的位置)
 *  - 滑块跳转(缓动滚动到目标进度)
 *  - 截图/自动化用的立即跳转
 */
export class ScrollController {
  private smoothProgress = 0;
  private rawProgress = 0;
  private locked = false;
  private savedY = 0;
  private lastTime = 0;
  private tween: { fromY: number; toY: number; start: number; duration: number } | null = null;

  private readonly onWheel = (event: WheelEvent): void => {
    if (this.locked) event.preventDefault();
  };
  private readonly onTouchMove = (event: TouchEvent): void => {
    if (this.locked) event.preventDefault();
  };
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.locked) return;
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) {
      event.preventDefault();
    }
  };

  constructor() {
    this.rawProgress = this.readRaw();
    this.smoothProgress = this.rawProgress;
  }

  /** 平滑后的滚动进度 [0,1](相机/UI 都用它,避免抖动)。 */
  get progress(): number {
    return this.smoothProgress;
  }

  get isLocked(): boolean {
    return this.locked;
  }

  get maxScroll(): number {
    return Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  }

  private readRaw(): number {
    return Math.min(1, Math.max(0, window.scrollY / this.maxScroll));
  }

  /** 每帧调用,now 为 performance.now()。 */
  update(now: number): void {
    const dt = this.lastTime > 0 ? Math.min(0.1, (now - this.lastTime) / 1000) : 0.016;
    this.lastTime = now;

    if (this.tween && !this.locked) {
      const t = Math.min(1, (now - this.tween.start) / this.tween.duration);
      const eased = 1 - Math.pow(1 - t, 3);
      window.scrollTo(0, this.tween.fromY + (this.tween.toY - this.tween.fromY) * eased);
      if (t >= 1) this.tween = null;
    }

    if (this.locked) {
      if (Math.abs(window.scrollY - this.savedY) > 1) window.scrollTo(0, this.savedY);
      this.rawProgress = this.savedY / this.maxScroll;
      this.smoothProgress = this.rawProgress;
      return;
    }

    this.rawProgress = this.readRaw();
    const factor = 1 - Math.exp(-dt * 11);
    this.smoothProgress += (this.rawProgress - this.smoothProgress) * factor;
    if (Math.abs(this.rawProgress - this.smoothProgress) < 0.0002) {
      this.smoothProgress = this.rawProgress;
    }
  }

  /** 缓动滚动到目标进度(滑块跳转)。 */
  jumpTo(progress: number, duration = 950): void {
    const target = Math.min(1, Math.max(0, progress));
    this.tween = {
      fromY: window.scrollY,
      toY: target * this.maxScroll,
      start: performance.now(),
      duration,
    };
  }

  /** 立即跳转(截图/自动化)。 */
  jumpToImmediate(progress: number): void {
    this.tween = null;
    const target = Math.min(1, Math.max(0, progress));
    window.scrollTo(0, target * this.maxScroll);
    this.rawProgress = target;
    this.smoothProgress = target;
  }

  /** 浮层打开时锁定滚动。 */
  lock(): void {
    if (this.locked) return;
    this.locked = true;
    this.tween = null;
    this.savedY = window.scrollY;
    window.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('keydown', this.onKeyDown);
  }

  unlock(): void {
    if (!this.locked) return;
    this.locked = false;
    window.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('keydown', this.onKeyDown);
    window.scrollTo(0, this.savedY);
    this.smoothProgress = this.savedY / this.maxScroll;
    this.rawProgress = this.smoothProgress;
  }
}
