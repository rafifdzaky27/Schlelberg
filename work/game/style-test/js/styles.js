// The three art styles under test. Every number that differs between them lives here.
import * as THREE from 'three';

export const STYLES = {
  gouache: {
    name: 'Gouache',
    blurb: 'Painted and soft. Colours pulled toward the visual bible: ochre, rust, grey-blue and cream. A brush filter turns detail into strokes.',
    mat: 'standard',
    satMat: 0.85,
    toneMapping: THREE.ACESFilmicToneMapping,
    exposure: 1.05,
    chamber: { fog: [0x1d1813, 0.055], hemi: [0x5b5f66, 0x2a2018, 0.35], lamp: [0xffa35a, 9], stair: [0xbfc8d4, 6], door: [0xd8e8ff, 60] },
    terrace: { fog: [0xd8c7a3, 0.0032], sky: [0x9fb2bd, 0xe6d5b0], sun: [0xffe2b0, 2.6], hemi: [0xbfd0dc, 0x8a7550, 0.9] },
    post: { kuwahara: 4, paper: 0.45, edge: 0.55, sat: 0.9, tint: [1.04, 1.0, 0.92], lift: [0.02, 0.018, 0.012], vignette: 0.38, grain: 0.02, bloom: [0.35, 0.55, 0.8] },
    water: { deep: 0x15191a, refl: 0x4a5354, toon: 0 },
  },
  sunlit: {
    name: 'Sunlit',
    blurb: 'Stylized like Wildbrush: flat colour bands, warm haze swallowing the distance, brighter and more saturated. Reads well from far away.',
    mat: 'toon',
    satMat: 1.15,
    toneMapping: THREE.AgXToneMapping,
    exposure: 1.25,
    chamber: { fog: [0x2c2219, 0.045], hemi: [0x6f7887, 0x3b2a1c, 0.55], lamp: [0xffb060, 11], stair: [0xd2dcf0, 8], door: [0xcfe6ff, 70] },
    terrace: { fog: [0xe8d6ad, 0.0048], sky: [0x8fb3cc, 0xf2dfb5], sun: [0xfff0c8, 3.2], hemi: [0xcfe0ee, 0x9a8458, 1.1] },
    post: { kuwahara: 0, paper: 0.0, edge: 0.0, sat: 1.12, tint: [1.03, 1.0, 0.95], lift: [0.03, 0.025, 0.02], vignette: 0.22, grain: 0.0, bloom: [0.55, 0.45, 0.72] },
    water: { deep: 0x1b2a30, refl: 0x6d8a92, toon: 1 },
  },
  grounded: {
    name: 'Grounded',
    blurb: 'Cinematic and closer to real: full surface detail, deep shadows, film grain. The most serious look, and the least forgiving of simple models.',
    mat: 'detailed',
    satMat: 0.95,
    toneMapping: THREE.ACESFilmicToneMapping,
    exposure: 1.15,
    chamber: { fog: [0x0e0c0a, 0.06], hemi: [0x3b4048, 0x1a140f, 0.3], lamp: [0xff9a48, 10], stair: [0xaebccc, 5], door: [0xdcebff, 80] },
    terrace: { fog: [0xc9c2b0, 0.0026], sky: [0x87a0b8, 0xd9cdb4], sun: [0xfff1dc, 3.0], hemi: [0xb8c8d8, 0x6f5d42, 0.7] },
    post: { kuwahara: 0, paper: 0.0, edge: 0.0, sat: 0.95, tint: [1.0, 0.99, 0.97], lift: [0.0, 0.0, 0.004], vignette: 0.5, grain: 0.05, bloom: [0.4, 0.35, 0.9] },
    water: { deep: 0x0b0e0f, refl: 0x39434a, toon: 0 },
  },
};

export const STYLE_KEYS = ['gouache', 'sunlit', 'grounded'];
