/**
 * 入口装配:Three.js 场景 + 滚动/相机时间轴 + DOM UI。
 * 内容全部来自 src/content(eras.json + scenes/*.json),这里不写任何时代专属逻辑。
 */
import * as THREE from 'three';
import './ui/styles.css';
import { eras, checkContentIntegrity } from './content';
import type { KnowledgePoint } from './types/content';
import { SceneRenderer } from './scene/SceneRenderer';
import { Environment } from './scene/Environment';
import { TimelineMap } from './core/TimelineMap';
import { CameraRig } from './core/CameraRig';
import { ScrollController } from './core/ScrollController';
import { projectHotspots } from './core/HotspotProjector';
import { createIntroCard } from './ui/IntroCard';
import { createInfoBar } from './ui/InfoBar';
import type { EraInfo } from './ui/InfoBar';
import { createTimelineSlider } from './ui/TimelineSlider';
import { createHotspotLayer } from './ui/HotspotLayer';
import { createDataModal } from './ui/DataModal';
import { createEndCard } from './ui/EndCard';
import { createAutoTour } from './ui/AutoTour';

const INTRO_HIDE_PROGRESS = 0.045;
const END_SHOW_PROGRESS = 0.955;
/** 自动导览完整走完的秒数。 */
const TOUR_SECONDS = 42;

function bootstrap(): void {
  const app = document.querySelector<HTMLDivElement>('#app');
  const uiRoot = document.querySelector<HTMLDivElement>('#ui-root');
  if (!app || !uiRoot) throw new Error('缺少 #app / #ui-root 容器');

  const issues = checkContentIntegrity();
  if (issues.length > 0) {
    console.warn(`[content] 内容自检发现 ${issues.length} 个问题:`, issues);
  }

  // ---------- Three.js ----------
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.4, 900);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  app.appendChild(renderer.domElement);

  const environment = new Environment(scene);
  const sceneRenderer = new SceneRenderer(scene, { schemaVersion: 1, eras: [...eras] });
  sceneRenderer.build();
  environment.follow(0);

  const timeline = new TimelineMap(eras.length);
  const rig = new CameraRig(camera, timeline);
  const scroll = new ScrollController();

  // ---------- UI ----------
  const intro = createIntroCard(uiRoot, {
    title: '人类生活方式的变迁',
    subtitle: '从茹毛饮血到智能时代 · 一场沿时间之柱向下的旅程',
    hint: '向下滚动开始探索',
  });
  const infoBar = createInfoBar(uiRoot);
  const hotspots = createHotspotLayer(uiRoot, openKnowledgePoint);
  const slider = createTimelineSlider(
    uiRoot,
    eras.map((era) => ({ title: era.title, themeColor: era.themeColor })),
    (index) => scroll.jumpTo(timeline.progressForEra(index)),
  );
  const modal = createDataModal(uiRoot);
  const endCard = createEndCard(uiRoot, () => {
    touring = false;
    autoTour.setPlaying(false);
    scroll.jumpTo(0, 1400);
  });
  const autoTour = createAutoTour(uiRoot, () => {
    touring = !touring;
    autoTour.setPlaying(touring);
  });

  modal.onClose(() => scroll.unlock());

  // ---------- 状态 ----------
  let activeEraIndex = -1;
  let activeKnowledge: KnowledgePoint[] = [];
  let currentEraInfo: EraInfo | null = null;
  let infoBarVisible = false;
  let sliderIndex = -2;
  let touring = false;
  let ready = false;

  function setActiveEra(index: number): void {
    if (index === activeEraIndex) return;
    const era = eras[index];
    if (!era) return;
    activeEraIndex = index;
    activeKnowledge = era.knowledgePoints;
    currentEraInfo = {
      index: era.index,
      total: eras.length,
      title: era.title,
      subtitle: era.subtitle,
      themeColor: era.themeColor,
    };
    if (infoBarVisible) infoBar.setEra(currentEraInfo);
    hotspots.setItems(
      activeKnowledge.map((kp) => ({
        kpId: kp.id,
        title: kp.title,
        themeColor: era.themeColor,
      })),
    );
    hotspots.sync([]);
  }

  /** 序章阶段隐藏左下角信息卡,进入第一个时代后再出现。 */
  function syncInfoBar(introPhase: boolean): void {
    if (introPhase) {
      if (infoBarVisible) {
        infoBar.hide();
        infoBarVisible = false;
      }
      return;
    }
    if (!infoBarVisible && currentEraInfo) {
      infoBar.setEra(currentEraInfo);
      infoBarVisible = true;
    }
  }

  function openKnowledgePoint(kpId: string): void {
    const era = eras[activeEraIndex];
    const kp = activeKnowledge.find((item) => item.id === kpId);
    if (!era || !kp) return;
    if (modal.isOpen()) return;
    scroll.lock();
    modal.open({
      title: kp.title,
      body: kp.body,
      themeColor: era.themeColor,
      eraTitle: era.title,
      data: kp.data,
    });
  }

  // ---------- 主循环 ----------
  let last = performance.now();
  function frame(now: number): void {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;

    if (touring && !scroll.isLocked) {
      window.scrollBy(0, (scroll.maxScroll / TOUR_SECONDS) * dt);
      if (scroll.progress >= 0.999) {
        touring = false;
        autoTour.setPlaying(false);
      }
    }

    scroll.update(now);
    const progress = scroll.progress;
    const sample = timeline.sample(progress);

    rig.apply(sample.f);
    environment.follow(sample.eraIndex);
    environment.update(camera);

    setActiveEra(sample.eraIndex);

    // UI 同步
    const introPhase = progress < INTRO_HIDE_PROGRESS;
    intro.setVisible(introPhase);
    syncInfoBar(progress < INTRO_HIDE_PROGRESS * 0.7);
    // 序章阶段滑块不高亮任何时代(设计文档 §5/§6.1)
    const desiredSliderIndex = introPhase ? -1 : sample.eraIndex;
    if (sliderIndex !== desiredSliderIndex) {
      sliderIndex = desiredSliderIndex;
      slider.setActive(desiredSliderIndex);
    }
    slider.setProgress(progress);
    endCard.setVisible(progress > END_SHOW_PROGRESS && !modal.isOpen());
    autoTour.setVisible(!introPhase);

    const opacity = sample.hotspotOpacity;
    if (opacity > 0.03) {
      const targets = sceneRenderer.hotspotTargets(sample.eraIndex);
      const frames = projectHotspots(camera, targets, window.innerWidth, window.innerHeight).map(
        (item) => ({ ...item, scale: opacity }),
      );
      hotspots.sync(frames);
    } else {
      hotspots.sync([]);
    }

    renderer.render(scene, camera);

    if (!ready) {
      ready = true;
      dev.ready = true;
      document.getElementById('loading')?.classList.add('is-hidden');
    }
  }
  requestAnimationFrame(frame);

  // ---------- 窗口尺寸 ----------
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ---------- 自动化/截图钩子(供 scripts/screenshot.mjs 与人工调试) ----------
  const dev = {
    ready: false,
    setProgress(progress: number): void {
      scroll.jumpToImmediate(progress);
    },
    jumpTo(index: number): void {
      scroll.jumpToImmediate(timeline.progressForEra(index));
    },
    progressForEra(index: number): number {
      return timeline.progressForEra(index);
    },
    state(): { progress: number; eraIndex: number; f: number } {
      return {
        progress: scroll.progress,
        eraIndex: activeEraIndex,
        f: timeline.keyframeAt(scroll.progress),
      };
    },
    info(): { calls: number; triangles: number; geometries: number } {
      return {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
      };
    },
  };
  (window as unknown as { __DEV__: typeof dev }).__DEV__ = dev;

  // ---------- 调试/截图:?p=0.17 或 ?era=1 直接定位 ----------
  const params = new URLSearchParams(window.location.search);
  const progressParam = params.get('p');
  const eraParam = params.get('era');
  if (progressParam !== null && Number.isFinite(Number(progressParam))) {
    scroll.jumpToImmediate(Number(progressParam));
  } else if (eraParam !== null && Number.isFinite(Number(eraParam))) {
    scroll.jumpToImmediate(timeline.progressForEra(Number(eraParam)));
  }
}

bootstrap();
