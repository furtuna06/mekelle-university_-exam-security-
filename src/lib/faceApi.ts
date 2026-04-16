import * as faceapi from 'face-api.js';

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

export async function loadModels() {
  console.log("Starting to load face-api models from:", MODEL_URL);
  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    ]);
    console.log("Models loaded successfully");
  } catch (err) {
    console.error("Error loading models:", err);
    throw err;
  }
}

export async function getFaceDescriptor(input: HTMLVideoElement | HTMLImageElement) {
  const detection = await faceapi
    .detectSingleFace(input)
    .withFaceLandmarks()
    .withFaceDescriptor();
  
  return detection ? detection.descriptor : null;
}

export function computeFaceSimilarity(descriptor1: Float32Array, descriptor2: Float32Array) {
  return faceapi.euclideanDistance(descriptor1, descriptor2);
}
