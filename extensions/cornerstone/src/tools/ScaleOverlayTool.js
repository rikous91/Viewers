import { ScaleOverlayTool, annotation } from '@cornerstonejs/tools';
import { utilities as csUtils } from '@cornerstonejs/core';

class ScaleOverlayToolSafe extends ScaleOverlayTool {
  _ensureAnnotationForViewport(enabledElement) {
    const { viewport } = enabledElement;
    if (!viewport?.element) {
      return null;
    }

    const annotations = annotation.state.getAnnotations(this.getToolName(), viewport.element);
    const annotationForViewport = annotations?.filter(a => a.data.viewportId == viewport.id)[0];

    if (annotationForViewport) {
      return annotationForViewport;
    }

    const { FrameOfReferenceUID } = enabledElement;
    const { viewUp, viewPlaneNormal } = viewport.getCamera();
    const newAnnotation = {
      metadata: {
        toolName: this.getToolName(),
        viewPlaneNormal: [...viewPlaneNormal],
        viewUp: [...viewUp],
        FrameOfReferenceUID,
        referencedImageId: null,
      },
      data: {
        handles: {
          points: csUtils.getViewportImageCornersInWorld(viewport),
        },
        viewportId: viewport.id,
      },
    };

    annotation.state.addAnnotation(newAnnotation, viewport.element);

    return newAnnotation;
  }

  renderAnnotation(enabledElement, svgDrawingHelper) {
    if (!this.editData || !this.editData.viewport) {
      return;
    }

    const location = this.configuration.scaleLocation;
    const { viewport } = enabledElement;
    const annotationForViewport = this._ensureAnnotationForViewport(enabledElement);

    if (!annotationForViewport) {
      return;
    }

    const points = annotationForViewport.data.handles.points;
    if (!points || points.length < 4) {
      return;
    }

    const topLeft = points[0];
    const topRight = points[1];
    const bottomLeft = points[2];
    const bottomRight = points[3];

    const worldWidthViewport = this._distance(bottomLeft, bottomRight);
    const worldHeightViewport = this._distance(topLeft, bottomLeft);
    const scaleSize = this.computeScaleSize(worldWidthViewport, worldHeightViewport, location);
    if (!scaleSize || Number.isNaN(scaleSize)) {
      return;
    }

    return super.renderAnnotation(enabledElement, svgDrawingHelper);
  }

  _distance(a, b) {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const dz = a[2] - b[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}

ScaleOverlayToolSafe.toolName = ScaleOverlayTool.toolName;

export default ScaleOverlayToolSafe;
