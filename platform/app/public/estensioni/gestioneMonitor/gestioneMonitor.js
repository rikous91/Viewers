const gestioneMonitorInitInterval = () => {
  const intervalEditorExt = setInterval(() => {
    if (document.getElementById('trackedMeasurements-btn')) {
      clearInterval(intervalEditorExt);
      injectMonitorBtn();
    }
  }, 100);

  //A prescindere blocco l'intervallo check dopo un tot per performance
  setTimeout(() => {
    clearInterval(intervalEditorExt);
  }, 10000);
};

const injectMonitorBtn = () => {
  //Attacco pulsante sotto quello delle misurazioni nel pannello a dx
  document.getElementById('trackedMeasurements-btn').parentElement.insertAdjacentHTML(
    'afterend',
    `
    <div id="monitor-btn"
    class="text-primary-active hover:cursor-pointer">
    <img style="width:22px" src="./assets/monitor.png" />
    </div>
    `
  );
  const gestioneMonitorBtn = document.getElementById('monitor-btn');
  gestioneMonitorBtn.addEventListener('click', monitorMainFunc);
};

// Ogni volta che il pannello si apre/chiude perdo l'estensione creata. Intercetto l'evento apertura/chiusura e ricreo
if (!window.portableVersion) {
  window.addEventListener('panelOpen', function (event) {
    if (!event.detail.isOpen && event.detail.side !== 'left') {
      gestioneMonitorInitInterval();
    }
  });
}

async function monitorMainFunc() {
  const monitorToolsHtml = `
    <div id="monitor-tools">
        <div id="intestazione">
        <img id="chiudi-monitor-button" style="width:22px" src="./assets/right-arrow.png" />
        <p>Gestione monitor</p>
        </div>
           <div id="main-area-monitor">
            <p id="avvisi-gestione-monitor"></p>
            <button id="checkMonitorButton">Rileva monitor</button>
            <button id="salvaConfigMonitor">Salva configurazione</button>
        </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', monitorToolsHtml);
  await window.checkMonitor();

  document.getElementById('checkMonitorButton').addEventListener('click', async () => {
    await window.checkMonitor();
  });

  //Animazione comparsa monitor-tools
  setTimeout(() => {
    document.getElementById('monitor-tools').style.left =
      `${window.sonoUnoStorico ? '60%' : '80%'}`;
    //Adatto la larghezza della griglia in base all'apertura del nuovo pannello
    if (
      document.body.classList.contains('storico-injected-iframe') ||
      document.body.classList.contains('storico-same-tab')
    ) {
      return;
    } //Non applico riadattamento se cìè uno storico sulla destra
    setTimeout(() => {
      const widthPannelloSx = parseFloat(
        window.getComputedStyle(document.querySelector('.nolex-new-panel')).width
      );
      const leftPositionMonitorPanel = parseFloat(
        window.getComputedStyle(document.getElementById('monitor-tools')).left
      );
      const valoreDefinitivo = leftPositionMonitorPanel - widthPannelloSx;
      document.querySelector('[data-cy="viewport-grid"]').style.width = `${valoreDefinitivo}px`;
    }, 350);
  }, 0);

  document.getElementById('chiudi-monitor-button').addEventListener('click', () => {
    document.querySelector('[data-cy="viewport-grid"]').style.width = '100%';
    document.getElementById('monitor-tools').style.left = '100%';
    setTimeout(() => {
      document.getElementById('monitor-tools').remove();
    }, 300);
  });
}

let permissionStatus = null;
let screenDetails = null;

window.checkMonitor = async () => {
  let schermi = null;
  permissionStatus = await navigator.permissions.query({ name: 'window-management' }).catch(e => {
    console.error(e);
    showWarning(e.message);
  });
  if ('getScreenDetails' in self) {
    if (
      !screenDetails &&
      ((permissionStatus && permissionStatus.state === 'granted') ||
        (permissionStatus && permissionStatus.state === 'prompt'))
    ) {
      screenDetails = await window.getScreenDetails().catch(e => {
        console.error(e);
        if (e.message) {
          showWarning(e.message);
        }
      });
      // if (screenDetails) {
      //   screenDetails.addEventListener('screenschange', () => {
      //     updateScreens(/*requestPermission=*/ false);
      //     setScreenListeners();
      //   });
      //   setScreenListeners();
      // }
    }
    if (screenDetails && screenDetails.screens.length > 1) {
      showWarning();
    } // Clear any warning.
    else if (screenDetails && screenDetails.screens.length == 1) {
      showWarning('Rilevato un solo monitor');
    } else if (permissionStatus && permissionStatus.state === 'denied') {
      showWarning('Devi abilitare i permessi del browser sulla gestione delle finestre');
    }

    if (screenDetails) {
      // console.log("INFO: Detected " + screenDetails.screens.length + " screens:");
      // for (let i = 0; i < screenDetails.screens.length; ++i) {
      //   const s = screenDetails.screens[i];
      //   console.log(`[${i}] "${s.label}" ` +
      //               `[${s.left},${s.top} ${s.width}x${s.height}] ` +
      //               `(${s.availLeft},${s.availTop} ${s.availWidth}x${s.availHeight}) ` +
      //               `devicePixelRatio:${s.devicePixelRatio} colorDepth:${s.colorDepth} ` +
      //               `isExtended:${s.isExtended} isPrimary:${s.isPrimary} isInternal:${s.isInternal}`);
      // }
      schermi = screenDetails.screens;
    }
  } else {
    schermi = [window.screen];
  }

  if (schermi && schermi.length > 1) {
    disegnaMonitorInterfaccia(schermi);
  }
};

function disegnaMonitorInterfaccia(schermi) {
  //Aggiorno ogni volta rimuovendo il precedente se presente
  if (document.getElementById('monitor-rilevati')) {
    document.getElementById('monitor-rilevati').remove();
  }
  if (document.getElementById('lista-monitor')) {
    document.getElementById('lista-monitor').remove();
  }
  document.getElementById('main-area-monitor').insertAdjacentHTML(
    'afterbegin',
    `
    <div id="monitor-rilevati">

              </div>
    `
  );
  const sezioneMonitorRilevati = document.getElementById('monitor-rilevati');
  document
    .getElementById('main-area-monitor')
    .insertAdjacentHTML(
      'afterbegin',
      `<p id="lista-monitor">Monitor presenti: ${schermi.length}</p>`
    );
  sezioneMonitorRilevati.style.display = 'grid';
  for (let i = 0; i < schermi.length; i++) {
    sezioneMonitorRilevati.insertAdjacentHTML(
      'beforeend',
      `
    <div class="monitor-div ${screenDetails.currentScreen.left === schermi[i].left ? 'monitor-attuale-div' : ''}">
    <label>Monitor corrente</label>
    <p style="font-weight: 800;">[${i + 1}] - ${schermi[i].label} ${schermi[i].isPrimary ? '- PRIMARIO' : ''}</p>
    <p>${screenDetails.currentScreen.left === schermi[i].left ? 'Monitor attuale' : ''}</p>
      <p>${schermi[i].left},${schermi[i].top}  ${schermi[i].width}x${schermi[i].height}</p>
      <p>devicePixelRatio: ${schermi[i].devicePixelRatio}, colorDepth: ${schermi[i].colorDepth}</p>
      <p>isExtended: ${schermi[i].isExtended}</p>
    </div>
    `
    );
  }
}

function showWarning(text) {
  //Se ho un qualsiasi errore nascondo a prescindere i pulsanti in basso rileva monitor e salva configurazione
  if (text && text.trim() !== '' && document.querySelectorAll('#main-area-monitor button')) {
    document.querySelectorAll('#main-area-monitor button').forEach(element => {
      element.style.display = 'none';
    });
  }
  const avvisiGestioneMonitor = document.getElementById('avvisi-gestione-monitor');
  if (text && text.length > 0) {
    avvisiGestioneMonitor.style.display = 'block';
    if (text === 'Permission denied.') {
      text = 'Devi abilitare i permessi del browser sulla gestione delle finestre';
    }
    if (text.includes('is not a valid value for enumeration ')) {
      text =
        'Il browser in uso non supporta la gestione di più monitor. I browser che supportano questa funzione sono Chrome, Edge ed Opera.';
    }
    avvisiGestioneMonitor.textContent = text;
  } else {
    avvisiGestioneMonitor.style.display = 'none';
  }
}
