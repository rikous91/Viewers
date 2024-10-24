import React, { ReactElement, useCallback } from 'react';
import { AllInOneMenu } from '@ohif/ui';
import { WindowLevelPreset } from '../../types/WindowLevel';
import { CommandsManager } from '@ohif/core';
import { useTranslation } from 'react-i18next';
import ottieniDisplaySetSerieAttiva from '../../../../../platform/core/src/utils/ottieniDisplaySetSerieAttiva';

export type WindowLevelProps = {
  viewportId: string;
  presets: Array<Record<string, Array<WindowLevelPreset>>>;
  commandsManager: CommandsManager;
};

export function WindowLevel({
  viewportId,
  commandsManager,
  presets,
}: WindowLevelProps): ReactElement {
  const { t } = useTranslation('WindowLevelActionMenu');
  //Al click recupero la seriesIstanceUID della serie selezionata
  const { SeriesInstanceUID } = ottieniDisplaySetSerieAttiva();
  console.log(SeriesInstanceUID);
  const dicomPreset = [];
  if (SeriesInstanceUID && window.NolexDicomLuts && window.NolexDicomLuts[SeriesInstanceUID]) {
    const dicomWHWC = window.NolexDicomLuts[SeriesInstanceUID];
    if (!Array.isArray(dicomWHWC.WindowCenter)) {
      dicomWHWC.WindowCenter = [dicomWHWC.WindowCenter];
    }
    if (!Array.isArray(dicomWHWC.WindowWidth)) {
      dicomWHWC.WindowWidth = [dicomWHWC.WindowWidth];
    }
    //A questo punto potrei avere dei duplicati. Unendo infatti il primo elemento di WindowWidth e il primo di WindowCenter, il secondo poi col
    //secondo ecc. potrei avere 300,175  300,75  350,40. Manterrò solamente un 300,175

    // Creo un array di coppie [WindowCenter, WindowWidth]
    const combined = dicomWHWC.WindowCenter.map((center, index) => {
      return { center, width: dicomWHWC.WindowWidth[index] };
    });

    // uso un Set per rimuovere le combinazioni duplicate
    const uniqueCombinations = Array.from(
      new Map(combined.map(item => [JSON.stringify(item), item])).values()
    );

    // Separo di nuovo le due liste, ma senza duplicati
    const newWindowCenter = uniqueCombinations.map(item => item.center);
    const newWindowWidth = uniqueCombinations.map(item => item.width);

    for (let i = 0; i < newWindowCenter.length; i++) {
      dicomPreset.push({
        description: 'Preset ' + (i + 1),
        window: newWindowWidth[i],
        level: newWindowCenter[i],
      });
    }
  }

  // const dicomPreset = [
  //   {
  //     description: 'Soft tissue',
  //     window: '400',
  //     level: '40',
  //   },
  //   {
  //     description: 'Lung',
  //     window: '1500',
  //     level: '-600',
  //   },
  //   {
  //     description: 'Liver',
  //     window: '150',
  //     level: '90',
  //   },
  //   {
  //     description: 'Bone',
  //     window: '2500',
  //     level: '480',
  //   },
  //   {
  //     description: 'Brain',
  //     window: '80',
  //     level: '40',
  //   },
  // ];

  const onSetWindowLevel = useCallback(
    props => {
      commandsManager.run({
        commandName: 'setViewportWindowLevel',
        commandOptions: {
          ...props,
          viewportId,
        },
        context: 'CORNERSTONE',
      });
    },
    [commandsManager, viewportId]
  );

  return (
    <AllInOneMenu.ItemPanel>
      {presets.map((modalityPresets, modalityIndex) => (
        <React.Fragment key={modalityIndex}>
          {Object.entries(modalityPresets).map(([modality, presetsArray]) => (
            <React.Fragment key={modality}>
              {dicomPreset.length > 0 && (
                <>
                  <AllInOneMenu.HeaderItem>Preset DICOM</AllInOneMenu.HeaderItem>
                  {dicomPreset.map((preset, index) => (
                    <AllInOneMenu.Item
                      key={`${modality}-${index}`}
                      label={preset.description}
                      secondaryLabel={`${preset.window} / ${preset.level}`}
                      onClick={() => onSetWindowLevel(preset)}
                    />
                  ))}
                </>
              )}

              <AllInOneMenu.HeaderItem>
                {/* {t('Preset Modality', { modality })} */}
                Preset {modality}
              </AllInOneMenu.HeaderItem>
              {presetsArray.map((preset, index) => (
                <AllInOneMenu.Item
                  key={`${modality}-${index}`}
                  label={preset.description}
                  secondaryLabel={`${preset.window} / ${preset.level}`}
                  onClick={() => onSetWindowLevel(preset)}
                />
              ))}
            </React.Fragment>
          ))}
        </React.Fragment>
      ))}
    </AllInOneMenu.ItemPanel>
  );
}
