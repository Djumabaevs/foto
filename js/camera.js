// camera.js — Camera handling via WebRTC
class CameraManager {
  constructor() {
    this.stream = null;
    this.video = null;
    this.devices = [];
    this.currentDeviceId = null;
    this.mirror = true;
    this.timer = 0; // 0 = off
    this.zoom = 1;
  }

  async init(videoElement) {
    this.video = videoElement;
    await this.enumerateDevices();
    if (this.devices.length > 0) {
      await this.start(this.devices[0].deviceId);
    }
  }

  async enumerateDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    this.devices = devices.filter(d => d.kind === 'videoinput');
    return this.devices;
  }

  async start(deviceId) {
    if (this.stream) this.stop();
    this.currentDeviceId = deviceId;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      this.video.srcObject = this.stream;
      await this.video.play();
    } catch (e) {
      // Fallback without exact device
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      this.video.srcObject = this.stream;
      await this.video.play();
    }
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  }

  async switchCamera() {
    const idx = this.devices.findIndex(d => d.deviceId === this.currentDeviceId);
    const next = this.devices[(idx + 1) % this.devices.length];
    if (next) await this.start(next.deviceId);
  }

  capture() {
    const canvas = document.createElement('canvas');
    canvas.width = this.video.videoWidth;
    canvas.height = this.video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (this.mirror) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(this.video, 0, 0);
    return canvas;
  }

  async captureWithTimer() {
    if (this.timer > 0) {
      return new Promise(resolve => {
        let remaining = this.timer;
        const timerEl = document.getElementById('timer-display');
        if (timerEl) timerEl.textContent = remaining;
        if (timerEl) timerEl.classList.remove('hidden');
        const interval = setInterval(() => {
          remaining--;
          if (timerEl) timerEl.textContent = remaining;
          if (remaining <= 0) {
            clearInterval(interval);
            if (timerEl) timerEl.classList.add('hidden');
            resolve(this.capture());
          }
        }, 1000);
      });
    }
    return this.capture();
  }
}
