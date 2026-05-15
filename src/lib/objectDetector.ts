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
let modelLoadError: Error | null = null;

export async function loadObjectDetector() {
  if (modelLoadError) {
    throw modelLoadError;
  }
  
  if (!model) {
    try {
      console.log('[ObjectDetector] Initializing TensorFlow...');
      await tf.ready();
      console.log('[ObjectDetector] TensorFlow ready, available backends:', tf.getBackend());

      // Try to set backend with fallback
      try {
        await tf.setBackend('webgl');
        console.log('[ObjectDetector] Using WebGL backend');
      } catch (webglErr) {
        console.warn('[ObjectDetector] WebGL backend failed, trying CPU:', webglErr);
        try {
          await tf.setBackend('cpu');
          console.log('[ObjectDetector] Using CPU backend');
        } catch (cpuErr) {
          console.warn('[ObjectDetector] CPU backend failed:', cpuErr);
        }
      }

      console.log('[ObjectDetector] Loading COCO-SSD model...');
      model = await cocoSsd.load();
      console.log('[ObjectDetector] COCO-SSD model loaded successfully');
    } catch (err) {
      modelLoadError = err instanceof Error ? err : new Error(String(err));
      console.error('[ObjectDetector] Model loading failed:', err);
      throw err;
    }
  }
  return model;
}

export async function detectSuspiciousObjects(video: HTMLVideoElement) {
  try {
    const detector = await loadObjectDetector();
    const predictions = await detector.detect(video);
    console.log('[ObjectDetector] Raw predictions:', predictions.length, 'objects found');
    
    const filtered = predictions.filter(prediction => {
      const label = prediction.class.toLowerCase();
      const isSuspicious = (suspiciousLabels.has(label) || label.includes('phone')) && prediction.score >= 0.45;
      if (isSuspicious) {
        console.log('[ObjectDetector] Found suspicious object:', prediction.class, 'score:', (prediction.score * 100).toFixed(1) + '%');
      }
      return isSuspicious;
    });
    
    return filtered;
  } catch (err) {
    console.error('[ObjectDetector] Error during detection:', err);
    // Don't throw - return empty array to allow face detection to continue
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
