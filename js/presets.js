// presets.js — Document photo presets
const PRESETS = [
  { id: 'passport_kg', name: 'Паспорт КР', flag: '🇰🇬', width: 35, height: 45, ratio: '7:9', bg: '#ffffff', dpi: 300, facePercent: [70, 80], eyeLine: 0.45 },
  { id: 'visa_us', name: 'Виза США', flag: '🇺🇸', width: 51, height: 51, ratio: '1:1', bg: '#ffffff', dpi: 300, facePercent: [50, 69], eyeLine: 0.45 },
  { id: 'visa_schengen', name: 'Виза Шенген', flag: '🇪🇺', width: 35, height: 45, ratio: '7:9', bg: '#e8e8e8', dpi: 300, facePercent: [70, 80], eyeLine: 0.45 },
  { id: 'license_kg', name: 'Права КР', flag: '🇰🇬', width: 30, height: 40, ratio: '3:4', bg: '#ffffff', dpi: 300, facePercent: [70, 80], eyeLine: 0.45 },
  { id: 'id_kg', name: 'ID-карта КР', flag: '🇰🇬', width: 35, height: 45, ratio: '7:9', bg: '#ffffff', dpi: 300, facePercent: [70, 80], eyeLine: 0.45 },
  { id: 'passport_ru', name: 'Паспорт РФ', flag: '🇷🇺', width: 35, height: 45, ratio: '7:9', bg: '#ffffff', dpi: 300, facePercent: [70, 80], eyeLine: 0.45 },
  { id: 'visa_china', name: 'Виза Китай', flag: '🇨🇳', width: 33, height: 48, ratio: '33:48', bg: '#ffffff', dpi: 300, facePercent: [70, 80], eyeLine: 0.45 },
  { id: 'visa_japan', name: 'Виза Япония', flag: '🇯🇵', width: 45, height: 45, ratio: '1:1', bg: '#ffffff', dpi: 300, facePercent: [60, 70], eyeLine: 0.45 },
  { id: 'visa_korea', name: 'Виза Корея', flag: '🇰🇷', width: 35, height: 45, ratio: '7:9', bg: '#ffffff', dpi: 300, facePercent: [70, 80], eyeLine: 0.45 },
  { id: 'linkedin', name: 'LinkedIn / Резюме', flag: '💼', width: 600, height: 600, ratio: '1:1', bg: null, dpi: 72, facePercent: [40, 60], eyeLine: 0.4, px: true },
  { id: 'custom', name: 'Произвольный', flag: '⚙️', width: 35, height: 45, ratio: '7:9', bg: '#ffffff', dpi: 300, facePercent: [50, 90], eyeLine: 0.45, custom: true },
];

// Print layouts
const PRINT_LAYOUTS = [
  { id: 'single', name: '1 фото', cols: 1, rows: 1, paper: null },
  { id: '2x2', name: '4 фото (2×2)', cols: 2, rows: 2, paper: { w: 100, h: 150, name: '10×15' } },
  { id: '2x3', name: '6 фото (2×3)', cols: 2, rows: 3, paper: { w: 100, h: 150, name: '10×15' } },
  { id: '2x4', name: '8 фото (2×4)', cols: 2, rows: 4, paper: { w: 210, h: 297, name: 'A4' } },
  { id: 'custom_grid', name: 'Своя сетка', cols: 2, rows: 2, paper: { w: 210, h: 297, name: 'A4' }, custom: true },
];
