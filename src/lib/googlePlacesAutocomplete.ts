import { useCallback, useEffect, useRef, type RefObject } from 'react';

let activePacOwnerId: string | null = null;

export function setActivePacOwner(id: string | null) {
  activePacOwnerId = id;
}

/** Remove Google "Powered by" branding logos from pac-containers */
export function hideGooglePacBranding() {
  document.querySelectorAll('.pac-logo, .hdpi.pac-logo').forEach((el) => {
    el.remove();
  });

  document.querySelectorAll<HTMLElement>('.pac-container').forEach((pac) => {
    pac.querySelectorAll('.pac-logo').forEach((logo) => logo.remove());
  });
}

export function hideAllPacContainers() {
  document.querySelectorAll<HTMLElement>('.pac-container').forEach((pac) => {
    pac.style.display = 'none';
  });
}

export function cleanupDuplicatePacContainers() {
  const pacs = document.querySelectorAll<HTMLElement>('.pac-container');
  if (pacs.length <= 1) return;

  pacs.forEach((pac, index) => {
    if (index < pacs.length - 1) pac.remove();
  });
}

export function attachPacToBody() {
  cleanupDuplicatePacContainers();
  document.querySelectorAll<HTMLElement>('.pac-container').forEach((pac) => {
    if (pac.parentElement !== document.body) {
      document.body.appendChild(pac);
    }
  });
  hideGooglePacBranding();
}

function positionPacContainer(
  pac: HTMLElement,
  inputEl: HTMLInputElement,
): boolean {
  const rect = inputEl.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;

  const width = Math.max(rect.width, 280);
  pac.style.position = 'fixed';
  pac.style.top = `${rect.bottom + 8}px`;
  pac.style.left = `${rect.left}px`;
  pac.style.width = `${width}px`;
  pac.style.minWidth = `${width}px`;
  pac.style.maxWidth = `${width}px`;
  pac.style.zIndex = '99999';
  pac.style.pointerEvents = 'auto';
  pac.style.paddingBottom = '0';
  pac.style.marginBottom = '0';
  pac.style.display = '';
  return true;
}

export function positionPacBelowInput(
  inputEl: HTMLInputElement | null,
  ownerId?: string,
) {
  if (!inputEl) return;

  if (ownerId && activePacOwnerId && activePacOwnerId !== ownerId) {
    hideAllPacContainers();
    return;
  }

  attachPacToBody();

  const pac = document.querySelector<HTMLElement>('.pac-container');
  if (!pac) return;

  positionPacContainer(pac, inputEl);
  hideGooglePacBranding();
}

export function useGooglePlacesPacSync(
  inputRef: RefObject<HTMLInputElement | null>,
  ownerId: string,
) {
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncPacPosition = useCallback(() => {
    if (activePacOwnerId === ownerId || !activePacOwnerId) {
      positionPacBelowInput(inputRef.current, ownerId);
    }
  }, [inputRef, ownerId]);

  useEffect(() => {
    const onFocus = () => {
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
      setActivePacOwner(ownerId);
      syncPacPosition();
    };
    const onBlur = () => {
      blurTimerRef.current = setTimeout(() => {
        if (activePacOwnerId === ownerId) {
          setActivePacOwner(null);
          hideAllPacContainers();
        }
        blurTimerRef.current = null;
      }, 200);
    };

    const input = inputRef.current;
    input?.addEventListener('focus', onFocus);
    input?.addEventListener('blur', onBlur);

    hideGooglePacBranding();

    const observer = new MutationObserver(() => {
      hideGooglePacBranding();
      if (activePacOwnerId === ownerId) {
        const pac = document.querySelector<HTMLElement>('.pac-container');
        if (pac) {
          positionPacContainer(pac, inputRef.current!);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const onScrollOrResize = () => {
      if (activePacOwnerId === ownerId) syncPacPosition();
    };
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);

    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      input?.removeEventListener('focus', onFocus);
      input?.removeEventListener('blur', onBlur);
      observer.disconnect();
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
      hideAllPacContainers();
    };
  }, [syncPacPosition, inputRef, ownerId]);

  return syncPacPosition;
}

export const GOOGLE_PLACES_AUTOCOMPLETE_OPTIONS: google.maps.places.AutocompleteOptions = {
  strictBounds: false,
  componentRestrictions: { country: 'in' },
  fields: ['geometry', 'name', 'formatted_address', 'address_components', 'place_id'],
};
