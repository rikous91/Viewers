import React, { ReactNode } from 'react';
import { WindowLevelActionMenu } from './WindowLevelActionMenu';

export function getWindowLevelActionMenu({
  viewportId,
  element,
  displaySets,
  servicesManager,
  commandsManager,
  verticalDirection,
  horizontalDirection,
}: withAppTypes): ReactNode {
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
