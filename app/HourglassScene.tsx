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

const FLOW_PARTICLES = 1040;
const RESERVOIR_PARTICLES = 9600;
const CHAMBER_CANDIDATES = 14400;

type ChamberState = {
  candidates: Float32Array;
  order: number[];
  points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  positions: Float32Array;
  previousDrawCount: number;
  projections: Float32Array;
  targets: Float32Array;
  velocities: Float32Array;
};

function glassInteriorRadius(y: number) {
  const value = Math.abs(y);
  const profile = [
    [0, 0.16], [0.2, 0.27], [0.55, 0.7], [0.94, 1.15],
    [1.36, 1.37], [1.76, 1.4], [2.12, 1.25], [2.3, 0.93], [2.36, 0.6],
  ];
  for (let index = 1; index < profile.length; index += 1) {
    const [nextY, nextRadius] = profile[index];
    const [previousY, previousRadius] = profile[index - 1];
    if (value <= nextY) {
      const progress = (value - previousY) / Math.max(0.001, nextY - previousY);
      return THREE.MathUtils.lerp(previousRadius, nextRadius, progress);
    }
  }
  return 0.58;
}

function chamberCandidates(direction: 1 | -1) {
  const candidates = new Float32Array(CHAMBER_CANDIDATES * 3);
  for (let index = 0; index < CHAMBER_CANDIDATES; index += 1) {
    const y = direction * (0.22 + Math.pow(Math.random(), 0.92) * 2.08);
    const radius = Math.sqrt(Math.random()) * glassInteriorRadius(y) * 0.94;
    const theta = Math.random() * Math.PI * 2;
    const offset = index * 3;
    candidates[offset] = Math.cos(theta) * radius;
    candidates[offset + 1] = y;
    candidates[offset + 2] = Math.sin(theta) * radius;
  }
  return candidates;
}

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
    size: 0.06,
    map: texture,
    transparent: true,
    opacity: 0.96,
    depthWrite: false,
    blending: THREE.NormalBlending,
    sizeAttenuation: true,
  });

  const createChamber = (direction: 1 | -1, chamberMaterial: THREE.PointsMaterial): ChamberState => {
    const candidates = chamberCandidates(direction);
    const positions = new Float32Array(RESERVOIR_PARTICLES * 3);
    const targets = new Float32Array(RESERVOIR_PARTICLES * 3);
    const geometry = new THREE.BufferGeometry();
    const attribute = new THREE.BufferAttribute(positions, 3);
    attribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("position", attribute);
    geometry.setDrawRange(0, 0);
    const points = new THREE.Points(geometry, chamberMaterial);
    return {
      candidates,
      order: Array.from({ length: CHAMBER_CANDIDATES }, (_, index) => index),
      points,
      positions,
      previousDrawCount: 0,
      projections: new Float32Array(CHAMBER_CANDIDATES),
      targets,
      velocities: new Float32Array(RESERVOIR_PARTICLES * 3),
    };
  };

  return {
    negative: createChamber(-1, material.clone()),
    positive: createChamber(1, material),
  };
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
      window.setTimeout(() => setError(true), 0);
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
    controls.enableRotate = false;
    controls.minDistance = 7.1;
    controls.maxDistance = 12;
    controls.minPolarAngle = 0.65;
    controls.maxPolarAngle = 2.5;
    controls.autoRotate = false;

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

    const texture = grainTexture();
    const reservoirs = reservoirPoints(texture);
    reservoirs.positive.points.renderOrder = 4;
    reservoirs.negative.points.renderOrder = 4;
    frame.add(reservoirs.positive.points, reservoirs.negative.points);

    const flowPositions = new Float32Array(FLOW_PARTICLES * 3);
    const velocities = new Float32Array(FLOW_PARTICLES * 3);
    const seeds = new Float32Array(FLOW_PARTICLES);
    const flowGravity = new THREE.Vector3(0, -1, 0);
    const resetParticle = (index: number, scatter = false, direction = flowGravity) => {
      const offset = index * 3;
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.045;
      const distance = scatter ? 0.08 + Math.random() * 1.65 : 0.04 + Math.random() * 0.12;
      flowPositions[offset] = direction.x * distance + Math.cos(angle) * radius;
      flowPositions[offset + 1] = direction.y * distance;
      flowPositions[offset + 2] = direction.z * distance + Math.sin(angle) * radius;
      const launchSpeed = 0.3 + Math.random() * 0.55;
      velocities[offset] = direction.x * launchSpeed + (Math.random() - 0.5) * 0.035;
      velocities[offset + 1] = direction.y * launchSpeed + (Math.random() - 0.5) * 0.035;
      velocities[offset + 2] = direction.z * launchSpeed + (Math.random() - 0.5) * 0.035;
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
    frame.add(flow);

    const trailPositions = new Float32Array(FLOW_PARTICLES * 6);
    const trailGeometry = new THREE.BufferGeometry();
    const trailAttribute = new THREE.BufferAttribute(trailPositions, 3);
    trailAttribute.setUsage(THREE.DynamicDrawUsage);
    trailGeometry.setAttribute("position", trailAttribute);
    const trails = new THREE.LineSegments(
      trailGeometry,
      new THREE.LineBasicMaterial({ color: 0xe7a43e, transparent: true, opacity: 0.17, depthWrite: false }),
    );
    frame.add(trails);

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
    let previousReset = propsRef.current.resetSignal;
    let lastTargetUpdate = 0;
    let isDragging = false;
    let activePointer = -1;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let lastPointerTime = 0;
    let inertialYaw = 0;
    let inertialPitch = 0;

    const worldDown = new THREE.Vector3(0, -1, 0);
    const worldUp = new THREE.Vector3(0, 1, 0);
    const worldForward = new THREE.Vector3(0, 0, 1);
    const gravityLocal = new THREE.Vector3(0, -1, 0);
    const inverseFrameQuaternion = new THREE.Quaternion();
    const yawQuaternion = new THREE.Quaternion();
    const pitchQuaternion = new THREE.Quaternion();
    const turnQuaternion = new THREE.Quaternion();
    const cameraRight = new THREE.Vector3(1, 0, 0);
    const flipFromQuaternion = new THREE.Quaternion();
    const flipTargetQuaternion = new THREE.Quaternion();

    const updateGravity = () => {
      inverseFrameQuaternion.copy(frame.quaternion).invert();
      gravityLocal.copy(worldDown).applyQuaternion(inverseFrameQuaternion).normalize();
      flowGravity.copy(gravityLocal);
    };

    const updateChamberTargets = (state: ChamberState, amount: number) => {
      const drawCount = Math.floor(RESERVOIR_PARTICLES * Math.pow(THREE.MathUtils.clamp(amount, 0, 1), 0.74));
      const seedSettled = state.previousDrawCount === 0 && drawCount > RESERVOIR_PARTICLES * 0.45;
      const candidates = state.candidates;
      for (let index = 0; index < CHAMBER_CANDIDATES; index += 1) {
        const offset = index * 3;
        state.projections[index] = candidates[offset] * gravityLocal.x
          + candidates[offset + 1] * gravityLocal.y
          + candidates[offset + 2] * gravityLocal.z;
      }
      state.order.sort((left, right) => state.projections[right] - state.projections[left]);

      for (let index = 0; index < drawCount; index += 1) {
        const sourceOffset = state.order[index] * 3;
        const offset = index * 3;
        state.targets[offset] = candidates[sourceOffset];
        state.targets[offset + 1] = candidates[sourceOffset + 1];
        state.targets[offset + 2] = candidates[sourceOffset + 2];
        if (index >= state.previousDrawCount) {
          if (seedSettled) {
            state.positions[offset] = state.targets[offset];
            state.positions[offset + 1] = state.targets[offset + 1];
            state.positions[offset + 2] = state.targets[offset + 2];
          } else {
            const angle = index * 2.399963;
            const radius = 0.025 + (index % 7) * 0.004;
            state.positions[offset] = Math.cos(angle) * radius;
            state.positions[offset + 1] = gravityLocal.y * 0.09;
            state.positions[offset + 2] = Math.sin(angle) * radius;
            state.velocities[offset] = gravityLocal.x * (0.35 + (index % 11) * 0.025);
            state.velocities[offset + 1] = gravityLocal.y * (0.35 + (index % 11) * 0.025);
            state.velocities[offset + 2] = gravityLocal.z * (0.35 + (index % 11) * 0.025);
          }
        }
      }
      state.previousDrawCount = drawCount;
      state.points.geometry.setDrawRange(0, drawCount);
    };

    const settleChamber = (state: ChamberState, dt: number, time: number, agitation: number) => {
      const count = state.previousDrawCount;
      const stiffness = isDragging ? 24 : 16;
      const damping = Math.exp(-(isDragging ? 6.5 : 8.5) * dt);
      let sampledMotion = 0;
      let motionSamples = 0;
      for (let index = 0; index < count; index += 1) {
        const offset = index * 3;
        const shimmer = Math.sin(time * 0.004 + index * 1.618) * agitation * 0.0025;
        state.velocities[offset] += ((state.targets[offset] - state.positions[offset]) * stiffness + gravityLocal.x * 0.18) * dt;
        state.velocities[offset + 1] += ((state.targets[offset + 1] - state.positions[offset + 1]) * stiffness + gravityLocal.y * 0.18) * dt;
        state.velocities[offset + 2] += ((state.targets[offset + 2] - state.positions[offset + 2]) * stiffness + gravityLocal.z * 0.18) * dt;
        state.velocities[offset] = state.velocities[offset] * damping + shimmer;
        state.velocities[offset + 1] *= damping;
        state.velocities[offset + 2] = state.velocities[offset + 2] * damping - shimmer;
        state.positions[offset] += state.velocities[offset] * dt;
        state.positions[offset + 1] += state.velocities[offset + 1] * dt;
        state.positions[offset + 2] += state.velocities[offset + 2] * dt;
        if (index % 36 === 0) {
          sampledMotion += Math.hypot(state.velocities[offset], state.velocities[offset + 1], state.velocities[offset + 2]);
          motionSamples += 1;
        }
      }
      const attribute = state.points.geometry.getAttribute("position") as THREE.BufferAttribute;
      attribute.needsUpdate = true;
      return motionSamples > 0 ? sampledMotion / motionSamples : 0;
    };

    const rotateInstrument = (deltaX: number, deltaY: number) => {
      camera.updateMatrixWorld();
      cameraRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
      yawQuaternion.setFromAxisAngle(worldUp, deltaX);
      pitchQuaternion.setFromAxisAngle(cameraRight, deltaY);
      frame.quaternion.premultiply(yawQuaternion).premultiply(pitchQuaternion).normalize();
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || propsRef.current.isFlipping) return;
      event.preventDefault();
      isDragging = true;
      activePointer = event.pointerId;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      lastPointerTime = event.timeStamp;
      inertialYaw = 0;
      inertialPitch = 0;
      renderer.domElement.setPointerCapture(event.pointerId);
      renderer.domElement.style.cursor = "grabbing";
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!isDragging || event.pointerId !== activePointer) return;
      event.preventDefault();
      const deltaX = event.clientX - lastPointerX;
      const deltaY = event.clientY - lastPointerY;
      const elapsed = Math.max(8, event.timeStamp - lastPointerTime) / 1000;
      const yaw = deltaX * 0.0062;
      const pitch = deltaY * 0.0062;
      rotateInstrument(yaw, pitch);
      inertialYaw = THREE.MathUtils.clamp(yaw / elapsed, -3.2, 3.2);
      inertialPitch = THREE.MathUtils.clamp(pitch / elapsed, -3.2, 3.2);
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      lastPointerTime = event.timeStamp;
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerId !== activePointer) return;
      isDragging = false;
      activePointer = -1;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
      renderer.domElement.style.cursor = "grab";
    };

    renderer.domElement.style.cursor = "grab";
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointercancel", handlePointerUp);

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
    const readyTimer = window.setTimeout(() => setReady(true), 0);

    const animate = (time: number) => {
      const currentProps = propsRef.current;
      const dt = Math.min((time - previousTime) / 1000, 0.035);
      previousTime = time;

      if (currentProps.resetSignal !== previousReset) {
        previousReset = currentProps.resetSignal;
        camera.position.set(6.2, 1.7, 8.3);
        controls.target.set(0, 0, 0);
        frame.quaternion.identity();
        inertialYaw = 0;
        inertialPitch = 0;
        lastTargetUpdate = 0;
        reservoirs.positive.previousDrawCount = 0;
        reservoirs.negative.previousDrawCount = 0;
        updateGravity();
        for (let index = 0; index < FLOW_PARTICLES; index += 1) resetParticle(index, true);
      }

      if (currentProps.isFlipping && !previousFlip) {
        flipStart = time;
        isDragging = false;
        if (activePointer >= 0 && renderer.domElement.hasPointerCapture(activePointer)) {
          renderer.domElement.releasePointerCapture(activePointer);
        }
        activePointer = -1;
        renderer.domElement.style.cursor = "grab";
        inertialYaw = 0;
        inertialPitch = 0;
        flipFromQuaternion.copy(frame.quaternion);
        turnQuaternion.setFromAxisAngle(worldForward, Math.PI);
        flipTargetQuaternion.copy(turnQuaternion).multiply(flipFromQuaternion).normalize();
      }
      if (currentProps.isFlipping) {
        const raw = Math.min(1, (time - flipStart) / 900);
        const eased = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;
        frame.quaternion.slerpQuaternions(flipFromQuaternion, flipTargetQuaternion, eased);
      } else if (previousFlip) {
        frame.quaternion.copy(flipTargetQuaternion);
      } else if (!isDragging && (Math.abs(inertialYaw) > 0.002 || Math.abs(inertialPitch) > 0.002)) {
        rotateInstrument(inertialYaw * dt, inertialPitch * dt);
        const inertiaDamping = Math.exp(-3.4 * dt);
        inertialYaw *= inertiaDamping;
        inertialPitch *= inertiaDamping;
      }
      previousFlip = currentProps.isFlipping;
      updateGravity();
      renderer.domElement.dataset.orientation = frame.quaternion.toArray().map((value) => value.toFixed(4)).join(",");
      renderer.domElement.dataset.localGravity = gravityLocal.toArray().map((value) => value.toFixed(4)).join(",");

      const upper = THREE.MathUtils.clamp(currentProps.sandUpper, 0, 1);
      const lower = 1 - upper;
      const uprightInfluence = THREE.MathUtils.clamp((1 - gravityLocal.y) * 0.5, 0, 1);
      const positiveAmount = upper * uprightInfluence + lower * (1 - uprightInfluence);
      const negativeAmount = 1 - positiveAmount;
      const targetInterval = isDragging || currentProps.isFlipping ? 110 : 240;
      if (time - lastTargetUpdate >= targetInterval) {
        lastTargetUpdate = time;
        updateChamberTargets(reservoirs.positive, positiveAmount);
        updateChamberTargets(reservoirs.negative, negativeAmount);
      }
      const agitation = Math.min(1, (isDragging ? 0.75 : 0) + Math.abs(inertialYaw) * 0.18 + Math.abs(inertialPitch) * 0.18);
      const positiveMotion = settleChamber(reservoirs.positive, dt, time, agitation);
      const negativeMotion = settleChamber(reservoirs.negative, dt, time, agitation);
      renderer.domElement.dataset.grainMotion = (positiveMotion + negativeMotion).toFixed(4);
      renderer.domElement.dataset.positiveGrains = String(reservoirs.positive.previousDrawCount);
      renderer.domElement.dataset.negativeGrains = String(reservoirs.negative.previousDrawCount);

      const gravityAlignment = Math.abs(gravityLocal.y);
      const flowing = currentProps.running && !currentProps.isFlipping && upper > 0.001 && gravityAlignment > 0.22;
      flow.visible = flowing;
      trails.visible = flowing && currentProps.showTrails;
      wireframe.visible = currentProps.showMesh;

      if (flowing) {
        const physicsStep = dt * currentProps.speed;
        for (let index = 0; index < FLOW_PARTICLES; index += 1) {
          const offset = index * 3;
          velocities[offset] += gravityLocal.x * 3.35 * physicsStep;
          velocities[offset + 1] += gravityLocal.y * 3.35 * physicsStep;
          velocities[offset + 2] += gravityLocal.z * 3.35 * physicsStep;
          velocities[offset] += Math.sin(time * 0.0025 + seeds[index]) * 0.008 * physicsStep;
          velocities[offset + 2] += Math.cos(time * 0.0022 + seeds[index]) * 0.008 * physicsStep;
          flowPositions[offset] += velocities[offset] * physicsStep;
          flowPositions[offset + 1] += velocities[offset + 1] * physicsStep;
          flowPositions[offset + 2] += velocities[offset + 2] * physicsStep;

          const radial = Math.hypot(flowPositions[offset], flowPositions[offset + 2]);
          const y = flowPositions[offset + 1];
          const distanceDown = flowPositions[offset] * gravityLocal.x + y * gravityLocal.y + flowPositions[offset + 2] * gravityLocal.z;
          if (Math.abs(y) > 2.28 || radial > glassInteriorRadius(y) * 0.92 || distanceDown > 1.95) {
            resetParticle(index, false, gravityLocal);
          }

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
      controls.update();
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.clearTimeout(readyTimer);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointercancel", handlePointerUp);
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
    </div>
  );
}
