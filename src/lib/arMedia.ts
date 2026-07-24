import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, type DocumentData } from 'firebase/firestore';
import { db } from './firebase';

export interface ARMediaItem {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  modelUrl?: string;
  category: 'ar' | '3d' | 'vr' | 'video';
  tags: string[];
  order: number;
}

const COLLECTION = 'ar_media';

const mockMedia: ARMediaItem[] = [
  {
    id: 'demo-1',
    title: 'Spatial Walkthrough — Prestige Group',
    description: 'Interactive 3D walkthrough of a luxury residential tower with real-time material switching.',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    thumbnailUrl: '',
    category: '3d',
    tags: ['walkthrough', 'residential', 'luxury'],
    order: 1,
  },
  {
    id: 'demo-2',
    title: 'AR Experience — Emaar',
    description: 'Place a full-scale digital twin of Emaar tower in your real environment with our AR app.',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    thumbnailUrl: '',
    category: 'ar',
    tags: ['augmented-reality', 'digital-twin'],
    order: 2,
  },
  {
    id: 'demo-3',
    title: 'VR Tour — Sobha Hartland',
    description: 'Fully immersive VR tour of Sobha Hartland development with 360° panoramas.',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    thumbnailUrl: '',
    category: 'vr',
    tags: ['vr', '360', 'residential'],
    order: 3,
  },
  {
    id: 'demo-4',
    title: 'Digital Twin — Lodha Group',
    description: 'Live data overlay on a photorealistic digital twin of Lodha\'s flagship project.',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    thumbnailUrl: '',
    modelUrl: '/models/lodha-tower.glb',
    category: '3d',
    tags: ['digital-twin', 'iot', 'live-data'],
    order: 4,
  },
];

export function useARMedia() {
  const [items, setItems] = useState<ARMediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const q = query(collection(db, COLLECTION), orderBy('order', 'asc'), limit(20));

    getDocs(q)
      .then((snap) => {
        if (cancelled) return;
        if (snap.empty) {
          setItems(mockMedia);
        } else {
          setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ARMediaItem)));
        }
      })
      .catch(() => {
        if (!cancelled) setItems(mockMedia);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return { items, loading };
}
