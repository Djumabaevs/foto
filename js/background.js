// background.js — AI background removal & replacement using MediaPipe / TF.js
class BackgroundProcessor {
  constructor() {
    this.segmenter = null;
    this.ready = false;
  }

  async init() {
    if (this.ready) return;
    try {
      // Try MediaPipe Selfie Segmentation via TF.js
      if (typeof bodySegmentation !== 'undefined') {
        this.segmenter = await bodySegmentation.createSegmenter(
          bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation,
          { runtime: 'mediapipe', solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation', modelType: 'general' }
        );
        this.ready = true;
        console.log('Background segmenter ready (MediaPipe)');
      }
    } catch (e) {
      console.warn('MediaPipe segmenter failed, falling back to canvas-based:', e);
    }
  }

  async removeBackground(canvas, bgColor = '#ffffff') {
    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = canvas.width;
    resultCanvas.height = canvas.height;
    const ctx = resultCanvas.getContext('2d');

    if (this.ready && this.segmenter) {
      try {
        const segmentation = await this.segmenter.segmentPeople(canvas);
        if (segmentation.length > 0) {
          const mask = segmentation[0].mask;
          const maskCanvas = await mask.toCanvasImageSource();
          // Draw background color
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, resultCanvas.width, resultCanvas.height);
          // Use mask to composite person
          ctx.globalCompositeOperation = 'destination-in';
          ctx.drawImage(maskCanvas, 0, 0, resultCanvas.width, resultCanvas.height);
          ctx.globalCompositeOperation = 'destination-over';
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, resultCanvas.width, resultCanvas.height);
          ctx.globalCompositeOperation = 'source-over';
          // Draw person on top
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          const tempCtx = tempCanvas.getContext('2d');
          tempCtx.drawImage(canvas, 0, 0);
          tempCtx.globalCompositeOperation = 'destination-in';
          tempCtx.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);
          ctx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, resultCanvas.width, resultCanvas.height);
          ctx.drawImage(tempCanvas, 0, 0);
          return resultCanvas;
        }
      } catch (e) {
        console.warn('AI segmentation failed:', e);
      }
    }

    // Fallback: simple chroma-key style (just replace near-uniform colors)
    ctx.drawImage(canvas, 0, 0);
    this.simpleBackgroundReplace(ctx, resultCanvas.width, resultCanvas.height, bgColor);
    return resultCanvas;
  }

  simpleBackgroundReplace(ctx, w, h, bgColor) {
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    // Sample corners to detect background color
    const samples = [
      [0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1],
      [Math.floor(w * 0.1), 0], [Math.floor(w * 0.9), 0]
    ];
    let avgR = 0, avgG = 0, avgB = 0, count = 0;
    for (const [sx, sy] of samples) {
      const i = (sy * w + sx) * 4;
      avgR += data[i]; avgG += data[i + 1]; avgB += data[i + 2]; count++;
    }
    avgR /= count; avgG /= count; avgB /= count;

    // Parse bgColor
    const div = document.createElement('div');
    div.style.color = bgColor;
    document.body.appendChild(div);
    const rgb = getComputedStyle(div).color.match(/\d+/g).map(Number);
    document.body.removeChild(div);

    const threshold = 60;
    for (let i = 0; i < data.length; i += 4) {
      const dr = data[i] - avgR, dg = data[i + 1] - avgG, db = data[i + 2] - avgB;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);
      if (dist < threshold) {
        data[i] = rgb[0]; data[i + 1] = rgb[1]; data[i + 2] = rgb[2];
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }
}
