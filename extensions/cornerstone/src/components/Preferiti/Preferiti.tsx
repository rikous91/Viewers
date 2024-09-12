import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { SwitchButton } from '@ohif/ui';
import { ColorbarProps } from '../../types/Colorbar';

function captureScreenshot() {
  const element = document.querySelector('.nolex-selected .viewport-element');

  return html2canvas(element).then(canvas => {
    // Converti il canvas in un'immagine (ad esempio PNG)
    const imgData = canvas.toDataURL('image/png');
    return imgData;
  });
}

export function Preferiti({
  viewportId,
  displaySets,
  commandsManager,
  servicesManager,
  colorbarProperties,
}: withAppTypes<ColorbarProps>): ReactElement {
  const { colorbarService } = servicesManager.services;
  const {
    width: colorbarWidth,
    colorbarTickPosition,
    colorbarContainerPosition,
    colormaps,
    colorbarInitialColormap,
  } = colorbarProperties;

  // Recupera l'UID corrente dal primo elemento di displaySets
  const { SeriesInstanceUID } = displaySets[0].instance;

  // Verifica se l'elemento corrente è già nei preferiti
  let activeElementIndex = 0;
  if (document.querySelector('.nolex-selected .mousetrap')) {
    activeElementIndex = Number(document.querySelector('.nolex-selected .mousetrap').value);
  }
  const isAlreadyPreferito = window.preferiti?.some(
    preferito =>
      preferito.SOPInstanceUID === SeriesInstanceUID &&
      (displaySets[0].instances.length > 1
        ? displaySets[0].instances[activeElementIndex].SOPInstanceUID
        : displaySets[0].instances[0].SOPInstanceUID)
  );

  // if (isAlreadyPreferito) {
  //   alert('gia messo');
  // }

  const [isPreferito, setIsPreferito] = useState(isAlreadyPreferito);

  const onSetPreferito = useCallback(
    e => {
      const { uiNotificationService } = servicesManager.services;
      const checked = e; //Mi indica se sto checkando o meno l'opzione per aggiunta/rimozione preferito      // Inizializza window.preferiti se non esiste

      if (!window.preferiti) {
        window.preferiti = [];
      }
      if (!checked) {
        document.getElementById('preferiti-btn').classList.remove('pulse');
        // Filtra l'array preferiti rimuovendo l'elemento che corrisponde ai criteri
        window.preferiti = window.preferiti.filter(preferito => {
          return !(
            preferito.SeriesInstanceUID === SeriesInstanceUID &&
            (preferito.SOPInstanceUID === displaySets[0].instances.length > 1
              ? displaySets[0].instances[activeElementIndex].SOPInstanceUID
              : displaySets[0].instances[0].SOPInstanceUID)
          );
        });
        //Se ho la clipbooard preferiti aperta, aggiorno i preferiti in tempo reale dopo la rimozione
        if (document.getElementById('area-lista-preferiti')) {
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
        }
        uiNotificationService.show({
          title: 'Preferiti',
          message: `Preferito rimosso`,
          type: 'error',
        });
      }

      // Aggiungo l'elemento ai preferiti salvando screen dell'intera div con misurazioni e tutto
      // if (!isAlreadyPreferito && checked) {
      //   captureScreenshot().then(imgData => {
      //     const SOPInstanceUID = displaySets[0].instances[activeElementIndex].SOPInstanceUID;
      //     const NumeroSerie = displaySets[0].instances[activeElementIndex].SeriesNumber;
      //     const DescrizioneSerie = displaySets[0].instances[activeElementIndex].SeriesDescription;
      //     const NumeroIstanza = activeElementIndex + 1;
      //     window.preferiti.push({
      //       SeriesInstanceUID,
      //       SOPInstanceUID: SOPInstanceUID,
      //       DataUrl: imgData,
      //       NumeroSerie: NumeroSerie,
      //       DescrizioneSerie: DescrizioneSerie,
      //       NumeroIstanza: NumeroIstanza,
      //     });
      //     //Se ho la clipbooard preferiti aperta, inserisco il preferito in tempo reale
      //     if (document.getElementById('area-lista-preferiti')) {
      //       document.getElementById('area-lista-preferiti').insertAdjacentHTML(
      //         'afterbegin',
      //         `
      //       <div class="col">
      //       <img onclick="window.viewPreferitoPopup('${imgData}')" src=${imgData} />
      //       <p>Serie ${NumeroSerie} - ${DescrizioneSerie}</p>
      //       <p>N° istanza: ${NumeroIstanza}</p>
      //       <button class="rimuovi-preferito-btn" onclick="window.rimuoviPreferito('${SOPInstanceUID}')">Rimuovi</button>
      //       </div>
      //       `
      //       );
      //     }
      //   });
      // }

      //Cattura del canvas senza misurazioni e altro anziché di tutta la div
      if (!isAlreadyPreferito && checked) {
        const SOPInstanceUID =
          displaySets[0].instances.length > 1
            ? displaySets[0].instances[activeElementIndex].SOPInstanceUID
            : displaySets[0].instances[0].SOPInstanceUID;
        const NumeroSerie =
          displaySets[0].instances.length > 1
            ? displaySets[0].instances[activeElementIndex].SeriesNumber
            : displaySets[0].instances[0].SOPInstanceUID;
        const DescrizioneSerie =
          displaySets[0].instances.length > 1
            ? displaySets[0].instances[activeElementIndex].SeriesDescription
            : displaySets[0].instances[0].SOPInstanceUID;
        const NumeroIstanza = activeElementIndex + 1;
        const imgData = document
          .querySelector('.nolex-selected .cornerstone-canvas')
          .toDataURL('image/png');
        window.preferiti.push({
          SeriesInstanceUID,
          SOPInstanceUID: SOPInstanceUID,
          DataUrl: imgData,
          NumeroSerie: NumeroSerie,
          DescrizioneSerie: DescrizioneSerie,
          NumeroIstanza: NumeroIstanza,
        });
        //Se ho la clipbooard preferiti aperta, inserisco il preferito in tempo reale
        if (document.getElementById('area-lista-preferiti')) {
          document.getElementById('area-lista-preferiti').insertAdjacentHTML(
            'afterbegin',
            `
            <div class="col">
            <img onclick="window.viewPreferitoPopup('${imgData}')" src=${imgData} />
            <p>Serie ${NumeroSerie} - ${DescrizioneSerie}</p>
            <p>N° istanza: ${NumeroIstanza}</p>
            <button class="rimuovi-preferito-btn" onclick="window.rimuoviPreferito('${SOPInstanceUID}')">Rimuovi</button>
            </div>
            `
          );
        }
        //Creo l'animazione all'icona a dx dei preferiti per far capire di poter cliccare sulla relativa icona per visualizzare i preferiti
        document.getElementById('preferiti-btn').classList.add('pulse');

        uiNotificationService.show({
          title: 'Preferiti',
          message: `Aggiunto ai preferiti`,
          type: 'success',
        });
      }

      document.querySelector('.nolex-selected .preferiti-btn').click(); //Nascondo così lo switch appena aperto
    },
    [
      isPreferito,
      commandsManager,
      viewportId,
      displaySets,
      servicesManager,
      colorbarWidth,
      colorbarTickPosition,
      colorbarContainerPosition,
      colormaps,
      colorbarInitialColormap,
    ]
  );

  useEffect(() => {
    const updateColorbarState = () => {
      setIsPreferito(colorbarService.hasColorbar(viewportId));
    };

    const { unsubscribe } = colorbarService.subscribe(
      colorbarService.EVENTS.STATE_CHANGED,
      updateColorbarState
    );

    return () => {
      unsubscribe();
    };
  }, [viewportId, colorbarService]);
  //cambio icona
  setTimeout(() => {
    const iconaStella = document.querySelector('.nolex-selected .preferiti-btn img');
    if (iconaStella.src.includes('preferiti-active')) {
      iconaStella.src = '/nuovo-visualizzatore/assets/images/preferiti.png';
    } else {
      iconaStella.src = '/nuovo-visualizzatore/assets/images/preferiti-active.png';
    }
  }, 0);

  setTimeout(() => {
    document.querySelector('.switch-button-outer').click();
  }, 0);

  return (
    <div
      style={{ display: 'none' }}
      className="all-in-one-menu-item flex w-full justify-center"
    >
      <div className="mr-2 w-[28px]"></div>
      {/* <button onClick={onSetPreferito}>
        {!isAlreadyPreferito ? 'Aggiungi ai preferiti' : 'Rimuovi'}
      </button> */}
      <SwitchButton
        label={!isAlreadyPreferito ? 'Aggiungi ai preferiti' : 'Rimuovi dai preferiti'}
        checked={isAlreadyPreferito}
        onChange={e => {
          onSetPreferito(e);
        }}
      />
    </div>
  );
}
