import type { RunCommand } from '@ohif/core/types';
import { EVENTS } from '@cornerstonejs/core';
import { ToolbarService, ViewportGridService } from '@ohif/core';
import { setToolActiveToolbar } from './toolbarButtons';
const { createButton } = ToolbarService;

const ReferenceLinesListeners: RunCommand = [
  {
    commandName: 'setSourceViewportForReferenceLinesTool',
    context: 'CORNERSTONE',
  },
];

const moreTools = [
  {
    id: 'MoreTools',
    uiType: 'ohif.splitButton',
    props: {
      groupId: 'MoreTools',
      evaluate: 'evaluate.group.promoteToPrimaryIfCornerstoneToolNotActiveInTheList',
      primary: createButton({
        id: 'Reset',
        icon: 'tool-reset',
        tooltip: 'Reset View',
        label: 'Reset',
        commands: 'resetViewport',
        evaluate: 'evaluate.action',
      }),
      secondary: {
        icon: 'chevron-down',
        label: '',
        tooltip: 'More Tools',
      },
      items: [
        createButton({
          id: 'Reset',
          icon: 'tool-reset',
          label: 'Reset',
          tooltip: 'Reset View',
          commands: 'resetViewport',
          evaluate: 'evaluate.action',
        }),
        createButton({
          id: 'rotate-right',
          icon: 'tool-rotate-right',
          label: 'Ruota a destra',
          tooltip: 'Rotate +90',
          commands: 'rotateViewportCW',
          evaluate: 'evaluate.action',
        }),
        createButton({
          id: 'flipHorizontal',
          icon: 'tool-flip-horizontal',
          label: 'Inverti orizzontalmente',
          tooltip: 'Flip Horizontally',
          commands: 'flipViewportHorizontal',
          evaluate: ['evaluate.viewportProperties.toggle', 'evaluate.not3D'],
        }),
        createButton({
          id: 'ImageSliceSync',
          icon: 'link',
          label: 'Collega serie',
          tooltip: 'Enable position synchronization on stack viewports',
          commands: {
            commandName: 'toggleSynchronizer',
            commandOptions: {
              type: 'imageSlice',
            },
          },
          listeners: {
            [EVENTS.STACK_VIEWPORT_NEW_STACK]: {
              commandName: 'toggleImageSliceSync',
              commandOptions: { toggledState: true },
            },
          },
          evaluate: ['evaluate.cornerstone.synchronizer', 'evaluate.not3D'],
        }),
        createButton({
          id: 'ReferenceLines',
          icon: 'tool-referenceLines',
          label: 'Linee di riferimento',
          tooltip: 'Show Reference Lines',
          commands: 'toggleEnabledDisabledToolbar',
          listeners: {
            [ViewportGridService.EVENTS.ACTIVE_VIEWPORT_ID_CHANGED]: ReferenceLinesListeners,
            [ViewportGridService.EVENTS.VIEWPORTS_READY]: ReferenceLinesListeners,
          },
          evaluate: 'evaluate.cornerstoneTool.toggle',
        }),
        createButton({
          id: 'ImageOverlayViewer',
          icon: 'toggle-dicom-overlay',
          label: 'Image Overlay',
          tooltip: 'Toggle Image Overlay',
          commands: 'toggleEnabledDisabledToolbar',
          evaluate: 'evaluate.cornerstoneTool.toggle',
        }),
        createButton({
          id: 'StackScroll',
          icon: 'tool-stack-scroll',
          label: 'Scorrimento con mouse',
          tooltip: 'Stack Scroll',
          commands: setToolActiveToolbar,
          evaluate: 'evaluate.cornerstoneTool',
        }),
        createButton({
          id: 'invert',
          icon: 'tool-invert',
          label: 'Inverti',
          tooltip: 'Invert Colors',
          commands: 'invertViewport',
          evaluate: 'evaluate.viewportProperties.toggle',
        }),
        createButton({
          id: 'Probe',
          icon: 'tool-probe',
          label: 'Sonda',
          tooltip: 'Probe',
          commands: setToolActiveToolbar,
          evaluate: 'evaluate.cornerstoneTool',
        }),
        createButton({
          id: 'Cine',
          icon: 'tool-cine',
          label: 'Cine',
          tooltip: 'Cine',
          commands: 'toggleCine',
          evaluate: ['evaluate.cine', 'evaluate.not3D'],
        }),
        // createButton({
        //   id: 'Angle',
        //   icon: 'tool-angle',
        //   label: 'Angolo',
        //   tooltip: 'Angle',
        //   commands: setToolActiveToolbar,
        //   evaluate: 'evaluate.cornerstoneTool',
        // }),
        // createButton({
        //   id: 'CobbAngle',
        //   icon: 'icon-tool-cobb-angle',
        //   label: 'Angolo di Cobb',
        //   tooltip: 'Cobb Angle',
        //   commands: setToolActiveToolbar,
        //   evaluate: 'evaluate.cornerstoneTool',
        // }),
        createButton({
          id: 'Magnify',
          icon: 'tool-magnify',
          label: "Lente d'ingrandimento",
          tooltip: 'Zoom-in',
          commands: setToolActiveToolbar,
          evaluate: 'evaluate.cornerstoneTool',
        }),
        createButton({
          id: 'CalibrationLine',
          icon: 'tool-calibration',
          label: 'Calibrazione',
          tooltip: 'Calibration Line',
          commands: setToolActiveToolbar,
          evaluate: 'evaluate.cornerstoneTool',
        }),
        createButton({
          id: 'TagBrowser',
          icon: 'dicom-tag-browser',
          label: 'Dicom Tag Browser',
          tooltip: 'Dicom Tag Browser',
          commands: 'openDICOMTagViewer',
        }),
        createButton({
          id: 'AdvancedMagnify',
          icon: 'icon-tool-loupe',
          label: "Sonda con lente d'ingrandimento",
          tooltip: 'Magnify Probe',
          commands: 'toggleActiveDisabledToolbar',
          evaluate: 'evaluate.cornerstoneTool.toggle.ifStrictlyDisabled',
        }),
        // createButton({
        //   id: 'UltrasoundDirectionalTool',
        //   icon: 'icon-tool-ultrasound-bidirectional',
        //   label: 'Ultrasuono direzionale',
        //   tooltip: 'Ultrasound Directional',
        //   commands: setToolActiveToolbar,
        //   evaluate: ['evaluate.cornerstoneTool', 'evaluate.isUS'],
        // }),
        createButton({
          id: 'WindowLevelRegion',
          icon: 'icon-tool-window-region',
          label: 'Window Level Region',
          tooltip: 'Window Level Region',
          commands: setToolActiveToolbar,
          evaluate: 'evaluate.cornerstoneTool',
        }),
      ],
    },
  },
];

export default moreTools;
