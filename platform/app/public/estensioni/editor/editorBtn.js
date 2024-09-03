/* eslint-disable default-case */

const editorInitInterval = () => {
  const intervalEditorExt = setInterval(() => {
    if (document.getElementById('trackedMeasurements-btn')) {
      clearInterval(intervalEditorExt);
      injectEditorBtn();
    }
  }, 100);

  //A prescindere blocco l'intervallo check dopo un tot per performance
  setTimeout(() => {
    clearInterval(intervalEditorExt);
  }, 10000);
};

const injectEditorBtn = () => {
  //Attacco pulsante sotto quello delle misurazioni nel pannello a dx
  document.getElementById('trackedMeasurements-btn').parentElement.insertAdjacentHTML(
    'afterend',
    `
    <div id="editor-btn"
    class="text-primary-active hover:cursor-pointer">
    <img style="width:22px" src="./assets/edit.png" />
    </div>
    `
  );
  const editorBtn = document.getElementById('editor-btn');
  editorBtn.addEventListener('click', createEditorFunc);
};

const createEditorFunc = () => {
  const editorToolsHtml = `
    <div id="editor-tools">
        <div id="intestazione">
        <img id="chiudi-editor-button" style="width:22px" src="./assets/right-arrow.png" />
        <p>Note</p>
        </div>
         <div id="main-area-editor">
            <div id="area-note-salvate">

            </div>
            <div id="area-editor">

             </div>
      <button id="salva-testo">Salva</button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', editorToolsHtml);
  var quill = new Quill('#area-editor', {
    theme: 'snow',
  });

  //Animazione comparsa editor-tools
  setTimeout(() => {
    document.getElementById('editor-tools').style.left = '80%';
    //Adatto la larghezza della griglia in base all'apertura del nuovo pannello
    setTimeout(() => {
      const widthPannelloSx = parseFloat(
        window.getComputedStyle(document.querySelector('.nolex-panel')).width
      );
      const leftPositionPreferitiPanel = parseFloat(
        window.getComputedStyle(document.getElementById('editor-tools')).left
      );
      const valoreDefinitivo = leftPositionPreferitiPanel - widthPannelloSx;
      document.querySelector('[data-cy="viewport-grid"]').style.width = `${valoreDefinitivo}px`;
    }, 350);
  }, 0);

  const inserisciNotaDom = () => {
    const savedDelta = localStorage.getItem('quillContent');
    if (savedDelta) {
      console.log('Contenuto caricato correttamente.');
      const areaNoteSalvate = document.getElementById('area-note-salvate');
      areaNoteSalvate.insertAdjacentHTML(
        'afterbegin',
        `
    <div onclick="window.handleNotaClick(this)" class="nota-salvata">
      <p>Carica contenuto salvato</p>
    </div>`
      );
    } else {
      console.log('Nessun contenuto salvato trovato.');
    }
  };

  window.handleNotaClick = e => {
    const savedDelta = localStorage.getItem('quillContent');
    const delta = JSON.parse(savedDelta);
    quill.setContents(delta);
  };

  const salvaTesto = () => {
    const delta = quill.getContents();

    // Converti il Delta in stringa JSON per salvarlo
    const deltaString = JSON.stringify(delta);
    localStorage.setItem('quillContent', deltaString);

    console.log('Contenuto salvato correttamente.');
    alert('Contenuto salvato correttamente');

    if (document.querySelector('.nota-salvata')) {
      document.querySelector('.nota-salvata').remove();
    }
    inserisciNotaDom();
  };
  document.getElementById('salva-testo').addEventListener('click', salvaTesto);
  inserisciNotaDom();

  document.getElementById('chiudi-editor-button').addEventListener('click', () => {
    document.querySelector('[data-cy="viewport-grid"]').style.width = '100%';
    document.getElementById('editor-tools').style.left = '100%';
    setTimeout(() => {
      document.getElementById('editor-tools').remove();
    }, 300);
  });
};

// Ogni volta che il pannello si apre/chiude perdo l'estensione creata. Intercetto l'evento apertura/chiusura e ricreo
window.addEventListener('panelOpen', function (event) {
  if (!event.detail.isOpen && event.detail.side !== 'left') {
    editorInitInterval();
  }
});
