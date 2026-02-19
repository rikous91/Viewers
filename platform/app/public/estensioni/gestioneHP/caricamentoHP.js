const _nolexhp = {
  id: 'nolexhp',
  description: 'Has various hanging protocol grid layouts',
  name: '2x2',
  protocolMatchingRules: [],
  displaySetSelectors: {
    DisplaySet0: {
      seriesMatchingRules: [
        {
          attribute: 'SeriesInstanceUID',
          constraint: {
            contains: '1.3.76.2.1.1.4.1.3.7471.776535301',
          },
        },
      ],
    },
    DisplaySet1: {
      seriesMatchingRules: [
        {
          attribute: 'SeriesInstanceUID',
          constraint: {
            contains: '1.3.76.2.1.1.4.1.3.7471.776535351',
          },
        },
      ],
    },
    DisplaySet2: {
      seriesMatchingRules: [
        {
          attribute: 'SeriesInstanceUID',
          constraint: {
            contains: '1.3.76.2.1.1.4.1.3.7471.776535708',
          },
        },
      ],
    },
    DisplaySet3: {
      seriesMatchingRules: [
        {
          attribute: 'SeriesInstanceUID',
          constraint: {
            contains: '1.3.76.2.1.1.4.1.3.7471.776536010',
          },
        },
      ],
    },
  },
  stages: [
    {
      id: '2x2',
      name: '2x2',
      viewportStructure: {
        layoutType: 'grid',
        properties: {
          rows: 2,
          columns: 2,
        },
      },
      viewports: [
        {
          viewportOptions: {
            toolGroupId: 'default',
            viewportType: 'stack',
          },
          displaySets: [
            {
              id: 'DisplaySet0',
            },
          ],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            viewportType: 'stack',
          },
          displaySets: [
            {
              id: 'DisplaySet1',
            },
          ],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            viewportType: 'stack',
          },
          displaySets: [
            {
              id: 'DisplaySet2',
            },
          ],
        },
        {
          viewportOptions: {
            toolGroupId: 'default',
            viewportType: 'stack',
          },
          displaySets: [
            {
              id: 'DisplaySet3',
            },
          ],
        },
      ],
    },
  ],
  numberOfPriorsReferenced: -1,
};

const MAX_WAIT_HP_START_MS = 120000;
const HP_START_INTERVAL_MS = 250;
const hpStartTime = Date.now();

const canStartCaricamentoHP = () => {
  const services = window.servicesManager?.services;
  const hasServices =
    !!services?.hangingProtocolService &&
    !!services?.displaySetService &&
    !!services?.viewportGridService;
  if (!window.nolexAllReady && !hasServices) {
    return false;
  }
  const viewportGridService = services?.viewportGridService;
  if (!viewportGridService?.getState) {
    return false;
  }
  try {
    const state = viewportGridService.getState();
    return !!state;
  } catch (err) {
    return false;
  }
};

const tryStartCaricamentoHP = () => {
  if (window.caricamentoHP) {
    return true;
  }
  if (canStartCaricamentoHP()) {
    window.caricamentoHP = true;
    console.log('[HP] Avvio caricamento');
    caricamentoHP();
    return true;
  }
  if (Date.now() - hpStartTime > MAX_WAIT_HP_START_MS) {
    console.warn('[HP] Timeout avvio: servizi non pronti', {
      waitedMs: Date.now() - hpStartTime,
      hasServices: !!window.servicesManager?.services,
      nolexAllReady: window.nolexAllReady,
    });
    return true;
  }
  return false;
};

const intervalCaricamentoHP = setInterval(() => {
  if (tryStartCaricamentoHP()) {
    clearInterval(intervalCaricamentoHP);
  }
}, HP_START_INTERVAL_MS);

window.addEventListener('load', () => {
  if (tryStartCaricamentoHP()) {
    clearInterval(intervalCaricamentoHP);
  }
});

  let cameraSettings;
  let cameraByIndex;

const caricamentoHP = async () => {
  let url = window.location.href;
  const aetitle = window.nolexAETitle;
  const username = new URLSearchParams(new URL(url).search).get('User') || window.nolexUsername;
  let nolexhp;

  let istanzeSpecifiche = [];
  let hpTrovati = false;
  let tipoMatch = null;
  let studyInstanceUID = new URLSearchParams(new URL(url).search).get('StudyInstanceUIDs') || window.nolexStudyInstanceUIDs;
  let nomeEsameStudioHP = new URLSearchParams(new URL(url).search).get('StudyDescription') || window.nolexStudyDescription;
  let modalityStudioHP = new URLSearchParams(new URL(url).search).get('Modality') || window.nolexModality;
  let esameTrovato = false;
  let preferenzeRemote;
  const normalizza = value => (value || '').toString().trim().toUpperCase();
  const normalizzaModality = value =>
    (value || '')
      .toString()
      .split('\\')
      .map(item => normalizza(item))
      .filter(Boolean);

  const applicaFallbackDaMetadata = () => {
    if (nomeEsameStudioHP && modalityStudioHP) {
      return;
    }
    const displaySetService = window.servicesManager?.services?.displaySetService;
    if (!displaySetService || !studyInstanceUID) {
      return;
    }
    const displaySets = displaySetService.getDisplaySetsBy(
      ds => ds?.StudyInstanceUID === studyInstanceUID
    );
    if (!displaySets?.length) {
      return;
    }
    const displaySetWithInstance = displaySets.find(ds => ds.instances?.length) || displaySets[0];
    const referenceInstance =
      displaySetWithInstance?.instance || displaySetWithInstance?.instances?.[0];

    if (!nomeEsameStudioHP) {
      const studyDescriptionFromMetadata =
        referenceInstance?.StudyDescription || displaySetWithInstance?.StudyDescription;
      if (studyDescriptionFromMetadata) {
        nomeEsameStudioHP = studyDescriptionFromMetadata;
        window.nolexStudyDescription = nomeEsameStudioHP;
      }
    }

    if (!modalityStudioHP) {
      const modalities = new Set();
      displaySets.forEach(ds => {
        if (ds?.Modality) {
          modalities.add(ds.Modality);
        } else if (ds?.instances?.[0]?.Modality) {
          modalities.add(ds.instances[0].Modality);
        }
      });
      if (modalities.size) {
        modalityStudioHP = Array.from(modalities).join('\\');
        window.nolexModality = modalityStudioHP;
      }
    }
  };

  if (!studyInstanceUID || !aetitle) {
    console.warn("Impossibile leggere eventuali HP custom, mancano StudyInstanceUIDs o aetitle");
    return;
  }

  applicaFallbackDaMetadata();
  const nomeEsameNormalizzato = normalizza(nomeEsameStudioHP);
  console.log('[HP] Studio', {
    studyInstanceUID,
    nomeEsameStudioHP,
    modalityStudioHP,
  });

  if (!nomeEsameStudioHP && !modalityStudioHP) {
    console.warn(
      "Impossibile determinare StudyDescription/Modality (url+metadata). Verranno applicati solo HP studio-specifici."
    );
  }
  //Verifico che ci siano già delle preferenze nella localStorage. Se non fosse così è la prima volta che richiedo le preferenze quindi le chiedo al server
  if (!localStorage.getItem(`preferenzeUtente-${aetitle}`)) {
    if (!username) {
      console.warn('Username mancante: impossibile recuperare preferenze HP da remoto');
      return;
    }
    preferenzeRemote = await letturaPreferenzeAPI(aetitle, username, studyInstanceUID);
    if (!preferenzeRemote || !preferenzeRemote.json) {
      return console.warn('Non ? stato possibile recuperare le preferenze utente per gli HP');
    }
    //A questo punto li setto in localStorage
    localStorage.setItem(`preferenzeUtente-${aetitle}`, JSON.stringify(preferenzeRemote.json));
  }
  let preferenzeUtenteStudioSpecifico = JSON.parse(
    localStorage.getItem(`preferenzeUtente-${aetitle}`)
  )?.hp.studioSpecifico;
  let preferenzeUtenteDescrizioneEsame = JSON.parse(
    localStorage.getItem(`preferenzeUtente-${aetitle}`)
  )?.hp.nomeEsame;
  if (!preferenzeUtenteDescrizioneEsame) {
    console.warn('HP - Nessuna preferenza utente per descrizione esame trovata');
  }
  let preferenzeUtenteModality = JSON.parse(localStorage.getItem(`preferenzeUtente-${aetitle}`))?.hp
    .modality;
  //Prima do priorità allo studio specifico ovvero se gli hanging protocol hanno quello studyInstanceUID
  if (preferenzeUtenteStudioSpecifico && preferenzeUtenteStudioSpecifico[studyInstanceUID]) {
    cameraSettings = preferenzeUtenteStudioSpecifico[studyInstanceUID].camera;
    cameraByIndex = preferenzeUtenteStudioSpecifico[studyInstanceUID].cameraByIndex;
    istanzeSpecifiche = preferenzeUtenteStudioSpecifico[studyInstanceUID].istanzeSpecifiche;
    nolexhp = preferenzeUtenteStudioSpecifico[studyInstanceUID].performanceHP;
    // window.hpCamera = preferenzeUtenteStudioSpecifico[studyInstanceUID].camera;
    hpTrovati = true;
    tipoMatch = 'studioSpecifico';
  }
  //Se non c'è lo studio specifico itero per controllare se presente descrizione esame o modality salvata negli HP
  else {
    for (let i = 0; i < (preferenzeUtenteDescrizioneEsame || []).length; i++) {
      if (normalizza(preferenzeUtenteDescrizioneEsame[i].nomeEsame) === nomeEsameNormalizzato) {
        cameraSettings = preferenzeUtenteDescrizioneEsame[i].camera;
        cameraByIndex = preferenzeUtenteDescrizioneEsame[i].cameraByIndex;
        istanzeSpecifiche = preferenzeUtenteDescrizioneEsame[i].istanzeSpecifiche;
        nolexhp = preferenzeUtenteDescrizioneEsame[i].performanceHP;
        // window.hpCamera = preferenzeUtenteDescrizioneEsame[i].camera;
        esameTrovato = true;
        hpTrovati = true;
        tipoMatch = 'descrizioneEsame';
        break;
      }
    }
    // Non ho trovato nulla finora, provo per modality
    if (!esameTrovato) {
      // eslint-disable-next-line no-lone-blocks
      {
        for (let i = 0; i < (preferenzeUtenteModality || []).length; i++) {
          const modalityCandidates = normalizzaModality(modalityStudioHP);
          const savedCandidates = normalizzaModality(preferenzeUtenteModality[i].nomeModality);
          const hasMatch = savedCandidates.some(item => modalityCandidates.includes(item));
          if (modalityCandidates.length && hasMatch) {
            cameraSettings = preferenzeUtenteModality[i].camera;
            cameraByIndex = preferenzeUtenteModality[i].cameraByIndex;
            istanzeSpecifiche = preferenzeUtenteModality[i].istanzeSpecifiche;
            nolexhp = preferenzeUtenteModality[i].performanceHP;
            // window.hpCamera = preferenzeUtenteModality[i].camera;
            hpTrovati = true;
            tipoMatch = 'modality';
          }
        }
      }
    }
  }
  if (hpTrovati) {
    console.log('[HP] Match', {
      tipo: tipoMatch,
      studyInstanceUID,
      nomeEsameStudioHP,
      modalityStudioHP,
    });
  } else {
    console.warn('[HP] Nessun HP trovato per lo studio', {
      studyInstanceUID,
      nomeEsameStudioHP,
      modalityStudioHP,
    });
  }
  //Sistemo le istanze specifiche
  if (nolexhp && Array.isArray(istanzeSpecifiche) && istanzeSpecifiche.length) {
    for (let i = 0; i < istanzeSpecifiche.length; i++) {
      if (!nolexhp.stages?.[0]?.viewports?.[i]) {
        continue;
      }
      nolexhp.stages[0].viewports[i].viewportOptions.initialImageOptions = {};
      nolexhp.stages[0].viewports[i].viewportOptions.initialImageOptions.index =
        istanzeSpecifiche[i] - 1;
    }
  }

  if (cameraSettings || cameraByIndex) {
    const cameraByIndexToUse = cameraByIndex || cameraSettings?.byIndex || [];
    const cameraByViewportId = cameraSettings?.byViewportId || cameraSettings || {};
    const remappedSettings = {};

    if (Object.keys(cameraByViewportId || {}).some(key => key.startsWith('nolexhp-'))) {
      Object.entries(cameraByViewportId).forEach(([key, value]) => {
        if (key.startsWith('nolexhp-')) {
          remappedSettings[key] = value;
        }
      });
    } else if (cameraByIndexToUse.length) {
      cameraByIndexToUse.forEach((value, index) => {
        remappedSettings[`nolexhp-${index}`] = value;
      });
    }

    window.cameraSettingsFromHPNolex = remappedSettings;
    window.viewportsAlreadyHPApplied = [];
  }

  // window.cameraSettingsFromHPNolex = cameraSettings;

  //Applico HP letti
  const applicaHangingProtocol = () => {
    if (!nolexhp) {
      return false;
    }
    const services = window.servicesManager?.services;
    if (!services) {
      console.warn('[HP] Servizi non pronti');
      return false;
    }
    const { hangingProtocolService, displaySetService, uiNotificationService, viewportGridService } =
      services;
    if (!hangingProtocolService || !displaySetService || !viewportGridService) {
      console.warn('[HP] Servizi mancanti', {
        hasHP: !!hangingProtocolService,
        hasDisplaySets: !!displaySetService,
        hasViewportGrid: !!viewportGridService,
      });
      return false;
    }
    const activeStudy = hangingProtocolService.getActiveProtocol?.()?.activeStudy;
    const displaySetsCount = displaySetService?.getActiveDisplaySets?.()?.length || 0;
    let viewportsState;
    try {
      viewportsState = viewportGridService.getState?.();
    } catch (err) {
      console.warn('[HP] ViewportGridService non pronto', err);
      return false;
    }
    const viewports = viewportsState?.viewports;
    const viewportsCount = viewports?.size ?? viewports?.length ?? 0;
    const activeStudyUID =
      activeStudy?.StudyInstanceUID || activeStudy?.studyInstanceUID || activeStudy?.StudyUID;
    if (studyInstanceUID && activeStudyUID && activeStudyUID !== studyInstanceUID) {
      console.warn('[HP] Studio attivo non corrisponde', {
        activeStudyUID,
        studyInstanceUID,
      });
      return false;
    }
    if (!activeStudy || !displaySetsCount || !viewportsCount) {
      console.warn('[HP] Applicazione rimandata', {
        hasActiveStudy: !!activeStudy,
        displaySetsCount,
        viewportsCount,
      });
      return false;
    }

    try {
      hangingProtocolService.addProtocol(nolexhp.id, nolexhp);
      hangingProtocolService.setProtocol('nolexhp');
      uiNotificationService.show({
        title: 'Hanging protocol',
        message: `Hanging protocol applicati`,
        type: 'success',
      });
      return true;
    } catch (error) {
      console.warn('HP - applicazione fallita, riprovo al cambio display set');
      return false;
    }
  };

  if (nolexhp) {
    const applied = applicaHangingProtocol();
    if (!applied) {
      const services = window.servicesManager?.services;
      const { displaySetService, viewportGridService } = services || {};
      const subscriptions = [];
      const tryApply = () => {
        const retryApplied = applicaHangingProtocol();
        if (retryApplied) {
          subscriptions.forEach(sub => sub?.unsubscribe?.());
          subscriptions.length = 0;
        }
      };
      if (displaySetService?.subscribe) {
        subscriptions.push(
          displaySetService.subscribe(displaySetService.EVENTS.DISPLAY_SETS_CHANGED, tryApply)
        );
      }
      if (viewportGridService?.subscribe) {
        subscriptions.push(
          viewportGridService.subscribe(viewportGridService.EVENTS.VIEWPORTS_READY, tryApply)
        );
        subscriptions.push(
          viewportGridService.subscribe(viewportGridService.EVENTS.GRID_STATE_CHANGED, tryApply)
        );
      }
    }
  }

  //A fine caricamento rinnovo la localStorage per avere dati sempre freschi e aggiornati
  if (username) {
    preferenzeRemote = await letturaPreferenzeAPI(aetitle, username, studyInstanceUID);
    if (!preferenzeRemote || !preferenzeRemote.json) {
      return console.warn('Non ? stato possibile recuperare le preferenze utente per gli HP');
    }
    //A questo punto li setto in localStorage
    localStorage.setItem(`preferenzeUtente-${aetitle}`, JSON.stringify(preferenzeRemote.json));
  }
};

async function letturaPreferenzeAPI(aetitle, username, studyInstanceUID) {
  const origin = window.isSuite ? 'https://suite.nolex.it' : window.location.origin;
  const apiUrl = `${origin}/viewer/userdata/${aetitle}/?user=${username}&StudyInstanceUIDs=${studyInstanceUID}&cacheBuster=${new Date().getTime()}`;

  try {
    const apiResponse = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
      },
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
    });

    if (!apiResponse.ok) {
      console.error('Errore durante il recupero delle preferenze utente da remoto');
      return;
    }
    return apiResponse.json();
  } catch (err) {
    return console.error('Errore durante il recupero delle preferenze utente da remoto');
  }
}

export { letturaPreferenzeAPI };
