import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { useDrop } from 'react-dnd';
import { utilities as csUtils } from '@cornerstonejs/core';

// NOTE: If we found a way to make `useDrop` conditional,
// Or we provided a HOC of this component, we could provide
// this UI without the DragAndDropContext dependency.
function ViewportPane({
  children,
  className,
  customStyle,
  isActive,
  onDrop,
  onDoubleClick,
  onInteraction = () => { },
  acceptDropsFor,
}) {
  let dropElement = null;
  const [{ isHovered, isHighlighted }, drop] = useDrop({
    accept: acceptDropsFor,
    // TODO: pass in as prop?
    drop: (droppedItem, monitor) => {
      const canDrop = monitor.canDrop();
      const isOver = monitor.isOver();

      if (canDrop && isOver && onDrop) {
        onInteractionHandler();
        onDrop(droppedItem);
      }
    },
    // Monitor, and collect props; returned as values by `useDrop`
    collect: monitor => ({
      isHighlighted: monitor.canDrop(),
      isHovered: monitor.isOver(),
    }),
  });

  const focus = () => {
    if (dropElement) {
      dropElement.focus();
    }
  };

  const isPreferitoOnView = () => {
    const iconaStella = document.querySelector('.nolex-selected .preferiti-btn img');
    if (!iconaStella || !window.preferiti || window.preferiti.length === 0) {
      return;
    }

    iconaStella.src = '/nuovo-visualizzatore/assets/images/preferiti.png';
    const { viewportGridService } = window.servicesManager.services;
    const { cornerstoneViewportService } = window.servicesManager.services;
    const { displaySetService } = window.servicesManager.services;
    const { activeViewportId } = viewportGridService.getState();
    const viewportId = activeViewportId;
    const viewportInfo = cornerstoneViewportService.getViewportInfo(viewportId);
    // const { element } = viewportInfo; //La viewport in questione nel dom
    const { viewportData } = viewportInfo;
    const displaySetInstanceUID = viewportData.data[0].displaySetInstanceUID;
    const displaySet = displaySetService.getDisplaySetByUID(displaySetInstanceUID);
    const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);
    let { currentImageIdIndex } = viewport;
    if (!currentImageIdIndex) {
      currentImageIdIndex = 0;
    }
    const SOPInstanceUID =
      displaySet.instances.length > 1
        ? displaySet.instances[currentImageIdIndex]['SOPInstanceUID']
        : displaySet.instances[0]['SOPInstanceUID'];
    //Controllo se allo scroll, l'istanza è attiva è tra i preferiti. Se lo è metto preferiti-active all'icona
    window.preferiti.forEach(preferito => {
      if (
        preferito.SOPInstanceUID === SOPInstanceUID &&
        preferito.NumeroIstanza === currentImageIdIndex + 1
      ) {
        console.log('è tra i preferiti');
        //Cambio la classe alla stellina
        iconaStella.src = '/nuovo-visualizzatore/assets/images/preferiti-active.png';
      }
    });
  };

  const onInteractionHandler = event => {
    focus();
    onInteraction(event);
    setTimeout(() => {
      isPreferitoOnView();
    }, 0);
  };

  const refHandler = element => {
    drop(element);
    dropElement = element;
  };

  return (
    <div
      ref={refHandler}
      // onInteractionHandler...
      // https://reactjs.org/docs/events.html#mouse-events
      // https://stackoverflow.com/questions/8378243/catch-scrolling-event-on-overflowhidden-element
      onMouseDown={onInteractionHandler}
      onDoubleClick={onDoubleClick}
      onClick={onInteractionHandler}
      onScroll={onInteractionHandler}
      onWheel={onInteractionHandler}
      className={classnames(
        'group h-full w-full overflow-hidden rounded-md transition duration-300',
        {
          'border-primary-light nolex-selected border-2': isActive,
          'border-2 border-transparent': !isActive,
        },
        className
      )}
      style={{
        ...customStyle,
      }}
    >
      <div
        className={classnames(
          'h-full w-full overflow-hidden rounded-md',
          {
            'border border-transparent': isActive,
            'border-secondary-light group-hover:border-primary-light/70 border': !isActive,
          },
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

ViewportPane.propTypes = {
  /** The ViewportComp */
  children: PropTypes.node.isRequired,
  /** Classes to append to container */
  className: PropTypes.string,
  /** Bool to show active styling */
  isActive: PropTypes.bool.isRequired,
  /** Indicates drag items we should accept for drops */
  acceptDropsFor: PropTypes.string.isRequired,
  /** Function that handles drop events */
  onDrop: PropTypes.func.isRequired,
  /** Called when the viewportPane is interacted with by the user */
  onInteraction: PropTypes.func.isRequired,
  /** Executed when the pane is double clicked */
  onDoubleClick: PropTypes.func,
};

const noop = () => { };

ViewportPane.defaultProps = {
  onInteraction: noop,
};

export default ViewportPane;
