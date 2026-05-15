import * as tf from '@tensorflow/tfjs';
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

export async function loadObjectDetector() {
  if (!model) {
    console.log('[ObjectDetector] Initializing TensorFlow...');
    await tf.ready();
    console.log('[ObjectDetector] TensorFlow ready');

    const availableBackends = tf.engine().registry;
    if (Object.prototype.hasOwnProperty.call(availableBackends, 'webgl')) {
      try {
        await tf.setBackend('webgl');
        console.log('[ObjectDetector] Using WebGL backend');
      } catch (err) {
        console.warn('[ObjectDetector] WebGL backend failed, using default:', err);
      }
    }

    console.log('[ObjectDetector] Loading COCO-SSD model...');
    model = await cocoSsd.load();
    console.log('[ObjectDetector] COCO-SSD model loaded successfully');
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
    throw err;
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
