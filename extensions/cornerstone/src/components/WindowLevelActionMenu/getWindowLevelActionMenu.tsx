import React, { ReactNode } from 'react';
import { nonWLModalities, WindowLevelActionMenu } from './WindowLevelActionMenu';

export function getWindowLevelActionMenu({
  viewportId,
  element,
  displaySets,
  servicesManager,
  commandsManager,
  verticalDirection,
  horizontalDirection,
}: withAppTypes<{
  viewportId: string;
  element: HTMLElement;
  displaySets: AppTypes.DisplaySet[];
}>): ReactNode {
  const { customizationService } = servicesManager.services;

  const { presets } = customizationService.get('cornerstone.windowLevelPresets');
  const colorbarProperties = customizationService.get('cornerstone.colorbar');
  const { volumeRenderingPresets, volumeRenderingQualityRange } = customizationService.get(
    'cornerstone.3dVolumeRendering'
  );

  //Filtro i preset per modality
  // const displaySetPresets = displaySets
  //   .filter(displaySet => presets[displaySet.Modality])
  //   .map(displaySet => {
  //     return { [displaySet.Modality]: presets[displaySet.Modality] };
  //   });

  //Restituisco tutti i preset a prescindere dalla modality
  const displaySetPresets = [presets];

  const modalities = displaySets
    .map(displaySet => displaySet.Modality)
    .filter(modality => !nonWLModalities.includes(modality));

  if (modalities.length === 0) {
    return null;
  }

  return (
    <WindowLevelActionMenu
      viewportId={viewportId}
      element={element}
      presets={displaySetPresets}
      verticalDirection={verticalDirection}
      horizontalDirection={horizontalDirection}
      commandsManager={commandsManager}
      servicesManager={servicesManager}
      colorbarProperties={colorbarProperties}
      displaySets={displaySets}
      volumeRenderingPresets={volumeRenderingPresets}
      volumeRenderingQualityRange={volumeRenderingQualityRange}
    />
  );
}
