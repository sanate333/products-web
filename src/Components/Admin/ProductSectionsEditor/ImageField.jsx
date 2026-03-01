import React, { useRef, useState } from 'react';
import { normalizeSectionImage, resolveSectionImageSource } from '../../../utils/productSections';
import baseURL, { resolveImg } from '../../url';

const safeSrc = (value) => {
  const raw = resolveSectionImageSource(value);
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return resolveImg(raw) || `${baseURL}/${String(raw).replace(/^\/+/, '')}`;
};

export default function ImageField({
  label,
  value,
  onChange,
  onUpload,
  className = '',
  disabledAi = true,
}) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const image = normalizeSectionImage(value);
  const preview = safeSrc(image);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0] || null;
    event.target.value = '';
    if (!file || typeof onUpload !== 'function') return;
    setLoading(true);
    try {
      const uploaded = await onUpload(file);
      if (uploaded) {
        onChange?.(normalizeSectionImage({ ...image, src: uploaded }));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`pseImageField ${className}`.trim()}>
      <div className="pseImageFieldHead">
        <strong>{label}</strong>
        <button type="button" className="pseLinkIcon" onClick={() => setShowLink((prev) => !prev)} title="URL opcional">
          🔗
        </button>
      </div>
      <div className="pseImageFieldActions">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={loading}>
          {loading ? 'Subiendo...' : 'Subir imagen'}
        </button>
        <button type="button" disabled={disabledAi} title="Proximamente">
          Regenerar con IA
        </button>
        <input
          ref={inputRef}
          type="file"
          hidden
          accept="image/*,video/mp4,video/webm"
          onChange={handleUpload}
        />
      </div>
      {showLink ? (
        <input
          type="text"
          placeholder="https://... (opcional)"
          value={image.external_url || ''}
          onChange={(event) => onChange?.(normalizeSectionImage({ ...image, external_url: event.target.value }))}
        />
      ) : null}
      {preview ? (
        <div className="pseImagePreviewWrap">
          {/\.(mp4|webm)(\?|$)/i.test(preview) ? (
            <video className="pseImagePreview" src={preview} controls muted playsInline preload="metadata" />
          ) : (
            <img className="pseImagePreview" src={preview} alt={label} />
          )}
        </div>
      ) : (
        <div className="pseEmptyPreview">Sin imagen</div>
      )}
    </div>
  );
}

