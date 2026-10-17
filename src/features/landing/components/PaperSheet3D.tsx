"use client";

import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { MotionValue } from "motion/react";
import { drawFrontPage } from "../frontPageTexture";
import { SampleFrontPage } from "./SampleFrontPage";

const W = 1;
const H = 1.25;
const SEGMENTS_X = 80; // more points = a rounder, smoother ball
const SEGMENTS_Y = 100;
const BALL_RADIUS = 0.32;
const BUMPINESS = 0.32;
const PAPER_WHITE = "#f7f3ea";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const range = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const ease = (t: number) => t * t * (3 - 2 * t);

/** Soft fold pattern at a few scales, 0..1. */
/** Crumple pattern: sharp crease lines (ridges) at a few scales, 0..1. */
function folds(x: number, y: number, z: number): number {
  let total = 0;
  let amplitude = 1;
  let frequency = 2.6;
  for (let octave = 0; octave < 4; octave++) {
    // 1 - |sin| makes thin, sharp ridges: the creases of crumpled paper.
    const a = 1 - Math.abs(Math.sin(x * frequency * 1.3 + y * frequency * 0.7 + octave * 1.7));
    const b = 1 - Math.abs(Math.sin(y * frequency * 1.1 - z * frequency * 0.9 + octave * 2.3));
    const c = 1 - Math.abs(Math.sin(z * frequency * 1.2 + x * frequency * 0.6 + octave * 0.9));
    total += amplitude * Math.max(a, b, c) ** 3;
    amplitude *= 0.5;
    frequency *= 1.9;
  }
  return total / 1.875;
}

/** Every point of the flat sheet, plus where it sits in the crumpled ball. */
function buildPaper() {
  const geometry = new THREE.PlaneGeometry(W, H, SEGMENTS_X, SEGMENTS_Y);
  const flat = Float32Array.from(geometry.attributes.position.array as ArrayLike<number>);
  const count = flat.length / 3;
  const crumpled = new Float32Array(flat.length);
  const wrinkles = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const x = flat[i * 3];
    const y = flat[i * 3 + 1];
    const theta = (x / W + 0.5) * Math.PI * 2;
    const phi = (1 - (y / H + 0.5)) * Math.PI;
    const sx = Math.sin(phi) * Math.cos(theta);
    const sy = Math.cos(phi);
        const sz = -Math.sin(phi) * Math.sin(theta); // printed side faces outward
    // Mostly a sphere, with gentle folds pressed in and out.
    const r = BALL_RADIUS * (1 - BUMPINESS / 2 + BUMPINESS * folds(sx, sy, sz));
    crumpled[i * 3] = sx * r;
    crumpled[i * 3 + 1] = sy * r;
    crumpled[i * 3 + 2] = sz * r;
    wrinkles[i] = folds(x * 2.4, y * 2.4, 0.37) - 0.5;
  }
  return { geometry, flat, crumpled, wrinkles };
}

type Paper = ReturnType<typeof buildPaper>;

function Sheet({ progress, name }: { progress: MotionValue<number>; name: string }) {
  const group = useRef<THREE.Group>(null);
  const front = useRef<THREE.Mesh>(null);
  const back = useRef<THREE.Mesh>(null);
  const frontMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const paper = useRef<Paper | null>(null);
  const texture = useRef<THREE.CanvasTexture | null>(null);
  const invalidate = useThree((state) => state.invalidate);

  // Build the sheet and its printed surface once, outside React's render.
  useEffect(() => {
    const built = buildPaper();
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1280;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;

    paper.current = built;
    texture.current = tex;
    // Same sheet, two faces: printed front, plain paper back (no mirrored text).
    if (front.current) front.current.geometry = built.geometry;
    if (back.current) back.current.geometry = built.geometry;
    if (frontMaterial.current) {
      frontMaterial.current.map = tex;
      frontMaterial.current.emissiveMap = tex; // keeps the paper white, not grey, in shadow
      frontMaterial.current.needsUpdate = true;
    }
    invalidate();

    return () => {
      built.geometry.dispose();
      tex.dispose();
      paper.current = null;
      texture.current = null;
    };
  }, [invalidate]);

  // Print the front page, and reprint when the name changes.
  useEffect(() => {
    const tex = texture.current;
    if (!tex) return;
    let cancelled = false;
    drawFrontPage(tex.image as HTMLCanvasElement, name).then(() => {
      if (cancelled) return;
      tex.needsUpdate = true;
      invalidate();
    });
    return () => {
      cancelled = true;
    };
  }, [name, invalidate]);

  useEffect(() => progress.on("change", () => invalidate()), [progress, invalidate]);

  useFrame(() => {
    const g = group.current;
    const built = paper.current;
    if (!g || !built) return;
    const p = progress.get();

    const appear = ease(range(p, 0.45, 0.55));
    const fold = 1 - ease(range(p, 0.64, 0.84)); // 1 = crumpled, 0 = flat
    const wrinkle = 1 - ease(range(p, 0.8, 0.94)); // last creases smooth out

    const positions = built.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const fx = built.flat[i];
      const fy = built.flat[i + 1];
      const fz = built.wrinkles[i / 3] * 0.025 * wrinkle;
      positions[i] = fx + (built.crumpled[i] - fx) * fold;
      positions[i + 1] = fy + (built.crumpled[i + 1] - fy) * fold;
      positions[i + 2] = fz + (built.crumpled[i + 2] - fz) * fold;
    }
    built.geometry.attributes.position.needsUpdate = true;
    built.geometry.computeVertexNormals(); // smooth shading: soft folds, no visible triangles

    g.visible = p > 0.44;
    g.scale.setScalar(Math.max(appear, 0.0001));
    const spin = ease(range(p, 0.45, 0.72)) * Math.PI * 1.6;
    g.rotation.set(fold * 0.5, fold * spin, fold * 0.3);
  });

  return (
    <group ref={group}>
      <mesh ref={front}>
        <meshStandardMaterial
          ref={frontMaterial}
          side={THREE.FrontSide}
          roughness={1}
          metalness={0}
          emissive="#ffffff"
          emissiveIntensity={0.18}
        />
      </mesh>
      <mesh ref={back}>
        <meshStandardMaterial
          side={THREE.BackSide}
          color={PAPER_WHITE}
          roughness={1}
          metalness={0}
          emissive={PAPER_WHITE}
          emissiveIntensity={0.35}
        />
      </mesh>
    </group>
  );
}

export function PaperSheet3D({ progress, name }: { progress: MotionValue<number>; name: string }) {
  return (
    <Canvas
      flat
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ fov: 30, position: [0, 0, 3.1] }}
      gl={{ alpha: true, antialias: true }}
      style={{ pointerEvents: "none" }}
      fallback={
        <div className="mx-auto aspect-[4/5] h-full">
          <SampleFrontPage name={name} />
        </div>
      }
    >
      <ambientLight intensity={0.9} />
      <hemisphereLight args={["#ffffff", "#d9d2c3", 0.6]} />
      <directionalLight position={[2.5, 3, 4]} intensity={1.4} />
      <directionalLight position={[-3, -1, 2]} intensity={0.35} />
      <Sheet progress={progress} name={name} />
    </Canvas>
  );
}
