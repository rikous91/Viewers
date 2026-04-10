import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { SwitchButton } from '@ohif/ui';
import { Enums, metaData, utilities as csUtils } from '@cornerstonejs/core';
import { ColorbarProps } from '../../types/Colorbar';

function captureScreenshot() {
  const element = document.querySelector('.nolex-selected .viewport-element');

  return html2canvas(element).then(canvas => {
    // Converti il canvas in un'immagine (ad esempio PNG)
    const imgData = canvas.toDataURL('image/png');
    return imgData;
  });
}

async function captureImageFromImageId(imageId, viewport) {
  if (!imageId || !csUtils.loadImageToCanvas) {
    return null;
  }

  const canvas = document.createElement('canvas');
  const imageData = viewport?.getImageData?.();
  const dimensions = imageData?.dimensions;
  if (Array.isArray(dimensions) && dimensions.length >= 2) {
    canvas.width = dimensions[0];
    canvas.height = dimensions[1];
  } else {
    canvas.width = 1024;
    canvas.height = 1024;
  }

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  try {
    await csUtils.loadImageToCanvas({
      canvas,
      imageId,
      useCPURendering: true,
      requestType: Enums.RequestType.Thumbnail,
    });
  } catch (error) {
    console.warn('Preferiti: failed to render image for capture', error);
    return null;
  }

  return canvas.toDataURL('image/png');
}

// Cattura il viewport COMPLETO con le annotazioni (misurazioni length/area/...).
// Cornerstone3D rende il pixel data nel <canvas> e le annotazioni in un <svg>
// layer separato sopra. Questa funzione compone i due: prima disegna il
// canvas, poi serializza l'SVG, lo carica come <img> e lo dipinge sopra.
// Best-effort: ritorna null se qualcosa fallisce, e il chiamante ricade
// sulla cattura "pulita" come fallback.
async function captureImageWithAnnotationsFromElement(
  viewportElement: HTMLElement | null | undefined
): Promise<string | null> {
  if (!viewportElement) {
    return null;
  }
  try {
    // Cerchiamo il canvas dell'immagine. In OHIF/CS3D è ".cornerstone-canvas",
    // ma teniamo un fallback generico per robustezza.
    const cornerstoneCanvas =
      (viewportElement.querySelector('canvas.cornerstone-canvas') as HTMLCanvasElement | null) ||
      (viewportElement.querySelector('canvas') as HTMLCanvasElement | null);
    if (!cornerstoneCanvas) {
      return null;
    }

    // Tutti gli SVG dentro il viewport: in CS3D le annotazioni sono in
    // un layer SVG (tipicamente l'unico). Se ne trovassimo più di uno,
    // proviamo a dipingerli tutti in ordine.
    const svgs = Array.from(
      viewportElement.querySelectorAll('svg')
    ) as SVGSVGElement[];

    // Output canvas alla risoluzione INTRINSECA del cornerstone canvas
    // (massima qualità, indipendente dal devicePixelRatio).
    const out = document.createElement('canvas');
    out.width = cornerstoneCanvas.width;
    out.height = cornerstoneCanvas.height;
    const ctx = out.getContext('2d');
    if (!ctx) {
      return null;
    }

    // Sfondo nero (copre eventuale trasparenza del cornerstone canvas)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, out.width, out.height);

    // Disegna l'immagine 1:1
    ctx.drawImage(cornerstoneCanvas, 0, 0);

    // Disegna ogni SVG sopra, scalandolo alle dimensioni del canvas
    for (const svg of svgs) {
      // Skippa SVG vuoti o nascosti
      if (!svg.children || svg.children.length === 0) continue;
      try {
        const svgClone = svg.cloneNode(true) as SVGSVGElement;
        // CS3D usa le dimensioni di display del viewport per le coordinate
        // delle annotazioni. Le dimensioni di display sono clientWidth/Height
        // del canvas. Forziamo lo SVG ad avere queste dimensioni esplicite
        // (serve per la conversione a image, che richiede width/height).
        const dispW = svg.clientWidth || cornerstoneCanvas.clientWidth || out.width;
        const dispH = svg.clientHeight || cornerstoneCanvas.clientHeight || out.height;
        svgClone.setAttribute('width', String(dispW));
        svgClone.setAttribute('height', String(dispH));
        if (!svgClone.getAttribute('viewBox')) {
          svgClone.setAttribute('viewBox', `0 0 ${dispW} ${dispH}`);
        }
        // Inietta xmlns se mancante (necessario per il blob SVG)
        if (!svgClone.getAttribute('xmlns')) {
          svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        }

        const svgString = new XMLSerializer().serializeToString(svgClone);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);

        await new Promise<void>(resolve => {
          const im = new Image();
          im.onload = () => {
            try {
              // Disegna l'SVG scalato alle dimensioni intrinseche del canvas
              ctx.drawImage(im, 0, 0, out.width, out.height);
            } catch (e) {
              console.warn('Preferiti: drawImage(SVG) failed', e);
            }
            URL.revokeObjectURL(svgUrl);
            resolve();
          };
          im.onerror = () => {
            URL.revokeObjectURL(svgUrl);
            resolve();
          };
          im.src = svgUrl;
        });
      } catch (e) {
        console.warn('Preferiti: failed to compose one SVG layer', e);
      }
    }

    return out.toDataURL('image/png');
  } catch (e) {
    console.warn('Preferiti: failed to capture annotated image', e);
    return null;
  }
}

export function Preferiti({
  viewportId,
  displaySets,
  commandsManager,
  servicesManager,
  colorbarProperties,
}: withAppTypes<ColorbarProps>): ReactElement {
  void commandsManager;
  void colorbarProperties;

  const { cornerstoneViewportService } = servicesManager.services;

  // Recupera l'UID corrente dal primo elemento di displaySets
  const { SeriesInstanceUID } = displaySets[0].instance || {};

  const getActiveElementIndex = useCallback(() => {
    const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);
    if (viewport && typeof viewport.getCurrentImageIdIndex === 'function') {
      const index = viewport.getCurrentImageIdIndex();
      if (Number.isFinite(index)) {
        return index;
      }
    }

    const input = document.querySelector('.nolex-selected .mousetrap') as HTMLInputElement | null;
    const value = input ? Number(input.value) : 0;
    return Number.isFinite(value) ? value : 0;
  }, [cornerstoneViewportService, viewportId]);

  const getInstanceAtIndex = useCallback(
    index => {
      const instances = displaySets?.[0]?.instances;
      if (instances?.length) {
        const safeIndex = Math.min(Math.max(index, 0), instances.length - 1);
        return instances[safeIndex];
      }
      return displaySets?.[0]?.instance ?? displaySets?.[0];
    },
    [displaySets]
  );

  const getSopUIDAtIndex = useCallback(
    index => {
      const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);
      if (viewport && typeof viewport.getImageIds === 'function') {
        const imageIds = viewport.getImageIds() || [];
        const imageId = imageIds[index];
        if (imageId) {
          const sop = metaData.get('sopCommonModule', imageId)?.sopInstanceUID;
          if (sop) {
            return sop;
          }
        }
      }

      const instance = getInstanceAtIndex(index);
      return instance?.SOPInstanceUID;
    },
    [cornerstoneViewportService, viewportId, getInstanceAtIndex]
  );

  const getImageIdAtIndex = useCallback(
    index => {
      const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);
      if (viewport && typeof viewport.getImageIds === 'function') {
        const imageIds = viewport.getImageIds() || [];
        return imageIds[index];
      }
      return null;
    },
    [cornerstoneViewportService, viewportId]
  );

  const isPreferitoForIndex = useCallback(
    index => {
      if (!window.preferiti?.length) {
        return false;
      }
      const sopUID = getSopUIDAtIndex(index);
      if (!SeriesInstanceUID || !sopUID) {
        return false;
      }
      return window.preferiti.some(
        preferito =>
          preferito.SeriesInstanceUID === SeriesInstanceUID &&
          preferito.SOPInstanceUID === sopUID
      );
    },
    [SeriesInstanceUID, getSopUIDAtIndex]
  );

  const [activeElementIndex, setActiveElementIndex] = useState(getActiveElementIndex);
  const [isPreferito, setIsPreferito] = useState(() =>
    isPreferitoForIndex(getActiveElementIndex())
  );

  useEffect(() => {
    const viewportInfo = cornerstoneViewportService.getViewportInfo(viewportId);
    const element = viewportInfo?.getElement?.();
    if (!element) {
      return;
    }

    const viewportType =
      viewportInfo.getViewportType?.() ||
      viewportInfo.getViewportData?.()?.viewportType ||
      Enums.ViewportType.STACK;

    const eventId =
      (viewportType === Enums.ViewportType.STACK && Enums.Events.STACK_VIEWPORT_SCROLL) ||
      (viewportType === Enums.ViewportType.ORTHOGRAPHIC && Enums.Events.VOLUME_NEW_IMAGE) ||
      Enums.Events.IMAGE_RENDERED;

    const updateIndex = event => {
      const detail = event?.detail || {};
      const { newImageIdIndex, imageIndex } = detail;
      const nextIndex = Number.isFinite(newImageIdIndex)
        ? newImageIdIndex
        : Number.isFinite(imageIndex)
          ? imageIndex
          : getActiveElementIndex();
      setActiveElementIndex(nextIndex);
    };

    element.addEventListener(eventId, updateIndex);
    updateIndex();

    return () => {
      element.removeEventListener(eventId, updateIndex);
    };
  }, [cornerstoneViewportService, viewportId, getActiveElementIndex]);

  useEffect(() => {
    const currentIsPreferito = isPreferitoForIndex(activeElementIndex);
    setIsPreferito(currentIsPreferito);
  }, [activeElementIndex, isPreferitoForIndex]);

  const onSetPreferito = useCallback(
    async e => {
      const { uiNotificationService } = servicesManager.services;
      const checked = e; //Mi indica se sto checkando o meno l'opzione per aggiunta/rimozione preferito      // Inizializza window.preferiti se non esiste
      const instance = getInstanceAtIndex(activeElementIndex);
      const sopUID = getSopUIDAtIndex(activeElementIndex);
      const imageId = getImageIdAtIndex(activeElementIndex);

      if (!sopUID) {
        return;
      }

      if (!window.preferiti) {
        window.preferiti = [];
      }
      if (!checked && document.getElementById('preferiti-btn')) {
        document.getElementById('preferiti-btn').classList.remove('pulse');
        // Filtra l'array preferiti rimuovendo l'elemento che corrisponde ai criteri
        window.preferiti = window.preferiti.filter(preferito => {
          return !(
            preferito.SeriesInstanceUID === SeriesInstanceUID &&
            preferito.SOPInstanceUID === sopUID
          );
        });
        setIsPreferito(false);
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
            <p>N¶ø istanza: ${preferito.NumeroIstanza}</p>
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
        window.dispatchEvent(new Event('nolex-preferiti-updated'));
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
      //       <p>N¶ø istanza: ${NumeroIstanza}</p>
      //       <button class="rimuovi-preferito-btn" onclick="window.rimuoviPreferito('${SOPInstanceUID}')">Rimuovi</button>
      //       </div>
      //       `
      //       );
      //     }
      //   });
      // }

      //Cattura del canvas senza misurazioni e altro anzichÇ¸ di tutta la div
      if (!isPreferito && checked && document.getElementById('preferiti-btn')) {
        const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);
        const SOPInstanceUID = sopUID;
        const NumeroSerie = instance?.SeriesNumber ?? displaySets?.[0]?.instance?.SeriesNumber;
        const DescrizioneSerie =
          instance?.SeriesDescription ?? displaySets?.[0]?.instance?.SeriesDescription;
        const NumeroIstanza = activeElementIndex + 1;
        const imgData =
          (await captureImageFromImageId(imageId, viewport)) ||
          document.querySelector('.nolex-selected .cornerstone-canvas')?.toDataURL('image/png');
        if (!imgData) {
          return;
        }

        // Cattura ANCHE una versione con le annotazioni (misurazioni
        // length/area/...) componendo il canvas + il layer SVG. Best-effort:
        // se fallisce ricadiamo sul DataUrl pulito così il print builder
        // continua a funzionare anche senza annotazioni.
        const viewportInfoForCapture = cornerstoneViewportService.getViewportInfo(viewportId);
        const viewportElementForCapture =
          (viewportInfoForCapture?.getElement?.() as HTMLElement | null) ?? null;
        const imgDataAnnotated =
          (await captureImageWithAnnotationsFromElement(viewportElementForCapture)) || imgData;

        window.preferiti.push({
          SeriesInstanceUID,
          SOPInstanceUID: SOPInstanceUID,
          DataUrl: imgData,
          DataUrlAnnotated: imgDataAnnotated,
          NumeroSerie: NumeroSerie,
          DescrizioneSerie: DescrizioneSerie,
          NumeroIstanza: NumeroIstanza,
        });
        setIsPreferito(true);

        //Se ho la clipbooard preferiti aperta, inserisco il preferito in tempo reale
        if (document.getElementById('area-lista-preferiti')) {
          document.getElementById('area-lista-preferiti').insertAdjacentHTML(
            'afterbegin',
            `
        <div class="col">
        <img onclick="window.viewPreferitoPopup('${imgData}')" src=${imgData} />
        <p>Serie ${NumeroSerie} - ${DescrizioneSerie}</p>
        <p>N¶ø istanza: ${NumeroIstanza}</p>
        <button class="rimuovi-preferito-btn" onclick="window.rimuoviPreferito('${SOPInstanceUID}')">Rimuovi</button>
        </div>
      `
          );
        }

        document.getElementById('preferiti-btn').classList.add('pulse');

        uiNotificationService.show({
          title: 'Preferiti',
          message: `Aggiunto ai preferiti`,
          type: 'success',
        });
        window.dispatchEvent(new Event('nolex-preferiti-updated'));
      }

      document.querySelector('.nolex-selected .preferiti-btn').click(); //Nascondo cosÇª lo switch appena aperto
    },
    [
      displaySets,
      isPreferito,
      SeriesInstanceUID,
      activeElementIndex,
      servicesManager,
      getInstanceAtIndex,
      getSopUIDAtIndex,
      getImageIdAtIndex,
      cornerstoneViewportService,
      viewportId,
    ]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const switchButton = document.querySelector('.switch-button-outer') as HTMLElement | null;
      if (switchButton) {
        switchButton.click();
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, []);

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
        label={!isPreferito ? 'Aggiungi ai preferiti' : 'Rimuovi dai preferiti'}
        checked={isPreferito}
        onChange={e => {
          void onSetPreferito(e);
        }}
      />
    </div>
  );
}
