import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

const suspiciousLabels = new Set([
  'cell phone',
  'mobile phone',
  'phone',
  'laptop',
  'handbag',
  'backpack',
  'remote',
  'mouse',
  'book',
]);

let model: cocoSsd.ObjectDetection | null = null;
let modelLoadPromise: Promise<cocoSsd.ObjectDetection> | null = null;
let modelLoadError: Error | null = null;

export async function loadObjectDetector() {
  // If already loaded or loading, return existing promise
  if (model) {
    return model;
  }
  
  if (modelLoadPromise) {
    return modelLoadPromise;
  }
  
  // If previously failed, throw
  if (modelLoadError) {
    throw modelLoadError;
  }
  
  // Create loading promise
  modelLoadPromise = (async () => {
    try {
      console.log('[ObjectDetector] Starting initialization...');
      
      // Wait for TensorFlow to be ready
      console.log('[ObjectDetector] Waiting for TensorFlow...');
      await tf.ready();
      console.log('[ObjectDetector] TensorFlow ready, backend:', tf.getBackend());

      // Try to set optimal backend
      try {
        await tf.setBackend('webgl');
        console.log('[ObjectDetector] Set backend to WebGL');
      } catch (err) {
        console.warn('[ObjectDetector] WebGL failed, using default:', err);
      }

      // Load model
      console.log('[ObjectDetector] Loading COCO-SSD model...');
      model = await cocoSsd.load();
      console.log('[ObjectDetector] Model loaded successfully');
      return model;
    } catch (err) {
      modelLoadError = err instanceof Error ? err : new Error(String(err));
      console.error('[ObjectDetector] Initialization failed:', modelLoadError);
      throw modelLoadError;
    }
  })();

  return modelLoadPromise;
}

export async function detectSuspiciousObjects(video: HTMLVideoElement): Promise<cocoSsd.DetectedObject[]> {
  try {
    if (!video.videoWidth || !video.videoHeight) {
      console.log('[ObjectDetector] Video not ready yet');
      return [];
    }

    const detector = await loadObjectDetector();
    const predictions = await detector.detect(video);
    console.log('[ObjectDetector] Found', predictions.length, 'objects');
    
    const filtered = predictions.filter(prediction => {
      const label = prediction.class.toLowerCase();
      const isSuspicious = (suspiciousLabels.has(label) || label.includes('phone')) && prediction.score >= 0.45;
      if (isSuspicious) {
        console.log('[ObjectDetector] Suspicious:', prediction.class, '- score:', (prediction.score * 100).toFixed(1) + '%');
      }
      return isSuspicious;
    });
    
    return filtered;
  } catch (err) {
    console.warn('[ObjectDetector] Detection failed:', err);
    // Return empty array to allow face detection to continue
    return [];
  }
}

export function summarizeSuspiciousObject(prediction: cocoSsd.DetectedObject) {
  const label = prediction.class.toLowerCase();
  if (label.includes('phone')) return 'a phone';
  if (label === 'laptop') return 'a laptop';
  if (label === 'handbag' || label === 'backpack') return 'a bag';
  if (label === 'remote') return 'a remote device';
  if (label === 'mouse') return 'a handheld object';
  return `a ${prediction.class}`;
}
