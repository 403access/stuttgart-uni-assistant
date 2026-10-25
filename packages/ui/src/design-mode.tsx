import { createContext, useContext, type ReactNode } from 'react';
import type { DesignMode } from '@ua/core/domain/types';

const DesignModeContext = createContext<DesignMode>('clean');

export function DesignModeProvider({ mode, children }: { mode: DesignMode; children: ReactNode }) {
  return <DesignModeContext.Provider value={mode}>{children}</DesignModeContext.Provider>;
}

export function useDesignMode(): DesignMode {
  return useContext(DesignModeContext);
}
