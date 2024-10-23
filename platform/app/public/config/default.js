/** @type {AppTypes.Config} */
// @ts-ignore
let prefetch = new URLSearchParams(new URL(window.location.href).search).get('prefetch');
let dicomLoad = new URLSearchParams(new URL(window.location.href).search).get('dicomload');
let hdnDicomLoad = new URLSearchParams(new URL(window.location.href).search).get('fZG');
const modality = new URLSearchParams(new URL(window.location.href).search).get('Modality');
window.nolexStudyInstanceUIDs = new URLSearchParams(new URL(window.location.href).search).get(
  'StudyInstanceUIDs'
);
window.nolexStudyDescription = new URLSearchParams(new URL(window.location.href).search).get(
  'StudyDescription'
);
window.nolexModality = new URLSearchParams(new URL(window.location.href).search).get('Modality');
window.nolexAETitle = new URLSearchParams(new URL(window.location.href).search).get('aetitle');
window.nolexUsername = new URLSearchParams(new URL(window.location.href).search).get('User');
window.nolexToken = new URLSearchParams(new URL(window.location.href).search).get('Token');
let origin = window.location.origin;

window.isSuite = false;
window.storicoRemoto = false;
window.portableVersion = false;

let qidoRoot = `${origin}/viewer/qido`;
let wadoRoot = `${origin}/viewer/wado`;
if (window.isSuite) {
  qidoRoot = 'https://suite.nolex.it/viewer/qido';
  wadoRoot = 'https://suite.nolex.it/viewer/wado';
}

window.qidoUrl = qidoRoot;

//Fix vecchio link
if (
  window.location.href.includes('&study=') ||
  window.location.href.includes('&hangingProtocolId=nolexhp')
) {
  let newUrl = window.location.href;
  // newUrl = newUrl.replace('https://test2.nolex.it/', 'http://195.231.5.156/') ;
  newUrl = newUrl.replace('&study', '&StudyInstanceUIDs');
  newUrl = newUrl.replace(/&hangingProtocolId=nolexhp/g, '');
  window.location.href = newUrl;
}

window.config = {
  //routerBasename: '/viewer',
  routerBasename: `${window.portableVersion ? '/' : '/nolexviewer'}`,
  // whiteLabeling: {},
  extensions: [],
  modes: [],
  customizationService: {},
  showStudyList: false,
  // some windows systems have issues with more than 3 web workers
  maxNumberOfWebWorkers: 3,
  // below flag is for performance reasons, but it might not work for all servers
  showWarningMessageForCrossOrigin: false,
  showCPUFallbackMessage: true,
  showLoadingIndicator: true,
  experimentalStudyBrowserSort: false,
  strictZSpacingForVolumeViewport: true,
  useSharedArrayBuffer: `${origin.includes('https') ? 'TRUE' : 'FALSE'}`,
  groupEnabledModesFirst: true,
  useExperimentalUI: true,
  maxNumRequests: {
    interaction: 100,
    thumbnail: 75,
    // Prefetch number is dependent on the http protocol. For http 2 or
    // above, the number of requests can be go a lot higher.
    // prefetch: prefetch ? prefetch : 25,
    prefetch: prefetch ? prefetch : 5,
  },
  // filterQueryParam: false,
  defaultDataSourceName: 'dicomweb',
  /* Dynamic config allows user to pass "configUrl" query string this allows to load config without recompiling application. The regex will ensure valid configuration source */
  // dangerouslyUseDynamicConfig: {
  //   enabled: true,
  //    // regex will ensure valid configuration source and default is /.*/ which matches any character. To use this, setup your own regex to choose a specific source of configuration only.
  //   //  Example 1, to allow numbers and letters in an absolute or sub-path only.
  //   // regex: /(0-9A-Za-z.]+)(\/[0-9A-Za-z.]+)*/
  //   // Example 2, to restricts to either hosptial.com or othersite.com.
  //   // regex: /(https:\/\/hospital.com(\/[0-9A-Za-z.]+)*)|(https:\/\/othersite.com(\/[0-9A-Za-z.]+)*)/
  //   regex: /.*/,
  // },
  dataSources: [
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
      sourceName: 'dicomweb',
      configuration: {
        friendlyName: 'AWS S3 Static wado server',
        name: 'aws',
        // qidoRoot: 'https://suite.nolex.it/viewer/qido',
        // qidoRoot: 'http://195.231.5.156:8080/viewer/qido',
        qidoRoot: qidoRoot,
        // wadoRoot: 'https://suite.nolex.it/viewer/wado',
        // wadoRoot: 'http://195.231.5.156:8080/viewer/wado',
        wadoRoot: wadoRoot,
        qidoSupportsIncludeField: false,
        imageRendering: 'wadors',
        thumbnailRendering: 'wadors',
        enableStudyLazyLoad: false,
        supportsFuzzyMatching: false,
        supportsWildcard: true,
        staticWado: true,
        singlepart: 'bulkdata,video',
        // whether the data source should use retrieveBulkData to grab metadata,
        // and in case of relative path, what would it be relative to, options
        // are in the series level or study level (some servers like series some study)
        bulkDataURI: {
          enabled: true,
          relativeResolution: 'studies',
          transform: url => url.replace('/pixeldata.mp4', '/rendered'),
        },
        omitQuotationForMultipartRequest: true,
      },
    },
    // {
    //   namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
    //   sourceName: 'dicomweb',
    //   configuration: {
    //     friendlyName: 'AWS S3 Static wado server',
    //     name: 'aws',
    //     wadoUriRoot: 'https://d33do7qe4w26qo.cloudfront.net/dicomweb',
    //     qidoRoot: 'https://d33do7qe4w26qo.cloudfront.net/dicomweb',
    //     wadoRoot: 'https://d33do7qe4w26qo.cloudfront.net/dicomweb',
    //     qidoSupportsIncludeField: false,
    //     imageRendering: 'wadors',
    //     thumbnailRendering: 'wadors',
    //     enableStudyLazyLoad: true,
    //     supportsFuzzyMatching: false,
    //     supportsWildcard: true,
    //     staticWado: true,
    //     singlepart: 'bulkdata,video',
    //     // whether the data source should use retrieveBulkData to grab metadata,
    //     // and in case of relative path, what would it be relative to, options
    //     // are in the series level or study level (some servers like series some study)
    //     bulkDataURI: {
    //       enabled: true,
    //       relativeResolution: 'studies',
    //       transform: url => url.replace('/pixeldata.mp4', '/rendered'),
    //     },
    //     omitQuotationForMultipartRequest: true,
    //   },
    // },
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
      sourceName: 'ohif2',
      configuration: {
        friendlyName: 'AWS S3 Static wado secondary server',
        name: 'aws',
        wadoUriRoot: 'https://dd14fa38qiwhyfd.cloudfront.net/dicomweb',
        qidoRoot: 'https://dd14fa38qiwhyfd.cloudfront.net/dicomweb',
        wadoRoot: 'https://dd14fa38qiwhyfd.cloudfront.net/dicomweb',
        qidoSupportsIncludeField: false,
        supportsReject: false,
        imageRendering: 'wadors',
        thumbnailRendering: 'wadors',
        enableStudyLazyLoad: true,
        supportsFuzzyMatching: false,
        supportsWildcard: true,
        staticWado: true,
        singlepart: 'bulkdata,video',
        // whether the data source should use retrieveBulkData to grab metadata,
        // and in case of relative path, what would it be relative to, options
        // are in the series level or study level (some servers like series some study)
        bulkDataURI: {
          enabled: true,
          relativeResolution: 'studies',
        },
        omitQuotationForMultipartRequest: true,
      },
    },
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
      sourceName: 'ohif3',
      configuration: {
        friendlyName: 'AWS S3 Static wado secondary server',
        name: 'aws',
        wadoUriRoot: 'https://d3t6nz73ql33tx.cloudfront.net/dicomweb',
        qidoRoot: 'https://d3t6nz73ql33tx.cloudfront.net/dicomweb',
        wadoRoot: 'https://d3t6nz73ql33tx.cloudfront.net/dicomweb',
        qidoSupportsIncludeField: false,
        supportsReject: false,
        imageRendering: 'wadors',
        thumbnailRendering: 'wadors',
        enableStudyLazyLoad: true,
        supportsFuzzyMatching: false,
        supportsWildcard: true,
        staticWado: true,
        singlepart: 'bulkdata,video',
        // whether the data source should use retrieveBulkData to grab metadata,
        // and in case of relative path, what would it be relative to, options
        // are in the series level or study level (some servers like series some study)
        bulkDataURI: {
          enabled: true,
          relativeResolution: 'studies',
        },
        omitQuotationForMultipartRequest: true,
      },
    },

    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
      sourceName: 'local5000',
      configuration: {
        friendlyName: 'Static WADO Local Data',
        name: 'DCM4CHEE',
        qidoRoot: 'http://localhost:5000/dicomweb',
        wadoRoot: 'http://localhost:5000/dicomweb',
        qidoSupportsIncludeField: false,
        supportsReject: true,
        supportsStow: true,
        imageRendering: 'wadors',
        thumbnailRendering: 'wadors',
        enableStudyLazyLoad: true,
        supportsFuzzyMatching: false,
        supportsWildcard: true,
        staticWado: true,
        singlepart: 'video',
        bulkDataURI: {
          enabled: true,
          relativeResolution: 'studies',
        },
      },
    },

    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomwebproxy',
      sourceName: 'dicomwebproxy',
      configuration: {
        friendlyName: 'dicomweb delegating proxy',
        name: 'dicomwebproxy',
      },
    },
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomjson',
      sourceName: 'dicomjson',
      configuration: {
        friendlyName: 'dicom json',
        name: 'json',
      },
    },
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomlocal',
      sourceName: 'dicomlocal',
      configuration: {
        friendlyName: 'dicom local',
      },
    },
  ],
  httpErrorHandler: error => {
    window.erroriFetch(error);
    // This is 429 when rejected from the public idc sandbox too often.
    console.warn(error.status);

    // Could use services manager here to bring up a dialog/modal if needed.
    // console.warn('test, navigate to https://ohif.org/');
  },
  whiteLabeling: {
    /* Optional: Should return a React component to be rendered in the "Logo" section of the application's Top Navigation bar */
    createLogoComponentFn: function (React) {
      return React.createElement('img', {
        // src: '../assets/logo_nolex.png',
        src: './assets/logo_nolex.png', //Produzione - build
        className: 'logo',
      });
    },
  },
  hotkeys: [
    {
      commandName: 'incrementActiveViewport',
      label: 'Next Viewport',
      keys: ['right'],
    },
    {
      commandName: 'decrementActiveViewport',
      label: 'Previous Viewport',
      keys: ['left'],
    },
    { commandName: 'rotateViewportCW', label: 'Rotate Right', keys: ['r'] },
    { commandName: 'rotateViewportCCW', label: 'Rotate Left', keys: ['l'] },
    { commandName: 'invertViewport', label: 'Invert', keys: ['i'] },
    {
      commandName: 'flipViewportHorizontal',
      label: 'Flip Horizontally',
      keys: ['h'],
    },
    {
      commandName: 'flipViewportVertical',
      label: 'Flip Vertically',
      keys: ['v'],
    },
    { commandName: 'scaleUpViewport', label: 'Zoom In', keys: ['+'] },
    { commandName: 'scaleDownViewport', label: 'Zoom Out', keys: ['-'] },
    { commandName: 'fitViewportToWindow', label: 'Zoom to Fit', keys: ['='] },
    { commandName: 'resetViewport', label: 'Reset', keys: ['space'] },
    { commandName: 'nextImage', label: 'Next Image', keys: ['down'] },
    { commandName: 'previousImage', label: 'Previous Image', keys: ['up'] },
    // {
    //   commandName: 'previousViewportDisplaySet',
    //   label: 'Previous Series',
    //   keys: ['pagedown'],
    // },
    // {
    //   commandName: 'nextViewportDisplaySet',
    //   label: 'Next Series',
    //   keys: ['pageup'],
    // },
    {
      commandName: 'setToolActive',
      commandOptions: { toolName: 'Zoom' },
      label: 'Zoom',
      keys: ['z'],
    },
    // ~ Window level presets
    {
      commandName: 'windowLevelPreset1',
      label: 'W/L Preset 1',
      keys: ['1'],
    },
    {
      commandName: 'windowLevelPreset2',
      label: 'W/L Preset 2',
      keys: ['2'],
    },
    {
      commandName: 'windowLevelPreset3',
      label: 'W/L Preset 3',
      keys: ['3'],
    },
    {
      commandName: 'windowLevelPreset4',
      label: 'W/L Preset 4',
      keys: ['4'],
    },
    {
      commandName: 'windowLevelPreset5',
      label: 'W/L Preset 5',
      keys: ['5'],
    },
    {
      commandName: 'windowLevelPreset6',
      label: 'W/L Preset 6',
      keys: ['6'],
    },
    {
      commandName: 'windowLevelPreset7',
      label: 'W/L Preset 7',
      keys: ['7'],
    },
    {
      commandName: 'windowLevelPreset8',
      label: 'W/L Preset 8',
      keys: ['8'],
    },
    {
      commandName: 'windowLevelPreset9',
      label: 'W/L Preset 9',
      keys: ['9'],
    },
  ],
  tours: [
    {
      id: 'basicViewerTour',
      route: '/viewer',
      // route: '/null',
      steps: [
        {
          id: 'scroll',
          title: 'Scorrere le Immagini',
          text: 'Puoi scorrere le immagini utilizzando la rotellina del mouse o la barra di scorrimento',
          attachTo: {
            element: '.viewport-element',
            on: 'top',
          },
          advanceOn: {
            selector: '.cornerstone-viewport-element',
            event: 'CORNERSTONE_TOOLS_MOUSE_WHEEL',
          },
          beforeShowPromise: () => waitForElement('.viewport-element'),
        },
        {
          id: 'zoom',
          title: 'Zoomare In e Out',
          text: 'Puoi zoomare sulle immagini utilizzando il clic destro del mouse.',
          attachTo: {
            element: '.viewport-element',
            on: 'left',
          },
          advanceOn: {
            selector: '.cornerstone-viewport-element',
            event: 'CORNERSTONE_TOOLS_MOUSE_UP',
          },
          beforeShowPromise: () => waitForElement('.viewport-element'),
        },
        {
          id: 'pan',
          title: "Spostare l'Immagine",
          text: 'Puoi spostare le immagini utilizzando il clic centrale del mouse.',
          attachTo: {
            element: '.viewport-element',
            on: 'top',
          },
          advanceOn: {
            selector: '.cornerstone-viewport-element',
            event: 'CORNERSTONE_TOOLS_MOUSE_UP',
          },
          beforeShowPromise: () => waitForElement('.viewport-element'),
        },
        {
          id: 'windowing',
          title: 'Regolare il Livello della Finestra',
          text: 'Puoi modificare il livello della finestra utilizzando il clic sinistro del mouse.',
          attachTo: {
            element: '.viewport-element',
            on: 'left',
          },
          advanceOn: {
            selector: '.cornerstone-viewport-element',
            event: 'CORNERSTONE_TOOLS_MOUSE_UP',
          },
          beforeShowPromise: () => waitForElement('.viewport-element'),
        },
        {
          id: 'length',
          title: 'Utilizzo degli Strumenti di Misurazione',
          text: 'Puoi misurare la lunghezza di una regione utilizzando lo strumento Lunghezza.',
          attachTo: {
            element: '[data-cy="MeasurementTools-split-button-primary"]',
            on: 'bottom',
          },
          advanceOn: {
            selector: '[data-cy="MeasurementTools-split-button-primary"]',
            event: 'click',
          },
          beforeShowPromise: () =>
            waitForElement('[data-cy="MeasurementTools-split-button-primary"]'),
        },
        {
          id: 'drawAnnotation',
          title: 'Disegnare Annotazioni di Lunghezza',
          text: 'Usa lo strumento lunghezza sul viewport per misurare la lunghezza di una regione.',
          attachTo: {
            element: '.viewport-element',
            on: 'right',
          },
          advanceOn: {
            selector: 'body',
            event: 'event::measurement_added',
          },
          beforeShowPromise: () => waitForElement('.viewport-element'),
        },
        {
          id: 'openMeasurementPanel',
          title: 'Aprire il Pannello delle Misurazioni',
          text: 'Clicca sul pulsante delle misurazioni per aprire il pannello delle misurazioni.',
          attachTo: {
            element: '#trackedMeasurements-btn',
            on: 'left-start',
          },
          advanceOn: {
            selector: '#trackedMeasurements-btn',
            event: 'click',
          },
          beforeShowPromise: () => waitForElement('#trackedMeasurements-btn'),
        },
        {
          id: 'scrollAwayFromMeasurement',
          title: 'Scorrere Lontano da una Misurazione',
          text: 'Scorri le immagini usando la rotellina del mouse lontano dalla misurazione.',
          attachTo: {
            element: '.viewport-element',
            on: 'left',
          },
          advanceOn: {
            selector: '.cornerstone-viewport-element',
            event: 'CORNERSTONE_TOOLS_MOUSE_WHEEL',
          },
          beforeShowPromise: () => waitForElement('.viewport-element'),
        },
        // {
        //   id: 'jumpToMeasurement',
        //   title: 'Saltare alle Misurazioni nel Pannello',
        //   text: 'Clicca sulla misurazione nel pannello delle misurazioni per saltare ad essa.',
        //   attachTo: {
        //     element: '[data-cy="measurement-item"]',
        //     on: 'left-start',
        //   },
        //   advanceOn: {
        //     selector: '[data-cy="measurement-item"]',
        //     event: 'click',
        //   },
        //   beforeShowPromise: () => waitForElement('[data-cy="measurement-item"]'),
        // },
        {
          id: 'changeLayout',
          title: 'Cambiare il Layout',
          text: 'Puoi cambiare il layout del visualizzatore usando il pulsante di layout.',
          attachTo: {
            element: '[data-cy="Layout"]',
            on: 'bottom',
          },
          advanceOn: {
            selector: '[data-cy="Layout"]',
            event: 'click',
          },
          beforeShowPromise: () => waitForElement('[data-cy="Layout"]'),
        },
        {
          id: 'selectMPRSeries',
          title: 'Selezionare una serie ricostruibile per appicare il Layout MPR',
          text: 'Selezionare una serie ricostruibile per appicare il Layout MPR',
          attachTo: {
            element: '.mpr-thumbnail',
            on: 'left-start',
          },
          advanceOn: {
            selector: '.mpr-thumbnail',
            event: 'click',
          },
          beforeShowPromise: () => waitForElement('.mpr-thumbnail'),
        },
        {
          id: 'selectLayout',
          title: 'Selezionare il Layout MPR',
          text: 'Seleziona il layout MPR per visualizzare le immagini in modalità MPR.',
          attachTo: {
            element: '[data-cy="LayoutMPR"]',
            on: 'left-start',
          },
          advanceOn: {
            selector: '[data-cy="LayoutMPR"]',
            event: 'click',
          },
          beforeShowPromise: () => waitForElement('[data-cy="LayoutMPR"]'),
        },
      ],

      tourOptions: {
        useModalOverlay: true,
        defaultStepOptions: {
          buttons: [
            {
              text: 'Salta tutto',
              action() {
                this.complete();
              },
              secondary: true,
            },
          ],
        },
      },
    },
  ],
};

function waitForElement(selector, maxAttempts = 20, interval = 25) {
  return new Promise(resolve => {
    let attempts = 0;

    const checkForElement = setInterval(() => {
      const element = document.querySelector(selector);

      if (element || attempts >= maxAttempts) {
        clearInterval(checkForElement);
        resolve();
      }

      attempts++;
    }, interval);
  });
}
