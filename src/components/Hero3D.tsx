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
    camera.position.set(0, 7, 31); camera.lookAt(0, 3, 0);

    const world = new THREE.Group(); scene.add(world);
    const island = new THREE.Group(); world.add(island);

    const mat = (c: THREE.Color, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.08, ...o });
    const add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; island.add(mesh); return mesh;
    };

    // البرج: صورة العمارة على أوجه برج زجاجي يدور (4 جهات) مع لمعة زجاج
    const tex = new THREE.TextureLoader().load('/img/tower-3d.jpg', () => { /* جاهزة */ });
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const TW = 4.2, TH = TW * 2; // نسبة الصورة 1:2
    const face = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.25, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08 });
    const cap = new THREE.MeshStandardMaterial({ color: brand, roughness: 0.3, metalness: 0.5 });
    const tower = new THREE.Mesh(new THREE.BoxGeometry(TW, TH, TW), [face, face, cap, cap, face, face]);
    tower.position.y = TH / 2 - 0.5; tower.castShadow = true; island.add(tower);
    tower.add(new THREE.LineSegments(new THREE.EdgesGeometry(tower.geometry), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })));
    // قاعدة لامعة رفيعة + هالة
    const base = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 0.25, 64), mat(white, { roughness: 0.2, metalness: 0.3 }));
    base.position.y = -0.62; base.receiveShadow = true; island.add(base);
    const halo = new THREE.Mesh(new THREE.RingGeometry(4.7, 5.3, 64), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
    halo.rotation.x = -Math.PI / 2; halo.position.y = -0.48; island.add(halo);

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
      camera.position.z = w / h < 0.9 ? 46 : 31; camera.updateProjectionMatrix();
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
      tex.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, [palette]);

  return <div ref={ref} className={className} aria-hidden="true" />;
}
