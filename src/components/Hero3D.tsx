// مشهد 3D واضح: جزيرة عقارية عائمة (أبراج وفلل) تدور وتطفو وتتحرك مع الماوس. الألوان من لوحة الموقع.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { usePalette } from '@/lib/palette';

function cssColor(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return new THREE.Color(v || fallback);
}

export default function Hero3D({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const palette = usePalette();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const brand = cssColor('--brand', '#20309a'), accent = cssColor('--accent', '#bb232b'), deep = cssColor('--deep', '#20309a'), paper = cssColor('--paper', '#ffffff');
    const white = new THREE.Color('#ffffff');

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 11, 32); camera.lookAt(0, 1.5, 0);

    const world = new THREE.Group(); scene.add(world);
    const island = new THREE.Group(); world.add(island);

    const mat = (c: THREE.Color, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.08, ...o });
    const add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; island.add(mesh); return mesh;
    };

    // القاعدة (جزيرة دائرية بطبقتين)
    add(new THREE.CylinderGeometry(6.2, 5.4, 0.7, 64), mat(white), 0, -0.35, 0);
    add(new THREE.CylinderGeometry(5.4, 3.2, 1.6, 64), mat(deep, { roughness: 0.6 }), 0, -1.5, 0);
    add(new THREE.CylinderGeometry(5.9, 5.9, 0.12, 64), mat(brand.clone().lerp(white, 0.55)), 0, 0.05, 0);

    // نافذة: نسيج خطوط أفقية فاتحة
    const c = document.createElement('canvas'); c.width = 64; c.height = 128;
    const g = c.getContext('2d')!; g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 128);
    g.fillStyle = 'rgba(30,40,90,.22)';
    for (let y = 10; y < 128; y += 20) for (let x = 8; x < 64; x += 18) g.fillRect(x, y, 10, 12);
    const winTex = new THREE.CanvasTexture(c); winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping; winTex.colorSpace = THREE.SRGBColorSpace;
    const tower = (w: number, h: number, d: number, col: THREE.Color, x: number, z: number) => {
      const t = winTex.clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, Math.round(w)), Math.max(1, Math.round(h / 1.5)));
      add(new THREE.BoxGeometry(w, h, d), mat(col, { map: t }), x, h / 2, z);
      add(new THREE.BoxGeometry(w + 0.12, 0.14, d + 0.12), mat(white), x, h + 0.07, z);
    };
    tower(1.5, 6.2, 1.5, brand, -0.4, -0.6);      // البرج الرئيسي
    tower(1.2, 4.2, 1.2, white, 1.7, -1.4);
    tower(1.3, 3.2, 1.3, accent, -2.4, 0.2);
    tower(1.0, 2.4, 1.0, deep.clone().lerp(white, 0.2), 2.4, 0.9);
    tower(1.1, 1.8, 1.1, brand.clone().lerp(white, 0.4), -1.6, 2.2);
    tower(0.9, 2.9, 0.9, white, 0.8, 2.0);
    // فيلا: صندوق + سقف هرمي
    add(new THREE.BoxGeometry(1.6, 0.9, 1.3), mat(white), -3.3, 0.45, -2.0);
    const roof = add(new THREE.ConeGeometry(1.35, 0.8, 4), mat(accent), -3.3, 1.3, -2.0); roof.rotation.y = Math.PI / 4;
    // أشجار بسيطة
    for (const [x, z] of [[3.6, -1.2], [3.1, 2.3], [-0.2, 3.6], [-3.9, 1.8], [1.6, 3.7]] as const) {
      add(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 8), mat(deep), x, 0.3, z);
      add(new THREE.SphereGeometry(0.38, 20, 16), mat(accent.clone().lerp(brand, 0.5).lerp(white, 0.25)), x, 0.85, z);
    }

    // حلقات تدور حول الجزيرة + مكعبات عائمة
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(7.6, 0.05, 12, 120), mat(brand)); ring1.rotation.x = Math.PI / 2.2; world.add(ring1);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(8.6, 0.035, 12, 120), mat(accent)); ring2.rotation.x = Math.PI / 1.8; ring2.rotation.y = 0.5; world.add(ring2);
    const floaters: THREE.Mesh[] = [];
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), mat(i % 3 === 0 ? accent : i % 3 === 1 ? brand : white));
      const a = (i / 9) * Math.PI * 2; m.position.set(Math.cos(a) * 7.8, 1 + (i % 4) * 0.9, Math.sin(a) * 7.8); m.castShadow = true; world.add(m); floaters.push(m);
    }

    scene.add(new THREE.HemisphereLight(0xffffff, deep.clone().lerp(white, 0.5), 1.15));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(6, 12, 8); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9 }); scene.add(sun);
    const fill = new THREE.PointLight(accent, 30, 30); fill.position.set(-8, 4, 6); scene.add(fill);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el; if (!w || !h) return;
      renderer.setSize(w, h, false); camera.aspect = w / h;
      camera.position.z = w / h < 0.9 ? 44 : 32; camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(el);

    let mx = 0, my = 0, sy = 0;
    const onMove = (e: PointerEvent) => { mx = (e.clientX / innerWidth - 0.5) * 2; my = (e.clientY / innerHeight - 0.5) * 2; };
    const onScroll = () => { sy = Math.min(scrollY / 700, 1); };
    addEventListener('pointermove', onMove); addEventListener('scroll', onScroll, { passive: true });

    let raf = 0, visible = true; const t0 = performance.now();
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }); io.observe(el);
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible) return;
      const t = (now - t0) / 1000;
      if (!reduce) {
        island.rotation.y = t * 0.45 + mx * 0.6 + sy * 1.5;            // دوران واضح
        world.position.y = Math.sin(t * 1.2) * 0.3;                     // طفو
        ring1.rotation.z = t * 0.5; ring2.rotation.z = -t * 0.35;
        floaters.forEach((m, i) => { m.rotation.x = t + i; m.rotation.y = t * 0.8 + i; m.position.y = 1 + (i % 4) * 0.9 + Math.sin(t * 1.5 + i) * 0.35; });
      }
      world.rotation.x = 0.12 + my * 0.12;
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); removeEventListener('pointermove', onMove); removeEventListener('scroll', onScroll);
      scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); const mt = m.material as THREE.Material | THREE.Material[] | undefined; (Array.isArray(mt) ? mt : mt ? [mt] : []).forEach((x) => x.dispose()); });
      winTex.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, [palette]);

  return <div ref={ref} className={className} aria-hidden="true" />;
}
