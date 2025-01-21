import React from 'react';
import PropTypes from 'prop-types';

import { Thumbnail } from '../Thumbnail';

const ThumbnailList = ({
  thumbnails,
  onThumbnailClick,
  onThumbnailDoubleClick,
  onClickUntrack,
  activeDisplaySetInstanceUIDs = [],
  viewPreset,
  ThumbnailMenuItems,
}: withAppTypes) => {
  return (
    <div>
      <div
        id="ohif-thumbnail-list"
        className={`ohif-scrollbar bg-bkg-low grid place-items-center overflow-y-hidden pt-[4px] pr-[2.5px] pl-[2.5px] ${viewPreset === 'thumbnails' ? 'grid-cols-2 gap-[4px] pb-[12px]' : 'grid-cols-1 gap-[2px]'}`}
      >
        {thumbnails.map(
          ({
            displaySetInstanceUID,
            description,
            dragData,
            seriesNumber,
            numInstances,
            loadingProgress,
            modality,
            componentType,
            countIcon,
            canReject,
            onReject,
            isTracked,
            imageSrc,
            messages,
            imageAltText,
            isHydratedForDerivedDisplaySet,
          }) => {

            const onClickNolex = (displaySetInstanceUID) => {
              onThumbnailClick(displaySetInstanceUID)
              //Se sono su mobile chiudo in automatico il pannello di selezione serie
              if (window.matchMedia("(max-width: 768px)").matches) {
                try {
                  // document.querySelector('[data-cy="side-panel-header-left"]').click()
                } catch (err) {
                  console.error('Impossibile chiudere in aumatico il pannello di selezione serie', err)
                }
              }
            }

            const isActive = activeDisplaySetInstanceUIDs.includes(displaySetInstanceUID);
            return (
              <Thumbnail
                key={displaySetInstanceUID}
                displaySetInstanceUID={displaySetInstanceUID}
                dragData={dragData}
                description={description}
                seriesNumber={seriesNumber}
                numInstances={numInstances || 1}
                countIcon={countIcon}
                imageSrc={imageSrc}
                imageAltText={imageAltText}
                messages={messages}
                isActive={isActive}
                canReject={canReject}
                onReject={onReject}
                modality={modality}
                viewPreset={componentType === 'thumbnailNoImage' ? 'list' : viewPreset}
                thumbnailType={componentType}
                onClick={() => onClickNolex(displaySetInstanceUID)}
                onDoubleClick={() => onThumbnailDoubleClick(displaySetInstanceUID)}
                isTracked={isTracked}
                loadingProgress={loadingProgress}
                onClickUntrack={() => onClickUntrack(displaySetInstanceUID)}
                isHydratedForDerivedDisplaySet={isHydratedForDerivedDisplaySet}
                ThumbnailMenuItems={ThumbnailMenuItems}
              />
            );
          }
        )}
      </div>
    </div>
  );
};

ThumbnailList.propTypes = {
  thumbnails: PropTypes.arrayOf(
    PropTypes.shape({
      displaySetInstanceUID: PropTypes.string.isRequired,
      imageSrc: PropTypes.string,
      imageAltText: PropTypes.string,
      seriesDate: PropTypes.string,
      seriesNumber: PropTypes.any,
      numInstances: PropTypes.number,
      description: PropTypes.string,
      componentType: PropTypes.any,
      isTracked: PropTypes.bool,
      /**
       * Data the thumbnail should expose to a receiving drop target. Use a matching
       * `dragData.type` to identify which targets can receive this draggable item.
       * If this is not set, drag-n-drop will be disabled for this thumbnail.
       *
       * Ref: https://react-dnd.github.io/react-dnd/docs/api/use-drag#specification-object-members
       */
      dragData: PropTypes.shape({
        /** Must match the "type" a dropTarget expects */
        type: PropTypes.string.isRequired,
      }),
    })
  ),
  activeDisplaySetInstanceUIDs: PropTypes.arrayOf(PropTypes.string),
  onThumbnailClick: PropTypes.func.isRequired,
  onThumbnailDoubleClick: PropTypes.func.isRequired,
  onClickUntrack: PropTypes.func.isRequired,
  viewPreset: PropTypes.string,
};

export { ThumbnailList };
