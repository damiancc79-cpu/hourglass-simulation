import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import * as THREE from "three";

class NodeFileReader {
  result = null;
  onloadend = null;
  onerror = null;

  readAsArrayBuffer(blob) {
    blob.arrayBuffer()
      .then((buffer) => {
        this.result = buffer;
        this.onloadend?.({ target: this });
      })
      .catch((error) => this.onerror?.(error));
  }

  readAsDataURL(blob) {
    blob.arrayBuffer()
      .then((buffer) => {
        this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString("base64")}`;
        this.onloadend?.({ target: this });
      })
      .catch((error) => this.onerror?.(error));
  }
}

globalThis.FileReader = NodeFileReader;

const { GLTFExporter } = await import("three/addons/exporters/GLTFExporter.js");

const model = new THREE.Group();
model.name = "Midnight_Observatory_Hourglass_HG02";
model.userData = {
  title: "Midnight Observatory Hourglass",
  model: "HG-02",
  units: "meters",
  materials: ["Aged brass", "Borosilicate glass", "Amber silica"],
};

const brass = new THREE.MeshStandardMaterial({ name: "Aged_Brass", color: 0xa8793f, metalness: 0.92, roughness: 0.27 });
const darkBrass = new THREE.MeshStandardMaterial({ name: "Dark_Brass", color: 0x4b301b, metalness: 0.88, roughness: 0.38 });
const highlightBrass = new THREE.MeshStandardMaterial({ name: "Polished_Brass", color: 0xd3a866, metalness: 0.95, roughness: 0.2 });
const glass = new THREE.MeshPhysicalMaterial({
  name: "Borosilicate_Glass",
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
});
const sand = new THREE.MeshStandardMaterial({ name: "Amber_Silica", color: 0xdf972f, metalness: 0.04, roughness: 0.77 });

for (const y of [-2.88, 2.88]) {
  const plateGroup = new THREE.Group();
  plateGroup.name = y > 0 ? "Top_Plate" : "Bottom_Plate";
  plateGroup.position.y = y;
  plateGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(1.95, 1.95, 0.28, 72), brass));
  const inset = new THREE.Mesh(new THREE.CylinderGeometry(1.72, 1.8, 0.16, 72), darkBrass);
  inset.position.y = y > 0 ? -0.17 : 0.17;
  plateGroup.add(inset);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.76, 0.09, 18, 96), highlightBrass);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = y > 0 ? 0.12 : -0.12;
  plateGroup.add(rim);
  model.add(plateGroup);
}

const postGeometry = new THREE.CylinderGeometry(0.075, 0.095, 5.42, 24);
const collarGeometry = new THREE.CylinderGeometry(0.145, 0.145, 0.18, 28);
for (const [index, degrees] of [45, 135, 225, 315].entries()) {
  const angle = THREE.MathUtils.degToRad(degrees);
  const x = Math.cos(angle) * 1.57;
  const z = Math.sin(angle) * 1.57;
  const post = new THREE.Mesh(postGeometry, index % 2 ? brass : highlightBrass);
  post.name = `Support_${index + 1}`;
  post.position.set(x, 0, z);
  model.add(post);
  for (const y of [-2.56, 2.56]) {
    const collar = new THREE.Mesh(collarGeometry, darkBrass);
    collar.position.set(x, y, z);
    collar.name = `Support_${index + 1}_${y > 0 ? "Top" : "Bottom"}_Collar`;
    model.add(collar);
  }
}

const profile = [
  [-2.38, 0.68], [-2.30, 1.02], [-2.12, 1.32], [-1.76, 1.47],
  [-1.36, 1.43], [-0.94, 1.2], [-0.55, 0.74], [-0.2, 0.29],
  [0, 0.18], [0.2, 0.29], [0.55, 0.74], [0.94, 1.2],
  [1.36, 1.43], [1.76, 1.47], [2.12, 1.32], [2.30, 1.02], [2.38, 0.68],
].map(([y, radius]) => new THREE.Vector2(radius, y));
const vessel = new THREE.Mesh(new THREE.LatheGeometry(profile, 96), glass);
vessel.name = "Borosilicate_Vessel";
model.add(vessel);

for (const y of [-2.37, 2.37]) {
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.69, 0.69, 0.045, 72), glass);
  cap.position.y = y;
  cap.name = y > 0 ? "Upper_Glass_Seal" : "Lower_Glass_Seal";
  model.add(cap);
}

const upperSand = new THREE.Mesh(new THREE.CylinderGeometry(1.03, 0.17, 1.22, 64, 8), sand);
upperSand.name = "Upper_Sand_Reservoir";
upperSand.position.y = 0.8;
model.add(upperSand);

const lowerSand = new THREE.Mesh(new THREE.ConeGeometry(0.93, 0.88, 64, 8), sand);
lowerSand.name = "Lower_Sand_Mound";
lowerSand.position.y = -1.76;
model.add(lowerSand);

const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.35, 12), sand);
stream.name = "Sand_Stream";
stream.position.y = -0.65;
model.add(stream);

const exporter = new GLTFExporter();
const binary = await new Promise((resolveExport, rejectExport) => {
  exporter.parse(model, resolveExport, rejectExport, { binary: true, onlyVisible: false });
});

if (!(binary instanceof ArrayBuffer)) throw new Error("Expected a binary GLB export.");
const output = resolve("public/midnight-hourglass.glb");
await writeFile(output, new Uint8Array(binary));
console.log(output);
