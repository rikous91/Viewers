/**
 *
 * @param {string[]} primaryStudyInstanceUIDs
 * @param {object[]} studyDisplayList
 * @param {string} studyDisplayList.studyInstanceUid
 * @param {string} studyDisplayList.date
 * @param {string} studyDisplayList.description
 * @param {string} studyDisplayList.modalities
 * @param {number} studyDisplayList.numInstances
 * @param {object[]} displaySets
 * @param {number} recentTimeframe - The number of milliseconds to consider a study recent
 * @returns tabs - The prop object expected by the StudyBrowser component
 */

export function createStudyBrowserTabs(
  primaryStudyInstanceUIDs,
  studyDisplayList,
  displaySets,
  recentTimeframeMS = 31536000000
) {
  const primaryStudies = [];
  let allStudies = [];
  let studiRemoti = [];

  studyDisplayList.forEach(study => {
    const displaySetsForStudy = displaySets.filter(
      ds => ds.StudyInstanceUID === study.studyInstanceUid
    );
    const tabStudy = Object.assign({}, study, {
      displaySets: displaySetsForStudy,
    });

    if (primaryStudyInstanceUIDs.includes(study.studyInstanceUid)) {
      primaryStudies.push(tabStudy);
    } else {
      allStudies.push(tabStudy);
    }
  });

  allStudies = allStudies.filter(study => {
    if (study.description.includes('|Remoto|')) {
      study.description = study.description.replace('|Remoto|', '');
      studiRemoti.push(study);
      return false; // Esclude l'elemento da allStudies
    }
    return true; // Mantiene l'elemento in allStudies
  });

  if (studiRemoti.length === 0) {
    studiRemoti = [
      {
        studyInstanceUid: '',
        date: '',
        description: 'Nessuno storico remoto',
        modalities: '',
        numInstances: 0,
        displaySets: [],
      },
    ];
  }
  window.studiRemoti = JSON.parse(JSON.stringify(studiRemoti));

  const primaryStudiesTimestamps = primaryStudies
    .filter(study => study.date)
    .map(study => new Date(study.date).getTime());

  const recentStudies =
    primaryStudiesTimestamps.length > 0
      ? allStudies.filter(study => {
        const oldestPrimaryTimeStamp = Math.min(...primaryStudiesTimestamps);

        if (!study.date) {
          return false;
        }
        const studyTimeStamp = new Date(study.date).getTime();
        return oldestPrimaryTimeStamp - studyTimeStamp < recentTimeframeMS;
      })
      : [];

  // Newest first
  const _byDate = (a, b) => {
    const dateA = Date.parse(a);
    const dateB = Date.parse(b);

    return dateB - dateA;
  };
  const tabs = [
    {
      name: 'primary',
      label: 'Studio attuale',
      studies: primaryStudies.sort((studyA, studyB) => _byDate(studyA.date, studyB.date)),
    },
    {
      name: 'all',
      label: window.isSuite ? 'Storico sul cloud' : 'Storico locale',
      studies: allStudies.sort((studyA, studyB) => _byDate(studyA.date, studyB.date)),
    },
  ];

  //Tabs con storico remoto
  const tabsStoricoRemoto = [
    {
      name: 'primary',
      label: 'Studio attuale',
      studies: primaryStudies.sort((studyA, studyB) => _byDate(studyA.date, studyB.date)),
    },
    // {
    //   name: 'recent',
    //   label: 'Storico sul cloud',
    //   studies: recentStudies.sort((studyA, studyB) => _byDate(studyA.date, studyB.date)),
    // },
    {
      name: 'all',
      label: window.isSuite ? 'Storico sul cloud' : 'Storico locale',
      studies: allStudies.sort((studyA, studyB) => _byDate(studyA.date, studyB.date)),
    },
    // {
    //   name: 'all',
    //   label: 'All',
    //   studies: allStudies.sort((studyA, studyB) => _byDate(studyA.date, studyB.date)),
    // },
    {
      name: 'remoteAll',
      label: 'Storico remoto',
      studies: studiRemoti.sort((studyA, studyB) => _byDate(studyA.date, studyB.date)),
    },
  ];

  if (window.storicoRemoto) {
    return tabsStoricoRemoto;
  } else {
    return tabs;
  }
}
