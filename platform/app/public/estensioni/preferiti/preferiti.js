/* eslint-disable default-case */
import saveHP from '../saveHP';

const preferitiInitInterval = () => {
  const intervalPreferitiExt = setInterval(() => {
    if (document.getElementById('trackedMeasurements-btn')) {
      clearInterval(intervalPreferitiExt);
      injectPreferitiBtn();
    }
  }, 100);

  //A prescindere blocco l'intervallo check dopo un tot per performance
  setTimeout(() => {
    clearInterval(intervalPreferitiExt);
  }, 10000);
};

const injectPreferitiBtn = () => {
  //Attacco pulsante sotto quello delle misurazioni nel pannello a dx
  document.getElementById('trackedMeasurements-btn').parentElement.insertAdjacentHTML(
    'afterend',
    `
    <div id="preferiti-btn"
    class="text-primary-active hover:cursor-pointer">
    <img style="width:22px" src="./assets/preferiti.png" />
    </div>
    `
  );
  const preferitiBtn = document.getElementById('preferiti-btn');
  preferitiBtn.addEventListener('click', createPreferitiFunc);
};

const createPreferitiFunc = () => {
  const preferitiToolsHtml = `
    <div id="preferiti-tools">
        <div id="intestazione">
        <img id="chiudi-button" style="width:22px" src="./assets/right-arrow.png" />
        <p>${window.sonoUnoStorico ? 'Preferiti storico' : 'Preferiti'}</p>

        </div>
      <div id="area-lista-preferiti">

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', preferitiToolsHtml);

  //Aggiungo i preferiti presenti alle div
  if (window.preferiti && window.preferiti.length > 0) {
    for (const preferito of window.preferiti) {
      document.getElementById('area-lista-preferiti').insertAdjacentHTML(
        'afterbegin',
        `
      <div class="col">
      <img onclick="window.viewPreferitoPopup('${preferito.DataUrl}')" src=${preferito.DataUrl} />
      <p>Serie ${preferito.NumeroSerie} - ${preferito.DescrizioneSerie}</p>
      <p>N° istanza: ${preferito.NumeroIstanza}</p>
      <button class="rimuovi-preferito-btn" onclick="window.rimuoviPreferito('${preferito.SOPInstanceUID}')">Rimuovi</button>
      </div>
      `
      );
    }
  }
  saveHP();

  //Animazione comparsa preferiti-tools
  setTimeout(() => {
    document.getElementById('preferiti-tools').style.left =
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
      const leftPositionPreferitiPanel = parseFloat(
        window.getComputedStyle(document.getElementById('preferiti-tools')).left
      );
      const valoreDefinitivo = leftPositionPreferitiPanel - widthPannelloSx;
      document.querySelector('[data-cy="viewport-grid"]').style.width = `${valoreDefinitivo}px`;
    }, 350);
  }, 0);

  window.rimuoviPreferito = SOPInstanceUID => {
    // Filtro l'array mantenendo solo gli oggetti che non hanno il SOPInstanceUID specificato
    window.preferiti = window.preferiti.filter(
      preferito => preferito.SOPInstanceUID !== SOPInstanceUID
    );
    document.getElementById('area-lista-preferiti').remove();
    document
      .getElementById('preferiti-tools')
      .insertAdjacentHTML('beforeend', '<div id="area-lista-preferiti"></div>');

    for (const preferito of window.preferiti) {
      document.getElementById('area-lista-preferiti').insertAdjacentHTML(
        'afterbegin',
        `
      <div class="col">
      <img onclick="window.viewPreferitoPopup('${preferito.DataUrl}')" src=${preferito.DataUrl} />
      <p>Serie ${preferito.NumeroSerie} - ${preferito.DescrizioneSerie}</p>
      <p>N° istanza: ${preferito.NumeroIstanza}</p>
      <button class="rimuovi-preferito-btn" onclick="window.rimuoviPreferito('${preferito.SOPInstanceUID}')">Rimuovi</button>
      </div>
      `
      );
    }
  };

  window.viewPreferitoPopup = imgSrc => {
    //Dimensioni attuali monitor
    const widthSchermo = window.innerWidth * 0.8;
    const heightSchermo = window.innerHeight * 0.8;
    const popup = window.open('', '_blank', `width=${widthSchermo},height=${heightSchermo}`);
    // Set the content of the popup
    popup.document.open();
    popup.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Preferito</title>
      </head>
      <body>
        <img src="${imgSrc}" alt="Canvas Image" style="width: 100%; height: auto;">
      </body>
      </html>
    `);
    popup.document.close();
  };

  document.getElementById('chiudi-button').addEventListener('click', () => {
    document.querySelector('[data-cy="viewport-grid"]').style.width = '100%';
    document.getElementById('preferiti-tools').style.left = '100%';
    setTimeout(() => {
      document.getElementById('preferiti-tools').remove();
    }, 300);
  });
};

// Ogni volta che il pannello si apre/chiude perdo l'estensione creata. Intercetto l'evento apertura/chiusura e ricreo
window.addEventListener('panelOpen', function (event) {
  if (!event.detail.isOpen && event.detail.side !== 'left') {
    preferitiInitInterval();
  }
});
