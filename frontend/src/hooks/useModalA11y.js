import { useEffect, useRef, useCallback } from 'react';

export function useModalA11y(isOpen, onClose) {
  const ref = useRef(null);
  const restoreFocusRef = useRef(null);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose();

    if (e.key === 'Tab' && ref.current) {
      const focusable = ref.current.querySelectorAll(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    restoreFocusRef.current = document.activeElement;
    const t = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const focusable = el.querySelector(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable) focusable.focus();
    }, 30);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      if (restoreFocusRef.current && typeof restoreFocusRef.current.focus === 'function') {
        restoreFocusRef.current.focus();
      }
    };
  }, [isOpen, handleKeyDown]);

  return ref;
}
