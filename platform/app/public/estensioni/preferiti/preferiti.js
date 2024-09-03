/* eslint-disable default-case */
import saveHP from '../saveHP';
import CornerstoneViewportService from '../../../../../extensions/cornerstone/src/services/ViewportService/CornerstoneViewportService';
// import CornerstoneViewportService from './services/ViewportService/CornerstoneViewportService';
// import { init as cornerstoneInit } from '@cornerstonejs/core';

// // Inizializza Cornerstone
// cornerstoneInit();
// const ser = window.servicesManager;
// const cornerstone = new CornerstoneViewportService(ser);
// const viewportID = 'default';
// const viewportData = {
//   viewportType: 'stack',
//   data: [
//     {
//       StudyInstanceUID: '1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1',
//       displaySetInstanceUID: '2ba53860-3150-c832-db82-e9e21f2aff5e',
//       isCompositeStack: undefined,
//       imageIds: [
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.6/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095326.2/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095321.6/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095323.6/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.7/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095326.3/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095321.7/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095323.7/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.8/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095326.4/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095321.8/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095323.8/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.9/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095326.5/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095321.9/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095323.9/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.10/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095326.6/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095321.10/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095324.1/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.11/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095326.7/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095321.11/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095324.2/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.12/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095326.8/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095322.1/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095324.3/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095320.1/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095326.9/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095322.2/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095324.4/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095320.2/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095326.10/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095322.3/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095324.5/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095320.3/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095327.1/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095322.4/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095324.6/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095320.4/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095327.2/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095322.5/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095324.7/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095320.5/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095327.3/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095322.6/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095324.8/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095320.6/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095327.4/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095322.7/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095324.9/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095320.7/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095324.10/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095327.5/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095322.8/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095320.8/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095324.11/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095327.6/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095322.9/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095320.9/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095325.1/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095327.7/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095323.1/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095321.1/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095325.2/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095327.8/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095323.2/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095321.2/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095325.3/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095327.9/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095323.3/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095321.3/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095325.4/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095327.10/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095323.4/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095321.4/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095326.1/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095328.1/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095323.5/frames/1',
//         'wadors:https://d33do7qe4w26qo.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.25403.345050719074.3824.20170125095258.1/series/1.3.6.1.4.1.25403.345050719074.3824.20170125095319.5/instances/1.3.6.1.4.1.25403.345050719074.3824.20170125095321.5/frames/1',
//       ],
//       initialImageIndex: undefined,
//     },
//   ],
// };
// const publicViewportOptions = {
//   viewportType: 'stack',
//   viewportId: 'default',
//   toolGroupId: 'default',
//   initialImageOptions: undefined,
//   presentationIds: {
//     lutPresentationId: 'default&2ba53860-3150-c832-db82-e9e21f2aff5e&0',
//     positionPresentationId: 'acquisition&2ba53860-3150-c832-db82-e9e21f2aff5e&0',
//   },
// };
// const publicDisplaySetOptions = [
//   {
//     id: 'defaultDisplaySetId',
//     options: {},
//   },
// ];
// const presentations = {
//   positionPresentation: undefined,
//   lutPresentation: undefined,
// };

// setTimeout(() => {
//   cornerstone.setViewportData(
//     viewportID,
//     viewportData,
//     publicViewportOptions,
//     publicDisplaySetOptions,
//     presentations
//   );
// }, 10000);

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
        <p>Preferiti</p>
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
    document.getElementById('preferiti-tools').style.left = '80%';
    //Adatto la larghezza della griglia in base all'apertura del nuovo pannello
    setTimeout(() => {
      const widthPannelloSx = parseFloat(
        window.getComputedStyle(document.querySelector('.nolex-panel')).width
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
