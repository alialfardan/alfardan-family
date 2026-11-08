const GITHUB_RAW_PUBLIC = 'https://raw.githubusercontent.com/alialfardan/alfardan-family/main/public';

/**
 * Resolves a fallback URL if a local /avatars/ or /assets/ image hasn't finished deploying to GitHub Pages yet.
 */
export function getFallbackImageUrl(url: string): string | null {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return null;
  if (url.startsWith('/')) {
    const cleanPath = url.split('?')[0];
    return `${GITHUB_RAW_PUBLIC}${cleanPath}?t=${Date.now()}`;
  }
  return null;
}

/**
 * Converts a base64 data URL into a Blob for reliable file downloading across all browsers and mobile devices.
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(parts[1]);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

/**
 * Universal smooth image downloader that works across Desktop, iPhone/iPad Safari, Android, PWA, and inside iframes.
 */
export async function downloadImageSmoothly(
  url: string,
  suggestedFilename: string,
  onShowToast?: (message: string, type?: 'success' | 'info') => void
): Promise<void> {
  if (!url) return;

  const cleanFilename = suggestedFilename.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'alfardan-image.jpg';
  const finalFilename = /\.(jpg|jpeg|png|webp|jfif)$/i.test(cleanFilename)
    ? cleanFilename
    : `${cleanFilename}.jpg`;

  try {
    let blob: Blob | null = null;

    if (url.startsWith('data:image/')) {
      blob = dataUrlToBlob(url);
    } else {
      try {
        const res = await fetch(url, { mode: 'cors', cache: 'no-cache' });
        if (res.ok) {
          blob = await res.blob();
        }
      } catch {
        // Fallback to GitHub Raw if local path fails
      }

      if (!blob) {
        const fallbackUrl = getFallbackImageUrl(url);
        if (fallbackUrl) {
          try {
            const res2 = await fetch(fallbackUrl, { mode: 'cors', cache: 'no-cache' });
            if (res2.ok) {
              blob = await res2.blob();
            }
          } catch {
            // Ignore
          }
        }
      }
    }

    if (blob) {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = finalFilename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 6000);
      if (onShowToast) {
        onShowToast(`تم بدء تحميل «${finalFilename}» بنجاح 📥`, 'success');
      }
      return;
    }

    // Fallback direct anchor click if blob conversion was blocked by CORS
    const a = document.createElement('a');
    a.href = url;
    a.download = finalFilename;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (onShowToast) {
      onShowToast(`تم فتح/تحميل الصورة بنجاح 📥`, 'success');
    }
  } catch (err) {
    console.error('Download image error:', err);
    if (onShowToast) {
      onShowToast('حدث خطأ أثناء تحميل الصورة، يرجى المحاولة مرة أخرى', 'info');
    }
  }
}

/**
 * Compresses an uploaded image file to a crisp, cloud-ready JPEG data URL (< 320KB)
 * so it can be synced instantaneously via Firebase Firestore AND uploaded to /api/upload-avatar for GitHub.
 */
export function compressImageFile(
  file: File,
  maxDimension = 1400,
  targetMaxBytes = 320000
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('يرجى اختيار ملف صورة صالح (JPG, PNG, WebP).'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة من الجهاز.'));
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => reject(new Error('ملف الصورة غير صالح أو تالف.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('تعذر معالجة الصورة في المتصفح.'));
          return;
        }

        // Fill white background for transparent PNGs
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.84;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        // Iteratively step down quality/dimensions if still larger than targetMaxBytes (~320KB)
        while (dataUrl.length * 0.75 > targetMaxBytes && quality > 0.45) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        if (dataUrl.length * 0.75 > targetMaxBytes) {
          const scale = 0.75;
          canvas.width = Math.round(width * scale);
          canvas.height = Math.round(height * scale);
          const ctx2 = canvas.getContext('2d');
          if (ctx2) {
            ctx2.fillStyle = '#FFFFFF';
            ctx2.fillRect(0, 0, canvas.width, canvas.height);
            ctx2.drawImage(img, 0, 0, canvas.width, canvas.height);
            dataUrl = canvas.toDataURL('image/jpeg', 0.72);
          }
        }

        resolve(dataUrl);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Fast offscreen Canvas compressor for family member profile avatars:
 * Produces crisp, ultra-lightweight 200x200 WebP/JPEG at 0.7 quality (~5KB-9KB) in < 10ms.
 * Prevents browser freezes and allows instant disk and cloud persistence directly inside JSON.
 */
export async function fastCompressAvatar(
  imageSource: File | Blob | string,
  targetSize: number = 200,
  quality: number = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    let srcUrl = '';
    let isRevokeNeeded = false;

    if (typeof imageSource === 'string') {
      srcUrl = imageSource;
    } else {
      srcUrl = URL.createObjectURL(imageSource);
      isRevokeNeeded = true;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (isRevokeNeeded) {
        try { URL.revokeObjectURL(srcUrl); } catch {}
      }
      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(typeof imageSource === 'string' ? imageSource : '');
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // White background to avoid black PNG borders
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetSize, targetSize);

        const nw = img.naturalWidth || img.width;
        const nh = img.naturalHeight || img.height;
        const scale = Math.max(targetSize / nw, targetSize / nh);
        const rw = nw * scale;
        const rh = nh * scale;

        const sx = (targetSize - rw) / 2;
        let sy = (targetSize - rh) / 2;
        if (nh > nw) {
          // Upper 12% focus for portrait face orientation
          sy = Math.max(targetSize - rh, Math.min(0, -rh * 0.12));
        }

        ctx.drawImage(img, sx, sy, rw, rh);
        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl || !dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (e) => {
      if (isRevokeNeeded) {
        try { URL.revokeObjectURL(srcUrl); } catch {}
      }
      reject(e);
    };

    img.src = srcUrl;
  });
}
