"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Open/close state plus body-scroll-lock for bottom sheets. Shared by every
 * sheet so the modal interaction is consistent (lock background scroll while
 * open, restore on close).
 */
export function useBottomSheet(initial = false) {
  const [open, setOpen] = useState(initial);

  const openSheet = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return { open, openSheet, close, setOpen };
}
