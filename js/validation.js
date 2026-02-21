// validation.js — Photo validation against document requirements
class PhotoValidator {
  validate(preset, cropRect, imageWidth, imageHeight, faceBox) {
    const results = [];
    if (!preset || !cropRect) return results;

    const [rw, rh] = preset.ratio.split(':').map(Number);
    const expectedRatio = rw / rh;
    const actualRatio = cropRect.w / cropRect.h;

    // Aspect ratio check
    const ratioDiff = Math.abs(actualRatio - expectedRatio) / expectedRatio;
    results.push({
      name: 'Пропорции',
      pass: ratioDiff < 0.02,
      detail: `${preset.ratio} (${ratioDiff < 0.02 ? 'OK' : 'не совпадает'})`
    });

    // Resolution check
    const dpi = preset.dpi || 300;
    const requiredPxW = preset.px ? preset.width : Math.ceil(preset.width / 25.4 * dpi);
    const requiredPxH = preset.px ? preset.height : Math.ceil(preset.height / 25.4 * dpi);
    const sufficient = cropRect.w >= requiredPxW * 0.8 && cropRect.h >= requiredPxH * 0.8;
    results.push({
      name: 'Разрешение',
      pass: sufficient,
      detail: `${Math.round(cropRect.w)}×${Math.round(cropRect.h)}px (нужно ≥${requiredPxW}×${requiredPxH})`
    });

    if (faceBox) {
      // Face size check
      const facePercent = (faceBox.height * imageHeight / cropRect.h) * 100;
      const [minFace, maxFace] = preset.facePercent;
      results.push({
        name: 'Размер лица',
        pass: facePercent >= minFace && facePercent <= maxFace,
        detail: `${Math.round(facePercent)}% (нужно ${minFace}-${maxFace}%)`
      });

      // Eye line position
      const eyeY = faceBox.yCenter || (faceBox.y + faceBox.height * 0.35);
      const eyeLineInCrop = (eyeY * imageHeight - cropRect.y) / cropRect.h;
      const idealEyeLine = preset.eyeLine || 0.45;
      results.push({
        name: 'Линия глаз',
        pass: Math.abs(eyeLineInCrop - idealEyeLine) < 0.08,
        detail: `${Math.round(eyeLineInCrop * 100)}% (идеал ~${Math.round(idealEyeLine * 100)}%)`
      });

      // Head centering
      const faceCenterX = (faceBox.xCenter || faceBox.x + faceBox.width / 2) * imageWidth;
      const cropCenterX = cropRect.x + cropRect.w / 2;
      const centerOffset = Math.abs(faceCenterX - cropCenterX) / cropRect.w;
      results.push({
        name: 'Центрирование',
        pass: centerOffset < 0.08,
        detail: centerOffset < 0.08 ? 'По центру' : 'Смещено'
      });
    } else {
      results.push({ name: 'Лицо', pass: false, detail: 'Не обнаружено' });
    }

    return results;
  }
}
