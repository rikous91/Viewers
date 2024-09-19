import { letturaPreferenzeAPI } from './caricamentoHP';

let uiNotificationService;
let nolexHP = {
  id: 'nolexhp',
  locked: true,
  name: 'Default',
  createdDate: '2021-02-23T19:22:08.894Z',
  modifiedDate: '2022-10-04T19:22:08.894Z',
  availableTo: {},
  editableBy: {},
  imageLoadStrategy: 'interleaveTopToBottom',
  protocolMatchingRules: [
    {
      // attribute: 'ModalitiesInStudy',
      // constraint: {
      //   contains: ['CT', 'PT'],
      // },
    },
  ],
  displaySetSelectors: {
    DisplaySet0: {
      seriesMatchingRules: [
        {
          attribute: 'SeriesDescription',
          constraint: {
            contains: 'MAMMOGRAM, Diagnosis',
          },
        },
      ],
    },
    DisplaySet1: {
      seriesMatchingRules: [{}],
    },
    DisplaySet2: {
      seriesMatchingRules: [{}],
    },
    DisplaySet3: {
      seriesMatchingRules: [{}],
    },
    DisplaySet4: {
      seriesMatchingRules: [{}],
    },
    DisplaySet5: {
      seriesMatchingRules: [{}],
    },
    DisplaySet6: {
      seriesMatchingRules: [{}],
    },
    DisplaySet7: {
      seriesMatchingRules: [{}],
    },
    DisplaySet8: {
      seriesMatchingRules: [{}],
    },
    DisplaySet9: {
      seriesMatchingRules: [{}],
    },
    DisplaySet10: {
      seriesMatchingRules: [{}],
    },
    DisplaySet11: {
      seriesMatchingRules: [{}],
    },
    DisplaySet12: {
      seriesMatchingRules: [{}],
    },
    DisplaySet13: {
      seriesMatchingRules: [{}],
    },
    DisplaySet14: {
      seriesMatchingRules: [{}],
    },
    DisplaySet15: {
      seriesMatchingRules: [{}],
    },
  },
  stages: [
    {
      id: 'hYbmMy3b7pz7GLiaT',
      name: 'default',
      viewportStructure: {
        layoutType: 'grid',
        properties: {
          rows: 1,
          columns: 3,
        },
      },
      viewports: [
        {
          viewportOptions: {
            viewportType: 'stack',
            initialImageOptions: {
              index: 3,
            },
          },
          displaySets: [
            {
              options: {
                // colormap: 'hsv',
                camera: {
                  windowWidth: 5,
                  windowCenter: 2.5,
                },
              },
              id: 'DisplaySet0',
            },
          ],
        },
        {
          viewportOptions: {
            viewportType: 'stack',
            orientation: 'sagittal',
          },
          displaySets: [
            {
              id: 'DisplaySet1',
            },
          ],
        },
        {
          viewportOptions: {
            viewportType: 'stack',
            orientation: 'sagittal',
          },
          displaySets: [
            {
              id: 'DisplaySet2',
            },
          ],
        },
        {
          viewportOptions: {
            viewportType: 'stack',
            orientation: 'sagittal',
          },
          displaySets: [
            {
              id: 'DisplaySet3',
            },
          ],
        },
        {
          viewportOptions: {
            viewportType: 'stack',
            orientation: 'sagittal',
          },
          displaySets: [
            {
              id: 'DisplaySet4',
            },
          ],
        },
        {
          viewportOptions: {
            viewportType: 'stack',
            orientation: 'sagittal',
          },
          displaySets: [
            {
              id: 'DisplaySet5',
            },
          ],
        },
        {
          viewportOptions: {
            viewportType: 'stack',
            orientation: 'sagittal',
          },
          displaySets: [
            {
              id: 'DisplaySet6',
            },
          ],
        },
        {
          viewportOptions: {
            viewportType: 'stack',
            orientation: 'sagittal',
          },
          displaySets: [
            {
              id: 'DisplaySet7',
            },
          ],
        },
        {
          viewportOptions: {
            viewportType: 'stack',
            orientation: 'sagittal',
          },
          displaySets: [
            {
              id: 'DisplaySet8',
            },
          ],
        },
        {
          viewportOptions: {
            viewportType: 'stack',
            orientation: 'sagittal',
          },
          displaySets: [
            {
              id: 'DisplaySet9',
            },
          ],
        },
        {
          viewportOptions: {
            viewportType: 'stack',
            orientation: 'sagittal',
          },
          displaySets: [
            {
              id: 'DisplaySet10',
            },
          ],
        },
        {
          viewportOptions: {
            viewportType: 'stack',
            orientation: 'sagittal',
            // initialImageOptions: {
            //   preset: 'middle',
            // },
          },
          displaySets: [
            {
              id: 'DisplaySet11',
            },
          ],
        },
        {
          viewportOptions: {
            viewportType: 'stack',
            orientation: 'sagittal',
            // initialImageOptions: {
            //   preset: 'middle',
            // },
          },
          displaySets: [
            {
              id: 'DisplaySet12',
            },
          ],
        },
        {
          viewportOptions: {
            viewportType: 'stack',
            orientation: 'sagittal',
            // initialImageOptions: {
            //   preset: 'middle',
            // },
          },
          displaySets: [
            {
              id: 'DisplaySet13',
            },
          ],
        },
        {
          viewportOptions: {
            viewportType: 'stack',
            orientation: 'sagittal',
            // initialImageOptions: {
            //   preset: 'middle',
            // },
          },
          displaySets: [
            {
              id: 'DisplaySet14',
            },
          ],
        },
        {
          viewportOptions: {
            viewportType: 'stack',
            orientation: 'sagittal',
            // initialImageOptions: {
            //   preset: 'middle',
            // },
          },
          displaySets: [
            {
              id: 'DisplaySet15',
            },
          ],
        },
      ],
      createdDate: '2021-02-23T18:32:42.850Z',
    },
  ],
  numberOfPriorsReferenced: -1,
};

let istanzeSpecifiche = [];

const aetitle = window.nolexAETitle;
const username = window.nolexUsername;
const studyInstanceUIDs = window.nolexStudyInstanceUIDs;
const studyDescription = window.nolexStudyDescription;
const modality = window.nolexModality;
async function salvataggioHP() {
  creaDIV();
}

function hpAttualmenteSalvati() {
  const configAttiva = [];
  if (!localStorage.getItem(`preferenzeUtente-${aetitle}`)) {
    return configAttiva;
  }
  const preferenzeUtenteStudioSpecifico = JSON.parse(
    localStorage.getItem(`preferenzeUtente-${aetitle}`)
  ).hp.studioSpecifico;
  const preferenzeUtenteEsame = JSON.parse(localStorage.getItem(`preferenzeUtente-${aetitle}`)).hp
    .nomeEsame;
  const preferenzeUtenteModality = JSON.parse(localStorage.getItem(`preferenzeUtente-${aetitle}`))
    .hp.modality;
  if (preferenzeUtenteStudioSpecifico[studyInstanceUIDs]) {
    configAttiva.push('studioSpecifico');
  }

  for (let i = 0; i < preferenzeUtenteEsame.length; i++) {
    if (preferenzeUtenteEsame[i].nomeEsame === studyDescription) {
      configAttiva.push('descrizioneEsame');
    }
  }

  for (let i = 0; i < preferenzeUtenteModality.length; i++) {
    if (modality !== '' && preferenzeUtenteModality[i].nomeModality === modality) {
      configAttiva.push('modality');
    }
  }
  return configAttiva;
}

let preferenzeRemote;

async function creaDIV() {
  //Toggle
  if (document.getElementById('menu-hp')) {
    document.getElementById('menu-hp').remove();
    return;
  }

  const configAttiva = hpAttualmenteSalvati(); //Verifico gli HP attualmente attivi per lo studio

  const menuHP = /*html*/ `
  <div id="menu-hp">
  <button id="close-hp">X</button>
  <h2>Gestione Hanging Protocol</h2>
  <div id="info">
  <p>Modality: <span>${modality}</span></p>
  <p>Esame: <span>${studyDescription}</span></p>
  <p style=${configAttiva.length > 0 ? 'color:#e9e9e9;display:block' : 'display:none'}>🟢 Hanging protocol applicati per questo studio </p>
  </div>

  <div style="display:flex;margin-top: 10px;">
  <div class="opzione-hp">
  <h3 style>Salva configurazione attuale solo per questo <span style="color:#b71c1c">studio</span></h3>
  <p>Gli Hanging Protocol si applicheranno solo a questo specifico studio</p>
  <p style="color:red;display:none" id="hp-studiospecifico-presente">Hai attualmente una configurazione salvata solo per questo studio </p>
  <button id="save-hp-config-actual-study">${configAttiva.includes('studioSpecifico') ? 'Sovrascrivi config. attuale' : 'Salva solo per questo studio'}</button>
  <button style=${configAttiva.includes('studioSpecifico') ? 'display:block' : 'display:none'} class="delete-hp-btn" id="delete-hp-config-actual-study">Elimina configurazione salvata</button>
  </div>

  <div class="opzione-hp">
  <h3>Salva configurazione attuale solo per questo tipo di <span style="color:#b71c1c">esame</span></h3>
  <p>Gli Hanging Protocol si applicheranno a tutti gli esami con descrizione <span style="font-weight: 600;">${studyDescription}</span></p>
  <p style="color:red;display:none" id="hp-descrizioneesame-presente">Hai attualmente una configurazione salvata per tutti gli esami con descrizione "${studyDescription}" </p>
  <p style="color:red;display:none" id="esame-senza-nome">Questo esame non ha un nome, se salvi la configurazione quest'ultima si applicherà a tutti gli esami senza nome. </p>
  <button id="save-hp-config-exam">${configAttiva.includes('descrizioneEsame') ? 'Sovrascrivi config. attuale' : 'Salva per questo tipo di esame'} </button>
  <button style=${configAttiva.includes('descrizioneEsame') ? 'display:block' : 'display:none'} class="delete-hp-btn" id="delete-hp-config-exam">Elimina configurazione salvata</button>
  </div>

  <div style="margin-right:0" class="opzione-hp">
  <h3>Salva configurazione attuale per questa <span style="color:#b71c1c">modality</span></h3>
  <p>Gli Hanging Protocol si applicheranno a tutti gli esami con modality <span style="font-weight: 600;">${modality}</span></p>
  <p style="color:red;display:none" id="hp-modality-presente">Hai attualmente una configurazione salvata per questa modality</p>
  <button id="save-hp-config-modality">${configAttiva.includes('modality') ? 'Sovrascrivi config. attuale' : 'Salva per questa modality'}</button>
  <button style=${configAttiva.includes('modality') ? 'display:block' : 'display:none'} class="delete-hp-btn" id="delete-hp-config-modality">Elimina configurazione salvata</button>
  </div>

  </div>
  </div>
  </div>
  `;

  // document.querySelector('.toolbar-below').style.filter = 'blur(2px) brightness(0.5)';
  document.body.insertAdjacentHTML('afterend', menuHP);

  //listener pulsanti
  const saveSpecificStudyBtn = document.getElementById('save-hp-config-actual-study');
  const saveConfigExamBtn = document.getElementById('save-hp-config-exam');
  const saveConfigModalityBtn = document.getElementById('save-hp-config-modality');

  const deleteConfigSpecificStudyBtn = document.getElementById('delete-hp-config-actual-study');
  const deleteConfigExamBtn = document.getElementById('delete-hp-config-exam');
  const deleteConfigModalityBtn = document.getElementById('delete-hp-config-modality');
  const closeHPDivBtn = document.getElementById('close-hp');

  saveSpecificStudyBtn.addEventListener('click', saveSpecificStudy);
  saveConfigExamBtn.addEventListener('click', saveConfigExam);
  saveConfigModalityBtn.addEventListener('click', saveConfigModality);
  deleteConfigSpecificStudyBtn.addEventListener('click', deleteConfigSpecificStudy);
  deleteConfigExamBtn.addEventListener('click', deleteConfigExam);
  deleteConfigModalityBtn.addEventListener('click', deleteConfigModality);

  closeHPDivBtn.addEventListener('click', () => {
    document.getElementById('menu-hp').remove();
  });
  preferenzeRemote = await letturaPreferenzeAPI(aetitle, studyInstanceUIDs);
  if (!preferenzeRemote || !preferenzeRemote.json) {
    return console.warn('Non è stato possibile recuperare le preferenze utente per gli HP');
  }
  uiNotificationService = window.servicesManager.services.uiNotificationService;
}

async function componiHP() {
  //Ottengo gli HP aggiornati in tempo reale
  const preferenzeRemote = await letturaPreferenzeAPI(aetitle, studyInstanceUIDs);
  if (!preferenzeRemote) {
    return console.warn('Non è stato possibile recuperare le preferenze utente per gli HP');
  }
  const attualiHP = preferenzeRemote.json.hp;
  nolexHP.stages[0].viewportStructure.properties.rows = Number(window.layout.split('x')[1]);
  nolexHP.stages[0].viewportStructure.properties.columns = Number(window.layout.split('x')[0]);
  const { cornerstoneViewportService, viewportGridService } = window.servicesManager.services;
  const { viewports } = viewportGridService.getState();
  const renderingEngine = cornerstoneViewportService.getRenderingEngine();
  let i = 0;
  let cameraHP = {};
  viewports.forEach(_viewport => {
    const { viewportId } = _viewport;
    const viewport = renderingEngine.getViewport(viewportId);
    const { element } = viewport;
    const cameraViewport = viewport.getCamera();
    cameraHP[`nolexhp-${i}`] = {};
    cameraHP[`nolexhp-${i}`].focalpoint = cameraViewport.focalPoint;
    cameraHP[`nolexhp-${i}`].parallelscale = cameraViewport.parallelScale;
    cameraHP[`nolexhp-${i}`].position = cameraViewport.position;
    const descrizioneSerie = element.parentElement.querySelector(
      '[title="Series description"]'
    )?.textContent;
    const numeroIstanza = viewport.currentImageIdIndex + 1;
    istanzeSpecifiche.push(numeroIstanza);
    const displaySetKey = `DisplaySet${i}`;
    //Serie
    nolexHP.displaySetSelectors[displaySetKey].seriesMatchingRules = [
      {
        attribute: 'SeriesDescription',
        constraint: {
          contains: descrizioneSerie,
        },
      },
    ];

    nolexHP.stages[0].viewports[i].viewportOptions.viewportId = `nolexhp-${i}`;

    nolexHP.stages[0].viewports[i].viewportOptions.initialImageOptions = {
      index: numeroIstanza,
    };
    i++;
  });
  return {
    cameraHP: cameraHP,
    attualiHP: attualiHP,
    preferenzeRemote: preferenzeRemote,
  };
}

async function saveSpecificStudy() {
  const configAttiva = hpAttualmenteSalvati();
  if (configAttiva.includes('studioSpecifico')) {
    if (!confirm('Sicuro di voler sovrascrivere la configurazione attuale?') == true) {
      return;
    }
  }

  const { cameraHP = {}, attualiHP = {}, preferenzeRemote = {} } = (await componiHP()) || {};

  attualiHP.studioSpecifico[studyInstanceUIDs] = {
    performanceHP: nolexHP,
    layoutGriglia: window.layout,
    layoutPersonalizzato: null,
    allineamento: null,
    scalaOverlay: null,
    WL: null,
    camera: cameraHP,
    serieSpecifiche: null,
    istanzeSpecifiche: istanzeSpecifiche,
  };
  preferenzeRemote.json.hp = attualiHP;

  const resScrittura = await scritturaPreferenzeAPI(aetitle, username, preferenzeRemote.json);
  if (!resScrittura) {
    return console.warn('Non è stato possibile salvare le preferenze utente per gli HP');
  }
  //A questo punto li setto in localStorage
  localStorage.setItem(`preferenzeUtente-${aetitle}`, JSON.stringify(preferenzeRemote.json));
  document.getElementById('menu-hp').remove();
  uiNotificationService.show({
    title: 'Hanging protocol',
    message: `Hanging protocol salvati`,
    type: 'success',
  });
}

async function saveConfigExam() {
  const configAttiva = hpAttualmenteSalvati();
  if (configAttiva.includes('descrizioneEsame')) {
    if (!confirm('Sicuro di voler sovrascrivere la configurazione attuale?') == true) {
      return;
    }
  }
  const { cameraHP = {}, attualiHP = {}, preferenzeRemote = {} } = (await componiHP()) || {};

  const index = attualiHP.nomeEsame.findIndex(element => element.nomeEsame === studyDescription);
  if (index !== -1) {
    // Sovrascrivi l'oggetto esistente
    attualiHP.nomeEsame[index] = {
      nomeEsame: studyDescription,
      performanceHP: nolexHP,
      layoutGriglia: window.layout,
      layoutPersonalizzato: null,
      allineamento: null,
      scalaOverlay: null,
      WL: null,
      camera: cameraHP,
      serieSpecifiche: null,
      istanzeSpecifiche: istanzeSpecifiche,
    };
  } else {
    // Aggiungi il nuovo oggetto all'array
    attualiHP.nomeEsame.push({
      nomeEsame: studyDescription,
      performanceHP: nolexHP,
      layoutGriglia: window.layout,
      layoutPersonalizzato: null,
      allineamento: null,
      scalaOverlay: null,
      WL: null,
      camera: cameraHP,
      serieSpecifiche: null,
      istanzeSpecifiche: istanzeSpecifiche,
    });
  }

  preferenzeRemote.json.hp = attualiHP;

  const resScrittura = await scritturaPreferenzeAPI(aetitle, username, preferenzeRemote.json);
  if (!resScrittura) {
    return console.warn('Non è stato possibile salvare le preferenze utente per gli HP');
  }
  //A questo punto li setto in localStorage
  localStorage.setItem(`preferenzeUtente-${aetitle}`, JSON.stringify(preferenzeRemote.json));
  document.getElementById('menu-hp').remove();
  uiNotificationService.show({
    title: 'Hanging protocol',
    message: `Hanging protocol salvati`,
    type: 'success',
  });
}

async function saveConfigModality() {
  const configAttiva = hpAttualmenteSalvati();
  if (configAttiva.includes('modality')) {
    if (!confirm('Sicuro di voler sovrascrivere la configurazione attuale?') == true) {
      return;
    }
  }
  const { cameraHP = {}, attualiHP = {}, preferenzeRemote = {} } = (await componiHP()) || {};

  const index = attualiHP.modality.findIndex(element => element.nomeModality === modality);
  if (index !== -1) {
    // Sovrascrivi l'oggetto esistente
    attualiHP.modality[index] = {
      nomeModality: modality,
      performanceHP: nolexHP,
      layoutGriglia: window.layout,
      layoutPersonalizzato: null,
      allineamento: null,
      scalaOverlay: null,
      WL: null,
      camera: cameraHP,
      serieSpecifiche: null,
      istanzeSpecifiche: istanzeSpecifiche,
    };
  } else {
    // Aggiungi il nuovo oggetto all'array
    attualiHP.modality.push({
      nomeModality: modality,
      performanceHP: nolexHP,
      layoutGriglia: window.layout,
      layoutPersonalizzato: null,
      allineamento: null,
      scalaOverlay: null,
      WL: null,
      camera: cameraHP,
      serieSpecifiche: null,
      istanzeSpecifiche: istanzeSpecifiche,
    });
  }

  preferenzeRemote.json.hp = attualiHP;

  const resScrittura = await scritturaPreferenzeAPI(aetitle, username, preferenzeRemote.json);
  if (!resScrittura) {
    return console.warn('Non è stato possibile salvare le preferenze utente per gli HP');
  }
  //A questo punto li setto in localStorage
  localStorage.setItem(`preferenzeUtente-${aetitle}`, JSON.stringify(preferenzeRemote.json));
  document.getElementById('menu-hp').remove();
  uiNotificationService.show({
    title: 'Hanging protocol',
    message: `Hanging protocol salvati`,
    type: 'success',
  });
}

async function deleteConfigSpecificStudy() {
  if (!confirm('Sicuro di voler eliminare la configurazione attuale?') == true) {
    return;
  }
  //Ottengo gli HP aggiornati in tempo reale
  const preferenzeRemote = await letturaPreferenzeAPI(aetitle, studyInstanceUIDs);
  if (!preferenzeRemote || !preferenzeRemote.json) {
    return console.warn('Non è stato possibile recuperare le preferenze utente per gli HP');
  }
  const attualiHP = preferenzeRemote.json.hp;
  delete attualiHP.studioSpecifico[studyInstanceUIDs];
  preferenzeRemote.json.hp = attualiHP;

  const resScrittura = await scritturaPreferenzeAPI(aetitle, username, preferenzeRemote.json);
  if (!resScrittura) {
    return console.warn('Non è stato possibile salvare le preferenze utente per gli HP');
  }
  //A questo punto li setto in localStorage
  localStorage.setItem(`preferenzeUtente-${aetitle}`, JSON.stringify(preferenzeRemote.json));
  uiNotificationService.show({
    title: 'Hanging protocol',
    message: `Configurazione eliminata`,
    type: 'error',
  });
  document.getElementById('menu-hp').remove();
}

async function deleteConfigExam() {
  if (!confirm('Sicuro di voler eliminare la configurazione attuale?') == true) {
    return;
  }
  //Ottengo gli HP aggiornati in tempo reale
  const preferenzeRemote = await letturaPreferenzeAPI(aetitle, studyInstanceUIDs);
  if (!preferenzeRemote || !preferenzeRemote.json) {
    return console.warn('Non è stato possibile recuperare le preferenze utente per gli HP');
  }
  const attualiHP = preferenzeRemote.json.hp;

  attualiHP.nomeEsame = attualiHP.nomeEsame.filter(item => item.nomeEsame !== studyDescription);

  preferenzeRemote.json.hp = attualiHP;

  const resScrittura = await scritturaPreferenzeAPI(aetitle, username, preferenzeRemote.json);
  if (!resScrittura) {
    return console.warn('Non è stato possibile salvare le preferenze utente per gli HP');
  }
  //A questo punto li setto in localStorage
  localStorage.setItem(`preferenzeUtente-${aetitle}`, JSON.stringify(preferenzeRemote.json));
  uiNotificationService.show({
    title: 'Hanging protocol',
    message: `Configurazione eliminata`,
    type: 'error',
  });
  document.getElementById('menu-hp').remove();
}

async function deleteConfigModality() {
  if (!confirm('Sicuro di voler eliminare la configurazione attuale?') == true) {
    return;
  }
  //Ottengo gli HP aggiornati in tempo reale
  const preferenzeRemote = await letturaPreferenzeAPI(aetitle, studyInstanceUIDs);
  if (!preferenzeRemote || !preferenzeRemote.json) {
    return console.warn('Non è stato possibile recuperare le preferenze utente per gli HP');
  }
  const attualiHP = preferenzeRemote.json.hp;
  attualiHP.modality = attualiHP.modality.filter(item => item.nomeModality !== modality);

  preferenzeRemote.json.hp = attualiHP;

  const resScrittura = await scritturaPreferenzeAPI(aetitle, username, preferenzeRemote.json);
  if (!resScrittura) {
    return console.warn('Non è stato possibile salvare le preferenze utente per gli HP');
  }
  //A questo punto li setto in localStorage
  localStorage.setItem(`preferenzeUtente-${aetitle}`, JSON.stringify(preferenzeRemote.json));
  uiNotificationService.show({
    title: 'Hanging protocol',
    message: `Configurazione eliminata`,
    type: 'error',
  });
  document.getElementById('menu-hp').remove();
}

async function scritturaPreferenzeAPI(aetitle, username, body) {
  const apiUrl = `https://suite.nolex.it/viewer/userdata/${aetitle}/?user=${username}`;
  const datiDaInviare = {
    username: username,
    json: body,
  };

  try {
    const apiResponse = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
      },
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      body: JSON.stringify(datiDaInviare),
    });

    if (!apiResponse.ok) {
      console.error('Errore durante il recupero delle preferenze utente da remoto');
      return;
    }
    return apiResponse.text();
  } catch (err) {
    return console.error('Errore durante il recupero delle preferenze utente da remoto');
  }
}

export default salvataggioHP;
