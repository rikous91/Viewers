import { StackViewport, utilities as csUtils } from '@cornerstonejs/core';
import { ReferenceCursors } from '@cornerstonejs/tools';

class ReferenceCursorsTool extends ReferenceCursors {
  updateViewportImage(viewport) {
    const currentMousePosition = this._currentCursorWorldPosition;
    if (!currentMousePosition || currentMousePosition.some(e => isNaN(e))) {
      return;
    }

    if (viewport instanceof StackViewport) {
      const closestIndex = csUtils.getClosestStackImageIndexForPoint(
        currentMousePosition,
        viewport
      );

      if (closestIndex === null) {
        return;
      }

      if (closestIndex !== viewport.getCurrentImageIdIndex()) {
        csUtils.jumpToSlice(viewport.element, {
          imageIndex: closestIndex,
          debounceLoading: true,
        });
      }

      return;
    }

    super.updateViewportImage(viewport);
  }
}

ReferenceCursorsTool.toolName = ReferenceCursors.toolName;

export default ReferenceCursorsTool;
