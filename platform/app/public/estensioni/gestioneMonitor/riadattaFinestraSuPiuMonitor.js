import { ripristinoVisualizzazioneSuUnMonitor } from './ripristinoVisualizzazioneSuUnMonitor';

//la funzione viene richiamata solamente se vi è una eccedenzaLarghezzaMonitorSecondario quindi se la finestra attuale supera la larghezza del monitor su cui è attiva.
let pannelloSX;
let pannelloDX;
let larghezzaPannelloSX;
let larghezzaPannelloDX;
let larghezzaCorrettaViewportDaSxVersoDx;
let larghezzaCorrettaViewportDaDxVersoSx;

function riadattaFinestraSuPiuMonitor(
  larghezzaMonitorPrimario,
  eccedenzaLarghezzaMonitorSecondario,
  fromLeftToRight
) {
  // larghezzaMonitorPrimario si riferisce alla larghezza attuale del monitor attivo ovvero nel monitor in cui sta posizionata la finestra prima di allargarsi ed estendersi
  //sull'altro monitor. EccedenzaLarghezzaMonitorSecondario è la larghezza della finestra sull'altro monitor.
  // console.log(
  //   'larghezzaMonitorPrimario: ',
  //   larghezzaMonitorPrimario,
  //   'eccedenzaLarghezzaMonitorSecondario: ',
  //   eccedenzaLarghezzaMonitorSecondario,
  //   'fromLeftToRight: ',
  //   fromLeftToRight
  // );

  sistemaToolbar(larghezzaMonitorPrimario, eccedenzaLarghezzaMonitorSecondario, fromLeftToRight);

  pannelloSX = document.querySelectorAll('.nolex-new-panel')[0];
  pannelloDX = document.querySelectorAll('.nolex-new-panel')[1];
  larghezzaPannelloSX = pannelloSX.offsetWidth;
  larghezzaPannelloDX =
    parseFloat(pannelloDX.style.width) + parseFloat(pannelloDX.style.marginRight);
  larghezzaCorrettaViewportDaSxVersoDx = larghezzaMonitorPrimario - larghezzaPannelloSX;
  larghezzaCorrettaViewportDaDxVersoSx = larghezzaMonitorPrimario - larghezzaPannelloDX;
  const layoutAttuale = window.layout;
  const viewports = document.querySelectorAll('.viewport-parent-div');
  if (viewports.length === 0) {
    return;
  }
  //Se ho la visualizzazione dello storico come iframe nella stessa finestra lo gestisco direttamente nell'altro monitor senza toccare tutto il resto
  if (document.body.classList.contains('storico-injected-iframe')) {
    transformStoricoIframe(
      viewports,
      larghezzaMonitorPrimario,
      eccedenzaLarghezzaMonitorSecondario,
      fromLeftToRight
    );
  } else {
    // eslint-disable-next-line default-case
    switch (layoutAttuale) {
      case '1x1':
        transform1Column(
          viewports,
          larghezzaMonitorPrimario,
          eccedenzaLarghezzaMonitorSecondario,
          fromLeftToRight
        );
        break;
      case '1x2':
        transform1Column(
          viewports,
          larghezzaMonitorPrimario,
          eccedenzaLarghezzaMonitorSecondario,
          fromLeftToRight
        );
        break;
      case '1x3':
        transform1Column(
          viewports,
          larghezzaMonitorPrimario,
          eccedenzaLarghezzaMonitorSecondario,
          fromLeftToRight
        );
        break;
      case '2x1':
        transform2Columns(
          viewports,
          larghezzaMonitorPrimario,
          eccedenzaLarghezzaMonitorSecondario,
          fromLeftToRight
        );
        break;
      case '2x2':
        transform2Columns(
          viewports,
          larghezzaMonitorPrimario,
          eccedenzaLarghezzaMonitorSecondario,
          fromLeftToRight
        );
        break;
      case '2x3':
        transform2Columns(
          viewports,
          larghezzaMonitorPrimario,
          eccedenzaLarghezzaMonitorSecondario,
          fromLeftToRight
        );
        break;
      case '3x1':
        transform3Columns(
          viewports,
          larghezzaMonitorPrimario,
          eccedenzaLarghezzaMonitorSecondario,
          fromLeftToRight
        );
        break;
      case '3x2':
        transform3Columns(
          viewports,
          larghezzaMonitorPrimario,
          eccedenzaLarghezzaMonitorSecondario,
          fromLeftToRight
        );
        break;
      case '3x3':
        transform3Columns(
          viewports,
          larghezzaMonitorPrimario,
          eccedenzaLarghezzaMonitorSecondario,
          fromLeftToRight
        );
        break;
      case '4x1':
        transform4Columns(
          viewports,
          larghezzaMonitorPrimario,
          eccedenzaLarghezzaMonitorSecondario,
          fromLeftToRight
        );
        break;
      case '4x2':
        transform4Columns(
          viewports,
          larghezzaMonitorPrimario,
          eccedenzaLarghezzaMonitorSecondario,
          fromLeftToRight
        );
        break;
      case '4x3':
        transform4Columns(
          viewports,
          larghezzaMonitorPrimario,
          eccedenzaLarghezzaMonitorSecondario,
          fromLeftToRight
        );
        break;
    }
  }
}

function sistemaToolbar(
  larghezzaMonitorPrimario,
  eccedenzaLarghezzaMonitorSecondario,
  fromLeftToRight
) {
  const toolbarSuperiore = document.querySelector('.nolex-bar');
  const toolbarSuperioreRelative = document.querySelector('.nolex-bar .relative');
  toolbarSuperioreRelative.style.width = larghezzaMonitorPrimario - 13 + 'px';
  const logo = document.querySelector('.logo');
  const divInfoPaziente = document.querySelector('.div-info-paziente');

  const toolbarSoliStrumenti = document.querySelector('.toolbar-child-flex');
  toolbarSoliStrumenti.style.transform = 'scale(0.8)';
  toolbarSoliStrumenti.style.flexWrap = 'wrap';
  logo.style.position = 'relative';
  logo.style.top = '20px';
  if (larghezzaMonitorPrimario > 1300) {
    toolbarSuperiore.style.height = 'auto';
    toolbarSoliStrumenti.style.top = 0;
    toolbarSoliStrumenti.style.transform = 'scale(1)';
    toolbarSoliStrumenti.style.flexWrap = 'nowrap';
    logo.style.top = 0;
    divInfoPaziente.style.marginTop = 0;
  }
  if (larghezzaMonitorPrimario <= 1300) {
    toolbarSuperiore.style.height = '90px';
    toolbarSoliStrumenti.style.top = '23px';
    divInfoPaziente.style.marginTop = '23px';
  }
  if (larghezzaMonitorPrimario <= 915) {
    toolbarSuperiore.style.height = '136px';
    toolbarSoliStrumenti.style.top = '45px';
    divInfoPaziente.style.marginTop = '45px';
  }

  if (!fromLeftToRight) {
    toolbarSuperioreRelative.style.left = eccedenzaLarghezzaMonitorSecondario + 'px';
  } else {
    toolbarSuperioreRelative.style.left = 0;
  }
}

function transformStoricoIframe(
  viewports,
  larghezzaMonitorPrimario,
  eccedenzaLarghezzaMonitorSecondario,
  fromLeftToRight
) {
  const studioPrincipale = document.querySelector('.nolex-main-area');
  const iframeStorico = document.getElementById('iframe-storico');
  iframeStorico.style.position = 'absolute';
  //Ripristino la larghezza corrette delle viewport dello studio principale in base al layout griglia
  if (!document.body.classList.contains('storico-same-tab')) {
    ripristinoVisualizzazioneSuUnMonitor();
  }

  //Da SX Verso DX
  if (fromLeftToRight) {
    //Se non ho abbastanza eccedenza lascio tutto su un solo monitor
    studioPrincipale.style.left = 0;
    if (eccedenzaLarghezzaMonitorSecondario < 600) {
      studioPrincipale.style.width = larghezzaMonitorPrimario / 2 + 'px';
      iframeStorico.style.left = 'auto';
      iframeStorico.style.position = 'relative';
      iframeStorico.style.width = larghezzaMonitorPrimario / 2 - 10 + 'px';
      return;
    }
    //Sistemo studio principale
    studioPrincipale.style.width = '100%';
    studioPrincipale.style.maxWidth = larghezzaMonitorPrimario - 8 + 'px';
    //Sistemo iframe
    iframeStorico.style.width = eccedenzaLarghezzaMonitorSecondario + 'px';
    iframeStorico.style.left = '0';
  }
  //Da DX Verso SX
  else {
    studioPrincipale.style.left = '0';
    studioPrincipale.style.width = eccedenzaLarghezzaMonitorSecondario - 13 + 'px';
    iframeStorico.style.width = larghezzaMonitorPrimario + 5 + 'px';
    iframeStorico.style.left = '0';
  }
}

function transform1Column(
  viewports,
  larghezzaMonitorPrimario,
  eccedenzaLarghezzaMonitorSecondario,
  fromLeftToRight
) {
  const viewport0 = viewports[0];

  if (fromLeftToRight) {
    viewport0.style.width = larghezzaCorrettaViewportDaSxVersoDx - 13 + 'px';
    viewport0.style.left = 0;
    if (viewports[1]) {
      viewports[1].style.width = larghezzaCorrettaViewportDaSxVersoDx - 13 + 'px';
      viewports[1].style.left = 0;
    }
    if (viewports[2]) {
      viewports[2].style.width = larghezzaCorrettaViewportDaSxVersoDx - 13 + 'px';
      viewports[2].style.left = 0;
    }
  }
  //Da destra verso sinistra, solo se nel monitor a sx c'è almeno visibile il pannello sx altrimenti non applico nulla
  else if (eccedenzaLarghezzaMonitorSecondario > larghezzaPannelloSX) {
    const posizioneCorretta = eccedenzaLarghezzaMonitorSecondario - larghezzaPannelloSX;
    viewport0.style.left = posizioneCorretta - 10 + 'px';
    viewport0.style.width = larghezzaCorrettaViewportDaDxVersoSx - 3 + 'px';
    if (viewports[1]) {
      viewports[1].style.left = posizioneCorretta - 10 + 'px';
      viewports[1].style.width = larghezzaCorrettaViewportDaDxVersoSx - 3 + 'px';
    }
    if (viewports[2]) {
      viewports[2].style.left = posizioneCorretta - 10 + 'px';
      viewports[2].style.width = larghezzaCorrettaViewportDaDxVersoSx - 3 + 'px';
    }
  } else {
    ripristinoVisualizzazioneSuUnMonitor();
  }
}

function transform2Columns(
  viewports,
  larghezzaMonitorPrimario,
  eccedenzaLarghezzaMonitorSecondario,
  fromLeftToRight
) {
  const viewport0 = viewports[0];
  //Da sinistra verso destra
  if (fromLeftToRight) {
    //2x1

    viewport0.style.width = larghezzaCorrettaViewportDaSxVersoDx - 13 + 'px';
    //Sistemo la seconda viewport
    if (viewports[1]) {
      viewports[1].style.width = eccedenzaLarghezzaMonitorSecondario - 32 + 'px';
      viewports[1].style.left = larghezzaMonitorPrimario - 289 + 'px';
    }

    //2x2
    if (viewports[2]) {
      viewports[2].style.width = larghezzaCorrettaViewportDaSxVersoDx - 13 + 'px';
    }
    if (viewports[3]) {
      viewports[3].style.width = eccedenzaLarghezzaMonitorSecondario - 32 + 'px';
      viewports[3].style.left = larghezzaMonitorPrimario - 289 + 'px';
    }
    //2x3
    if (viewports[4]) {
      viewports[4].style.width = larghezzaCorrettaViewportDaSxVersoDx - 13 + 'px';
    }
    if (viewports[5]) {
      viewports[5].style.width = eccedenzaLarghezzaMonitorSecondario - 32 + 'px';
      viewports[5].style.left = larghezzaMonitorPrimario - 289 + 'px';
    }
  }
  //Da destra verso sinistra, solo se nel monitor a sx c'è almeno visibile il pannello sx altrimenti non applico nulla
  else if (eccedenzaLarghezzaMonitorSecondario > larghezzaPannelloSX) {
    //2x1
    viewport0.style.left = 0;
    viewport0.style.width = eccedenzaLarghezzaMonitorSecondario - larghezzaPannelloSX - 13 + 'px';
    if (viewports[1]) {
      viewports[1].style.width = larghezzaMonitorPrimario - larghezzaPannelloDX - 13 + 'px';
      viewports[1].style.left = eccedenzaLarghezzaMonitorSecondario - 289 + 'px';
    }

    //2x2
    if (viewports[2]) {
      viewports[2].style.left = 0;
      viewports[2].style.width =
        eccedenzaLarghezzaMonitorSecondario - larghezzaPannelloSX - 13 + 'px';
    }
    if (viewports[3]) {
      viewports[3].style.width = larghezzaMonitorPrimario - larghezzaPannelloDX - 13 + 'px';
      viewports[3].style.left = eccedenzaLarghezzaMonitorSecondario - 289 + 'px';
    }
    //2x3
    if (viewports[4]) {
      viewports[4].style.left = 0;
      viewports[4].style.width =
        eccedenzaLarghezzaMonitorSecondario - larghezzaPannelloSX - 13 + 'px';
    }
    if (viewports[5]) {
      viewports[5].style.width = larghezzaMonitorPrimario - larghezzaPannelloDX - 13 + 'px';
      viewports[5].style.left = eccedenzaLarghezzaMonitorSecondario - 289 + 'px';
    }
  } else {
    ripristinoVisualizzazioneSuUnMonitor();
  }
}

function transform3Columns(
  viewports,
  larghezzaMonitorPrimario,
  eccedenzaLarghezzaMonitorSecondario,
  fromLeftToRight
) {
  //3x1
  const viewport0 = viewports[0];
  if (fromLeftToRight) {
    //3x1
    viewport0.style.width = (larghezzaCorrettaViewportDaSxVersoDx - 13) / 2 + 'px';
    //Sistemo la seconda viewport
    if (viewports[1]) {
      viewports[1].style.width = (larghezzaCorrettaViewportDaSxVersoDx - 13) / 2 + 'px';
      viewports[1].style.left = larghezzaMonitorPrimario / 2 - 146.5 + 'px';
    }

    //Sistemo la terza viewport
    if (viewports[2]) {
      viewports[2].style.width = eccedenzaLarghezzaMonitorSecondario - 32 + 'px';
      viewports[2].style.left = larghezzaMonitorPrimario - 289 + 'px';
    }


    //3x2
    if (viewports[3]) {
      viewports[3].style.width = (larghezzaCorrettaViewportDaSxVersoDx - 13) / 2 + 'px';
    }
    if (viewports[4]) {
      viewports[4].style.width = (larghezzaCorrettaViewportDaSxVersoDx - 13) / 2 + 'px';
      viewports[4].style.left = larghezzaMonitorPrimario / 2 - 146.5 + 'px';
    }
    if (viewports[5]) {
      viewports[5].style.width = eccedenzaLarghezzaMonitorSecondario - 32 + 'px';
      viewports[5].style.left = larghezzaMonitorPrimario - 289 + 'px';
    }

    //3x2 layout particolare MPR - Volume 3D principale in alto
    if (
      document.body.classList.contains('hp-mpr-active') &&
      document.body.classList.contains('main3D')
    ) {
      viewport0.style.left = 0;
      viewport0.style.width = larghezzaCorrettaViewportDaSxVersoDx - 13 + 'px';
    }

    //3x2 layout particolare MPR - Piano assiale primario
    if (
      document.body.classList.contains('hp-mpr-active') &&
      document.body.classList.contains('primaryAxial')
    ) {
      viewport0.style.width = larghezzaCorrettaViewportDaSxVersoDx - 13 + 'px';
      if (viewports[1]) {
        viewports[1].style.width = eccedenzaLarghezzaMonitorSecondario - 32 + 'px';
        viewports[1].style.left = larghezzaMonitorPrimario - 289 + 'px';
      }

      if (viewports[2]) {
        viewports[2].style.width = eccedenzaLarghezzaMonitorSecondario - 32 + 'px';
        viewports[2].style.left = larghezzaMonitorPrimario - 289 + 'px';
      }


    }

    //3x3
    if (viewports[6]) {
      viewports[6].style.width = (larghezzaCorrettaViewportDaSxVersoDx - 13) / 2 + 'px';
    }
    if (viewports[7]) {
      viewports[7].style.width = (larghezzaCorrettaViewportDaSxVersoDx - 13) / 2 + 'px';
      viewports[7].style.left = larghezzaMonitorPrimario / 2 - 146.5 + 'px';
    }
    if (viewports[8]) {
      viewports[8].style.width = eccedenzaLarghezzaMonitorSecondario - 32 + 'px';
      viewports[8].style.left = larghezzaMonitorPrimario - 289 + 'px';
    }

    //3x3 layout particolare MPR - Volume 3D principale a sx
    if (
      document.body.classList.contains('hp-mpr-active') &&
      document.body.classList.contains('primary3D')
    ) {
      viewport0.style.width = larghezzaCorrettaViewportDaSxVersoDx - 13 + 'px';
      if (viewports[1]) {
        viewports[1].style.width = eccedenzaLarghezzaMonitorSecondario - 32 + 'px';
        viewports[1].style.left = larghezzaMonitorPrimario - 289 + 'px';
      }

      viewports[3].style.width = eccedenzaLarghezzaMonitorSecondario - 32 + 'px';
      viewports[3].style.left = larghezzaMonitorPrimario - 289 + 'px';
    }
  }
  //Da destra verso sinistra, solo se nel monitor a sx c'è almeno visibile il pannello sx altrimenti non applico nulla
  else if (eccedenzaLarghezzaMonitorSecondario > larghezzaPannelloSX) {
    //3x1
    viewport0.style.left = 0;
    viewport0.style.width = eccedenzaLarghezzaMonitorSecondario - larghezzaPannelloSX - 13 + 'px';
    if (viewports[1]) {
      viewports[1].style.width = (larghezzaMonitorPrimario - larghezzaPannelloDX) / 2 + 'px';
      viewports[1].style.left = eccedenzaLarghezzaMonitorSecondario - 289 + 'px';
    }

    if (viewports[2]) {
      viewports[2].style.width = (larghezzaMonitorPrimario - larghezzaPannelloDX) / 2 - 13 + 'px';
      viewports[2].style.left =
        eccedenzaLarghezzaMonitorSecondario -
        289 +
        (larghezzaMonitorPrimario - larghezzaPannelloDX) / 2 +
        'px';
    }

    //3x2
    if (viewports[3]) {
      viewports[3].style.left = 0;
      viewports[3].style.width =
        eccedenzaLarghezzaMonitorSecondario - larghezzaPannelloSX - 13 + 'px';
    }
    if (viewports[4]) {
      viewports[4].style.width = (larghezzaMonitorPrimario - larghezzaPannelloDX) / 2 + 'px';
      viewports[4].style.left = eccedenzaLarghezzaMonitorSecondario - 289 + 'px';
    }
    if (viewports[5]) {
      viewports[5].style.width = (larghezzaMonitorPrimario - larghezzaPannelloDX) / 2 - 13 + 'px';
      viewports[5].style.left =
        eccedenzaLarghezzaMonitorSecondario -
        289 +
        (larghezzaMonitorPrimario - larghezzaPannelloDX) / 2 +
        'px';
    }

    //3x2 layout particolare MPR - Volume 3D principale in alto
    if (
      document.body.classList.contains('hp-mpr-active') &&
      document.body.classList.contains('main3D')
    ) {
      const posizioneCorretta = eccedenzaLarghezzaMonitorSecondario - larghezzaPannelloSX;
      viewport0.style.left = posizioneCorretta - 10 + 'px';
      viewport0.style.width = larghezzaCorrettaViewportDaDxVersoSx - 3 + 'px';
    }

    //3x2 layout particolare MPR - Piano assiale primario
    if (
      document.body.classList.contains('hp-mpr-active') &&
      document.body.classList.contains('primaryAxial')
    ) {
      viewport0.style.left = 0;
      viewport0.style.width = eccedenzaLarghezzaMonitorSecondario - larghezzaPannelloSX - 13 + 'px';
      if (viewports[1]) {
        viewports[1].style.width = larghezzaMonitorPrimario - larghezzaPannelloDX - 13 + 'px';
        viewports[1].style.left = eccedenzaLarghezzaMonitorSecondario - 289 + 'px';
      }

      if (viewports[2]) {
        viewports[2].style.width = larghezzaMonitorPrimario - larghezzaPannelloDX - 13 + 'px';
        viewports[2].style.left = eccedenzaLarghezzaMonitorSecondario - 289 + 'px';
      }


    }

    //3x3
    if (viewports[6]) {
      viewports[6].style.left = 0;
      viewports[6].style.width =
        eccedenzaLarghezzaMonitorSecondario - larghezzaPannelloSX - 13 + 'px';
    }
    if (viewports[7]) {
      viewports[7].style.width = (larghezzaMonitorPrimario - larghezzaPannelloDX) / 2 + 'px';
      viewports[7].style.left = eccedenzaLarghezzaMonitorSecondario - 289 + 'px';
    }
    if (viewports[8]) {
      viewports[8].style.width = (larghezzaMonitorPrimario - larghezzaPannelloDX) / 2 - 13 + 'px';
      viewports[8].style.left =
        eccedenzaLarghezzaMonitorSecondario -
        289 +
        (larghezzaMonitorPrimario - larghezzaPannelloDX) / 2 +
        'px';
    }

    //3x3 layout particolare MPR - Volume 3D principale a sx
    if (
      document.body.classList.contains('hp-mpr-active') &&
      document.body.classList.contains('primary3D')
    ) {
      viewport0.style.left = 0;
      viewport0.style.width = eccedenzaLarghezzaMonitorSecondario - larghezzaPannelloSX - 13 + 'px';
      if (viewports[1]) {
        viewports[1].style.width = larghezzaMonitorPrimario - larghezzaPannelloDX - 13 + 'px';
        viewports[1].style.left = eccedenzaLarghezzaMonitorSecondario - 289 + 'px';
      }

      if (viewports[2]) {
        viewports[2].style.width = larghezzaMonitorPrimario - larghezzaPannelloDX - 13 + 'px';
        viewports[2].style.left = eccedenzaLarghezzaMonitorSecondario - 289 + 'px';
      }


      if (viewports[3]) {
        viewports[3].style.width = larghezzaMonitorPrimario - larghezzaPannelloDX - 13 + 'px';
        viewports[3].style.left = eccedenzaLarghezzaMonitorSecondario - 289 + 'px';
      }

    }
  } else {
    ripristinoVisualizzazioneSuUnMonitor();
  }
}

function transform4Columns(
  viewports,
  larghezzaMonitorPrimario,
  eccedenzaLarghezzaMonitorSecondario,
  fromLeftToRight
) {
  const viewport0 = viewports[0];
  if (fromLeftToRight) {
    //METTO TRE A SX E DUE A DX
    //4x1
    viewport0.style.width = (larghezzaCorrettaViewportDaSxVersoDx - 13) / 3 + 'px';
    //Sistemo la seconda viewport
    if (viewports[1]) {
      viewports[1].style.width = (larghezzaCorrettaViewportDaSxVersoDx - 13) / 3 + 'px';
      viewports[1].style.left = larghezzaMonitorPrimario / 3 - 98 + 'px';
    }

    //Sistemo la terza viewport
    if (viewports[2]) {
      viewports[2].style.width = (larghezzaCorrettaViewportDaSxVersoDx - 13) / 3 + 'px';
      viewports[2].style.left = larghezzaMonitorPrimario / 1.5 - 196 + 'px';
    }

    //Sistemo la quarta viewport
    if (viewports[3]) {
      viewports[3].style.width = eccedenzaLarghezzaMonitorSecondario - 32 + 'px';
      viewports[3].style.left = larghezzaMonitorPrimario - 289 + 'px';
    }

    //4x2
    if (viewports[4]) {
      viewports[4].style.width = (larghezzaCorrettaViewportDaSxVersoDx - 13) / 3 + 'px';
    }
    if (viewports[5]) {
      viewports[5].style.width = (larghezzaCorrettaViewportDaSxVersoDx - 13) / 3 + 'px';
      viewports[5].style.left = larghezzaMonitorPrimario / 3 - 98 + 'px';
    }
    if (viewports[6]) {
      viewports[6].style.width = (larghezzaCorrettaViewportDaSxVersoDx - 13) / 3 + 'px';
      viewports[6].style.left = larghezzaMonitorPrimario / 1.5 - 196 + 'px';
    }
    if (viewports[7]) {
      viewports[7].style.width = eccedenzaLarghezzaMonitorSecondario - 32 + 'px';
      viewports[7].style.left = larghezzaMonitorPrimario - 289 + 'px';
    }

    //4x3

    if (viewports[8]) {
      viewports[8].style.width = (larghezzaCorrettaViewportDaSxVersoDx - 13) / 3 + 'px';
    }
    if (viewports[9]) {
      viewports[9].style.width = (larghezzaCorrettaViewportDaSxVersoDx - 13) / 3 + 'px';
      viewports[9].style.left = larghezzaMonitorPrimario / 3 - 98 + 'px';
    }
    if (viewports[10]) {
      viewports[10].style.width = (larghezzaCorrettaViewportDaSxVersoDx - 13) / 3 + 'px';
      viewports[10].style.left = larghezzaMonitorPrimario / 1.5 - 196 + 'px';
    }
    if (viewports[11]) {
      viewports[11].style.width = eccedenzaLarghezzaMonitorSecondario - 32 + 'px';
      viewports[11].style.left = larghezzaMonitorPrimario - 289 + 'px';
    }
  }
  //Da destra verso sinistra, solo se nel monitor a sx c'è almeno visibile il pannello sx altrimenti non applico nulla
  else if (eccedenzaLarghezzaMonitorSecondario > larghezzaPannelloSX) {
    //4x1
    viewport0.style.left = 0;
    viewport0.style.width = eccedenzaLarghezzaMonitorSecondario - larghezzaPannelloSX - 13 + 'px';
    if (viewports[1]) {
      viewports[1].style.width = (larghezzaMonitorPrimario - larghezzaPannelloDX) / 3 + 'px';
      viewports[1].style.left = eccedenzaLarghezzaMonitorSecondario - 289 + 'px';
    }

    if (viewports[2]) {
      viewports[2].style.width = (larghezzaMonitorPrimario - larghezzaPannelloDX) / 3 - 3 + 'px';
      viewports[2].style.left =
        eccedenzaLarghezzaMonitorSecondario -
        289 +
        (larghezzaMonitorPrimario - larghezzaPannelloDX) / 3 +
        'px';
    }

    if (viewports[3]) {
      viewports[3].style.width = (larghezzaMonitorPrimario - larghezzaPannelloDX) / 3 - 3 + 'px';
      viewports[3].style.left =
        parseFloat(viewports[2].style.left) + parseFloat(viewports[2].style.width) + 'px';
    }


    //4x2
    if (viewports[4]) {
      viewports[4].style.left = 0;
      viewports[4].style.width =
        eccedenzaLarghezzaMonitorSecondario - larghezzaPannelloSX - 13 + 'px';
    }
    if (viewports[5]) {
      viewports[5].style.width = (larghezzaMonitorPrimario - larghezzaPannelloDX) / 3 + 'px';
      viewports[5].style.left = eccedenzaLarghezzaMonitorSecondario - 289 + 'px';
    }
    if (viewports[6]) {
      viewports[6].style.width = (larghezzaMonitorPrimario - larghezzaPannelloDX) / 3 - 3 + 'px';
      viewports[6].style.left =
        eccedenzaLarghezzaMonitorSecondario -
        289 +
        (larghezzaMonitorPrimario - larghezzaPannelloDX) / 3 +
        'px';
    }
    if (viewports[7]) {
      viewports[7].style.width = (larghezzaMonitorPrimario - larghezzaPannelloDX) / 3 - 3 + 'px';
      viewports[7].style.left =
        parseFloat(viewports[2].style.left) + parseFloat(viewports[2].style.width) + 'px';
    }

    //4x3

    if (viewports[8]) {
      viewports[8].style.left = 0;
      viewports[8].style.width =
        eccedenzaLarghezzaMonitorSecondario - larghezzaPannelloSX - 13 + 'px';
    }
    if (viewports[9]) {
      viewports[9].style.width = (larghezzaMonitorPrimario - larghezzaPannelloDX) / 3 + 'px';
      viewports[9].style.left = eccedenzaLarghezzaMonitorSecondario - 289 + 'px';
    }
    if (viewports[10]) {
      viewports[10].style.width = (larghezzaMonitorPrimario - larghezzaPannelloDX) / 3 - 3 + 'px';
      viewports[10].style.left =
        eccedenzaLarghezzaMonitorSecondario -
        289 +
        (larghezzaMonitorPrimario - larghezzaPannelloDX) / 3 +
        'px';
    }
    if (viewports[11]) {
      viewports[11].style.width = (larghezzaMonitorPrimario - larghezzaPannelloDX) / 3 - 3 + 'px';
      viewports[11].style.left =
        parseFloat(viewports[2].style.left) + parseFloat(viewports[2].style.width) + 'px';
    }
  } else {
    ripristinoVisualizzazioneSuUnMonitor();
  }

  //METTO DUE A SX E DUE A DX
  if (eccedenzaLarghezzaMonitorSecondario > 450) {
    if (fromLeftToRight) {
      //4x1
      viewport0.style.width = (larghezzaCorrettaViewportDaSxVersoDx - 13) / 2 + 'px';
      //Sistemo la seconda viewport
      if (viewports[1]) {
        viewports[1].style.width = (larghezzaCorrettaViewportDaSxVersoDx - 13) / 2 + 'px';
        viewports[1].style.left = larghezzaMonitorPrimario / 2 - 146.5 + 'px';
      }

      //Sistemo la terza viewport
      if (viewports[2]) {
        viewports[2].style.width = (eccedenzaLarghezzaMonitorSecondario - 32) / 2 + 'px';
        viewports[2].style.left = larghezzaMonitorPrimario - 289 + 'px';
      }

      //Sistemo la quarta viewport
      if (viewports[3]) {
        viewports[3].style.width = (eccedenzaLarghezzaMonitorSecondario - 32) / 2 + 'px';
        viewports[3].style.left =
          larghezzaMonitorPrimario - 306 + eccedenzaLarghezzaMonitorSecondario / 2 + 'px';
      }


      //4x2
      if (viewports[4]) {
        viewports[4].style.width = (larghezzaCorrettaViewportDaSxVersoDx - 13) / 2 + 'px';
      }
      if (viewports[5]) {
        viewports[5].style.width = (larghezzaCorrettaViewportDaSxVersoDx - 13) / 2 + 'px';
        viewports[5].style.left = larghezzaMonitorPrimario / 2 - 146.5 + 'px';
      }
      if (viewports[6]) {
        viewports[6].style.width = (eccedenzaLarghezzaMonitorSecondario - 32) / 2 + 'px';
        viewports[6].style.left = larghezzaMonitorPrimario - 289 + 'px';
      }
      if (viewports[7]) {
        viewports[7].style.width = (eccedenzaLarghezzaMonitorSecondario - 32) / 2 + 'px';
        viewports[7].style.left =
          larghezzaMonitorPrimario - 306 + eccedenzaLarghezzaMonitorSecondario / 2 + 'px';
      }

      //4x3

      if (viewports[8]) {
        viewports[8].style.width = (larghezzaCorrettaViewportDaSxVersoDx - 13) / 2 + 'px';
      }
      if (viewports[9]) {
        viewports[9].style.width = (larghezzaCorrettaViewportDaSxVersoDx - 13) / 2 + 'px';
        viewports[9].style.left = larghezzaMonitorPrimario / 2 - 146.5 + 'px';
      }
      if (viewports[10]) {
        viewports[10].style.width = (eccedenzaLarghezzaMonitorSecondario - 32) / 2 + 'px';
        viewports[10].style.left = larghezzaMonitorPrimario - 289 + 'px';
      }
      if (viewports[11]) {
        viewports[11].style.width = (eccedenzaLarghezzaMonitorSecondario - 32) / 2 + 'px';
        viewports[11].style.left =
          larghezzaMonitorPrimario - 306 + eccedenzaLarghezzaMonitorSecondario / 2 + 'px';
      }
    }
  } else if (eccedenzaLarghezzaMonitorSecondario > larghezzaPannelloSX) {
    //Da implementare due colonne a dx e due a sx per espansione da monitor dx a monitor sx
  } else {
    ripristinoVisualizzazioneSuUnMonitor();
  }
}

export { riadattaFinestraSuPiuMonitor };
