import { createContext, useContext, type ReactNode } from 'react';

/**
 * Marks a route screen that is rendered inside a desktop side pane. `Screen`
 * then drops its own backdrop, header, and width cap so the page can fill the
 * pane without duplicating the surrounding settings chrome.
 */
const PaneModeContext = createContext(false);

export function PaneModeProvider({ children }: { children: ReactNode }) {
  return <PaneModeContext.Provider value>{children}</PaneModeContext.Provider>;
}

export function usePaneMode(): boolean {
  return useContext(PaneModeContext);
}
