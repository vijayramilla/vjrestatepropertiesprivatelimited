import * as pdfjsLib from 'pdfjs-dist';
import type {
  ExtractedFloorPlan,
  VastuAnalysisResult,
} from '@/data/vastuBrain';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export type { ExtractedFloorPlan, VastuAnalysisResult };

export interface ApiResponse {
  extraction: ExtractedFloorPlan;
  analysis: VastuAnalysisResult;
}

function canvasToBase64(canvas: HTMLCanvasElement, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error('Failed to encode image')); return; }
        const fr = new FileReader();
        fr.onerror = () => reject(new Error('Failed to read encoded image'));
        fr.onload = () => {
          const b64 = (fr.result as string).split(',')[1];
          resolve(b64);
        };
        fr.readAsDataURL(blob);
      },
      'image/jpeg',
      quality
    );
  });
}

async function renderPdfToBase64(file: File, maxDim = 1200, quality = 0.7): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const page = await pdf.getPage(1);

  const vp = page.getViewport({ scale: 1 });
  const scale = Math.min(maxDim / vp.width, maxDim / vp.height, 2);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  const renderCtx = { canvasContext: ctx, viewport, canvas };
  await page.render(renderCtx).promise;

  return canvasToBase64(canvas, quality);
}

function compressImage(file: File, maxDim = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read the file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode the image. The file may be corrupted.'));
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('Canvas 2D context not available')); return; }
          ctx.drawImage(img, 0, 0, width, height);
          canvasToBase64(canvas, quality).then(resolve).catch(reject);
        } catch (e: any) {
          reject(new Error('Image compression failed: ' + e.message));
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function analyzeFloorPlan(
  file: File,
  northDegrees: number
): Promise<ApiResponse> {
  let image: string;
  try {
    if (file.type === 'application/pdf') {
      image = await renderPdfToBase64(file);
    } else if (file.type.startsWith('image/')) {
      image = await compressImage(file);
    } else {
      throw new Error(`Unsupported file type: ${file.type}. Please upload an image (JPG, PNG) or PDF.`);
    }
  } catch (e: any) {
    throw new Error(e.message || 'File processing failed');
  }

  let res: Response;
  try {
    res = await fetch('/api/analyze-vastu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, mimeType: 'image/jpeg', northDegrees }),
    });
  } catch {
    throw new Error(
      'Cannot reach the API server. Make sure the backend is running (npm run dev:api) and the Vite dev server has the proxy configured.'
    );
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.detail || err.error || `Server error (HTTP ${res.status})`);
  }

  const data = await res.json();

  if (!data || !data.analysis) {
    throw new Error('Invalid response from AI - missing analysis data');
  }

  return data;
}
