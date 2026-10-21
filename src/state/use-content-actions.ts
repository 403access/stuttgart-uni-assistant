import { useMemo, type Dispatch, type SetStateAction } from 'react';

import { documents } from '@/src/data';
import { pickActiveStudyId } from '@/src/state/persisted';
import type {
  CampusStudy,
  CurriculumNode,
  ImportedDocument,
  PersistedState,
  PlatformId,
  Review,
  TransferDraft,
} from '@/src/types';

export interface ContentActions {
  setCurriculum: (nodes: CurriculumNode[], options?: { studyId?: number | null; replace?: boolean }) => void;
  setStudies: (studies: CampusStudy[]) => void;
  setActiveStudy: (studyId: number) => void;
  setMailAccount: (account: string | null) => void;
  syncPlatform: (platform: PlatformId) => void;
  toggleDownload: (id: string) => void;
  addImport: (document: ImportedDocument) => void;
  toggleShare: (id: string) => void;
  addReview: (review: Review) => void;
  saveTransfer: (draft: TransferDraft) => void;
  removeTransfer: (id: string) => void;
}

/**
 * Device-local content mutations: the curriculum tree, study selection,
 * downloads, imports, reviews, and transfers. Nothing here talks to the server.
 */
export function useContentActions({ setState }: { setState: Dispatch<SetStateAction<PersistedState>> }): ContentActions {
  return useMemo(
    () => ({
      setCurriculum: (nodes, options) =>
        setState((current) => {
          const studyId = options?.studyId !== undefined ? options.studyId : current.curriculumStudyId;
          if (options?.replace || (studyId !== null && studyId !== undefined && studyId !== current.curriculumStudyId)) {
            return { ...current, curriculumNodes: nodes, curriculumStudyId: studyId ?? null };
          }
          const map = new Map(current.curriculumNodes.map((node) => [node.id, node]));
          for (const node of nodes) map.set(node.id, node);
          return { ...current, curriculumNodes: [...map.values()], curriculumStudyId: studyId ?? current.curriculumStudyId };
        }),
      setStudies: (studies) =>
        setState((current) => ({
          ...current,
          campusStudies: studies,
          activeStudyId: pickActiveStudyId(studies, current.activeStudyId),
        })),
      setActiveStudy: (studyId) =>
        setState((current) =>
          current.campusStudies.some((item) => item.studyId === studyId) ? { ...current, activeStudyId: studyId } : current,
        ),
      setMailAccount: (account) =>
        setState((current) => (current.mailAccount === account ? current : { ...current, mailAccount: account })),
      syncPlatform: (platform) =>
        setState((current) => ({
          ...current,
          syncAt: { ...current.syncAt, [platform]: new Date().toISOString() },
          downloadedIds:
            platform === 'ilias'
              ? [...new Set([...current.downloadedIds, ...documents.filter((item) => item.source === 'ilias').map((item) => item.id)])]
              : current.downloadedIds,
        })),
      toggleDownload: (id) =>
        setState((current) => ({
          ...current,
          downloadedIds: current.downloadedIds.includes(id)
            ? current.downloadedIds.filter((item) => item !== id)
            : [...current.downloadedIds, id],
        })),
      addImport: (document) => setState((current) => ({ ...current, imports: [document, ...current.imports].slice(0, 40) })),
      toggleShare: (id) =>
        setState((current) => ({
          ...current,
          imports: current.imports.map((item) => (item.id === id ? { ...item, shared: !item.shared } : item)),
        })),
      addReview: (review) => setState((current) => ({ ...current, reviews: [review, ...current.reviews] })),
      saveTransfer: (draft) =>
        setState((current) => ({ ...current, transfers: [draft, ...current.transfers.filter((item) => item.id !== draft.id)] })),
      removeTransfer: (id) => setState((current) => ({ ...current, transfers: current.transfers.filter((item) => item.id !== id) })),
    }),
    [setState],
  );
}
