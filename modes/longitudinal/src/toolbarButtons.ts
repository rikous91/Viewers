// TODO: torn, can either bake this here; or have to create a whole new button type
// Only ways that you can pass in a custom React component for render :l
import { ToolbarService } from '@ohif/core';
import type { Button } from '@ohif/core/types';

const { createButton } = ToolbarService;

export const setToolActiveToolbar = {
  commandName: 'setToolActiveToolbar',
  commandOptions: {
    toolGroupIds: ['default', 'mpr', 'SRToolGroup', 'volume3d'],
  },
};

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
        tooltip: 'More Measure Tools',
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
