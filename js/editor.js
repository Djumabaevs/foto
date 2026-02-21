// editor.js — Photo editor (crop, filters, adjustments)
class PhotoEditor {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.originalImage = null;
    this.currentImage = null;
    this.cropRect = { x: 0, y: 0, w: 0, h: 0 };
    this.rotation = 0;
    this.filters = { brightness: 0, contrast: 0, saturation: 0, sharpness: 0 };
    this.skinTone = 'neutral'; // warm, cool, neutral
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.dragType = null; // 'move', 'resize-tl', 'resize-tr', 'resize-bl', 'resize-br'
  }

  loadImage(canvas) {
    this.originalImage = new Image();
    this.originalImage.src = canvas.toDataURL();
    this.originalImage.onload = () => {
      this.currentImage = this.originalImage;
      this.resetCrop();
      this.render();
    };
  }

  loadFromFile(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.originalImage = new Image();
        this.originalImage.onload = () => {
          this.currentImage = this.originalImage;
          this.resetCrop();
          this.render();
          resolve();
        };
        this.originalImage.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  resetCrop() {
    if (!this.currentImage) return;
    const preset = window.app?.currentPreset;
    if (preset) {
      const imgRatio = this.currentImage.width / this.currentImage.height;
      const [rw, rh] = preset.ratio.split(':').map(Number);
      const presetRatio = rw / rh;
      let cw, ch;
      if (imgRatio > presetRatio) {
        ch = this.currentImage.height * 0.85;
        cw = ch * presetRatio;
      } else {
        cw = this.currentImage.width * 0.85;
        ch = cw / presetRatio;
      }
      this.cropRect = {
        x: (this.currentImage.width - cw) / 2,
        y: (this.currentImage.height - ch) / 2,
        w: cw, h: ch
      };
    } else {
      this.cropRect = { x: 0, y: 0, w: this.currentImage.width, h: this.currentImage.height };
    }
  }

  setCropFromFace(faceBox) {
    if (!faceBox || !this.currentImage) return;
    const preset = window.app?.currentPreset;
    if (!preset) return;
    const [rw, rh] = preset.ratio.split(':').map(Number);
    const presetRatio = rw / rh;
    const faceH = faceBox.height * this.currentImage.height;
    const targetFacePercent = (preset.facePercent[0] + preset.facePercent[1]) / 2 / 100;
    const cropH = faceH / targetFacePercent;
    const cropW = cropH * presetRatio;
    const faceCX = (faceBox.xCenter || faceBox.x + faceBox.width / 2) * this.currentImage.width;
    const faceCY = (faceBox.yCenter || faceBox.y + faceBox.height / 2) * this.currentImage.height;
    let x = faceCX - cropW / 2;
    let y = faceCY - cropH * preset.eyeLine;
    x = Math.max(0, Math.min(x, this.currentImage.width - cropW));
    y = Math.max(0, Math.min(y, this.currentImage.height - cropH));
    this.cropRect = { x, y, w: Math.min(cropW, this.currentImage.width), h: Math.min(cropH, this.currentImage.height) };
  }

  setFilter(name, value) {
    this.filters[name] = value;
    this.render();
  }

  setRotation(deg) {
    this.rotation = deg;
    this.render();
  }

  render() {
    if (!this.currentImage) return;
    const img = this.currentImage;
    this.canvas.width = img.width;
    this.canvas.height = img.height;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.save();
    if (this.rotation !== 0) {
      ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
      ctx.rotate(this.rotation * Math.PI / 180);
      ctx.translate(-this.canvas.width / 2, -this.canvas.height / 2);
    }
    // Apply CSS filters
    const b = 100 + this.filters.brightness;
    const c = 100 + this.filters.contrast;
    const s = 100 + this.filters.saturation;
    let filterStr = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;
    if (this.skinTone === 'warm') filterStr += ' sepia(10%)';
    else if (this.skinTone === 'cool') filterStr += ' hue-rotate(10deg)';
    ctx.filter = filterStr;
    ctx.drawImage(img, 0, 0);
    ctx.restore();
    // Draw crop overlay
    this.drawCropOverlay();
  }

  drawCropOverlay() {
    const ctx = this.ctx;
    const c = this.cropRect;
    const displayScale = this.canvas.clientWidth / this.canvas.width || 1;
    // Darken outside crop
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, this.canvas.width, c.y);
    ctx.fillRect(0, c.y + c.h, this.canvas.width, this.canvas.height - c.y - c.h);
    ctx.fillRect(0, c.y, c.x, c.h);
    ctx.fillRect(c.x + c.w, c.y, this.canvas.width - c.x - c.w, c.h);
    // Crop border
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2 / displayScale;
    ctx.strokeRect(c.x, c.y, c.w, c.h);
    // Corner handles
    const hs = 10 / displayScale;
    ctx.fillStyle = '#00d4ff';
    [[c.x, c.y], [c.x + c.w, c.y], [c.x, c.y + c.h], [c.x + c.w, c.y + c.h]].forEach(([cx, cy]) => {
      ctx.fillRect(cx - hs / 2, cy - hs / 2, hs, hs);
    });
    // Guide: face oval
    const ovalCX = c.x + c.w / 2;
    const ovalCY = c.y + c.h * 0.42;
    const ovalRX = c.w * 0.28;
    const ovalRY = c.h * 0.32;
    ctx.strokeStyle = 'rgba(0,212,255,0.35)';
    ctx.lineWidth = 1.5 / displayScale;
    ctx.beginPath();
    ctx.ellipse(ovalCX, ovalCY, ovalRX, ovalRY, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Eye line
    const eyeY = c.y + c.h * (window.app?.currentPreset?.eyeLine || 0.45);
    ctx.setLineDash([6 / displayScale, 4 / displayScale]);
    ctx.strokeStyle = 'rgba(0,212,255,0.25)';
    ctx.beginPath();
    ctx.moveTo(c.x, eyeY);
    ctx.lineTo(c.x + c.w, eyeY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  getCroppedCanvas() {
    const result = document.createElement('canvas');
    const c = this.cropRect;
    result.width = c.w;
    result.height = c.h;
    const ctx = result.getContext('2d');
    // Apply filters
    const b = 100 + this.filters.brightness;
    const co = 100 + this.filters.contrast;
    const s = 100 + this.filters.saturation;
    let filterStr = `brightness(${b}%) contrast(${co}%) saturate(${s}%)`;
    if (this.skinTone === 'warm') filterStr += ' sepia(10%)';
    else if (this.skinTone === 'cool') filterStr += ' hue-rotate(10deg)';
    ctx.filter = filterStr;
    ctx.save();
    if (this.rotation !== 0) {
      ctx.translate(c.w / 2, c.h / 2);
      ctx.rotate(this.rotation * Math.PI / 180);
      ctx.translate(-c.w / 2, -c.h / 2);
    }
    ctx.drawImage(this.currentImage, c.x, c.y, c.w, c.h, 0, 0, c.w, c.h);
    ctx.restore();
    return result;
  }

  // Mouse/touch handlers for crop dragging
  initCropInteraction() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const touch = e.touches ? e.touches[0] : e;
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    };

    const handleSize = 20;
    const hitTest = (pos) => {
      const c = this.cropRect;
      const corners = [
        { type: 'resize-tl', x: c.x, y: c.y },
        { type: 'resize-tr', x: c.x + c.w, y: c.y },
        { type: 'resize-bl', x: c.x, y: c.y + c.h },
        { type: 'resize-br', x: c.x + c.w, y: c.y + c.h },
      ];
      for (const corner of corners) {
        if (Math.abs(pos.x - corner.x) < handleSize && Math.abs(pos.y - corner.y) < handleSize) {
          return corner.type;
        }
      }
      if (pos.x > c.x && pos.x < c.x + c.w && pos.y > c.y && pos.y < c.y + c.h) return 'move';
      return null;
    };

    const onStart = (e) => {
      const pos = getPos(e);
      this.dragType = hitTest(pos);
      if (this.dragType) {
        this.isDragging = true;
        this.dragStart = pos;
        this._cropStart = { ...this.cropRect };
        e.preventDefault();
      }
    };

    const onMove = (e) => {
      if (!this.isDragging) return;
      const pos = getPos(e);
      const dx = pos.x - this.dragStart.x;
      const dy = pos.y - this.dragStart.y;
      const s = this._cropStart;
      const preset = window.app?.currentPreset;
      const [rw, rh] = preset ? preset.ratio.split(':').map(Number) : [1, 1];
      const ratio = rw / rh;

      if (this.dragType === 'move') {
        this.cropRect.x = Math.max(0, Math.min(s.x + dx, this.currentImage.width - s.w));
        this.cropRect.y = Math.max(0, Math.min(s.y + dy, this.currentImage.height - s.h));
      } else {
        // Resize with aspect ratio lock
        let newW, newH;
        if (this.dragType.includes('r')) {
          newW = Math.max(50, s.w + dx);
        } else {
          newW = Math.max(50, s.w - dx);
        }
        newH = newW / ratio;
        this.cropRect.w = newW;
        this.cropRect.h = newH;
        if (this.dragType.includes('tl')) {
          this.cropRect.x = s.x + s.w - newW;
          this.cropRect.y = s.y + s.h - newH;
        } else if (this.dragType.includes('tr')) {
          this.cropRect.y = s.y + s.h - newH;
        } else if (this.dragType.includes('bl')) {
          this.cropRect.x = s.x + s.w - newW;
        }
      }
      this.render();
      e.preventDefault();
    };

    const onEnd = () => { this.isDragging = false; this.dragType = null; };

    this.canvas.addEventListener('mousedown', onStart);
    this.canvas.addEventListener('mousemove', onMove);
    this.canvas.addEventListener('mouseup', onEnd);
    this.canvas.addEventListener('touchstart', onStart, { passive: false });
    this.canvas.addEventListener('touchmove', onMove, { passive: false });
    this.canvas.addEventListener('touchend', onEnd);
  }
}
