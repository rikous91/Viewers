// TODO: torn, can either bake this here; or have to create a whole new button type
// Only ways that you can pass in a custom React component for render :l
import { ToolbarService, ViewportGridService } from '@ohif/core';
import type { Button, RunCommand } from '@ohif/core/types';

const { createButton } = ToolbarService;

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
  {
    id: 'MeasurementTools',
    uiType: 'ohif.splitButton',
    props: {
      groupId: 'MeasurementTools',
      // group evaluate to determine which item should move to the top
      evaluate: 'evaluate.group.promoteToPrimaryIfCornerstoneToolNotActiveInTheList',
      primary: createButton({
        id: 'Length',
        icon: 'tool-length',
        label: 'Lunghezza',
        tooltip: 'Length Tool',
        commands: setToolActiveToolbar,
        evaluate: 'evaluate.cornerstoneTool',
      }),
      secondary: {
        icon: 'chevron-down',
        tooltip: 'Altri strumenti di misurazione',
      },
      items: [
        createButton({
          id: 'Length',
          icon: 'tool-length',
          label: 'Lunghezza',
          tooltip: 'Length Tool',
          commands: setToolActiveToolbar,
          evaluate: 'evaluate.cornerstoneTool',
        }),
        createButton({
          id: 'Bidirectional',
          icon: 'tool-bidirectional',
          label: 'Bidirezionale',
          tooltip: 'Bidirectional Tool',
          commands: setToolActiveToolbar,
          evaluate: 'evaluate.cornerstoneTool',
        }),
        createButton({
          id: 'ArrowAnnotate',
          icon: 'tool-annotate',
          label: 'Annotazione',
          tooltip: 'Arrow Annotate',
          commands: setToolActiveToolbar,
          evaluate: 'evaluate.cornerstoneTool',
        }),
        createButton({
          id: 'Angle',
          icon: 'tool-angle',
          label: 'Angolo',
          tooltip: 'Angle',
          commands: setToolActiveToolbar,
          evaluate: 'evaluate.cornerstoneTool',
        }),
        createButton({
          id: 'CobbAngle',
          icon: 'icon-tool-cobb-angle',
          label: 'Angolo di Cobb',
          tooltip: 'Cobb Angle',
          commands: setToolActiveToolbar,
          evaluate: 'evaluate.cornerstoneTool',
        }),
        createButton({
          id: 'UltrasoundDirectionalTool',
          icon: 'icon-tool-ultrasound-bidirectional',
          label: 'Ultrasuono direzionale',
          tooltip: 'Ultrasound Directional',
          commands: setToolActiveToolbar,
          evaluate: ['evaluate.cornerstoneTool', 'evaluate.isUS'],
        }),
        createButton({
          id: 'EllipticalROI',
          icon: 'tool-ellipse',
          label: 'Ellisse',
          tooltip: 'Ellipse ROI',
          commands: setToolActiveToolbar,
          evaluate: 'evaluate.cornerstoneTool',
        }),
        createButton({
          id: 'RectangleROI',
          icon: 'tool-rectangle',
          label: 'Rettangolo',
          tooltip: 'Rectangle ROI',
          commands: setToolActiveToolbar,
          evaluate: 'evaluate.cornerstoneTool',
        }),
        createButton({
          id: 'CircleROI',
          icon: 'tool-circle',
          label: 'Cerchio',
          tooltip: 'Circle Tool',
          commands: setToolActiveToolbar,
          evaluate: 'evaluate.cornerstoneTool',
        }),
        createButton({
          id: 'PlanarFreehandROI',
          icon: 'icon-tool-freehand-roi',
          label: 'ROI mano libera',
          tooltip: 'Freehand ROI',
          commands: setToolActiveToolbar,
          evaluate: 'evaluate.cornerstoneTool',
        }),
        createButton({
          id: 'SplineROI',
          icon: 'icon-tool-spline-roi',
          label: 'ROI Spline',
          tooltip: 'Spline ROI',
          commands: setToolActiveToolbar,
          evaluate: 'evaluate.cornerstoneTool',
        }),
        createButton({
          id: 'LivewireContour',
          icon: 'icon-tool-livewire',
          label: 'Strumento Livewire',
          tooltip: 'Livewire tool',
          commands: setToolActiveToolbar,
          evaluate: 'evaluate.cornerstoneTool',
        }),
      ],
    },
  },
  {
    id: 'TransformTools',
    uiType: 'ohif.splitButton',
    props: {
      groupId: 'TransformTools',
      // group evaluate to determine which item should move to the top
      evaluate: 'evaluate.group.promoteToPrimaryIfCornerstoneToolNotActiveInTheList',
      primary: createButton({
        id: 'rotate-right',
        icon: 'tool-rotate-right',
        label: 'Ruota a destra',
        tooltip: 'Rotate +90',
        commands: 'rotateViewportCW',
        evaluate: 'evaluate.action',
      }),
      secondary: {
        icon: 'chevron-down',
        tooltip: 'Altri strumenti di trasformazione',
      },
      items: [
        createButton({
          id: 'rotate-right',
          icon: 'tool-rotate-right',
          label: 'Ruota a destra',
          tooltip: 'Rotate +90',
          commands: 'rotateViewportCW',
          evaluate: 'evaluate.action',
        }),
        createButton({
          id: 'rotate-left',
          icon: 'tool-rotate-right',
          label: 'Ruota a sinistra',
          tooltip: 'Rotate -90',
          commands: 'rotateViewportCCW',
          evaluate: 'evaluate.action',
        }),
        createButton({
          id: 'flipHorizontal',
          icon: 'tool-flip-horizontal',
          label: 'Rifletti orizzontalmente',
          tooltip: 'Rifletti orizzontalmente',
          commands: 'flipViewportHorizontal',
          evaluate: ['evaluate.viewportProperties.toggle', 'evaluate.not3D'],
        }),
        createButton({
          id: 'flipVertical',
          icon: 'tool-flip-horizontal',
          label: 'Rifletti verticalmente',
          tooltip: 'Rifletti verticalmente',
          commands: 'flipViewportVertical',
          evaluate: ['evaluate.viewportProperties.toggle', 'evaluate.not3D'],
        }),
      ],
    },
  },
  {
    id: 'ZoomTools',
    uiType: 'ohif.splitButton',
    props: {
      groupId: 'ZoomTools',
      // group evaluate to determine which item should move to the top
      evaluate: 'evaluate.group.promoteToPrimaryIfCornerstoneToolNotActiveInTheList',
      primary: createButton({
        id: 'Zoom',
        icon: 'tool-zoom',
        label: 'Zoom',
        tooltip: 'Zoom',
        commands: setToolActiveToolbar,
        evaluate: 'evaluate.cornerstoneTool',
      }),
      secondary: {
        icon: 'chevron-down',
        tooltip: 'Altri strumenti zoom',
      },
      items: [
        createButton({
          id: 'Zoom',
          icon: 'tool-zoom',
          label: 'Zoom',
          tooltip: 'Zoom',
          commands: setToolActiveToolbar,
          evaluate: 'evaluate.cornerstoneTool',
        }),
        createButton({
          id: 'fitViewportToWindow',
          icon: 'tool-zoom',
          label: 'Riadatta alla viewport',
          tooltip: 'Riadatta alla viewport',
          commands: 'fitViewportToWindow',
          evaluate: 'evaluate.action',
        }),
      ],
    },
  },
  {
    id: 'Zoom',
    uiType: 'ohif.radioGroup',
    props: {
      icon: 'tool-zoom',
      label: 'Zoom',
      commands: setToolActiveToolbar,
      evaluate: 'evaluate.cornerstoneTool',
    },
  },
  // Window Level
  {
    id: 'WindowLevel',
    uiType: 'ohif.radioGroup',
    props: {
      icon: 'tool-window-level',
      label: 'Window Level',
      commands: setToolActiveToolbar,
      evaluate: 'evaluate.cornerstoneTool',
    },
  },
  // Pan...
  {
    id: 'Pan',
    uiType: 'ohif.radioGroup',
    props: {
      type: 'tool',
      icon: 'tool-move',
      label: 'Sposta',
      commands: setToolActiveToolbar,
      evaluate: 'evaluate.cornerstoneTool',
    },
  },
  //Inversione
  {
    id: 'invert',
    uiType: 'ohif.radioGroup',
    props: {
      type: 'tool',
      icon: 'tool-invert',
      label: 'Inverti colori',
      commands: 'invertViewport',
      evaluate: 'evaluate.viewportProperties.toggle',
    },
  },
  //Sonda
  {
    id: 'Probe',
    uiType: 'ohif.radioGroup',
    props: {
      type: 'tool',
      icon: 'tool-probe',
      label: 'Sonda',
      commands: setToolActiveToolbar,
      evaluate: 'evaluate.cornerstoneTool',
    },
  },
  //Cine
  {
    id: 'Cine',
    uiType: 'ohif.radioGroup',
    props: {
      type: 'tool',
      icon: 'tool-cine',
      label: 'Cine',
      commands: 'toggleCine',
      evaluate: ['evaluate.cine', 'evaluate.not3D'],
    },
  },
  //Magnify
  {
    id: 'Magnify',
    uiType: 'ohif.radioGroup',
    props: {
      type: 'tool',
      icon: 'tool-magnify',
      label: "Lente d'ingrandimento",
      commands: setToolActiveToolbar,
      evaluate: 'evaluate.cornerstoneTool',
    },
  },
  //Linee riferimento
  {
    id: 'ReferenceLines',
    uiType: 'ohif.radioGroup',
    props: {
      type: 'tool',
      icon: 'tool-referenceLines',
      label: 'Linee di riferimento',
      commands: 'toggleEnabledDisabledToolbar',
      listeners: {
        [ViewportGridService.EVENTS.ACTIVE_VIEWPORT_ID_CHANGED]: ReferenceLinesListeners,
        [ViewportGridService.EVENTS.VIEWPORTS_READY]: ReferenceLinesListeners,
      },
      evaluate: 'evaluate.cornerstoneTool.toggle',
    },
  },
  //Scorrimento con mouse
  {
    id: 'StackScroll',
    uiType: 'ohif.radioGroup',
    props: {
      type: 'tool',
      icon: 'tool-stack-scroll',
      label: 'Scorrimento con mouse',
      commands: setToolActiveToolbar,
      evaluate: 'evaluate.cornerstoneTool',
    },
  },
  {
    id: 'TrackballRotate',
    uiType: 'ohif.radioGroup',
    props: {
      type: 'tool',
      icon: 'tool-3d-rotate',
      label: 'Rotazione 3D',
      commands: setToolActiveToolbar,
      evaluate: {
        name: 'evaluate.cornerstoneTool',
        disabledText: 'Select a 3D viewport to enable this tool',
      },
    },
  },
  {
    id: 'Capture',
    uiType: 'ohif.radioGroup',
    props: {
      icon: 'tool-capture',
      label: 'Cattura',
      commands: 'showDownloadViewportModal',
      evaluate: 'evaluate.action',
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
    uiType: 'ohif.radioGroup',
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
