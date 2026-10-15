import type { CoursesResponse } from '@/src/campus/courses';

/** Reduced fixture of the observed courses response: one seminar with lecturer, room, and registration state. */
export const coursesSample = {
  link: [],
  resource: [
    {
      link: [],
      content: {
        type: 'model-slc.cm.mystudy.CmCurriculumElementCourseGroupingsListDto',
        CmCurriculumElementCourseGroupingsListDto: {
          courseGroupings: [
            {
              courseList: [
                {
                  id: 461346,
                  courseNumber: { dotIndex: 0, databaseValue: '127262002', courseNumber: '127262002' },
                  courseTitle: {
                    coType: 'model-core.lib.model.langdata',
                    value: 'Einführung in die Geschichte der Philosophie',
                    translations: {
                      translation: [
                        { lang: 'de', value: 'Einführung in die Geschichte der Philosophie' },
                        { lang: 'en', value: 'Einführung in die Geschichte der Philosophie' },
                        { lang: 'fr' },
                        { lang: 'it' },
                      ],
                    },
                  },
                  courseTypeName: {
                    coType: 'model-core.lib.model.langdata',
                    value: 'Seminar',
                    translations: {
                      translation: [
                        { lang: 'de', value: 'Seminar' },
                        { lang: 'en', value: 'Seminar' },
                        { lang: 'fr' },
                        { lang: 'it' },
                      ],
                    },
                  },
                  courseTypeShortName: {
                    coType: 'model-core.lib.model.langdata',
                    value: 'SE',
                    translations: {
                      translation: [
                        { lang: 'de', value: 'SE' },
                        { lang: 'en', value: 'S' },
                        { lang: 'fr' },
                        { lang: 'it' },
                      ],
                    },
                  },
                  courseTypeId: 15,
                  semester: {
                    coType: 'model-core.lib.model.langdata',
                    value: '2026 W',
                    translations: {
                      translation: [{ lang: 'de', value: '2026 W' }, { lang: 'en' }, { lang: 'fr' }, { lang: 'it' }],
                    },
                  },
                  duration: 2,
                  lectureships: [
                    {
                      id: 1578891,
                      courseId: 461346,
                      identityLibDto: { id: 91364, personId: 91364, firstName: 'Christian', lastName: 'Martin', gender: 'MALE' },
                      teachingFunction: { id: 2, key: 'V', name: 'Vortragende*r' },
                    },
                  ],
                  displayMoreLectureships: false,
                  roomLink: {
                    rel: 'detail',
                    href: 'https://campus.uni-stuttgart.de/cusonline/ee/ui/ca2/app/desktop/#/pl/ui/$ctx/ris.einzelRaum?raumKey=7069',
                  },
                  roomName: 'Breitscheid 02A - M 2.00 (BS02AEGM 2.00)',
                  startTime: '2026-10-19T14:00',
                  endTime: '2026-10-19T15:30',
                  detailPageLink: {
                    rel: 'detail',
                    href: 'https://campus.uni-stuttgart.de/cusonline/pages/slc.tm.cp/course/461346',
                    type: 'text/html',
                    name: 'CpCourseLibDto',
                    key: '461346',
                  },
                  semesterId: 216,
                  examRegistrationData: [],
                  courseRegistrationData: {
                    action: {
                      actionElementType: 'BASIC',
                      text: {
                        coType: 'model-core.lib.model.langdata',
                        value: 'LV-Anmeldung bearbeiten',
                        translations: {
                          translation: [
                            { lang: 'de', value: 'LV-Anmeldung bearbeiten' },
                            { lang: 'en', value: 'Edit course registration' },
                            { lang: 'fr' },
                            { lang: 'it' },
                          ],
                        },
                      },
                      url: {
                        rel: 'related',
                        href: 'https://campus.uni-stuttgart.de/cusonline/ee/rest/pages/slc.tm.cp/course-registration/461346?cStudyId=339485',
                        name: 'CpCourseRegistrationDto',
                        key: '461346',
                        target: '_blank',
                      },
                    },
                    textAbove: {
                      icon: 'far fa-check-circle',
                      importance: 'GREEN',
                      textInfo: {
                        coType: 'model-core.lib.model.langdata',
                        value: 'Fixplatz zugewiesen',
                        translations: {
                          translation: [
                            { lang: 'de', value: 'Fixplatz zugewiesen' },
                            { lang: 'en', value: 'Assigned confirmed place' },
                            { lang: 'fr' },
                            { lang: 'it' },
                          ],
                        },
                      },
                    },
                  },
                  showRegistrationLinks: true,
                  extendedList: false,
                },
              ],
            },
          ],
          noElementMessage: '$slc_cm_course_grouping_no_course_in_node',
          currentSemesterId: 216,
          displayAchievementList: true,
          currentSort: 'SEMESTER',
          studentCanToggle: true,
        },
      },
    },
  ],
} satisfies CoursesResponse;
