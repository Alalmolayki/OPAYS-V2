import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Resolve the worker URL at build time using Vite's new URL() handling.
// This works correctly in both dev and production (Vercel) builds.
GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href;

export interface ParsedStudent {
  studentName: string;
  studentNo: string;
  class: string;
  section: string;
}

// ── Extended item type including width ─────────────────────────────────────
interface TItem {
  x: number;
  y: number;
  width: number;
  str: string;
}

// ── Smart join: adjacent character fragments (gap ≤ 2) are concatenated ───
// This handles Turkish glyphs (İ, Ş, Ğ, ı…) emitted as separate pdfjs items.
function smartJoin(cells: TItem[]): string {
  if (cells.length === 0) return '';
  const sorted = [...cells].sort((a, b) => a.x - b.x);
  let result = sorted[0].str;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const gap = curr.x - (prev.x + prev.width);
    result += gap > 2 ? ' ' + curr.str : curr.str;
  }
  return result.trim();
}

// ── Line clustering ────────────────────────────────────────────────────────
// Groups PDF text items into visual lines using a center-based tolerance.
function extractLines(rawItems: TItem[], tolerance = 6): string[] {
  const items = rawItems.filter(i => i.str.trim());

  // Sort descending by y (PDF y=0 is bottom, so descending = top-first)
  items.sort((a, b) => b.y - a.y);

  type Cluster = { sumY: number; n: number; cells: TItem[] };
  const clusters: Cluster[] = [];

  for (const item of items) {
    const y = item.y;
    let best: Cluster | undefined;
    let bestDist = Infinity;

    for (const c of clusters) {
      const dist = Math.abs(c.sumY / c.n - y);
      if (dist <= tolerance && dist < bestDist) {
        bestDist = dist;
        best = c;
      }
    }

    if (best) {
      best.cells.push(item);
      best.sumY += y;
      best.n++;
    } else {
      clusters.push({ sumY: y, n: 1, cells: [item] });
    }
  }

  // Sort clusters top → bottom, then smart-join cells within each cluster
  return clusters
    .sort((a, b) => b.sumY / b.n - a.sumY / a.n)
    .map(c => smartJoin(c.cells))
    .filter(Boolean);
}

// ── Class / section detection ──────────────────────────────────────────────
function detectClassSection(lines: string[]): { cls: string; section: string } | null {
  for (const line of lines) {
    // "9. Sınıf / A Şubesi"  or  "9 . Sinif / A Subesi"
    const m1 = line.match(
      /(\d+)\s*[.]\s*S[ıiİI]n[ıiİI]f[ıiİI]?\s*[/\\]\s*([A-ZÇĞIÖŞÜ])\s*[ŞS]ubesi/i,
    );
    if (m1) return { cls: m1[1], section: m1[2].toUpperCase() };

    // "Hazırlık Sınıfı / A Şubesi"
    const m2 = line.match(
      /Haz[ıiİI]rl[ıiİI]k\s+S[ıiİI]n[ıiİI]f[ıiİI]\s*[/\\]\s*([A-ZÇĞIÖŞÜ])\s*[ŞS]ubesi/i,
    );
    if (m2) return { cls: 'Hazırlık', section: m2[1].toUpperCase() };
  }
  return null;
}

// ── Student row detection ──────────────────────────────────────────────────
// Pattern: <sira_no(1-3 digits)>  <ogrenci_no(2-6 digits)>  <full name>  Erkek|Kız  [Yatılı]
const STUDENT_ROW = /^(\d{1,3})\s+(\d{2,6})\s+([A-ZÇĞIİÖŞÜa-zçğıiöşü][A-ZÇĞIİÖŞÜa-zçğıiöşü\s'-]+?)\s+(Erkek|K[ıi]z)(\s+Yat[ıi]l[ıi])?$/i;

// ── Main export ───────────────────────────────────────────────────────────
export async function parseEOkulPdf(file: File): Promise<ParsedStudent[]> {
  const buffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: buffer }).promise;
  const students: ParsedStudent[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();

    // Cast items — pdfjs returns (TextItem | TextMarkedContent)[]
    const textItems: TItem[] = (
      tc.items as { str?: string; transform?: number[]; width?: number }[]
    )
      .filter(
        (i): i is { str: string; transform: number[]; width: number } =>
          typeof i.str === 'string' &&
          Array.isArray(i.transform) &&
          i.str.trim().length > 0,
      )
      .map(i => ({
        str: i.str,
        x: i.transform[4],
        y: i.transform[5],
        width: i.width ?? 0,
      }));

    const lines = extractLines(textItems, 6);

    const header = detectClassSection(lines);
    if (!header) continue;

    const { cls, section } = header;

    for (const line of lines) {
      const m = STUDENT_ROW.exec(line);
      if (!m) continue;
      students.push({
        studentName: m[3].trim(),
        studentNo: m[2],
        class: cls,
        section,
      });
    }
  }

  return students;
}
