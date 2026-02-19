import type { Button } from '@ohif/core/types';

import { EVENTS } from '@cornerstonejs/core';
import { ViewportGridService } from '@ohif/core';


export const setToolActiveToolbar = {
  commandName: 'setToolActiveToolbar',
  commandOptions: {
    toolGroupIds: ['default', 'mpr', 'SRToolGroup', 'volume3d'],
  },
};

const ReferenceLinesListeners: RunCommand = [
  {
    commandName: 'setSourceViewportForReferenceLinesTool',
    context: 'CORNERSTONE',
  },
];

const toolbarButtons: Button[] = [
  // sections
  {
    id: 'MeasurementTools',
    uiType: 'ohif.toolButtonList',
    props: {
      buttonSection: 'measurementSection',
      groupId: 'MeasurementTools',
    },
  },
  {
    id: 'TransformTools',
    uiType: 'ohif.toolButtonList',
    props: {
      buttonSection: 'TransformTools',
      groupId: 'TransformTools',
    },
  },
  {
    id: 'MoreTools',
    uiType: 'ohif.toolButtonList',
    props: {
      buttonSection: 'moreToolsSection',
      groupId: 'MoreTools',
    },
  },
  // tool defs
  {
    id: 'Reset',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'tool-reset',
      label: 'Reset',
      tooltip: 'Reset',
      commands: 'resetViewport',
      evaluate: 'evaluate.action',
    },
  },
  {
    id: 'rotate-right',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'tool-rotate-right',
      label: 'Ruota a destra',
      tooltip: 'Ruota a destra',
      commands: 'rotateViewportCW',
      evaluate: [
        'evaluate.action',
        {
          name: 'evaluate.viewport.supported',
          unsupportedViewportTypes: ['video'],
        },
      ],
    },
  },
  {
    id: 'rotate-left',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'tool-rotate-left',
      label: 'Ruota a sinistra',
      tooltip: 'Ruota a sinistra',
      commands: 'rotateViewportCCW',
      evaluate: [
        'evaluate.action',
        {
          name: 'evaluate.viewport.supported',
          unsupportedViewportTypes: ['video'],
        },
      ],
    },
  },
  {
    id: 'flipHorizontal',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'tool-flip-horizontal',
      label: 'Rifletti orizzontalmente',
      tooltip: 'Rifletti orizzontalmente',
      commands: 'flipViewportHorizontal',
      evaluate: [
        'evaluate.viewportProperties.toggle',
        {
          name: 'evaluate.viewport.supported',
          unsupportedViewportTypes: ['video', 'volume3d'],
        },
      ],
    },
  },
  {
    id: 'flipVertical',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'tool-flip-vertical',
      label: 'Rifletti verticalmente',
      tooltip: 'Rifletti verticalmente',
      commands: 'flipViewportVertical',
      evaluate: [
        'evaluate.viewportProperties.toggle',
        {
          name: 'evaluate.viewport.supported',
          unsupportedViewportTypes: ['video', 'volume3d'],
        },
      ],
    },
  },
  {
    id: 'ImageSliceSync',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'link',
      label: 'Collega immagini',
      tooltip: 'Collega immagini',
      commands: {
        commandName: 'toggleSynchronizer',
        commandOptions: {
          type: 'imageSlice',
        },
      },
      listeners: {
        [EVENTS.VIEWPORT_NEW_IMAGE_SET]: {
          commandName: 'toggleSynchronizer',
          commandOptions: {
            type: 'imageSlice',
            syncId: 'IMAGE_SLICE_SYNC',
            toggledState: true,
          },
        },
      },
      evaluate: [
        'evaluate.cornerstone.synchronizer',
        {
          name: 'evaluate.viewport.supported',
          unsupportedViewportTypes: ['video', 'volume3d'],
        },
      ],
    },
  },
  {
    id: 'ReferenceLines',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'tool-referenceLines',
      label: 'Linee di riferimento',
      tooltip: 'Mostra linee di riferimento',
      commands: 'toggleEnabledDisabledToolbar',
      listeners: {
        [ViewportGridService.EVENTS.ACTIVE_VIEWPORT_ID_CHANGED]: ReferenceLinesListeners,
        [ViewportGridService.EVENTS.VIEWPORTS_READY]: ReferenceLinesListeners,
      },
      evaluate: [
        'evaluate.cornerstoneTool.toggle',
        {
          name: 'evaluate.viewport.supported',
          unsupportedViewportTypes: ['video'],
        },
      ],
    },
  },
  {
    id: 'ReferenceCursors',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'tool-referenceCursors',
      label: 'Cursori di riferimento',
      tooltip: 'Mostra cursori di riferimento',
      commands: 'togglePassiveDisabledToolbar',
      evaluate: [
        'evaluate.cornerstoneTool.toggle.ifStrictlyDisabled',
        {
          name: 'evaluate.viewport.supported',
          unsupportedViewportTypes: ['video'],
        },
      ],
    },
  },

  {
    id: 'ScaleOverlay',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'tool-scale-overlay',
      label: 'Scala',
      tooltip: 'Mostra scala',
      commands: 'toggleEnabledDisabledToolbar',
      evaluate: [
        'evaluate.cornerstoneTool.toggle',
        {
          name: 'evaluate.viewport.supported',
          unsupportedViewportTypes: ['video', 'volume3d'],
        },
      ],
    },
  },
  {
    id: 'ImageOverlayViewer',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'toggle-dicom-overlay',
      label: 'Image Overlay',
      tooltip: 'Attiva o disattiva Image Overlay',
      commands: 'toggleEnabledDisabledToolbar',
      evaluate: [
        'evaluate.cornerstoneTool.toggle',
        {
          name: 'evaluate.viewport.supported',
          unsupportedViewportTypes: ['video'],
        },
      ],
    },
  },
  {
    id: 'StackScroll',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'toolStackScroll',
      label: 'Scorrimento con mouse',
      tooltip: 'Scorrimento con mouse',
      commands: setToolActiveToolbar,
      evaluate: 'evaluate.cornerstoneTool',
    },
  },
  {
    id: 'invert',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'tool-invert',
      label: 'Inverti',
      tooltip: 'Inverti Colori',
      commands: 'invertViewport',
      evaluate: [
        'evaluate.viewportProperties.toggle',
        {
          name: 'evaluate.viewport.supported',
          unsupportedViewportTypes: ['video'],
        },
      ],
    },
  },
  {
    id: 'Probe',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'tool-probe',
      label: 'Sonda',
      tooltip: 'Sonda',
      commands: setToolActiveToolbar,
      evaluate: 'evaluate.cornerstoneTool',
    },
  },
  {
    id: 'Cine',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'tool-cine',
      label: 'Cine',
      tooltip: 'Cine',
      commands: 'toggleCine',
      evaluate: [
        'evaluate.cine',
        {
          name: 'evaluate.viewport.supported',
          unsupportedViewportTypes: ['volume3d'],
        },
      ],
    },
  },
  {
    id: 'Angle',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'tool-angle',
      label: 'Angolo',
      tooltip: 'Angolo',
      commands: setToolActiveToolbar,
      evaluate: 'evaluate.cornerstoneTool',
    },
  },
  {
    id: 'CobbAngle',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'icon-tool-cobb-angle',
      label: 'Angolo di Cobb',
      tooltip: 'Angolo di Cobb',
      commands: setToolActiveToolbar,
      evaluate: 'evaluate.cornerstoneTool',
    },
  },
  {
    id: 'Magnify',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'tool-magnify',
      label: 'Lente d\'ingrandimento',
      tooltip: 'Lente d\'ingrandimento',
      commands: setToolActiveToolbar,
      evaluate: [
        'evaluate.cornerstoneTool',
        {
          name: 'evaluate.viewport.supported',
          unsupportedViewportTypes: ['video'],
        },
      ],
    },
  },
  {
    id: 'CalibrationLine',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'tool-calibration',
      label: 'Calibrazione',
      tooltip: 'Calibrazione',
      commands: setToolActiveToolbar,
      evaluate: [
        'evaluate.cornerstoneTool',
        {
          name: 'evaluate.viewport.supported',
          unsupportedViewportTypes: ['video'],
        },
      ],
    },
  },
  {
    id: 'TagBrowser',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'dicom-tag-browser',
      label: 'Dicom Tag Browser',
      tooltip: 'Dicom Tag Browser',
      commands: 'openDICOMTagViewer',
    },
  },
  {
    id: 'AdvancedMagnify',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'icon-tool-loupe',
      label: 'Sonda con lente d\ingrandimento',
      tooltip: 'Sonda con lente d\ingrandimento',
      commands: 'toggleActiveDisabledToolbar',
      evaluate: [
        'evaluate.cornerstoneTool.toggle.ifStrictlyDisabled',
        {
          name: 'evaluate.viewport.supported',
          unsupportedViewportTypes: ['video'],
        },
      ],
    },
  },
  {
    id: 'UltrasoundDirectionalTool',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'icon-tool-ultrasound-bidirectional',
      label: 'Ultrasuono direzionale',
      tooltip: 'Ultrasuono direzionale',
      commands: setToolActiveToolbar,
      evaluate: [
        'evaluate.cornerstoneTool',
        {
          name: 'evaluate.modality.supported',
          supportedModalities: ['US'],
        },
      ],
    },
  },
  {
    id: 'WindowLevelRegion',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'icon-tool-window-region',
      label: 'Window Level Region',
      tooltip: 'Window Level Region',
      commands: setToolActiveToolbar,
      evaluate: [
        'evaluate.cornerstoneTool',
        {
          name: 'evaluate.viewport.supported',
          unsupportedViewportTypes: ['video'],
        },
      ],
    },
  },
  {
    id: 'Length',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'tool-length',
      label: 'Lunghezza',
      tooltip: 'Lunghezza',
      commands: setToolActiveToolbar,
      evaluate: 'evaluate.cornerstoneTool',
    },
  },
  {
    id: 'Bidirectional',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'tool-bidirectional',
      label: 'Bidirezionale',
      tooltip: 'Bidirezionale',
      commands: setToolActiveToolbar,
      evaluate: 'evaluate.cornerstoneTool',
    },
  },
  {
    id: 'ArrowAnnotate',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'tool-annotate',
      label: 'Annotazione',
      tooltip: 'Annotazione',
      commands: setToolActiveToolbar,
      evaluate: 'evaluate.cornerstoneTool',
    },
  },
  {
    id: 'EllipticalROI',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'tool-ellipse',
      label: 'Ellisse',
      tooltip: 'Ellisse',
      commands: setToolActiveToolbar,
      evaluate: 'evaluate.cornerstoneTool',
    },
  },
  {
    id: 'RectangleROI',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'tool-rectangle',
      label: 'Rettangolo',
      tooltip: 'Rettangolo',
      commands: setToolActiveToolbar,
      evaluate: 'evaluate.cornerstoneTool',
    },
  },
  {
    id: 'CircleROI',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'tool-circle',
      label: 'Cerchio',
      tooltip: 'Cerchio',
      commands: setToolActiveToolbar,
      evaluate: 'evaluate.cornerstoneTool',
    },
  },
  {
    id: 'PlanarFreehandROI',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'icon-tool-freehand-roi',
      label: 'ROI Mano libera',
      tooltip: 'ROI Mano libera',
      commands: setToolActiveToolbar,
      evaluate: 'evaluate.cornerstoneTool',
    },
  },
  {
    id: 'SplineROI',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'icon-tool-spline-roi',
      label: 'ROI Spline',
      tooltip: 'ROI Spline',
      commands: setToolActiveToolbar,
      evaluate: 'evaluate.cornerstoneTool',
    },
  },
  {
    id: 'LivewireContour',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'icon-tool-livewire',
      label: 'Strumento Livewire',
      tooltip: 'Strumento Livewire',
      commands: setToolActiveToolbar,
      evaluate: 'evaluate.cornerstoneTool',
    },
  },
  // Window Level
  {
    id: 'WindowLevel',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'tool-window-level',
      label: 'Window Level',
      commands: setToolActiveToolbar,
      evaluate: [
        'evaluate.cornerstoneTool',
        {
          name: 'evaluate.viewport.supported',
          unsupportedViewportTypes: ['wholeSlide'],
        },
      ],
    },
  },
  {
    id: 'Pan',
    uiType: 'ohif.toolButton',
    props: {
      type: 'tool',
      icon: 'tool-move',
      label: 'Sposta',
      commands: setToolActiveToolbar,
      evaluate: 'evaluate.cornerstoneTool',
    },
  },
  {
    id: 'ZoomOneToOne',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'tool-reset',
      label: '1:1',
      tooltip: 'Zoom 1:1',
      commands: 'zoomOneToOne',
      evaluate: 'evaluate.action',
    },
  },
  {
    id: 'Zoom',
    uiType: 'ohif.toolButton',
    props: {
      type: 'tool',
      icon: 'tool-zoom',
      label: 'Zoom',
      commands: setToolActiveToolbar,
      evaluate: 'evaluate.cornerstoneTool',
    },
  },
  {
    id: 'TrackballRotate',
    uiType: 'ohif.toolButton',
    props: {
      type: 'tool',
      icon: 'tool-3d-rotate',
      label: 'Rotazione 3D',
      commands: setToolActiveToolbar,
      evaluate: {
        name: 'evaluate.cornerstoneTool',
        disabledText: 'Seleziona una viewport 3D per abilitare questo strumento.',
      },
    },
  },
  {
    id: 'Reset3DRotate',
    uiType: 'ohif.radioGroup',
    props: {
      icon: 'tool-capture',
      label: 'Reset 3D Rotate',
      commands: 'Reset3DRotate',
      evaluate: 'evaluate.action',
    },
  },
  {
    id: 'Capture',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'tool-capture',
      label: 'Cattura',
      commands: 'showDownloadViewportModal',
      evaluate: [
        'evaluate.action',
        {
          name: 'evaluate.viewport.supported',
          unsupportedViewportTypes: ['video', 'wholeSlide'],
        },
      ],
    },
  },
  {
    id: 'Layout',
    uiType: 'ohif.layoutSelector',
    props: {
      rows: 3,
      columns: 4,
      commands: 'showDownloadViewportModal',
      evaluate: 'evaluate.action',
    },
  },
  {
    id: 'LayoutMPR',
    uiType: 'ohif.radioGroup',
    props: {
      icon: 'mprDirect',
      label: 'MPR',
      commands: 'mprDirectClick',
      evaluate: {
        name: 'evaluate.displaySetIsReconstructable',
        disabledText: 'Seleziona una serie ricostrubile in MPR per abilitare questo strumento.',
      },
    },
  },
  {
    id: 'LayoutMPRStorico',
    uiType: 'ohif.radioGroup',
    props: {
      icon: 'mprDirect',
      label: 'MPR Studio secondario',
      commands: 'mprDirectClickForStorico',
    },
  },
  {
    id: 'Reset',
    uiType: 'ohif.radioGroup',
    props: {
      icon: 'tool-reset',
      label: 'Reimposta vista',
      commands: 'resetViewport',
      evaluate: 'evaluate.action',
    },
  },

  {
    id: 'storeState',
    uiType: 'ohif.radioGroup',
    props: {
      icon: 'mprDirect',
      label: 'storeState',
      commands: 'storeState',
      evaluate: 'evaluate.action',
    },
  },
  {
    id: 'restoreState',
    uiType: 'ohif.radioGroup',
    props: {
      icon: 'mprDirect',
      label: 'restoreState',
      commands: 'restoreState',
      evaluate: 'evaluate.action',
    },
  },
  {
    id: 'setHPPreferiti',
    uiType: 'ohif.radioGroup',
    props: {
      icon: 'setHPPreferiti',
      label: 'setHPPreferiti',
      commands: 'setHPPreferiti',
      evaluate: 'evaluate.action',
    },
  },
  {
    id: 'gestioneHP',
    uiType: 'ohif.radioGroup',
    props: {
      icon: 'hpIcon',
      label: 'Hanging Protocol',
      commands: 'gestioneHP',
      evaluate: 'evaluate.action',
    },
  },
  {
    id: 'hideInfoDicom',
    uiType: 'ohif.radioGroup',
    props: {
      icon: 'hideInfoDicom',
      type: 'toggle',
      label: 'Nascondi info nelle viewport',
      commands: 'hideInfoDicom',
      evaluate: 'evaluate.action',
    },
  },
  {
    id: 'setCamera',
    uiType: 'ohif.radioGroup',
    props: {
      icon: 'hpIcon',
      label: 'Set Camera',
      commands: 'setCamera',
      evaluate: 'evaluate.action',
    },
  },
  {
    id: 'jumpIndex',
    uiType: 'ohif.radioGroup',
    props: {
      icon: 'mprDirect',
      label: 'jumpToImage',
      commands: {
        commandName: 'jumpToImage',
        commandOptions: {
          imageIndex: ['2'],
        },
      },
      evaluate: 'evaluate.action',
    },
  },
  {
    id: 'Crosshairs',
    uiType: 'ohif.toolButton',
    props: {
      type: 'tool',
      icon: 'tool-crosshair',
      label: 'Crosshair',
      commands: {
        commandName: 'setToolActiveToolbar',
        commandOptions: {
          toolGroupIds: ['mpr'],
        },
      },
      evaluate: {
        name: 'evaluate.cornerstoneTool',
        disabledText: 'Seleziona una viewport MPR per abilitare questo strumento.',
      },
    },
  },



];

export default toolbarButtons;
