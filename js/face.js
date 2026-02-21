// face.js — Face detection using MediaPipe Face Detection
class FaceDetector {
  constructor() {
    this.detector = null;
    this.ready = false;
  }

  async init() {
    if (this.ready) return;
    try {
      if (typeof faceDetection !== 'undefined') {
        this.detector = await faceDetection.createDetector(
          faceDetection.SupportedModels.MediaPipeFaceDetector,
          { runtime: 'mediapipe', solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection', modelType: 'short' }
        );
        this.ready = true;
        console.log('Face detector ready');
      }
    } catch (e) {
      console.warn('Face detection init failed:', e);
    }
  }

  async detect(imageSource) {
    if (!this.ready || !this.detector) return null;
    try {
      const faces = await this.detector.estimateFaces(imageSource);
      if (faces.length === 0) return null;
      const face = faces[0];
      const box = face.box;
      // Normalize to 0-1 range
      const w = imageSource.width || imageSource.videoWidth;
      const h = imageSource.height || imageSource.videoHeight;
      return {
        x: box.xMin / w,
        y: box.yMin / h,
        width: box.width / w,
        height: box.height / h,
        xCenter: (box.xMin + box.width / 2) / w,
        yCenter: (box.yMin + box.height / 2) / h,
        keypoints: face.keypoints
      };
    } catch (e) {
      console.warn('Face detection failed:', e);
      return null;
    }
  }
}
