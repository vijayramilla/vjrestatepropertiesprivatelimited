import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const zones = [
  ['N',   'Water', 0x1e6fd9, 'Career & Money'],
  ['NNE', 'Water', 0x3d8bff, 'Health & Immunity'],
  ['NE',  'Water', 0x66c2ff, 'Clarity & Wisdom'],
  ['ENE', 'Air',   0x35c96b, 'Fun & Refreshment'],
  ['E',   'Air',   0x2aa657, 'Social Connections'],
  ['ESE', 'Air',   0x7fd99a, 'Analysis & Churning'],
  ['SE',  'Fire',  0xe03131, 'Fire & Cash Flow'],
  ['SSE', 'Fire',  0xff6b4a, 'Power & Confidence'],
  ['S',   'Fire',  0xc92a2a, 'Fame & Relaxation'],
  ['SSW', 'Earth', 0xd9a520, 'Disposal & Expenditure'],
  ['SW',  'Earth', 0xf2c14e, 'Relationships & Skills'],
  ['WSW', 'Earth', 0xe8b83a, 'Education & Savings'],
  ['W',   'Space', 0xb8b8c8, 'Gains & Profits'],
  ['WNW', 'Space', 0x9a9aad, 'Detox & Depression'],
  ['NW',  'Space', 0xcfcfe0, 'Support & Banking'],
  ['NNW', 'Space', 0xdedeef, 'Attraction'],
] as const;

const SEG = Math.PI * 2 / 16;

function makeLabel(text: string, sub: string) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 160;
  const x = c.getContext('2d')!;
  x.fillStyle = '#fff'; x.textAlign = 'center';
  x.font = 'bold 64px sans-serif'; x.fillText(text, 256, 64);
  x.font = '34px sans-serif'; x.fillStyle = '#ddd'; x.fillText(sub, 256, 120);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(c), transparent: true }));
  s.scale.set(4, 1.25, 1);
  return s;
}

export default function VastuEnergySphere() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111118);
    const camera = new THREE.PerspectiveCamera(50, el.clientWidth / el.clientHeight, 0.1, 1000);
    camera.position.set(0, 14, 14);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(10, 20, 10);
    scene.add(dir);

    const group = new THREE.Group();

    zones.forEach((z, i) => {
      const [name, element, color, meaning] = z;
      const thetaStart = Math.PI / 2 - (i * SEG) - SEG / 2;
      const h = 0.6 + (i % 2) * 0.15;
      const geo = new THREE.CylinderGeometry(6, 6, h, 32, 1, false, thetaStart, SEG);
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.15 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = h / 2;
      (mesh as any).userData = { name, element, meaning };
      group.add(mesh);

      const midAngle = thetaStart + SEG / 2;
      const label = makeLabel(name, element);
      label.position.set(Math.cos(midAngle) * 7.4, 1.2, -Math.sin(midAngle) * 7.4);
      group.add(label);
    });

    const center = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8, 1.8, 1, 48),
      new THREE.MeshStandardMaterial({ color: 0xfff3bf, emissive: 0x8a6d00, emissiveIntensity: 0.4 }),
    );
    center.position.y = 0.5;
    group.add(center);
    const centerLabel = makeLabel('Brahmasthan', 'Space/Center');
    centerLabel.position.set(0, 2, 0);
    group.add(centerLabel);

    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0.2, 0), 9, 0xff4444, 1, 0.6);
    group.add(arrow);
    scene.add(group);

    const ray = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const infoEl = document.createElement('div');
    infoEl.style.cssText = 'position:absolute;top:10px;left:10px;color:#fff;background:rgba(0,0,0,.6);padding:10px 14px;border-radius:8px;font-size:13px;pointer-events:none;z-index:10';
    infoEl.innerHTML = '<b>Vastu 16-Zone Energy Map</b><br>Drag: rotate | Scroll: zoom | Right-drag: pan';
    el.appendChild(infoEl);

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      mouse.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(mouse, camera);
      const hit = ray.intersectObjects(group.children)
        .find(h => (h.object as any).userData?.name);
      infoEl.innerHTML = hit
        ? `<b>${(hit.object as any).userData.name}</b> (${(hit.object as any).userData.element})<br>${(hit.object as any).userData.meaning}`
        : '<b>Vastu 16-Zone Energy Map</b><br>Drag: rotate | Scroll: zoom | Right-drag: pan';
    };

    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };

    el.addEventListener('mousemove', onMove);
    window.addEventListener('resize', onResize);

    let frame: number;
    function animate() {
      frame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', onResize);
      el.removeChild(renderer.domElement);
      el.removeChild(infoEl);
      renderer.dispose();
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full rounded-2xl overflow-hidden" />;
}
