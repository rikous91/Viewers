import React, { useEffect, useState, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { LayoutSelector as OHIFLayoutSelector, ToolbarButton, LayoutPreset } from '@ohif/ui';

let hpSelezionato = 'mpr';
let hpSelezionatoStorico = 'mpr';
let showLayoutPresetsForStorico = false;
const defaultCommonPresets = [
  {
    icon: 'layout-common-1x1',
    commandOptions: {
      numRows: 1,
      numCols: 1,
    },
  },
  {
    icon: 'layout-common-1x2',
    commandOptions: {
      numRows: 1,
      numCols: 2,
    },
  },
  {
    icon: 'layout-common-2x2',
    commandOptions: {
      numRows: 2,
      numCols: 2,
    },
  },
  {
    icon: 'layout-common-2x3',
    commandOptions: {
      numRows: 2,
      numCols: 3,
    },
  },
];

const _areSelectorsValid = (hp, displaySets, hangingProtocolService) => {
  if (!hp.displaySetSelectors || Object.values(hp.displaySetSelectors).length === 0) {
    return true;
  }

  return hangingProtocolService.areRequiredSelectorsValid(
    Object.values(hp.displaySetSelectors),
    displaySets[0]
  );
};

const generateAdvancedPresets = ({ servicesManager }: withAppTypes) => {
  const { hangingProtocolService, viewportGridService, displaySetService } =
    servicesManager.services;

  const hangingProtocols = Array.from(hangingProtocolService.protocols.values());

  const viewportId = viewportGridService.getActiveViewportId();

  if (!viewportId) {
    return [];
  }
  const displaySetInsaneUIDs = viewportGridService.getDisplaySetsUIDsForViewport(viewportId);

  if (!displaySetInsaneUIDs) {
    return [];
  }

  const displaySets = displaySetInsaneUIDs.map(uid => displaySetService.getDisplaySetByUID(uid));

  return hangingProtocols
    .map(hp => {
      if (!hp.isPreset) {
        return null;
      }

      const areValid = _areSelectorsValid(hp, displaySets, hangingProtocolService);

      return {
        icon: hp.icon,
        title: hp.name,
        commandOptions: {
          protocolId: hp.id,
        },
        disabled: !areValid || hpSelezionato === hp.id,
      };
    })
    .filter(preset => preset !== null);
};

const generateAdvancedPresetsStorico = ({ servicesManager }: withAppTypes) => {
  const { hangingProtocolService, viewportGridService, displaySetService } =
    servicesManager.services;

  const hangingProtocols = Array.from(hangingProtocolService.protocols.values());

  const viewportId = viewportGridService.getActiveViewportId();

  if (!viewportId) {
    return [];
  }
  const displaySetInsaneUIDs = viewportGridService.getDisplaySetsUIDsForViewport(viewportId);

  if (!displaySetInsaneUIDs) {
    return [];
  }

  const displaySets = displaySetInsaneUIDs.map(uid => displaySetService.getDisplaySetByUID(uid));

  return hangingProtocols
    .map(hp => {
      if (!hp.isPreset) {
        return null;
      }

      const areValid = _areSelectorsValid(hp, displaySets, hangingProtocolService);

      return {
        icon: hp.icon,
        title: hp.name,
        commandOptions: {
          protocolId: hp.id,
        },
        disabled: hpSelezionatoStorico === hp.id,
      };
    })
    .filter(preset => preset !== null);
};

const onSelectionPresetStorico = preset => {
  hpSelezionatoStorico = preset.commandOptions.protocolId;
  document.getElementById('iframe-storico').contentWindow.postMessage(preset.title);
};

function ToolbarLayoutSelectorWithServices({
  commandsManager,
  servicesManager,
  ...props
}: withAppTypes) {
  const [isDisabled, setIsDisabled] = useState(false);

  const handleMouseEnter = () => {
    setIsDisabled(false);
  };

  const onSelection = useCallback(props => {
    commandsManager.run({
      commandName: 'setViewportGridLayout',
      commandOptions: { ...props },
    });
    setIsDisabled(true);
    //Disabilito modalità MPR (quella dell'hanging protocol) ad ogni cambio di layout

    document.body.classList.remove('hp-mpr-active');
    window.mprIsActive = false;
  }, []);

  const _onSelectionPreset = useCallback(props => {
    commandsManager.run({
      commandName: 'setHangingProtocol',
      commandOptions: { ...props },
    });
    setIsDisabled(true);
  }, []);

  const onSelectionPreset = preset => {
    try {
      document.body.classList.add('caricamento-layout-mpr');
      hpSelezionato = preset.commandOptions.protocolId;
      const { hangingProtocolService, viewportGridService } = servicesManager.services;

      const { activeViewportId, viewports } = viewportGridService.getState();
      const activeViewport = viewports.get(activeViewportId);
      const activeDisplaySetInstanceUID = activeViewport.displaySetInstanceUIDs[0];

      const ActiveThumbnail = document.querySelector(
        `#thumbnail-${activeDisplaySetInstanceUID} img`
      );

      hangingProtocolService.setProtocol(hpSelezionato);
      //Memorizzo globalmente il preset selezionato così da riapplicare lo stesso eventualmente alla riattivazione dell'mpr (mprDirectClick)
      window.nolexProtocolToApply = hpSelezionato;

      setTimeout(() => {
        if (ActiveThumbnail) {
          ActiveThumbnail.click();
          document.body.classList.remove('caricamento-layout-mpr');
        }
      }, 500);
    } catch (err) {
      console.error('Errore attivazione MPR: ', err);
    }
  };

  return (
    <div onMouseEnter={handleMouseEnter}>
      <LayoutSelector
        {...props}
        onSelection={onSelection}
        onSelectionPreset={onSelectionPreset}
        servicesManager={servicesManager}
        tooltipDisabled={isDisabled}
      />
    </div>
  );
}

function LayoutSelector({
  rows = 3,
  columns = 4,
  onLayoutChange = () => { },
  className,
  onSelection,
  onSelectionPreset,
  servicesManager,
  tooltipDisabled,
  ...rest
}: withAppTypes) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  showLayoutPresetsForStorico = document.getElementById('iframe-storico') ? true : false;

  const { customizationService } = servicesManager.services;
  const commonPresets = customizationService.get('commonPresets') || defaultCommonPresets;
  const advancedPresets =
    customizationService.get('advancedPresets') || generateAdvancedPresets({ servicesManager });
  const advancedPresetsStorico = generateAdvancedPresetsStorico({ servicesManager });

  const closeOnOutsideClick = event => {
    if (isOpen && dropdownRef.current) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setTimeout(() => {
      window.addEventListener('click', closeOnOutsideClick);
    }, 0);
    return () => {
      window.removeEventListener('click', closeOnOutsideClick);
      dropdownRef.current = null;
    };
  }, [isOpen]);

  const onInteractionHandler = () => {
    setIsOpen(!isOpen);
  };
  const DropdownContent = isOpen ? OHIFLayoutSelector : null;

  const onSelectionStudioStorico = layout => {
    document.getElementById('iframe-storico').contentWindow.postMessage(layout);
  };

  return (
    <ToolbarButton
      id="Layout"
      label="Layout"
      icon="tool-layout"
      onInteraction={onInteractionHandler}
      className={className}
      rounded={rest.rounded}
      disableToolTip={tooltipDisabled}
      dropdownContent={
        DropdownContent !== null && (
          <div
            className="flex"
            ref={dropdownRef}
          >
            <div className="bg-secondary-dark flex flex-col gap-2.5 p-2">
              <div className="standard-layout">
                <div className="text-aqua-pale text-xs">
                  {showLayoutPresetsForStorico ? 'Standard - Studio principale' : 'Standard'}
                </div>

                <div className="flex gap-4">
                  {commonPresets.map((preset, index) => (
                    <LayoutPreset
                      key={index}
                      classNames="hover:bg-primary-dark group p-1 cursor-pointer"
                      icon={preset.icon}
                      commandOptions={preset.commandOptions}
                      onSelection={onSelection}
                    />
                  ))}
                </div>
              </div>

              <div className="separatore-layout h-[2px] bg-black"></div>

              <div className="advanced-layout">
                <div className="text-aqua-pale text-xs">
                  {' '}
                  {showLayoutPresetsForStorico ? 'Avanzato - Studio principale' : 'Avanzato'}
                </div>

                <div className="flex flex-col gap-2.5">
                  {advancedPresets.map((preset, index) => (
                    <LayoutPreset
                      key={index + commonPresets.length}
                      classNames="hover:bg-primary-dark group flex gap-2 p-1 cursor-pointer"
                      icon={preset.icon}
                      title={preset.title}
                      disabled={preset.disabled}
                      commandOptions={preset.commandOptions}
                      onSelection={() => onSelectionPreset(preset)}
                    />
                  ))}
                </div>
              </div>

              {/* Griglia eventuale per storico nella stessa tab */}
              {showLayoutPresetsForStorico && (
                <div className="standard-layout-storico-same-tab">
                  <div className="text-aqua-pale text-xs">Standard - Studio precedente</div>

                  <div className="flex gap-4">
                    {commonPresets.map((preset, index) => (
                      <LayoutPreset
                        key={index}
                        classNames="hover:bg-primary-dark group p-1 cursor-pointer"
                        icon={preset.icon}
                        commandOptions={preset.commandOptions}
                        onSelection={() => onSelectionStudioStorico(preset.icon)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {showLayoutPresetsForStorico && (
                <div className="advanced-layout-storico-same-tab">
                  <div className="text-aqua-pale text-xs">Avanzato - Studio precedente</div>

                  <div className="flex flex-col gap-2.5">
                    {advancedPresetsStorico.map((preset, index) => (
                      <LayoutPreset
                        key={index + commonPresets.length}
                        classNames="hover:bg-primary-dark group flex gap-2 p-1 cursor-pointer"
                        icon={preset.icon}
                        title={preset.title}
                        disabled={preset.disabled}
                        commandOptions={preset.commandOptions}
                        onSelection={() => onSelectionPresetStorico(preset)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-primary-dark custom-layout flex flex-col gap-2.5 border-l-2 border-solid border-black p-2">
              <div className="text-aqua-pale text-xs">
                {' '}
                {showLayoutPresetsForStorico
                  ? 'Personalizzato - Studio principale'
                  : 'Personalizzato'}
              </div>
              <DropdownContent
                rows={rows}
                columns={columns}
                onSelection={onSelection}
              />

              {showLayoutPresetsForStorico && (
                <>
                  <div className="custom-layout-storico-same-tab">
                    <div className="text-aqua-pale text-xs">Personalizzato - Studio precedente</div>
                    <DropdownContent
                      rows={rows}
                      columns={columns}
                      onSelection={e => onSelectionStudioStorico(`custom${e.numRows}x${e.numCols}`)}
                    />
                  </div>
                </>
              )}

              <p className="tip-custom-layout text-aqua-pale text-xs leading-tight">
                Seleziona un preset di<br></br>righe e colonne <br></br> Clicca per applicare
              </p>
            </div>
          </div>
        )
      }
      isActive={isOpen}
      type="toggle"
    />
  );
}

LayoutSelector.propTypes = {
  rows: PropTypes.number,
  columns: PropTypes.number,
  onLayoutChange: PropTypes.func,
  servicesManager: PropTypes.object.isRequired,
};

export default ToolbarLayoutSelectorWithServices;
