import { useMemo, type Dispatch, type SetStateAction } from 'react';

import type { ChatMessage, PersistedState } from '@/src/types';

export interface ChatActions {
  addMessage: (message: ChatMessage) => void;
  replaceMessage: (message: ChatMessage) => void;
  clearChat: () => void;
  togglePlanned: (id: string) => void;
}

/** The local transcript and the planned-question list. */
export function useChatActions({ setState }: { setState: Dispatch<SetStateAction<PersistedState>> }): ChatActions {
  return useMemo(
    () => ({
      addMessage: (message) => setState((current) => ({ ...current, messages: [...current.messages, message].slice(-40) })),
      replaceMessage: (message) =>
        setState((current) => ({
          ...current,
          messages: current.messages.map((item) => (item.id === message.id ? message : item)),
        })),
      clearChat: () => setState((current) => ({ ...current, messages: [] })),
      togglePlanned: (id) =>
        setState((current) => ({
          ...current,
          plannedIds: current.plannedIds.includes(id)
            ? current.plannedIds.filter((item) => item !== id)
            : [...current.plannedIds, id],
        })),
    }),
    [setState],
  );
}
