// print.js — Print layout generation
class PrintManager {
  constructor() {
    this.layout = PRINT_LAYOUTS[0];
    this.gap = 2; // mm between photos
    this.cutLines = true;
  }

  generateLayout(croppedCanvas, preset, layout) {
    if (!layout) layout = this.layout;
    const dpi = preset.dpi || 300;
    const pxPerMm = dpi / 25.4;
    const photoW = preset.px ? preset.width : Math.round(preset.width * pxPerMm);
    const photoH = preset.px ? preset.height : Math.round(preset.height * pxPerMm);
    const gapPx = Math.round(this.gap * pxPerMm);

    let paperW, paperH;
    if (layout.paper) {
      paperW = Math.round(layout.paper.w * pxPerMm);
      paperH = Math.round(layout.paper.h * pxPerMm);
    } else {
      paperW = photoW + gapPx * 2;
      paperH = photoH + gapPx * 2;
    }

    const canvas = document.createElement('canvas');
    canvas.width = paperW;
    canvas.height = paperH;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, paperW, paperH);

    const cols = layout.cols;
    const rows = layout.rows;
    const totalW = cols * photoW + (cols - 1) * gapPx;
    const totalH = rows * photoH + (rows - 1) * gapPx;
    const startX = Math.round((paperW - totalW) / 2);
    const startY = Math.round((paperH - totalH) / 2);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * (photoW + gapPx);
        const y = startY + r * (photoH + gapPx);
        ctx.drawImage(croppedCanvas, 0, 0, croppedCanvas.width, croppedCanvas.height, x, y, photoW, photoH);

        if (this.cutLines) {
          ctx.strokeStyle = '#cccccc';
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);
          // Cut lines extending to edges
          const ext = Math.round(5 * pxPerMm);
          // Top-left corner
          ctx.beginPath();
          ctx.moveTo(x - ext, y); ctx.lineTo(x, y); ctx.moveTo(x, y - ext); ctx.lineTo(x, y);
          // Top-right
          ctx.moveTo(x + photoW, y - ext); ctx.lineTo(x + photoW, y); ctx.moveTo(x + photoW, y); ctx.lineTo(x + photoW + ext, y);
          // Bottom-left
          ctx.moveTo(x - ext, y + photoH); ctx.lineTo(x, y + photoH); ctx.moveTo(x, y + photoH); ctx.lineTo(x, y + photoH + ext);
          // Bottom-right
          ctx.moveTo(x + photoW, y + photoH); ctx.lineTo(x + photoW + ext, y + photoH); ctx.moveTo(x + photoW, y + photoH); ctx.lineTo(x + photoW, y + photoH + ext);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    return canvas;
  }

  generatePreview(croppedCanvas, preset, layout) {
    const full = this.generateLayout(croppedCanvas, preset, layout);
    // Scale down for preview
    const maxW = 600;
    const scale = Math.min(1, maxW / full.width);
    const preview = document.createElement('canvas');
    preview.width = Math.round(full.width * scale);
    preview.height = Math.round(full.height * scale);
    const ctx = preview.getContext('2d');
    ctx.drawImage(full, 0, 0, preview.width, preview.height);
    return { preview, full };
  }
}
