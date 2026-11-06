/**
 * One header popup open at a time.
 *
 * The mobile nav drawer and the Copy / Ask AI menu are separate client
 * islands with their own state. Left alone, both could be open together and
 * the menu (z-50) would sit over the drawer's links (z-40). Each announces
 * itself when it opens, and closes when another one does.
 *
 * A window event rather than a shared React context: the two islands are
 * siblings in a server component, and a context provider would turn the
 * header into a client component for the sake of one boolean.
 */
const EVENT = "lattice:popup-open";

export function announcePopup(id: string): void {
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: id }));
}

/** Calls `close` whenever a popup other than `id` opens. Returns the unsubscribe. */
export function onOtherPopup(id: string, close: () => void): () => void {
  const listener = (e: Event) => {
    if ((e as CustomEvent<string>).detail !== id) close();
  };
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
