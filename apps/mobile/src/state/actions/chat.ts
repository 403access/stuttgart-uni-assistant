import { updateApp } from '@ua/core/state/app-store';
import type { ChatMessage } from '@ua/core/domain/types';

/** The local transcript and the planned-question list. */
export function addMessage(message: ChatMessage): void {
  updateApp((current) => ({ ...current, messages: [...current.messages, message].slice(-40) }));
}

export function replaceMessage(message: ChatMessage): void {
  updateApp((current) => ({
    ...current,
    messages: current.messages.map((item) => (item.id === message.id ? message : item)),
  }));
}

export function clearChat(): void {
  updateApp((current) => ({ ...current, messages: [] }));
}

export function togglePlanned(id: string): void {
  updateApp((current) => ({
    ...current,
    plannedIds: current.plannedIds.includes(id)
      ? current.plannedIds.filter((item) => item !== id)
      : [...current.plannedIds, id],
  }));
}
