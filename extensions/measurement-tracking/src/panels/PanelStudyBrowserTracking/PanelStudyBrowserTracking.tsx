import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { useSystem, utils } from '@ohif/core';
import { useImageViewer, Dialog, ButtonEnums } from '@ohif/ui';
import { useViewportGrid } from '@ohif/ui-next';
import { StudyBrowser } from '@ohif/ui-next';

import { useTrackedMeasurements } from '../../getContextModule';
import { Separator } from '@ohif/ui-next';
import { PanelStudyBrowserHeader, MoreDropdownMenu } from '@ohif/extension-default';
import { defaultActionIcons, defaultViewPresets } from './constants';
import axios from 'axios';

let primoAvvio = true
let storicoRemotoControllato = false
const cacheThumbnails = {}

const { formatDate, createStudyBrowserTabs } = utils;

const DIALOG_ID = {
  UNTRACK_SERIES: 'untrack-series',
  REJECT_REPORT: 'ds-reject-sr',
};

const thumbnailNoImageModalities = [
  'SR',
  'SEG',
  'SM',
  'RTSTRUCT',
  'RTPLAN',
  'RTDOSE',
  'DOC',
  'PMAP',
];

const shouldHideThumbnail = ds => {
  if (thumbnailNoImageModalities.includes(ds.Modality) || ds?.unsupported) {
    return true;
  }

  if (ds?.Modality === 'OT') {
    const frames = Number(ds?.numImageFrames ?? 0);
    const imagesCount = ds?.images?.length ?? 0;
    return frames === 0 && imagesCount === 0;
  }

  return false;
};

let erroreStudiRemoti = false;
const mostraPrimoStudioStorico = true;

/**
 *
 * @param {*} param0
 */
export default function PanelStudyBrowserTracking({
  getImageSrc,
  getStudiesForPatientByMRN,
  requestDisplaySetCreationForStudy,
  dataSource,
}) {
  const { servicesManager, commandsManager } = useSystem();
  const {
    displaySetService,
    uiDialogService,
    hangingProtocolService,
    uiNotificationService,
    measurementService,
    studyPrefetcherService,
    customizationService,
    uiModalService,
  } = servicesManager.services;
  const navigate = useNavigate();
  const studyMode = customizationService.getCustomization('studyBrowser.studyMode');
  const { t } = useTranslation('Common');

  // Normally you nest the components so the tree isn't so deep, and the data
  // doesn't have to have such an intense shape. This works well enough for now.
  // Tabs --> Studies --> DisplaySets --> Thumbnails
  const { StudyInstanceUIDs } = useImageViewer();
  const [{ activeViewportId, viewports, isHangingProtocolLayout }, viewportGridService] =
    useViewportGrid();
  const [trackedMeasurements, sendTrackedMeasurementsEvent] = useTrackedMeasurements();

  const [activeTabName, setActiveTabName] = useState(studyMode);
  const [expandedStudyInstanceUIDs, setExpandedStudyInstanceUIDs] = useState([
    ...StudyInstanceUIDs,
  ]);
  const [studyDisplayList, setStudyDisplayList] = useState([]);
  const [hasLoadedViewports, setHasLoadedViewports] = useState(false);
  const [displaySets, setDisplaySets] = useState([]);
  const [displaySetsLoadingState, setDisplaySetsLoadingState] = useState({});
  const [thumbnailImageSrcMap, setThumbnailImageSrcMap] = useState({});
  const [jumpToDisplaySet, setJumpToDisplaySet] = useState(null);

  const [viewPresets, setViewPresets] = useState(
    customizationService.getCustomization('studyBrowser.viewPresets')
  );

  const [actionIcons, setActionIcons] = useState(defaultActionIcons);

  const updateActionIconValue = actionIcon => {
    actionIcon.value = !actionIcon.value;
    const newActionIcons = [...actionIcons];
    setActionIcons(newActionIcons);
  };

  const updateViewPresetValue = viewPreset => {
    if (!viewPreset) {
      return;
    }
    const newViewPresets = viewPresets.map(preset => {
      preset.selected = preset.id === viewPreset.id;
      return preset;
    });
    setViewPresets(newViewPresets);
  };


  const handleOnMobile = () => {

    if (window.matchMedia("(max-width: 768px)").matches) {
      updateViewPresetValue({
        id: "list",
        iconName: "ListView",
        selected: false,
      })
    }
    primoAvvio = false; // Imposta `primoAvvio` a false per evitare chiamate successive
  };

  //Al primo avvio verifico se sono su mobile, se lo sono al primo avvio setto la modalità visualizzazione serie in lista
  useEffect(() => {
    if (primoAvvio) {
      handleOnMobile(); // Verifica se chiudere il pannello
    }
  }, []);


  const onDoubleClickThumbnailHandler = displaySetInstanceUID => {
    let updatedViewports = [];
    const viewportId = activeViewportId;
    try {
      updatedViewports = hangingProtocolService.getViewportsRequireUpdate(
        viewportId,
        displaySetInstanceUID,
        isHangingProtocolLayout
      );
    } catch (error) {
      console.warn(error);
      uiNotificationService.show({
        title: 'Selezione serie',
        message:
          "Il display set selezionato non può essere aggiunto alla viewport a causa di un'incongruenza con le regole dell'Hanging Protocol",
        type: 'info',
        duration: 3000,
      });
    }

    viewportGridService.setDisplaySetsForViewports(updatedViewports);
  };

  const activeViewportDisplaySetInstanceUIDs =
    viewports.get(activeViewportId)?.displaySetInstanceUIDs;

  const { trackedSeries } = trackedMeasurements.context;

  const storicoRemoto = async qidoStudiesForPatient => {
    try {
      storicoRemotoControllato = true
      const qidoUrl = window.qidoUrlDefinitivo.replace('/qido/', '/qido-remoto/');
      const apiResponse = await axios.get(qidoUrl, {
        // Non è necessario impostare il method a 'GET', perché è il default di axios.get
        withCredentials: false, // Simile a credentials: 'omit'
      });

      // La risposta è già convertita in JSON
      const response = apiResponse.data;
      console.log('storico ', response);

      setTimeout(() => {
        for (const a of response) {
          // This is where the push happens after the delay
          qidoStudiesForPatient.push({
            studyInstanceUid: a['0020000D'].Value[0],
            date: a['00080020'].Value[0],
            time: a['00080030'].Value[0],
            accession: a['00080050'].Value[0],
            mrn: a['00100020'].Value[0],
            patientName: a['00100010'].Value[0],
            instances: a['00201208'].Value[0],
            description: a['00081030'].Value[0] + ' |Remoto|',
            modalities: a['00080061'].Value[0],
          });
        }

        // After the push, create a new array reference and update the state
        const updatedStudies = [...qidoStudiesForPatient];

        // Map and update the study display list with the new data
        const mappedStudies = _mapDataSourceStudies(updatedStudies);
        const actuallyMappedStudies = mappedStudies.map(qidoStudy => {
          return {
            studyInstanceUid: qidoStudy.StudyInstanceUID,
            date: formatDate(qidoStudy.StudyDate),
            description: qidoStudy.StudyDescription,
            modalities: qidoStudy.ModalitiesInStudy,
            numInstances: qidoStudy.NumInstances,
          };
        });

        setStudyDisplayList(prevArray => {
          const ret = [...prevArray];
          for (const study of actuallyMappedStudies) {
            if (!ret.find(it => it.studyInstanceUid === study.studyInstanceUid)) {
              ret.push(study);
            }
          }
          return ret;
        });
      }, 0); // Set timeout only for the push operation
    } catch (err) {
      erroreStudiRemoti = true;
      console.warn('Non è stato possibile recuperare lo storico remoto: ', err);
      return;
    }
  };

  useEffect(() => {
    setActiveTabName(studyMode);
  }, [studyMode]);

  // ~~ studyDisplayList
  useEffect(() => {
    // Fetch all studies for the patient in each primary study
    async function fetchStudiesForPatient(StudyInstanceUID) {
      // current study qido
      const qidoForStudyUID = await dataSource.query.studies.search({
        studyInstanceUid: StudyInstanceUID,
      });

      if (!qidoForStudyUID?.length) {
        navigate('/notfoundstudy', '_self');
        throw new Error('Invalid study URL');
      }

      let qidoStudiesForPatient = qidoForStudyUID;

      // try to fetch the prior studies based on the patientID if the
      // server can respond.
      try {
        qidoStudiesForPatient = await getStudiesForPatientByMRN(qidoForStudyUID);
      } catch (error) {
        console.warn(error);
      }

      const mappedStudies = _mapDataSourceStudies(qidoStudiesForPatient);
      const actuallyMappedStudies = mappedStudies.map(qidoStudy => {
        return {
          studyInstanceUid: qidoStudy.StudyInstanceUID,
          date: formatDate(qidoStudy.StudyDate) || t('NoStudyDate'),
          description: qidoStudy.StudyDescription,
          modalities: qidoStudy.ModalitiesInStudy,
          numInstances: qidoStudy.NumInstances,
        };
      });

      setStudyDisplayList(prevArray => {
        const ret = [...prevArray];
        for (const study of actuallyMappedStudies) {
          if (!prevArray.find(it => it.studyInstanceUid === study.studyInstanceUid)) {
            ret.push(study);
          }
        }
        return ret;
      });
      if (!storicoRemotoControllato && window.storicoRemoto) {
        await storicoRemoto(qidoStudiesForPatient);
      }
    }

    StudyInstanceUIDs.forEach(sid => fetchStudiesForPatient(sid));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [StudyInstanceUIDs, getStudiesForPatientByMRN]);

  // ~~ Initial Thumbnails
  useEffect(() => {
    if (!hasLoadedViewports) {
      if (activeViewportId) {
        // Once there is an active viewport id, it means the layout is ready
        // so wait a bit of time to allow the viewports preferential loading
        // which improves user experience of responsiveness significantly on slower
        // systems.
        const delayMs = 250 + displaySetService.getActiveDisplaySets().length * 10;
        window.setTimeout(() => setHasLoadedViewports(true), delayMs);
      }

      return;
    }


    let currentDisplaySets = displaySetService.activeDisplaySets;
    // filter non based on the list of modalities that are supported by cornerstone
    currentDisplaySets = currentDisplaySets.filter(ds => !shouldHideThumbnail(ds));

    if (!currentDisplaySets.length) {
      return;
    }

    currentDisplaySets.forEach(async dSet => {
      const newImageSrcEntry = {};
      const displaySet = displaySetService.getDisplaySetByUID(dSet.displaySetInstanceUID);
      const imageIds = dataSource.getImageIdsForDisplaySet(displaySet);

      const imageId = getImageIdForThumbnail(displaySet, imageIds);

      // TODO: Is it okay that imageIds are not returned here for SR displaySets?
      if (!imageId || displaySet?.unsupported) {
        return;
      }

      // When the image arrives, render it and store the result in the thumbnailImgSrcMap
      let { thumbnailSrc } = displaySet;
      if (!thumbnailSrc && displaySet.getThumbnailSrc) {
        thumbnailSrc = await displaySet.getThumbnailSrc();
      }
      if (!thumbnailSrc) {
        const thumbnailSrc = await getImageSrc(imageId);
        displaySet.thumbnailSrc = thumbnailSrc;
      }
      newImageSrcEntry[dSet.displaySetInstanceUID] = thumbnailSrc;

      setThumbnailImageSrcMap(prevState => {
        return { ...prevState, ...newImageSrcEntry };
      });
    });


  }, [displaySetService, dataSource, getImageSrc, activeViewportId, hasLoadedViewports]);


  // ~~ displaySets
  useEffect(() => {
    const currentDisplaySets = displaySetService.activeDisplaySets;

    if (!currentDisplaySets.length) {
      return;
    }

    const mappedDisplaySets = _mapDisplaySets(
      currentDisplaySets,
      displaySetsLoadingState,
      thumbnailImageSrcMap,
      trackedSeries,
      viewports,
      viewportGridService,
      dataSource,
      displaySetService,
      uiDialogService,
      uiNotificationService
    );

    setDisplaySets(mappedDisplaySets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    displaySetService.activeDisplaySets,
    displaySetsLoadingState,
    trackedSeries,
    viewports,
    dataSource,
    thumbnailImageSrcMap,
  ]);

  // -- displaySetsLoadingState
  useEffect(() => {
    const { unsubscribe } = studyPrefetcherService.subscribe(
      studyPrefetcherService.EVENTS.DISPLAYSET_LOAD_PROGRESS,
      updatedDisplaySetLoadingState => {
        const { displaySetInstanceUID, loadingProgress } = updatedDisplaySetLoadingState;

        setDisplaySetsLoadingState(prevState => ({
          ...prevState,
          [displaySetInstanceUID]: loadingProgress,
        }));
      }
    );

    return () => unsubscribe();
  }, [studyPrefetcherService]);

  // ~~ subscriptions --> displaySets
  useEffect(() => {
    // DISPLAY_SETS_ADDED returns an array of DisplaySets that were added
    const SubscriptionDisplaySetsAdded = displaySetService.subscribe(
      displaySetService.EVENTS.DISPLAY_SETS_ADDED,
      data => {
        if (!hasLoadedViewports) {
          return;
        }
        const { displaySetsAdded, options } = data;
        displaySetsAdded.forEach(async dSet => {
          const displaySetInstanceUID = dSet.displaySetInstanceUID;

          const newImageSrcEntry = {};
          const displaySet = displaySetService.getDisplaySetByUID(displaySetInstanceUID);
          if (displaySet?.unsupported) {
            return;
          }

          if (options.madeInClient) {
            setJumpToDisplaySet(displaySetInstanceUID);
          }

          const imageIds = dataSource.getImageIdsForDisplaySet(displaySet);
          const imageId = getImageIdForThumbnail(displaySet, imageIds);

          // TODO: Is it okay that imageIds are not returned here for SR displaysets?
          if (!imageId) {
            return;
          }

          // When the image arrives, render it and store the result in the thumbnailImgSrcMap
          newImageSrcEntry[displaySetInstanceUID] = await getImageSrc(imageId);
          setThumbnailImageSrcMap(prevState => {
            return { ...prevState, ...newImageSrcEntry };
          });
        });
      }
    );

    return () => {
      SubscriptionDisplaySetsAdded.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displaySetService, dataSource, getImageSrc, thumbnailImageSrcMap, trackedSeries, viewports]);

  useEffect(() => {
    // TODO: Will this always hold _all_ the displaySets we care about?
    // DISPLAY_SETS_CHANGED returns `DisplaySerService.activeDisplaySets`
    const SubscriptionDisplaySetsChanged = displaySetService.subscribe(
      displaySetService.EVENTS.DISPLAY_SETS_CHANGED,
      changedDisplaySets => {
        const mappedDisplaySets = _mapDisplaySets(
          changedDisplaySets,
          displaySetsLoadingState,
          thumbnailImageSrcMap,
          trackedSeries,
          viewports,
          viewportGridService,
          dataSource,
          displaySetService,
          uiDialogService,
          uiNotificationService
        );

        setDisplaySets(mappedDisplaySets);
      }
    );

    const SubscriptionDisplaySetMetaDataInvalidated = displaySetService.subscribe(
      displaySetService.EVENTS.DISPLAY_SET_SERIES_METADATA_INVALIDATED,
      () => {
        const mappedDisplaySets = _mapDisplaySets(
          displaySetService.getActiveDisplaySets(),
          displaySetsLoadingState,
          thumbnailImageSrcMap,
          trackedSeries,
          viewports,
          viewportGridService,
          dataSource,
          displaySetService,
          uiDialogService,
          uiNotificationService
        );

        setDisplaySets(mappedDisplaySets);
      }
    );

    return () => {
      SubscriptionDisplaySetsChanged.unsubscribe();
      SubscriptionDisplaySetMetaDataInvalidated.unsubscribe();
    };
  }, [
    displaySetsLoadingState,
    thumbnailImageSrcMap,
    trackedSeries,
    viewports,
    dataSource,
    displaySetService,
  ]);

  const tabs = createStudyBrowserTabs(StudyInstanceUIDs, studyDisplayList, displaySets);

  // TODO: Should not fire this on "close"
  function _handleStudyClick(StudyInstanceUID) {
    const shouldCollapseStudy = expandedStudyInstanceUIDs.includes(StudyInstanceUID);
    const updatedExpandedStudyInstanceUIDs = shouldCollapseStudy
      ? [...expandedStudyInstanceUIDs.filter(stdyUid => stdyUid !== StudyInstanceUID)]
      : [...expandedStudyInstanceUIDs, StudyInstanceUID];

    setExpandedStudyInstanceUIDs(updatedExpandedStudyInstanceUIDs);

    if (!shouldCollapseStudy) {
      const madeInClient = true;
      requestDisplaySetCreationForStudy(displaySetService, StudyInstanceUID, madeInClient);
    }
  }

  useEffect(() => {
    if (jumpToDisplaySet) {
      // Get element by displaySetInstanceUID
      const displaySetInstanceUID = jumpToDisplaySet;
      const element = document.getElementById(`thumbnail-${displaySetInstanceUID}`);

      if (element && typeof element.scrollIntoView === 'function') {
        // TODO: Any way to support IE here?
        element.scrollIntoView({ behavior: 'smooth' });

        setJumpToDisplaySet(null);
      }
    }
  }, [jumpToDisplaySet, expandedStudyInstanceUIDs, activeTabName]);

  useEffect(() => {
    if (!jumpToDisplaySet) {
      return;
    }

    const displaySetInstanceUID = jumpToDisplaySet;
    // Set the activeTabName and expand the study
    const thumbnailLocation = _findTabAndStudyOfDisplaySet(displaySetInstanceUID, tabs);
    if (!thumbnailLocation) {
      console.warn('jumpToThumbnail: displaySet thumbnail not found.');

      return;
    }
    const { tabName, StudyInstanceUID } = thumbnailLocation;
    setActiveTabName(tabName);
    const studyExpanded = expandedStudyInstanceUIDs.includes(StudyInstanceUID);
    if (!studyExpanded) {
      const updatedExpandedStudyInstanceUIDs = [...expandedStudyInstanceUIDs, StudyInstanceUID];
      setExpandedStudyInstanceUIDs(updatedExpandedStudyInstanceUIDs);
    }
  }, [expandedStudyInstanceUIDs, jumpToDisplaySet, tabs]);

  const onClickedtabName = clickedTabName => {
    try {
      // document.querySelector('[data-cy="FixReferenceLines"]').style.display = 'none'
      if (document.getElementById('storico-remoto')) {
        document.getElementById('storico-remoto').remove();
      }
      if (document.querySelector('.ohif-scrollbar .bg-black')) {
        document.querySelector('.ohif-scrollbar .bg-black').style.display = 'block';
      }

      //Mostro sempre il primo storico se clicco la relativa tab così da far vedere le anteprime

      // if (clickedTabName === 'all' && mostraPrimoStudioStorico) {
      //   setTimeout(() => {
      //     const storicoItems = document.querySelectorAll('.ohif-scrollbar button');
      //     if (storicoItems && storicoItems.length > 0) {
      //       storicoItems[0].click();
      //     }
      //   }, 0);
      //   mostraPrimoStudioStorico = false;
      // }

      if (clickedTabName === 'remoteAll') {
        document.querySelector('.ohif-scrollbar').insertAdjacentHTML(
          'afterbegin',
          `
      <div class="${erroreStudiRemoti ? 'error' : ''}" id="storico-remoto">
      <p>${erroreStudiRemoti
            ? 'Offline'
            : window.studiRemoti[0].description !== 'Nessuno storico remoto'
              ? 'Online'
              : 'Tutto lo storico è già online'
          }</p>
      </div>
      `
        );
        // if (studiRemoti[0].description === 'Nessuno storico remoto') {
        if (window.studiRemoti[0].description === 'Nessuno storico remoto') {
          // setTimeout(() => {
          //   if (document.querySelector('.ohif-scrollbar .bg-black')) {
          //     document.querySelector('.ohif-scrollbar .bg-black').style.display = 'none';
          //   } //Nascondo lo studio fake presente di default nello storico remoto
          //   if (document.querySelector('.ohif-scrollbar button')) {
          //     document.querySelector('.ohif-scrollbar button').style.display = 'none';
          //   } //Nascondo lo studio fake presente di default nello storico remoto
          // }, 0);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const onClickUntrack = displaySetInstanceUID => {
    const onConfirm = () => {
      const displaySet = displaySetService.getDisplaySetByUID(displaySetInstanceUID);
      sendTrackedMeasurementsEvent('UNTRACK_SERIES', {
        SeriesInstanceUID: displaySet.SeriesInstanceUID,
      });
      const measurements = measurementService.getMeasurements();
      measurements.forEach(m => {
        if (m.referenceSeriesUID === displaySet.SeriesInstanceUID) {
          measurementService.remove(m.uid);
        }
      });
    };

    uiModalService.show({
      title: 'Untrack Series',
      content: UntrackSeriesModal,
      contentProps: {
        onConfirm,
      },
    });
  };

  return (
    <>
      <>
        <PanelStudyBrowserHeader
          viewPresets={viewPresets}
          updateViewPresetValue={updateViewPresetValue}
          actionIcons={actionIcons}
          updateActionIconValue={updateActionIconValue}
        />
        <Separator
          orientation="horizontal"
          className="bg-black"
          thickness="2px"
        />
      </>

      <StudyBrowser
        tabs={tabs}
        servicesManager={servicesManager}
        activeTabName={activeTabName}
        expandedStudyInstanceUIDs={expandedStudyInstanceUIDs}
        onClickStudy={_handleStudyClick}
        onClickTab={clickedTabName => {
          onClickedtabName(clickedTabName);
          setActiveTabName(clickedTabName);
        }}
        onClickUntrack={displaySetInstanceUID => {
          onClickUntrack(displaySetInstanceUID);
        }}
        // onClickThumbnail={() => { }}
        onClickThumbnail={onDoubleClickThumbnailHandler}
        onDoubleClickThumbnail={onDoubleClickThumbnailHandler}
        activeDisplaySetInstanceUIDs={activeViewportDisplaySetInstanceUIDs}
        showSettings={actionIcons.find(icon => icon.id === 'settings').value}
        viewPresets={viewPresets}
      />
    </>
  );
}

PanelStudyBrowserTracking.propTypes = {
  dataSource: PropTypes.shape({
    getImageIdsForDisplaySet: PropTypes.func.isRequired,
  }).isRequired,
  getImageSrc: PropTypes.func.isRequired,
  getStudiesForPatientByMRN: PropTypes.func.isRequired,
  requestDisplaySetCreationForStudy: PropTypes.func.isRequired,
};

function getImageIdForThumbnail(displaySet: any, imageIds: any) {
  let imageId;
  if (displaySet.isDynamicVolume) {
    const timePoints = displaySet.dynamicVolumeInfo.timePoints;
    const middleIndex = Math.floor(timePoints.length / 2);
    const middleTimePointImageIds = timePoints[middleIndex];
    imageId = middleTimePointImageIds[Math.floor(middleTimePointImageIds.length / 2)];
  } else {
    imageId = imageIds[Math.floor(imageIds.length / 2)];
  }
  return imageId;
}

/**
 * Maps from the DataSource's format to a naturalized object
 *
 * @param {*} studies
 */
function _mapDataSourceStudies(studies) {
  return studies.map(study => {
    // TODO: Why does the data source return in this format?
    return {
      AccessionNumber: study.accession,
      StudyDate: study.date,
      StudyDescription: study.description,
      NumInstances: study.instances,
      ModalitiesInStudy: study.modalities,
      PatientID: study.mrn,
      PatientName: study.patientName,
      StudyInstanceUID: study.studyInstanceUid,
      StudyTime: study.time,
    };
  });
}

function _mapDisplaySets(
  displaySets,
  displaySetLoadingState,
  thumbnailImageSrcMap,
  trackedSeriesInstanceUIDs,
  viewports, // TODO: make array of `displaySetInstanceUIDs`?
  viewportGridService,
  dataSource,
  displaySetService,
  uiDialogService,
  uiNotificationService
) {
  const thumbnailDisplaySets = [];
  const thumbnailNoImageDisplaySets = [];
  displaySets
    .filter(ds => !ds.excludeFromThumbnailBrowser)
    .forEach(ds => {
      const { thumbnailSrc, displaySetInstanceUID } = ds; // thumbnailImageSrcMap[ds.displaySetInstanceUID];
      const componentType = _getComponentType(ds);

      const array =
        componentType === 'thumbnailTracked' ? thumbnailDisplaySets : thumbnailNoImageDisplaySets;

      const loadingProgress = displaySetLoadingState?.[displaySetInstanceUID];

      const thumbnailProps = {
        displaySetInstanceUID,
        description: ds.SeriesDescription,
        seriesNumber: ds.SeriesNumber,
        modality: ds.Modality,
        seriesDate: formatDate(ds.SeriesDate),
        numInstances: ds.numImageFrames,
        loadingProgress,
        countIcon: ds.countIcon,
        messages: ds.messages,
        StudyInstanceUID: ds.StudyInstanceUID,
        componentType,
        imageSrc: thumbnailSrc || thumbnailImageSrcMap[displaySetInstanceUID],
        dragData: {
          type: 'displayset',
          displaySetInstanceUID,
          // .. Any other data to pass
        },
        isTracked: trackedSeriesInstanceUIDs.includes(ds.SeriesInstanceUID),
        isHydratedForDerivedDisplaySet: ds.isHydrated,
      };

      array.push(thumbnailProps);
    });

  return [...thumbnailDisplaySets, ...thumbnailNoImageDisplaySets];
}

function _getComponentType(ds) {
  if (shouldHideThumbnail(ds)) {
    return 'thumbnailNoImage';
  }

  return 'thumbnailTracked';
}

/**
 *
 * @param {string[]} primaryStudyInstanceUIDs
 * @param {object[]} studyDisplayList
 * @param {string} studyDisplayList.studyInstanceUid
 * @param {string} studyDisplayList.date
 * @param {string} studyDisplayList.description
 * @param {string} studyDisplayList.modalities
 * @param {number} studyDisplayList.numInstances
 * @param {object[]} displaySets
 * @returns tabs - The prop object expected by the StudyBrowser component
 */
function _createStudyBrowserTabs(
  primaryStudyInstanceUIDs,
  studyDisplayList,
  displaySets,
  hangingProtocolService
) {
  const primaryStudies = [];
  const recentStudies = [];
  let allStudies = [];
  let studiRemoti = [];

  // Iterate over each study...
  studyDisplayList.forEach(study => {
    // Find it's display sets
    const displaySetsForStudy = displaySets.filter(
      ds => ds.StudyInstanceUID === study.studyInstanceUid
    );

    // Sort them
    const dsSortFn = hangingProtocolService.getDisplaySetSortFunction();
    displaySetsForStudy.sort(dsSortFn);

    /* Sort by series number, then by series date
      displaySetsForStudy.sort((a, b) => {
        if (a.seriesNumber !== b.seriesNumber) {
          return a.seriesNumber - b.seriesNumber;
        }

        const seriesDateA = Date.parse(a.seriesDate);
        const seriesDateB = Date.parse(b.seriesDate);

        return seriesDateA - seriesDateB;
      });
    */

    // Map the study to it's tab/view representation
    const tabStudy = Object.assign({}, study, {
      displaySets: displaySetsForStudy,
    });

    // Add the "tab study" to the 'primary', 'recent', and/or 'all' tab group(s)
    if (primaryStudyInstanceUIDs.includes(study.studyInstanceUid)) {
      primaryStudies.push(tabStudy);
      allStudies.push(tabStudy);
    } else {
      // TODO: Filter allStudies to dates within one year of current date
      recentStudies.push(tabStudy);
      allStudies.push(tabStudy);
    }
  });

  allStudies = allStudies.filter(study => {
    if (study.description.includes('|Remoto|')) {
      study.description = study.description.replace('|Remoto|', '');
      studiRemoti.push(study);
      return false; // Esclude l'elemento da allStudies
    }
    return true; // Mantiene l'elemento in allStudies
  });

  if (studiRemoti.length === 0) {
    studiRemoti = [
      {
        studyInstanceUid: '',
        date: '',
        description: 'Nessuno storico remoto',
        modalities: '',
        numInstances: 0,
        displaySets: [],
      },
    ];
  }
  window.studiRemoti = JSON.parse(JSON.stringify(studiRemoti));

  // Newest first
  const _byDate = (a, b) => {
    const dateA = Date.parse(a);
    const dateB = Date.parse(b);

    return dateB - dateA;
  };

  const tabs = [
    {
      name: 'primary',
      label: 'Studio attuale',
      studies: primaryStudies.sort((studyA, studyB) => _byDate(studyA.date, studyB.date)),
    },
    {
      name: 'recent',
      label: 'Storico locale',
      studies: recentStudies.sort((studyA, studyB) => _byDate(studyA.date, studyB.date)),
    },
    {
      name: 'remoteAll',
      label: 'Storico remoto',
      studies: allStudies.sort((studyA, studyB) => _byDate(studyA.date, studyB.date)),
    },
  ];

  return tabs;
}

function _findTabAndStudyOfDisplaySet(displaySetInstanceUID, tabs) {
  for (let t = 0; t < tabs.length; t++) {
    const { studies } = tabs[t];

    for (let s = 0; s < studies.length; s++) {
      const { displaySets } = studies[s];

      for (let d = 0; d < displaySets.length; d++) {
        const displaySet = displaySets[d];

        if (displaySet.displaySetInstanceUID === displaySetInstanceUID) {
          return {
            tabName: tabs[t].name,
            StudyInstanceUID: studies[s].studyInstanceUid,
          };
        }
      }
    }
  }
}
