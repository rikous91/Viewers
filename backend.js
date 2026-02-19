/************************* Dipendenze ****************************/
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const upload = multer();
const fs = require('fs');
const Jimp = require('jimp');
const dcmjs = require('dcmjs');
const sharp = require('sharp');
const zlib = require('zlib');
const { DicomMetaDictionary, DicomWriter } = require('dcmjs');
const { Console } = require('console');
const os = require('os');
const osu = require('node-os-utils');
const checkDiskSpace = require('check-disk-space').default;
const path = require('path');
/*****************************************************************/

/****************** Parametri di questa stazione *****************/
const port = 8080;
const driveInUso = 'C';
const partizionePACS = 'WEBPACS';
const pathCachedMetadata = './cached-metadata-json';
const pathCachedDICOM = './cached-dicom';
/*****************************************************************/

/****************** EXPRESS *****************/
const app = express();
app.use(cors()); //imposta Allow-Origin' su *,
app.use(express.json()); //Accetta json nella richiesta post
/*****************************************************************/

/************  HTTPS  ***************/
const https = require('https');
// Certificati PEM (chiave privata e certificato)
const privateKey = fs.readFileSync('./cert-https/suite.nolex.it-key.pem', 'utf8');
const certificate = fs.readFileSync('./cert-https/suite.nolex.it-crt.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };

// creo il server HTTPS utilizzando i certificati
const httpsServer = https.createServer(credentials, app);

function formattaData(data) {
  const day = String(data.getDate()).padStart(2, '0');
  const month = String(data.getMonth() + 1).padStart(2, '0');
  const year = data.getFullYear();
  const hours = String(data.getHours()).padStart(2, '0');
  const minutes = String(data.getMinutes()).padStart(2, '0');
  const seconds = String(data.getSeconds()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

const currentDate = new Date();
const formattedDate = formattaData(currentDate);

var defaultJsonData = {
  info: 'Preferenze utente',
  primoAccesso: formattedDate,
  hp: {
    studioSpecifico: {},
    nomeEsame: [
      {
        performanceHP: {
          id: 'nolexhp',
          locked: true,
          name: 'Default',
          createdDate: '2021-02-23T19:22:08.894Z',
          modifiedDate: '2022-10-04T19:22:08.894Z',
          availableTo: {},
          editableBy: {},
          imageLoadStrategy: 'interleaveTopToBottom',
          protocolMatchingRules: [
            {
              // attribute: 'ModalitiesInStudy',
              // constraint: {
              //   contains: ['CT', 'PT'],
              // },
            },
          ],
          displaySetSelectors: {
            DisplaySet0: {
              seriesMatchingRules: [
                {
                  attribute: 'SeriesDescription',
                  constraint: {
                    contains: 'MAMMOGRAM, Diagnosis',
                  },
                },
              ],
            },
            DisplaySet1: {
              seriesMatchingRules: [{}],
            },
            DisplaySet2: {
              seriesMatchingRules: [{}],
            },
            DisplaySet3: {
              seriesMatchingRules: [{}],
            },
            DisplaySet4: {
              seriesMatchingRules: [{}],
            },
            DisplaySet5: {
              seriesMatchingRules: [{}],
            },
            DisplaySet6: {
              seriesMatchingRules: [{}],
            },
            DisplaySet7: {
              seriesMatchingRules: [{}],
            },
            DisplaySet8: {
              seriesMatchingRules: [{}],
            },
            DisplaySet9: {
              seriesMatchingRules: [{}],
            },
            DisplaySet10: {
              seriesMatchingRules: [{}],
            },
            DisplaySet11: {
              seriesMatchingRules: [{}],
            },
            DisplaySet12: {
              seriesMatchingRules: [{}],
            },
            DisplaySet13: {
              seriesMatchingRules: [{}],
            },
            DisplaySet14: {
              seriesMatchingRules: [{}],
            },
            DisplaySet15: {
              seriesMatchingRules: [{}],
            },
          },
          stages: [
            {
              id: 'hYbmMy3b7pz7GLiaT',
              name: 'default',
              viewportStructure: {
                layoutType: 'grid',
                properties: {
                  rows: 1,
                  columns: 3,
                },
              },
              viewports: [
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    initialImageOptions: {
                      index: 3,
                    },
                  },
                  displaySets: [
                    {
                      options: {
                        // colormap: 'hsv',
                        camera: {
                          windowWidth: 5,
                          windowCenter: 2.5,
                        },
                      },
                      id: 'DisplaySet0',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet1',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet2',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet3',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet4',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet5',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet6',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet7',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet8',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet9',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet10',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                    // initialImageOptions: {
                    //   preset: 'middle',
                    // },
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet11',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                    // initialImageOptions: {
                    //   preset: 'middle',
                    // },
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet12',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                    // initialImageOptions: {
                    //   preset: 'middle',
                    // },
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet13',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                    // initialImageOptions: {
                    //   preset: 'middle',
                    // },
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet14',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                    // initialImageOptions: {
                    //   preset: 'middle',
                    // },
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet15',
                    },
                  ],
                },
              ],
              createdDate: '2021-02-23T18:32:42.850Z',
            },
          ],
          numberOfPriorsReferenced: -1,
        },
      },
      {
        studyInstanceUIDs: '',
        nomeEsame: '',
        layoutGriglia: '',
        layoutPersonalizzato: '',
        allineamento: [''], //'left','right,'right','top'
        scalaOverlay: '',
        WL: {},
        camera: {},
        serieSpecifiche: [],
        istanzeSpecifiche: [],
      },
    ],
    modality: [
      {
        performanceHP: {
          id: 'nolexhp',
          locked: true,
          name: 'Default',
          createdDate: '2021-02-23T19:22:08.894Z',
          modifiedDate: '2022-10-04T19:22:08.894Z',
          availableTo: {},
          editableBy: {},
          imageLoadStrategy: 'interleaveTopToBottom',
          protocolMatchingRules: [
            {
              // attribute: 'ModalitiesInStudy',
              // constraint: {
              //   contains: ['CT', 'PT'],
              // },
            },
          ],
          displaySetSelectors: {
            DisplaySet0: {
              seriesMatchingRules: [{}],
            },
            DisplaySet1: {
              seriesMatchingRules: [{}],
            },
            DisplaySet2: {
              seriesMatchingRules: [{}],
            },
            DisplaySet3: {
              seriesMatchingRules: [{}],
            },
            DisplaySet4: {
              seriesMatchingRules: [{}],
            },
            DisplaySet5: {
              seriesMatchingRules: [{}],
            },
            DisplaySet6: {
              seriesMatchingRules: [{}],
            },
            DisplaySet7: {
              seriesMatchingRules: [{}],
            },
            DisplaySet8: {
              seriesMatchingRules: [{}],
            },
            DisplaySet9: {
              seriesMatchingRules: [{}],
            },
            DisplaySet10: {
              seriesMatchingRules: [{}],
            },
            DisplaySet11: {
              seriesMatchingRules: [{}],
            },
            DisplaySet12: {
              seriesMatchingRules: [{}],
            },
            DisplaySet13: {
              seriesMatchingRules: [{}],
            },
            DisplaySet14: {
              seriesMatchingRules: [{}],
            },
            DisplaySet15: {
              seriesMatchingRules: [{}],
            },
          },
          stages: [
            {
              id: 'hYbmMy3b7pz7GLiaT',
              name: 'default',
              viewportStructure: {
                layoutType: 'grid',
                properties: {
                  rows: 2,
                  columns: 2,
                },
              },
              viewports: [
                {
                  viewportOptions: {
                    viewportType: 'stack',
                  },
                  displaySets: [
                    {
                      options: {
                        // colormap: 'hsv',
                      },
                      id: 'DisplaySet0',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet1',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet2',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet3',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet4',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet5',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet6',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet7',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet8',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet9',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet10',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                    // initialImageOptions: {
                    //   preset: 'middle',
                    // },
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet11',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                    // initialImageOptions: {
                    //   preset: 'middle',
                    // },
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet12',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                    // initialImageOptions: {
                    //   preset: 'middle',
                    // },
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet13',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                    // initialImageOptions: {
                    //   preset: 'middle',
                    // },
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet14',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                    // initialImageOptions: {
                    //   preset: 'middle',
                    // },
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet15',
                    },
                  ],
                },
              ],
              createdDate: '2021-02-23T18:32:42.850Z',
            },
          ],
          numberOfPriorsReferenced: -1,
        },
        studyInstanceUIDs: '',
        nomeModality: 'CT',
        layoutGriglia: '2x2',
        layoutPersonalizzato: '',
        allineamento: [''],
        scalaOverlay: '',
        WL: {},
        camera: {},
        serieSpecifiche: [],
        istanzeSpecifiche: [],
      },
      {
        performanceHP: {
          id: 'nolexhp',
          locked: true,
          name: 'Default',
          createdDate: '2021-02-23T19:22:08.894Z',
          modifiedDate: '2022-10-04T19:22:08.894Z',
          availableTo: {},
          editableBy: {},
          imageLoadStrategy: 'interleaveTopToBottom',
          protocolMatchingRules: [
            {
              // attribute: 'ModalitiesInStudy',
              // constraint: {
              //   contains: ['CT', 'PT'],
              // },
            },
          ],
          displaySetSelectors: {
            DisplaySet0: {
              seriesMatchingRules: [{}],
            },
            DisplaySet1: {
              seriesMatchingRules: [{}],
            },
            DisplaySet2: {
              seriesMatchingRules: [{}],
            },
            DisplaySet3: {
              seriesMatchingRules: [{}],
            },
            DisplaySet4: {
              seriesMatchingRules: [{}],
            },
            DisplaySet5: {
              seriesMatchingRules: [{}],
            },
            DisplaySet6: {
              seriesMatchingRules: [{}],
            },
            DisplaySet7: {
              seriesMatchingRules: [{}],
            },
            DisplaySet8: {
              seriesMatchingRules: [{}],
            },
            DisplaySet9: {
              seriesMatchingRules: [{}],
            },
            DisplaySet10: {
              seriesMatchingRules: [{}],
            },
            DisplaySet11: {
              seriesMatchingRules: [{}],
            },
            DisplaySet12: {
              seriesMatchingRules: [{}],
            },
            DisplaySet13: {
              seriesMatchingRules: [{}],
            },
            DisplaySet14: {
              seriesMatchingRules: [{}],
            },
            DisplaySet15: {
              seriesMatchingRules: [{}],
            },
          },
          stages: [
            {
              id: 'hYbmMy3b7pz7GLiaT',
              name: 'default',
              viewportStructure: {
                layoutType: 'grid',
                properties: {
                  rows: 2,
                  columns: 2,
                },
              },
              viewports: [
                {
                  viewportOptions: {
                    viewportType: 'stack',
                  },
                  displaySets: [
                    {
                      options: {
                        // colormap: 'hsv',
                      },
                      id: 'DisplaySet0',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet1',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet2',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet3',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet4',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet5',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet6',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet7',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet8',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet9',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet10',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                    // initialImageOptions: {
                    //   preset: 'middle',
                    // },
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet11',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                    // initialImageOptions: {
                    //   preset: 'middle',
                    // },
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet12',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                    // initialImageOptions: {
                    //   preset: 'middle',
                    // },
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet13',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                    // initialImageOptions: {
                    //   preset: 'middle',
                    // },
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet14',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                    // initialImageOptions: {
                    //   preset: 'middle',
                    // },
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet15',
                    },
                  ],
                },
              ],
              createdDate: '2021-02-23T18:32:42.850Z',
            },
          ],
          numberOfPriorsReferenced: -1,
        },
        nomeModality: 'MG',
        layoutGriglia: '2x2',
        layoutPersonalizzato: '',
        allineamento: [''],
        scalaOverlay: '',
        WL: {},
        camera: {},
        serieSpecifiche: [],
        istanzeSpecifiche: [],
      },
      {
        performanceHP: {
          id: 'nolexhp',
          locked: true,
          name: 'Default',
          createdDate: '2021-02-23T19:22:08.894Z',
          modifiedDate: '2022-10-04T19:22:08.894Z',
          availableTo: {},
          editableBy: {},
          imageLoadStrategy: 'interleaveTopToBottom',
          protocolMatchingRules: [
            {
              // attribute: 'ModalitiesInStudy',
              // constraint: {
              //   contains: ['CT', 'PT'],
              // },
            },
          ],
          displaySetSelectors: {
            DisplaySet0: {
              seriesMatchingRules: [{}],
            },
            DisplaySet1: {
              seriesMatchingRules: [{}],
            },
            DisplaySet2: {
              seriesMatchingRules: [{}],
            },
            DisplaySet3: {
              seriesMatchingRules: [{}],
            },
            DisplaySet4: {
              seriesMatchingRules: [{}],
            },
            DisplaySet5: {
              seriesMatchingRules: [{}],
            },
            DisplaySet6: {
              seriesMatchingRules: [{}],
            },
            DisplaySet7: {
              seriesMatchingRules: [{}],
            },
            DisplaySet8: {
              seriesMatchingRules: [{}],
            },
            DisplaySet9: {
              seriesMatchingRules: [{}],
            },
            DisplaySet10: {
              seriesMatchingRules: [{}],
            },
            DisplaySet11: {
              seriesMatchingRules: [{}],
            },
            DisplaySet12: {
              seriesMatchingRules: [{}],
            },
            DisplaySet13: {
              seriesMatchingRules: [{}],
            },
            DisplaySet14: {
              seriesMatchingRules: [{}],
            },
            DisplaySet15: {
              seriesMatchingRules: [{}],
            },
          },
          stages: [
            {
              id: 'hYbmMy3b7pz7GLiaT',
              name: 'default',
              viewportStructure: {
                layoutType: 'grid',
                properties: {
                  rows: 2,
                  columns: 2,
                },
              },
              viewports: [
                {
                  viewportOptions: {
                    viewportType: 'stack',
                  },
                  displaySets: [
                    {
                      options: {
                        // colormap: 'hsv',
                      },
                      id: 'DisplaySet0',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet1',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet2',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet3',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet4',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet5',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet6',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet7',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet8',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet9',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet10',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                    // initialImageOptions: {
                    //   preset: 'middle',
                    // },
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet11',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                    // initialImageOptions: {
                    //   preset: 'middle',
                    // },
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet12',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                    // initialImageOptions: {
                    //   preset: 'middle',
                    // },
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet13',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                    // initialImageOptions: {
                    //   preset: 'middle',
                    // },
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet14',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                    // initialImageOptions: {
                    //   preset: 'middle',
                    // },
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet15',
                    },
                  ],
                },
              ],
              createdDate: '2021-02-23T18:32:42.850Z',
            },
          ],
          numberOfPriorsReferenced: -1,
        },
        nomeModality: 'MR',
        layoutGriglia: '2x2',
        layoutPersonalizzato: '',
        allineamento: [''],
        scalaOverlay: '',
        WL: {},
        camera: {},
        serieSpecifiche: [],
        istanzeSpecifiche: [],
      },
      {
        performanceHP: {
          id: 'nolexhp',
          locked: true,
          name: 'Default',
          createdDate: '2021-02-23T19:22:08.894Z',
          modifiedDate: '2022-10-04T19:22:08.894Z',
          availableTo: {},
          editableBy: {},
          imageLoadStrategy: 'interleaveTopToBottom',
          protocolMatchingRules: [
            {
              // attribute: 'ModalitiesInStudy',
              // constraint: {
              //   contains: ['CT', 'PT'],
              // },
            },
          ],
          displaySetSelectors: {
            DisplaySet0: {
              seriesMatchingRules: [{}],
            },
            DisplaySet1: {
              seriesMatchingRules: [{}],
            },
            DisplaySet2: {
              seriesMatchingRules: [{}],
            },
            DisplaySet3: {
              seriesMatchingRules: [{}],
            },
            DisplaySet4: {
              seriesMatchingRules: [{}],
            },
            DisplaySet5: {
              seriesMatchingRules: [{}],
            },
            DisplaySet6: {
              seriesMatchingRules: [{}],
            },
            DisplaySet7: {
              seriesMatchingRules: [{}],
            },
            DisplaySet8: {
              seriesMatchingRules: [{}],
            },
            DisplaySet9: {
              seriesMatchingRules: [{}],
            },
            DisplaySet10: {
              seriesMatchingRules: [{}],
            },
            DisplaySet11: {
              seriesMatchingRules: [{}],
            },
            DisplaySet12: {
              seriesMatchingRules: [{}],
            },
            DisplaySet13: {
              seriesMatchingRules: [{}],
            },
            DisplaySet14: {
              seriesMatchingRules: [{}],
            },
            DisplaySet15: {
              seriesMatchingRules: [{}],
            },
          },
          stages: [
            {
              id: 'hYbmMy3b7pz7GLiaT',
              name: 'default',
              viewportStructure: {
                layoutType: 'grid',
                properties: {
                  rows: 2,
                  columns: 1,
                },
              },
              viewports: [
                {
                  viewportOptions: {
                    viewportType: 'stack',
                  },
                  displaySets: [
                    {
                      options: {
                        // colormap: 'hsv',
                      },
                      id: 'DisplaySet0',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet1',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet2',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet3',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet4',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet5',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet6',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet7',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet8',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet9',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet10',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                    // initialImageOptions: {
                    //   preset: 'middle',
                    // },
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet11',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                    // initialImageOptions: {
                    //   preset: 'middle',
                    // },
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet12',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                    // initialImageOptions: {
                    //   preset: 'middle',
                    // },
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet13',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                    // initialImageOptions: {
                    //   preset: 'middle',
                    // },
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet14',
                    },
                  ],
                },
                {
                  viewportOptions: {
                    viewportType: 'stack',
                    orientation: 'sagittal',
                    // initialImageOptions: {
                    //   preset: 'middle',
                    // },
                  },
                  displaySets: [
                    {
                      id: 'DisplaySet15',
                    },
                  ],
                },
              ],
              createdDate: '2021-02-23T18:32:42.850Z',
            },
          ],
          numberOfPriorsReferenced: -1,
        },
        nomeModality: 'US',
        layoutGriglia: '2x1',
        layoutPersonalizzato: '',
        allineamento: [''],
        scalaOverlay: '',
        WL: {},
        camera: {},
        serieSpecifiche: [],
        istanzeSpecifiche: [],
      },
    ],
  },
  visualizzazione: {
    totMonitor: 0,
    modalità: '', //singola o estesa
  },
  mpr: {
    _3d: true,
    view: 'all', //oppure assiale, coronale, sagittale
    crosshair: true,
  },
  toolNascosti: '',
};

app.get('/viewer/userdata/:AETitle', (req, res) => {
  let user = req.query.user; //paramentro user. Es. http://localhost:3000/viewer/userdata/amato?user=123
  const AETitle = req.params.AETitle
  if (!user || user === 'null' || user === 'undefined') {
    return res.status(500).send('User non valido');
  }
  if (user.trim() === '') {
    user = 'eurekaonline'
  }
  if (user.includes('.')) {
    return res.status(500).send('User errato');
  }


  let filePath = `./platform/viewer/public/userdata/${AETitle}/${user}`;

  fs.readFile(`${filePath}/preferenze.json`, (err, data) => {
    console.log('Leggo: ', filePath)
    if (err) {
      // scrivo il JSON sul disco
      defaultJsonData.info = `Preferenze utente: ${user}`;
      jsonString = JSON.stringify(defaultJsonData, null, 2);

      fs.mkdir(filePath, { recursive: true }, err => {
        if (err) {
          console.error(
            'Si è verificato un errore durante la creazione della cartella:',
            err
          );
        } else {
          console.log('Cartella creata con successo.');
          fs.writeFile(`${filePath}/preferenze.json`, jsonString, err => {
            if (err) {
              console.error(
                'Si è verificato un errore durante la scrittura del file JSON:',
                err
              );
              return res
                .status(500)
                .send(
                  'Si è verificato un errore durante la scrittura del file JSON.'
                );
            }

            console.log('File JSON creato e personalizzato con successo!');
            // return res.status(200).send('File JSON creato e personalizzato con successo.');

            // leggo il JSON appena creato
            fs.readFile(`${filePath}/preferenze.json`, (err, newData) => {
              if (err) {
                console.error(
                  'Si è verificato un errore durante la lettura del file JSON:',
                  err
                );
                return res
                  .status(500)
                  .send(
                    'Si è verificato un errore durante la lettura del file JSON.'
                  );
              }

              console.log(
                'File JSON appena creato letto con successo!',
                newData
              );
              return res.status(200).send({
                json: JSON.parse(newData),
                css: null
              });
            });

          });
        }
      });
    } else {
      //Ritorno al readFile
      // console.log('File JSON letto con successo!', data);
      console.log('File JSON letto con successo!');
      // res.send(data);
      //Controllo se per l'utente c'è anche un CSS dedicato
      fs.readFile(`${filePath}/styles.css`, (cssErr, cssData) => {
        if (cssErr) {
          return res.status(200).send({
            json: JSON.parse(data),
            css: null
          });
        } else {
          console.log('CSS trovato')
          return res.status(200).send({
            json: JSON.parse(data),
            css: cssData.toString()
          });
        }
      });
    }
  });
});

app.post('/viewer/userdata/:AETitle', (req, res) => {
  let user = req.query.user; //parametro user. Es. http://localhost:3000/viewer/userdata?User=123
  let userBody = req.body.username; // parametro user dal corpo della richiesta da indicare in fetch post
  const AETitle = req.params.AETitle
  console.log('parametro user passato da url ', user);
  console.log('parametro username passato come richiesta post ', userBody);
  if (user.trim() === '') {
    user = 'eurekaonline'
  }
  if (user.includes('.')) {
    return res.status(500).send('User errato');
  }

  if (userBody.trim() === '') {
    userBody = 'eurekaonline'
  }
  if (!userBody || userBody !== user) {
    return res.status(500).send('User errato');
  }


  let filePath = `./platform/viewer/public/userdata/${AETitle}/${user}`;

  if (!req.body.json) {
    return res.status(500).send('Nella richiesta manca il json');
  }
  let jsonData = req.body.json; 

  let jsonString = JSON.stringify(jsonData, null, 2);

  try {
    fs.writeFileSync(path.join(filePath, 'preferenze.json'), jsonString, 'utf8');

    console.log('File JSON aggiornato con successo!');
    res.status(200).send('File JSON aggiornato con successo.');
  } catch (err) {
    console.error(
      'Si è verificato un errore durante la scrittura del file JSON:',
      err
    );
    res.status(500).send('Si è verificato un errore durante la scrittura del file JSON.');
  }
});

//Quido - Remoto
app.get('/viewer/qido-remoto/studies', async (req, res) => {
  try {
    let queryString = req.url.split('?')[1];
    const aetitle = req.query.aetitle
    console.log('laetitle è ', aetitle)
    if (!queryString || queryString === '') {
      res.status(400).json({ error: 'Devi fornire la query string.' });
      return;
    }

    // console.log(queryString)
    const StudyInstanceUIDs = queryString.split('&StudyInstanceUIDs=')[1] || queryString.split('&StudyInstanceUID=')[1]
    let patientIDQido;
    if (queryString.includes('&limit')) patientIDQido = queryString.split('&limit')[0].replace(/\*/g, "")
    //Il patientID originariamente viene fornito con ** che lo delimitano (es. *2760*) ma ciò comporta la ricerca in tutte le partizioni esistenti,
    //causando problemi in quanto in differenti partizioni ci possono essere uguali patientID col risultato di non visualizzare le serie. Per
    //questo motivo faccio il replace asterischi con replace(/\*/g, "")

    //Funzionamento di questo endpoint: vengono fatte due richiste, la prima non include il patientID e serve ad avere i dettagli sullo studio attuale.
    //La seconda richiesta include il patientID in quanto serve ad avere lo storico richiedendo n studi per patientID. Quando non ho il patientID
    //costruisco l'url con il solo StudyInstanceUIDs, se invece ce l'ho lo includo al posto di StudyInstanceUIDs.

    let apiUrl = `http://127.0.0.1:7000/rs/studies?StudyInstanceUID=${StudyInstanceUIDs}&includefield=00081030` //includefield 00081030 serve
    //ad avere lo studyDescription
    if (patientIDQido) apiUrl = `http://127.0.0.1:7000/rs/studies?${patientIDQido}&includefield=00081030`
    apiUrl = getApiServerRemotoCliente(apiUrl, aetitle)
    if (!apiUrl) {
      console.error('L\'ip del server remoto non è definito')
      return res.status(500).json({ error: 'Storico remoto non configurato' });
    }
    console.log('url qido remoto', apiUrl)
    /*** SE IN UNO STUDIO NON VENGONO VISUALIZZATE TUTTE LE SERIE, POTREBBE DIPENDERE DALLA CHIAMATA CON codiceStudioSpecificoQido
     * PROVARE EVENTUALMENTE A FARE LA SOLA CHIAMATA StudyInstanceUIDs **/

    const apiResponse = await fetch(apiUrl, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
    });

    if (!apiResponse.ok) {
      throw new Error(`Errore nella chiamata API: ${apiResponse.status}`);
    }

    let response = await apiResponse.json();
    // if (response[0]['00100020']) {
    //   const lengthPatientID = response[0]['00100020'].Value.length
    //   if (lengthPatientID > 1) {
    //     response[0]['00100020'].Value = response[0]['00100020'].Value[lengthPatientID - 1]
    //   }
    // }
    res.status(200).send(response);

  } catch (error) {
    console.error('Errore qido: ', error)
    res.status(500).json({ error: 'Errore quido' });
  }
})

//Quido - RS
//Le chiamate vengono fatte al dicomproxy-web sulla porta 7000. Il client chiamerà l'endpoint quido e internamente faccio le chiamate al proxy,
//le risposte le restituisco al client
app.get('/viewer/qido/studies', async (req, res) => {

  try {
    // console.log(req.url)
    let queryString = req.url.split('?')[1];
    const aetitle = req.query.aetitle
    const askWorklist = req.query.askWorklist
    let studyDate=req.query.StudyDate
    const accessionNumber=req.query.AccessionNumber
    const patientID=req.query["00100020"]
    const patientName=req.query.PatientName
    const studyDescription=req.query.StudyDescription
    if(!studyDate) studyDate=getFormattedDate() //data odierna default
    console.log('laetitle è ', aetitle)
    if (!queryString || queryString === '') {
      res.status(400).json({ error: 'Devi fornire la query string.' });
      return;
    }
    // console.log(queryString)
    const StudyInstanceUIDs = queryString.split('&StudyInstanceUIDs=')[1] || queryString.split('&StudyInstanceUID=')[1]
    let patientIDQido;
    if (queryString.includes('&limit')) {
      patientIDQido = queryString.split('&limit')[0].replace(/\*/g, "")
    }
    //Il patientID originariamente viene fornito con ** che lo delimitano (es. *2760*) ma ciò comporta la ricerca in tutte le partizioni esistenti,
    //causando problemi in quanto in differenti partizioni ci possono essere uguali patientID col risultato di non visualizzare le serie. Per
    //questo motivo faccio il replace asterischi con replace(/\*/g, "")

    //Funzionamento di questo endpoint: vengono fatte due richiste, la prima non include il patientID e serve ad avere i dettagli sullo studio attuale.
    //La seconda richiesta include il patientID in quanto serve ad avere lo storico richiedendo n studi per patientID. Quando non ho il patientID
    //costruisco l'url con il solo StudyInstanceUIDs, se invece ce l'ho lo includo al posto di StudyInstanceUIDs.

    let apiUrl = `http://127.0.0.1:7000/rs/studies?StudyInstanceUID=${StudyInstanceUIDs}&includefield=00081030` //includefield 00081030 serve

    //ad avere lo studyDescription
    if (patientIDQido) {
      apiUrl = `http://127.0.0.1:7000/rs/studies?${patientIDQido}&includefield=00081030`
    }
    /*** SE IN UNO STUDIO NON VENGONO VISUALIZZATE TUTTE LE SERIE, POTREBBE DIPENDERE DALLA CHIAMATA CON codiceStudioSpecificoQido
     * PROVARE EVENTUALMENTE A FARE LA SOLA CHIAMATA StudyInstanceUIDs **/
	 
	 //Il tipo di url seguente è generato dalla worklist nativa del viewer quindi quando chiedo la lista totale degli studi.
	// if(apiUrl.includes('?StudyInstanceUID=undefined&')){	
	 
	if (queryString.includes('askWorklist')) {
   if (aetitle && aetitle !== "null" && aetitle !== "undefined") {
        apiUrl = apiUrl.replace('/rs/studies', `/rs/${aetitle.toLowerCase()}/studies`);
    }
    apiUrl = apiUrl.replace('?StudyInstanceUID=undefined&', '?');

    apiUrl += `&StudyDate=${studyDate}`;
    if(apiUrl.includes("%2C")) apiUrl = apiUrl.replaceAll("%2C", "\\"); //per più modality

    //Se ho patientID o accession number rimuovo tutti gli altri filtri
    if(studyDescription){
      apiUrl = apiUrl.split("?")[0] + `?StudyDescription=${studyDescription}`;
    }
    if(patientName){
      apiUrl = apiUrl.split("?")[0] + `?patientName=${patientName}`;
    }
    if(patientID){
      apiUrl = apiUrl.split("?")[0] + `?00100020=${patientID}`;
    }
    if (accessionNumber) {
      apiUrl = apiUrl.split("?")[0] + `?AccessionNumber=${accessionNumber}`;
    }
    console.log('qido worklist: ', apiUrl);
}

	 
	 function getFormattedDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

    console.log('furl reale qido: ', apiUrl)

    const apiResponse = await fetch(apiUrl, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
    });

    if (!apiResponse.ok) {
      throw new Error(`Errore nella chiamata API: ${apiResponse.status}`);
    }

    let response = await apiResponse.json();
    // if (response[0]['00100020']) {
    //   const lengthPatientID = response[0]['00100020'].Value.length
    //   if (lengthPatientID > 1) {
    //     response[0]['00100020'].Value = response[0]['00100020'].Value[lengthPatientID - 1]
    //   }
    // }
    if (response.length === 0&&!askWorklist) {
      //Potrebbe essere disponibile in remoto
      apiUrl = getApiServerRemotoCliente(apiUrl, aetitle)
      const apiResponse = await fetch(apiUrl, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
      });

      if (!apiResponse.ok) {
        throw new Error(`Errore nella chiamata API: ${apiResponse.status}`);
      }

      response = await apiResponse.json();
    }
    res.status(200).send(response);

  } catch (error) {
    console.error('Errore qido: ', error)
    res.status(500).json({ error: 'Errore quido' });
  }
})

app.get('/viewer/qido/:studyInstanceUIDs/studies', async (req, res) => {

  try {
    const StudyInstanceUIDs = req.params.studyInstanceUIDs;
    const aetitle = req.query.aetitle

    let queryString = req.url.split('?')[1];
    if (!queryString || queryString === '') {
      res.status(400).json({ error: 'Devi fornire la query string.' });
      return;
    }
    // console.log(queryString)
    let patientIDQido;
    if (queryString.includes('&limit')) patientIDQido = queryString.split('&limit')[0].replace(/\*/g, "")
    // const apiUrl = `${req.headers.origin}:1000/WADO/${partizionePACS}/studies/${studyUID}/metadata`;
    // const apiUrl = `${req.headers.origin}:1000/WADO/${partizionePACS}?${queryString}`
    // let apiUrl = `http://127.0.0.1:7000/rs/studies?${queryString}`;
    let apiUrl = `http://127.0.0.1:7000/rs/studies?StudyInstanceUID=${StudyInstanceUIDs}&includefield=00081030`
    if (patientIDQido) apiUrl = `http://127.0.0.1:7000/rs/studies?${patientIDQido}&includefield=00081030`


    // if (aetitle === 'LIVORNESE') apiUrl = apiUrl.replace('127.0.0.1', '50.0.0.108')
    if (aetitle === '_IGEA') apiUrl = apiUrl.replace('127.0.0.1', '50.0.0.116')

    console.log('url reale qido: ', apiUrl)

    //Corretto
    // let apiUrl = 'http://127.0.0.1:7000/rs/studies?limit=101&offset=0&fuzzymatching=false&includefield=00081030%2C00080060&StudyInstanceUID=1.2.380.0.51233983.26049997.39678953'

    // console.log(apiUrl)

    const apiResponse = await fetch(apiUrl, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
    });

    if (!apiResponse.ok) {
      throw new Error(`Errore nella chiamata API: ${apiResponse.status}`);
    }

    const response = await apiResponse.json();
    // console.log(response)
    res.status(200).send(response);

  } catch (error) {
    console.error('Errore qido: ', error)
    res.status(500).json({ error: 'Errore quido' });
  }
})

// app.post('/viewer/keyimage', upload.array('chunks'), (req, res) => {
//   let user = req.query.user; // parametro user. Es. http://localhost:3000/viewer/keyimage?user=123
//   let userBody = req.body.username; // parametro user dal corpo della richiesta da indicare in fetch post
//   let larghezza = parseInt(req.body.larghezza);
//   let altezza = parseInt(req.body.altezza);
//   console.log('parametro user passato da url ', user);
//   console.log('parametro username passato come richiesta post ', userBody);
//   if (!userBody || userBody !== user) {
//     return res.status(500).send('Endpoint errato');
//   }

//   const mergedArray = [];
//   req.files.forEach(file => {
//     const buffer = file.buffer;
//     const chunkArray = Array.from(new Uint8Array(buffer));
//     mergedArray.push(...chunkArray);
//   });
//   const jsonData = JSON.stringify(mergedArray);

//   // console.log('Array ricostruito:', mergedArray);

//   const width = larghezza; // Larghezza dell'immagine
//   const height = altezza; // Altezza dell'immagine

//   // Creazione di una nuova immagine con Jimp
//   const image = new Jimp(width, height);

//   // Popolamento dei pixel dell'immagine
//   let index = 0;
//   for (let y = 0; y < height; y++) {
//     for (let x = 0; x < width; x++) {
//       const pixelValue = mergedArray[index];
//       if (pixelValue) {
//         const color = Jimp.rgbaToInt(pixelValue, pixelValue, pixelValue, 255);
//         image.setPixelColor(color, x, y);
//       }
//       index++;
//     }
//   }

//   // Salvataggio dell'immagine come file JPEG
//   const outputPath = "output.jpg";
//   image.write(outputPath, (err) => {
//     if (err) {
//       console.error(err);
//       return;
//     }

//     console.log("JPEG image saved successfully.");
//   });

//   fs.writeFile(`bitmap.json`, jsonData, (err) => {
//     if (err) {
//       console.error('Si è verificato un errore durante la scrittura del file JSON:', err);
//       return res.status(500).send('Si è verificato un errore durante la scrittura del file JSON.');
//     }

//     console.log('File JSON aggiornato con successo!');
//   });

//   // Invia una risposta di successo
//   res.status(200).send('Array ricevuto e ricostruito con successo');
// });

app.post('/viewer/keyimage', upload.array('chunks'), (req, res) => {
  let user = req.query.user; // parametro user. Es. http://localhost:3000/viewer/keyimage?user=123
  let userBody = req.body.username; // parametro user dal corpo della richiesta da indicare in fetch post
  if (!userBody || userBody !== user) {
    return res.status(500).send('Endpoint errato');
  }

  // const base64Data = req.body.base64Image; // Base64 in formato JPEG
  // const outputPath = 'output.jpg';
  // const base64Image = base64Data.replace(/^data:image\/jpeg;base64,/, '');

  // fs.writeFile(outputPath, base64Image, 'base64', (err) => {
  //   if (err) {
  //     console.error('Si è verificato un errore durante il salvataggio dell\'immagine:', err);
  //     return res.status(500).send('Si è verificato un errore durante il salvataggio dell\'immagine.');
  //   }
  //   console.log('Immagine JPEG salvata con successo.');
  // });

  const tagDicom = req.body.tagDicom;
  const parsedTagDicom = JSON.parse(tagDicom);
  // console.log(tagDicom)

  let jsonString = JSON.stringify(tagDicom, null, 2);
  fs.writeFile(`./ dicom - key - image / tag.json`, tagDicom, err => {
    if (err) {
      console.error(
        'Si è verificato un errore durante la scrittura del file JSON:',
        err
      );
      return res
        .status(500)
        .send('Si è verificato un errore durante la scrittura del file JSON.');
    }

    console.log(
      'File JSON con tag DICOM creato e personalizzato con successo!'
    );
    // return res.status(200).send('File JSON creato e personalizzato con successo.');
  });

  const filePath = './dicom-key-image/emptyfile.dcm';
  const arrayBuffer = fs.readFileSync(filePath).buffer;
  const dicomDict = dcmjs.data.DicomMessage.readFile(arrayBuffer);
  let MediaStorageSOPClassUID = '';
  let MediaStorageSOPInstanceUID = '';
  let ReferencedSopClassUID = '';
  let ReferencedSopInstanceUID = '';
  for (const a of parsedTagDicom) {
    try {
      // console.log(a)
      if (a.vr === 'CS') {
        //questo vr non accetta più di 16 caratteri perciò mi assicuro che vengano troncati caratteri in più
        a.Value = a.Value.substring(0, 16);
        dicomDict.dict[a.tag] = { vr: a.vr, Value: [a.Value] };
      }
      //TAG che coincidono con quelli che mi servono e che andrò a creare
      if (a.tag === '00080016') {
        MediaStorageSOPClassUID = a.Value;
        ReferencedSopClassUID = a.Value;
      }
      if (a.tag === '00080018') {
        MediaStorageSOPInstanceUID = a.Value;
        ReferencedSopInstanceUID = a.Value;
      }

      if (a.vr !== '' && a.vr !== 'DS' && a.vr !== 'ox') {
        dicomDict.dict[a.tag] = { vr: a.vr, Value: [a.Value] };
      } else if (a.vr === 'DS') {
        //Il tag DS accetta solo numeri per questo lo escludo da tutto il resto che è stringa
        if (a.Value === '' || a.Value === ' ')
          dicomDict.dict[a.tag] = { vr: a.vr, Value: [] };
        else {
          a.Value = parseInt(a.Value); //trasformo la stringa in numero
          dicomDict.dict[a.tag] = { vr: a.vr, Value: [a.Value] };
        }
      }
    } catch (err) {
      console.log('errore ', err);
    }
  }

  //Modality
  dicomDict.dict['00080060'] = { vr: 'CS', Value: ['KO'] };

  try {
    delete dicomDict.dict['00181310']; //AcquisitionMatrix con valore numerico che da problemi a settarlo. Non serve e lo elimino. Potrebbe essere necessario eliminare altro.
    delete dicomDict.dict['7FE00010'];
  } catch (err) {
    console.log(err);
  }

  //Meta tag
  dicomDict.meta['00020002'] = { vr: 'UI', Value: [MediaStorageSOPClassUID] }; //MediaStorageSOPClassUID

  // Genera un nuovo Media Storage Sop Instance UID (0002,0003) valido anche per SOP Instance UID (0008,0018)
  function getRandomNumber() {
    return Math.floor(Math.random() * 10000000); // Genera un numero casuale di 7 cifre
  }

  function getCurrentDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return year + month + day; // Restituisce la data nel formato "yyyymmdd"
  }

  function replaceLastPartWithRandomAndDate(inputString) {
    const parts = inputString.split('.');
    const randomNumber = getRandomNumber();
    const currentDate = getCurrentDate();
    const newLastPart = currentDate + randomNumber;
    parts.pop(); 
    parts.pop(); 
    parts.push(newLastPart); 
    return parts.join('.');
  }

  MediaStorageSOPInstanceUID = replaceLastPartWithRandomAndDate(
    MediaStorageSOPInstanceUID
  );

  console.log(MediaStorageSOPInstanceUID); // Esempio di output: "1.2.840.545354353.202307264564541"

  dicomDict.meta['00020003'] = {
    vr: 'UI',
    Value: [MediaStorageSOPInstanceUID],
  }; //MediaStorageSOPInstanceUID
  dicomDict.dict['00080018'] = {
    vr: 'UI',
    Value: [MediaStorageSOPInstanceUID],
  }; //MediaStorageSOPInstanceUID
  ///////////////

  //Referenced Image Sequence (Tag per immagini chiave)
  // dicomDict.dict["0040A375"] = {
  //   vr: 'SQ', Value: [
  //     {
  //       "00081150": {
  //         vr: 'UI',
  //         Value: [ReferencedSopClassUID]
  //       },
  //       "00081155": {
  //         vr: 'UI',
  //         Value: [ReferencedSopInstanceUID]
  //       },
  //       "00081160": {
  //         vr: 'UI',
  //         Value: ["1"]
  //       },
  //     },
  //   ]
  // }

  // dicomDict.dict["0040A375"] = {
  //   vr: 'SQ', Value: [
  //     {
  //       "00081115": {
  //         vr: 'SQ',
  //         Value: [{
  //           "00081199": {
  //             vr: 'SQ',
  //             Value: [[
  //               {
  //                 "00081150": {
  //                   vr: 'UI',
  //                   Value: [ReferencedSopClassUID]
  //                 },
  //                 "00081155": {
  //                   vr: 'UI',
  //                   Value: [ReferencedSopInstanceUID]
  //                 },
  //                 "00081160": {
  //                   vr: 'UI',
  //                   Value: ["1"]
  //                 },
  //               },
  //             ]]
  //           }
  //         }]
  //       },
  //     },
  //   ]
  // }

  dicomDict.dict['0040A375'] = {
    vr: 'SQ',
    Value: [
      {
        '00081115': {
          vr: 'SQ',
          Value: [
            {
              '00081199': {
                vr: 'SQ',
                Value: [
                  {
                    '00081150': {
                      vr: 'UI',
                      Value: [ReferencedSopClassUID],
                    },
                    '00081155': {
                      vr: 'UI',
                      Value: [ReferencedSopInstanceUID],
                    },
                    '00081160': {
                      vr: 'UI',
                      Value: ['1'],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ],
  };

  // let outputPath='./dicom-key-image'
  let outputPath = `${driveInUso}: \\Nolex\\PacsData\\${partizionePACS} _Incoming`;
  const newFileWriterBuffer = dicomDict.write();
  fs.writeFile(
    `${outputPath} /${MediaStorageSOPInstanceUID}.dcm`,
    Buffer.from(newFileWriterBuffer),
    err => {
      if (err) {
        console.error(
          'Si è verificato un errore durante la scrittura del file DICOM:',
          err
        );
        return res
          .status(500)
          .send(
            'Si è verificato un errore durante la scrittura del file DICOM.'
          );
      }

      console.log('File DICOM con immagine chiave generato');
      return res.status(200).send('File DICOM generato con successo.');
    }
  );
});

app.get('/viewer/wado/studies/:studyID/metadata', async (req, res) => {
  let notInCache = true;
  try {
    let studyUID = req.params.studyID;
    let partizione;
    if (studyUID.includes('|')) {
      partizione = studyUID.split('|')[1]
      studyUID = studyUID.split('|')[0]
    }

    if(partizione.includes("_frmwl")) partizione=partizione.split("_frmwl")[0]
    // const disabilitaCacheMetadati = req.query['disabilita-cache-metadati'];
    const disabilitaCacheMetadati = true


    if (!studyUID) {
      res.status(400).json({
        error: 'Devi fornire il parametro studyUIDnella query string.',
      });
      return;
    }

    let apiUrl = `http://127.0.0.1:1000/WADO/${partizione}/studies/${studyUID}/metadata`;

    if (!disabilitaCacheMetadati) {
      // verifico se la cartella della cache esiste altrimenti la creo
      if (!fs.existsSync(pathCachedMetadata)) {
        fs.mkdirSync(pathCachedMetadata);
        console.log('Cartella creata:', pathCachedMetadata);
      }

      fs.readdirSync(pathCachedMetadata).forEach(async file => {
        if (file.includes('compressed') && file.includes('.gz') && file.match(/^compressed-(.+)\.gz$/)[1] === studyUID) {
          notInCache = false;
          console.log('esiste in cache');
          fs.readFile(
            `${pathCachedMetadata}/compressed-${studyUID}.gz`,
            (err, data) => {
              if (err) {
                console.error(
                  'Si è verificato un errore durante la lettura del file JSON:',
                  err
                );
                return res.status(500).gz({
                  error:
                    'Si è verificato un errore durante la lettura del file JSON.',
                });
              }

              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Content-Encoding', 'gzip');

              return res.status(200).end(data);
            }
          );
          console.log('caricamento dalla cache');
        }
      });
    } else {
      console.log('sistema cache non richiesto dal client');
    }

    if (notInCache) {
      console.log('non è in cache');
      console.log('url metadata ', apiUrl)
      let apiResponse = await fetch(apiUrl, {
        headers: {
          accept: 'application/dicom+json',
          'accept-language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
          'cache-control': 'no-cache',
          pragma: 'no-cache',
        },
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
      });

      if (!apiResponse.ok) {
        //Magari non c'è sul cloud quindi provo sul server del cliente
        apiUrl = getApiServerRemotoCliente(apiUrl, partizione)
        if (!apiUrl) {
          throw new Error('Impossibile ottenere metadati remoti, ipRemoto non definito')
        }
        console.log('Forse non c\'è storico, provo con', apiUrl)
        apiResponse = await fetch(apiUrl, {
          headers: {
            accept: 'application/dicom+json',
            'accept-language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
            'cache-control': 'no-cache',
            pragma: 'no-cache',
          },
          method: 'GET',
          mode: 'cors',
          credentials: 'omit',
        });
        if (!apiResponse.ok) {
          throw new Error(`Errore nella chiamata API: ${apiResponse.status}`);
        }
      }

      const jsonData = await apiResponse.json();
      //Fix WL - Se in una serie il windowcenter è 1, la serie viene invertita. Fix portandolo a 2 (in attesa del fix decoder cornerstone)
      const fixedWLJsonData = fixWLMetadati(jsonData)

      const jsonString = JSON.stringify(fixedWLJsonData);

      // const originalSizeKB = (Buffer.from(jsonString, 'utf-8').length / 1024).toFixed(2);

      const startTime = new Date();
      zlib.gzip(jsonString, { level: 9 }, (err, compressedData) => {
        if (err) {
          throw err;
        }

        const endTime = new Date();
        const elapsedTime = endTime - startTime;

        // const compressedSizeKB = (compressedData.length / 1024).toFixed(2);

        shareCompressData = compressedData;
        // console.log(`Tempo di compressione: ${elapsedTime} ms`);

        // console.log(`Dimensioni metadata JSON originale: ${originalSizeKB} kByte`);
        // console.log(`Dimensioni metadataJSON compresso: ${compressedSizeKB} kByte`);

        if (studyUID.includes('\\')) studyUID = studyUID.replace('\\', '-');
        // console.log('studyUID in scrittura: ', studyUID)
        if (!disabilitaCacheMetadati) {
          fs.writeFile(
            `${pathCachedMetadata}/compressed-${partizione}-${studyUID}.gz`,
            compressedData,
            err => {
              if (err) {
                console.error(
                  'Si è verificato un errore durante la scrittura del file JSON:',
                  err
                );
                return res.status(500).json({
                  error:
                    'Si è verificato un errore durante la scrittura del file JSON.',
                });
              }

              console.log(
                'Il file JSON compresso è stato salvato con successo nella cartella cache del server.'
              );
            }
          );
        }
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Encoding', 'gzip');
        return res.status(200).end(compressedData);
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Si è verificato un errore durante la richiesta dei dati.',
    });
  }
});


app.get(
  '/viewer/wado/studies/:studyUid/series/:seriesUID/instances/:instanceUID/frames/:frameNumber',
  async (req, res) => {
    try {
      const resizeDicom = false
      const compress = true;
      const _token = req.query.token;
      // const token = getMasterToken() //Token sempre valido con checksum data odierna
      // const token = _token;
      let token = tokenPerStorico(_token);
      let aetitle = req.query.aetitle;
      //Se viene dall'explorer worklist
      if(aetitle.includes("_frmwl")) {
        aetitle=aetitle.split("_frmwl")[0]
        token = getMasterToken()
        token = tokenPerStorico(token);
      }
      const studyUid = req.params.studyUid;
      const studyseriesUIDUid = req.params.seriesUID;
      const instanceUID = req.params.instanceUID;
      const frameNumber = Number(req.params.frameNumber) - 1;
      let contentType = 'application/token';
      const customContentType = req.query.contentType;
      if (customContentType) contentType = customContentType;

      // if (!queryString || queryString === '') {
      //   res.status(400).json({ error: 'Devi fornire la query string.' });
      //   return;
      // }
      // apiUrl = `${ipPACS}:1000/WADO/${partizione}?${queryString}`;
      let apiUrl = `http://127.0.0.1:1000/WADO/${aetitle}?contentType=${contentType}&requestType=WADO&studyUID=${studyUid}&seriesUID=${studyseriesUIDUid}&objectUID=${instanceUID}&transferSyntax=*&Token=${token}&partizione=${aetitle}`;
      if (frameNumber !== 0) apiUrl = apiUrl + `&FrameNumber=${frameNumber}`;
      // console.log(apiUrl)
      // if (apiUrl.includes('8080')) apiUrl = apiUrl.replace(/:8080/, '');
      //Verifica token;
      // console.log(`tokenData valido con chiamata: ${apiUrl}`)
      //Fine controllo token

      let apiResponse = await fetch(apiUrl, {
        headers: {
          accept: '*',
          'accept-language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
          'cache-control': 'no-cache',
          pragma: 'no-cache',
        },
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
      });
      

      if (
        !apiResponse.ok &&
        apiResponse.statusText.includes('Autenticazione non verificata')
      ) {
        console.error('Token non valido')
        // console.error(`tokenData NON valido con chiamata: ${apiUrl}`)
        return res.status(500).json({
          error: 'Token non valido',
        });
      }

      if (
        !apiResponse.ok &&
        apiResponse.statusText.includes('Requested frame exceeds available pixel data ')
      ) {
        // console.error(`tokenData NON valido con chiamata: ${apiUrl}`)
        return res.status(500).json({
          error: 'DICOM NON VALIDO - Requested frame exceeds available pixel data',
        });
      }

      if (
        !apiResponse.ok &&
        apiResponse.statusText.includes('Condition is not met :Valid Lut Size')
      ) {
        const bufferDicomDaPACS = await leggiDicomDaPACS(apiUrl)
        if (!bufferDicomDaPACS) {
          console.error('Errore lettura dicom da PACS')
          return res.status(500).json({
            error: 'Errore lettura dicom da PACS',
          });
        }
        // return res.end(bufferDicomDaPACS);
        const transferSyntax = '1.2.840.10008.1.2';


        res.setHeader('Content-Type', 'multipart/related;');
        res.write('--BOUNDARY_3deefb3d-a370-4a25-81a1-e3ff3637284d\r\n');
        res.write(
          `Content-Type: image;transfer-syntax=${transferSyntax}\r\n\r\n`
        );
        res.write(bufferDicomDaPACS);
        res.write('\r\n--BOUNDARY_3deefb3d-a370-4a25-81a1-e3ff3637284d--');
        return res.end();
      }

      //Magari non c'è sul cloud quindi provo sul server del cliente
      /** DATI DAL SERVER REMOTO **/
      if (!apiResponse.ok) {
        console.log('Forse storico remoto');
        console.log('Url precenete: ', apiUrl);
        apiUrl = getApiServerRemotoCliente(apiUrl, aetitle)
        if (!apiUrl) {
          throw new Error(
            'Impossibile ottenere metadati remoti, ipRemoto non definito'
          );
        }

        // apiUrl = apiUrl.replace('application/token', 'application/dicom')
        console.log('Nuovo url: ', apiUrl);
        apiResponse = await fetch(apiUrl, {
          headers: {
            accept: '*',
            'accept-language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
            'cache-control': 'no-cache',
            pragma: 'no-cache',
          },
          method: 'GET',
          mode: 'cors',
          credentials: 'omit',
        });
        if (!apiResponse.ok) {
          throw new Error(`Errore nella chiamata API: ${apiResponse.status}`);
        }
        const dicomData = await apiResponse.arrayBuffer();
        const headers = apiResponse.headers;
        const buffer = Buffer.from(dicomData);
        let transferSyntax;
        for (const [name, value] of headers.entries()) {
          // console.log(name, value)
          // if (name === 'compressed' && value === 'true') res.setHeader('Compressed', 'true');
          if (name === 'transfersyntaxuid') transferSyntax = value;
          console.log('transferSyntax: ', transferSyntax);
        }
        if (!transferSyntax && apiUrl.includes('application/dicom')) {
          transferSyntax = '1.2.840.10008.1.2.1'
        }
        if (
          transferSyntax &&
          (transferSyntax !== '1.2.840.10008.1.2' &&
            // transferSyntax !== '1.2.840.10008.1.2.1' &&
            transferSyntax !== '1.2.840.10008.1.2.1.99' &&
            transferSyntax !== '1.2.840.10008.1.2.2')
        ) {

          res.setHeader('Content-Type', 'multipart/related;');
          res.write('--BOUNDARY_3deefb3d-a370-4a25-81a1-e3ff3637284d\r\n');
          res.write(
            `Content-Type: image;transfer-syntax=${transferSyntax}\r\n\r\n`
          );
          res.write(buffer);
          res.write('\r\n--BOUNDARY_3deefb3d-a370-4a25-81a1-e3ff3637284d--');
          return res.end();
        } else {
          return res.end(buffer);
        }
      }


      /** DATI DAL SERVER LOCALE **/

      const headers = apiResponse.headers;
      // console.log('headers', headers);

      const dicomData = await apiResponse.arrayBuffer();
      // const _dicomData = await apiResponse.arrayBuffer();
      //

      // const dicomData = await sharp(_dicomData, {
      //   raw: {
      //     width: 512,
      //     height: 512,
      //     channels: 1
      //   }
      // }).jpeg({ quality: 100 }).toBuffer();

      //
      const originalSizeKB = Number(
        (Buffer.from(dicomData, 'utf-8').length / 1024).toFixed(2)
      );
      const buffer = Buffer.from(dicomData);
      let transferSyntax;
      let RRGGBB = false;
      let columns = 0
      let rows = 0
      for (const [name, value] of headers.entries()) {
        // console.log(name, value)
        // if (name === 'compressed' && value === 'true') res.setHeader('Compressed', 'true');

        if (name === 'transfersyntaxuid') transferSyntax = value;
        if (name === 'imageheight') rows = parseInt(value);
        if (name === 'imagewidth') columns = parseInt(value);
        if (name === 'bitsallocated') bitsAllocated = parseInt(value);
        //Fix RRGGBB --> l'attuale decoder cornerstone da problemi per cui converto questo bitmpa particolare in png lossless. Un RRGGBB è dato
        //da photometricinterpretation = RGB e planarconfiguration 1
        if (name === 'photometricinterpretation' && value === 'RGB') RRGGBB = true;
        if (name === 'planarconfiguration' && value === '0') RRGGBB = false; //Lo reimposto a false
        if (name === 'bitsallocated' && value !== '8') RRGGBB = false; //Lo reimposto a false
        // console.log(transferSyntax);
      }
       
      
      if (
        !compress ||
        (transferSyntax !== '1.2.840.10008.1.2' &&
          transferSyntax !== '1.2.840.10008.1.2.1.99' &&
          transferSyntax !== '1.2.840.10008.1.2.2')
      ) {
        RRGGBB=false//lo disattivo per il momento
        if (RRGGBB) {
          const pngBuffer = await convertRGBToPNG(dicomData, columns, rows)
          res.setHeader('Content-Type', 'multipart/related;');
          res.write('--BOUNDARY_3deefb3d-a370-4a25-81a1-e3ff3637284d\r\n');
          res.write(
            `Content-Type: image;transfer-syntax=1.2.840.10008.1.2.4.50\r\n\r\n`
          );
          res.write(pngBuffer);
          res.write('\r\n--BOUNDARY_3deefb3d-a370-4a25-81a1-e3ff3637284d--');
          res.end();
        }
        else if (aetitle === '_NOLEX') {
          const pngBuffer = await convertMonochromeDicomToJPEG(dicomData, columns, rows, 'MONOCHROME2')
          res.setHeader('Content-Type', 'multipart/related;');
          res.write('--BOUNDARY_3deefb3d-a370-4a25-81a1-e3ff3637284d\r\n');
          res.write(
            `Content-Type: image;transfer-syntax=1.2.840.10008.1.2.4.50\r\n\r\n`
          );
          res.write(pngBuffer);
          res.write('\r\n--BOUNDARY_3deefb3d-a370-4a25-81a1-e3ff3637284d--');
          res.end();
        }
        else if (resizeDicom) {
          const newBuffer = await resizeDicomFunc(dicomData, columns, rows)
          res.setHeader('Content-Type', 'multipart/related;');
          res.write('--BOUNDARY_3deefb3d-a370-4a25-81a1-e3ff3637284d\r\n');
          res.write(
            `Content-Type: image;transfer-syntax=1.2.840.10008.1.2.4.50\r\n\r\n`
          );
          res.write(newBuffer);
          res.write('\r\n--BOUNDARY_3deefb3d-a370-4a25-81a1-e3ff3637284d--');
          res.end();
        }
        else {
          res.setHeader('Content-Type', 'multipart/related;');
          res.write('--BOUNDARY_3deefb3d-a370-4a25-81a1-e3ff3637284d\r\n');
          res.write(
            `Content-Type: image;transfer-syntax=${transferSyntax}\r\n\r\n`
          );
          res.write(buffer);
          res.write('\r\n--BOUNDARY_3deefb3d-a370-4a25-81a1-e3ff3637284d--');
          res.end();
        }
      } else {
        zlib.gzip(dicomData, { level: 9 }, (err, compressedData) => {
          if (err) {
            throw err;
          }
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Encoding', 'gzip');
          res.end(compressedData);
        });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({
        error: 'Si è verificato un errore durante la richiesta dei dati.',
      });
    }
  }
);


app.get(
  '/viewer/wado/studies/:studyUid/series/:seriesUID/instances/:instanceUID/rendered',
  async (req, res) => {
    try {
      const compress = true;
      const _token = req.query.token;
      const token = getMasterToken() //Token sempre valido con checksum data odierna
      // const token = _token;
      const aetitle = req.query.aetitle;
      if(aetitle.includes("_frmwl")) aetitle=aetitle.split("_frmwl")[0]
      const studyUid = req.params.studyUid;
      const studyseriesUIDUid = req.params.seriesUID;
      const instanceUID = req.params.instanceUID;
      let contentType = 'application/pdf';
      const customContentType = req.query.contentType;
      if (customContentType) contentType = customContentType;

      // if (!queryString || queryString === '') {
      //   res.status(400).json({ error: 'Devi fornire la query string.' });
      //   return;
      // }
      // apiUrl = `${ipPACS}:1000/WADO/${partizione}?${queryString}`;
      let apiUrl = `http://127.0.0.1:1000/WADO/${aetitle}?contentType=${contentType}&requestType=WADO&studyUID=${studyUid}&seriesUID=${studyseriesUIDUid}&objectUID=${instanceUID}&transferSyntax=*&Token=${token}&partizione=${aetitle}`;
      // console.log(apiUrl)
      // if (apiUrl.includes('8080')) apiUrl = apiUrl.replace(/:8080/, '');
      //Verifica token;
      // console.log(`tokenData valido con chiamata: ${apiUrl}`)
      //Fine controllo token

      let apiResponse = await fetch(apiUrl, {
        headers: {
          accept: '*',
          'accept-language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
          'cache-control': 'no-cache',
          pragma: 'no-cache',
        },
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
      });

      if (
        !apiResponse.ok &&
        apiResponse.statusText.includes('Autenticazione non verificata')
      ) {
        // console.error(`tokenData NON valido con chiamata: ${apiUrl}`)
        return res.status(500).json({
          error: 'Token non valido',
        });
      }

      if (
        !apiResponse.ok &&
        apiResponse.statusText.includes('Study not found')
      ) {
        //Potrebbe essere stato richiesto da storico remoto
        apiUrl = getApiServerRemotoCliente(apiUrl, aetitle)
        if (!apiUrl) {
          console.error('L\'ip del server remoto non è definito')
          return res.status(500).json({ error: 'Storico remoto non configurato' });
        }
        apiResponse = await fetch(apiUrl, {
          headers: {
            accept: '*',
            'accept-language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
            'cache-control': 'no-cache',
            pragma: 'no-cache',
          },
          method: 'GET',
          mode: 'cors',
          credentials: 'omit',
        });
      }

      /** DATI DAL SERVER LOCALE **/
      const pdfBuffer = await apiResponse.arrayBuffer();
      const buffer = Buffer.from(pdfBuffer);


      res.setHeader('Content-Type', `${contentType.includes('pdf') ? 'application/pdf' : 'application/octet-stream'}`);
      res.setHeader('Cross-Origin-Resource-Policy', 'same-site;');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
      res.write('--BOUNDARY_3deefb3d-a370-4a25-81a1-e3ff3637284d\r\n');
      res.write(
        `Content-Type: image;transfer-syntax=1.2.840.10008.1.2.4.50\r\n\r\n`
      );
      res.write(
        `Content-Type: application/octet-stream\r\n\r\n`
      );
      res.write(buffer);
      res.write('\r\n--BOUNDARY_3deefb3d-a370-4a25-81a1-e3ff3637284d--');
      res.end();

    } catch (error) {
      console.error(error);
      res.status(500).json({
        error: 'Si è verificato un errore durante la richiesta dei dati.',
      });
    }
  }
);


/*****************************************/

// app.get('_/viewer/wado-metadata', async (req, res) => {
//   try {
//     // Estrai i parametri dalla query string della richiesta
//     const studyUID = req.query.studyUID;

//     if (!studyUID) {
//       res.status(400).json({
//         error: 'Devi fornire il parametro studyUIDnella query string.',
//       });
//       return;
//     }

//     // Costruisci l'URL della chiamata API utilizzando i parametri
//     const apiUrl = `https://127.0.0.1:1000/WADO/${partizionePACS}/studies/${studyUID}/metadata`;

//     // Esegui la chiamata API
//     const apiResponse = await fetch(apiUrl, {
//       headers: {
//         accept: 'application/dicom+json',
//         'accept-language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
//         'cache-control': 'no-cache',
//         pragma: 'no-cache',
//       },
//       method: 'GET',
//       mode: 'cors',
//       credentials: 'omit',
//     });

//     if (!apiResponse.ok) {
//       throw new Error(`Errore nella chiamata API: ${apiResponse.status}`);
//     }

//     // Estrai il JSON dalla risposta API
//     const jsonData = await apiResponse.json();

//     // Converti il JSON in una stringa JSON
//     const jsonString = JSON.stringify(jsonData);

//     // Imposta gli header della risposta per indicare che si tratta di dati Gzip
//     res.setHeader('Content-Type', 'application/json');
//     res.setHeader('Content-Encoding', 'gzip');

//     // fs.writeFile(`${pathCachedDICOM}.gzip`, Buffer.from(jsonData), (err) => {
//     //   if (err) {
//     //     console.error('Si è verificato un errore durante la scrittura del file DICOM:', err);
//     //     return res.status(500).send('Si è verificato un errore durante la scrittura del file DICOM.');
//     //   }

//     //   console.log("File scritto");
//     //   // return res.status(200).send('File DICOM generato con successo.');
//     // })

//     // Restituisci i dati compressi al client
//     return res.status(200).end(jsonString);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       error: 'Si è verificato un errore durante la richiesta dei dati.',
//     });
//   }
// });

// var totaleDatiDicom = 0
// var totaleDatiDicomCompressi = 0

//ORIGINALE - Controllo token, richiesta e compressione DICOM in gzip

function getMasterToken() {
  const currentDate = new Date();
  const yyyy = currentDate.getFullYear();
  const MM = String(currentDate.getMonth() + 1).padStart(2, '0'); // Mesi da 0 a 11
  const dd = String(currentDate.getDate()).padStart(2, '0');
  const dataAttuale = `${yyyy}${MM}${dd}`;

  // somma dei codici ASCII dei caratteri della data e calcolo del carattere di controllo
  const dataShouldBeChkChar = String.fromCharCode(
    (dataAttuale.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0) % 10) + '0'.charCodeAt(0)
  );

  // parte sempre fissa token
  const tokenCore = "iJ7SuNLy0hXsbZh6RfgHotZAtBYxXTNZsl05AVzcx0nK0UQ2YgE5dsvAqZMP522swwBMpirAKi8dTATJ";

  const sum = dataShouldBeChkChar + tokenCore

  // calcolo del carattere di controllo per la somma del token (escludendo l'ultimo carattere)
  const TotChkShouldBeChar = String.fromCharCode(
    (sum.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0) % 10) + '0'.charCodeAt(0)
  );

  // Token finale generato unendo i caratteri di controllo e il token core
  const finalToken = dataShouldBeChkChar + tokenCore + TotChkShouldBeChar;
  console.log('utilizzo del master code: ', finalToken)
  return finalToken;
}

function tokenPerStorico(tokenParam) {
  //A differenza del token originale, questo bypassa la verifica dello studyInstanceUID e dura sempre un'ora come il token originale (In passato 10 min).
  //Prende come input il token originale passato dal PACS e in più aggiunge 4 caratteri all'inizio dello stesso applicando la seguente regola:
  //Prime 3 lettere minuscole casuali (generando un numero casuale tra 97 e 122 - Valori in ASCII di sole lettere minuscole)
  //Ultimo carattere (numero) --> Somma dei codici in ASCII delle prime 3 lettere e il resto della divisione per 10
  var lettere = '';
  var risultato = 0;


  for (var i = 0; i < 3; i++) {
    var codice = Math.floor(Math.random() * (122 - 97 + 1)) + 97;
    var lettera = String.fromCharCode(codice);
    lettere += lettera;
    risultato += lettera.charCodeAt(0);
  }

  return lettere + (risultato % 10) + tokenParam;
}

const convertRGBToPNG = async (dicomData, columns, rows) => {
  //Fix RRGGBB --> l'attuale decoder cornerstone da problemi per cui converto questo bitmap particolare in png lossless. Un RRGGBB è dato
  //da photometricinterpretation = RGB e planarconfiguration 1
  const pixelData = new Uint8Array(dicomData);
  const frameSize = rows * columns;
  const newPixelData = Buffer.alloc(frameSize * 3);

  for (let i = 0; i < frameSize; i++) {
    newPixelData[i * 3] = pixelData[i]; // Rosso
    newPixelData[i * 3 + 1] = pixelData[i + frameSize]; // Verde
    newPixelData[i * 3 + 2] = pixelData[i + frameSize * 2]; // Blu
  }
  // Crea immagine JPEG con Sharp
  try {
    const jpegBuffer = await sharp(newPixelData, {
      raw: {
        width: columns,
        height: rows,
        channels: 3,
      }
    }).jpeg({ quality: 100 }).toBuffer();
    // }).png().toBuffer();
    return jpegBuffer

  } catch (error) {
    console.error('Errore durante la creazione dell\'immagine:', error);
  }
}


// Funzione per ridimensionare un'immagine bitmap
const resizeDicomFunc = async (bitmapData, columns, rows) => {
  try {
    // Crea un'immagine da una bitmap raw (assumendo 8-bit per pixel)
    const pixelData = new Uint8Array(bitmapData);
    const image = await Jimp.read(pixelData);

    // Ridimensiona l'immagine
    const resizedImage = image.resize(columns / 2, rows / 2);  // Dimezza la risoluzione

    // Salva l'immagine ridimensionata (opzionale)
    await resizedImage.writeAsync('resizedImage.bmp');

    // Restituisci il buffer dell'immagine ridimensionata
    return resizedImage.getBufferAsync(Jimp.MIME_BMP);
  } catch (error) {
    console.error('Errore durante il ridimensionamento dell\'immagine:', error);
    return null;
  }
};

const convertMonochromeDicomToJPEG = async (dicomData, columns, rows, photometricInterpretation, bitsAllocated, bitsStored, highBit, pixelRepresentation) => {
  const pixelData = new Uint8Array(dicomData);
  const frameSize = rows * columns;

  // Determina il numero di byte per pixel (bitsAllocated ci dice quanti bit per pixel)
  const bytesPerPixel = bitsAllocated / 8;

  // Crea un buffer per i dati normalizzati
  const normalizedPixelData = Buffer.alloc(frameSize);

  // Valore massimo possibile basato su bitsStored
  const maxPixelValue = Math.pow(2, bitsStored) - 1;

  // Loop per processare ogni pixel
  for (let i = 0; i < frameSize; i++) {
    // Leggi il valore del pixel
    let pixelValue;

    if (bytesPerPixel === 2) {
      // Se i pixel sono rappresentati con 2 byte (16 bit)
      pixelValue = pixelData[i * 2] + (pixelData[i * 2 + 1] << 8);

      // Se pixelRepresentation è signed, converti in signed integer
      if (pixelRepresentation === 1 && pixelValue > 32767) {
        pixelValue = pixelValue - 65536; // Valore corretto per signed 16-bit
      }
    } else {
      // Caso più semplice per 8-bit per pixel
      pixelValue = pixelData[i];
    }

    // Normalizza il valore dei pixel in base a bitsStored e highBit
    pixelValue = (pixelValue >> (bitsAllocated - highBit - 1)) & maxPixelValue;

    // Scala il valore a 0-255 per JPEG
    const scaledPixelValue = Math.floor((pixelValue / maxPixelValue) * 255);

    // Inverti i valori per Monochrome1, se necessario
    if (photometricInterpretation === 'MONOCHROME1') {
      normalizedPixelData[i] = 255 - scaledPixelValue;
    } else {
      normalizedPixelData[i] = scaledPixelValue;
    }
  }

  // Crea immagine JPEG con Sharp
  try {
    const jpegBuffer = await sharp(normalizedPixelData, {
      raw: {
        width: columns,
        height: rows,
        channels: 1,  // Scala di grigi
      }
    }).jpeg({ quality: 100 }).toBuffer();

    fs.writeFileSync('./immagine_salvata.jpeg', jpegBuffer);
    return jpegBuffer;

  } catch (error) {
    console.error('Errore durante la creazione dell\'immagine:', error);
    return null
  }
}

app.get('/viewer/wado-token', async (req, res) => {
  try {
    // Estrai i parametri dalla query string della richiesta
    let queryString = req.url.split('?')[1];
    if (!queryString || queryString === '') {
      res.status(400).json({ error: 'Devi fornire la query string.' });
      return;
    }
    const studyUID = req.query.studyUID;
    const seriesUID = req.query.seriesUID;
    const objectUID = req.query.objectUID;

    const partizione = req.query.partizione;

    // const apiUrl = `${req.headers.origin}:1000/WADO/${partizionePACS}/studies/${studyUID}/metadata`;
    // const apiUrl = `${req.headers.origin}:1000/WADO/${partizionePACS}?${queryString}`
    let apiUrl = `http://127.0.0.1:1000/WADO/${partizione}?${queryString}`;
    //console.log(apiUrl)
    if (apiUrl.includes('8080')) apiUrl = apiUrl.replace(/:8080/, '');

    //Verifica token

    const apiResponseToken = await fetch(apiUrl, {
      headers: {
        accept: 'application/dicom+json',
        'accept-language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
      },
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
    });
    if (!queryString.includes('bypass=token') && !apiResponseToken.ok && apiResponseToken.statusText.includes('Autenticazione non verificata')) {
      // console.error(`tokenData NON valido con chiamata: ${apiUrl}`)
      return res.status(500).json({
        error: 'Token non valido',
      });
    }
    const headers = apiResponseToken.headers;

    for (const [name, value] of headers.entries()) {
      // console.log(name, value)
    }

    await apiResponseToken.arrayBuffer();
    // console.log(`tokenData valido con chiamata: ${apiUrl}`)
    //Fine controllo token
    queryString = queryString.replace(
      'contentType=application/token',
      'contentType=application/dicom'
    );
    apiUrl = `http://127.0.0.1:1000/WADO/${partizione}?${queryString}`; //E' cambiata la queryString da token a dicom
    const apiResponse = await fetch(apiUrl, {
      headers: {
        accept: 'application/dicom+json',
        'accept-language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
      },
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
    });

    if (!apiResponse.ok) {
      throw new Error(`Errore nella chiamata API: ${apiResponse.status}`);
    }

    const dicomData = await apiResponse.arrayBuffer();
    const originalSizeKB = Number(
      (Buffer.from(dicomData, 'utf-8').length / 1024).toFixed(2)
    );
    // totaleDatiDicom += parseFloat(originalSizeKB)
    if (queryString.includes('&non-compresso')) {
      // console.log(`non comprimo il dicom con seriesUID ${seriesUID} in quanto superiore a 50 MB. Peso: ${originalSizeKB}`)
      const buffer = Buffer.from(dicomData);
      res.end(buffer);
    } else {
      // Comprimo solo se il file è minore di 50Mb altrimenti non avrebbe senso, troppo tempo per comperssione/decompressione
      zlib.gzip(dicomData, { level: 9 }, (err, compressedData) => {
        // Comprimi il JSON utilizzando Gzip
        if (err) {
          throw err;
        }

        // const compressedSizeKB = (compressedData.length / 1024).toFixed(2);

        // totaleDatiDicomCompressi += parseFloat(compressedSizeKB)
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Encoding', 'gzip');
        res.end(compressedData);

        // shareCompressData = compressedData
        // console.log(`Tempo di compressione: ${elapsedTime} ms`);

        // console.log(`Bin DICOM originale: ${originalSizeKB} kByte, Bin DicoDICOMm compresso: ${compressedSizeKB} kByte`);
        // console.log(`Risparmiati ${(totaleDatiDicom - totaleDatiDicomCompressi).toFixed(2)} kB`);
      });

    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Si è verificato un errore durante la richiesta dei dati.',
    });
  }
});

/*************** */
function compressAndSaveFile(filePath, outputPath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.error('Errore durante la lettura del file:', err);
      return;
    }
    zlib.gzip(data, (err, compressedData) => {
      if (err) {
        console.error('Errore durante la compressione dei dati:', err);
        return;
      }

      fs.mkdirSync(path.dirname(outputPath), { recursive: true });

      fs.writeFile(outputPath, compressedData, err => {
        if (err) {
          console.error('Si è verificato un errore durante la scrittura del file compresso:', err);
          return;
        }
        console.log('Il file DICOM compresso è stato salvato con successo in:', outputPath);
      });
    });
  });
}

// Funzione ricorsiva per leggere tutte le sottocartelle e applicare compressAndSaveFile a ogni file
function processDirectory(directoryPath, outputBasePath) {
  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      console.error('Errore durante la lettura della directory:', err);
      return;
    }

    files.forEach(file => {
      const filePath = path.join(directoryPath, file);
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error('Errore durante il recupero delle informazioni sul file:', err);
          return;
        }

        if (stats.isDirectory()) {
          // Se è una directory, esegui ricorsivamente processDirectory su di essa
          processDirectory(filePath, outputBasePath);
        } else {
          // Se è un file, applica la compressione e il salvataggio
          const relativePath = path.relative(outputBasePath, filePath);
          const outputPath = path.join(outputBasePath, relativePath + '.gz');
          compressAndSaveFile(filePath, outputPath);
        }
      });
    });
  });
}

// Percorso della cartella radice da cui iniziare
const rootDirectory = 'D:/Nolex/VisualizzatorePACS_3D/cached-dicom';
// Percorso della cartella cache in cui salvare i file compressi
const cacheDirectory = 'D:/Nolex/VisualizzatorePACS_3D/cached-dicom';

// processDirectory(rootDirectory, cacheDirectory);


/**************** */

//Calcolo velocità download per il client
var velocitaMBps;
app.get('/viewer/test-download', (req, res) => {
  const file = 'test-10mb.bin';
  const stat = fs.statSync(file);
  const fileSize = stat.size;

  res.set({
    'Content-Type': 'text/plain',
    'Content-Length': fileSize.toString(),
  });

  req.startTime = new Date();

  const readStream = fs.createReadStream(file);
  readStream.on('end', () => {
    const endTime = new Date();
    const duration = (endTime - req.startTime) / 1000; // Durata in secondi
    velocitaMBps = (fileSize / (duration * 1024 * 1024)).toFixed(2).toString(2); // Velocità in MB/s
    // console.log('Scaricato in:', duration);
    // console.log('Velocità di download (MB/s):', velocitaMBps);
    res.end(`Velocità di download: ${velocitaMBps} MB/s`); // Invia la velocità di download al client
  });

  readStream.on('data', chunk => {
  });

  readStream.pipe(res);
});

app.get('/viewer/ottieni-velocita', (req, res) => {

  res.set({
    'Content-Type': 'text/plain',
  });
  console.log('velocitaMBps ', velocitaMBps);
  res.end(`${velocitaMBps * 8} MBit/s | ${velocitaMBps} MB/s`);
});

//Info sul server, RAM e CPU
app.get('/viewer/info-server', (req, res) => {
  let totalMemory = (os.totalmem() / Math.pow(1024, 3)).toFixed(2);
  let freeMemory = (os.freemem() / Math.pow(1024, 3)).toFixed(2);
  let ramOccupata = (totalMemory - freeMemory).toFixed(2) + ' GB';
  totalMemory = totalMemory + ' GB';
  freeMemory = freeMemory + ' GB';

  function formatUptime() {
    const uptimeInSeconds = os.uptime();
    const days = Math.floor(uptimeInSeconds / (60 * 60 * 24));
    const hours = Math.floor((uptimeInSeconds % (60 * 60 * 24)) / (60 * 60));
    const minutes = Math.floor((uptimeInSeconds % (60 * 60)) / 60);
    const seconds = Math.floor(uptimeInSeconds % 60);

    return `${days} giorni, ${hours} ore, ${minutes} minuti, ${seconds} secondi`;
  }

  function getOSInfo() {
    const platform = os.platform();
    const release = os.release();

    let osName;

    if (platform === 'win32') {
      const windowsVersion = parseFloat(release);
      if (windowsVersion >= 10.0) {
        osName = 'Windows Server ' + windowsVersion;
      } else if (windowsVersion >= 6.3) {
        osName = 'Windows Server 2012 R2';
      } else if (windowsVersion >= 6.2) {
        osName = 'Windows Server 2012';
      } else if (windowsVersion >= 6.1) {
        osName = 'Windows Server 2008 R2';
      } else if (windowsVersion >= 6.0) {
        osName = 'Windows Server 2008';
      } else {
        osName = 'Windows (versione meno recente)';
      }
    } else if (platform === 'darwin') {
      osName = 'macOS';
    } else if (platform === 'linux') {
      osName = 'Linux';
    } else {
      osName = 'Sistema operativo sconosciuto';
    }

    return osName;
  }

  async function getCPUUsage() {
    const cpu = osu.cpu;
    let infoCPU;
    await cpu.usage().then(info => {
      infoCPU = info + '%';
    });
    return infoCPU;
  }

  async function getInfoDisk() {
    let diskPath;
    let freeDiskSpaceGB;
    let totalDiskSpaceGB;
    let occupatoSpaceGB;
    await checkDiskSpace(`${driveInUso}:/`).then(diskSpace => {
      diskPath = diskSpace.diskPath;
      freeDiskSpaceGB = (diskSpace.free / Math.pow(1024, 3)).toFixed(2);
      totalDiskSpaceGB = (diskSpace.size / Math.pow(1024, 3)).toFixed(2);
      occupatoSpaceGB = (totalDiskSpaceGB - freeDiskSpaceGB).toFixed(2) + ' GB';
      freeDiskSpaceGB = freeDiskSpaceGB + ' GB';
      totalDiskSpaceGB = totalDiskSpaceGB + ' GB';
    });
    return {
      diskPath: diskPath.charAt(0),
      spazioTotaleDisco: totalDiskSpaceGB,
      spazioOccupatoDisco: occupatoSpaceGB,
      spazioLiberoDisco: freeDiskSpaceGB,
    };
  }

  async function buildSystemInfo() {
    const cpuUsage = await getCPUUsage();
    const diskInfo = await getInfoDisk();
    const systemInfo = {
      uptime: formatUptime(),
      hostname: os.hostname(),
      machine: os.machine(),
      platform: getOSInfo(),
      arch: os.arch(),
      release: os.release(),
      type: os.type(),
      modelloCPU: os.cpus()[0].model,
      utilizzoCPU: cpuUsage,
      ramTotale: totalMemory,
      ramOccupata: ramOccupata,
      ramLibera: freeMemory,
      unitaDisco: diskInfo.diskPath,
      spazioTotaleDisco: diskInfo.spazioTotaleDisco,
      spazioOccupatoDisco: diskInfo.spazioOccupatoDisco,
      spazioLiberoDisco: diskInfo.spazioLiberoDisco,
    };

    console.log('Richieste informazioni sul server');
    res.end(JSON.stringify(systemInfo));
  }

  buildSystemInfo();
});

//SCARICA DICOM
app.get('/viewer/download-dicom', async (req, res) => {
  try {
    const apiUrl = `https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.12.2.1107.5.2.32.35162.30000015050317233592200000046/series/1.2.276.0.7230010.3.1.3.296485376.8.1542816659.201008/instances/1.2.276.0.7230010.3.1.4.296485376.8.1542816659.201009`;

    // Esegui la chiamata API
    const apiResponse = await fetch(apiUrl, {
      headers: {
        accept: 'application/dicom',
        'accept-language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
      },
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
    });

    if (!apiResponse.ok) {
      throw new Error(`Errore nella chiamata API: ${apiResponse.status}`);
    }
    const arrayBuffer = await apiResponse.arrayBuffer();
    const dicomData = Buffer.from(new Uint8Array(arrayBuffer));
    // res.setHeader('Content-Type', 'application/json');
    // res.setHeader('Content-Encoding', 'gzip');

    fs.writeFile('./downloaded-dicom/dicom.dcm', dicomData, err => {
      if (err) {
        console.error(
          'Si è verificato un errore durante la scrittura del file JSON:',
          err
        );
        // return res.status(500).json({ error: 'Si è verificato un errore durante la scrittura del file JSON.' });
      }

      console.log(
        'Il file DICOM è stato salvato con successo nella cartella del server.'
      );
    });

    // console.log('File DICOM JSON letto con successo!', newData);
    res.setHeader('Content-Type', 'application/dicom'); // O il tipo di contenuto appropriato

    return res.status(200).send(dicomData);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Si è verificato un errore durante la richiesta dei dati.',
    });
  }
});

async function leggiDicomDaPACS(apiUrl) {
  try {
    const apiUrlEdited = apiUrl.replace('application/token', 'application/dicom')
    const apiResponse = await fetch(apiUrlEdited, {
      headers: {
        accept: '*',
        'accept-language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
      },
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
    });
    if (!apiResponse.ok) {
      throw new Error(`Errore nella chiamata API: ${apiResponse.status}`);
    }
    const dicomData = await apiResponse.arrayBuffer();
    const buffer = Buffer.from(dicomData);
    return buffer;
  } catch (err) {
    console.error('Errore lettura Dicom da PACS: ', err)
  }
}

app.get('/viewer/mastertoken',
  async (req, res) => {
    try {
      const masterToken = getMasterToken()
      res.status(200).send(masterToken)
    } catch (err) {
      res.status(500).json({
        error: 'Si è verificato un errore durante la richiesta dei dati.',
      });
    }
  })

app.listen(port, () => {
  console.log(`Server in ascolto alla porta ${port}`);
});

function fixWLMetadati(jsondata) {
  //Fix WL - Se in una serie il windowcenter è 1, la serie viene invertita. Fix portandolo a 2 (in attesa del fix decoder cornerstone)
  jsondata.forEach((jsonEl => {
    const tagWL = jsonEl['00281050']?.Value;
    const tagWW = jsonEl['00281051']?.Value;
    if (Array.isArray(tagWW) && tagWW.length === 1 && tagWW[0] === 1) {
      tagWW[0] = 3
      tagWL[0] = 2
    }

  }))
  return jsondata
}

function getApiServerRemotoCliente(_apiUrl, partizione) {
  let apiUrl = _apiUrl
  const filePath = 'endpointremoti.json';
  if (!fs.existsSync(filePath)) {
    console.error('Storico remoto non configurato')
    return
  }

  const _datiServerRemoto = fs.readFileSync('endpointremoti.json', 'utf8');
  const datiServerRemoto = JSON.parse(_datiServerRemoto);
  let ipRemoto;
  let partizioneRemota;
  for (const dato of datiServerRemoto) {
    if (dato.cliente === partizione) {
      ipRemoto = dato.ipRemoto;
      partizioneRemota = dato.nomePartizioneRemota
    }
  }
  if (!ipRemoto || !partizioneRemota) {
    return console.error('Impossibile ottenere metadati remoti, ipRemoto non definito')
  }
  apiUrl = apiUrl.replace('127.0.0.1', ipRemoto)
  apiUrl = apiUrl.replace(partizione, partizioneRemota)
  return apiUrl

}

// Avvia il server (HTTPS)
// httpsServer.listen(port, () => {
//   console.log(`Server HTTPS in ascolto sulla porta ${port}`);
// });
