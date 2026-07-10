import fs from 'fs/promises';
import path from 'path';
import { ChairType } from '../models';

const IMAGE_DIR = process.env.CHAIR_IMAGES_DIR || path.join(__dirname, '../../../client/public/sillas');

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function extractNameFromFilename(filename: string): string {
  // Quitar prefijo numérico y "silla-"
  const withoutPrefix = filename.replace(/^\d+_silla-/, '');
  // Quitar extensión
  const withoutExt = withoutPrefix.replace(/\.[^.]+$/, '');
  // Cortar en la primera palabra técnica común
  const technicalMarkers = [
    'reg', 'regulacion', 'regulable', 'con', 'sin', 'brazos', 'basculante', 'synchron',
    'neumatica', 'neumatico', 'gas', 'cromada', 'cromado', 'blanca', 'blanco', 'negra',
    'negro', 'gris', 'alta', 'baja', 'plus', 'total', 'black', 'apoyacabezas', 'capoyacabezas',
    'cbrazos', 'r3', 'cci', 'pilar', 'gema', 'ema', 'link', 'dina', 'brisa', 'wanda', 'luna',
  ];

  const parts = withoutExt.split('-');
  const nameParts: string[] = [];
  for (const part of parts) {
    if (technicalMarkers.includes(part.toLowerCase()) && nameParts.length >= 1) {
      break;
    }
    nameParts.push(part);
  }

  return normalize(nameParts.join(' '));
}

function similarity(a: string, b: string): number {
  const wordsA = a.split(' ').filter(Boolean);
  const wordsB = b.split(' ').filter(Boolean);
  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  const setB = new Set(wordsB);
  const matches = wordsA.filter((w) => setB.has(w)).length;
  return matches / Math.max(wordsA.length, wordsB.length);
}

export async function listImageFiles(): Promise<string[]> {
  try {
    const files = await fs.readdir(IMAGE_DIR);
    return files.filter((f) => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));
  } catch {
    return [];
  }
}

export async function matchImagesToChairs(): Promise<{
  matched: Array<{ chairTypeId: string; name: string; filename: string; imageUrl: string }>;
  unmatched: string[];
}> {
  const files = await listImageFiles();
  const chairs = await ChairType.find().lean();

  const matched: Array<{ chairTypeId: string; name: string; filename: string; imageUrl: string }> = [];
  const unmatched: string[] = [];

  for (const filename of files) {
    const extractedName = extractNameFromFilename(filename);
    if (!extractedName) {
      unmatched.push(filename);
      continue;
    }

    let bestMatch: { chair: typeof chairs[0]; score: number } | null = null;
    for (const chair of chairs) {
      const chairName = normalize(chair.name);
      const score = similarity(extractedName, chairName);
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { chair, score };
      }
    }

    if (bestMatch && bestMatch.score >= 0.5) {
      const imageUrl = `/sillas/${filename}`;
      matched.push({
        chairTypeId: bestMatch.chair._id.toString(),
        name: bestMatch.chair.name,
        filename,
        imageUrl,
      });
    } else {
      unmatched.push(filename);
    }
  }

  return { matched, unmatched };
}

export async function applyImageMatches(): Promise<{
  matched: number;
  unmatched: string[];
}> {
  const { matched, unmatched } = await matchImagesToChairs();

  for (const item of matched) {
    await ChairType.findByIdAndUpdate(item.chairTypeId, { imageUrl: item.imageUrl });
  }

  return { matched: matched.length, unmatched };
}
