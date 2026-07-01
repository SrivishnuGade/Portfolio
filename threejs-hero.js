// ──────────────────────────────────────────────────────────────────────────────
// threejs-hero.js
// Portfolio hero: Interactive particle network + rotating wireframe icosahedra
// Three separate particle groups (cyan/violet/white) — no vertexColors conflict
// ──────────────────────────────────────────────────────────────────────────────

(function initHeroThree() {
  'use strict';

  const container = document.getElementById('hero-canvas-container');
  if (!container || typeof THREE === 'undefined') return;

  // ── Config ────────────────────────────────────────────────────────────────
  const mobile   = window.innerWidth < 768;
  const N        = mobile ? 55 : 95;       // total particle count
  const CONN_SQ  = mobile ? 4225 : 6400;   // 65² or 80² – connection dist²
  const SPEED    = 0.055;
  const REPEL_R  = 68;
  const REPEL_F  = 0.60;
  const REPEL_SQ = REPEL_R * REPEL_R;

  // ── Scene / Camera / Renderer ─────────────────────────────────────────────
  let W = container.offsetWidth;
  let H = container.offsetHeight;

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 2000);
  camera.position.z = 230;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  // ── Circular sprite texture (soft glowing dot) ────────────────────────────
  const sc  = document.createElement('canvas');
  sc.width  = 64;
  sc.height = 64;
  const sctx = sc.getContext('2d');
  const sg   = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  sg.addColorStop(0,    'rgba(255,255,255,1.0)');
  sg.addColorStop(0.4,  'rgba(255,255,255,0.55)');
  sg.addColorStop(1,    'rgba(255,255,255,0.0)');
  sctx.fillStyle = sg;
  sctx.fillRect(0, 0, 64, 64);
  const spriteTex = new THREE.CanvasTexture(sc);

  // ── Helper: build a PointsMaterial for a given hex color ─────────────────
  function makePointMat(hex) {
    return new THREE.PointsMaterial({
      size:            4.8,
      map:             spriteTex,
      color:           hex,
      transparent:     true,
      opacity:         0.88,
      depthWrite:      false,
      blending:        THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
  }

  // ── Background Wireframe Icosahedra ───────────────────────────────────────
  function makeIco(radius, detail, color, opacity, px, py, pz) {
    const geo   = new THREE.IcosahedronGeometry(radius, detail);
    const edges = new THREE.EdgesGeometry(geo);
    const mesh  = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending:    THREE.AdditiveBlending,
      depthWrite:  false,
    }));
    mesh.position.set(px, py, pz);
    scene.add(mesh);
    return mesh;
  }

  const ico1 = makeIco(155, 3, 0x8b5cf6, 0.065,  W * 0.18, -10,       -100);
  const ico2 = makeIco(70,  2, 0x06b6d4, 0.05,  -W * 0.22,  H * 0.12, -60);

  // ── Particle Data ─────────────────────────────────────────────────────────
  // Split N particles into groups: 58% cyan, 29% violet, 13% white
  const nCyan  = Math.round(N * 0.58);
  const nVio   = Math.round(N * 0.29);
  const nWhite = N - nCyan - nVio;

  // Flat arrays for ALL particles (shared velocity array indexed 0..N-1)
  const allPosX = new Float32Array(N);
  const allPosY = new Float32Array(N);
  const allPosZ = new Float32Array(N);
  const allVelX = new Float32Array(N);
  const allVelY = new Float32Array(N);

  // Per-group position buffers (subsets of the particle array)
  const groups = [
    { count: nCyan,  color: 0x06b6d4, start: 0 },
    { count: nVio,   color: 0x8b5cf6, start: nCyan },
    { count: nWhite, color: 0xdde8f0, start: nCyan + nVio },
  ];

  // Initialise all N particles
  for (let i = 0; i < N; i++) {
    allPosX[i] = (Math.random() - 0.5) * W * 0.46;
    allPosY[i] = (Math.random() - 0.5) * H * 0.46;
    allPosZ[i] = (Math.random() - 0.5) * 55;
    allVelX[i] = (Math.random() - 0.5) * SPEED;
    allVelY[i] = (Math.random() - 0.5) * SPEED;
  }

  // Build Three.js Points objects per group
  const groupMeshes = groups.map(({ count, color, start }) => {
    const buf = new Float32Array(count * 3);
    for (let k = 0; k < count; k++) {
      const i = start + k;
      buf[k * 3]     = allPosX[i];
      buf[k * 3 + 1] = allPosY[i];
      buf[k * 3 + 2] = allPosZ[i];
    }
    const geo  = new THREE.BufferGeometry();
    const attr = new THREE.BufferAttribute(buf, 3).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', attr);
    const pts  = new THREE.Points(geo, makePointMat(color));
    scene.add(pts);
    return { attr, start, count };
  });

  // ── Lines (pre-allocated, drawn across ALL particles) ─────────────────────
  const maxLineBuf = N * N * 3;
  const lineBuf    = new Float32Array(maxLineBuf);
  const lineGeo    = new THREE.BufferGeometry();
  const linePosA   = new THREE.BufferAttribute(lineBuf, 3).setUsage(THREE.DynamicDrawUsage);
  lineGeo.setAttribute('position', linePosA);
  const lineMesh = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
    color:       0x06b6d4,
    transparent: true,
    opacity:     0.13,
    blending:    THREE.AdditiveBlending,
    depthWrite:  false,
  }));
  scene.add(lineMesh);

  // ── Mouse ─────────────────────────────────────────────────────────────────
  let rawMX = 0, rawMY = 0;
  let smMX  = 0, smMY  = 0;

  document.addEventListener('mousemove', (e) => {
    const r = container.getBoundingClientRect();
    rawMX = ((e.clientX - r.left) / W - 0.5) * W * 0.46;
    rawMY = -((e.clientY - r.top)  / H - 0.5) * H * 0.46;
  });

  // ── Animation Loop ────────────────────────────────────────────────────────
  function tick() {
    requestAnimationFrame(tick);

    smMX += (rawMX - smMX) * 0.065;
    smMY += (rawMY - smMY) * 0.065;

    const hW = W * 0.26;
    const hH = H * 0.26;

    // Update all particle world positions
    for (let i = 0; i < N; i++) {
      let px = allPosX[i] + allVelX[i];
      let py = allPosY[i] + allVelY[i];

      // Mouse repulsion
      const dx = px - smMX, dy = py - smMY;
      const d2 = dx * dx + dy * dy;
      if (d2 < REPEL_SQ && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const f = ((REPEL_R - d) / REPEL_R) * REPEL_F;
        px += (dx / d) * f;
        py += (dy / d) * f;
      }

      // Boundary wrap
      if (px >  hW) px = -hW;
      if (px < -hW) px =  hW;
      if (py >  hH) py = -hH;
      if (py < -hH) py =  hH;

      allPosX[i] = px;
      allPosY[i] = py;
    }

    // Push updated positions to each group's BufferAttribute
    for (const { attr, start, count } of groupMeshes) {
      for (let k = 0; k < count; k++) {
        const i = start + k;
        attr.setXYZ(k, allPosX[i], allPosY[i], allPosZ[i]);
      }
      attr.needsUpdate = true;
    }

    // Rebuild connection lines using allPos arrays
    let vi = 0;
    for (let i = 0; i < N; i++) {
      const ax = allPosX[i], ay = allPosY[i], az = allPosZ[i];
      for (let j = i + 1; j < N; j++) {
        const ddx = ax - allPosX[j], ddy = ay - allPosY[j];
        if (ddx * ddx + ddy * ddy < CONN_SQ) {
          linePosA.setXYZ(vi++, ax, ay, az);
          linePosA.setXYZ(vi++, allPosX[j], allPosY[j], allPosZ[j]);
        }
      }
    }
    lineGeo.setDrawRange(0, vi);
    linePosA.needsUpdate = true;

    // Rotate icosahedra
    ico1.rotation.x += 0.00070;
    ico1.rotation.y += 0.00140;
    ico2.rotation.x += 0.00110;
    ico2.rotation.y -= 0.00090;

    // Camera parallax
    camera.position.x += (smMX * 0.010 - camera.position.x) * 0.04;
    camera.position.y += (smMY * 0.010 - camera.position.y) * 0.04;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
  }

  tick();

  // ── Resize ────────────────────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    W = container.offsetWidth;
    H = container.offsetHeight;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H);
    ico1.position.set(W * 0.18, -10, -100);
    ico2.position.set(-W * 0.22, H * 0.12, -60);
  });

})();
