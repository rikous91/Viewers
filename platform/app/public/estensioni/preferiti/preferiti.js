/* eslint-disable default-case */
import saveHP from '../saveHP';

/*
======================================================
= POPUP PER VISUALIZZARE LE IMMAGINI DEI PREFERITI
======================================================
*/
window.viewPreferitoPopup = imgSrc => {
  const w = window.innerWidth * 0.8;
  const h = window.innerHeight * 0.8;
  const popup = window.open('', '_blank', `width=${w},height=${h}`);
  popup.document.write(`
    <img src="${imgSrc}" style="width:100%;height:auto;background:#000;margin:0;">
  `);
  popup.document.close();
};

/*
======================================================
= FUNZIONE GLOBALE PER RIMUOVERE UN PREFERITO
======================================================
*/
window.rimuoviPreferito = sopUID => {
  if (!window.preferiti) return;

  // Rimuovi dalla lista globale
  window.preferiti = window.preferiti.filter(p => p.SOPInstanceUID !== sopUID);
  window.dispatchEvent(new Event('nolex-preferiti-updated'));

  // Aggiorna pannello se aperto
  const area = document.getElementById('area-lista-preferiti');
  if (area) {
    area.innerHTML = '';

    window.preferiti.forEach(p => {
      area.insertAdjacentHTML(
        'beforeend',
        `
        <div style="margin-bottom:10px;border-bottom:1px solid #374151;padding-bottom:10px;">
          <img src="${p.DataUrl}"
                onclick="window.viewPreferitoPopup('${p.DataUrl}')"
                style="width:100%;max-height:180px;object-fit:contain;cursor:pointer;">
          <p>Serie ${p.NumeroSerie} - ${p.DescrizioneSerie}</p>
          <p>N° Istanza: ${p.NumeroIstanza}</p>

          <button onclick="window.rimuoviPreferito('${p.SOPInstanceUID}')"
                  style="margin-top:6px;padding:0px 10px;background:#b91c1c;
                         color:white;border:none;border-radius:4px;cursor:pointer;">
             Rimuovi preferito
          </button>
        </div>
        `
      );
    });
  }
};

/*
======================================================
= VARIABILI GLOBALI DELLA MODALE STIMULSOFT
======================================================
*/
let stimulsoftLoaded = false;
let stimulsoftModal = null;
let stimulsoftIframe = null;
const isPrintBuilderEnabled = window?.config?.enablePrintBuilder !== false;

/*
======================================================
= CREA MODALE + IFRAME ALL’AVVIO (PRECARICATO)
======================================================
*/
function createStimulsoftModalAtStartup() {
  if (!isPrintBuilderEnabled) {
    return;
  }
  if (stimulsoftModal) return; // evitare doppie creazioni

  // --- MODALE ---
  stimulsoftModal = document.createElement('div');
  stimulsoftModal.id = 'stimulsoft-modal';
  stimulsoftModal.style = `
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.85);
    backdrop-filter: blur(4px);
    z-index: 99999999;
    display: none;
    flex-direction: column;
    opacity: 0;
    transition: opacity .25s;
  `;

  // --- HEADER ---
  const header = document.createElement('div');
  header.style = `
    height: 48px;
    background: #000;
    color: white;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 15px;
    border-bottom: 1px solid #282828;
  `;
  header.innerHTML = `
    <span style="font-size:15px;">Editor di Stampa</span>
    <span id="close-stimulsoft-modal" style="cursor:pointer;font-size:22px;">✕</span>
  `;

  // --- LOADER UNA SOLA VOLTA ---
  const spinner = document.createElement('div');
  spinner.id = 'loader-stimulsoft';
  spinner.style = `
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    border: 6px solid #ffffff30;
    border-top: 6px solid #fff;
    border-radius: 50%;
    width: 45px; height: 45px;
    animation: spin 0.6s linear infinite;
    z-index: 10;
  `;

  // --- IFRAME PRECARICATO ---
  stimulsoftIframe = document.createElement('iframe');
  stimulsoftIframe.id = "stimulsoft-iframe";
  stimulsoftIframe.src = "/nolexviewer/print/builder.html";
  stimulsoftIframe.style = `
    flex: 1;
    width: 100%;
    height: calc(100% - 48px);
    border: none;
    background: #000;
  `;

  stimulsoftIframe.onload = () => {
    stimulsoftLoaded = true;
    spinner.style.display = "none";
  };

  // compongo modale
  stimulsoftModal.appendChild(header);
  stimulsoftModal.appendChild(spinner);
  stimulsoftModal.appendChild(stimulsoftIframe);
  document.body.appendChild(stimulsoftModal);

  // --- CHIUSURA ---
  document.getElementById('close-stimulsoft-modal').onclick = () => {
    stimulsoftModal.style.opacity = 0;
    setTimeout(() => (stimulsoftModal.style.display = 'none'), 200);
  };

  // keyframes
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes spin {
      0% { transform: translate(-50%, -50%) rotate(0deg); }
      100% { transform: translate(-50%, -50%) rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

// ESEGUE ALL’AVVIO
if (isPrintBuilderEnabled) {
  window.addEventListener("load", createStimulsoftModalAtStartup);
}

/*
======================================================
= APERTURA EDITOR DI STAMPA
======================================================
*/
const openStimulsoftDesigner = () => {
  if (!isPrintBuilderEnabled) {
    console.warn('Stampa disabilitata: apertura editor annullata');
    return;
  }
  try {
    window.localStorage.setItem('nolex-preferiti-layout', JSON.stringify(window.preferiti || []));
    window.localStorage.setItem('nolex-patient-info', JSON.stringify(window.nolexPatientInfo || {}));
    window.localStorage.setItem('nolex-study-info', JSON.stringify(window.nolexStudyInfo || {}));
  } catch (err) {
    console.error("Errore nel salvare i dati per Stimulsoft", err);
  }

  if (stimulsoftLoaded) {
    stimulsoftIframe.contentWindow.postMessage({ type: "refresh-preferiti" }, "*");
  }

  stimulsoftModal.style.display = "flex";
  requestAnimationFrame(() => stimulsoftModal.style.opacity = 1);
};

/*
======================================================
= MESSAGGI DAL BUILDER
======================================================
*/
window.addEventListener('message', e => {
  if (e.data?.type === "refresh-preferiti") {
    const favList = document.getElementById('fav-list');
    if (!favList) return;

    favList.innerHTML = '';
    const pref = JSON.parse(localStorage.getItem('nolex-preferiti-layout') || '[]');

    pref.forEach(p => {
      const img = document.createElement('img');
      img.src = p.DataUrl;
      img.style = "width:100%;margin-bottom:10px;border:1px solid #333;cursor:pointer;";
      favList.appendChild(img);
    });
  }
});

/*
======================================================
= INIT BUTTON SU OHIF
======================================================
*/
const preferitiInitInterval = () => {
  const intv = setInterval(() => {
    const btn = document.getElementById('trackedMeasurements-btn');
    if (btn) {
      clearInterval(intv);
      injectPreferitiBtn();
    }
  }, 100);
  setTimeout(() => clearInterval(intv), 10000);
};

const injectPreferitiBtn = () => {
  if (document.getElementById('preferiti-btn')) return;

  const tracked = document.getElementById('trackedMeasurements-btn');

  tracked.parentElement.insertAdjacentHTML(
    'afterend',
    `<div id="preferiti-btn" class="text-primary-active hover:cursor-pointer">
        <img style="width:22px" src="./assets/preferiti.png" />
     </div>`
  );

  document.getElementById('preferiti-btn').addEventListener('click', createPreferitiFunc);
};

/*
======================================================
= PANNELLO PREFERITI LATERALE
======================================================
*/
const createPreferitiFunc = () => {
  if (document.getElementById('preferiti-tools')) return;

  const hasPreferiti = window.preferiti && window.preferiti.length > 0;

  const html = `
    <div id="preferiti-tools" style="
      position:fixed;
      top:0; left:100%;
      width:${window.sonoUnoStorico ? '40%' : '20%'};
      height:100%;
      background:#111;
      color:#fff;
      z-index:99998;
      transition:left .25s ease-out;
      padding:10px;
      overflow-y:auto;
    ">

      <div style="display:flex;gap:10px;align-items:center;">
        <img id="chiudi-button" src="./assets/right-arrow.png"
             style="width:22px;cursor:pointer;">
        <p>${window.sonoUnoStorico ? 'Preferiti storico' : 'Preferiti'}</p>
      </div>

      ${hasPreferiti && isPrintBuilderEnabled
      ? `<button id="btn-open-stimulsoft"
                   style="margin:10px 0; padding:8px 12px;
                          background:#e5e7eb; color:#111;
                          border:none; border-radius:4px; cursor:pointer;">
                Apri Editor di Stampa
           </button>`
      : (!hasPreferiti
        ? `<p style="margin:15px 0; color:#aaa; font-size:13px;">
               Aggiungi almeno un preferito per abilitarne la stampa.
             </p>`
        : '')
    }

      <div id="area-lista-preferiti"></div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);

  const panel = document.getElementById('preferiti-tools');
  const area = document.getElementById('area-lista-preferiti');

  if (hasPreferiti && isPrintBuilderEnabled) {
    document.getElementById('btn-open-stimulsoft').onclick = openStimulsoftDesigner;
  }

  if (hasPreferiti) {
    window.preferiti.forEach(p => {
      area.insertAdjacentHTML(
        'beforeend',
        `
        <div style="margin-bottom:10px;border-bottom:1px solid #374151;padding-bottom:10px;">
          <img src="${p.DataUrl}"
               onclick="window.viewPreferitoPopup('${p.DataUrl}')"
               style="width:100%;max-height:180px;object-fit:contain;cursor:pointer;">
          <p>Serie ${p.NumeroSerie} - ${p.DescrizioneSerie}</p>
          <p>N° Istanza: ${p.NumeroIstanza}</p>

          <button onclick="window.rimuoviPreferito('${p.SOPInstanceUID}')"
                  style="margin-top:6px;padding:0px 10px;
                         background:#b91c1c;color:white;
                         border:none;border-radius:4px;
                         cursor:pointer;">
             Rimuovi preferito
          </button>
        </div>
        `
      );
    });
  }

  // animazione apertura
  setTimeout(() => {
    panel.style.left = window.sonoUnoStorico ? '60%' : '80%';
  }, 10);

  document.getElementById('chiudi-button').onclick = () => {
    panel.style.left = '100%';
    setTimeout(() => panel.remove(), 250);
  };
};

/*
======================================================
= RE-INIT SU EVENTI OHIF
======================================================
*/
if (!window.portableVersion) {
  window.addEventListener('panelOpen', e => {
    if (!e.detail.isOpen && e.detail.side !== 'left') {
      preferitiInitInterval();
    }
  });
}
