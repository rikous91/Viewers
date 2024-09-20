const intervalCaricamentoHP = setInterval(() => {
  // if (window.servicesManager) {
  if (window.nolexAllReady && !window.caricamentoHP) {
    window.caricamentoHP = true;
    clearInterval(intervalCaricamentoHP);
    caricamentoHP();
  }
}, 100);

//A prescindere blocco l'intervallo check dopo un tot per performance
setTimeout(() => {
  clearInterval(intervalCaricamentoHP);
}, 10000);

let cameraSettings;

const caricamentoHP = async () => {
  let url = window.location.href;
  const aetitle = window.nolexAETitle;
  const username = new URLSearchParams(new URL(url).search).get('User');
  let nolexhp;

  let istanzeSpecifiche = [];
  let hpTrovati = false;
  let studyInstanceUID = new URLSearchParams(new URL(url).search).get('StudyInstanceUIDs');
  let nomeEsameStudioHP = new URLSearchParams(new URL(url).search).get('StudyDescription');
  let modalityStudioHP = new URLSearchParams(new URL(url).search).get('Modality');
  let esameTrovato = false;
  let preferenzeRemote;
  if (!studyInstanceUID || !nomeEsameStudioHP || !modalityStudioHP || !username || !aetitle) {
    console.warn("Impossibile leggere eventuali HP custom, nell'url mancano le info necessarie");
    return;
  }
  //Verifico che ci siano già delle preferenze nella localStorage. Se non fosse così è la prima volta che richiedo le preferenze quindi le chiedo al server
  if (!localStorage.getItem(`preferenzeUtente-${aetitle}`)) {
    preferenzeRemote = await letturaPreferenzeAPI(aetitle, studyInstanceUID);
    if (!preferenzeRemote || !preferenzeRemote.json) {
      return console.warn('Non è stato possibile recuperare le preferenze utente per gli HP');
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
    return;
  }
  let preferenzeUtenteModality = JSON.parse(localStorage.getItem(`preferenzeUtente-${aetitle}`))?.hp
    .modality;
  //Prima do priorità allo studio specifico ovvero se gli hanging protocol hanno quello studyInstanceUID
  if (preferenzeUtenteStudioSpecifico && preferenzeUtenteStudioSpecifico[studyInstanceUID]) {
    cameraSettings = preferenzeUtenteStudioSpecifico[studyInstanceUID].camera;
    istanzeSpecifiche = preferenzeUtenteStudioSpecifico[studyInstanceUID].istanzeSpecifiche;
    nolexhp = preferenzeUtenteStudioSpecifico[studyInstanceUID].performanceHP;
    // window.hpCamera = preferenzeUtenteStudioSpecifico[studyInstanceUID].camera;
    hpTrovati = true;
  }
  //Se non c'è lo studio specifico itero per controllare se presente descrizione esame o modality salvata negli HP
  else {
    for (let i = 0; i < preferenzeUtenteDescrizioneEsame.length; i++) {
      if (preferenzeUtenteDescrizioneEsame[i].nomeEsame === nomeEsameStudioHP) {
        cameraSettings = preferenzeUtenteDescrizioneEsame[i].camera;
        istanzeSpecifiche = preferenzeUtenteDescrizioneEsame[i].istanzeSpecifiche;
        nolexhp = preferenzeUtenteDescrizioneEsame[i].performanceHP;
        // window.hpCamera = preferenzeUtenteDescrizioneEsame[i].camera;
        esameTrovato = true;
        hpTrovati = true;
        break;
      }
    }
    // Non ho trovato nulla finora, provo per modality
    if (!esameTrovato) {
      // eslint-disable-next-line no-lone-blocks
      {
        for (let i = 0; i < preferenzeUtenteModality.length; i++) {
          if (
            modalityStudioHP !== '' &&
            preferenzeUtenteModality[i].nomeModality === modalityStudioHP
          ) {
            cameraSettings = preferenzeUtenteModality[i].camera;
            istanzeSpecifiche = preferenzeUtenteModality[i].istanzeSpecifiche;
            nolexhp = preferenzeUtenteModality[i].performanceHP;
            // window.hpCamera = preferenzeUtenteModality[i].camera;
            hpTrovati = true;
          }
        }
      }
    }
  }
  //Sistemo le istanze specifiche
  if (istanzeSpecifiche) {
    for (let i = 0; i < istanzeSpecifiche.length; i++) {
      nolexhp.stages[0].viewports[i].viewportOptions.initialImageOptions = {};
      nolexhp.stages[0].viewports[i].viewportOptions.initialImageOptions.index =
        istanzeSpecifiche[i] - 1;
    }
  }

  if (cameraSettings) {
    // cameraSettings = Object.values(cameraSettings);
  }

  window.cameraSettingsFromHPNolex = cameraSettings;

  //Applico HP letti
  if (nolexhp) {
    const { hangingProtocolService, cornerstoneViewportService, viewportGridService } =
      window.servicesManager.services;
    // hangingProtocolService.addProtocol(nolexhp.id, nolexhp);
    hangingProtocolService.addProtocol(nolexhp.id, nolexhp);

    hangingProtocolService.setProtocol('nolexhp');
    const uiNotificationService = window.servicesManager.services.uiNotificationService;
    uiNotificationService.show({
      title: 'Hanging protocol',
      message: `Hanging protocol applicati`,
      type: 'success',
    });
  }

  //A fine caricamento rinnovo la localStorage per avere dati sempre freschi e aggiornati
  preferenzeRemote = await letturaPreferenzeAPI(aetitle, studyInstanceUID);
  if (!preferenzeRemote || !preferenzeRemote.json) {
    return console.warn('Non è stato possibile recuperare le preferenze utente per gli HP');
  }
  //A questo punto li setto in localStorage
  localStorage.setItem(`preferenzeUtente-${aetitle}`, JSON.stringify(preferenzeRemote.json));
};

async function letturaPreferenzeAPI(aetitle, studyInstanceUID) {
  const apiUrl = `https://suite.nolex.it/viewer/userdata/${aetitle}/?user=admin&StudyInstanceUIDs=${studyInstanceUID}&cacheBuster=${new Date().getTime()}`;

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
