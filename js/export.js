// export.js — Export (JPG/PNG/PDF)
class ExportManager {
  downloadImage(canvas, format = 'jpeg', quality = 0.95, filename = 'photo') {
    const mime = format === 'png' ? 'image/png' : 'image/jpeg';
    const ext = format === 'png' ? 'png' : 'jpg';
    const dataUrl = canvas.toDataURL(mime, quality);
    const link = document.createElement('a');
    link.download = `${filename}.${ext}`;
    link.href = dataUrl;
    link.click();
  }

  downloadPDF(canvas, preset, filename = 'photo') {
    // Generate a simple PDF with embedded image
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    // Using a minimal PDF generator inline (no dependencies)
    const dpi = preset?.dpi || 300;
    const wPt = (canvas.width / dpi) * 72;
    const hPt = (canvas.height / dpi) * 72;

    // Simple approach: open image in new window for printing
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`<!DOCTYPE html><html><head><title>${filename}</title>
        <style>@page{size:${Math.round(wPt)}pt ${Math.round(hPt)}pt;margin:0}
        body{margin:0;display:flex;justify-content:center;align-items:center}
        img{width:100%;height:100%;object-fit:contain}</style></head>
        <body><img src="${imgData}"></body></html>`);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  }

  async copyToClipboard(canvas) {
    try {
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      return true;
    } catch (e) {
      console.warn('Clipboard copy failed:', e);
      return false;
    }
  }
}
