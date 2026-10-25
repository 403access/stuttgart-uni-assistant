import type { CurriculumStructureResponse } from '@/src/campus/curriculum';

/** Reduced fixture of the observed structure response. One root and one child. */
export const curriculumStructureSample = {
  link: [],
  resource: [
    {
      link: [
        {
          rel: 'related',
          href: 'https://campus.uni-stuttgart.de/cusonline/ee/rest/slc.cm.cs/student/myStudies/1/myCurriculumElements/10/structure/children?$ctx=design=ca;lang=de',
          name: 'curriculumStructureElementChildren',
        },
        {
          rel: 'related',
          href: 'https://campus.uni-stuttgart.de/cusonline/ee/rest/slc.cm.cs/student/myStudies/1/myCurriculumElements/10?$ctx=design=ca;lang=de',
          name: 'curriculumElement',
        },
      ],
      content: {
        type: 'model-slc.cm.mystudy.curriculumStructureElementDto',
        curriculumStructureElementDto: {
          designation: '84-127-14',
          elementType: 'ROOT',
          enabledInfo: {
            enabled: true,
            active: true,
            partOfCurriculum: true,
            validInTime: true,
            completed: false,
          },
          iconName: 'stp_0',
          id: 10,
          name: {
            coType: 'model-core.lib.model.langdata',
            value: 'Philosophie',
            translations: {
              translation: [{ lang: 'de', value: 'Philosophie' }, { lang: 'en', value: 'Philosophy' }, { lang: 'fr' }],
            },
          },
          tags: [],
          isActive: true,
        },
      },
    },
    {
      link: [
        {
          rel: 'related',
          href: 'https://campus.uni-stuttgart.de/cusonline/ee/rest/slc.cm.cs/student/myStudies/1/myCurriculumElements/20?$ctx=design=ca;lang=de',
          name: 'curriculumElement',
        },
      ],
      content: {
        type: 'model-slc.cm.mystudy.curriculumStructureElementDto',
        curriculumStructureElementDto: {
          designation: '100',
          elementType: 'DEFAULT',
          enabledInfo: {
            enabled: true,
            active: true,
            partOfCurriculum: true,
            validInTime: true,
            completed: false,
          },
          iconName: 'stp_5',
          id: 20,
          name: {
            coType: 'model-core.lib.model.langdata',
            value: 'Basismodule',
            translations: { translation: [{ lang: 'de', value: 'Basismodule' }, { lang: 'en', value: 'Basic Modules' }] },
          },
          tags: [
            {
              text: '$slc_cm_my_study_in_progress_tag',
              tagType: 'IN_PROGRESS',
              replacementData: [{ key: 'SEMESTER', value: '2026 W' }],
            },
          ],
          sortPriority: 100,
          parentId: 10,
          isActive: true,
        },
      },
    },
  ],
} satisfies CurriculumStructureResponse;
