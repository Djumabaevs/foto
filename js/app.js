// app.js — Main application controller
class App {
  constructor() {
    this.camera = new CameraManager();
    this.editor = new PhotoEditor(document.getElementById('editor-canvas'));
    this.bgProcessor = new BackgroundProcessor();
    this.faceDetector = new FaceDetector();
    this.validator = new PhotoValidator();
    this.printManager = new PrintManager();
    this.exportManager = new ExportManager();
    this.currentPreset = PRESETS[0];
    this.currentFace = null;
    this.currentScreen = 'presets';
    this.history = []; // localStorage history
    window.app = this;
    this.init();
  }

  async init() {
    this.renderPresets();
    this.bindEvents();
    this.loadHistory();
    // Init AI in background
    this.bgProcessor.init().catch(() => {});
    this.faceDetector.init().catch(() => {});
  }

  // === NAVIGATION ===
  showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(`screen-${name}`);
    if (screen) screen.classList.add('active');
    this.currentScreen = name;

    if (name === 'camera') this.initCamera();
    if (name === 'editor') this.editor.initCropInteraction();
  }

  // === PRESETS SCREEN ===
  renderPresets() {
    const grid = document.getElementById('presets-grid');
    grid.innerHTML = PRESETS.map(p => `
      <div class="preset-card" data-id="${p.id}">
        <div class="preset-flag">${p.flag}</div>
        <div class="preset-name">${p.name}</div>
        <div class="preset-size">${p.px ? `${p.width}×${p.height}px` : `${p.width}×${p.height}мм`}</div>
      </div>
    `).join('');
    grid.querySelectorAll('.preset-card').forEach(card => {
      card.addEventListener('click', () => this.selectPreset(card.dataset.id));
    });
  }

  selectPreset(id) {
    const preset = PRESETS.find(p => p.id === id);
    if (!preset) return;
    if (preset.custom) {
      this.showCustomPresetDialog();
      return;
    }
    this.currentPreset = preset;
    document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('selected'));
    document.querySelector(`.preset-card[data-id="${id}"]`)?.classList.add('selected');
    this.showScreen('camera');
  }

  showCustomPresetDialog() {
    const dialog = document.getElementById('custom-preset-dialog');
    dialog.classList.remove('hidden');
  }

  applyCustomPreset() {
    const w = parseInt(document.getElementById('custom-w').value) || 35;
    const h = parseInt(document.getElementById('custom-h').value) || 45;
    const bg = document.getElementById('custom-bg').value;
    this.currentPreset = {
      ...PRESETS.find(p => p.id === 'custom'),
      width: w, height: h, ratio: `${w}:${h}`, bg: bg
    };
    document.getElementById('custom-preset-dialog').classList.add('hidden');
    this.showScreen('camera');
  }

  // === CAMERA SCREEN ===
  async initCamera() {
    const video = document.getElementById('camera-video');
    await this.camera.init(video);
    this.updateCameraUI();
  }

  updateCameraUI() {
    const mirrorBtn = document.getElementById('btn-mirror');
    if (mirrorBtn) mirrorBtn.classList.toggle('active', this.camera.mirror);
    document.getElementById('timer-value').textContent =
      this.camera.timer === 0 ? 'Выкл' : `${this.camera.timer}с`;
  }

  toggleMirror() {
    this.camera.mirror = !this.camera.mirror;
    const video = document.getElementById('camera-video');
    video.style.transform = this.camera.mirror ? 'scaleX(-1)' : 'none';
    this.updateCameraUI();
  }

  cycleTimer() {
    const options = [0, 3, 5, 10];
    const idx = options.indexOf(this.camera.timer);
    this.camera.timer = options[(idx + 1) % options.length];
    this.updateCameraUI();
  }

  async takePhoto() {
    const canvas = await this.camera.captureWithTimer();
    this.editor.loadImage(canvas);
    this.currentFace = await this.faceDetector.detect(canvas);
    if (this.currentFace) {
      this.editor.setCropFromFace(this.currentFace);
      this.editor.render();
    }
    this.camera.stop();
    this.showScreen('editor');
  }

  async uploadPhoto() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      if (e.target.files[0]) {
        await this.editor.loadFromFile(e.target.files[0]);
        // Detect face after load
        setTimeout(async () => {
          this.currentFace = await this.faceDetector.detect(this.editor.canvas);
          if (this.currentFace) {
            this.editor.setCropFromFace(this.currentFace);
            this.editor.render();
          }
          this.showScreen('editor');
        }, 300);
      }
    };
    input.click();
  }

  // === EDITOR SCREEN ===
  autoCrop() {
    if (this.currentFace) {
      this.editor.setCropFromFace(this.currentFace);
      this.editor.render();
      this.showToast('Автокроп по лицу ✓');
    } else {
      this.showToast('Лицо не обнаружено');
    }
  }

  async removeBackground() {
    const btn = document.getElementById('btn-remove-bg');
    if (btn) btn.classList.add('loading');
    try {
      const cropped = this.editor.getCroppedCanvas();
      const result = await this.bgProcessor.removeBackground(cropped, this.currentPreset.bg || '#ffffff');
      // Replace current image with result
      const img = new Image();
      img.onload = () => {
        this.editor.currentImage = img;
        this.editor.render();
        if (btn) btn.classList.remove('loading');
        this.showToast('Фон заменён ✓');
      };
      img.src = result.toDataURL();
    } catch (e) {
      if (btn) btn.classList.remove('loading');
      this.showToast('Ошибка удаления фона');
    }
  }

  changeBgColor(color) {
    // Re-process with new color
    this.currentPreset = { ...this.currentPreset, bg: color };
    this.removeBackground();
  }

  updateFilter(name, value) {
    this.editor.setFilter(name, parseInt(value));
    document.getElementById(`${name}-value`).textContent = value;
  }

  updateRotation(value) {
    this.editor.setRotation(parseInt(value));
    document.getElementById('rotation-value').textContent = `${value}°`;
  }

  setSkinTone(tone) {
    this.editor.skinTone = tone;
    this.editor.render();
    document.querySelectorAll('.skin-tone-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.skin-tone-btn[data-tone="${tone}"]`)?.classList.add('active');
  }

  // === VALIDATION ===
  showValidation() {
    const results = this.validator.validate(
      this.currentPreset,
      this.editor.cropRect,
      this.editor.currentImage?.width,
      this.editor.currentImage?.height,
      this.currentFace
    );
    const list = document.getElementById('validation-list');
    list.innerHTML = results.map(r => `
      <div class="validation-item ${r.pass ? 'pass' : 'fail'}">
        <span class="validation-icon">${r.pass ? '✅' : '❌'}</span>
        <span class="validation-name">${r.name}</span>
        <span class="validation-detail">${r.detail}</span>
      </div>
    `).join('');
    this.showScreen('validation');
  }

  // === PRINT ===
  showPrint() {
    this.renderPrintLayouts();
    this.updatePrintPreview();
    this.showScreen('print');
  }

  renderPrintLayouts() {
    const container = document.getElementById('print-layouts');
    container.innerHTML = PRINT_LAYOUTS.map(l => `
      <div class="layout-card ${l.id === this.printManager.layout.id ? 'selected' : ''}" data-id="${l.id}">
        <div class="layout-grid" style="display:grid;grid-template-columns:repeat(${l.cols},1fr);gap:2px;width:40px;height:50px">
          ${Array(l.cols * l.rows).fill('<div style="background:#00d4ff;border-radius:1px"></div>').join('')}
        </div>
        <div class="layout-name">${l.name}</div>
      </div>
    `).join('');
    container.querySelectorAll('.layout-card').forEach(card => {
      card.addEventListener('click', () => {
        const layout = PRINT_LAYOUTS.find(l => l.id === card.dataset.id);
        if (layout) {
          this.printManager.layout = layout;
          this.renderPrintLayouts();
          this.updatePrintPreview();
        }
      });
    });
  }

  updatePrintPreview() {
    const cropped = this.editor.getCroppedCanvas();
    const { preview } = this.printManager.generatePreview(cropped, this.currentPreset, this.printManager.layout);
    const container = document.getElementById('print-preview');
    container.innerHTML = '';
    preview.style.maxWidth = '100%';
    container.appendChild(preview);
  }

  toggleCutLines() {
    this.printManager.cutLines = !this.printManager.cutLines;
    document.getElementById('btn-cut-lines').classList.toggle('active', this.printManager.cutLines);
    this.updatePrintPreview();
  }

  // === EXPORT ===
  showExport() {
    this.updateExportPreview();
    this.showScreen('export');
  }

  updateExportPreview() {
    const cropped = this.editor.getCroppedCanvas();
    const container = document.getElementById('export-preview');
    container.innerHTML = '';
    const preview = document.createElement('canvas');
    const maxW = 300;
    const scale = Math.min(1, maxW / cropped.width);
    preview.width = Math.round(cropped.width * scale);
    preview.height = Math.round(cropped.height * scale);
    preview.getContext('2d').drawImage(cropped, 0, 0, preview.width, preview.height);
    preview.style.maxWidth = '100%';
    container.appendChild(preview);
    // Info
    document.getElementById('export-info').innerHTML = `
      <div>${Math.round(cropped.width)} × ${Math.round(cropped.height)} px</div>
      <div>${this.currentPreset.name} (${this.currentPreset.px ? '' : this.currentPreset.width + '×' + this.currentPreset.height + 'мм'})</div>
    `;
  }

  exportJPG() {
    const cropped = this.editor.getCroppedCanvas();
    this.exportManager.downloadImage(cropped, 'jpeg', 0.95, `photo_${this.currentPreset.id}`);
    this.saveToHistory(cropped);
    this.showToast('JPG сохранён ✓');
  }

  exportPNG() {
    const cropped = this.editor.getCroppedCanvas();
    this.exportManager.downloadImage(cropped, 'png', 1, `photo_${this.currentPreset.id}`);
    this.saveToHistory(cropped);
    this.showToast('PNG сохранён ✓');
  }

  exportPDF() {
    const cropped = this.editor.getCroppedCanvas();
    this.exportManager.downloadPDF(cropped, this.currentPreset, `photo_${this.currentPreset.id}`);
    this.showToast('PDF открыт для печати');
  }

  exportPrintLayout() {
    const cropped = this.editor.getCroppedCanvas();
    const { full } = this.printManager.generatePreview(cropped, this.currentPreset, this.printManager.layout);
    this.exportManager.downloadImage(full, 'jpeg', 0.95, `print_${this.currentPreset.id}_${this.printManager.layout.id}`);
    this.showToast('Раскладка сохранена ✓');
  }

  async copyPhoto() {
    const cropped = this.editor.getCroppedCanvas();
    const ok = await this.exportManager.copyToClipboard(cropped);
    this.showToast(ok ? 'Скопировано ✓' : 'Ошибка копирования');
  }

  // === HISTORY ===
  saveToHistory(canvas) {
    try {
      const thumb = document.createElement('canvas');
      thumb.width = 100; thumb.height = Math.round(100 * canvas.height / canvas.width);
      thumb.getContext('2d').drawImage(canvas, 0, 0, thumb.width, thumb.height);
      const item = { preset: this.currentPreset.id, date: new Date().toISOString(), thumb: thumb.toDataURL('image/jpeg', 0.6) };
      this.history.unshift(item);
      if (this.history.length > 20) this.history.pop();
      localStorage.setItem('foto_history', JSON.stringify(this.history));
    } catch (e) { /* quota exceeded */ }
  }

  loadHistory() {
    try {
      this.history = JSON.parse(localStorage.getItem('foto_history') || '[]');
    } catch { this.history = []; }
  }

  // === UTILS ===
  showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  goBack() {
    const flow = ['presets', 'camera', 'editor', 'validation', 'print', 'export'];
    const idx = flow.indexOf(this.currentScreen);
    if (idx > 0) {
      if (this.currentScreen === 'camera') this.camera.stop();
      this.showScreen(flow[idx - 1]);
    }
  }

  // === EVENT BINDING ===
  bindEvents() {
    // Navigation
    document.getElementById('btn-upload')?.addEventListener('click', () => this.uploadPhoto());
    document.getElementById('btn-capture')?.addEventListener('click', () => this.takePhoto());
    document.getElementById('btn-switch-cam')?.addEventListener('click', () => this.camera.switchCamera());
    document.getElementById('btn-mirror')?.addEventListener('click', () => this.toggleMirror());
    document.getElementById('btn-timer')?.addEventListener('click', () => this.cycleTimer());

    // Editor
    document.getElementById('btn-auto-crop')?.addEventListener('click', () => this.autoCrop());
    document.getElementById('btn-remove-bg')?.addEventListener('click', () => this.removeBackground());
    document.getElementById('btn-validate')?.addEventListener('click', () => this.showValidation());
    document.getElementById('btn-to-print')?.addEventListener('click', () => this.showPrint());
    document.getElementById('btn-to-export')?.addEventListener('click', () => this.showExport());

    // Filters
    ['brightness', 'contrast', 'saturation'].forEach(f => {
      document.getElementById(`slider-${f}`)?.addEventListener('input', (e) => this.updateFilter(f, e.target.value));
    });
    document.getElementById('slider-rotation')?.addEventListener('input', (e) => this.updateRotation(e.target.value));

    // Skin tone
    document.querySelectorAll('.skin-tone-btn').forEach(btn => {
      btn.addEventListener('click', () => this.setSkinTone(btn.dataset.tone));
    });

    // Background color
    document.querySelectorAll('.bg-color-btn').forEach(btn => {
      btn.addEventListener('click', () => this.changeBgColor(btn.dataset.color));
    });

    // Print
    document.getElementById('btn-cut-lines')?.addEventListener('click', () => this.toggleCutLines());

    // Export
    document.getElementById('btn-export-jpg')?.addEventListener('click', () => this.exportJPG());
    document.getElementById('btn-export-png')?.addEventListener('click', () => this.exportPNG());
    document.getElementById('btn-export-pdf')?.addEventListener('click', () => this.exportPDF());
    document.getElementById('btn-export-print')?.addEventListener('click', () => this.exportPrintLayout());
    document.getElementById('btn-copy')?.addEventListener('click', () => this.copyPhoto());

    // Custom preset
    document.getElementById('btn-apply-custom')?.addEventListener('click', () => this.applyCustomPreset());
    document.getElementById('btn-cancel-custom')?.addEventListener('click', () => {
      document.getElementById('custom-preset-dialog').classList.add('hidden');
    });

    // Back buttons
    document.querySelectorAll('.btn-back').forEach(btn => {
      btn.addEventListener('click', () => this.goBack());
    });
  }
}

// Start app
document.addEventListener('DOMContentLoaded', () => new App());
