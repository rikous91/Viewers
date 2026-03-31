/* eslint-disable default-case */

const STORICO_IFRAME_READY_TIMEOUT_MS = 25000;
let storicoReadyTimeoutId = null;
let storicoPendingPreloader = null;

function normalizeValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const normalized = String(value).trim();
  return normalized;
}

function getDataAttributeValue(element, keys) {
  if (!element || !element.dataset) {
    return '';
  }
  for (const key of keys) {
    const value = normalizeValue(element.dataset[key]);
    if (value) {
      return value;
    }
  }
  return '';
}

function getParamCaseInsensitive(params, ...keys) {
  if (!params || !keys.length) {
    return '';
  }
  const entries = Array.from(params.entries());
  for (const key of keys) {
    const hit = entries.find(([name]) => name.toLowerCase() === key.toLowerCase());
    const value = normalizeValue(hit?.[1]);
    if (value) {
      return value;
    }
  }
  return '';
}

function parseStoricoLink(linkValue) {
  const raw = normalizeValue(linkValue);
  if (!raw) {
    return {};
  }
  try {
    const parsedUrl = new URL(raw, window.location.origin);
    const params = parsedUrl.searchParams;
    return {
      studyInstanceUID: getParamCaseInsensitive(params, 'StudyInstanceUIDs', 'StudyInstanceUID'),
      aetitle: getParamCaseInsensitive(params, 'aetitle', 'partizione'),
      token: getParamCaseInsensitive(params, 'Token', 'token'),
      user: getParamCaseInsensitive(params, 'User', 'user'),
    };
  } catch (_) {
    return {};
  }
}

function resolveStoricoContext(e, studyInstanceUID, options = {}) {
  const normalizedOptions =
    typeof options === 'string' ? { aetitle: options } : options || {};
  const target = e?.currentTarget;
  const carrier =
    target?.closest?.(
      '[data-study-instance-uid],[data-study-instance-uids],[data-studyuid],[data-study],[data-aetitle],[data-partizione],[data-url]'
    ) || null;

  const parsedLink = parseStoricoLink(
    normalizedOptions.url ||
    getDataAttributeValue(target, ['url', 'viewerUrl', 'link']) ||
    getDataAttributeValue(carrier, ['url', 'viewerUrl', 'link']) ||
    target?.getAttribute?.('href')
  );

  let resolvedStudyUID =
    normalizeValue(studyInstanceUID) ||
    normalizeValue(normalizedOptions.studyInstanceUID) ||
    getDataAttributeValue(target, ['studyInstanceUid', 'studyInstanceUIDs', 'studyuid', 'study']) ||
    getDataAttributeValue(carrier, ['studyInstanceUid', 'studyInstanceUIDs', 'studyuid', 'study']) ||
    normalizeValue(parsedLink.studyInstanceUID);

  let resolvedAetitle =
    normalizeValue(normalizedOptions.aetitle) ||
    getDataAttributeValue(target, ['aetitle', 'partizione']) ||
    getDataAttributeValue(carrier, ['aetitle', 'partizione']) ||
    normalizeValue(parsedLink.aetitle);

  if (resolvedStudyUID.includes('|')) {
    const [studyUIDOnly, aetitleFromUID] = resolvedStudyUID.split('|');
    resolvedStudyUID = normalizeValue(studyUIDOnly);
    if (!resolvedAetitle) {
      resolvedAetitle = normalizeValue(aetitleFromUID);
    }
  }

  const resolvedToken =
    normalizeValue(normalizedOptions.token) ||
    getDataAttributeValue(target, ['token']) ||
    getDataAttributeValue(carrier, ['token']) ||
    normalizeValue(parsedLink.token);

  const resolvedUser =
    normalizeValue(normalizedOptions.user) ||
    getDataAttributeValue(target, ['user', 'username']) ||
    getDataAttributeValue(carrier, ['user', 'username']) ||
    normalizeValue(parsedLink.user);

  return {
    studyInstanceUID: resolvedStudyUID,
    aetitle: resolvedAetitle,
    token: resolvedToken,
    user: resolvedUser,
  };
}

function clearStoricoLoadingState({ removePreloader = false } = {}) {
  if (storicoReadyTimeoutId) {
    clearTimeout(storicoReadyTimeoutId);
    storicoReadyTimeoutId = null;
  }
  if (removePreloader && storicoPendingPreloader?.isConnected) {
    storicoPendingPreloader.remove();
  }
  storicoPendingPreloader = null;
}

function showStoricoLoadingError(
  message = 'Impossibile caricare lo studio storico. Verifica token, aetitle e disponibilita dati.'
) {
  if (!storicoPendingPreloader || !storicoPendingPreloader.isConnected) {
    clearStoricoLoadingState();
    return;
  }

  if (storicoReadyTimeoutId) {
    clearTimeout(storicoReadyTimeoutId);
    storicoReadyTimeoutId = null;
  }

  const preloader = storicoPendingPreloader;
  preloader.innerHTML = '';
  preloader.style.display = 'flex';
  preloader.style.alignItems = 'center';
  preloader.style.justifyContent = 'center';

  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.alignItems = 'center';
  wrapper.style.justifyContent = 'center';
  wrapper.style.gap = '12px';
  wrapper.style.padding = '24px';
  wrapper.style.maxWidth = '90%';
  wrapper.style.textAlign = 'center';
  wrapper.style.color = '#fff';

  const title = document.createElement('div');
  title.textContent = 'Errore caricamento storico';
  title.style.fontSize = '16px';
  title.style.fontWeight = '600';

  const text = document.createElement('div');
  text.textContent = message;
  text.style.fontSize = '13px';
  text.style.lineHeight = '1.4';
  text.style.opacity = '0.9';

  const closeButton = document.createElement('button');
  closeButton.textContent = 'Chiudi';
  closeButton.style.background = '#8a1818';
  closeButton.style.border = '1px solid #d0d0d0';
  closeButton.style.color = '#fff';
  closeButton.style.padding = '6px 12px';
  closeButton.style.borderRadius = '4px';
  closeButton.style.cursor = 'pointer';
  closeButton.addEventListener('click', () => {
    window.postMessage('chiudi-iframe-storico', '*');
  });

  wrapper.appendChild(title);
  wrapper.appendChild(text);
  wrapper.appendChild(closeButton);
  preloader.appendChild(wrapper);
}

function markStoricoIframeReady() {
  if (storicoPendingPreloader?.isConnected) {
    storicoPendingPreloader.remove();
  }
  clearStoricoLoadingState();
}

function startStoricoLoadingWatch(preloader) {
  clearStoricoLoadingState();
  storicoPendingPreloader = preloader;

  storicoReadyTimeoutId = setTimeout(() => {
    showStoricoLoadingError();
  }, STORICO_IFRAME_READY_TIMEOUT_MS);
}

const openStorico = (e, modalita, studyInstanceUID, options = {}) => {
  e.stopPropagation();
  if (typeof e.preventDefault === 'function') {
    e.preventDefault();
  }

  const context = resolveStoricoContext(e, studyInstanceUID, options);
  if (!context.studyInstanceUID) {
    console.warn('Impossibile aprire storico: StudyInstanceUID mancante.');
    return;
  }

  const currentUrl = window.location.href;
  const url = new URL(currentUrl);
  const params = new URLSearchParams(url.search);

  params.set('StudyInstanceUIDs', context.studyInstanceUID);
  params.delete('storico');
  params.set('storicoOpenTs', `${Date.now()}`);

  if (context.aetitle) {
    params.set('aetitle', context.aetitle);
  }
  if (context.token) {
    params.set('Token', context.token);
    params.delete('token');
  }
  if (context.user) {
    params.set('User', context.user);
  }

  const newUrl = `${url.origin}${url.pathname}?${params.toString()}`;

  if (modalita === 'stessaScheda') {
    const iframeStorico = document.getElementById('iframe-storico');
    const isAlreadyActive = e.currentTarget?.classList?.contains('active');
    if (iframeStorico && isAlreadyActive) {
      window.postMessage('chiudi-iframe-storico', '*');
      return;
    }

    //Coloro l'icona cliccata di quello studio specifico
    for (const a of document.querySelectorAll('#storico-same-window')) {
      a.classList.remove('active');
    }
    e.currentTarget.classList.add('active');
    split2Studies(newUrl, context.studyInstanceUID);
  } else if (modalita === 'nuovaScheda') {
    window.open(newUrl, '_blank');
  }
};

const createPreloader = (message = 'Caricamento storico in corso...') => {
  const preloader = document.createElement('div');
  preloader.className = 'preloader';
  preloader.setAttribute('data-storico-preloader', 'true');

  const text = document.createElement('div');
  text.textContent = message;
  text.style.position = 'absolute';
  text.style.bottom = '20px';
  text.style.left = '50%';
  text.style.transform = 'translateX(-50%)';
  text.style.fontSize = '12px';
  text.style.color = '#d8d8d8';
  text.style.zIndex = '2';
  preloader.appendChild(text);

  return preloader;
};

const salvaSerieDaRicliccare = () => {
  const { viewportGridService } = window.servicesManager.services;
  const { activeViewportId, viewports } = viewportGridService.getState();
  const activeViewport = viewports.get(activeViewportId);
  const activeDisplaySetInstanceUID = activeViewport.displaySetInstanceUIDs[0];
  window.instanceUIDMPRDaCliccare = activeDisplaySetInstanceUID;
};

const fixlayoutViewportsMPR = () => {
  //Disattivo e riattivo mpr salvando la serie attualmente attiva
  salvaSerieDaRicliccare();
  document.querySelector('[data-cy="LayoutMPR"]').click(); //Disattivo MPR
  document.body.classList.add('loading-spinner-into-grid'); //Non mostro il cambio vista griglia ma metto uno spinner

  setTimeout(() => {
    document.querySelector('[data-cy="LayoutMPR"]').click(); //Riattivo MPR
  }, 0);
  setTimeout(() => {
    document.body.classList.remove('loading-spinner-into-grid');

    // window.instanceUIDMPRDaCliccare = null;

    //A fine fix ritorno sempre e comunque nella tab dello storico da cui sono partito
    document.querySelector('.storicosulcloud').click();
  }, 500);
};

function split2Studies(urlToOpen) {
  clearStoricoLoadingState({ removePreloader: true });
  if (document.getElementById('iframe-storico')) {
    document.getElementById('iframe-storico').remove(); //Sovrascrivo sempre
  }
  //Se è attivo l'mpr lo disabilito e lo riabilito quando lo schermo è già diviso in quanto il ridimensionamento
  //della finestra lo farebbe sfasare random, abilitandolo invece a schermo già diviso non da problemi
  if (document.body.classList.contains('hp-mpr-active')) {
    fixlayoutViewportsMPR();
  }
  document.body.classList.add('storico-injected-iframe');
  document.body.classList.remove('secondo-mpr-attivo');
  const mainArea = document.querySelector('.nolex-main-area');
  mainArea.style.width = '50%';
  mainArea.style.float = 'left'; // Imposta il float per affiancarlo

  // Crea un nuovo iframe
  const iframe = document.createElement('iframe');
  const iframeUrl = new URL(urlToOpen, window.location.origin);
  iframeUrl.searchParams.set('storico', 'same-tab');
  iframe.src = iframeUrl.toString();
  iframe.id = 'iframe-storico';
  iframe.dataset.loaded = 'false';

  // Applica lo stile all'iframe
  iframe.style.width = '50%'; // Imposta l'iframe al 50% della larghezza
  iframe.style.height = '100vh'; // Altezza a tutta la vista
  iframe.style.border = 'none'; // Rimuove il bordo
  iframe.style.float = 'left'; // Imposta anche qui il float
  iframe.style.position = 'relative'; // Imposta anche qui il float
  iframe.style.zIndex = '19'; // Imposta anche qui il float

  //Creo un preloader
  const preloader = createPreloader();

  mainArea.parentNode.insertBefore(preloader, mainArea.nextSibling);
  // return;

  // Inserisci l'iframe dopo il main area
  preloader.parentNode.insertBefore(iframe, preloader.nextSibling);
  startStoricoLoadingWatch(preloader);
  // mainArea.parentNode.insertBefore(iframe, mainArea.nextSibling);
  // Aggiungi un listener per aspettare il caricamento dell'iframe
  iframe.onload = function () {
    try {
      const iframeDocument = iframe.contentWindow.document;
      if (window.location.href.includes('storico=same-tab')) {
        iframeDocument.body.classList.add('storico-same-tab');
      }
    } catch (err) {
      console.warn('Impossibile applicare classe storico-same-tab su iframe:', err);
    }
  };
  //A questo punto avvio un listener per ascoltare eventuali messaggi dall'iframe listener
  ascoltoMessaggiIframeFiglio();
}

//Se sono già uno storico mi differenzio
if (window.location.href.includes('storico=same-tab')) {
  document.body.classList.add('storico-same-tab');
  //Aggiungo il pulsante chiudi per rimuovere eventualmente l'iframe
  document.body.insertAdjacentHTML(
    'beforebegin',
    `
    <button class="chiudi-iframe">x</button>
    `
  );
  const chiudiIframeBtn = document.querySelector('.chiudi-iframe');
  chiudiIframeBtn.addEventListener('click', () => {
    window.parent.postMessage('chiudi-iframe-storico', '*');
  });

  window.sonoUnoStorico = true;

  //Attivo listener per ricevere messaggi dal padre
  window.addEventListener(
    'message',
    function (event) {
      if (event.origin !== window.location.origin) {
        return;
      }
      const messaggioRicevuto = event.data;
      activateCommandOnIframe(messaggioRicevuto);
    },
    false
  );
}

function activateCommandOnIframe(command) {
  if (!command || command === '') {
    return;
  }
  console.log(command);
  try {
    switch (command) {
      case 'WindowLevel':
        document.querySelector('[data-cy="WindowLevel"] button').click();
        break;
      case 'Pan':
        document.querySelector('[data-cy="Pan"] button').click();
        break;
      case 'Zoom':
        document.querySelector('[data-cy="Zoom"] button').click();
        break;
      case 'rotateViewport-90':
        document.querySelector('[data-cy="rotate-right"] button').click();
        break;
      case 'rotateViewport--90':
        document.querySelector('[data-cy="rotate-left"] button').click();
        break;
      case 'flipViewportHorizontal':
        document.querySelector('[data-cy="flipHorizontal"] button').click();
        break;
      case 'flipViewportVertical':
        document.querySelector('[data-cy="flipVertical"] button').click();
        break;
      case 'Magnify':
        document.querySelector('[data-cy="Magnify"] button').click();
        break;
      case 'Length':
        document.querySelectorAll('[data-cy="Length"] button')[1].click()
        break;
      case 'Bidirectional':
        document.querySelector('[data-cy="Bidirectional"] button').click()
        break;
      case 'ArrowAnnotate':
        document.querySelector('[data-cy="ArrowAnnotate"] button').click()
        break;
      case 'Angle':
        document.querySelector('[data-cy="Angle"] button').click()
        break;
      case 'CobbAngle':
        document.querySelector('[data-cy="CobbAngle"] button').click()
        break;
      case 'UltrasoundDirectionalTool':
        document.querySelector('[data-cy="UltrasoundDirectionalTool"] button').click()
        break;
      case 'EllipticalROI':
        document.querySelector('[data-cy="EllipticalROI"] button').click()
        break;
      case 'RectangleROI':
        document.querySelector('[data-cy="RectangleROI"] button').click()
        break;
      case 'CircleROI':
        document.querySelector('[data-cy="CircleROI"] button').click()
        break;
      case 'PlanarFreehandROI':
        document.querySelector('[data-cy="PlanarFreehandROI"] button').click()
        break;
      case 'SplineROI':
        document.querySelector('[data-cy="SplineROI"] button').click()
        break;
      case 'LivewireContour':
        document.querySelector('[data-cy="LivewireContour"] button').click()
        break;
      case 'StackScroll':
        document.querySelector('[data-cy="StackScroll"] button').click()
        break;
      case 'mprDirectClick':
        document.querySelector('[data-cy="LayoutMPR"]').click();
        break;
      case 'invertViewport':
        document.querySelector('[data-cy="invert"] button').click();
        break;
      case 'Probe':
        document.querySelector('[data-cy="Probe"] button').click();
        break;
      case 'cine':
        document.querySelector('[data-cy="Cine"] button').click();
        break;
      case 'ReferenceLines':
        document.querySelector('[data-cy="ReferenceLines"] button').click();
        break;
      case 'hideInfoDicom':
        document.querySelector('[data-cy="hideInfoDicom"]').click();
        break;
      case 'attiva-mpr':
        document.querySelector('[data-cy="LayoutMPR"]').click();
        break;
      case 'Crosshairs':
        document.querySelector('[data-cy="Crosshairs"] button').click();
        break;
      case 'TrackballRotate':
        document.querySelector('[data-cy="TrackballRotate"]').click();
        break;
      case 'resetViewport':
        document.querySelector('[data-cy="MoreTools-split-button-secondary"]').click();
        setTimeout(() => {
          document.querySelector('[data-cy="Reset"]').click();
        }, 0);
        break;
      case 'ImageOverlayViewer':
        document.querySelector('[data-cy="MoreTools-split-button-secondary"]').click();
        setTimeout(() => {
          document.querySelector('[data-cy="ImageOverlayViewer"]').click();
        }, 0);
        break;
      case 'WindowLevelRegion':
        document.querySelector('[data-cy="MoreTools-split-button-secondary"]').click();
        setTimeout(() => {
          document.querySelector('[data-cy="WindowLevelRegion"]').click();
        }, 0);
        break;
      case 'CalibrationLine':
        document.querySelector('[data-cy="MoreTools-split-button-secondary"]').click();
        setTimeout(() => {
          document.querySelector('[data-cy="CalibrationLine"]').click();
        }, 0);
        break;
      case 'AdvancedMagnify':
        document.querySelector('[data-cy="MoreTools-split-button-secondary"]').click();
        setTimeout(() => {
          document.querySelector('[data-cy="AdvancedMagnify"]').click();
        }, 0);
        break;

      //LAYOUT SELECTOR
      case 'layout-common-1x1':
        document.querySelector('[data-cy="Layout"] button').click();
        setTimeout(() => {
          document.querySelectorAll('.standard-layout .cursor-pointer')[0].click();
          setTimeout(() => {
            document.querySelector('.nolex-selected').click();
          }, 0);
        }, 0);
        break;
      case 'layout-common-1x2':
        document.querySelector('[data-cy="Layout"] button').click();
        setTimeout(() => {
          document.querySelectorAll('.standard-layout .cursor-pointer')[1].click();
          setTimeout(() => {
            document.querySelector('.nolex-selected').click();
          }, 0);
        }, 0);
        break;
      case 'layout-common-2x2':
        document.querySelector('[data-cy="Layout"] button').click();
        setTimeout(() => {
          document.querySelectorAll('.standard-layout .cursor-pointer')[2].click();
          setTimeout(() => {
            document.querySelector('.nolex-selected').click();
          }, 0);
        }, 0);
        break;
      case 'layout-common-2x3':
        document.querySelector('[data-cy="Layout"] button').click();
        setTimeout(() => {
          document.querySelectorAll('.standard-layout .cursor-pointer')[3].click();
          setTimeout(() => {
            document.querySelector('.nolex-selected').click();
          }, 0);
        }, 0);
        break;

      //LAYOUT CUSTOM SELECTOR
      case 'custom1x1':
        document.querySelector('[data-cy="Layout"] button').click();
        setTimeout(() => {
          document.querySelectorAll('.custom-layout .cursor-pointer')[0].click();
          setTimeout(() => {
            document.querySelector('.nolex-selected').click();
          }, 0);
        }, 0);
        break;
      case 'custom1x2':
        document.querySelector('[data-cy="Layout"] button').click();
        setTimeout(() => {
          document.querySelectorAll('.custom-layout .cursor-pointer')[1].click();
          setTimeout(() => {
            document.querySelector('.nolex-selected').click();
          }, 0);
        }, 0);
        break;
      case 'custom1x3':
        document.querySelector('[data-cy="Layout"] button').click();
        setTimeout(() => {
          document.querySelectorAll('.custom-layout .cursor-pointer')[2].click();
          setTimeout(() => {
            document.querySelector('.nolex-selected').click();
          }, 0);
        }, 0);
        break;
      case 'custom1x4':
        document.querySelector('[data-cy="Layout"] button').click();
        setTimeout(() => {
          document.querySelectorAll('.custom-layout .cursor-pointer')[3].click();
          setTimeout(() => {
            document.querySelector('.nolex-selected').click();
          }, 0);
        }, 0);
        break;

      case 'custom2x1':
        document.querySelector('[data-cy="Layout"] button').click();
        setTimeout(() => {
          document.querySelectorAll('.custom-layout .cursor-pointer')[4].click();
          setTimeout(() => {
            document.querySelector('.nolex-selected').click();
          }, 0);
        }, 0);
        break;
      case 'custom2x2':
        document.querySelector('[data-cy="Layout"] button').click();
        setTimeout(() => {
          document.querySelectorAll('.custom-layout .cursor-pointer')[5].click();
          setTimeout(() => {
            document.querySelector('.nolex-selected').click();
          }, 0);
        }, 0);
        break;
      case 'custom2x3':
        document.querySelector('[data-cy="Layout"] button').click();
        setTimeout(() => {
          document.querySelectorAll('.custom-layout .cursor-pointer')[6].click();
          setTimeout(() => {
            document.querySelector('.nolex-selected').click();
          }, 0);
        }, 0);
        break;
      case 'custom2x4':
        document.querySelector('[data-cy="Layout"] button').click();
        setTimeout(() => {
          document.querySelectorAll('.custom-layout .cursor-pointer')[7].click();
          setTimeout(() => {
            document.querySelector('.nolex-selected').click();
          }, 0);
        }, 0);
        break;

      case 'custom3x1':
        document.querySelector('[data-cy="Layout"] button').click();
        setTimeout(() => {
          document.querySelectorAll('.custom-layout .cursor-pointer')[8].click();
          setTimeout(() => {
            document.querySelector('.nolex-selected').click();
          }, 0);
        }, 0);
        break;
      case 'custom3x2':
        document.querySelector('[data-cy="Layout"] button').click();
        setTimeout(() => {
          document.querySelectorAll('.custom-layout .cursor-pointer')[9].click();
          setTimeout(() => {
            document.querySelector('.nolex-selected').click();
          }, 0);
        }, 0);
        break;
      case 'custom3x3':
        document.querySelector('[data-cy="Layout"] button').click();
        setTimeout(() => {
          document.querySelectorAll('.custom-layout .cursor-pointer')[10].click();
          setTimeout(() => {
            document.querySelector('.nolex-selected').click();
          }, 0);
        }, 0);
        break;
      case 'custom3x4':
        document.querySelector('[data-cy="Layout"] button').click();
        setTimeout(() => {
          document.querySelectorAll('.custom-layout .cursor-pointer')[11].click();
          setTimeout(() => {
            document.querySelector('.nolex-selected').click();
          }, 0);
        }, 0);
        break;

      //LAYOUT ADVANCED MPR SELECTOR
      case 'mpr':
        document.querySelector('[data-cy="Layout"] button').click();
        setTimeout(() => {
          document.querySelector('[data-cy="MPR"]').click();
          setTimeout(() => {
            document.querySelector('.nolex-selected').click();
          }, 0);
        }, 0);
        break;
      case 'fourUp':
        document.querySelector('[data-cy="Layout"] button').click();
        setTimeout(() => {
          document.querySelector('[data-cy="Volume 3D a destra"]').click();
          setTimeout(() => {
            document.querySelector('.nolex-selected').click();
          }, 0);
        }, 0);
        break;
      case 'main3D':
        document.querySelector('[data-cy="Layout"] button').click();
        setTimeout(() => {
          document.querySelector('[data-cy="Volume 3D principale in alto"]').click();
          setTimeout(() => {
            document.querySelector('.nolex-selected').click();
          }, 0);
        }, 0);
        break;
      case 'primaryAxial':
        document.querySelector('[data-cy="Layout"] button').click();
        setTimeout(() => {
          document.querySelector('[data-cy="Piano Assiale primario"]').click();
          setTimeout(() => {
            document.querySelector('.nolex-selected').click();
          }, 0);
        }, 0);
        break;
      case 'only3D':
        document.querySelector('[data-cy="Layout"] button').click();
        setTimeout(() => {
          document.querySelector('[data-cy="Solo Volume 3D"]').click();
          setTimeout(() => {
            document.querySelector('.nolex-selected').click();
          }, 0);
        }, 0);
        break;
      case 'primary3D':
        document.querySelector('[data-cy="Layout"] button').click();
        setTimeout(() => {
          document.querySelector('[data-cy="Volume 3D principale a sx"]').click();
          setTimeout(() => {
            document.querySelector('.nolex-selected').click();
          }, 0);
        }, 0);
        break;
    }
  } catch (err) {
    console.error('Errore passaggio comando ad iframe: ', err)
  }
}

//MAIN - Ricevo messaggi dall'iframe
function listenerEvent(event) {
  if (event.origin !== window.location.origin) {
    console.warn('Messaggio ricevuto da un origine non sicura:', event.origin);
    return;
  }

  if (event.data?.type === 'nolex-iframe-ready') {
    const iframeStorico = document.getElementById('iframe-storico');
    if (iframeStorico && event.source === iframeStorico.contentWindow) {
      iframeStorico.dataset.loaded = 'true';
      markStoricoIframeReady();
    }
    return;
  }

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  const fix3DOnClosedIframe = async () => {
    document.body.classList.add('loading-spinner-into-grid');
    document.querySelector('[data-cy="LayoutMPR"]').click();
    await wait(0); // Attendi per evitare l'annidamento dei timeout

    document.querySelector('[data-cy="LayoutMPR"]').click();
    setTimeout(() => {
      document.body.classList.remove('loading-spinner-into-grid');
    }, 0);
  };

  const closeStoricoIframe = () => {
    clearStoricoLoadingState({ removePreloader: true });

    const studioPrincipale = document.querySelector('.nolex-main-area');
    if (studioPrincipale) {
      studioPrincipale.style.maxWidth = 'none';
    }
    document.body.classList.remove('storico-injected-iframe');
    document.body.classList.remove('secondo-mpr-attivo');
    document.getElementById('iframe-storico')?.remove();
    const mainArea = document.querySelector('.nolex-main-area');
    if (mainArea) {
      mainArea.style.width = '100%';
    }

    for (const a of document.querySelectorAll('#storico-same-window')) {
      a.classList.remove('active');
    }
    //Fix mpr 3D - quando si passa dallo schermo diviso al pieno schermo e ho un 3d Attivo, questo viene tagliato. Metto il preset mpr e poi
    //riattivo il preset 3d precedente
    const listaPreset3D = ['fourUp', 'main3D', 'only3D', 'primary3D'];

    listaPreset3D.forEach(preset3D => {
      if (document.body.classList.contains(preset3D)) {
        salvaSerieDaRicliccare();
        fix3DOnClosedIframe();
      }
    });
  };

  const messaggioRicevuto = event.data;
  console.log(messaggioRicevuto);
  switch (messaggioRicevuto) {
    case 'chiudi-iframe-storico':
      closeStoricoIframe();
      break;
    case 'secondo-mpr':
      document.querySelector('[data-cy="LayoutMPRStorico"]').style.pointerEvents = 'all';
      document.querySelector('[data-cy="LayoutMPRStorico"]').style.opacity = '1';
      break;
    case 'disable-secondo-mpr':
      document.querySelector('[data-cy="LayoutMPRStorico"]').style.pointerEvents = 'none';
      document.querySelector('[data-cy="LayoutMPRStorico"]').style.opacity = '0.5';
      break;
    case 'uscita-da-secondo-mpr':
      document.body.classList.remove('secondo-mpr-attivo');
      break;
  }
}

function ascoltoMessaggiIframeFiglio() {
  // Rimuove l'event listener precedente, se esiste
  window.removeEventListener('message', listenerEvent);

  // Aggiungi l'event listener
  window.addEventListener('message', listenerEvent);
}

export default openStorico;
