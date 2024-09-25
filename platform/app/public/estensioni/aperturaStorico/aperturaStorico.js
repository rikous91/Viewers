/* eslint-disable default-case */

const openStorico = (e, modalita, studyInstanceUID) => {
  e.stopPropagation();

  const currentUrl = window.location.href;
  const url = new URL(currentUrl);
  const params = new URLSearchParams(url.search);

  params.set('StudyInstanceUIDs', studyInstanceUID);

  const newUrl = `${url.origin}${url.pathname}?${params.toString()}`;

  if (modalita === 'stessaScheda') {
    //Coloro l'icona cliccata di quello studio specifico
    for (const a of document.querySelectorAll('#storico-same-window')) {
      a.classList.remove('active');
    }
    e.currentTarget.classList.add('active');
    split2Studies(newUrl);
  } else if (modalita === 'nuovaScheda') {
    window.open(newUrl, '_blank');
  }
};

const createPreloader = () => {
  const preloader = document.createElement('div');
  preloader.className = 'preloader';

  return preloader;
};

function split2Studies(urlToOpen) {
  if (document.getElementById('iframe-storico')) {
    document.getElementById('iframe-storico').remove(); //Sovrascrivo sempre
  }
  document.body.classList.add('storico-injected-iframe');
  document.body.classList.remove('secondo-mpr-attivo');
  const mainArea = document.querySelector('.nolex-main-area');
  mainArea.style.width = '50%';
  mainArea.style.float = 'left'; // Imposta il float per affiancarlo

  // Crea un nuovo iframe
  const iframe = document.createElement('iframe');
  iframe.src = urlToOpen + '&storico=same-tab';
  iframe.id = 'iframe-storico';

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
  // mainArea.parentNode.insertBefore(iframe, mainArea.nextSibling);
  // Aggiungi un listener per aspettare il caricamento dell'iframe
  iframe.onload = function () {
    setTimeout(() => {
      preloader.remove();
    }, 500);
    const iframeDocument = iframe.contentWindow.document;

    if (window.location.href.includes('storico=same-tab')) {
      iframeDocument.body.classList.add('storico-same-tab');
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
  switch (command) {
    case 'WindowLevel':
      document.querySelector('[data-cy="WindowLevel"]').click();
      break;
    case 'Pan':
      document.querySelector('[data-cy="Pan"]').click();
      break;
    case 'Zoom':
      document.querySelector('[data-tool="Zoom"]').click();
      break;
    case 'rotateViewport-90':
      document.querySelector('[data-cy="TransformTools-split-button-secondary"]').click();
      setTimeout(() => {
        document.querySelector('[data-cy="rotate-right"]').click();
      }, 0);
      break;
    case 'rotateViewport--90':
      document.querySelector('[data-cy="TransformTools-split-button-secondary"]').click();
      setTimeout(() => {
        document.querySelector('[data-cy="rotate-left"]').click();
      }, 0);
      break;
    case 'flipViewportHorizontal':
      document.querySelector('[data-cy="TransformTools-split-button-secondary"]').click();
      setTimeout(() => {
        document.querySelector('[data-cy="flipHorizontal"]').click();
      }, 0);
      break;
    case 'flipViewportVertical':
      document.querySelector('[data-cy="TransformTools-split-button-secondary"]').click();
      setTimeout(() => {
        document.querySelector('[data-cy="flipVertical"]').click();
      }, 0);
      break;
    case 'Magnify':
      document.querySelector('[data-cy="Magnify"]').click();
      break;
    case 'Length':
      document.querySelector('[data-cy="MeasurementTools-split-button-secondary"]').click();
      setTimeout(() => {
        document.querySelector('[data-cy="Length"]').click();
      }, 0);
      break;
    case 'Bidirectional':
      document.querySelector('[data-cy="MeasurementTools-split-button-secondary"]').click();
      setTimeout(() => {
        document.querySelector('[data-cy="Bidirectional"]').click();
      }, 0);
      break;
    case 'ArrowAnnotate':
      document.querySelector('[data-cy="MeasurementTools-split-button-secondary"]').click();
      setTimeout(() => {
        document.querySelector('[data-cy="ArrowAnnotate"]').click();
      }, 0);
      break;
    case 'Angle':
      document.querySelector('[data-cy="MeasurementTools-split-button-secondary"]').click();
      setTimeout(() => {
        document.querySelector('[data-cy="Angle"]').click();
      }, 0);
      break;
    case 'CobbAngle':
      document.querySelector('[data-cy="MeasurementTools-split-button-secondary"]').click();
      setTimeout(() => {
        document.querySelector('[data-cy="CobbAngle"]').click();
      }, 0);
      break;
    case 'UltrasoundDirectionalTool':
      document.querySelector('[data-cy="MeasurementTools-split-button-secondary"]').click();
      setTimeout(() => {
        document.querySelector('[data-cy="UltrasoundDirectionalTool"]').click();
      }, 0);
      break;
    case 'EllipticalROI':
      document.querySelector('[data-cy="MeasurementTools-split-button-secondary"]').click();
      setTimeout(() => {
        document.querySelector('[data-cy="EllipticalROI"]').click();
      }, 0);
      break;
    case 'RectangleROI':
      document.querySelector('[data-cy="MeasurementTools-split-button-secondary"]').click();
      setTimeout(() => {
        document.querySelector('[data-cy="RectangleROI"]').click();
      }, 0);
      break;
    case 'CircleROI':
      document.querySelector('[data-cy="MeasurementTools-split-button-secondary"]').click();
      setTimeout(() => {
        document.querySelector('[data-cy="CircleROI"]').click();
      }, 0);
      break;
    case 'PlanarFreehandROI':
      document.querySelector('[data-cy="MeasurementTools-split-button-secondary"]').click();
      setTimeout(() => {
        document.querySelector('[data-cy="PlanarFreehandROI"]').click();
      }, 0);
      break;
    case 'SplineROI':
      document.querySelector('[data-cy="MeasurementTools-split-button-secondary"]').click();
      setTimeout(() => {
        document.querySelector('[data-cy="SplineROI"]').click();
      }, 0);
      break;
    case 'LivewireContour':
      document.querySelector('[data-cy="MeasurementTools-split-button-secondary"]').click();
      setTimeout(() => {
        document.querySelector('[data-cy="LivewireContour"]').click();
      }, 0);
      break;
    case 'StackScroll':
      document.querySelector('[data-cy="StackScroll"]').click();
      break;
    case 'mprDirectClick':
      document.querySelector('[data-cy="LayoutMPR"]').click();
      break;
    case 'invertViewport':
      document.querySelector('[data-cy="invert"]').click();
      break;
    case 'Probe':
      document.querySelector('[data-cy="Probe"]').click();
      break;
    case 'cine':
      document.querySelector('[data-cy="Cine"]').click();
      break;
    case 'ReferenceLines':
      document.querySelector('[data-cy="ReferenceLines"]').click();
      break;
    case 'hideInfoDicom':
      document.querySelector('[data-cy="hideInfoDicom"]').click();
      break;
    case 'attiva-mpr':
      document.querySelector('[data-cy="LayoutMPR"]').click();
      break;
    case 'Crosshairs':
      document.querySelector('[data-cy="Crosshairs"]').click();
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
      document.querySelector('[data-cy="Layout"]').click();
      setTimeout(() => {
        document.querySelectorAll('.standard-layout .cursor-pointer')[0].click();
        setTimeout(() => {
          document.querySelector('.nolex-selected').click();
        }, 0);
      }, 0);
      break;
    case 'layout-common-1x2':
      document.querySelector('[data-cy="Layout"]').click();
      setTimeout(() => {
        document.querySelectorAll('.standard-layout .cursor-pointer')[1].click();
        setTimeout(() => {
          document.querySelector('.nolex-selected').click();
        }, 0);
      }, 0);
      break;
    case 'layout-common-2x2':
      document.querySelector('[data-cy="Layout"]').click();
      setTimeout(() => {
        document.querySelectorAll('.standard-layout .cursor-pointer')[2].click();
        setTimeout(() => {
          document.querySelector('.nolex-selected').click();
        }, 0);
      }, 0);
      break;
    case 'layout-common-2x3':
      document.querySelector('[data-cy="Layout"]').click();
      setTimeout(() => {
        document.querySelectorAll('.standard-layout .cursor-pointer')[3].click();
        setTimeout(() => {
          document.querySelector('.nolex-selected').click();
        }, 0);
      }, 0);
      break;

    //LAYOUT CUSTOM SELECTOR
    case 'custom1x1':
      document.querySelector('[data-cy="Layout"]').click();
      setTimeout(() => {
        document.querySelectorAll('.custom-layout .cursor-pointer')[0].click();
        setTimeout(() => {
          document.querySelector('.nolex-selected').click();
        }, 0);
      }, 0);
      break;
    case 'custom1x2':
      document.querySelector('[data-cy="Layout"]').click();
      setTimeout(() => {
        document.querySelectorAll('.custom-layout .cursor-pointer')[1].click();
        setTimeout(() => {
          document.querySelector('.nolex-selected').click();
        }, 0);
      }, 0);
      break;
    case 'custom1x3':
      document.querySelector('[data-cy="Layout"]').click();
      setTimeout(() => {
        document.querySelectorAll('.custom-layout .cursor-pointer')[2].click();
        setTimeout(() => {
          document.querySelector('.nolex-selected').click();
        }, 0);
      }, 0);
      break;
    case 'custom1x4':
      document.querySelector('[data-cy="Layout"]').click();
      setTimeout(() => {
        document.querySelectorAll('.custom-layout .cursor-pointer')[3].click();
        setTimeout(() => {
          document.querySelector('.nolex-selected').click();
        }, 0);
      }, 0);
      break;

    case 'custom2x1':
      document.querySelector('[data-cy="Layout"]').click();
      setTimeout(() => {
        document.querySelectorAll('.custom-layout .cursor-pointer')[4].click();
        setTimeout(() => {
          document.querySelector('.nolex-selected').click();
        }, 0);
      }, 0);
      break;
    case 'custom2x2':
      document.querySelector('[data-cy="Layout"]').click();
      setTimeout(() => {
        document.querySelectorAll('.custom-layout .cursor-pointer')[5].click();
        setTimeout(() => {
          document.querySelector('.nolex-selected').click();
        }, 0);
      }, 0);
      break;
    case 'custom2x3':
      document.querySelector('[data-cy="Layout"]').click();
      setTimeout(() => {
        document.querySelectorAll('.custom-layout .cursor-pointer')[6].click();
        setTimeout(() => {
          document.querySelector('.nolex-selected').click();
        }, 0);
      }, 0);
      break;
    case 'custom2x4':
      document.querySelector('[data-cy="Layout"]').click();
      setTimeout(() => {
        document.querySelectorAll('.custom-layout .cursor-pointer')[7].click();
        setTimeout(() => {
          document.querySelector('.nolex-selected').click();
        }, 0);
      }, 0);
      break;

    case 'custom3x1':
      document.querySelector('[data-cy="Layout"]').click();
      setTimeout(() => {
        document.querySelectorAll('.custom-layout .cursor-pointer')[8].click();
        setTimeout(() => {
          document.querySelector('.nolex-selected').click();
        }, 0);
      }, 0);
      break;
    case 'custom3x2':
      document.querySelector('[data-cy="Layout"]').click();
      setTimeout(() => {
        document.querySelectorAll('.custom-layout .cursor-pointer')[9].click();
        setTimeout(() => {
          document.querySelector('.nolex-selected').click();
        }, 0);
      }, 0);
      break;
    case 'custom3x3':
      document.querySelector('[data-cy="Layout"]').click();
      setTimeout(() => {
        document.querySelectorAll('.custom-layout .cursor-pointer')[10].click();
        setTimeout(() => {
          document.querySelector('.nolex-selected').click();
        }, 0);
      }, 0);
      break;
    case 'custom3x4':
      document.querySelector('[data-cy="Layout"]').click();
      setTimeout(() => {
        document.querySelectorAll('.custom-layout .cursor-pointer')[11].click();
        setTimeout(() => {
          document.querySelector('.nolex-selected').click();
        }, 0);
      }, 0);
      break;

    //LAYOUT ADVANCED MPR SELECTOR
    case 'MPR':
      document.querySelector('[data-cy="Layout"]').click();
      setTimeout(() => {
        document.querySelector('.MPR').click();
        setTimeout(() => {
          document.querySelector('.nolex-selected').click();
        }, 0);
      }, 0);
      break;
    case 'Volume 3D a destra':
      document.querySelector('[data-cy="Layout"]').click();
      setTimeout(() => {
        document.querySelector('.Volume-3D-a-destra').click();
        setTimeout(() => {
          document.querySelector('.nolex-selected').click();
        }, 0);
      }, 0);
      break;
    case 'Volume 3D principale in alto':
      document.querySelector('[data-cy="Layout"]').click();
      setTimeout(() => {
        document.querySelector('.Volume-3D-principale-in-alto').click();
        setTimeout(() => {
          document.querySelector('.nolex-selected').click();
        }, 0);
      }, 0);
      break;
    case 'Piano Assiale primario':
      document.querySelector('[data-cy="Layout"]').click();
      setTimeout(() => {
        document.querySelector('.Piano-Assiale-primario').click();
        setTimeout(() => {
          document.querySelector('.nolex-selected').click();
        }, 0);
      }, 0);
      break;
    case 'Solo Volume 3D':
      document.querySelector('[data-cy="Layout"]').click();
      setTimeout(() => {
        document.querySelector('.Solo-Volume-3D').click();
        setTimeout(() => {
          document.querySelector('.nolex-selected').click();
        }, 0);
      }, 0);
      break;
    case 'Volume 3D principale a sx':
      document.querySelector('[data-cy="Layout"]').click();
      setTimeout(() => {
        document.querySelector('.Volume-3D-principale-a-sx').click();
        setTimeout(() => {
          document.querySelector('.nolex-selected').click();
        }, 0);
      }, 0);
      break;
  }
}

//MAIN - Ricevo messaggi dall'iframe
function listenerEvent(event) {
  if (event.origin !== window.location.origin) {
    console.warn('Messaggio ricevuto da un origine non sicura:', event.origin);
    return;
  }

  const messaggioRicevuto = event.data;
  console.log(messaggioRicevuto);
  switch (messaggioRicevuto) {
    case 'chiudi-iframe-storico':
      document.body.classList.remove('storico-injected-iframe');
      document.body.classList.remove('secondo-mpr-attivo');
      document.getElementById('iframe-storico').remove();
      document.querySelector('.nolex-main-area').style.width = '100%';

      for (const a of document.querySelectorAll('#storico-same-window')) {
        a.classList.remove('active');
      }
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
