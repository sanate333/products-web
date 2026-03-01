import React, { useEffect, useMemo, useRef, useState } from 'react';
import ButtonPrimary from './ButtonPrimary';
import ButtonGhost from './ButtonGhost';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_RE = /^[a-z0-9-]{3,40}$/;

const normalizeSlug = (value) => String(value || '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9\s-]/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 40);

const normalizePhone = (value) => String(value || '').replace(/\D/g, '').slice(0, 20);

export default function RegistrationModal({
  open,
  onClose,
  templateOptions,
  initialTemplate,
  onSubmit,
  checkSlug,
}) {
  const modalRef = useRef(null);
  const firstInputRef = useRef(null);
  const [form, setForm] = useState({ whatsapp: '', email: '', storeName: '', slug: '', templateKey: initialTemplate || templateOptions[0]?.key || '' });
  const [slugState, setSlugState] = useState({ checking: false, available: true, message: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm((prev) => ({ ...prev, templateKey: initialTemplate || prev.templateKey || templateOptions[0]?.key || '' }));
    setSlugState({ checking: false, available: true, message: '' });
    setError('');
    window.setTimeout(() => firstInputRef.current?.focus(), 10);
  }, [open, initialTemplate, templateOptions]);

  const validWhatsapp = useMemo(() => normalizePhone(form.whatsapp).length >= 10, [form.whatsapp]);
  const validEmail = useMemo(() => EMAIL_RE.test(String(form.email).trim()), [form.email]);
  const validStoreName = useMemo(() => String(form.storeName || '').trim().length >= 3, [form.storeName]);
  const validSlug = useMemo(() => SLUG_RE.test(String(form.slug).trim()), [form.slug]);
  const canSubmit = validWhatsapp && validEmail && validStoreName && validSlug && !slugState.checking && slugState.available && !saving;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !modalRef.current) return;
      const focusables = modalRef.current.querySelectorAll('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const onField = (key) => (event) => {
    const raw = event.target.value;
    if (key === 'storeName') {
      setForm((prev) => {
        const nextSlug = prev.slug ? prev.slug : normalizeSlug(raw);
        return { ...prev, storeName: raw, slug: nextSlug };
      });
      return;
    }
    if (key === 'slug') {
      setForm((prev) => ({ ...prev, slug: normalizeSlug(raw) }));
      setSlugState({ checking: false, available: true, message: '' });
      return;
    }
    if (key === 'whatsapp') {
      setForm((prev) => ({ ...prev, whatsapp: raw }));
      return;
    }
    setForm((prev) => ({ ...prev, [key]: raw }));
  };

  const verifySlug = async (slug) => {
    const candidate = normalizeSlug(slug);
    if (!SLUG_RE.test(candidate)) {
      setSlugState({ checking: false, available: false, message: 'Slug invalido. Usa solo a-z, 0-9 y guiones.' });
      return false;
    }
    setSlugState({ checking: true, available: false, message: 'Validando disponibilidad...' });
    const result = await checkSlug(candidate);
    if (!result.ok) {
      setSlugState({ checking: false, available: false, message: result.error || 'No se pudo validar el slug.' });
      return false;
    }
    setSlugState({ checking: false, available: !!result.available, message: result.available ? 'Slug disponible.' : 'Este slug ya existe.' });
    return !!result.available;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const okSlug = await verifySlug(form.slug);
    if (!okSlug) return;

    setSaving(true);
    const result = await onSubmit({
      whatsapp: normalizePhone(form.whatsapp),
      email: String(form.email).trim().toLowerCase(),
      storeName: String(form.storeName).trim(),
      storeSlug: normalizeSlug(form.slug),
      templateKey: form.templateKey,
    });
    setSaving(false);

    if (!result.ok) {
      setError(result.error || 'No se pudo guardar el registro.');
      return;
    }

    onClose();
  };

  if (!open) return null;

  return (
    <div className='coModalOverlay' onClick={onClose} role='presentation'>
      <div className='coModal' role='dialog' aria-modal='true' aria-labelledby='co-modal-title' ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <header className='coModalHeader'>
          <h3 id='co-modal-title'>Crear mi tienda</h3>
          <button type='button' className='coIconBtn' aria-label='Cerrar modal de registro' onClick={onClose}>×</button>
        </header>

        <form className='coModalForm' onSubmit={handleSubmit}>
          <label>
            <span>WhatsApp</span>
            <input ref={firstInputRef} value={form.whatsapp} onChange={onField('whatsapp')} placeholder='573001234567' inputMode='tel' required />
            {!validWhatsapp ? <small>Ingresa al menos 10 digitos.</small> : null}
          </label>
          <label>
            <span>Correo</span>
            <input value={form.email} onChange={onField('email')} type='email' placeholder='tu@correo.com' required />
            {!validEmail ? <small>Ingresa un correo valido.</small> : null}
          </label>
          <label>
            <span>Nombre de tienda</span>
            <input value={form.storeName} onChange={onField('storeName')} placeholder='Ej: Oasis Natural Shop' required />
          </label>
          <label>
            <span>Nombre de tienda (slug)</span>
            <input value={form.slug} onChange={onField('slug')} onBlur={() => form.slug && verifySlug(form.slug)} placeholder='mi-tienda' required />
            <small>{slugState.message || 'Solo letras minusculas, numeros y guion. Ej: oasis-shop'}</small>
          </label>
          <label>
            <span>Plantilla</span>
            <select value={form.templateKey} onChange={onField('templateKey')}>
              {templateOptions.map((template) => <option key={template.key} value={template.key}>{template.title}</option>)}
            </select>
          </label>

          {error ? <p className='coError'>{error}</p> : null}

          <footer className='coModalFooter'>
            <ButtonGhost type='button' aria-label='Cancelar registro' onClick={onClose}>Cancelar</ButtonGhost>
            <ButtonPrimary type='submit' aria-label='Enviar registro de tienda' disabled={!canSubmit || saving}>
              {saving ? 'Guardando...' : 'Crear mi tienda'}
            </ButtonPrimary>
          </footer>
        </form>
      </div>
    </div>
  );
}
