import { documents } from '@/src/data';
import { pickActiveStudyId } from '@/src/state/persisted';
import { updateApp } from '@/src/state/app-store';
import type { CampusStudy, CurriculumNode, ImportedDocument, PlatformId, Review, TransferDraft } from '@/src/types';

/**
 * Device-local content mutations: the curriculum tree, study selection,
 * downloads, imports, reviews, and transfers. Nothing here talks to the server.
 */
export function setCurriculum(
  nodes: CurriculumNode[],
  options?: { studyId?: number | null; replace?: boolean },
): void {
  updateApp((current) => {
    const studyId = options?.studyId !== undefined ? options.studyId : current.curriculumStudyId;
    if (options?.replace || (studyId !== null && studyId !== undefined && studyId !== current.curriculumStudyId)) {
      return { ...current, curriculumNodes: nodes, curriculumStudyId: studyId ?? null };
    }
    const map = new Map(current.curriculumNodes.map((node) => [node.id, node]));
    for (const node of nodes) map.set(node.id, node);
    return { ...current, curriculumNodes: [...map.values()], curriculumStudyId: studyId ?? current.curriculumStudyId };
  });
}

export function setStudies(studies: CampusStudy[]): void {
  updateApp((current) => ({
    ...current,
    campusStudies: studies,
    activeStudyId: pickActiveStudyId(studies, current.activeStudyId),
  }));
}

export function setActiveStudy(studyId: number): void {
  updateApp((current) =>
    current.campusStudies.some((item) => item.studyId === studyId) ? { ...current, activeStudyId: studyId } : current,
  );
}

export function setMailAccount(account: string | null): void {
  updateApp((current) => (current.mailAccount === account ? current : { ...current, mailAccount: account }));
}

export function syncPlatform(platform: PlatformId): void {
  updateApp((current) => ({
    ...current,
    syncAt: { ...current.syncAt, [platform]: new Date().toISOString() },
    downloadedIds:
      platform === 'ilias'
        ? [...new Set([...current.downloadedIds, ...documents.filter((item) => item.source === 'ilias').map((item) => item.id)])]
        : current.downloadedIds,
  }));
}

export function toggleDownload(id: string): void {
  updateApp((current) => ({
    ...current,
    downloadedIds: current.downloadedIds.includes(id)
      ? current.downloadedIds.filter((item) => item !== id)
      : [...current.downloadedIds, id],
  }));
}

export function addImport(document: ImportedDocument): void {
  updateApp((current) => ({ ...current, imports: [document, ...current.imports].slice(0, 40) }));
}

export function toggleShare(id: string): void {
  updateApp((current) => ({
    ...current,
    imports: current.imports.map((item) => (item.id === id ? { ...item, shared: !item.shared } : item)),
  }));
}

export function addReview(review: Review): void {
  updateApp((current) => ({ ...current, reviews: [review, ...current.reviews] }));
}

export function saveTransfer(draft: TransferDraft): void {
  updateApp((current) => ({
    ...current,
    transfers: [draft, ...current.transfers.filter((item) => item.id !== draft.id)],
  }));
}

export function removeTransfer(id: string): void {
  updateApp((current) => ({ ...current, transfers: current.transfers.filter((item) => item.id !== id) }));
}
