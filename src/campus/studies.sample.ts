import type { StudiesChooserResponse } from '@/src/campus/studies';

/** Reduced fixture of the observed chooser response. Two studies, one marked last accessed. */
export const studiesChooserSample = {
  link: [],
  resource: [
    {
      link: [],
      content: {
        type: 'model-slc.cm.cs.student.cmStudyInfoDto',
        CmStudyInfoDto: {
          studyId: 339484,
          curriculumVersionId: 1151,
          curriculumId: 43,
          name: {
            coType: 'model-core.lib.model.langdata',
            value: 'Linguistik',
            translations: {
              translation: [{ lang: 'de', value: 'Linguistik' }, { lang: 'en', value: 'Linguistics' }, { lang: 'fr' }, { lang: 'it' }],
            },
          },
          intendedDegree: {
            coType: 'model-core.lib.model.langdata',
            value: 'Bachelor of Arts',
            translations: { translation: [{ lang: 'de', value: 'Bachelor of Arts' }, { lang: 'en', value: 'Bachelor of Arts' }] },
          },
          versionIdentifier: '84-152-23',
          studyStatus: 'STUDYING_ALLOWED',
          identifier: '1590 84 152 1',
          customizationDto: { color: '#e6e76d', icon: '' },
          customizationLink: {
            rel: 'related',
            href: 'https://campus.uni-stuttgart.de/cusonline/ee/rest/slc.cm.cs/student/myStudies/339484/personalStudyConfig/customization',
            name: 'CmMyStudyCustomization',
          },
          myStudyLink: {
            rel: 'related',
            href: 'https://campus.uni-stuttgart.de/cusonline/ee/rest/slc.cm.cs/student/myStudies/339484/myCurriculumElements/2496981',
            name: 'curriculumElement',
          },
          lastAccessed: true,
        },
      },
    },
    {
      link: [],
      content: {
        type: 'model-slc.cm.cs.student.cmStudyInfoDto',
        CmStudyInfoDto: {
          studyId: 339485,
          curriculumVersionId: 554,
          curriculumId: 42,
          name: {
            coType: 'model-core.lib.model.langdata',
            value: 'Philosophie',
            translations: {
              translation: [{ lang: 'de', value: 'Philosophie' }, { lang: 'en', value: 'Philosophy' }, { lang: 'fr' }, { lang: 'it' }],
            },
          },
          intendedDegree: {
            coType: 'model-core.lib.model.langdata',
            value: 'Bachelor of Arts',
            translations: { translation: [{ lang: 'de', value: 'Bachelor of Arts' }, { lang: 'en', value: 'Bachelor of Arts' }] },
          },
          versionIdentifier: '84-127-14',
          studyStatus: 'STUDYING_ALLOWED',
          identifier: '1590 84 127 1',
          customizationDto: { color: '#bff54', icon: '' },
          customizationLink: {
            rel: 'related',
            href: 'https://campus.uni-stuttgart.de/cusonline/ee/rest/slc.cm.cs/student/myStudies/339485/personalStudyConfig/customization',
            name: 'CmMyStudyCustomization',
          },
          myStudyLink: {
            rel: 'related',
            href: 'https://campus.uni-stuttgart.de/cusonline/ee/rest/slc.cm.cs/student/myStudies/339485/myCurriculumElements/278343',
            name: 'curriculumElement',
          },
          lastAccessed: false,
        },
      },
    },
  ],
} satisfies StudiesChooserResponse;
