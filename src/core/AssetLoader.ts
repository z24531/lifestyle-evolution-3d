import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';

/**
 * 资产加载器:glb 加载 + 解码 + 相邻时代预加载。
 */
export class AssetLoader {
  private readonly loader = new GLTFLoader();

  async load(url: string): Promise<GLTF> {
    // TODO: 缓存 + meshopt/draco 解码 + 预加载队列
    return this.loader.loadAsync(url);
  }
}
