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
const crypto = require('crypto');
const vm = require('vm');
const { spawnSync, spawn } = require('child_process');
/*****************************************************************/

// Token fisso per usare il mastertoken lato backend
const FIXED_MASTER_TOKEN =
  'NiJ7SuNLy0hXsbZh6RfgHotZAtBYxXTNZsl05AVzcx0nK0UQ2YgE5dsvAqZMP522swwBMpirAKi8dTATJX';

function shouldUseFixedMasterToken(tokenParam) {
  return tokenParam === FIXED_MASTER_TOKEN;
}

function buildLocalViewerUrlFromInput(rawUrl) {
  const parsedUrl = new URL(rawUrl);

  // Forza sempre host locale e token fisso.
  parsedUrl.protocol = 'http:';
  parsedUrl.hostname = 'localhost';
  parsedUrl.port = '3000';
  parsedUrl.searchParams.set('Token', FIXED_MASTER_TOKEN);
  parsedUrl.searchParams.delete('token');

  return parsedUrl.toString();
}

/****************** Parametri di questa stazione *****************/
const port = 8080;
const driveInUso = 'C';
const partizionePACS = 'WEBPACS';
const pathCachedMetadata = './cached-metadata-json';
const pathCachedDICOM = './cached-dicom';
const cloudHeartbeatEnabled = true;
const cloudHeartbeatUrl = 'https://dashboard-viewer.nolex.it/api/heartbeat';
const cloudHeartbeatIntervalMs = 60000;
const cloudCommandPollingEnabled = true;
const cloudCommandPollIntervalMs = 60000;
const cloudRequestTimeoutMs = 45000;
const cloudDownloadTimeoutMs = 300000;
const cloudVerboseLogs = true;
const cloudClientIdPreset = '';
const cloudCustomerNamePreset = '';
const cloudUpdateTempDir = path.join(__dirname, 'cloud-update-temp');
const cloudClientIdFilePath = path.join(__dirname, 'cloud-client-id.json');
const cloudSelfUpdaterArg = '--cloud-self-update';
const cloudSelfUpdaterMode = process.argv[2] === cloudSelfUpdaterArg;
const cloudSelfUpdaterManifestPath = process.argv[3] || '';
const cloudVersionFileCandidates = [
  path.join(process.cwd(), 'build-viewer', 'version.txt'),
  path.join(__dirname, 'build-viewer', 'version.txt'),
  path.join(process.cwd(), 'version.txt'),
  path.join(__dirname, 'version.txt'),
];
const cloudCustomerConfigCandidates = [
  path.join(__dirname, 'dicomweb-proxy-master', 'build', 'config', 'default.json'),
  path.join(__dirname, 'dicomweb-proxy-master', 'config', 'default.json'),
  path.join(process.cwd(), 'dicomweb-proxy-master', 'build', 'config', 'default.json'),
  path.join(process.cwd(), 'dicomweb-proxy-master', 'config', 'default.json'),
];
const cloudHeartbeatClientId = resolveStableClientId();
const cloudHeartbeatVersion = (readBackendVersionFromFile() || 'unknown').trim();
let cloudHeartbeatClientName = (
  cloudCustomerNamePreset || readCloudCustomerNameFromProxyConfig(cloudHeartbeatClientId)
).trim();
const cloudApiBaseUrl = deriveCloudApiBaseUrl(cloudHeartbeatUrl);
const cloudClientCommandUrl = `${cloudApiBaseUrl}/api/client-command`;
const cloudClientUpdateStatusUrl = `${cloudApiBaseUrl}/api/client-update-status`;
const cloudClientRenameStatusUrl = `${cloudApiBaseUrl}/api/client-rename-status`;
const cloudClientCredTestResultUrl = `${cloudApiBaseUrl}/api/client-credential-test-result`;
/*****************************************************************/

/****************** EXPRESS *****************/
const app = express();
app.use(cors()); //imposta Allow-Origin' su *,
app.use(express.json()); //Accetta json nella richiesta post
/*****************************************************************/

/************  HTTPS  ***************/
const https = require('https');
const forceHttps =
  process.env.BACKEND_FORCE_HTTPS === '1' ||
  process.env.BACKEND_FORCE_HTTPS === 'true';
const keyCandidates = [
  process.env.HTTPS_KEY_PATH,
  path.join(process.cwd(), 'cert-https', 'suite.nolex.it-key.pem'),
  path.join(__dirname, 'cert-https', 'suite.nolex.it-key.pem'),
].filter(Boolean);
const certCandidates = [
  process.env.HTTPS_CERT_PATH,
  process.env.HTTPS_CRT_PATH,
  path.join(process.cwd(), 'cert-https', 'suite.nolex.it-crt.pem'),
  path.join(__dirname, 'cert-https', 'suite.nolex.it-crt.pem'),
].filter(Boolean);
const keyPath = keyCandidates.find(p => fs.existsSync(p));
const certPath = certCandidates.find(p => fs.existsSync(p));

let httpsServer = null;
if (keyPath && certPath) {
  try {
    const privateKey = fs.readFileSync(keyPath, 'utf8');
    const certificate = fs.readFileSync(certPath, 'utf8');
    const credentials = { key: privateKey, cert: certificate };
    httpsServer = https.createServer(credentials, app);
    console.log(`HTTPS certificates loaded. key=${keyPath} cert=${certPath}`);
  } catch (err) {
    console.warn('Unable to initialize HTTPS server, fallback to HTTP.', err.message);
    if (forceHttps) {
      throw err;
    }
  }
} else {
  const message =
    'HTTPS certificates not found, fallback to HTTP. ' +
    `Checked key: ${keyCandidates.join(' | ')} ; cert: ${certCandidates.join(' | ')}`;
  if (forceHttps) {
    throw new Error(message);
  }
  console.warn(message);
}

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
  viewportOverlayTags: {
    cornerTopLeft: [
      { tag: '0008,0020', format: 'date' }, // StudyDate
      { tag: '0020,0011', prefix: 'S: ' }, // SeriesNumber
      { tag: '0008,103E' }, // SeriesDescription
    ],
    cornerTopRight: [
      { tag: '0010,0010', format: 'pn', suffixTag: '0010,0040' }, // PatientName (+ PatientSex)
      { tag: '0010,0020', prefix: 'ID: ' }, // PatientID
      { tag: '0008,0050' }, // AccessionNumber
    ],
    cornerBottomLeft: [],
    cornerBottomRight: [],
  },
  visualizzazione: {
    totMonitor: 0,
    modalitÃ : '', //singola o estesa
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
            'Si Ã¨ verificato un errore durante la creazione della cartella:',
            err
          );
        } else {
          console.log('Cartella creata con successo.');
          fs.writeFile(`${filePath}/preferenze.json`, jsonString, err => {
            if (err) {
              console.error(
                'Si Ã¨ verificato un errore durante la scrittura del file JSON:',
                err
              );
              return res
                .status(500)
                .send(
                  'Si Ã¨ verificato un errore durante la scrittura del file JSON.'
                );
            }

            console.log('File JSON creato e personalizzato con successo!');
            // return res.status(200).send('File JSON creato e personalizzato con successo.');

            // leggo il JSON appena creato
            fs.readFile(`${filePath}/preferenze.json`, (err, newData) => {
              if (err) {
                console.error(
                  'Si Ã¨ verificato un errore durante la lettura del file JSON:',
                  err
                );
                return res
                  .status(500)
                  .send(
                    'Si Ã¨ verificato un errore durante la lettura del file JSON.'
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
      //Controllo se per l'utente c'Ã¨ anche un CSS dedicato
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
      'Si Ã¨ verificato un errore durante la scrittura del file JSON:',
      err
    );
    res.status(500).send('Si Ã¨ verificato un errore durante la scrittura del file JSON.');
  }
});


const handleGetViewportOverlay = (req, res) => {
  let user = req.query.user;
  const AETitle = req.params.AETitle;
  if (!user || user === 'null' || user === 'undefined') {
    return res.status(500).send('User non valido');
  }
  if (user.trim() === '') {
    user = 'eurekaonline';
  }
  if (user.includes('.')) {
    return res.status(500).send('User errato');
  }

  const filePath = `./platform/viewer/public/userdata/${AETitle}/${user}`;

  fs.readFile(`${filePath}/preferenze.json`, (err, data) => {
    if (err) {
      const jsonString = JSON.stringify(defaultJsonData, null, 2);
      fs.mkdir(filePath, { recursive: true }, mkdirErr => {
        if (mkdirErr) {
          console.error(
            'Si ???? verificato un errore durante la creazione della cartella:',
            mkdirErr
          );
          return res.status(500).send('Impossibile creare cartella preferenze');
        }
        fs.writeFile(`${filePath}/preferenze.json`, jsonString, writeErr => {
          if (writeErr) {
            console.error(
              'Si ???? verificato un errore durante la scrittura del file JSON:',
              writeErr
            );
            return res
              .status(500)
              .send('Si ???? verificato un errore durante la scrittura del file JSON.');
          }
          return res.status(200).send({
            viewportOverlayTags: defaultJsonData.viewportOverlayTags,
          });
        });
      });
    } else {
      try {
        const json = JSON.parse(data);
        return res.status(200).send({
          viewportOverlayTags: json.viewportOverlayTags || defaultJsonData.viewportOverlayTags,
        });
      } catch (parseErr) {
        console.error('Errore nel parsing delle preferenze:', parseErr);
        return res.status(500).send('Errore nel parsing delle preferenze');
      }
    }
  });
};

const handlePostViewportOverlay = (req, res) => {
  let user = req.query.user;
  let userBody = req.body.username;
  const AETitle = req.params.AETitle;

  if (user?.trim?.() === '') {
    user = 'eurekaonline';
  }
  if (user?.includes?.('.')) {
    return res.status(500).send('User errato');
  }

  if (userBody?.trim?.() === '') {
    userBody = 'eurekaonline';
  }
  if (!userBody || userBody !== user) {
    return res.status(500).send('User errato');
  }

  const overlayTags = req.body.viewportOverlayTags;
  if (!overlayTags) {
    return res.status(500).send('Nella richiesta mancano i viewportOverlayTags');
  }

  const filePath = `./platform/viewer/public/userdata/${AETitle}/${user}`;
  fs.mkdir(filePath, { recursive: true }, mkdirErr => {
    if (mkdirErr) {
      console.error(
        'Si ???? verificato un errore durante la creazione della cartella:',
        mkdirErr
      );
      return res.status(500).send('Impossibile creare cartella preferenze');
    }

    fs.readFile(`${filePath}/preferenze.json`, (err, data) => {
      let json = JSON.parse(JSON.stringify(defaultJsonData));
      if (!err && data) {
        try {
          json = JSON.parse(data);
        } catch (parseErr) {
          console.error('Errore nel parsing delle preferenze:', parseErr);
        }
      }

      json.viewportOverlayTags = overlayTags;

      const jsonString = JSON.stringify(json, null, 2);
      fs.writeFile(`${filePath}/preferenze.json`, jsonString, writeErr => {
        if (writeErr) {
          console.error(
            'Si ???? verificato un errore durante la scrittura del file JSON:',
            writeErr
          );
          return res
            .status(500)
            .send('Si ???? verificato un errore durante la scrittura del file JSON.');
        }
        return res.status(200).send('Viewport overlay salvato con successo.');
      });
    });
  });
};

app.get('/viewer/userdata/:AETitle/viewport-overlay', handleGetViewportOverlay);
app.post('/viewer/userdata/:AETitle/viewport-overlay', handlePostViewportOverlay);
// Legacy routes (compatibilit??)
app.get('/viewer/viewport-overlay/:AETitle', handleGetViewportOverlay);
app.post('/viewer/viewport-overlay/:AETitle', handlePostViewportOverlay);


//Quido - Remoto
app.get('/viewer/qido-remoto/studies', async (req, res) => {
  try {
    let queryString = req.url.split('?')[1];
    const aetitle = req.query.aetitle
    console.log('laetitle Ã¨ ', aetitle)
    if (!queryString || queryString === '') {
      res.status(400).json({ error: 'Devi fornire la query string.' });
      return;
    }

    // console.log(queryString)
    const StudyInstanceUIDs = queryString.split('&StudyInstanceUIDs=')[1] || queryString.split('&StudyInstanceUID=')[1]
    let patientIDQido;
    if (queryString.includes('&limit')) patientIDQido = queryString.split('&limit')[0].replace(/\*/g, "")
    //Il patientID originariamente viene fornito con ** che lo delimitano (es. *2760*) ma ciÃ² comporta la ricerca in tutte le partizioni esistenti,
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
      console.error('L\'ip del server remoto non Ã¨ definito')
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
//Le chiamate vengono fatte al dicomproxy-web sulla porta 7000. Il client chiamerÃ  l'endpoint quido e internamente faccio le chiamate al proxy,
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
    console.log('laetitle Ã¨ ', aetitle)
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
    //Il patientID originariamente viene fornito con ** che lo delimitano (es. *2760*) ma ciÃ² comporta la ricerca in tutte le partizioni esistenti,
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
	 
	 //Il tipo di url seguente Ã¨ generato dalla worklist nativa del viewer quindi quando chiedo la lista totale degli studi.
	// if(apiUrl.includes('?StudyInstanceUID=undefined&')){	
	 
	if (queryString.includes('askWorklist')) {
   if (aetitle && aetitle !== "null" && aetitle !== "undefined") {
        apiUrl = apiUrl.replace('/rs/studies', `/rs/${aetitle.toLowerCase()}/studies`);
    }
    apiUrl = apiUrl.replace('?StudyInstanceUID=undefined&', '?');

    apiUrl += `&StudyDate=${studyDate}`;
    if(apiUrl.includes("%2C")) apiUrl = apiUrl.replaceAll("%2C", "\\"); //per piÃ¹ modality

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
    if (response.length === 0 && !askWorklist) {
      const allowRemoteFallback = shouldAttemptRemoteFallback(req, aetitle);
      if (allowRemoteFallback) {
        // Potrebbe essere disponibile in remoto
        const remoteApiUrl = getApiServerRemotoCliente(apiUrl, aetitle);
        if (remoteApiUrl) {
          const remoteApiResponse = await fetch(remoteApiUrl, {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit',
          });

          if (!remoteApiResponse.ok) {
            throw new Error(`Errore nella chiamata API: ${remoteApiResponse.status}`);
          }

          response = await remoteApiResponse.json();
        } else {
          console.warn(
            `Storico remoto non configurato per '${aetitle}', restituisco risposta locale vuota.`
          );
        }
      } else {
        console.log(
          `Nessun risultato locale su qido/studies per '${aetitle}', fallback remoto non richiesto.`
        );
      }
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
    try {
      const queryParams = new URLSearchParams(queryString);
      const tokenParam = queryParams.get('Token') || queryParams.get('token');
      if (shouldUseFixedMasterToken(tokenParam)) {
        const masterToken = getMasterToken();
        queryParams.set('Token', masterToken);
        queryParams.delete('token');
        queryString = queryParams.toString();
      }
    } catch (err) {
      console.warn('Impossibile normalizzare il token nella query string', err);
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
//       console.error('Si Ã¨ verificato un errore durante la scrittura del file JSON:', err);
//       return res.status(500).send('Si Ã¨ verificato un errore durante la scrittura del file JSON.');
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
  //     console.error('Si Ã¨ verificato un errore durante il salvataggio dell\'immagine:', err);
  //     return res.status(500).send('Si Ã¨ verificato un errore durante il salvataggio dell\'immagine.');
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
        'Si Ã¨ verificato un errore durante la scrittura del file JSON:',
        err
      );
      return res
        .status(500)
        .send('Si Ã¨ verificato un errore durante la scrittura del file JSON.');
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
        //questo vr non accetta piÃ¹ di 16 caratteri perciÃ² mi assicuro che vengano troncati caratteri in piÃ¹
        a.Value = a.Value.substring(0, 16);
        dicomDict.dict[a.tag] = { vr: a.vr, Value: [a.Value] };
      }
      //TAG che coincidono con quelli che mi servono e che andrÃ² a creare
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
        //Il tag DS accetta solo numeri per questo lo escludo da tutto il resto che Ã¨ stringa
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
          'Si Ã¨ verificato un errore durante la scrittura del file DICOM:',
          err
        );
        return res
          .status(500)
          .send(
            'Si Ã¨ verificato un errore durante la scrittura del file DICOM.'
          );
      }

      console.log('File DICOM con immagine chiave generato');
      return res.status(200).send('File DICOM generato con successo.');
    }
  );
});

app.get(/^\/viewer\/wado\/studies\/(.+)\/metadata$/, async (req, res) => {
  let notInCache = true;
  try {
    const rawStudyID = `${req.params[0] || ''}`
    let parsedStudyID = rawStudyID
    try {
      parsedStudyID = decodeURIComponent(rawStudyID)
    } catch (err) {
      console.warn('Impossibile fare decodeURIComponent di studyID, uso valore raw', rawStudyID)
    }

    // In alcuni flussi (storico locale) puÃ² arrivare un UID "sporcato" da slash/backslash.
    // Mantengo l'ultimo segmento che contiene lo study effettivo.
    const normalizedStudyID =
      parsedStudyID
        .replace(/\\/g, '/')
        .split('/')
        .filter(Boolean)
        .pop() || parsedStudyID

    let studyUID = normalizedStudyID
    const partizioneFromQuery = req.query.partizione || req.query.aetitle
    let partizione = Array.isArray(partizioneFromQuery) ? partizioneFromQuery[0] : partizioneFromQuery

    if (studyUID.includes('|')) {
      const studyUIDSplit = studyUID.split('|')
      studyUID = studyUIDSplit[0]
      if (!partizione && studyUIDSplit[1]) {
        partizione = studyUIDSplit[1]
      }
    }

    partizione = normalizePartizione(partizione);

    if (!partizione) {
      partizione = resolvePartizioneFromRequest(req);
    }

    if (!partizione) {
      partizione = partizionePACS
    }
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
                  'Si Ã¨ verificato un errore durante la lettura del file JSON:',
                  err
                );
                return res.status(500).gz({
                  error:
                    'Si Ã¨ verificato un errore durante la lettura del file JSON.',
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
      console.log('non Ã¨ in cache');
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
        console.warn(
          `Metadata locale non OK (${apiResponse.status} ${apiResponse.statusText}) su ${apiUrl}`
        );
        const shouldTryRemote =
          apiResponse.status === 404 ||
          /not found|non trovato|study not found/i.test(apiResponse.statusText || '');
        const allowRemoteFallback = shouldAttemptRemoteFallback(req, partizioneFromQuery);
        if (!shouldTryRemote || !allowRemoteFallback) {
          if (shouldTryRemote && !allowRemoteFallback) {
            console.warn(
              `Fallback remoto disabilitato per metadata (${partizione || 'N/D'}).`
            );
          }
          throw new Error(
            `Metadata locale non disponibile con stato ${apiResponse.status} ${apiResponse.statusText}`
          );
        }
        apiUrl = getApiServerRemotoCliente(apiUrl, partizione)
        if (!apiUrl) {
          throw new Error('Impossibile ottenere metadati remoti, ipRemoto non definito')
        }
        console.log('Forse non c\'Ã¨ storico, provo con', apiUrl)
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
      //Fix WL - Se in una serie il windowcenter Ã¨ 1, la serie viene invertita. Fix portandolo a 2 (in attesa del fix decoder cornerstone)
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
                  'Si Ã¨ verificato un errore durante la scrittura del file JSON:',
                  err
                );
                return res.status(500).json({
                  error:
                    'Si Ã¨ verificato un errore durante la scrittura del file JSON.',
                });
              }

              console.log(
                'Il file JSON compresso Ã¨ stato salvato con successo nella cartella cache del server.'
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
      error: 'Si Ã¨ verificato un errore durante la richiesta dei dati.',
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
      let aetitle = req.query.aetitle;
      const useMasterToken =
        shouldUseFixedMasterToken(_token) || (aetitle && aetitle.includes('_frmwl'));
      //Se viene dall'explorer worklist
      if (aetitle && aetitle.includes('_frmwl')) {
        aetitle = aetitle.split('_frmwl')[0];
      }
      let token = useMasterToken ? getMasterToken() : _token;
      token = tokenPerStorico(token);
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

      //Magari non c'Ã¨ sul cloud quindi provo sul server del cliente
      /** DATI DAL SERVER REMOTO **/
      if (!apiResponse.ok) {
        const allowRemoteFallback = shouldAttemptRemoteFallback(req, req.query.aetitle || aetitle);
        if (!allowRemoteFallback) {
          throw new Error(
            `Errore nella chiamata API locale: ${apiResponse.status} ${apiResponse.statusText}`
          );
        }
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
        //Fix RRGGBB --> l'attuale decoder cornerstone da problemi per cui converto questo bitmpa particolare in png lossless. Un RRGGBB Ã¨ dato
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
        error: 'Si Ã¨ verificato un errore durante la richiesta dei dati.',
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
      let aetitle = req.query.aetitle;
      if (aetitle && aetitle.includes("_frmwl")) aetitle = aetitle.split("_frmwl")[0]
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
        const allowRemoteFallback = shouldAttemptRemoteFallback(req, req.query.aetitle || aetitle);
        if (allowRemoteFallback) {
          //Potrebbe essere stato richiesto da storico remoto
          apiUrl = getApiServerRemotoCliente(apiUrl, aetitle)
          if (!apiUrl) {
            console.error('L\'ip del server remoto non Ã¨ definito')
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
        } else {
          return res.status(apiResponse.status).json({
            error: `Studio non disponibile in locale (${apiResponse.statusText})`,
          });
        }
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
        error: 'Si Ã¨ verificato un errore durante la richiesta dei dati.',
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
//     //     console.error('Si Ã¨ verificato un errore durante la scrittura del file DICOM:', err);
//     //     return res.status(500).send('Si Ã¨ verificato un errore durante la scrittura del file DICOM.');
//     //   }

//     //   console.log("File scritto");
//     //   // return res.status(200).send('File DICOM generato con successo.');
//     // })

//     // Restituisci i dati compressi al client
//     return res.status(200).end(jsonString);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       error: 'Si Ã¨ verificato un errore durante la richiesta dei dati.',
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
  //Prende come input il token originale passato dal PACS e in piÃ¹ aggiunge 4 caratteri all'inizio dello stesso applicando la seguente regola:
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
  //Fix RRGGBB --> l'attuale decoder cornerstone da problemi per cui converto questo bitmap particolare in png lossless. Un RRGGBB Ã¨ dato
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

      // Se pixelRepresentation Ã¨ signed, converti in signed integer
      if (pixelRepresentation === 1 && pixelValue > 32767) {
        pixelValue = pixelValue - 65536; // Valore corretto per signed 16-bit
      }
    } else {
      // Caso piÃ¹ semplice per 8-bit per pixel
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
      // Comprimo solo se il file Ã¨ minore di 50Mb altrimenti non avrebbe senso, troppo tempo per comperssione/decompressione
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
      error: 'Si Ã¨ verificato un errore durante la richiesta dei dati.',
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
          console.error('Si Ã¨ verificato un errore durante la scrittura del file compresso:', err);
          return;
        }
        console.log('Il file DICOM compresso Ã¨ stato salvato con successo in:', outputPath);
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
          // Se Ã¨ una directory, esegui ricorsivamente processDirectory su di essa
          processDirectory(filePath, outputBasePath);
        } else {
          // Se Ã¨ un file, applica la compressione e il salvataggio
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

//Calcolo velocitÃ  download per il client
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
    velocitaMBps = (fileSize / (duration * 1024 * 1024)).toFixed(2).toString(2); // VelocitÃ  in MB/s
    // console.log('Scaricato in:', duration);
    // console.log('VelocitÃ  di download (MB/s):', velocitaMBps);
    res.end(`VelocitÃ  di download: ${velocitaMBps} MB/s`); // Invia la velocitÃ  di download al client
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
          'Si Ã¨ verificato un errore durante la scrittura del file JSON:',
          err
        );
        // return res.status(500).json({ error: 'Si Ã¨ verificato un errore durante la scrittura del file JSON.' });
      }

      console.log(
        'Il file DICOM Ã¨ stato salvato con successo nella cartella del server.'
      );
    });

    // console.log('File DICOM JSON letto con successo!', newData);
    res.setHeader('Content-Type', 'application/dicom'); // O il tipo di contenuto appropriato

    return res.status(200).send(dicomData);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Si Ã¨ verificato un errore durante la richiesta dei dati.',
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
        error: 'Si Ã¨ verificato un errore durante la richiesta dei dati.',
      });
    }
  })

app.post('/viewer/normalize-viewer-link', (req, res) => {
  try {
    const inputUrl = req.body?.url || req.body?.link || req.body?.viewerUrl;

    if (!inputUrl || typeof inputUrl !== 'string') {
      return res.status(400).json({
        error: "Body non valido. Invia un JSON con un campo stringa 'url' (oppure 'link'/'viewerUrl').",
      });
    }

    const normalizedUrl = buildLocalViewerUrlFromInput(inputUrl.trim());
    return res.status(200).json({ normalizedUrl });
  } catch (err) {
    console.error('Errore normalizzazione link viewer:', err);
    return res.status(400).json({
      error: 'URL non valido.',
    });
  }
});

let cloudUpdateInProgress = false;
let cloudRenameInProgress = false;
let cloudUpdateCancelRequested = false;
let cloudCustomerNameInitialized = false; // scritto nel JSON al primo avvio se mancante
let cloudUpdateAbortController = null;
let cloudUpdateCurrentTargetVersion = '';
let cloudUpdateCurrentTempRoot = '';

if (cloudSelfUpdaterMode) {
  runEmbeddedCloudSelfUpdater(cloudSelfUpdaterManifestPath).catch(err => {
    console.error(`[${cloudNow()}] [cloud-update] updater embedded errore fatale: ${err.message}`);
    process.exit(1);
  });
} else {
app.listen(port, () => {
  console.log(`Server in ascolto alla porta ${port}`);
  const pm2Mode = normalizeNonEmptyText(process.env.pm_id) ? 'pm2' : 'standalone';
  const processUser = getProcessUserLabel();
  console.log(`[${cloudNow()}] [cloud-polling] utente processo: ${processUser}`);
  console.log(`[${cloudNow()}] [cloud-polling] modalita avvio: ${pm2Mode} (nessun comando manuale richiesto)`);
  startCloudHeartbeat();
  startCloudCommandPolling();
});
}

function readBackendVersionFromFile() {
  const candidates = cloudVersionFileCandidates.filter(Boolean);

  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) {
        continue;
      }
      const raw = fs.readFileSync(candidate, 'utf8').replace(/^\uFEFF/, '').trim();
      if (!raw) {
        continue;
      }

      const explicitVersionMatch = raw.match(/version\s*[:=]\s*([^\s]+)/i);
      const resolvedVersion = explicitVersionMatch?.[1] || raw.split(/\s+/)[0];
      if (cloudVerboseLogs) {
        console.log(
          `[cloud-polling] versione letta da ${candidate} -> ${resolvedVersion} (raw="${raw.slice(
            0,
            120
          )}")`
        );
      }
      return resolvedVersion;
    } catch (err) {
      console.warn(`[${cloudNow()}] [cloud-polling] impossibile leggere la versione da ${candidate}: ${err.message}`);
    }
  }

  if (cloudVerboseLogs) {
    console.warn(`[${cloudNow()}] [cloud-polling] nessun file versione valido trovato, uso fallback vuoto`);
  }
  return '';
}

function normalizeNonEmptyText(value) {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value).trim();
}

function normalizeElevationCredentials(rawValue) {
  if (!rawValue || typeof rawValue !== 'object') {
    return null;
  }

  const username = normalizeNonEmptyText(
    rawValue.username || rawValue.user || rawValue.adminUsername || rawValue.account
  );
  const password = normalizeNonEmptyText(
    rawValue.password || rawValue.pass || rawValue.adminPassword || rawValue.secret
  );

  if (!username || !password) {
    return null;
  }

  return { username, password };
}

function hasElevationCredentials(credentials) {
  return Boolean(
    credentials &&
      typeof credentials === 'object' &&
      normalizeNonEmptyText(credentials.username) &&
      normalizeNonEmptyText(credentials.password)
  );
}

function createCloudUpdatePermissionDeniedError(details = '') {
  const suffix = normalizeNonEmptyText(details);
  const err = new Error(`Permessi insufficienti${suffix ? `: ${suffix}` : ''}`);
  err.code = 'CLOUD_UPDATE_PERMISSION_DENIED';
  return err;
}

function createCloudUpdateInvalidAdminCredentialsError(details = '') {
  const suffix = normalizeNonEmptyText(details);
  const err = new Error(`Credenziali utente amministratore errate${suffix ? `: ${suffix}` : ''}`);
  err.code = 'CLOUD_UPDATE_BAD_CREDENTIALS';
  return err;
}

function getProcessUserLabel() {
  const winUser = normalizeNonEmptyText(
    process.env.USERDOMAIN && process.env.USERNAME
      ? `${process.env.USERDOMAIN}\\${process.env.USERNAME}`
      : process.env.USERNAME
  );
  if (winUser) {
    return winUser;
  }
  try {
    return normalizeNonEmptyText(os.userInfo().username) || 'sconosciuto';
  } catch (_err) {
    return 'sconosciuto';
  }
}

function deriveCloudApiBaseUrl(heartbeatUrl) {
  try {
    const parsed = new URL(heartbeatUrl);
    return `${parsed.protocol}//${parsed.host}`;
  } catch (_err) {
    return 'https://dashboard-viewer.nolex.it';
  }
}

function runCommandSafe(command, args = []) {
  try {
    const result = spawnSync(command, args, {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 4000,
    });

    if (result.error || result.status !== 0) {
      return '';
    }

    return normalizeNonEmptyText(result.stdout);
  } catch (_err) {
    return '';
  }
}

function readWindowsMachineGuid() {
  const commands = [
    ['reg', ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid']],
    ['reg', ['query', 'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Cryptography', '/v', 'MachineGuid']],
  ];

  for (const [command, args] of commands) {
    const output = runCommandSafe(command, args);
    if (!output) {
      continue;
    }

    const match = output.match(/MachineGuid\s+REG_SZ\s+([^\r\n]+)/i);
    if (match && match[1]) {
      return normalizeNonEmptyText(match[1]);
    }
  }

  return '';
}

function readLinuxMachineId() {
  const candidates = ['/etc/machine-id', '/var/lib/dbus/machine-id'];
  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) {
        continue;
      }
      const value = fs.readFileSync(candidate, 'utf8').trim();
      if (value) {
        return value;
      }
    } catch (_err) {
      // ignore
    }
  }
  return '';
}

function readMacPlatformUuid() {
  const output = runCommandSafe('ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice']);
  if (!output) {
    return '';
  }
  const match = output.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/i);
  return match?.[1] ? normalizeNonEmptyText(match[1]) : '';
}

function getMacAddressesFingerprint() {
  const interfaces = os.networkInterfaces() || {};
  const macs = [];

  Object.values(interfaces).forEach(addresses => {
    (addresses || []).forEach(address => {
      const mac = normalizeNonEmptyText(address?.mac).toLowerCase();
      if (!mac || mac === '00:00:00:00:00:00') {
        return;
      }
      macs.push(mac);
    });
  });

  const unique = [...new Set(macs)].sort();
  return unique.join('|');
}

function generateUuidV4() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback manuale per Node < 14.17
  const bytes = crypto.randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant RFC4122
  const hex = bytes.toString('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
}

function resolveStableClientId() {
  // 1. Preset esplicito (override manuale)
  const presetClientId = normalizeNonEmptyText(cloudClientIdPreset);
  if (presetClientId) {
    return presetClientId;
  }

  // 2. UUID persistito su file — generato una sola volta per macchina
  try {
    if (fs.existsSync(cloudClientIdFilePath)) {
      const stored = JSON.parse(fs.readFileSync(cloudClientIdFilePath, 'utf8'));
      const storedId = normalizeNonEmptyText(stored?.clientId);
      if (storedId) {
        return storedId;
      }
    }
  } catch (_e) { /* file corrotto o assente, ne generiamo uno nuovo */ }

  const newId = generateUuidV4();
  try {
    fs.writeFileSync(cloudClientIdFilePath, JSON.stringify({ clientId: newId }, null, 2), 'utf8');
  } catch (writeErr) {
    console.warn(`[cloud] impossibile persistere cloud-client-id.json: ${writeErr.message}`);
  }
  return newId;
}

function parseProxyConfigJson(rawContent, sourceLabel) {
  const text = normalizeNonEmptyText(rawContent).replace(/^\uFEFF/, '');
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (_jsonErr) {
    // fallback to relaxed parser for config files with comments/trailing commas
  }

  try {
    const parsed = vm.runInNewContext(`(${text})`, {}, { timeout: 500, filename: sourceLabel });
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (_vmErr) {
    // ignore
  }

  return null;
}

function cloudNow() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function readCloudCustomerNameFromProxyConfig(clientId) {
  const fallbackName = `Nome non presente-${clientId}`;

  const configCandidates = cloudCustomerConfigCandidates.filter(Boolean);
  if (cloudVerboseLogs) {
    console.log(
      `[cloud-polling] ricerca nome cliente su config candidates: ${configCandidates.join(' | ')}`
    );
  }

  // Controlla prima il file sidecar (cloud-customer-name.json) nella directory base del backend.
  // Questo file e' sempre scrivibile anche quando i file config del proxy sono locked.
  const sidecarPath = path.join(path.dirname(__filename), 'cloud-customer-name.json');
  try {
    if (fs.existsSync(sidecarPath)) {
      const sidecarRaw = fs.readFileSync(sidecarPath, 'utf8');
      const sidecarParsed = JSON.parse(sidecarRaw);
      const sidecarName = normalizeNonEmptyText(sidecarParsed?.cloudCustomerName || sidecarParsed?.customerName);
      if (sidecarName) {
        if (cloudVerboseLogs) console.log(`[${cloudNow()}] [cloud-polling] nome letto da sidecar cloud-customer-name.json -> ${sidecarName}`);
        return sidecarName;
      }
    }
  } catch (_sidecarErr) {}

  const filePath = configCandidates.find(candidate => fs.existsSync(candidate));
  if (!filePath) {
    if (cloudVerboseLogs) {
      console.warn(`[${cloudNow()}] [cloud-polling] config proxy non trovato, uso fallback nome=${fallbackName}`);
    }
    return fallbackName;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = parseProxyConfigJson(raw, filePath);
    if (!parsed || typeof parsed !== 'object') {
      return fallbackName;
    }

    const candidateNames = [
      parsed.cloudCustomerName,
      parsed.customerName,
      parsed.cliente,
    ];

    for (const value of candidateNames) {
      const normalized = normalizeNonEmptyText(value);
      if (normalized) {
        if (cloudVerboseLogs) {
          console.log(`[${cloudNow()}] [cloud-polling] nome cliente letto da ${filePath} -> ${normalized}`);
        }
        return normalized;
      }
    }
  } catch (_err) {
    if (cloudVerboseLogs) {
      console.warn(
        `[cloud-polling] errore parsing config ${filePath}, uso fallback nome=${fallbackName}`
      );
    }
    return fallbackName;
  }

  if (cloudVerboseLogs) {
    console.warn(`[${cloudNow()}] [cloud-polling] nome non presente su ${filePath}, uso fallback nome=${fallbackName}`);
  }
  return fallbackName;
}

function getCurrentClientVersion() {
  return readBackendVersionFromFile() || cloudHeartbeatVersion || 'unknown';
}

function refreshCloudHeartbeatClientNameFromConfig() {
  const presetName = normalizeNonEmptyText(cloudCustomerNamePreset);
  if (presetName) {
    cloudHeartbeatClientName = presetName;
    if (cloudVerboseLogs) {
      console.log(`[${cloudNow()}] [cloud-polling] uso cloudCustomerNamePreset -> ${cloudHeartbeatClientName}`);
    }
    return;
  }

  const configName = normalizeNonEmptyText(readCloudCustomerNameFromProxyConfig(cloudHeartbeatClientId));
  if (!configName) {
    return;
  }

  if (configName.startsWith('Nome non presente-')) {
    if (cloudVerboseLogs) {
      console.warn(
        `[cloud-polling] nome letto in fallback (${configName}), mantengo nome corrente=${cloudHeartbeatClientName}`
      );
    }
    // Scrivi la proprietà cloudCustomerName nel JSON la prima volta che risulta mancante,
    // così la dashboard può vederla e l'utente può editarla senza che sia vuota.
    if (!cloudCustomerNameInitialized) {
      cloudCustomerNameInitialized = true;
      try {
        applyCloudCustomerNameToProxyConfigs(configName);
        if (cloudVerboseLogs) {
          console.log(`[${cloudNow()}] [cloud-polling] proprietà cloudCustomerName inizializzata nei file config -> "${configName}"`);
        }
      } catch (err) {
        if (cloudVerboseLogs) {
          console.warn(`[${cloudNow()}] [cloud-polling] inizializzazione proprietà cloudCustomerName fallita: ${err.message}`);
        }
      }
    }
    return;
  }

  if (configName !== cloudHeartbeatClientName && cloudVerboseLogs) {
    console.log(
      `[cloud-polling] nome cliente aggiornato da config: ${cloudHeartbeatClientName} -> ${configName}`
    );
  }
  cloudHeartbeatClientName = configName;
}

function buildCloudIdentityPayload() {
  refreshCloudHeartbeatClientNameFromConfig();

  return {
    customerName: cloudHeartbeatClientName,
    clientId: cloudHeartbeatClientId,
    backendPort: port,
  };
}

function sanitizeUrlForLog(rawUrl) {
  try {
    const parsed = new URL(String(rawUrl || ''));
    return `${parsed.origin}${parsed.pathname}`;
  } catch (_err) {
    return String(rawUrl || '');
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = cloudRequestTimeoutMs, label = 'request') {
  const timeout = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : cloudRequestTimeoutMs;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, {
      ...(options || {}),
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error(`${label} timeout dopo ${timeout}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function sendCloudUpdateStatus(status, message = '', extraPayload = {}) {
  if (!cloudClientUpdateStatusUrl || typeof fetch !== 'function') {
    return;
  }

  const payload = {
    ...buildCloudIdentityPayload(),
    version: getCurrentClientVersion(),
    status: normalizeNonEmptyText(status) || 'unknown',
    message: normalizeNonEmptyText(message),
    sentAt: new Date().toISOString(),
    ...extraPayload,
  };

  try {
    const response = await fetchWithTimeout(
      cloudClientUpdateStatusUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
      cloudRequestTimeoutMs,
      'update-status request'
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status} ${response.statusText} ${errorText}`);
    }
    if (cloudVerboseLogs) {
      console.log(
        `[cloud-update] stato inviato: status=${payload.status} targetVersion=${
          payload.targetVersion || '-'
        } message="${payload.message}"`
      );
    }
  } catch (err) {
    console.warn(`[${cloudNow()}] [cloud-update] errore invio stato '${payload.status}': ${err.message}`);
  }
}

async function sendCloudRenameStatus(status, message = '', extraPayload = {}) {
  if (!cloudClientRenameStatusUrl || typeof fetch !== 'function') {
    return;
  }

  const payload = {
    ...buildCloudIdentityPayload(),
    status: normalizeNonEmptyText(status) || 'unknown',
    message: normalizeNonEmptyText(message),
    currentName: cloudHeartbeatClientName,
    sentAt: new Date().toISOString(),
    ...extraPayload,
  };

  try {
    const response = await fetchWithTimeout(
      cloudClientRenameStatusUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
      cloudRequestTimeoutMs,
      'rename-status request'
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status} ${response.statusText} ${errorText}`);
    }
    if (cloudVerboseLogs) {
      console.log(
        `[cloud-rename] stato inviato: status=${payload.status} desiredName=${
          payload.desiredName || '-'
        } currentName=${payload.currentName || '-'} message="${payload.message}"`
      );
    }
  } catch (err) {
    console.warn(`[${cloudNow()}] [cloud-rename] errore invio stato '${payload.status}': ${err.message}`);
  }
}

function upsertCloudCustomerNameProperty(rawText, desiredName) {
  const source = String(rawText || '');
  const desiredJsonValue = JSON.stringify(desiredName);
  const propertyPattern = /("cloudCustomerName"\s*:\s*)("([^"\\]|\\.)*")/;

  if (propertyPattern.test(source)) {
    return source.replace(propertyPattern, `$1${desiredJsonValue}`);
  }

  const firstBraceIndex = source.indexOf('{');
  if (firstBraceIndex < 0) {
    throw new Error('Formato config non valido (manca "{")');
  }

  const lineBreak = source.includes('\r\n') ? '\r\n' : '\n';
  const insertion = `${lineBreak}  "cloudCustomerName": ${desiredJsonValue},`;
  return `${source.slice(0, firstBraceIndex + 1)}${insertion}${source.slice(firstBraceIndex + 1)}`;
}

function updateCloudCustomerNameInConfigFile(filePath, desiredName, elevationCredentials = null) {
  const original = fs.readFileSync(filePath, 'utf8');
  const updated = upsertCloudCustomerNameProperty(original, desiredName);
  if (updated !== original) {
    writeFileWithPermissionFallback(filePath, updated, elevationCredentials);
    if (cloudVerboseLogs) {
      console.log(`[${cloudNow()}] [cloud-rename] aggiornato file config: ${filePath}`);
    }
  } else if (cloudVerboseLogs) {
    console.log(`[${cloudNow()}] [cloud-rename] file config gia allineato: ${filePath}`);
  }
}

function isPermissionError(err) {
  const code = normalizeNonEmptyText(err?.code).toUpperCase();
  return code === 'EPERM' || code === 'EACCES';
}

function tryUnlockFileForWrite(filePath) {
  try {
    fs.chmodSync(filePath, 0o666);
  } catch (_err) {
    // ignore
  }

  if (process.platform === 'win32') {
    try {
      spawnSync('cmd', ['/c', `attrib -R "${filePath}"`], {
        stdio: 'ignore',
        windowsHide: true,
      });
    } catch (_err) {
      // ignore
    }
    try {
      // Concede permesso di scrittura al gruppo Administrators via icacls.
      // Utile quando il file ha attributi read-only o ACL restrittivi che attrib -R
      // non riesce a rimuovere.
      spawnSync('icacls', [filePath, '/grant', 'BUILTIN\\Administrators:(W)', '/Q'], {
        stdio: 'ignore',
        windowsHide: true,
        timeout: 5000,
      });
    } catch (_err) {
      // ignore
    }
  }
}

function writeFileWithPermissionFallback(filePath, content, elevationCredentials = null) {
  // Scrive su .new poi rinomina atomicamente: evita di aprire il file originale
  // mentre potrebbe essere locked dal processo che lo usa (es. dicomweb-proxy).
  const tempPath = `${filePath}.new`;

  if (cloudVerboseLogs) {
    console.log(`[${cloudNow()}] [cloud-rename] scrittura atomica: ${tempPath} -> ${filePath}`);
  }

  try {
    fs.writeFileSync(tempPath, content, 'utf8');
  } catch (writeErr) {
    if (cloudVerboseLogs) {
      console.warn(`[${cloudNow()}] [cloud-rename] scrittura .new fallita: ${writeErr.message}`);
    }
    throw writeErr;
  }

  try {
    fs.renameSync(tempPath, filePath);
    if (cloudVerboseLogs) {
      console.log(`[${cloudNow()}] [cloud-rename] rename atomico OK: ${filePath}`);
    }
  } catch (renameErr) {
    // Il rename puo' fallire se il file originale e' locked: prova a sbloccare e riprova una volta
    if (isPermissionError(renameErr)) {
      if (cloudVerboseLogs) {
        console.warn(`[${cloudNow()}] [cloud-rename] rename fallito (${renameErr.code}), provo unlock e retry`);
      }
      tryUnlockFileForWrite(filePath);
      try {
        fs.renameSync(tempPath, filePath);
        if (cloudVerboseLogs) {
          console.log(`[${cloudNow()}] [cloud-rename] rename atomico OK dopo unlock: ${filePath}`);
        }
        return;
      } catch (retryErr) {
        // Ultimo tentativo: sovrascrittura diretta (il file potrebbe essere stato sbloccato da attrib -R)
        if (cloudVerboseLogs) {
          console.warn(`[${cloudNow()}] [cloud-rename] rename ancora fallito, provo writeFileSync diretto`);
        }
        try {
          fs.writeFileSync(filePath, content, 'utf8');
          if (cloudVerboseLogs) {
            console.log(`[${cloudNow()}] [cloud-rename] writeFileSync diretto OK: ${filePath}`);
          }
          try { fs.rmSync(tempPath, { force: true }); } catch (_e) {}
          return;
        } catch (directErr) {
          // Ultimo tentativo: PowerShell Copy-Item -Force.
          // Utile quando node.exe e' bloccato da Controlled Folder Access di Windows Defender
          // ma powershell.exe e' nella whitelist, oppure quando il file e' locked da un
          // altro processo che non impedisce la copia tramite API di sistema PowerShell.
          if (process.platform === 'win32') {
            try {
              const psScript =
                `Copy-Item -LiteralPath '${escapePowerShellLiteral(tempPath)}' ` +
                `-Destination '${escapePowerShellLiteral(filePath)}' -Force`;
              const psResult = spawnSync(
                'powershell',
                ['-NoProfile', '-NonInteractive', '-Command', psScript],
                { stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8', windowsHide: true, timeout: 10000 }
              );
              if (!psResult.error && psResult.status === 0) {
                try { fs.rmSync(tempPath, { force: true }); } catch (_e) {}
                if (cloudVerboseLogs) {
                  console.log(`[${cloudNow()}] [cloud-rename] PowerShell Copy-Item OK: ${filePath}`);
                }
                return;
              }
              if (cloudVerboseLogs) {
                const psErr = (psResult.stderr || '').slice(0, 120);
                console.warn(`[${cloudNow()}] [cloud-rename] PowerShell Copy-Item fallito: exit ${psResult.status}${psErr ? ' - ' + psErr : ''}`);
              }
            } catch (_psErr) {
              // ignore
            }
            // Tentativo finale: schtask come utente admin — bypassa CFA senza SeImpersonatePrivilege
            if (hasElevationCredentials(elevationCredentials)) {
              const id = Date.now().toString(36);
              const taskName = 'NolexCfgWrite_' + id;
              const helperDir = resolveHelperTempDir(path.dirname(filePath));
              const ps1Path = path.join(helperDir, 'nolex-cfg-' + id + '.ps1');
              const resultPath = path.join(helperDir, 'nolex-cfg-' + id + '.result');
              try {
                const esc = s => String(s).replace(/'/g, "''");
                fs.writeFileSync(ps1Path,
                  `$ErrorActionPreference='Stop'\r\n` +
                  `$src='${esc(tempPath)}'\r\n` +
                  `$dst='${esc(filePath)}'\r\n` +
                  `$res='${esc(resultPath)}'\r\n` +
                  `try {\r\n` +
                  `  Copy-Item -LiteralPath $src -Destination $dst -Force\r\n` +
                  `  Set-Content -LiteralPath $res -Value 'OK' -Encoding UTF8\r\n` +
                  `} catch { Set-Content -LiteralPath $res -Value "FAIL:$($_.Exception.Message.Substring(0,[Math]::Min(100,$_.Exception.Message.Length)))" -Encoding UTF8 }\r\n`,
                  'utf8');
                const schtaskResult = runPs1AsAdminViaSchtask(ps1Path, resultPath, taskName, elevationCredentials.username, elevationCredentials.password);
                if (schtaskResult === 'OK') {
                  try { fs.rmSync(tempPath, { force: true }); } catch (_e) {}
                  if (cloudVerboseLogs) {
                    console.log(`[${cloudNow()}] [cloud-rename] schtask-admin Copy-Item OK: ${filePath}`);
                  }
                  return;
                }
                if (cloudVerboseLogs) {
                  console.warn(`[${cloudNow()}] [cloud-rename] schtask-admin Copy-Item fallito: ${schtaskResult || '(timeout)'}`);
                }
              } finally {
                try { fs.rmSync(ps1Path, { force: true }); } catch (_e) {}
                try { fs.rmSync(resultPath, { force: true }); } catch (_e) {}
              }
            }
          }
          try { fs.rmSync(tempPath, { force: true }); } catch (_e) {}
          const processUser = getProcessUserLabel();
          throw new Error(
            `Scrittura config fallita su ${filePath}: ${directErr.message}. Utente PM2: ${processUser}`
          );
        }
      }
    }
    try { fs.rmSync(tempPath, { force: true }); } catch (_e) {}
    throw renameErr;
  }
}

function sleepSyncMs(ms) {
  const waitMs = Number.isFinite(ms) && ms > 0 ? ms : 0;
  if (!waitMs) {
    return;
  }
  const sab = new SharedArrayBuffer(4);
  const int32 = new Int32Array(sab);
  Atomics.wait(int32, 0, 0, waitMs);
}

function applyCloudCustomerNameToProxyConfigs(desiredName, elevationCredentials = null) {
  const normalizedDesiredName = normalizeNonEmptyText(desiredName);
  if (!normalizedDesiredName) {
    throw new Error('Nome cliente richiesto non valido');
  }

  const candidates = [...new Set(cloudCustomerConfigCandidates.filter(Boolean))];
  if (cloudVerboseLogs) {
    console.log(`[${cloudNow()}] [cloud-rename] candidates config proxy: ${candidates.join(' | ')}`);
  }
  const existingFiles = candidates.filter(candidate => fs.existsSync(candidate));
  if (!existingFiles.length) {
    throw new Error('File config dicomweb-proxy non trovati');
  }
  if (cloudVerboseLogs) {
    console.log(`[${cloudNow()}] [cloud-rename] file config trovati: ${existingFiles.join(' | ')}`);
  }

  const updatedFiles = [];
  const failures = [];
  existingFiles.forEach(filePath => {
    try {
      updateCloudCustomerNameInConfigFile(filePath, normalizedDesiredName, elevationCredentials);
      updatedFiles.push(filePath);
    } catch (err) {
      failures.push(`${filePath}: ${err.message}`);
    }
  });

  // Scrittura sidecar PRIMA di lanciare eccezione sui failures: anche se tutti i file JSON
  // sono bloccati da dicomweb-proxy (EPERM), il nome rimane persistito nel sidecar.
  try {
    const sidecarPath = path.join(path.dirname(__filename), 'cloud-customer-name.json');
    const sidecarContent = JSON.stringify({ cloudCustomerName: normalizedDesiredName }, null, 2);
    fs.writeFileSync(sidecarPath, sidecarContent, 'utf8');
    if (cloudVerboseLogs) {
      console.log(`[${cloudNow()}] [cloud-rename] sidecar cloud-customer-name.json aggiornato -> "${normalizedDesiredName}"`);
    }
  } catch (sidecarErr) {
    if (cloudVerboseLogs) {
      console.warn(`[${cloudNow()}] [cloud-rename] scrittura sidecar fallita: ${sidecarErr.message}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Errore aggiornamento nome cliente su config: ${failures.join(' | ')}`);
  }

  return updatedFiles;
}

async function runCloudRenameCustomer(commandPayload, elevationCredentials = null) {
  if (cloudRenameInProgress) {
    if (cloudVerboseLogs) {
      console.log(`[${cloudNow()}] [cloud-rename] rename gia in corso, comando ignorato`);
    }
    return;
  }

  const desiredName = normalizeNonEmptyText(
    commandPayload?.desiredName || commandPayload?.targetCustomerName
  );
  if (!desiredName) {
    if (cloudVerboseLogs) {
      console.warn(`[${cloudNow()}] [cloud-rename] comando rename ricevuto senza desiredName, ignoro`);
    }
    return;
  }
  if (cloudVerboseLogs) {
    console.log(
      `[cloud-rename] comando ricevuto -> desiredName="${desiredName}" currentName="${cloudHeartbeatClientName}"`
    );
  }

  if (desiredName === cloudHeartbeatClientName) {
    if (cloudVerboseLogs) {
      console.log(`[${cloudNow()}] [cloud-rename] nome gia allineato, invio conferma success`);
    }
    await sendCloudRenameStatus('success', 'Nome cliente gia allineato', {
      desiredName,
      currentName: cloudHeartbeatClientName,
    });
    return;
  }

  cloudRenameInProgress = true;
  const previousName = cloudHeartbeatClientName;

  try {
    await sendCloudRenameStatus('applying', `Aggiornamento nome cliente verso "${desiredName}"`, {
      desiredName,
      previousName,
    });

    const updatedFiles = applyCloudCustomerNameToProxyConfigs(desiredName, elevationCredentials);
    cloudHeartbeatClientName = desiredName;
    if (cloudVerboseLogs) {
      console.log(
        `[cloud-rename] rename completato: "${previousName}" -> "${desiredName}" files=${updatedFiles.length}`
      );
    }

    await sendCloudRenameStatus('success', `Nome cliente aggiornato in "${desiredName}"`, {
      desiredName,
      previousName,
      currentName: desiredName,
      updatedFiles,
    });
  } catch (err) {
    await sendCloudRenameStatus('failed', err.message, {
      desiredName,
      previousName,
      currentName: cloudHeartbeatClientName,
    });
    console.warn(`[${cloudNow()}] [cloud-rename] errore rename cliente: ${err.message}`);
  } finally {
    cloudRenameInProgress = false;
    if (cloudVerboseLogs) {
      console.log(`[${cloudNow()}] [cloud-rename] rename workflow terminato`);
    }
  }
}

function createCloudUpdateCancelledError(message = 'Aggiornamento annullato da dashboard') {
  const err = new Error(message);
  err.code = 'CLOUD_UPDATE_CANCELLED';
  return err;
}

function isCloudUpdateCancelledError(err) {
  if (!err) {
    return false;
  }
  if (normalizeNonEmptyText(err.code).toUpperCase() === 'CLOUD_UPDATE_CANCELLED') {
    return true;
  }
  const text = normalizeNonEmptyText(err.message).toLowerCase();
  return text.includes('aggiornamento annullato') || text.includes('cancel requested');
}

function requestCloudUpdateCancellation(reason = '') {
  if (cloudUpdateCancelRequested) {
    return;
  }
  cloudUpdateCancelRequested = true;
  if (cloudVerboseLogs) {
    console.warn(`[${cloudNow()}] [cloud-update] stop update richiesto${reason ? ` (${reason})` : ''}`);
  }
  if (cloudUpdateAbortController && !cloudUpdateAbortController.signal.aborted) {
    cloudUpdateAbortController.abort();
  }
}

function setCloudUpdateAbortController() {
  cloudUpdateAbortController = new AbortController();
  if (cloudUpdateCancelRequested && !cloudUpdateAbortController.signal.aborted) {
    cloudUpdateAbortController.abort();
  }
  return cloudUpdateAbortController;
}

function throwIfCloudUpdateCancelled(stage = '') {
  if (!cloudUpdateCancelRequested) {
    return;
  }
  const suffix = stage ? ` (${stage})` : '';
  throw createCloudUpdateCancelledError(`Aggiornamento annullato da dashboard${suffix}`);
}

async function syncCloudCancelStateNow(targetVersion = '') {
  try {
    const { commandPayload } = await pollCloudCommandSnapshot({
      commandMode: 'cancel-check',
      targetVersion: normalizeNonEmptyText(targetVersion),
    });
    const cancelRequested = Boolean(commandPayload?.cancelUpdateRequested);
    const action = normalizeNonEmptyText(commandPayload?.action);
    const commandTarget = normalizeNonEmptyText(commandPayload?.targetVersion);

    if (cancelRequested || (action !== 'update' && !commandTarget)) {
      requestCloudUpdateCancellation(
        cancelRequested ? 'comando dashboard (sync check)' : 'target version rimossa (sync check)'
      );
      return true;
    }
  } catch (err) {
    if (cloudVerboseLogs) {
      console.warn(`[${cloudNow()}] [cloud-update] sync cancel-check errore: ${err.message}`);
    }
  }
  return cloudUpdateCancelRequested;
}

async function pollCloudCommandSnapshot(options = {}) {
  const currentVersion = normalizeNonEmptyText(options.currentVersion || getCurrentClientVersion());
  const commandMode = normalizeNonEmptyText(options.commandMode);
  const targetVersion = normalizeNonEmptyText(options.targetVersion);

  refreshCloudHeartbeatClientNameFromConfig();

  const params = new URLSearchParams({
    clientId: cloudHeartbeatClientId,
    customerName: cloudHeartbeatClientName,
    currentVersion,
  });
  if (commandMode) {
    params.set('commandMode', commandMode);
  }
  if (targetVersion) {
    params.set('targetVersion', targetVersion);
  }

  const requestUrl = `${cloudClientCommandUrl}?${params.toString()}`;
  if (cloudVerboseLogs) {
    console.log(
      `[cloud-update] polling request${commandMode ? ` (${commandMode})` : ''} -> clientId=${cloudHeartbeatClientId} customerName="${cloudHeartbeatClientName}" currentVersion=${currentVersion} targetVersion=${targetVersion || '-'}`
    );
  }
  const response = await fetchWithTimeout(
    requestUrl,
    { method: 'GET' },
    cloudRequestTimeoutMs,
    `client-command ${commandMode || 'poll'} request`
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status} ${response.statusText} ${errorText}`);
  }

  const commandPayload = await response.json();
  return {
    commandPayload,
    requestUrl,
    currentVersion,
  };
}

function startCloudUpdateCancellationWatcher(targetVersion) {
  if (!cloudCommandPollingEnabled || !cloudClientCommandUrl || typeof fetch !== 'function') {
    return () => {};
  }

  let active = true;
  let inFlight = false;
  const watchIntervalMs = 5000;

  const checkCancel = async () => {
    if (!active || inFlight || !cloudUpdateInProgress || cloudUpdateCancelRequested) {
      return;
    }
    inFlight = true;
    try {
      const { commandPayload } = await pollCloudCommandSnapshot({
        commandMode: 'cancel-check',
        targetVersion,
      });

      const cancelRequested = Boolean(commandPayload?.cancelUpdateRequested);
      if (cancelRequested) {
        requestCloudUpdateCancellation('comando dashboard');
        return;
      }

      const action = normalizeNonEmptyText(commandPayload?.action);
      const commandTarget = normalizeNonEmptyText(commandPayload?.targetVersion);
      if (action !== 'update' && !commandTarget) {
        requestCloudUpdateCancellation('target version rimossa');
      }
    } catch (err) {
      if (cloudVerboseLogs) {
        console.warn(`[${cloudNow()}] [cloud-update] cancel-check errore: ${err.message}`);
      }
    } finally {
      inFlight = false;
    }
  };

  checkCancel();
  const timer = setInterval(checkCancel, watchIntervalMs);

  return () => {
    active = false;
    clearInterval(timer);
  };
}

function ensureEmptyDirectory(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  fs.mkdirSync(dirPath, { recursive: true });
}

function computeFileSha256(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function downloadFileFromUrl(url, destinationPath, externalAbortSignal = null) {
  const downloadUrlForLog = sanitizeUrlForLog(url);
  const downloadStart = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cloudDownloadTimeoutMs);
  const handleExternalAbort = () => controller.abort();
  if (externalAbortSignal) {
    if (externalAbortSignal.aborted) {
      controller.abort();
    } else {
      externalAbortSignal.addEventListener('abort', handleExternalAbort, { once: true });
    }
  }

  if (cloudVerboseLogs) {
    console.log(
      `[cloud-update] download start -> url=${downloadUrlForLog} timeout=${cloudDownloadTimeoutMs}ms`
    );
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status} ${response.statusText} ${errorText}`);
    }

    const contentLengthHeader = normalizeNonEmptyText(response.headers.get('content-length'));
    if (cloudVerboseLogs) {
      console.log(
        `[cloud-update] download risposta OK -> status=${response.status} contentLength=${
          contentLengthHeader || 'unknown'
        }`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(destinationPath, buffer);

    if (cloudVerboseLogs) {
      const elapsed = Date.now() - downloadStart;
      console.log(
        `[cloud-update] download end -> bytes=${buffer.length} elapsedMs=${elapsed} file=${destinationPath}`
      );
    }
  } catch (err) {
    if (err?.name === 'AbortError') {
      if (externalAbortSignal?.aborted || cloudUpdateCancelRequested) {
        throw createCloudUpdateCancelledError(`Aggiornamento annullato durante download (${downloadUrlForLog})`);
      }
      throw new Error(`Download timeout dopo ${cloudDownloadTimeoutMs}ms (${downloadUrlForLog})`);
    }
    throw new Error(`Download fallito da ${downloadUrlForLog}: ${err.message}`);
  } finally {
    if (externalAbortSignal) {
      externalAbortSignal.removeEventListener('abort', handleExternalAbort);
    }
    clearTimeout(timer);
  }
}

function escapePowerShellLiteral(value) {
  return String(value).replace(/'/g, "''");
}

function toPowerShellEncodedCommand(script) {
  return Buffer.from(String(script || ''), 'utf16le').toString('base64');
}

function runPowerShellWithCredentials(script, credentials, label = 'operazione elevata') {
  if (process.platform !== 'win32') {
    throw new Error(`${label}: supportato solo su Windows`);
  }
  if (!hasElevationCredentials(credentials)) {
    throw new Error(`${label}: credenziali amministratore non disponibili`);
  }

  const username = normalizeNonEmptyText(credentials.username);
  const password = normalizeNonEmptyText(credentials.password);
  const encodedInnerScript = toPowerShellEncodedCommand(script);
  const bootstrapScript =
    `$ErrorActionPreference='Stop';` +
    `$sec=ConvertTo-SecureString '${escapePowerShellLiteral(password)}' -AsPlainText -Force;` +
    `$cred=New-Object System.Management.Automation.PSCredential('${escapePowerShellLiteral(
      username
    )}',$sec);` +
    `try {` +
    `$proc=Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile','-NonInteractive','-EncodedCommand','${encodedInnerScript}') -Credential $cred -WindowStyle Hidden -Wait -PassThru;` +
    `if ($null -eq $proc) { exit 901 };` +
    `exit $proc.ExitCode;` +
    `} catch {` +
    `$m = ($_ | Out-String);` +
    `if ($m -match '1326' -or $m -match 'user name or password is incorrect' -or $m -match 'username or password is incorrect' -or $m -match 'nome utente o password' -or $m -match 'logon failure') { exit 1326 };` +
    `if ($m -match 'Access is denied' -or $m -match 'Accesso negato') { exit 5 };` +
    `exit 901;` +
    `}`;

  const result = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', bootstrapScript], {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    windowsHide: true,
    timeout: 10 * 60 * 1000,
  });

  if (result.error) {
    throw createCloudUpdatePermissionDeniedError(`${label}: ${result.error.message}`);
  }
  const status = Number(result.status || 0);
  if (status === 1326) {
    throw createCloudUpdateInvalidAdminCredentialsError(label);
  }
  if (status !== 0) {
    const stderr = normalizeNonEmptyText(result.stderr).slice(0, 240);
    throw createCloudUpdatePermissionDeniedError(
      `${label}: exit code ${status}${stderr ? ` (${stderr})` : ''}`
    );
  }
}


function mirrorDirectoryWithElevationCredentials(sourceDir, targetDir, credentials) {
  const script =
    `$ErrorActionPreference='Stop';` +
    `New-Item -ItemType Directory -Path '${escapePowerShellLiteral(targetDir)}' -Force | Out-Null;` +
    `robocopy '${escapePowerShellLiteral(sourceDir)}' '${escapePowerShellLiteral(
      targetDir
    )}' /MIR /R:2 /W:2 /NFL /NDL /NJH /NJS /NP;` +
    `$code=$LASTEXITCODE;` +
    `if ($code -gt 7) { exit $code };` +
    `exit 0;`;

  runPowerShellWithCredentials(script, credentials, 'mirror build-viewer con credenziali admin');
}

function readVersionTxtSafe(dir) {
  try {
    const p = path.join(dir, 'version.txt');
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8').trim().slice(0, 120);
  } catch (_e) {}
  return '<non leggibile>';
}

function mirrorDirectoryDirectRobocopy(sourceDir, targetDir) {
  // /R:2 /W:1 = 2 retry con 1s di attesa: fallisce veloce, il caller gestisce il fallback.
  // /IS = Include Same: copia anche file con stessa dimensione/timestamp.
  // Prima di robocopy: attrib -R rimuove l'attributo read-only dai file di destinazione.
  //   (robocopy /A-:R rimuove l'attributo DOPO la copia, non prima — inutile contro +R)
  // exit code robocopy <= 7 = successo/avvisi, > 7 = errore.
  const srcVer = readVersionTxtSafe(sourceDir);
  const dstVer = readVersionTxtSafe(targetDir);

  // Rimuovi read-only attribute da tutti i file di destinazione PRIMA di robocopy
  if (process.platform === 'win32' && fs.existsSync(targetDir)) {
    spawnSync('attrib', ['-R', path.join(targetDir, '*'), '/S', '/D'], {
      stdio: 'ignore', windowsHide: true, timeout: 30000,
    });
  }

  if (cloudVerboseLogs) {
    console.log(`[${cloudNow()}] [cloud-update] robocopy diretto avviato -> src=${sourceDir} dst=${targetDir} (/MIR /IS /R:2 /W:1)`);
    console.log(`[${cloudNow()}] [cloud-update] robocopy version.txt: src="${srcVer}" dst="${dstVer}"`);
  }
  const result = spawnSync(
    'robocopy',
    [sourceDir, targetDir, '/MIR', '/IS', '/R:2', '/W:1', '/NFL', '/NDL', '/NJH', '/NJS', '/NP'],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      windowsHide: true,
      timeout: 20 * 60 * 1000,
    }
  );
  if (result.error) {
    console.warn(`[${cloudNow()}] [cloud-update] robocopy diretto errore spawn: ${result.error.message}`);
    throw new Error(`mirror build-viewer robocopy diretto: ${result.error.message}`);
  }
  const code = Number(result.status || 0);
  if (code > 7) {
    const stderr = (result.stderr || '').slice(0, 240);
    console.warn(`[${cloudNow()}] [cloud-update] robocopy diretto fallito: exit code ${code}${stderr ? ` (${stderr})` : ''}`);
    throw createCloudUpdatePermissionDeniedError(
      `mirror build-viewer robocopy diretto: exit code ${code}${stderr ? ` (${stderr})` : ''}`
    );
  }
  const dstVerAfter = readVersionTxtSafe(targetDir);
  if (cloudVerboseLogs) {
    console.log(`[${cloudNow()}] [cloud-update] robocopy diretto completato -> exit code ${code} (0-7 = OK), dst version.txt dopo: "${dstVerAfter}"`);
  }

  // Verifica effettiva: se version.txt src e dst differivano ma dopo robocopy dst non e' cambiato,
  // i file sono bloccati (IIS tiene handle esclusivi di lettura, no FILE_SHARE_WRITE).
  // Lanciamo un PermissionDenied cosi' il chiamante puo' fermare W3SVC e riprovare.
  if (
    srcVer &&
    srcVer !== '<non leggibile>' &&
    dstVer !== '<non leggibile>' &&
    srcVer !== dstVer &&
    dstVerAfter === dstVer
  ) {
    console.warn(
      `[${cloudNow()}] [cloud-update] robocopy exit ${code} ma version.txt non aggiornato (src="${srcVer}" dst="${dstVerAfter}") — IIS trattiene i file (no FILE_SHARE_WRITE)`
    );
    throw createCloudUpdatePermissionDeniedError(
      `mirror build-viewer: robocopy exit ${code} ma version.txt invariato — IIS lock (src="${srcVer}" dst="${dstVerAfter}")`
    );
  }
}

function copyFileWithElevationCredentials(sourceFile, targetFile, credentials) {
  const targetDir = path.dirname(targetFile);
  const script =
    `$ErrorActionPreference='Stop';` +
    `New-Item -ItemType Directory -Path '${escapePowerShellLiteral(targetDir)}' -Force | Out-Null;` +
    `Copy-Item -LiteralPath '${escapePowerShellLiteral(
      sourceFile
    )}' -Destination '${escapePowerShellLiteral(targetFile)}' -Force;` +
    `exit 0;`;

  runPowerShellWithCredentials(script, credentials, 'copy backend con credenziali admin');
}

function assertDirectoryWritable(targetDir, elevationCredentials = null) {
  fs.mkdirSync(targetDir, { recursive: true });
  const testFile = path.join(targetDir, `.nolex-write-test-${Date.now().toString(36)}.tmp`);

  try {
    fs.writeFileSync(testFile, 'ok', 'utf8');
    fs.rmSync(testFile, { force: true });
    return;
  } catch (err) {
    if (process.platform === 'win32' && hasElevationCredentials(elevationCredentials)) {
      const script =
        `$ErrorActionPreference='Stop';` +
        `New-Item -ItemType Directory -Path '${escapePowerShellLiteral(targetDir)}' -Force | Out-Null;` +
        `Set-Content -LiteralPath '${escapePowerShellLiteral(testFile)}' -Value 'ok' -Force;` +
        `Remove-Item -LiteralPath '${escapePowerShellLiteral(testFile)}' -Force -ErrorAction SilentlyContinue;` +
        `exit 0;`;
      runPowerShellWithCredentials(script, elevationCredentials, 'test permessi scrittura');
      return;
    }

    if (isRetryableFsError(err)) {
      throw createCloudUpdatePermissionDeniedError(
        `scrittura non consentita su ${targetDir} (${err.message})`
      );
    }
    throw err;
  }
}

function isLikelyBackendSwapLockError(err, targetBackendPath = '') {
  const text = normalizeNonEmptyText(err?.message).toLowerCase();
  if (!text) {
    return false;
  }

  const normalizedTarget = normalizeNonEmptyText(targetBackendPath).toLowerCase();
  const hasTarget = normalizedTarget ? text.includes(normalizedTarget) : false;
  return (
    text.includes('replace backend') &&
    text.includes('rename') &&
    text.includes('.new') &&
    (hasTarget || text.includes('eperm') || text.includes('eacces'))
  );
}

function resolveHelperTempDir(fallbackDir) {
  // os.tmpdir() puo' essere non scrivibile in contesti PM2/servizio Windows (UAC filtered token).
  // Proviamo in ordine: cloudUpdateTempDir (app dir, sempre scrivibile), poi os.tmpdir().
  const candidates = [
    cloudUpdateTempDir,
    fallbackDir,
    os.tmpdir(),
  ].filter(Boolean);

  for (const dir of candidates) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      const probe = path.join(dir, `.nolex-probe-${Date.now().toString(36)}.tmp`);
      fs.writeFileSync(probe, 'ok', 'utf8');
      fs.rmSync(probe, { force: true });
      return dir;
    } catch (_err) {
      // prova il prossimo
    }
  }
  return candidates[0]; // ultima spiaggia, usata anche se fallisce
}

function launchDeferredBackendSwapHelper(options = {}) {
  const helperId = `nolex-backend-swap-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const helperDir = resolveHelperTempDir(path.dirname(normalizeNonEmptyText(options.targetBackend)));
  const helperPath = path.join(helperDir, `${helperId}.cjs`);
  const payload = {
    sourceBackend: normalizeNonEmptyText(options.sourceBackend),
    targetBackend: normalizeNonEmptyText(options.targetBackend),
    backendEntryPath: normalizeNonEmptyText(options.backendEntryPath),
    pm2ProcessId: normalizeNonEmptyText(options.pm2ProcessId),
    pm2ProcessName: normalizeNonEmptyText(options.pm2ProcessName),
    statusUrl: normalizeNonEmptyText(options.statusUrl),
    statusPayloadBase: options.statusPayloadBase || {},
    cleanupRoot: normalizeNonEmptyText(options.cleanupRoot),
    backendBackupPath: normalizeNonEmptyText(options.backendBackupPath),
    updaterPid: Number(options.updaterPid || 0),
    elevationCredentials: options.elevationCredentials || null,
    helperPath,
  };

  const helperSource = `'use strict';
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const payload = ${JSON.stringify(payload)};

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
function normalize(v){ return v === undefined || v === null ? '' : String(v).trim(); }
function exists(p){ try { return !!p && fs.existsSync(p); } catch(_e){ return false; } }
function processExists(pid){ try { process.kill(pid, 0); return true; } catch(_e){ return false; } }
async function waitProcessExit(pid, timeoutMs){
  if (!pid || pid <= 0) return;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (!processExists(pid)) return;
    await sleep(400);
  }
}
function runCmd(command, args){
  const result = spawnSync(command, args, { stdio: 'ignore', windowsHide: true, env: process.env, shell: false });
  return !result.error && result.status === 0;
}
function runPm2Command(args){
  const candidates = [];
  candidates.push({ command: 'pm2', args });
  if (process.platform === 'win32') candidates.push({ command: 'pm2.cmd', args });
  for (const c of candidates) {
    if (runCmd(c.command, c.args)) return true;
  }
  return false;
}
function clearReadonly(targetPath){
  if (process.platform !== 'win32') return;
  if (!normalize(targetPath)) return;
  try { runCmd('attrib', ['-R', targetPath]); } catch(_e){}
}
function startStandalone(entry){
  const child = spawn(process.execPath, [entry], {
    cwd: path.dirname(entry),
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: process.env,
  });
  child.unref();
}
const sharedLogPath = path.join(path.dirname(payload.helperPath), 'updater-last.log');
function log(msg) {
  const ts = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const line = '[' + ts + '] [backend-swap] ' + msg + '\\n';
  try { fs.appendFileSync(sharedLogPath, line, 'utf8'); } catch(_e){}
  console.log(msg);
}
// Copia file come utente admin tramite schtask /RU user /RP pass.
// Task Scheduler (SYSTEM) crea il processo come admin → bypassa CFA senza SeImpersonatePrivilege.
// Scrive il risultato in resultPath; attende max 60s.
function copyFileAsAdminViaSchtask(src, dst, creds) {
  const esc = s => String(s).replace(/'/g, "''");
  const helperDir = path.dirname(payload.helperPath);
  const id = Date.now().toString(36);
  const ps1Path = path.join(helperDir, 'nolex-bs-admin-' + id + '.ps1');
  const resultPath = path.join(helperDir, 'nolex-bs-admin-' + id + '.result');
  const taskName = 'NolexBSAdmin_' + id;
  try {
    fs.writeFileSync(ps1Path,
      "$ErrorActionPreference='Stop'\\r\\n" +
      "$res='" + esc(resultPath) + "'\\r\\n" +
      "try {\\r\\n" +
      "  Copy-Item -LiteralPath '" + esc(src) + "' -Destination '" + esc(dst) + "' -Force\\r\\n" +
      "  Set-Content -LiteralPath $res -Value 'OK' -Encoding UTF8\\r\\n" +
      "} catch { Set-Content -LiteralPath $res -Value (\\\"FAIL:\\\" + $_.Exception.Message.Substring(0,[Math]::Min(100,$_.Exception.Message.Length))) -Encoding UTF8 }\\r\\n",
      'utf8');
    const now = new Date();
    let stH = now.getHours(), stM = now.getMinutes() + 2;
    if (stM >= 60) { stM -= 60; stH = (stH+1)%24; }
    const st = String(stH).padStart(2,'0') + ':' + String(stM).padStart(2,'0');
    const createR = spawnSync('schtasks', [
      '/Create', '/F', '/TN', taskName,
      '/TR', 'powershell -NoProfile -NonInteractive -WindowStyle Hidden -File "' + ps1Path + '"',
      '/SC', 'ONCE', '/ST', st,
      '/RU', creds.username, '/RP', creds.password,
    ], { stdio: ['ignore','pipe','pipe'], encoding: 'utf8', windowsHide: true, timeout: 15000 });
    log('schtask-admin create exit=' + createR.status + ((createR.stderr||'').trim() ? ' ' + (createR.stderr||'').trim().slice(0,100) : ' OK'));
    if (createR.status !== 0) throw new Error('schtask-admin create exit=' + createR.status);
    const runR = spawnSync('schtasks', ['/Run', '/TN', taskName],
      { stdio: 'ignore', windowsHide: true, timeout: 5000 });
    log('schtask-admin run exit=' + runR.status);
    spawnSync('schtasks', ['/Delete', '/F', '/TN', taskName], { stdio: 'ignore', windowsHide: true, timeout: 5000 });
    if (runR.status !== 0) throw new Error('schtask-admin run exit=' + runR.status);
    // Poll result file (max 60s)
    let result = null;
    for (let i = 0; i < 120 && !result; i++) {
      const ms = 500; const start = Date.now(); while(Date.now()-start < ms){}
      try { if (fs.existsSync(resultPath)) { result = fs.readFileSync(resultPath,'utf8').trim(); try{fs.rmSync(resultPath,{force:true});}catch(_e){} } } catch(_e){}
    }
    log('schtask-admin result: ' + (result||'(timeout)'));
    if (result !== 'OK') throw new Error('schtask-admin: ' + (result||'timeout'));
  } finally {
    try { fs.rmSync(ps1Path, { force: true }); } catch(_e) {}
  }
}
async function sendStatus(status, message){
  if (!payload.statusUrl || typeof fetch !== 'function') return;
  const body = {
    ...(payload.statusPayloadBase || {}),
    status,
    message: normalize(message),
    sentAt: new Date().toISOString(),
  };
  try {
    await fetch(payload.statusUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (_e) {}
}
function cleanup(){
  try { if (exists(payload.cleanupRoot)) fs.rmSync(payload.cleanupRoot, { recursive: true, force: true }); } catch(_e){}
  try { if (exists(payload.backendBackupPath)) fs.rmSync(payload.backendBackupPath, { force: true }); } catch(_e){}
  try { if (exists(payload.helperPath)) fs.rmSync(payload.helperPath, { force: true }); } catch(_e){}
}

async function main(){
  await waitProcessExit(payload.updaterPid, 120000);
  if (!exists(payload.sourceBackend)) {
    await sendStatus('failed', 'Permessi insufficienti: backend sorgente non disponibile per swap deferred');
    cleanup();
    return;
  }

  // Ottieni il PID attuale del processo PM2 (ripartito automaticamente dopo process.exit(0) del parent).
  // pm2 stop ritorna prima che il processo Node.js abbia chiuso tutti gli handle.
  // Conoscendo il PID possiamo aspettare la morte reale e usare taskkill se necessario.
  let pm2ManagedPid = 0;
  try {
    const jlistCmds = process.platform === 'win32' ? ['pm2.cmd', 'pm2'] : ['pm2'];
    for (const cmd of jlistCmds) {
      const jr = spawnSync(cmd, ['jlist'], {
        stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8', windowsHide: true, timeout: 10000,
      });
      if (!jr.error && jr.status === 0 && jr.stdout) {
        try {
          const list = JSON.parse(jr.stdout);
          for (const proc of list) {
            if (String(proc.pm_id) === normalize(payload.pm2ProcessId) ||
                proc.name === normalize(payload.pm2ProcessName)) {
              pm2ManagedPid = Number(proc.pid) || 0;
              break;
            }
          }
        } catch(_pe) {}
        break;
      }
    }
  } catch(_e) {}
  log('PM2 PID rilevato -> ' + (pm2ManagedPid || 'non trovato'));

  // Ferma PM2 e aspetta che il processo esca davvero
  let pm2Stopped = false;
  if (normalize(payload.pm2ProcessId)) pm2Stopped = runPm2Command(['stop', normalize(payload.pm2ProcessId)]);
  if (!pm2Stopped && normalize(payload.pm2ProcessName)) pm2Stopped = runPm2Command(['stop', normalize(payload.pm2ProcessName)]);

  if (pm2ManagedPid > 0) {
    log('attesa uscita PID ' + pm2ManagedPid + ' (pm2Stopped=' + pm2Stopped + ')');
    // Aspetta max 10s che il processo esca da solo
    for (let t = 0; t < 20 && processExists(pm2ManagedPid); t++) { await sleep(500); }
    // Force kill se ancora vivo
    if (processExists(pm2ManagedPid)) {
      log('processo ancora vivo, taskkill /F PID ' + pm2ManagedPid);
      try { spawnSync('taskkill', ['/PID', String(pm2ManagedPid), '/F'], { stdio: 'ignore', windowsHide: true, timeout: 5000 }); } catch(_e) {}
      await sleep(1500);
    } else {
      log('PID ' + pm2ManagedPid + ' uscito');
    }
  } else if (pm2Stopped) {
    log('PM2 fermato (PID sconosciuto), attesa 3s');
    await sleep(3000);
  } else {
    log('stop PM2 non riuscito, attesa 2s e tentativo copia diretto');
    await sleep(2000);
  }

  let swapped = false;
  let lastCopyError = '';

  // Tentativo A: schtask come utente admin (Task Scheduler SYSTEM crea processo admin → bypassa CFA)
  const creds = payload.elevationCredentials;
  if (!swapped && creds && creds.username && creds.password) {
    log('tentativo copia via schtask-admin (' + creds.username + ')');
    try {
      copyFileAsAdminViaSchtask(payload.sourceBackend, payload.targetBackend, creds);
      swapped = true;
      log('RISULTATO backend.js: OK - copia via schtask-admin riuscita');
    } catch (admErr) {
      lastCopyError = normalize(admErr.message);
      log('schtask-admin fallito: ' + admErr.message);
    }
  }

  // Tentativo B: copia diretta node.js (funziona se CFA non blocca o PM2 e' effettivamente fermo)
  if (!swapped) {
    clearReadonly(payload.targetBackend);
    for (let i = 0; i < 30; i += 1) {
      try {
        clearReadonly(payload.targetBackend);
        fs.copyFileSync(payload.sourceBackend, payload.targetBackend);
        swapped = true;
        log('RISULTATO backend.js: OK - copia diretta riuscita al tentativo ' + (i+1));
        break;
      } catch (copyErr) {
        lastCopyError = normalize(copyErr && copyErr.message);
        if (i === 0 || i % 5 === 0) {
          log('tentativo copia ' + (i+1) + ' fallito (' + (copyErr.message||'?') + '), retry in 1s');
        }
        await sleep(1000);
      }
    }
  }

  if (!swapped) {
    const suffix = lastCopyError ? (' (dettaglio: ' + lastCopyError + ')') : '';
    await sendStatus('failed', 'Permessi insufficienti: impossibile sostituire backend.js (deferred)' + suffix);
    log('RISULTATO backend.js: FALLITO - tutti i tentativi di copia falliti' + suffix);
  } else {
    await sendStatus('success', 'Update applicato con successo, riavvio backend completato');
  }

  let restarted = false;
  if (normalize(payload.pm2ProcessId)) restarted = runPm2Command(['restart', normalize(payload.pm2ProcessId)]);
  if (!restarted && normalize(payload.pm2ProcessName)) restarted = runPm2Command(['restart', normalize(payload.pm2ProcessName)]);
  if (!restarted && normalize(payload.pm2ProcessName) && normalize(payload.backendEntryPath)) {
    restarted = runPm2Command(['start', normalize(payload.backendEntryPath), '--name', normalize(payload.pm2ProcessName)]);
  }
  if (!restarted && normalize(payload.backendEntryPath)) {
    startStandalone(normalize(payload.backendEntryPath));
  }

  cleanup();
}

main().catch(async err => {
  log('RISULTATO backend.js: ERRORE FATALE - ' + (err.message||String(err)));
  try { await sendStatus('failed', 'Permessi insufficienti: errore helper deferred backend swap'); } catch(_e){}
  cleanup();
});
`;

  fs.writeFileSync(helperPath, helperSource, 'utf8');
  const child = spawn(process.execPath, [helperPath], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: process.env,
  });
  child.unref();
  return helperPath;
}

// Copia sourceDir in targetDir+'.new', poi lancia un helper che rinomina in background
// appena IIS (o altro server) rilascia i lock sui file di targetDir.
// Non richiede credenziali admin: opera su una nuova directory senza conflitti di lock.
function copyToBuildViewerNewAndLaunchSwapHelper(sourceDir, targetDir, options = {}) {
  const targetDirNew = `${targetDir}.new`;

  if (cloudVerboseLogs) {
    console.log(`[${cloudNow()}] [cloud-update] deferred build-viewer swap: copia in ${targetDirNew}`);
  }

  // Rimuovi eventuale .new precedente incompiuto
  if (fs.existsSync(targetDirNew)) {
    if (cloudVerboseLogs) {
      console.log(`[${cloudNow()}] [cloud-update] deferred build-viewer swap: rimozione .new precedente`);
    }
    try {
      fs.rmSync(targetDirNew, { recursive: true, force: true });
    } catch (_err) {
      // ignora
    }
  }

  // Copia nella nuova directory — nessun lock da parte di IIS qui
  copyDirectoryRecursive(sourceDir, targetDirNew);
  if (cloudVerboseLogs) {
    console.log(`[${cloudNow()}] [cloud-update] deferred build-viewer swap: copia in .new completata, avvio helper rename`);
  }

  const helperId = `nolex-bv-swap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const helperDir = resolveHelperTempDir(path.dirname(targetDir));
  const helperPath = path.join(helperDir, `${helperId}.cjs`);

  const statusUrl = normalizeNonEmptyText(options.statusUrl);
  const statusPayloadBase = options.statusPayloadBase || {};
  // NON passiamo cleanupRoot al build-viewer helper: il backend helper (o il main updater
  // nel path di successo) e' responsabile della pulizia dell'intera cartella temp.
  // Passarlo qui creerebbe una race condition: se il build-viewer helper termina prima
  // del backend helper, eliminerebbe anche il backend.js sorgente di cui il backend
  // helper ha ancora bisogno.

  const helperSource = `'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const payload = ${JSON.stringify({ targetDir, targetDirNew, statusUrl, statusPayloadBase, helperPath, elevationCredentials: options.elevationCredentials || null })};

// Log su file proprio, su updater-last.log condiviso, e su console
const logPath = payload.helperPath.replace(/\\.cjs$/, '.log');
const sharedLogPath = path.join(path.dirname(payload.helperPath), 'updater-last.log');
function log(msg) {
  const ts = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const line = '[' + ts + '] [bv-swap] ' + msg + '\\n';
  try { fs.appendFileSync(logPath, line, 'utf8'); } catch(_e){}
  try { fs.appendFileSync(sharedLogPath, line, 'utf8'); } catch(_e){}
  console.log(msg);
}
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
function exists(p){ try { return !!p && fs.existsSync(p); } catch(_e){ return false; } }
// Copia directory src->dst tramite schtask /RU user /RP pass (bypassa CFA senza SeImpersonatePrivilege)
async function copyDirAsAdminViaSchtask(src, dst, creds) {
  const esc = s => String(s).replace(/'/g, "''");
  const helperDir = path.dirname(payload.helperPath);
  const id = Date.now().toString(36);
  const ps1Path = path.join(helperDir, 'nolex-bva-' + id + '.ps1');
  const resultPath = path.join(helperDir, 'nolex-bva-' + id + '.result');
  const taskName = 'NolexBVAdmin_' + id;
  try {
    fs.writeFileSync(ps1Path,
      "$ErrorActionPreference='Stop'\\r\\n" +
      "$src='" + esc(src) + "'\\r\\n" +
      "$dst='" + esc(dst) + "'\\r\\n" +
      "$res='" + esc(resultPath) + "'\\r\\n" +
      "try {\\r\\n" +
      "  robocopy $src $dst /MIR /R:2 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null\\r\\n" +
      "  if ($LASTEXITCODE -le 7) { Set-Content -LiteralPath $res -Value 'OK' -Encoding UTF8 }\\r\\n" +
      "  else { Set-Content -LiteralPath $res -Value \\\"FAIL:robocopy $($LASTEXITCODE)\\\" -Encoding UTF8 }\\r\\n" +
      "} catch { Set-Content -LiteralPath $res -Value (\\\"FAIL:\\\" + $_.Exception.Message.Substring(0,[Math]::Min(100,$_.Exception.Message.Length))) -Encoding UTF8 }\\r\\n",
      'utf8');
    const now = new Date();
    let stH = now.getHours(), stM = now.getMinutes() + 2;
    if (stM >= 60) { stM -= 60; stH = (stH+1)%24; }
    const st = String(stH).padStart(2,'0') + ':' + String(stM).padStart(2,'0');
    const createR = spawnSync('schtasks', [
      '/Create', '/F', '/TN', taskName,
      '/TR', 'powershell -NoProfile -NonInteractive -WindowStyle Hidden -File "' + ps1Path + '"',
      '/SC', 'ONCE', '/ST', st,
      '/RU', creds.username, '/RP', creds.password,
    ], { stdio: ['ignore','pipe','pipe'], encoding: 'utf8', windowsHide: true, timeout: 15000 });
    log('schtask-admin create exit=' + createR.status + ((createR.stderr||'').trim() ? ' ' + (createR.stderr||'').trim().slice(0,100) : ' OK'));
    if (createR.status !== 0) return false;
    const runR = spawnSync('schtasks', ['/Run', '/TN', taskName],
      { stdio: 'ignore', windowsHide: true, timeout: 5000 });
    log('schtask-admin run exit=' + runR.status);
    spawnSync('schtasks', ['/Delete', '/F', '/TN', taskName], { stdio: 'ignore', windowsHide: true, timeout: 5000 });
    if (runR.status !== 0) return false;
    // Poll result (max 60s)
    let result = null;
    for (let i = 0; i < 120 && !result; i++) {
      await sleep(500);
      try { if (fs.existsSync(resultPath)) { result = fs.readFileSync(resultPath,'utf8').trim(); try{fs.rmSync(resultPath,{force:true});}catch(_e){} } } catch(_e){}
    }
    log('schtask-admin result: ' + (result||'(timeout)'));
    return result === 'OK';
  } catch(e) {
    log('schtask-admin errore: ' + e.message);
    return false;
  } finally {
    try { fs.rmSync(ps1Path, { force: true }); } catch(_e) {}
  }
}
async function sendStatus(status, message){
  if (!payload.statusUrl || typeof fetch !== 'function') return;
  try {
    await fetch(payload.statusUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...(payload.statusPayloadBase||{}), status, message, sentAt: new Date().toISOString() }),
    });
  } catch(_e){}
}
function cleanup(){
  try { if (exists(payload.targetDirNew)) fs.rmSync(payload.targetDirNew, { recursive: true, force: true }); } catch(_e){}
  try { if (exists(payload.helperPath)) fs.rmSync(payload.helperPath, { force: true }); } catch(_e){}
  // Log rimane per diagnosi
}
function trySwapDirs(){
  // Prima rimuovi attributo read-only dalla directory di destinazione
  try {
    spawnSync('attrib', ['-R', path.join(payload.targetDir, '*'), '/S', '/D'], { stdio: 'ignore', windowsHide: true, timeout: 30000 });
  } catch(_ae){}
  const backupDir = payload.targetDir + '.backup-' + Date.now();
  log('trySwapDirs: rename ' + payload.targetDir + ' -> ' + backupDir);
  if (exists(payload.targetDir)) fs.renameSync(payload.targetDir, backupDir);
  try {
    log('trySwapDirs: rename ' + payload.targetDirNew + ' -> ' + payload.targetDir);
    fs.renameSync(payload.targetDirNew, payload.targetDir);
    try { if (exists(backupDir)) fs.rmSync(backupDir, { recursive: true, force: true }); } catch(_e){}
    return true;
  } catch(swapErr) {
    log('trySwapDirs: seconda rename fallita (' + (swapErr.message||'?') + '), ripristino backup');
    try { if (exists(backupDir)) fs.renameSync(backupDir, payload.targetDir); } catch(_e){}
    throw swapErr;
  }
}

async function main(){
  const started = Date.now();
  log('helper deferred build-viewer swap avviato -> targetDir=' + payload.targetDir);
  log('targetDirNew=' + payload.targetDirNew + ' exists=' + exists(payload.targetDirNew));
  if (!exists(payload.targetDirNew)) {
    log('ABORT: build-viewer.new non trovata');
    await sendStatus('failed', 'Permessi insufficienti: build-viewer.new non trovata per swap deferred');
    cleanup();
    return;
  }

  let swapped = false;

  // Tentativo 0: schtask /RU adminUser /RP adminPass (Task Scheduler SYSTEM → bypassa CFA)
  const creds = payload.elevationCredentials;
  if (!swapped && creds && creds.username && creds.password) {
    log('Tentativo 0: schtask-admin (' + creds.username + ')...');
    swapped = await copyDirAsAdminViaSchtask(payload.targetDirNew, payload.targetDir, creds);
    log('Tentativo 0 schtask-admin: ' + (swapped ? 'SUCCESSO' : 'FALLITO'));
  }

  // Tentativo 1: rename diretta da node.js
  if (!swapped) {
    try {
      swapped = trySwapDirs();
      log('Tentativo 1 rename node.js: SUCCESSO');
    } catch(firstErr) {
      log('Tentativo 1 rename node.js fallito: ' + (firstErr.message||'?') + ' code=' + (firstErr.code||'-'));
    }
  }

  const elapsedS = Math.round((Date.now() - started) / 1000);
  if (!swapped) {
    log('FALLITO dopo ' + elapsedS + 's');
    await sendStatus('failed', 'Permessi insufficienti: swap build-viewer fallito dopo ' + elapsedS + 's. Vedi log: ' + logPath);
  } else {
    log('COMPLETATO in ' + elapsedS + 's');
    await sendStatus('success', 'Update build-viewer applicato con successo (deferred swap ' + elapsedS + 's)');
  }
  cleanup();
}

main().catch(async err => {
  log('ERRORE FATALE: ' + err.message);
  try { await sendStatus('failed', 'Errore helper deferred build-viewer swap: ' + err.message + ' | log: ' + logPath); } catch(_e){}
  cleanup();
});
`;

  fs.writeFileSync(helperPath, helperSource, 'utf8');
  const child = spawn(process.execPath, [helperPath], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: process.env,
  });
  child.unref();
  if (cloudVerboseLogs) {
    const logFilePath = helperPath.replace(/\.cjs$/, '.log');
    console.log(`[${cloudNow()}] [cloud-update] deferred build-viewer swap: helper avviato -> log file: ${logFilePath}`);
  }
  return helperPath;
}

function runProcessWithCancellation(command, args, options = {}) {
  const {
    abortSignal = null,
    cwd = undefined,
    windowsHide = true,
    label = 'process',
  } = options;

  return new Promise((resolve, reject) => {
    let settled = false;
    let aborted = false;

    const child = spawn(command, args, {
      cwd,
      stdio: 'ignore',
      windowsHide,
      env: process.env,
      detached: false,
      shell: false,
    });

    const cleanupAbortListener = () => {
      if (!abortSignal) {
        return;
      }
      abortSignal.removeEventListener('abort', onAbort);
    };

    const finish = (err) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanupAbortListener();
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    };

    const onAbort = () => {
      aborted = true;
      try {
        child.kill();
      } catch (_err) {
        // ignore
      }
    };

    if (abortSignal) {
      if (abortSignal.aborted) {
        onAbort();
      } else {
        abortSignal.addEventListener('abort', onAbort, { once: true });
      }
    }

    child.on('error', err => {
      finish(new Error(`${label} avvio fallito: ${err.message}`));
    });

    child.on('close', code => {
      if (aborted || abortSignal?.aborted || cloudUpdateCancelRequested) {
        finish(createCloudUpdateCancelledError(`Aggiornamento annullato durante ${label}`));
        return;
      }
      if (code !== 0) {
        finish(new Error(`${label} terminato con exit code ${code}`));
        return;
      }
      finish();
    });
  });
}

async function extractZipToDirectory(zipPath, destinationDir, abortSignal = null) {
  ensureEmptyDirectory(destinationDir);

  if (process.platform === 'win32') {
    const command = `Expand-Archive -Path '${escapePowerShellLiteral(
      zipPath
    )}' -DestinationPath '${escapePowerShellLiteral(destinationDir)}' -Force`;
    await runProcessWithCancellation(
      'powershell',
      ['-NoProfile', '-Command', command],
      {
        abortSignal,
        windowsHide: true,
        label: 'estrazione zip PowerShell',
      }
    );
    return;
  }

  await runProcessWithCancellation('unzip', ['-o', zipPath, '-d', destinationDir], {
    abortSignal,
    windowsHide: true,
    label: 'estrazione zip unzip',
  });
}

function findUpdatePayloadRoot(extractDir) {
  const directBackend = path.join(extractDir, 'backend.js');
  const directViewer = path.join(extractDir, 'build-viewer');
  if (fs.existsSync(directBackend) && fs.existsSync(directViewer)) {
    return extractDir;
  }

  const entries = fs.readdirSync(extractDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const candidate = path.join(extractDir, entry.name);
    const candidateBackend = path.join(candidate, 'backend.js');
    const candidateViewer = path.join(candidate, 'build-viewer');
    if (fs.existsSync(candidateBackend) && fs.existsSync(candidateViewer)) {
      return candidate;
    }
  }

  return '';
}

function launchDetachedUpdater(manifestPath) {
  if (cloudVerboseLogs) {
    console.log(`[${cloudNow()}] [cloud-update] launch updater detached -> manifest=${manifestPath}`);
  }
  const child = spawn(process.execPath, [__filename, cloudSelfUpdaterArg, manifestPath], {
    detached: true,
    stdio: 'inherit',
    windowsHide: true,
    env: process.env,
  });
  child.unref();
}

async function runEmbeddedCloudSelfUpdater(manifestPath) {
  if (!manifestPath || !fs.existsSync(manifestPath)) {
    throw new Error(`Manifest update non trovato: ${manifestPath || '<vuoto>'}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const sourceRoot = manifest.sourceRoot;
  const targetRoot = manifest.targetRoot;
  const backendFileName = manifest.backendFileName || 'backend.js';
  const buildViewerDirName = manifest.buildViewerDirName || 'build-viewer';
  const backendEntryPath = manifest.backendEntryPath || path.join(targetRoot, backendFileName);
  const parentPid = Number(manifest.parentPid || 0);
  const cleanupRoot = manifest.cleanupRoot;
  const pm2ProcessId = normalizeNonEmptyText(process.env.pm_id);
  const pm2ProcessName = normalizeNonEmptyText(process.env.name || process.env.pm2_name);
  const elevationCredentials = normalizeElevationCredentials(manifest.elevationCredentials);

  const sourceBackend = path.join(sourceRoot, backendFileName);
  const sourceBuildViewer = path.join(sourceRoot, buildViewerDirName);
  const targetBackend = path.join(targetRoot, backendFileName);
  const targetBuildViewer = path.join(targetRoot, buildViewerDirName);
  const DEFERRED_BUILD_VIEWER = 'DEFERRED_BUILD_VIEWER';
  let backupBuildViewerPath = '';
  let backendBackupPath = '';
  let pm2Stopped = false;
  let updateApplied = false;
  let deferredBackendSwap = false;
  let deferredBuildViewerSwap = false;

  // File log unico: cattura tutti i console.log/warn/error dell'updater + helper deferred
  // Path fisso: cloud-update-temp\updater-last.log (si sovrascrive ad ogni run)
  const updaterLogPath = path.join(path.dirname(path.dirname(manifestPath)), 'updater-last.log');
  const _origLog = console.log.bind(console);
  const _origWarn = console.warn.bind(console);
  const _origError = console.error.bind(console);
  {
    // I messaggi hanno già [cloudNow()] — non aggiungere timestamp extra
    const _writeLog = (prefix, args) => {
      try {
        const msg = args.map(a => (typeof a === 'string' ? a : String(a))).join(' ');
        fs.appendFileSync(updaterLogPath, (prefix ? prefix + ' ' : '') + msg + '\n', 'utf8');
      } catch (_e) {}
    };
    console.log = (...args) => { _origLog(...args); _writeLog('', args); };
    console.warn = (...args) => { _origWarn(...args); _writeLog('[WARN]', args); };
    console.error = (...args) => { _origError(...args); _writeLog('[ERROR]', args); };
  }
  // Separatore di run
  try { fs.appendFileSync(updaterLogPath, `\n${'='.repeat(60)}\nUPDATER RUN ${new Date().toISOString().replace('T', ' ').slice(0, 19)} manifest=${manifestPath}\n${'='.repeat(60)}\n`, 'utf8'); } catch (_e) {}

  console.log(`[${cloudNow()}] [cloud-update] updater embedded avviato (manifest=${manifestPath})`);
  console.log(`[${cloudNow()}] [cloud-update] log completo -> ${updaterLogPath}`);
  try {
    await sendEmbeddedUpdaterStatus(manifest, 'installing', 'Applicazione update in corso');

    if (parentPid > 0) {
      await waitForProcessExit(parentPid, 45000);
      if (cloudVerboseLogs) {
        console.log(`[${cloudNow()}] [cloud-update] updater embedded: parent pid terminato (${parentPid})`);
      }
    }

    if (pm2ProcessId) {
      pm2Stopped = runPm2Command(['stop', pm2ProcessId], 'stop by pm_id');
      if (!pm2Stopped && pm2ProcessName) {
        pm2Stopped = runPm2Command(['stop', pm2ProcessName], 'stop by name');
      }
      if (pm2Stopped) {
        await sleepMs(600);
      } else {
        console.warn(
          `[cloud-update] stop PM2 non riuscito (pm_id=${pm2ProcessId}, name=${pm2ProcessName || '-'})`
        );
      }
    }

    if (!fs.existsSync(sourceBackend)) {
      throw new Error(`File backend update non trovato: ${sourceBackend}`);
    }
    if (!fs.existsSync(sourceBuildViewer)) {
      throw new Error(`Cartella build-viewer update non trovata: ${sourceBuildViewer}`);
    }
    if (cloudVerboseLogs) {
      console.log(
        `[${cloudNow()}] [cloud-update] updater embedded: applicazione payload backend=${sourceBackend} buildViewer=${sourceBuildViewer}`
      );
      if (hasElevationCredentials(elevationCredentials)) {
        console.log(
          `[cloud-update] updater embedded: credenziali admin cloud abilitate (utente=${elevationCredentials.username})`
        );
      }
    }

    if (fs.existsSync(targetBackend)) {
      backendBackupPath = `${targetBackend}.backup-${Date.now()}`;
      runWithFsRetry(
        `backup backend (${targetBackend} -> ${backendBackupPath})`,
        () => fs.copyFileSync(targetBackend, backendBackupPath),
        6,
        300
      );
      if (cloudVerboseLogs) {
        console.log(`[${cloudNow()}] [cloud-update] updater embedded: backup backend creato (${backendBackupPath})`);
      }
    }

    backupBuildViewerPath = replaceBuildViewerDirectory(
      sourceBuildViewer,
      targetBuildViewer,
      elevationCredentials,
      {
        statusUrl: manifest.statusUrl,
        statusPayloadBase: manifest.statusPayloadBase,
        cleanupRoot,
      }
    );
    if (backupBuildViewerPath === DEFERRED_BUILD_VIEWER) {
      deferredBuildViewerSwap = true;
      if (cloudVerboseLogs) {
        console.warn(
          `[${cloudNow()}] [cloud-update] build-viewer swap deferred (IIS lock): helper in background su build-viewer.new`
        );
      }
    }
    try {
      replaceBackendFile(sourceBackend, targetBackend, elevationCredentials);
      updateApplied = true;
    } catch (backendSwapErr) {
      if (isLikelyBackendSwapLockError(backendSwapErr, targetBackend)) {
        deferredBackendSwap = true;
        if (cloudVerboseLogs) {
          console.warn(
            `[${cloudNow()}] [cloud-update] backend swap lock rilevato, attivo helper deferred: ${backendSwapErr.message}`
          );
        }
        await sendEmbeddedUpdaterStatus(
          manifest,
          'restarting',
          'Backend swap deferred in corso (lock file). Riavvio automatico in background'
        );
        const helperPath = launchDeferredBackendSwapHelper({
          sourceBackend,
          targetBackend,
          backendEntryPath,
          pm2ProcessId,
          pm2ProcessName,
          statusUrl: manifest.statusUrl,
          statusPayloadBase: manifest.statusPayloadBase,
          cleanupRoot,
          backendBackupPath,
          updaterPid: process.pid,
          elevationCredentials: hasElevationCredentials(elevationCredentials) ? elevationCredentials : null,
        });
        if (cloudVerboseLogs) {
          console.log(`[${cloudNow()}] [cloud-update] helper deferred avviato -> ${helperPath}`);
        }
        process.exit(0);
      }
      throw backendSwapErr;
    }
    if (cloudVerboseLogs) {
      console.log(`[${cloudNow()}] [cloud-update] updater embedded: copia file completata`);
    }
    if (backupBuildViewerPath && backupBuildViewerPath !== DEFERRED_BUILD_VIEWER) {
      removePathWithRetry(backupBuildViewerPath);
      backupBuildViewerPath = '';
    }
    if (backendBackupPath && fs.existsSync(backendBackupPath)) {
      removePathWithRetry(backendBackupPath);
      backendBackupPath = '';
    }

    console.log(`[${cloudNow()}] [cloud-update] RISULTATO FINALE: backend.js=OK, build-viewer=${deferredBuildViewerSwap ? 'DEFERRED (helper in background)' : 'OK'}`);

    if (pm2ProcessId) {
      let restarted = runPm2Command(['restart', pm2ProcessId], 'restart by pm_id');
      if (!restarted && pm2ProcessName) {
        restarted = runPm2Command(['restart', pm2ProcessName], 'restart by name');
      }
      if (!restarted && pm2Stopped && pm2ProcessName) {
        restarted = runPm2Command(
          ['start', backendEntryPath, '--name', pm2ProcessName],
          'start fallback'
        );
      }

      if (!restarted) {
        if (pm2Stopped) {
          console.warn(`[${cloudNow()}] [cloud-update] riavvio PM2 fallito, uso fallback backend standalone`);
          startStandaloneBackend(backendEntryPath);
          if (cloudVerboseLogs) {
            console.log(`[${cloudNow()}] [cloud-update] updater embedded: backend standalone avviato`);
          }
        }
        const bvMsg = deferredBuildViewerSwap ? '; build-viewer swap deferred in background' : '';
        await sendEmbeddedUpdaterStatus(
          manifest,
          'success',
          `Update applicato; riavvio PM2 non riuscito (${pm2ProcessId}), attivato fallback automatico${bvMsg}`
        );
      } else {
        if (cloudVerboseLogs) {
          console.log(`[${cloudNow()}] [cloud-update] updater embedded: riavvio PM2 completato`);
        }
        const bvMsg = deferredBuildViewerSwap ? '; build-viewer swap deferred in background (IIS lock)' : '';
        await sendEmbeddedUpdaterStatus(
          manifest,
          'success',
          `Update applicato con successo, riavvio backend completato${bvMsg}`
        );
      }
    } else {
      startStandaloneBackend(backendEntryPath);
      if (cloudVerboseLogs) {
        console.log(`[${cloudNow()}] [cloud-update] updater embedded: backend standalone avviato`);
      }
      const bvMsg = deferredBuildViewerSwap ? '; build-viewer swap deferred in background (IIS lock)' : '';
      await sendEmbeddedUpdaterStatus(
        manifest,
        'success',
        `Update applicato con successo, riavvio backend completato${bvMsg}`
      );
    }
  } catch (err) {
    if (cloudVerboseLogs) {
      console.warn(`[${cloudNow()}] [cloud-update] updater embedded: rollback avviato per errore: ${err.message}`);
    }

    if (backendBackupPath && fs.existsSync(backendBackupPath)) {
      try {
        replaceBackendFile(backendBackupPath, targetBackend, elevationCredentials);
        if (cloudVerboseLogs) {
          console.log(`[${cloudNow()}] [cloud-update] updater embedded: rollback backend completato`);
        }
      } catch (rollbackBackendErr) {
        console.warn(
          `[cloud-update] updater embedded: rollback backend fallito: ${rollbackBackendErr.message}`
        );
      }
    }

    if (backupBuildViewerPath && fs.existsSync(backupBuildViewerPath)) {
      try {
        if (fs.existsSync(targetBuildViewer)) {
          removePathWithRetry(targetBuildViewer);
        }
        runWithFsRetry(
          `restore build-viewer backup (${backupBuildViewerPath} -> ${targetBuildViewer})`,
          () => fs.renameSync(backupBuildViewerPath, targetBuildViewer),
          6,
          300
        );
        backupBuildViewerPath = '';
        if (cloudVerboseLogs) {
          console.log(`[${cloudNow()}] [cloud-update] updater embedded: rollback build-viewer completato`);
        }
      } catch (rollbackViewerErr) {
        console.warn(
          `[cloud-update] updater embedded: rollback build-viewer fallito: ${rollbackViewerErr.message}`
        );
      }
    }

    let recovered = false;
    if (pm2ProcessId) {
      recovered = runPm2Command(['restart', pm2ProcessId], 'recover restart by pm_id');
      if (!recovered && pm2ProcessName) {
        recovered = runPm2Command(['restart', pm2ProcessName], 'recover restart by name');
      }
      if (!recovered && pm2Stopped && pm2ProcessName) {
        recovered = runPm2Command(
          ['start', backendEntryPath, '--name', pm2ProcessName],
          'recover start fallback'
        );
      }
      if (!recovered && pm2Stopped) {
        startStandaloneBackend(backendEntryPath);
        recovered = true;
        if (cloudVerboseLogs) {
          console.log(`[${cloudNow()}] [cloud-update] updater embedded: recovery backend standalone avviato`);
        }
      }
    } else if (updateApplied) {
      startStandaloneBackend(backendEntryPath);
      recovered = true;
      if (cloudVerboseLogs) {
        console.log(`[${cloudNow()}] [cloud-update] updater embedded: recovery backend standalone avviato`);
      }
    }

    console.log(`[${cloudNow()}] [cloud-update] RISULTATO FINALE: FALLITO - backend.js=${updateApplied ? 'OK (poi rollback)' : 'FAIL'}, build-viewer=${deferredBuildViewerSwap ? 'DEFERRED' : 'FAIL'}, errore: ${err.message}`);
    const failedMessage = recovered
      ? `${err.message} | rollback eseguito, backend ripristinato`
      : `${err.message} | rollback/parziale recovery non completato`;
    await sendEmbeddedUpdaterStatus(manifest, 'failed', failedMessage);
    throw err;
  } finally {
    if (!deferredBackendSwap && cleanupRoot && fs.existsSync(cleanupRoot)) {
      try {
        removePathWithRetry(cleanupRoot);
        if (cloudVerboseLogs) {
          console.log(`[${cloudNow()}] [cloud-update] updater embedded: cleanup temp completata (${cleanupRoot})`);
        }
      } catch (cleanupErr) {
        console.warn(`[${cloudNow()}] [cloud-update] updater embedded: cleanup temp fallita: ${cleanupErr.message}`);
      }
    }

    if (backupBuildViewerPath && fs.existsSync(backupBuildViewerPath)) {
      try {
        removePathWithRetry(backupBuildViewerPath);
      } catch (_err) {
        // ignore
      }
    }

    if (!deferredBackendSwap && backendBackupPath && fs.existsSync(backendBackupPath)) {
      try {
        removePathWithRetry(backendBackupPath);
      } catch (_err) {
        // ignore
      }
    }

    // Ripristina console originale
    console.log = _origLog;
    console.warn = _origWarn;
    console.error = _origError;
  }

  process.exit(0);
}

function processExists(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (_err) {
    return false;
  }
}

async function waitForProcessExit(pid, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!processExists(pid)) {
      return;
    }
    await sleepMs(500);
  }
}

// Crea uno scheduled task come utente admin (/RU user /RP pass) ed esegue un file PS1.
// Il Task Scheduler service (SYSTEM) crea il processo come admin — NON richiede SeImpersonatePrivilege
// nel chiamante (a differenza di Start-Process -Credential).
// Ritorna il contenuto del file di risultato (resultPath), o null se timeout/errore.
function runPs1AsAdminViaSchtask(ps1Path, resultPath, taskName, adminUser, adminPassword) {
  const now = new Date();
  let stH = now.getHours(), stM = now.getMinutes() + 2;
  if (stM >= 60) { stM -= 60; stH = (stH + 1) % 24; }
  const stTime = `${String(stH).padStart(2, '0')}:${String(stM).padStart(2, '0')}`;

  const createR = spawnSync('schtasks', [
    '/Create', '/F', '/TN', taskName,
    '/TR', `powershell -NoProfile -NonInteractive -WindowStyle Hidden -File "${ps1Path}"`,
    '/SC', 'ONCE', '/ST', stTime,
    '/RU', adminUser, '/RP', adminPassword,
  ], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', windowsHide: true, timeout: 15000 });
  const createErr = ((createR.stderr || '') + (createR.stdout || '')).trim().slice(0, 200);
  if (cloudVerboseLogs) {
    console.log(`[${cloudNow()}] [cloud-update] schtask-admin create exit=${createR.status}${createErr ? ' ' + createErr : ' OK'}`);
  }
  if (createR.status !== 0) return `SCHTASK_CREATE_FAIL:${createErr}`;

  const runR = spawnSync('schtasks', ['/Run', '/TN', taskName],
    { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', windowsHide: true, timeout: 5000 });
  if (cloudVerboseLogs) {
    console.log(`[${cloudNow()}] [cloud-update] schtask-admin run exit=${runR.status}`);
  }
  spawnSync('schtasks', ['/Delete', '/F', '/TN', taskName], { stdio: 'ignore', windowsHide: true, timeout: 5000 });
  if (runR.status !== 0) return null;

  // Attendi il file di risultato (max 60s)
  for (let i = 0; i < 120; i++) {
    sleepSyncMs(500);
    try {
      if (fs.existsSync(resultPath)) {
        const r = fs.readFileSync(resultPath, 'utf8').trim();
        try { fs.rmSync(resultPath, { force: true }); } catch (_e) {}
        return r;
      }
    } catch (_e) {}
  }
  return null; // timeout
}

// Aggiorna build-viewer tramite schtask che gira come utente admin.
// Usa robocopy (MIR) oppure copia in-place se robocopy fallisce.
// Ritorna true se l'aggiornamento è riuscito.
function trySwapViaSchtaskSync(sourceDir, targetDir, elevationCredentials = null) {
  if (process.platform !== 'win32') return false;
  const id = Date.now().toString(36);
  const newDir = targetDir + '.new-sys-' + id;
  const taskName = 'NolexBVSwap_' + id;
  const helperDir = resolveHelperTempDir(path.dirname(targetDir));
  const ps1Path = path.join(helperDir, 'NolexBVSwapSys-' + id + '.ps1');
  const resultPath = path.join(helperDir, 'NolexBVSwapSys-' + id + '.result');

  try {
    copyDirectoryRecursive(sourceDir, newDir);
    if (cloudVerboseLogs) {
      console.log(`[${cloudNow()}] [cloud-update] schtask: copia ${sourceDir} -> ${newDir} OK`);
    }

    const esc = s => String(s).replace(/'/g, "''");

    // Approccio A: schtask come utente admin (/RU user /RP pass).
    // Task Scheduler (SYSTEM) crea il processo come admin → bypassa CFA senza SeImpersonatePrivilege.
    if (hasElevationCredentials(elevationCredentials)) {
      fs.writeFileSync(ps1Path,
        `$ErrorActionPreference='Stop'\r\n` +
        `$src='${esc(newDir)}'\r\n` +
        `$dst='${esc(targetDir)}'\r\n` +
        `$res='${esc(resultPath)}'\r\n` +
        `try {\r\n` +
        `  robocopy $src $dst /MIR /R:2 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null\r\n` +
        `  if ($LASTEXITCODE -le 7) { Set-Content -LiteralPath $res -Value 'OK' -Encoding UTF8 }\r\n` +
        `  else { Set-Content -LiteralPath $res -Value "FAIL:robocopy $($LASTEXITCODE)" -Encoding UTF8 }\r\n` +
        `} catch { Set-Content -LiteralPath $res -Value "FAIL:$($_.Exception.Message.Substring(0,[Math]::Min(100,$_.Exception.Message.Length)))" -Encoding UTF8 }\r\n`,
        'utf8');

      const result = runPs1AsAdminViaSchtask(ps1Path, resultPath, taskName, elevationCredentials.username, elevationCredentials.password);
      if (cloudVerboseLogs) {
        console.log(`[${cloudNow()}] [cloud-update] schtask-admin result: ${result || '(timeout/null)'}`);
      }
      if (result === 'OK') {
        const vAfter = readVersionTxtSafe(targetDir);
        console.log(`[${cloudNow()}] [cloud-update] RISULTATO build-viewer=OK (schtask admin), version.txt="${vAfter}"`);
        try { fs.rmSync(newDir, { recursive: true, force: true }); } catch (_e) {}
        return true;
      }
      if (result && result.startsWith('FAIL:')) {
        if (cloudVerboseLogs) console.warn(`[${cloudNow()}] [cloud-update] schtask-admin robocopy: ${result}, provo in-place`);
        // Prova in-place via schtask admin
        const id2 = Date.now().toString(36);
        const taskName2 = 'NolexBVSwap2_' + id2;
        const ps1Path2 = path.join(helperDir, 'NolexBVSwapSys2-' + id2 + '.ps1');
        const resultPath2 = path.join(helperDir, 'NolexBVSwapSys2-' + id2 + '.result');
        try {
          fs.writeFileSync(ps1Path2,
            `$ErrorActionPreference='Stop'\r\n` +
            `$src='${esc(newDir)}'\r\n` +
            `$dst='${esc(targetDir)}'\r\n` +
            `$res='${esc(resultPath2)}'\r\n` +
            `try {\r\n` +
            `  Get-ChildItem $src -Recurse | ForEach-Object {\r\n` +
            `    $rel=$_.FullName.Substring($src.Length+1)\r\n` +
            `    $d=Join-Path $dst $rel\r\n` +
            `    if ($_.PSIsContainer){New-Item -ItemType Directory -Path $d -Force|Out-Null}\r\n` +
            `    else{New-Item -ItemType Directory -Path (Split-Path $d) -Force|Out-Null;Copy-Item -LiteralPath $_.FullName -Destination $d -Force}\r\n` +
            `  }\r\n` +
            `  Set-Content -LiteralPath $res -Value 'OK' -Encoding UTF8\r\n` +
            `} catch { Set-Content -LiteralPath $res -Value "FAIL:$($_.Exception.Message.Substring(0,[Math]::Min(100,$_.Exception.Message.Length)))" -Encoding UTF8 }\r\n`,
            'utf8');
          const result2 = runPs1AsAdminViaSchtask(ps1Path2, resultPath2, taskName2, elevationCredentials.username, elevationCredentials.password);
          if (cloudVerboseLogs) {
            console.log(`[${cloudNow()}] [cloud-update] schtask-admin in-place result: ${result2 || '(timeout/null)'}`);
          }
          if (result2 === 'OK') {
            const vAfter = readVersionTxtSafe(targetDir);
            console.log(`[${cloudNow()}] [cloud-update] RISULTATO build-viewer=OK (schtask admin in-place), version.txt="${vAfter}"`);
            try { fs.rmSync(newDir, { recursive: true, force: true }); } catch (_e) {}
            return true;
          }
        } finally {
          try { fs.rmSync(ps1Path2, { force: true }); } catch (_e) {}
          try { fs.rmSync(resultPath2, { force: true }); } catch (_e) {}
        }
      }
      if (cloudVerboseLogs) console.warn(`[${cloudNow()}] [cloud-update] schtask-admin fallito (result=${result || 'null'})`);
    }

    return false;
  } catch (e) {
    if (cloudVerboseLogs) {
      console.warn(`[${cloudNow()}] [cloud-update] schtask fallito: ${e.message.slice(0, 150)}`);
    }
    return false;
  } finally {
    try { fs.rmSync(newDir, { recursive: true, force: true }); } catch (_e) {}
    try { fs.rmSync(ps1Path, { force: true }); } catch (_e) {}
    try { fs.rmSync(resultPath, { force: true }); } catch (_e) {}
  }
}

function replaceBuildViewerDirectory(sourceDir, targetDir, elevationCredentials = null, deferredSwapOptions = null) {
  const DEFERRED = 'DEFERRED_BUILD_VIEWER';

  if (cloudVerboseLogs) {
    console.log(`[${cloudNow()}] [cloud-update] replace build-viewer: robocopy ${sourceDir} -> ${targetDir}`);
  }

  try {
    mirrorDirectoryDirectRobocopy(sourceDir, targetDir);
    if (cloudVerboseLogs) {
      console.log(`[${cloudNow()}] [cloud-update] replace build-viewer: robocopy completato OK`);
    }
    return '';
  } catch (roboErr) {
    if (cloudVerboseLogs) {
      console.warn(`[${cloudNow()}] [cloud-update] replace build-viewer: robocopy fallito, provo schtask-admin`);
    }

    if (process.platform === 'win32') {
      const schtaskOk = trySwapViaSchtaskSync(sourceDir, targetDir, elevationCredentials);
      if (schtaskOk) return '';

      if (deferredSwapOptions) {
        if (cloudVerboseLogs) console.warn(`[${cloudNow()}] [cloud-update] replace build-viewer: schtask fallito, deferred swap`);
        copyToBuildViewerNewAndLaunchSwapHelper(sourceDir, targetDir, {
          ...deferredSwapOptions,
          elevationCredentials: hasElevationCredentials(elevationCredentials) ? elevationCredentials : null,
        });
        return DEFERRED;
      }
    }

    throw createCloudUpdatePermissionDeniedError(`replace build-viewer fallita (${roboErr.message})`);
  }
}

function replaceBackendFile(sourceFile, targetFile, elevationCredentials = null) {
  const targetDir = path.dirname(targetFile);
  fs.mkdirSync(targetDir, { recursive: true });
  const tempTargetFile = `${targetFile}.new`;

  // Step 1: copia sorgente in .new
  // Qui l'elevazione puo' aiutare se la directory ha ACL restrittivi.
  if (cloudVerboseLogs) {
    console.log(`[${cloudNow()}] [cloud-update] replace backend step 1: copia ${sourceFile} -> ${tempTargetFile}`);
  }
  try {
    runWithFsRetry(`copy backend temp (${sourceFile} -> ${tempTargetFile})`, () => {
      fs.copyFileSync(sourceFile, tempTargetFile);
    }, 2, 500);
    if (cloudVerboseLogs) {
      console.log(`[${cloudNow()}] [cloud-update] replace backend step 1 OK: ${tempTargetFile} creato`);
    }
  } catch (copyErr) {
    if (process.platform === 'win32' && isRetryableFsError(copyErr) && hasElevationCredentials(elevationCredentials)) {
      if (cloudVerboseLogs) {
        console.warn(
          `[${cloudNow()}] [cloud-update] replace backend step 1 fallita (${copyErr.code || '-'}), provo copy diretta con credenziali admin`
        );
      }
      try {
        copyFileWithElevationCredentials(sourceFile, targetFile, elevationCredentials);
        if (cloudVerboseLogs) {
          console.log(`[${cloudNow()}] [cloud-update] replace backend step 1 OK (con credenziali admin): ${targetFile}`);
        }
        return;
      } catch (elevErr) {
        if (normalizeNonEmptyText(elevErr?.code) === 'CLOUD_UPDATE_BAD_CREDENTIALS') {
          throw elevErr;
        }
        throw createCloudUpdatePermissionDeniedError(
          `replace backend copy fallita anche con elevazione (${elevErr.message})`
        );
      }
    }
    if (isRetryableFsError(copyErr)) {
      throw createCloudUpdatePermissionDeniedError(`replace backend fallito (${copyErr.message})`);
    }
    throw copyErr;
  }

  // Step 2: rename .new → target.
  // Non si tenta copia diretta ne' elevazione: l'EPERM e' causato dal fatto che
  // il processo updater stesso sta eseguendo backend.js (V8 tiene il file mappato).
  // Nessuna operazione puo' sovrascrivere un file in uso dal processo corrente.
  // L'errore EPERM deve propagarsi con il messaggio originale (che contiene "rename"
  // e ".new") affinche' isLikelyBackendSwapLockError lo riconosca e triggeri il
  // deferred swap helper, che agisce DOPO che il processo e' uscito.
  if (cloudVerboseLogs) {
    console.log(`[${cloudNow()}] [cloud-update] replace backend step 2: rename ${tempTargetFile} -> ${targetFile}`);
  }
  try {
    runWithFsRetry(`swap backend file (${tempTargetFile} -> ${targetFile})`, () => {
      fs.renameSync(tempTargetFile, targetFile);
    }, 2, 500);
    if (cloudVerboseLogs) {
      console.log(`[${cloudNow()}] [cloud-update] replace backend step 2 OK: ${targetFile} aggiornato`);
    }
  } catch (renameErr) {
    if (cloudVerboseLogs) {
      console.warn(
        `[${cloudNow()}] [cloud-update] replace backend step 2 fallita (${renameErr.code || '-'}): deferred swap verra' attivato`
      );
    }
    // Pulizia .new: il deferred helper usa sourceBackend (originale), non il .new
    try { if (fs.existsSync(tempTargetFile)) fs.rmSync(tempTargetFile, { force: true }); } catch (_e) {}
    if (isRetryableFsError(renameErr)) {
      throw createCloudUpdatePermissionDeniedError(`replace backend fallito (${renameErr.message})`);
    }
    throw renameErr;
  }
  // Pulizia .new in caso di successo (il file e' stato rinominato, non esiste piu')
  try { if (fs.existsSync(tempTargetFile)) fs.rmSync(tempTargetFile, { force: true }); } catch (_e) {}
}

function isRetryableFsError(err) {
  const code = normalizeNonEmptyText(err?.code).toUpperCase();
  return ['EPERM', 'EACCES', 'EBUSY', 'ENOTEMPTY', 'EMFILE'].includes(code);
}

function runWithFsRetry(actionLabel, actionFn, maxAttempts = 10, delayMs = 300) {
  let lastError = null;
  const attempts = Number.isFinite(maxAttempts) && maxAttempts > 0 ? maxAttempts : 1;
  const waitMs = Number.isFinite(delayMs) && delayMs > 0 ? delayMs : 0;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return actionFn();
    } catch (err) {
      lastError = err;
      if (!isRetryableFsError(err) || attempt >= attempts) {
        throw err;
      }
      if (cloudVerboseLogs) {
        console.warn(
          `[${cloudNow()}] [cloud-update] fs retry ${attempt}/${attempts} fallito (${actionLabel}): ${err.message}`
        );
      }
      if (waitMs > 0) {
        sleepSyncMs(waitMs);
      }
    }
  }

  throw lastError || new Error(`Operazione FS fallita: ${actionLabel}`);
}

function ensurePathTypeForMirror(dstPath, shouldBeDirectory) {
  if (!fs.existsSync(dstPath)) {
    return;
  }

  const stat = fs.statSync(dstPath);
  if ((shouldBeDirectory && stat.isDirectory()) || (!shouldBeDirectory && stat.isFile())) {
    return;
  }

  runWithFsRetry(`remove path type mismatch (${dstPath})`, () => {
    fs.rmSync(dstPath, { recursive: true, force: true });
  });
}

function copyFileWithRetry(srcFile, dstFile) {
  fs.mkdirSync(path.dirname(dstFile), { recursive: true });
  if (fs.existsSync(dstFile)) {
    tryUnlockFileForWrite(dstFile);
  }
  runWithFsRetry(`copy file (${srcFile} -> ${dstFile})`, () => {
    if (fs.existsSync(dstFile)) {
      tryUnlockFileForWrite(dstFile);
    }
    fs.copyFileSync(srcFile, dstFile);
  });
}

function removePathWithRetry(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return;
  }
  tryUnlockFileForWrite(targetPath);
  runWithFsRetry(`remove path (${targetPath})`, () => {
    tryUnlockFileForWrite(targetPath);
    fs.rmSync(targetPath, { recursive: true, force: true });
  });
}

function mirrorDirectoryInPlace(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });

  const sourceEntries = fs.readdirSync(sourceDir, { withFileTypes: true });
  const sourceNames = new Set(sourceEntries.map(entry => entry.name));

  // 1) Copia/aggiorna contenuto sorgente nel target.
  for (const entry of sourceEntries) {
    const src = path.join(sourceDir, entry.name);
    const dst = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      ensurePathTypeForMirror(dst, true);
      mirrorDirectoryInPlace(src, dst);
      continue;
    }
    if (entry.isFile()) {
      ensurePathTypeForMirror(dst, false);
      copyFileWithRetry(src, dst);
    }
  }

  // 2) Rimuove contenuto obsoleto rimasto nel target.
  const targetEntries = fs.readdirSync(targetDir, { withFileTypes: true });
  for (const entry of targetEntries) {
    if (sourceNames.has(entry.name)) {
      continue;
    }
    removePathWithRetry(path.join(targetDir, entry.name));
  }
}

function startStandaloneBackend(backendEntryPath) {
  const child = spawn(process.execPath, [backendEntryPath], {
    cwd: path.dirname(backendEntryPath),
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: process.env,
  });
  child.unref();
}

function runPm2Command(args, reason) {
  const candidates = getPm2CommandCandidates(args);
  for (const candidate of candidates) {
    const result = spawnSync(candidate.command, candidate.args, {
      stdio: 'ignore',
      windowsHide: true,
      env: process.env,
      shell: false,
    });
    if (!result.error && result.status === 0) {
      if (cloudVerboseLogs && reason) {
        console.log(`[${cloudNow()}] [cloud-update] PM2 OK (${reason}) via ${candidate.label}`);
      }
      return true;
    }
  }
  return false;
}

function getPm2CommandCandidates(args) {
  const commands = [];
  const seen = new Set();

  const pushCandidate = (command, commandArgs, label) => {
    const key = `${command}|${commandArgs.join(' ')}`;
    if (!seen.has(key)) {
      seen.add(key);
      commands.push({ command, args: commandArgs, label });
    }
  };

  pushCandidate('pm2', args, 'pm2');
  if (process.platform === 'win32') {
    pushCandidate('pm2.cmd', args, 'pm2.cmd');
  }

  const pm2CliCandidates = [
    path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'pm2', 'bin', 'pm2'),
    path.join(process.env.ProgramFiles || '', 'nodejs', 'node_modules', 'pm2', 'bin', 'pm2'),
    path.join(path.dirname(process.execPath), '..', 'lib', 'node_modules', 'pm2', 'bin', 'pm2'),
    '/usr/local/lib/node_modules/pm2/bin/pm2',
    '/usr/lib/node_modules/pm2/bin/pm2',
  ].filter(Boolean);

  for (const cliPath of pm2CliCandidates) {
    if (fs.existsSync(cliPath)) {
      pushCandidate(process.execPath, [cliPath, ...args], `node ${cliPath}`);
    }
  }

  return commands;
}

async function sendEmbeddedUpdaterStatus(manifest, status, message) {
  const statusUrl = manifest?.statusUrl;
  if (!statusUrl || typeof fetch !== 'function') {
    return;
  }

  const payload = {
    ...(manifest.statusPayloadBase || {}),
    status,
    message: message || '',
    sentAt: new Date().toISOString(),
  };

  try {
    const response = await fetchWithTimeout(
      statusUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
      cloudRequestTimeoutMs,
      'embedded update-status request'
    );
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status} ${response.statusText} ${errText}`);
    }
  } catch (err) {
    if (cloudVerboseLogs) {
      console.warn(`[${cloudNow()}] [cloud-update] updater embedded: errore invio stato '${status}': ${err.message}`);
    }
  }
}

function copyDirectoryRecursive(srcDir, dstDir) {
  fs.mkdirSync(dstDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const src = path.join(srcDir, entry.name);
    const dst = path.join(dstDir, entry.name);
    if (entry.isDirectory()) {
      copyDirectoryRecursive(src, dst);
      continue;
    }
    if (entry.isFile()) {
      fs.copyFileSync(src, dst);
    }
  }
}

function sleepMs(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runCloudClientUpdate(commandPayload) {
  if (cloudUpdateInProgress) {
    if (cloudVerboseLogs) {
      console.log(`[${cloudNow()}] [cloud-update] update gia in corso, comando ignorato`);
    }
    return;
  }

  cloudUpdateInProgress = true;
  cloudUpdateCancelRequested = false;
  cloudUpdateAbortController = null;

  const release = commandPayload?.release || {};
  const releaseVersion = normalizeNonEmptyText(release.version || commandPayload?.targetVersion);
  const downloadUrl = normalizeNonEmptyText(release.downloadUrl);
  const expectedSha = normalizeNonEmptyText(release.sha256).toLowerCase();
  const elevationCredentials = normalizeElevationCredentials(commandPayload?.elevation);
  if (cloudVerboseLogs) {
    console.log(
      `[${cloudNow()}] [cloud-update] comando update ricevuto -> targetVersion=${releaseVersion || '-'} url=${
        downloadUrl || '-'
      }`
    );
    if (hasElevationCredentials(elevationCredentials)) {
      console.log(
        `[${cloudNow()}] [cloud-update] update command: credenziali admin cloud ricevute (utente=${elevationCredentials.username})`
      );
    }
  }

  const sessionId = Date.now().toString(36);
  const tempRoot = path.join(cloudUpdateTempDir, `update-${sessionId}`);
  const packagePath = path.join(tempRoot, 'release.zip');
  const extractPath = path.join(tempRoot, 'extracted');
  const manifestPath = path.join(tempRoot, 'updater-manifest.json');
  cloudUpdateCurrentTargetVersion = releaseVersion;
  cloudUpdateCurrentTempRoot = tempRoot;
  const stopCancelWatcher = startCloudUpdateCancellationWatcher(releaseVersion);

  try {
    if (!releaseVersion || !downloadUrl) {
      throw new Error('Comando update incompleto: manca versione o downloadUrl');
    }
    fs.mkdirSync(tempRoot, { recursive: true });
    if (cloudVerboseLogs) {
      console.log(`[${cloudNow()}] [cloud-update] cartella temp creata: ${tempRoot}`);
    }

    await sendCloudUpdateStatus('downloading', `Download release ${releaseVersion} in corso`, {
      targetVersion: releaseVersion,
    });
    await syncCloudCancelStateNow(releaseVersion);
    throwIfCloudUpdateCancelled('before-download');
    setCloudUpdateAbortController();
    await downloadFileFromUrl(downloadUrl, packagePath, cloudUpdateAbortController.signal);
    await syncCloudCancelStateNow(releaseVersion);
    throwIfCloudUpdateCancelled('after-download');
    if (cloudVerboseLogs) {
      console.log(`[${cloudNow()}] [cloud-update] download completato: ${packagePath}`);
    }

    const actualSha = computeFileSha256(packagePath).toLowerCase();
    if (cloudVerboseLogs) {
      console.log(`[${cloudNow()}] [cloud-update] checksum download: ${actualSha}`);
    }
    if (expectedSha && actualSha !== expectedSha) {
      throw new Error(
        `Checksum non valida per release ${releaseVersion}: attesa=${expectedSha} ottenuta=${actualSha}`
      );
    }

    await sendCloudUpdateStatus('installing', `Estrazione release ${releaseVersion}`, {
      targetVersion: releaseVersion,
      packageSha256: actualSha,
    });
    await syncCloudCancelStateNow(releaseVersion);
    throwIfCloudUpdateCancelled('before-extract');
    setCloudUpdateAbortController();
    await extractZipToDirectory(packagePath, extractPath, cloudUpdateAbortController.signal);
    await syncCloudCancelStateNow(releaseVersion);
    throwIfCloudUpdateCancelled('after-extract');
    if (cloudVerboseLogs) {
      console.log(`[${cloudNow()}] [cloud-update] estrazione completata: ${extractPath}`);
    }

    const payloadRoot = findUpdatePayloadRoot(extractPath);
    if (!payloadRoot) {
      throw new Error(
        'Pacchetto update non valido: devono essere presenti backend.js e cartella build-viewer'
      );
    }

    const sourceBackendPath = path.join(payloadRoot, 'backend.js');
    const sourceBuildViewerPath = path.join(payloadRoot, 'build-viewer');
    if (!fs.existsSync(sourceBackendPath) || !fs.existsSync(sourceBuildViewerPath)) {
      throw new Error('Contenuto update incompleto dopo estrazione');
    }
    if (cloudVerboseLogs) {
      console.log(
        `[${cloudNow()}] [cloud-update] payload valido -> root=${payloadRoot} backend=${sourceBackendPath} buildViewer=${sourceBuildViewerPath}`
      );
    }
    throwIfCloudUpdateCancelled('before-manifest');

    const manifest = {
      parentPid: process.pid,
      sourceRoot: payloadRoot,
      targetRoot: __dirname,
      backendFileName: 'backend.js',
      buildViewerDirName: 'build-viewer',
      backendEntryPath: path.join(__dirname, 'backend.js'),
      cleanupRoot: tempRoot,
      statusUrl: cloudClientUpdateStatusUrl,
      statusPayloadBase: {
        ...buildCloudIdentityPayload(),
        version: releaseVersion,
        targetVersion: releaseVersion,
      },
      elevationCredentials: hasElevationCredentials(elevationCredentials) ? elevationCredentials : null,
    };

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    if (cloudVerboseLogs) {
      console.log(`[${cloudNow()}] [cloud-update] manifest scritto: ${manifestPath}`);
    }

    await sendCloudUpdateStatus('restarting', `Update ${releaseVersion} applicato, riavvio backend`, {
      targetVersion: releaseVersion,
      packageSha256: actualSha,
    });
    await syncCloudCancelStateNow(releaseVersion);
    throwIfCloudUpdateCancelled('before-restart');

    launchDetachedUpdater(manifestPath);
    if (cloudVerboseLogs) {
      console.log(`[${cloudNow()}] [cloud-update] updater lanciato, uscita processo backend imminente`);
    }
    setTimeout(() => process.exit(0), 500);
  } catch (err) {
    if (isCloudUpdateCancelledError(err)) {
      await sendCloudUpdateStatus('cancelled', err.message, {
        targetVersion: releaseVersion || '',
      });
      console.warn(`[${cloudNow()}] [cloud-update] aggiornamento annullato: ${err.message}`);
    } else {
      await sendCloudUpdateStatus('failed', err.message, {
        targetVersion: releaseVersion || '',
      });
      console.warn(`[${cloudNow()}] [cloud-update] errore aggiornamento client: ${err.message}`);
    }
    try {
      fs.rmSync(tempRoot, { recursive: true, force: true });
      if (cloudVerboseLogs) {
        console.log(`[${cloudNow()}] [cloud-update] cleanup temp completata: ${tempRoot}`);
      }
    } catch (_cleanupErr) {
      // ignore
    }
  } finally {
    stopCancelWatcher();
    cloudUpdateInProgress = false;
    cloudUpdateCancelRequested = false;
    cloudUpdateAbortController = null;
    cloudUpdateCurrentTargetVersion = '';
    cloudUpdateCurrentTempRoot = '';
  }
}

async function handleCredentialTest(credentialTest) {
  const reportResult = async (ok, message) => {
    if (!cloudClientCredTestResultUrl || typeof fetch !== 'function') return;
    try {
      const payload = {
        ...buildCloudIdentityPayload(),
        status: ok ? 'ok' : 'failed',
        success: ok,
        message: message || (ok ? 'OK' : 'Errore sconosciuto'),
        sentAt: new Date().toISOString(),
      };
      const response = await fetchWithTimeout(
        cloudClientCredTestResultUrl,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
        cloudRequestTimeoutMs,
        'cred-test-result'
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status} ${response.statusText} ${errorText}`);
      }
    } catch (err) {
      console.warn(`[${cloudNow()}] [cloud-cred-test] errore invio risultato: ${err.message}`);
    }
  };

  if (!credentialTest?.username || !credentialTest?.password) {
    await reportResult(false, 'Credenziali non valide nel payload di test');
    return;
  }

  if (process.platform !== 'win32') {
    await reportResult(false, 'Test credenziali supportato solo su Windows');
    return;
  }

  const id = Date.now().toString(36);
  const taskName = 'NolexCredTest_' + id;
  const helperDir = resolveHelperTempDir(cloudUpdateTempDir || os.tmpdir());
  const ps1Path = path.join(helperDir, 'nolex-cred-test-' + id + '.ps1');
  const resultPath = path.join(helperDir, 'nolex-cred-test-' + id + '.result');

  try {
    fs.mkdirSync(helperDir, { recursive: true });
    fs.writeFileSync(
      ps1Path,
      `$ErrorActionPreference='Stop'\r\n` +
      `$res='${resultPath.replace(/'/g, "''")}'\r\n` +
      `try {\r\n` +
      `  Set-Content -LiteralPath $res -Value 'OK' -Encoding UTF8\r\n` +
      `} catch {\r\n` +
      `  Set-Content -LiteralPath $res -Value "FAIL:$($_.Exception.Message.Substring(0,[Math]::Min(100,$_.Exception.Message.Length)))" -Encoding UTF8\r\n` +
      `}\r\n`,
      'utf8'
    );

    const result = runPs1AsAdminViaSchtask(
      ps1Path, resultPath, taskName,
      credentialTest.username, credentialTest.password
    );

    if (cloudVerboseLogs) {
      console.log(`[${cloudNow()}] [cloud-cred-test] schtask result: ${result || '(timeout/null)'}`);
    }

    if (result === 'OK') {
      await reportResult(true, 'Credenziali verificate con successo');
    } else if (result && result.startsWith('FAIL:')) {
      await reportResult(false, result.slice(5));
    } else if (result && result.startsWith('SCHTASK_CREATE_FAIL:')) {
      const schtaskErr = result.slice('SCHTASK_CREATE_FAIL:'.length).toLowerCase();
      const isWrongCreds =
        schtaskErr.includes('password') ||
        schtaskErr.includes('user name') ||
        schtaskErr.includes('username') ||
        schtaskErr.includes('incorrect') ||
        schtaskErr.includes('non corrett') ||
        schtaskErr.includes('non valide') ||
        schtaskErr.includes('logon failure') ||
        schtaskErr.includes('accesso negato');
      if (isWrongCreds) {
        await reportResult(false, 'Credenziali non valide: username o password errati');
      } else {
        await reportResult(false, `Impossibile creare il task pianificato: ${result.slice('SCHTASK_CREATE_FAIL:'.length) || 'errore sconosciuto'}`);
      }
    } else {
      await reportResult(false, 'Timeout o nessuna risposta dallo scheduler');
    }
  } catch (err) {
    await reportResult(false, err.message || 'Errore esecuzione test');
  } finally {
    try { fs.rmSync(ps1Path, { force: true }); } catch (_e) {}
    try { fs.rmSync(resultPath, { force: true }); } catch (_e) {}
  }
}

function startCloudCommandPolling() {
  if (!cloudCommandPollingEnabled || !cloudClientCommandUrl) {
    if (cloudVerboseLogs) {
      console.log(`[${cloudNow()}] [cloud-update] polling comandi disabilitato da configurazione`);
    }
    return;
  }

  if (typeof fetch !== 'function') {
    console.warn(`[${cloudNow()}] [cloud-update] fetch non disponibile: polling comandi disabilitato`);
    return;
  }

  const POLL_MIN_MS = 10000;
  const POLL_MAX_MS = 3600000;
  const POLL_DEFAULT_MS =
    Number.isFinite(cloudCommandPollIntervalMs) && cloudCommandPollIntervalMs >= POLL_MIN_MS
      ? Math.min(cloudCommandPollIntervalMs, POLL_MAX_MS)
      : 60000;

  let currentPollIntervalMs = POLL_DEFAULT_MS;

  const pollCommand = async () => {
    if (cloudRenameInProgress) {
      if (cloudVerboseLogs) {
        console.log(
          `[${cloudNow()}] [cloud-update] skip polling: renameInProgress=${cloudRenameInProgress}`
        );
      }
      return;
    }

    try {
      const { commandPayload, currentVersion } = await pollCloudCommandSnapshot();

      // Aggiorna intervallo di polling se il server ne invia uno diverso
      const serverIntervalSec = commandPayload?.pollIntervalSec;
      if (Number.isFinite(serverIntervalSec) && serverIntervalSec >= (POLL_MIN_MS / 1000)) {
        const newMs = Math.min(Math.round(serverIntervalSec) * 1000, POLL_MAX_MS);
        if (newMs !== currentPollIntervalMs) {
          currentPollIntervalMs = newMs;
          if (cloudVerboseLogs) {
            console.log(`[${cloudNow()}] [cloud-update] intervallo polling aggiornato -> ${currentPollIntervalMs / 1000}s`);
          }
        }
      }

      if (cloudVerboseLogs) {
        console.log(
          `[${cloudNow()}] [cloud-update] polling response: action=${commandPayload?.action || 'none'} reason=${
            commandPayload?.reason || '-'
          } targetVersion=${commandPayload?.targetVersion || '-'} cancelUpdateRequested=${
            Boolean(commandPayload?.cancelUpdateRequested)
          } pollInterval=${currentPollIntervalMs / 1000}s`
        );
      }

      if (cloudUpdateInProgress) {
        const cancelRequested = Boolean(commandPayload?.cancelUpdateRequested);
        const action = normalizeNonEmptyText(commandPayload?.action);
        const targetVersion = normalizeNonEmptyText(commandPayload?.targetVersion);
        if (cancelRequested || (action !== 'update' && !targetVersion)) {
          requestCloudUpdateCancellation(
            cancelRequested ? 'stop richiesto da dashboard' : 'target version rimossa durante update'
          );
        }
        return;
      }

      const renameCommand = commandPayload?.renameCommand;
      if (renameCommand?.action === 'renameCustomer') {
        await runCloudRenameCustomer(renameCommand, normalizeElevationCredentials(commandPayload?.elevation));
      }

      if (commandPayload?.credentialTest) {
        handleCredentialTest(commandPayload.credentialTest).catch(err =>
          console.warn(`[${cloudNow()}] [cloud-cred-test] errore non gestito: ${err.message}`)
        );
      }

      if (commandPayload?.action !== 'update') {
        return;
      }

      const targetVersion = normalizeNonEmptyText(commandPayload?.targetVersion);
      if (!targetVersion || targetVersion === getCurrentClientVersion()) {
        if (cloudVerboseLogs) {
          console.log(
            `[${cloudNow()}] [cloud-update] update non necessario: targetVersion=${targetVersion || '-'} currentVersion=${getCurrentClientVersion()}`
          );
        }
        return;
      }

      runCloudClientUpdate(commandPayload);
    } catch (err) {
      console.warn(`[${cloudNow()}] [cloud-update] errore polling comandi: ${err.message}`);
    }
  };

  const schedulePoll = async () => {
    await pollCommand();
    setTimeout(schedulePoll, currentPollIntervalMs);
  };

  console.log(
    `[${cloudNow()}] [cloud-update] polling comandi attivo -> ${cloudClientCommandUrl} (intervallo=${currentPollIntervalMs / 1000}s)`
  );
  schedulePoll();
}

function startCloudHeartbeat() {
  if (!cloudHeartbeatEnabled || !cloudHeartbeatUrl) {
    if (cloudVerboseLogs) {
      console.log(`[${cloudNow()}] [cloud-polling] polling heartbeat disabilitato da configurazione`);
    }
    return;
  }

  if (typeof fetch !== 'function') {
    console.warn(`[${cloudNow()}] [cloud-polling] fetch non disponibile: impossibile avviare polling cloud`);
    return;
  }

  const intervalMs =
    Number.isFinite(cloudHeartbeatIntervalMs) && cloudHeartbeatIntervalMs >= 10000
      ? cloudHeartbeatIntervalMs
      : 60000;

  const sendHeartbeat = async () => {
    const payload = {
      ...buildCloudIdentityPayload(),
      version: getCurrentClientVersion(),
      sentAt: new Date().toISOString(),
    };

    try {
      const response = await fetch(cloudHeartbeatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status} ${response.statusText} ${errorText}`);
      }
      if (cloudVerboseLogs) {
        console.log(
          `[${cloudNow()}] [cloud-polling] heartbeat inviato con successo -> cliente=${payload.customerName} version=${payload.version}`
        );
      }
    } catch (err) {
      console.warn(`[${cloudNow()}] [cloud-polling] errore invio heartbeat: ${err.message}`);
    }
  };

  sendHeartbeat();
  setInterval(sendHeartbeat, intervalMs);
  console.log(
    `[${cloudNow()}] [cloud-polling] attivo -> ${cloudHeartbeatUrl} (cliente=${cloudHeartbeatClientName}, clientId=${cloudHeartbeatClientId}, versione=${getCurrentClientVersion()}, intervallo=${intervalMs}ms)`
  );
}

function fixWLMetadati(jsondata) {
  //Fix WL - Se in una serie il windowcenter Ã¨ 1, la serie viene invertita. Fix portandolo a 2 (in attesa del fix decoder cornerstone)
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

function normalizePartizione(partizione) {
  if (!partizione) {
    return '';
  }
  let normalized = String(partizione).trim();
  if (normalized.includes('_frmwl')) {
    normalized = normalized.split('_frmwl')[0];
  }
  return normalized;
}

function getQueryValue(queryValue) {
  if (Array.isArray(queryValue)) {
    return queryValue[0];
  }
  return queryValue;
}

function isTruthyQueryValue(value) {
  if (value === true || value === 1) {
    return true;
  }
  if (value === false || value === 0 || value === null || value === undefined) {
    return false;
  }
  const normalized = String(value).trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'si';
}

function shouldAttemptRemoteFallback(req, rawPartizione = '') {
  const query = req?.query || {};

  const explicitEnable = [
    query.storicoRemoto,
    query.remote,
    query.useRemote,
    query.allowRemoteFallback,
    query.forzaRemoto,
  ].some(isTruthyQueryValue);
  if (explicitEnable) {
    return true;
  }

  const explicitDisable = [
    query.localOnly,
    query.disableRemote,
    query.noRemote,
  ].some(isTruthyQueryValue);
  if (explicitDisable) {
    return false;
  }

  const rawAetitle = String(getQueryValue(query.aetitle) || '').trim().toLowerCase();
  const rawPartizioneValue = String(getQueryValue(rawPartizione) || '').trim().toLowerCase();
  const marker = `${rawAetitle}|${rawPartizioneValue}`;

  // Le richieste "_frmwl" provengono dai flussi dove storicamente era previsto il fallback remoto.
  return marker.includes('_frmwl');
}

function resolvePartizioneFromRequest(req) {
  const fromHeader =
    normalizePartizione(req.headers['x-nolex-aetitle']) ||
    normalizePartizione(req.headers['x-aetitle']);
  if (fromHeader) {
    return fromHeader;
  }

  const referer = req.headers.referer || req.headers.referrer;
  if (!referer) {
    return '';
  }

  try {
    const refererUrl = new URL(referer);
    return (
      normalizePartizione(refererUrl.searchParams.get('partizione')) ||
      normalizePartizione(refererUrl.searchParams.get('aetitle'))
    );
  } catch (err) {
    console.warn('Impossibile leggere la partizione dal referer', referer);
    return '';
  }
}

function normalizeRemoteEndpoint(dato, fallbackCliente = '') {
  if (!dato || typeof dato !== 'object' || Array.isArray(dato)) {
    return null;
  }

  const cliente = (dato.cliente || fallbackCliente || '').toString().trim();
  const ipRemoto = (dato.ipRemoto || dato.ip || dato.host || dato.server || '')
    .toString()
    .trim();
  const nomePartizioneRemota = (
    dato.nomePartizioneRemota ||
    dato.partizioneRemota ||
    dato.partizione_remota ||
    dato.remoteAetitle ||
    dato.partizione ||
    cliente
  )
    .toString()
    .trim();

  if (!cliente || !ipRemoto || !nomePartizioneRemota) {
    return null;
  }

  return {
    cliente,
    ipRemoto,
    nomePartizioneRemota,
  };
}

function parseRemoteEndpointsKeyValue(rawConfig) {
  const blocks = rawConfig
    .replace(/\r/g, '')
    .split(/\n\s*\n/)
    .map(block => block.split('\n').map(line => line.trim()))
    .filter(lines => lines.some(Boolean));

  const endpoints = [];

  blocks.forEach(lines => {
    const parsedBlock = {};
    lines.forEach(line => {
      if (!line || line.startsWith('#') || line.startsWith('//') || line.startsWith(';')) {
        return;
      }
      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) {
        return;
      }
      const key = line
        .slice(0, separatorIndex)
        .trim()
        .toLowerCase();
      const value = line
        .slice(separatorIndex + 1)
        .trim()
        .replace(/^"(.*)"$/, '$1');
      parsedBlock[key] = value;
    });

    const normalized = normalizeRemoteEndpoint(
      {
        cliente:
          parsedBlock.cliente ||
          parsedBlock.partizione ||
          parsedBlock.aetitle ||
          parsedBlock.nomepartizione,
        ipRemoto:
          parsedBlock.ipremoto ||
          parsedBlock.ip ||
          parsedBlock.host ||
          parsedBlock.server ||
          parsedBlock.endpoint,
        nomePartizioneRemota:
          parsedBlock.nomepartizioneremota ||
          parsedBlock.partizioneremota ||
          parsedBlock.partizione_remota ||
          parsedBlock.remoteaetitle ||
          parsedBlock.partizioneremota,
      },
      ''
    );

    if (normalized) {
      endpoints.push(normalized);
    }
  });

  return endpoints;
}

function loadRemoteEndpointsConfig() {
  const fileCandidates = [
    process.env.ENDPOINT_REMOTI_PATH,
    process.env.REMOTE_ENDPOINTS_PATH,
    path.join(process.cwd(), 'endpointremoti.json'),
    path.join(__dirname, 'endpointremoti.json'),
  ].filter(Boolean);

  const filePath = fileCandidates.find(candidate => fs.existsSync(candidate));

  if (!filePath) {
    console.error('Storico remoto non configurato: endpointremoti.json non trovato');
    return null;
  }

  let sourcePath = filePath;
  let rawConfig = fs.readFileSync(filePath, 'utf8');
  rawConfig = rawConfig.replace(/^\uFEFF/, '').trim();

  if (!rawConfig) {
    console.error(`Storico remoto non configurato: file vuoto (${sourcePath})`);
    return null;
  }

  // Alcune installazioni salvano nel file un path assoluto verso la config reale.
  const redirectPath = rawConfig.replace(/^"(.*)"$/, '$1').trim();
  const looksLikePath = /^[a-zA-Z]:\\/.test(redirectPath) || redirectPath.startsWith('\\\\');
  if (
    looksLikePath &&
    !redirectPath.startsWith('{') &&
    !redirectPath.startsWith('[') &&
    fs.existsSync(redirectPath)
  ) {
    sourcePath = redirectPath;
    rawConfig = fs.readFileSync(redirectPath, 'utf8').replace(/^\uFEFF/, '').trim();
  }

  let parsedConfig;
  try {
    parsedConfig = JSON.parse(rawConfig);
  } catch (err) {
    const keyValueEndpoints = parseRemoteEndpointsKeyValue(rawConfig);
    if (keyValueEndpoints.length > 0) {
      return {
        sourcePath,
        endpoints: keyValueEndpoints,
      };
    }
    console.error(
      `endpointremoti.json non valido (${sourcePath}): ${err.message}. Anteprima: ${rawConfig.slice(
        0,
        120
      )}`
    );
    return null;
  }

  let endpoints = [];

  if (Array.isArray(parsedConfig)) {
    endpoints = parsedConfig
      .map(item => normalizeRemoteEndpoint(item))
      .filter(Boolean);
  } else if (parsedConfig && typeof parsedConfig === 'object') {
    if (Array.isArray(parsedConfig.endpoints)) {
      endpoints = parsedConfig.endpoints
        .map(item => normalizeRemoteEndpoint(item))
        .filter(Boolean);
    } else {
      endpoints = Object.entries(parsedConfig)
        .map(([cliente, config]) => normalizeRemoteEndpoint(config, cliente))
        .filter(Boolean);
    }
  }

  if (endpoints.length === 0) {
    console.error(`endpointremoti.json senza endpoint validi (${sourcePath})`);
    return null;
  }

  return {
    sourcePath,
    endpoints,
  };
}

function getApiServerRemotoCliente(_apiUrl, partizione) {
  let apiUrl = _apiUrl;
  const remoteConfig = loadRemoteEndpointsConfig();
  if (!remoteConfig || !Array.isArray(remoteConfig.endpoints)) {
    return null;
  }

  const partizioneNorm = (partizione || '').toString().trim().toUpperCase();
  const endpoint = remoteConfig.endpoints.find(
    item => item?.cliente?.toString().trim().toUpperCase() === partizioneNorm
  );

  if (!endpoint?.ipRemoto || !endpoint?.nomePartizioneRemota) {
    console.error(
      `Impossibile ottenere metadati remoti per partizione '${partizione}' da ${remoteConfig.sourcePath}`
    );
    return null;
  }

  apiUrl = apiUrl.replace('127.0.0.1', endpoint.ipRemoto);
  apiUrl = apiUrl.replace(partizione, endpoint.nomePartizioneRemota);
  return apiUrl;
}

// Avvia il server (HTTPS)
// httpsServer.listen(port, () => {
//   console.log(`Server HTTPS in ascolto sulla porta ${port}`);
// });
