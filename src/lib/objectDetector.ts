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
    await tf.ready();

    const availableBackends = tf.engine().registry;
    if (Object.prototype.hasOwnProperty.call(availableBackends, 'webgl')) {
      try {
        await tf.setBackend('webgl');
      } catch {
        // fallback to default backend
      }
    }

    model = await cocoSsd.load();
  }
  return model;
}

export async function detectSuspiciousObjects(video: HTMLVideoElement) {
  const detector = await loadObjectDetector();
  const predictions = await detector.detect(video);
  return predictions.filter(prediction => {
    const label = prediction.class.toLowerCase();
    return (suspiciousLabels.has(label) || label.includes('phone')) && prediction.score >= 0.45;
  });
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
