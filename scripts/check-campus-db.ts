import {
  appendApiCall,
  appendElementCourses,
  clearApiLog,
  clearCachedCourses,
  clearCachedStudy,
  findCachedCourse,
  getCoursesSyncInfo,
  getSyncInfo,
  loadCachedCourses,
  loadCachedCoursesByElement,
  loadCachedNodes,
  loadCoursesFetchedIds,
  loadExpandedIds,
  readApiLog,
  saveCourses,
  saveFullStructure,
} from '../src/campus/db';
import {
  appendApiCall as appendWebApiCall,
  appendElementCourses as appendWebElementCourses,
  clearApiLog as clearWebApiLog,
  clearCachedCourses as clearWebCourses,
  clearCachedStudy as clearWebStudy,
  findCachedCourse as findWebCourse,
  getCoursesSyncInfo as getWebCoursesSync,
  getSyncInfo as getWebSync,
  loadCachedCourses as loadWebCourses,
  loadCachedCoursesByElement as loadWebCoursesByElement,
  loadCachedNodes as loadWebNodes,
  loadExpandedIds as loadWebExpanded,
  readApiLog as readWebApiLog,
  saveCourses as saveWebCourses,
  saveFullStructure as saveWebStructure,
} from '../src/campus/db.web';
import type { BulkCourse, CurriculumNode } from '../src/types';

// Runs under tsx with the resolve hooks from scripts/testing, which redirect
// `expo-sqlite` to a real SQLite engine (node:sqlite, in-memory) and
// AsyncStorage to a Map. This exercises the actual SQL and the exact
// save-then-read paths the app uses.

const failures: string[] = [];

function expect(condition: boolean, message: string) {
  if (!condition) {
    failures.push(message);
    console.error('FAIL', message);
  } else {
    console.log('ok', message);
  }
}

const nodes: CurriculumNode[] = [
  { id: 1, designation: 'ROOT', elementType: 'ROOT', name: 'Philosophie', parentId: null, completed: false, inProgress: false },
  { id: 2, designation: '100', elementType: 'DEFAULT', name: 'Basismodule', parentId: 1, completed: false, inProgress: true },
];

function course(id: number, title: string): BulkCourse {
  return {
    id,
    courseNumber: `LV${id}`,
    title,
    courseType: 'Seminar',
    courseTypeShort: 'SE',
    semester: '2026 W',
    semesterId: 216,
    duration: 2,
    lecturers: ['Baumeister, David Craig'],
    roomName: 'Breitscheid 02A',
    startTime: '2026-10-22T11:30',
    endTime: '2026-10-22T13:00',
    detailUrl: `https://campus.uni-stuttgart.de/course/${id}`,
    registrationStatus: 'Fixplatz zugewiesen',
    registrationAction: 'LV-Anmeldung bearbeiten',
    registrationUrl: `https://campus.uni-stuttgart.de/registration/${id}`,
    elementIds: [2],
    elementNames: ['Basismodule'],
  };
}

async function reset() {
  await clearCachedStudy(339485);
  await clearCachedCourses(339485);
  await clearApiLog();
  await clearWebStudy(339485);
  await clearWebCourses(339485);
  await clearWebApiLog();
}

async function main() {
  await reset();

  await saveFullStructure(339485, 278343, nodes, [1], true);
  expect((await loadCachedNodes(339485)).length === 2, 'structures round-trip nodes');
  expect(JSON.stringify(await loadExpandedIds(339485)) === '[1]', 'structures round-trip expanded ids');
  const sync = await getSyncInfo(339485);
  expect(sync?.nodeCount === 2 && sync?.complete === true && sync?.rootElementId === 278343, 'structures round-trip sync info');

  await saveFullStructure(339485, 278343, nodes, [], true);
  await saveFullStructure(339485, 278343, [nodes[0]], [], false);
  expect((await loadCachedNodes(339485)).length === 1, 'resaving structures replaces instead of duplicating');

  const first = course(461346, 'Einführung in die Geschichte der Philosophie');
  const second = { ...course(461347, 'Logik'), elementIds: [2, 3], elementNames: ['Basismodule', 'Kernmodule'] };
  await saveCourses(339485, [first, second], [2, 3], true);
  const loaded = await loadCachedCourses(339485);
  expect(loaded.length === 2, 'courses round-trip rows');
  expect(JSON.stringify(loaded[0].lecturers) === '["Baumeister, David Craig"]', 'courses round-trip lecturers');
  expect(JSON.stringify(loaded[1].elementIds) === '[2,3]', 'courses round-trip element links');
  expect((await loadCachedCoursesByElement(339485, 3)).map((item) => item.id).join(',') === '461347', 'courses by element');
  expect(JSON.stringify(await loadCoursesFetchedIds(339485)) === '[2,3]', 'courses round-trip fetched ids');
  const courseSync = await getCoursesSyncInfo(339485);
  expect(courseSync?.courseCount === 2 && courseSync?.complete === true, 'courses round-trip sync info');
  expect((await findCachedCourse(461346))?.title === 'Einführung in die Geschichte der Philosophie', 'find course across studies');

  await saveCourses(339485, [course(1, 'A')], [2], true);
  await appendElementCourses(339485, 3, 'Kernmodule', [{ ...course(1, 'A'), elementIds: [], elementNames: [] }, course(2, 'B')]);
  expect((await loadCachedCourses(339485)).length === 2, 'append merges one element');
  expect(JSON.stringify((await loadCachedCourses(339485)).find((item) => item.id === 1)?.elementIds) === '[2,3]', 'append unions element links');
  expect((await getCoursesSyncInfo(339485))?.complete === true, 'append keeps completion');

  await saveFullStructure(339485, 278343, nodes, [], true);
  await saveCourses(339485, [course(1, 'A')], [2], true);
  await clearCachedCourses(339485);
  expect((await loadCachedCourses(339485)).length === 0, 'clearing courses empties courses');
  expect((await loadCachedNodes(339485)).length === 2, 'clearing courses keeps structures');
  await saveFullStructure(339485, 278343, nodes, [], true);
  await saveCourses(339485, [course(1, 'A')], [2], true);
  await clearCachedStudy(339485);
  expect((await loadCachedNodes(339485)).length === 0, 'clearing a study empties structures');
  expect((await loadCachedCourses(339485)).length === 1, 'clearing a study keeps courses');

  await appendApiCall({ uid: 'a', time: 't', op: 'studies', ok: true, httpStatus: 200, elapsedMs: 1, response: '2 studies' });
  await appendApiCall({ uid: 'b', time: 't', op: 'structure', studyId: 1, elementId: 2, ok: false, httpStatus: 502, code: 'campus_failed', elapsedMs: 2 });
  const calls = await readApiLog(500);
  expect(calls.map((item) => item.uid).join(',') === 'b,a', 'api log reads newest-first');
  expect((await readApiLog(1)).length === 1, 'api log honors the limit');
  await clearApiLog();
  expect((await readApiLog(500)).length === 0, 'api log clears');

  await saveWebStructure(339485, 278343, nodes, [278343], true);
  expect((await loadWebNodes(339485)).length === 2, 'web structures round-trip');
  expect(JSON.stringify(await loadWebExpanded(339485)) === '[278343]', 'web expanded ids round-trip');
  expect((await getWebSync(339485))?.nodeCount === 2, 'web sync info round-trip');
  await saveWebCourses(339485, [course(1, 'A')], [2], false);
  expect((await loadWebCourses(339485)).length === 1, 'web courses round-trip');
  expect((await loadWebCoursesByElement(339485, 2)).length === 1, 'web courses by element');
  expect((await loadWebCoursesByElement(339485, 99)).length === 0, 'web courses by unknown element is empty');
  expect((await getWebCoursesSync(339485))?.complete === false, 'web courses sync keeps incompletion');
  expect((await findWebCourse(1))?.title === 'A', 'web find course');
  await appendWebApiCall({ uid: 'w', time: 't', op: 'courses', ok: true, httpStatus: 200, elapsedMs: 3 });
  expect((await readWebApiLog(500)).length === 1, 'web api log round-trip');
  await appendWebElementCourses(339485, 5, 'Neu', [course(9, 'Z')]);
  expect((await loadWebCourses(339485)).map((item) => item.id).sort().join(',') === '1,9', 'web append merges');
  await clearWebStudy(339485);
  expect((await loadWebNodes(339485)).length === 0, 'web clear removes structures');
  expect((await loadWebCourses(339485)).length === 2, 'web clear keeps courses');
  await clearWebCourses(339485);
  expect((await loadWebCourses(339485)).length === 0, 'web courses clear empties courses');

  if (failures.length > 0) {
    console.error(`${failures.length} campus DB checks failed`);
    process.exitCode = 1;
  } else {
    console.log('all campus DB checks passed');
  }
}

main().catch((error: unknown) => {
  console.error('FAIL campus DB check crashed', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
