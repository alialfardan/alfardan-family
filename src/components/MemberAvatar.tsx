import React, { useState, useEffect } from 'react';
import { getArabicInitial, loadCustomAvatarsBackup } from '../data/treeManager';

// Session-wide cache of URLs that failed to load so we never re-request a 404 avatar
const failedAvatarUrls = new Set<string>();

const VALID_AVATAR_PATH_RE = /^\/avatars\/(o\d+|oF|oR|am_[a-zA-Z0-9_-]+|arch_[a-zA-Z0-9_-]+|photo_[a-zA-Z0-9_-]+)\.(jpg|jpeg|png|webp)(\?.*)?$/i;

export function markAvatarUrlFailed(url: string): void {
  if (!url) return;
  failedAvatarUrls.add(url);
  const base = url.split('?')[0];
  if (base) failedAvatarUrls.add(base);
}

export function isAvatarUrlFailed(url?: string | null): boolean {
  if (!url) return true;
  const base = url.split('?')[0];
  return failedAvatarUrls.has(url) || (base ? failedAvatarUrls.has(base) : false);
}

/**
 * Validates and normalizes an avatar URL.
 * Rejects any legacy paths containing spaces, %20, WhatsApp filenames, or malformed /avatars/ paths
 * BEFORE the browser attempts a network request.
 */
export function sanitizeAvatarUrl(rawUrl?: string | null, personKey?: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // Allow inline data URLs directly
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  // Reject any path with spaces, encoded spaces, or legacy WhatsApp filenames
  if (
    trimmed.includes(' ') ||
    trimmed.includes('%20') ||
    trimmed.includes('WhatsApp') ||
    trimmed.includes('\\')
  ) {
    if (personKey) {
      const backups = loadCustomAvatarsBackup();
      if (backups[personKey] && backups[personKey].startsWith('data:image/')) {
        return backups[personKey];
      }
    }
    return null;
  }

  // Validate /avatars/ paths strictly
  if (trimmed.startsWith('/avatars/')) {
    if (!VALID_AVATAR_PATH_RE.test(trimmed)) {
      if (personKey) {
        const backups = loadCustomAvatarsBackup();
        if (backups[personKey] && backups[personKey].startsWith('data:image/')) {
          return backups[personKey];
        }
      }
      return null;
    }
    if (isAvatarUrlFailed(trimmed)) {
      const match = trimmed.match(/^\/avatars\/([^.?]+)\./);
      const key = personKey || (match ? match[1] : '');
      if (key) {
        const backups = loadCustomAvatarsBackup();
        if (backups[key] && backups[key].startsWith('data:image/')) {
          return backups[key];
        }
      }
      return null;
    }
    return trimmed;
  }

  if (isAvatarUrlFailed(trimmed)) {
    return null;
  }

  return trimmed;
}

/**
 * Generates an elegant inline SVG Data URI for instant fallback when an image 404s.
 * Because it is a data: URI, setting img.src to this never triggers a network request.
 */
export function getDefaultAvatarDataUri(name?: string, gender: 'm' | 'f' = 'm'): string {
  const initial = name ? getArabicInitial(name) : 'ف';
  const bgStart = gender === 'f' ? '#fff1f2' : '#ecfdf5';
  const bgEnd = gender === 'f' ? '#ffe4e6' : '#d1fae5';
  const border = gender === 'f' ? '#fda4af' : '#6ee7b7';
  const textFill = gender === 'f' ? '#be123c' : '#065f46';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgStart}" />
        <stop offset="100%" stop-color="${bgEnd}" />
      </linearGradient>
    </defs>
    <rect width="120" height="120" rx="24" fill="url(#bg)" stroke="${border}" stroke-width="2" />
    <circle cx="60" cy="44" r="18" fill="${textFill}" fill-opacity="0.12" />
    <path d="M28 104 C28 82 92 82 92 104" fill="${textFill}" fill-opacity="0.12" />
    <text x="60" y="66" text-anchor="middle" dominant-baseline="central" font-family="Alexandria, Readex Pro, sans-serif" font-size="42" font-weight="700" fill="${textFill}">${initial}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface MemberAvatarProps {
  src?: string | null;
  personKey?: string;
  name?: string;
  gender?: 'm' | 'f';
  alt?: string;
  className?: string;
  imgClassName?: string;
  fallbackTextClassName?: string;
  loading?: 'lazy' | 'eager';
}

export const MemberAvatar: React.FC<MemberAvatarProps> = ({
  src,
  personKey,
  name = '',
  gender = 'm',
  alt = '',
  className = 'w-full h-full',
  imgClassName = 'w-full h-full object-cover',
  fallbackTextClassName = "font-['Alexandria'] font-bold select-none",
  loading = 'lazy',
}) => {
  const safeInitialSrc = sanitizeAvatarUrl(src, personKey);
  const [activeSrc, setActiveSrc] = useState<string | null>(safeInitialSrc);
  const [failed, setFailed] = useState<boolean>(!safeInitialSrc);

  useEffect(() => {
    const nextSafe = sanitizeAvatarUrl(src, personKey);
    setActiveSrc(nextSafe);
    setFailed(!nextSafe);
  }, [src, personKey]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.stopPropagation();
    if (activeSrc) {
      markAvatarUrlFailed(activeSrc);
    }
    // Check if we have a base64 backup in localStorage / customAvatarsBackup
    const match = activeSrc ? activeSrc.match(/^\/avatars\/([^.?]+)\./) : null;
    const resolvedKey = personKey || (match ? match[1] : '');
    if (resolvedKey) {
      const backups = loadCustomAvatarsBackup();
      const backupDataUrl = backups[resolvedKey];
      if (backupDataUrl && backupDataUrl.startsWith('data:image/') && backupDataUrl !== activeSrc) {
        setActiveSrc(backupDataUrl);
        setFailed(false);
        return;
      }
    }
    setActiveSrc(null);
    setFailed(true);
  };

  if (failed || !activeSrc) {
    return (
      <div className={`flex items-center justify-center relative overflow-hidden ${className}`}>
        <span className={fallbackTextClassName}>
          {getArabicInitial(name)}
        </span>
      </div>
    );
  }

  return (
    <img
      src={activeSrc}
      alt={alt || name}
      loading={loading}
      decoding="async"
      className={imgClassName}
      onError={handleError}
    />
  );
};

export default MemberAvatar;
