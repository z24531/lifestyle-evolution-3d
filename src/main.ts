import * as THREE from 'three';
import { CameraRig } from './core/CameraRig';
import { ScrollController } from './core/ScrollController';
import erasData from './content/eras.json';

function bootstrap(): void {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) throw new Error('#app 未找到');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#14161A');

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 8, 6);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  app.appendChild(renderer.domElement);

  // 占位体:用第一个时代的主题色,验证工具链与滚动驱动
  const color = erasData.eras[0]?.themeColor ?? '#ffffff';
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 1.5, 1.5),
    new THREE.MeshBasicMaterial({ color }),
  );
  scene.add(mesh);

  const rig = new CameraRig(camera, {
    top: new THREE.Vector3(0, 8, 6),
    bottom: new THREE.Vector3(0, -8, 6),
  });
  const scroll = new ScrollController();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  function animate(): void {
    requestAnimationFrame(animate);
    rig.setProgress(scroll.progress);
    mesh.rotation.y += 0.01;
    renderer.render(scene, camera);
  }
  animate();
}

bootstrap();
