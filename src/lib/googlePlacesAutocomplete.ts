import { useCallback, useEffect, type RefObject } from 'react';

let activePacOwnerId: string | null = null;

export function setActivePacOwner(id: string | null) {
  activePacOwnerId = id;
}

/** Remove Google "Powered by" branding and hide empty dropdown shells */
export function hideGooglePacBranding() {
  document.querySelectorAll('.pac-logo, .hdpi.pac-logo').forEach((el) => {
    el.remove();
  });

  document.querySelectorAll<HTMLElement>('.pac-container').forEach((pac) => {
    pac.querySelectorAll('.pac-logo').forEach((logo) => logo.remove());

    const items = pac.querySelectorAll('.pac-item');
    if (items.length === 0 && activePacOwnerId === null) {
      pac.style.display = 'none';
    }
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

export function positionPacBelowInput(
  inputEl: HTMLInputElement | null,
  ownerId?: string,
) {
  if (!inputEl) return;

  if (ownerId && activePacOwnerId && activePacOwnerId !== ownerId) {
    hideAllPacContainers();
    return;
  }

  cleanupDuplicatePacContainers();
  attachPacToBody();
  hideGooglePacBranding();

  const pac = document.querySelector<HTMLElement>('.pac-container');
  if (!pac) return;

  const items = pac.querySelectorAll('.pac-item');
  if (items.length === 0) {
    pac.style.display = 'none';
    return;
  }

  const rect = inputEl.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    pac.style.display = 'none';
    return;
  }

  const width = Math.max(rect.width, 280);
  pac.style.display = '';
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

  hideGooglePacBranding();
}

export function useGooglePlacesPacSync(
  inputRef: RefObject<HTMLInputElement | null>,
  ownerId: string,
) {
  const syncPacPosition = useCallback(() => {
    if (activePacOwnerId === ownerId || !activePacOwnerId) {
      positionPacBelowInput(inputRef.current, ownerId);
    }
  }, [inputRef, ownerId]);

  useEffect(() => {
    const onFocus = () => {
      setActivePacOwner(ownerId);
      syncPacPosition();
    };
    const onBlur = () => {
      window.setTimeout(() => {
        if (activePacOwnerId === ownerId) {
          setActivePacOwner(null);
          hideAllPacContainers();
        }
      }, 200);
    };

    const input = inputRef.current;
    input?.addEventListener('focus', onFocus);
    input?.addEventListener('blur', onBlur);

    hideGooglePacBranding();

    const observer = new MutationObserver(() => {
      hideGooglePacBranding();
      if (activePacOwnerId === ownerId) {
        syncPacPosition();
      } else if (!activePacOwnerId) {
        hideAllPacContainers();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const onScrollOrResize = () => {
      if (activePacOwnerId === ownerId) syncPacPosition();
    };
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);

    return () => {
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
