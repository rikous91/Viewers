/* eslint-disable default-case */
/**** PARTE 1 - INJECT PULSANTE STAMPA E CREAZIONE IFRAME DEDICATO ALLA STAMPA *****************/

const printInitInterval = () => {
  const intervalPrintExt = setInterval(() => {
    if (document.getElementById('trackedMeasurements-btn')) {
      clearInterval(intervalPrintExt);
      injectPrintBtn();
    }
  }, 100);

  //A prescindere blocco l'intervallo check dopo un tot per performance
  setTimeout(() => {
    clearInterval(intervalPrintExt);
  }, 10000);
};

const injectPrintBtn = () => {
  //Attacco pulsante sotto quello delle misurazioni nel pannello a dx
  document.getElementById('trackedMeasurements-btn').parentElement.insertAdjacentHTML(
    'afterend',
    `
    <div id="print-btn"
    class="text-primary-active hover:cursor-pointer">
    <img style="width:22px" src="./assets/printer.png" />
    </div>
    `
  );
  const printBtn = document.getElementById('print-btn');
  printBtn.addEventListener('click', createPrint);
  // printBtn.addEventListener('click', createIframePrint);
};

const createPrint = () => {
  document.body.classList.add('iframe-stampa');

  const printToolsHtml = `
    <div id="print-tools">

    <div class="riquadro-strumenti" id="cosa-stampare">
    <fieldset>
  <legend>Seleziona per la stampa:</legend>

  <div>
    <input type="radio" id="immagineattuale" name="cosastampare" value="immagineattuale"  />
    <label for="immagineattuale">Immagine attuale</label>
  </div>

  <div>
    <input type="radio" id="serieattuale" name="cosastampare" value="serieattuale" />
    <label for="serieattuale">Serie attuale</label>
  </div>

    <div>
    <input type="radio" id="studioattuale" name="cosastampare" value="studioattuale" checked />
    <label for="studioattuale">Studio attuale</label>
    </div>
    </fieldset>

    </div>

    <div class="riquadro-strumenti" id="misurazioni">
    <label for="misurazioniInput">Mostra misurazioni effettuate</label><br>
    <input type="checkbox" id="misurazioniInput" name="misurazioniInput" checked>
    </div>

    <div class="riquadro-strumenti" id="disposizione">
   <label for="disposizione">Disposizione</label>
  <select name="disposizione" id="disposizioneSelect">
    <option value="1x1">1x1</option>
    <option value="1x2">1x2</option>
    <option value="1x3">1x3</option>

    <option value="2x1">2x1</option>
    <option value="2x2">2x2</option>
    <option value="2x3">2x3</option>

     <option value="3x1">3x1</option>
    <option value="3x2">3x2</option>
    <option value="3x3">3x3</option>

     <option value="4x1">4x1</option>
    <option value="4x2">4x2</option>
    <option value="4x3">4x3</option>
  </select>
  </div>
    <div>
      <button id="annulla-button">Annulla</button>
      <button id="print-button">Stampa</button>
    </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', printToolsHtml);

  //Cosa stampare radio buttons change
  const radioBtnCosaStampare = document.querySelectorAll('[name="cosastampare"]');
  radioBtnCosaStampare.forEach(radio => {
    radio.addEventListener('change', cosaStampareFunc);
  });
  function cosaStampareFunc(e) {
    const valueRadio = e.target.value;
    const riquadroDisposizione = document.getElementById('disposizione');
    const viewportAttiva = document.querySelector('.nolex-selected');
    //Nascondo riquadro disposizione di default
    if (valueRadio === 'immagineattuale') {
      riquadroDisposizione.style.display = 'none';
      //Eseguo doppio click sulla viewport nolex-selected così da avere quella attuale in primo piano
      viewportAttiva.classList.add('viewport-primo-piano');
    } else {
      viewportAttiva.classList.remove('viewport-primo-piano');
      riquadroDisposizione.style.display = 'flex';
    }
  }

  //Mostra o meno misurazioni
  document.getElementById('misurazioniInput').addEventListener('click', e => {
    console.log(e.target.checked);
    if (!e.target.checked) {
      document.body.classList.add('nascondi-misurazioni-stampa');
    } else {
      document.body.classList.remove('nascondi-misurazioni-stampa');
    }
  });

  //Layout griglia stampa
  document.getElementById('disposizione').addEventListener('change', cambiaGrigliaStampa);
  function cambiaGrigliaStampa(e) {
    const layout = e.target.value;
    document.querySelector('[data-cy="Layout"]').click();
    setTimeout(() => {
      switch (layout) {
        case '1x1':
          document.querySelector('[data-cy="Layout-0-0"]').click();
          break;
        case '1x2':
          document.querySelector('[data-cy="Layout-0-1"]').click();
          break;
        case '1x3':
          document.querySelector('[data-cy="Layout-0-2"]').click();
          break;
        case '2x1':
          document.querySelector('[data-cy="Layout-1-0"]').click();
          break;
        case '2x2':
          document.querySelector('[data-cy="Layout-1-1"]').click();
          break;
        case '2x3':
          document.querySelector('[data-cy="Layout-1-2"]').click();
          break;
        case '3x1':
          document.querySelector('[data-cy="Layout-2-0"]').click();
          break;
        case '3x2':
          document.querySelector('[data-cy="Layout-2-1"]').click();
          break;
        case '3x3':
          document.querySelector('[data-cy="Layout-2-2"]').click();
          break;
        case '4x1':
          document.querySelector('[data-cy="Layout-3-0"]').click();
          break;
        case '4x2':
          document.querySelector('[data-cy="Layout-3-1"]').click();
          break;
        case '4x3':
          document.querySelector('[data-cy="Layout-3-2"]').click();
          break;
      }
    }, 0);
  }

  document.getElementById('annulla-button').addEventListener('click', () => {
    document.body.classList.remove('iframe-stampa');
    document.getElementById('print-tools').remove();
  });

  document.getElementById('print-button').addEventListener('click', () => {
    window.print();
  });
};

const createIframePrint = () => {
  // window.print();
  //Creo un iframe dell'indirizzo attuale così da poter modificare il tutto nell'iframe e non nello studio attuale visualizzato
  const iframe = document.createElement('iframe');

  // Imposta l'attributo src dell'iframe all'indirizzo attuale
  iframe.src = window.location.href + '&print=ok';
  iframe.id = 'iframe-print';
  iframe.style.cssText = `
  border: none;
    height: 100vh;
    width: 100%;
    z-index: 9999999;
    position: fixed;
    top: 0;
    bottom: 0;
    left:0%;
  iframe.style.border = 'none';
  `;

  // Appendi l'iframe al body
  document.body.appendChild(iframe);
};

// Ogni volta che il pannello si apre/chiude perdo l'estensione creata. Intercetto l'evento apertura/chiusura e ricreo
window.addEventListener('panelOpen', function (event) {
  if (!event.detail.isOpen) {
    printInitInterval();
  }
});

//Ascolto i messaggi dall'iframe così da inviare il comando chiudi e rimuovere l'iframe chiedendolo lui stesso

function riceviMessaggioFromIframe(event) {
  if (event.data === 'REMOVE_PRINT_IFRAME') {
    const iframe = document.getElementById('iframe-print'); // Assicurati di dare un ID all'iframe
    if (iframe) {
      document.body.removeChild(iframe);
    }
  }
}

window.addEventListener('message', riceviMessaggioFromIframe, false);
/***********************************************************************************************************************************/

/********  PARTE 2 - SONO NELL'IFRAME DI STAMPA ******************************/

// Se sono all'interno dell'iframe stampa (creato al click della relativa icona), eseguo determinate azioni
if (window.location.href.includes('&print=ok')) {
  //Verifico che il frame sia caricato del tutto prima di poterlo manipolare
  const isIframeReady = setInterval(() => {
    if (document.querySelector('[data-cy="side-panel-header-right"]')) {
      clearInterval(isIframeReady);
      sistemoIframeStampa();
    }
  }, 500);
  //A prescindere blocco l'intervallo check dopo un tot per performance
  setTimeout(() => {
    clearInterval(isIframeReady);
  }, 10000);

  const sistemoIframeStampa = () => {
    document.body.classList.add('iframe-stampa');
    //Creo pulsante annulla stampa per rimuovere il frame
    const button = document.createElement('button');
    button.textContent = 'Annulla';
    button.style.cssText = `
    padding: 10px 20px;
    font-size: 16px;
    cursor: pointer;
    position: fixed;
    top: 0;
    background: #b71c1c;
    z-index: 999999;
    color: #fff;
    `;

    button.addEventListener('click', () => {
      window.parent.postMessage('REMOVE_PRINT_IFRAME', '*');
    });

    // Appendi il pulsante al body
    document.body.appendChild(button);
  };
}
