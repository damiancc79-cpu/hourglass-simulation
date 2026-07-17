"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

type HourglassSceneProps = {
  sandUpper: number;
  speed: number;
  running: boolean;
  isFlipping: boolean;
  showTrails: boolean;
  showMesh: boolean;
  resetSignal: number;
};

const FLOW_PARTICLES = 240;
const RESERVOIR_PARTICLES = 1800;

function grainTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const glow = context.createRadialGradient(32, 32, 1, 32, 32, 30);
  glow.addColorStop(0, "rgba(255,243,190,1)");
  glow.addColorStop(0.18, "rgba(255,201,96,.98)");
  glow.addColorStop(0.55, "rgba(223,142,42,.5)");
  glow.addColorStop(1, "rgba(223,142,42,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function brassMaterials() {
  const brass = new THREE.MeshStandardMaterial({
    color: 0xa8793f,
    metalness: 0.92,
    roughness: 0.27,
  });
  const brassDark = new THREE.MeshStandardMaterial({
    color: 0x4b301b,
    metalness: 0.88,
    roughness: 0.38,
  });
  const brassHighlight = new THREE.MeshStandardMaterial({
    color: 0xd3a866,
    metalness: 0.95,
    roughness: 0.2,
  });
  return { brass, brassDark, brassHighlight };
}

function addPlate(group: THREE.Group, y: number, materials: ReturnType<typeof brassMaterials>) {
  const plate = new THREE.Group();
  plate.position.y = y;

  const main = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 1.95, 0.28, 72), materials.brass);
  main.castShadow = true;
  main.receiveShadow = true;
  plate.add(main);

  const inset = new THREE.Mesh(new THREE.CylinderGeometry(1.72, 1.8, 0.16, 72), materials.brassDark);
  inset.position.y = y > 0 ? -0.17 : 0.17;
  inset.castShadow = true;
  plate.add(inset);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.76, 0.09, 18, 96), materials.brassHighlight);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = y > 0 ? 0.12 : -0.12;
  rim.castShadow = true;
  plate.add(rim);

  const innerRim = new THREE.Mesh(new THREE.TorusGeometry(1.46, 0.045, 14, 96), materials.brassDark);
  innerRim.rotation.x = Math.PI / 2;
  innerRim.position.y = y > 0 ? -0.145 : 0.145;
  plate.add(innerRim);

  group.add(plate);
}

function buildFrame() {
  const frame = new THREE.Group();
  const materials = brassMaterials();
  addPlate(frame, 2.88, materials);
  addPlate(frame, -2.88, materials);

  const postGeometry = new THREE.CylinderGeometry(0.075, 0.095, 5.42, 24);
  const collarGeometry = new THREE.CylinderGeometry(0.145, 0.145, 0.18, 28);
  const orbGeometry = new THREE.SphereGeometry(0.14, 24, 18);

  [45, 135, 225, 315].forEach((degrees, index) => {
    const angle = THREE.MathUtils.degToRad(degrees);
    const x = Math.cos(angle) * 1.57;
    const z = Math.sin(angle) * 1.57;
    const post = new THREE.Mesh(postGeometry, index % 2 ? materials.brass : materials.brassHighlight);
    post.position.set(x, 0, z);
    post.castShadow = true;
    post.receiveShadow = true;
    frame.add(post);

    [-2.56, 2.56].forEach((y) => {
      const collar = new THREE.Mesh(collarGeometry, materials.brassDark);
      collar.position.set(x, y, z);
      collar.castShadow = true;
      frame.add(collar);
      const orb = new THREE.Mesh(orbGeometry, materials.brassHighlight);
      orb.position.set(x, y + (y > 0 ? 0.18 : -0.18), z);
      orb.castShadow = true;
      frame.add(orb);
    });
  });

  const finialGeometry = new THREE.SphereGeometry(0.105, 20, 16);
  [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((angle) => {
    const x = Math.cos(angle) * 1.55;
    const z = Math.sin(angle) * 1.55;
    const finial = new THREE.Mesh(finialGeometry, materials.brassHighlight);
    finial.position.set(x, 3.09, z);
    finial.castShadow = true;
    frame.add(finial);
  });

  return frame;
}

function buildGlass() {
  const profile = [
    [-2.38, 0.68], [-2.30, 1.02], [-2.12, 1.32], [-1.76, 1.47],
    [-1.36, 1.43], [-0.94, 1.2], [-0.55, 0.74], [-0.2, 0.29],
    [0, 0.18], [0.2, 0.29], [0.55, 0.74], [0.94, 1.2],
    [1.36, 1.43], [1.76, 1.47], [2.12, 1.32], [2.30, 1.02], [2.38, 0.68],
  ].map(([y, radius]) => new THREE.Vector2(radius, y));

  const geometry = new THREE.LatheGeometry(profile, 96);
  geometry.computeVertexNormals();
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xd8eeee,
    metalness: 0,
    roughness: 0.035,
    transmission: 1,
    transparent: true,
    opacity: 0.42,
    thickness: 0.24,
    ior: 1.46,
    attenuationColor: new THREE.Color(0xbfd7d8),
    attenuationDistance: 3.6,
    clearcoat: 1,
    clearcoatRoughness: 0.045,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const glass = new THREE.Mesh(geometry, material);
  glass.renderOrder = 5;
  glass.castShadow = true;

  const capMaterial = material.clone();
  capMaterial.opacity = 0.32;
  [-2.37, 2.37].forEach((y) => {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.69, 0.69, 0.045, 72), capMaterial);
    cap.position.y = y;
    cap.renderOrder = 5;
    glass.add(cap);
  });

  const neck = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.024, 12, 64), capMaterial);
  neck.rotation.x = Math.PI / 2;
  glass.add(neck);

  const wireframe = new THREE.LineSegments(
    new THREE.WireframeGeometry(geometry),
    new THREE.LineBasicMaterial({ color: 0xd6b372, transparent: true, opacity: 0.13, depthWrite: false }),
  );
  wireframe.scale.setScalar(1.006);
  wireframe.visible = false;
  glass.add(wireframe);

  return { glass, wireframe };
}

function reservoirPoints(texture: THREE.Texture | null) {
  const material = new THREE.PointsMaterial({
    color: 0xffc45e,
    size: 0.043,
    map: texture,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  const upperRows: Array<{ x: number; y: number; z: number }> = [];
  for (let i = 0; i < RESERVOIR_PARTICLES; i += 1) {
    const layer = Math.pow(Math.random(), 0.72);
    const radiusAtLayer = 0.16 + layer * 1.02;
    const radius = Math.sqrt(Math.random()) * radiusAtLayer;
    const theta = Math.random() * Math.PI * 2;
    upperRows.push({
      x: Math.cos(theta) * radius,
      y: 0.2 + layer * 1.43 + (Math.random() - 0.5) * 0.025,
      z: Math.sin(theta) * radius,
    });
  }
  upperRows.sort((a, b) => a.y - b.y);
  const upperPositions = new Float32Array(RESERVOIR_PARTICLES * 3);
  upperRows.forEach((point, index) => upperPositions.set([point.x, point.y, point.z], index * 3));
  const upperGeometry = new THREE.BufferGeometry();
  upperGeometry.setAttribute("position", new THREE.BufferAttribute(upperPositions, 3));
  const upper = new THREE.Points(upperGeometry, material);

  const lowerPositions = new Float32Array(RESERVOIR_PARTICLES * 3);
  for (let i = 0; i < RESERVOIR_PARTICLES; i += 1) {
    const layer = Math.pow(Math.random(), 0.82);
    const radiusAtLayer = 1.16 * (1 - layer);
    const radius = Math.sqrt(Math.random()) * radiusAtLayer;
    const theta = Math.random() * Math.PI * 2;
    lowerPositions.set([
      Math.cos(theta) * radius,
      -2.2 + layer * 1.18 + (Math.random() - 0.5) * 0.02,
      Math.sin(theta) * radius,
    ], i * 3);
  }
  const lowerGeometry = new THREE.BufferGeometry();
  lowerGeometry.setAttribute("position", new THREE.BufferAttribute(lowerPositions, 3));
  const lower = new THREE.Points(lowerGeometry, material.clone());

  return { upper, lower };
}

export function HourglassScene(props: HourglassSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    propsRef.current = props;
  }, [props]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      setError(true);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("aria-hidden", "true");
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070809, 0.032);

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(6.2, 1.7, 8.3);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.enablePan = false;
    controls.minDistance = 7.1;
    controls.maxDistance = 12;
    controls.minPolarAngle = 0.65;
    controls.maxPolarAngle = 2.5;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.18;

    const pmrem = new THREE.PMREMGenerator(renderer);
    const environmentScene = new RoomEnvironment();
    const environment = pmrem.fromScene(environmentScene, 0.045).texture;
    scene.environment = environment;
    pmrem.dispose();
    environmentScene.dispose();

    const hemi = new THREE.HemisphereLight(0xcfe4e4, 0x2b180b, 1.7);
    scene.add(hemi);
    const key = new THREE.SpotLight(0xffd99a, 240, 25, 0.42, 0.55, 1.3);
    key.position.set(5.5, 7, 5.5);
    key.target.position.set(0, 0, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key, key.target);
    const rim = new THREE.PointLight(0xaedee5, 48, 15, 1.7);
    rim.position.set(-4.2, 2.4, -4.5);
    scene.add(rim);
    const amber = new THREE.PointLight(0xe89a32, 24, 8, 2);
    amber.position.set(0, -1.1, 2.1);
    scene.add(amber);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(12, 96),
      new THREE.MeshStandardMaterial({ color: 0x111211, metalness: 0.25, roughness: 0.72, transparent: true, opacity: 0.58 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3.06;
    floor.receiveShadow = true;
    scene.add(floor);

    const frame = buildFrame();
    const { glass, wireframe } = buildGlass();
    frame.add(glass);
    scene.add(frame);

    const sandMaterial = new THREE.MeshStandardMaterial({
      color: 0xdf972f,
      emissive: 0x3c1b03,
      emissiveIntensity: 0.38,
      metalness: 0.04,
      roughness: 0.77,
    });
    const upperSand = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 0.17, 1.43, 64, 12), sandMaterial);
    const lowerSand = new THREE.Mesh(new THREE.ConeGeometry(1.17, 1.18, 64, 12), sandMaterial.clone());
    upperSand.castShadow = true;
    upperSand.receiveShadow = true;
    lowerSand.castShadow = true;
    lowerSand.receiveShadow = true;
    scene.add(upperSand, lowerSand);

    const texture = grainTexture();
    const reservoirs = reservoirPoints(texture);
    reservoirs.upper.renderOrder = 4;
    reservoirs.lower.renderOrder = 4;
    scene.add(reservoirs.upper, reservoirs.lower);

    const flowPositions = new Float32Array(FLOW_PARTICLES * 3);
    const velocities = new Float32Array(FLOW_PARTICLES * 3);
    const seeds = new Float32Array(FLOW_PARTICLES);
    const resetParticle = (index: number, scatter = false) => {
      const offset = index * 3;
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.045;
      flowPositions[offset] = Math.cos(angle) * radius;
      flowPositions[offset + 1] = scatter ? -2.05 + Math.random() * 2.25 : 0.12 + Math.random() * 0.15;
      flowPositions[offset + 2] = Math.sin(angle) * radius;
      velocities[offset] = (Math.random() - 0.5) * 0.035;
      velocities[offset + 1] = -0.25 - Math.random() * 0.55;
      velocities[offset + 2] = (Math.random() - 0.5) * 0.035;
      seeds[index] = Math.random() * Math.PI * 2;
    };
    for (let index = 0; index < FLOW_PARTICLES; index += 1) resetParticle(index, true);

    const flowGeometry = new THREE.BufferGeometry();
    const flowAttribute = new THREE.BufferAttribute(flowPositions, 3);
    flowAttribute.setUsage(THREE.DynamicDrawUsage);
    flowGeometry.setAttribute("position", flowAttribute);
    const flowMaterial = new THREE.PointsMaterial({
      color: 0xffc45c,
      size: 0.062,
      map: texture,
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const flow = new THREE.Points(flowGeometry, flowMaterial);
    flow.renderOrder = 6;
    scene.add(flow);

    const trailPositions = new Float32Array(FLOW_PARTICLES * 6);
    const trailGeometry = new THREE.BufferGeometry();
    const trailAttribute = new THREE.BufferAttribute(trailPositions, 3);
    trailAttribute.setUsage(THREE.DynamicDrawUsage);
    trailGeometry.setAttribute("position", trailAttribute);
    const trails = new THREE.LineSegments(
      trailGeometry,
      new THREE.LineBasicMaterial({ color: 0xe7a43e, transparent: true, opacity: 0.17, depthWrite: false }),
    );
    scene.add(trails);

    const dustPositions = new Float32Array(260 * 3);
    for (let i = 0; i < 260; i += 1) {
      const radius = 3.5 + Math.random() * 4;
      const angle = Math.random() * Math.PI * 2;
      dustPositions.set([Math.cos(angle) * radius, (Math.random() - 0.5) * 7, Math.sin(angle) * radius], i * 3);
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    const dust = new THREE.Points(
      dustGeometry,
      new THREE.PointsMaterial({ color: 0xd0aa70, size: 0.025, transparent: true, opacity: 0.34, depthWrite: false }),
    );
    scene.add(dust);

    let animationFrame = 0;
    let previousTime = performance.now();
    let previousFlip = false;
    let flipStart = 0;
    let flipFrom = 0;
    let flipTarget = 0;
    let previousReset = propsRef.current.resetSignal;

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();
    setReady(true);

    const animate = (time: number) => {
      const currentProps = propsRef.current;
      const dt = Math.min((time - previousTime) / 1000, 0.035);
      previousTime = time;

      if (currentProps.resetSignal !== previousReset) {
        previousReset = currentProps.resetSignal;
        camera.position.set(6.2, 1.7, 8.3);
        controls.target.set(0, 0, 0);
        frame.rotation.z = 0;
        flipTarget = 0;
        for (let index = 0; index < FLOW_PARTICLES; index += 1) resetParticle(index, true);
      }

      if (currentProps.isFlipping && !previousFlip) {
        flipStart = time;
        flipFrom = frame.rotation.z;
        flipTarget += Math.PI;
      }
      previousFlip = currentProps.isFlipping;
      if (currentProps.isFlipping) {
        const raw = Math.min(1, (time - flipStart) / 900);
        const eased = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;
        frame.rotation.z = THREE.MathUtils.lerp(flipFrom, flipTarget, eased);
      } else {
        frame.rotation.z = flipTarget;
      }

      const upper = THREE.MathUtils.clamp(currentProps.sandUpper, 0, 1);
      const lower = 1 - upper;
      const upperHeight = Math.max(0.001, Math.pow(upper, 0.47));
      const upperRadius = Math.max(0.08, Math.pow(upper, 0.34));
      upperSand.visible = upper > 0.002;
      upperSand.scale.set(upperRadius, upperHeight, upperRadius);
      upperSand.position.y = 0.19 + (1.43 * upperHeight) / 2;

      const lowerHeight = Math.max(0.001, Math.pow(lower, 0.5));
      const lowerRadius = Math.max(0.06, Math.pow(lower, 0.34));
      lowerSand.visible = lower > 0.002;
      lowerSand.scale.set(lowerRadius, lowerHeight, lowerRadius);
      lowerSand.position.y = -2.2 + (1.18 * lowerHeight) / 2;
      reservoirs.upper.geometry.setDrawRange(0, Math.floor(RESERVOIR_PARTICLES * Math.pow(upper, 0.72)));
      reservoirs.lower.geometry.setDrawRange(0, Math.floor(RESERVOIR_PARTICLES * Math.pow(lower, 0.72)));

      const flowing = currentProps.running && !currentProps.isFlipping && upper > 0.001;
      flow.visible = flowing;
      trails.visible = flowing && currentProps.showTrails;
      wireframe.visible = currentProps.showMesh;

      if (flowing) {
        const physicsStep = dt * currentProps.speed;
        const moundHeight = 1.18 * lowerHeight;
        const moundRadius = 1.17 * lowerRadius;
        for (let index = 0; index < FLOW_PARTICLES; index += 1) {
          const offset = index * 3;
          velocities[offset + 1] -= 3.35 * physicsStep;
          velocities[offset] += Math.sin(time * 0.0025 + seeds[index]) * 0.006 * physicsStep;
          velocities[offset + 2] += Math.cos(time * 0.0022 + seeds[index]) * 0.006 * physicsStep;
          flowPositions[offset] += velocities[offset] * physicsStep;
          flowPositions[offset + 1] += velocities[offset + 1] * physicsStep;
          flowPositions[offset + 2] += velocities[offset + 2] * physicsStep;

          const radial = Math.hypot(flowPositions[offset], flowPositions[offset + 2]);
          const collisionHeight = -2.2 + moundHeight * Math.max(0, 1 - radial / Math.max(0.08, moundRadius));
          if (flowPositions[offset + 1] <= collisionHeight) resetParticle(index);

          const trailOffset = index * 6;
          trailPositions[trailOffset] = flowPositions[offset];
          trailPositions[trailOffset + 1] = flowPositions[offset + 1];
          trailPositions[trailOffset + 2] = flowPositions[offset + 2];
          trailPositions[trailOffset + 3] = flowPositions[offset] - velocities[offset] * 0.065;
          trailPositions[trailOffset + 4] = flowPositions[offset + 1] - velocities[offset + 1] * 0.065;
          trailPositions[trailOffset + 5] = flowPositions[offset + 2] - velocities[offset + 2] * 0.065;
        }
        flowAttribute.needsUpdate = true;
        trailAttribute.needsUpdate = true;
      }

      dust.rotation.y += dt * 0.018;
      dust.rotation.x = Math.sin(time * 0.00013) * 0.05;
      controls.autoRotate = !currentProps.isFlipping;
      controls.update();
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      texture?.dispose();
      environment.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className="webgl-shell" aria-label="Real-time 3D hourglass model with physically simulated sand">
      <div className="webgl-canvas" ref={mountRef} />
      {!ready && !error && <div className="model-loading"><i /><span>Calibrating model</span></div>}
      {error && <div className="model-error"><b>3D unavailable</b><span>Enable WebGL to view the hourglass model.</span></div>}
      <div className="render-badge"><i /> WEBGL / LIVE</div>
    </div>
  );
}
