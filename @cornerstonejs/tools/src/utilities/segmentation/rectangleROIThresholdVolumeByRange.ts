import type { Types } from '@cornerstonejs/core';
import { state } from '../../stateManagement/annotation';
import {
  RectangleROIStartEndThresholdTool,
  RectangleROIThresholdTool,
} from '../../tools';

import thresholdVolumeByRange from './thresholdVolumeByRange';
import getBoundsIJKFromRectangleAnnotations from '../rectangleROITool/getBoundsIJKFromRectangleAnnotations';
import { ThresholdInformation } from './utilities';

export type ThresholdOptions = {
  numSlicesToProject?: number; // number of slices to project before and after current slice
  overwrite: boolean;
  overlapType?: number; // type of the voxel overlap
  segmentIndex?: number; // segment index to threshold
};

export type AnnotationForThresholding = {
  data: {
    handles: {
      points: Types.Point3[];
    };
    cachedStats?: {
      projectionPoints?: Types.Point3[][];
    };
  };
};

/**
 * It uses the provided rectangleROI annotations (either RectangleROIThreshold, or
 * RectangleROIStartEndThreshold) to compute an ROI that is the intersection of
 * all the annotations. Then it uses the rectangleROIThreshold utility to threshold
 * the volume.
 * @param annotationUIDs - rectangleROI annotationsUIDs to use for ROI
 * @param segmentationVolume - the segmentation volume
 * @param thresholdVolumeInformation - object array containing the volume data and range threshold values
 * @param options - options for thresholding
 * @returns
 */
function rectangleROIThresholdVolumeByRange(
  annotationUIDs: string[],
  segmentationVolume: Types.IImageVolume,
  thresholdVolumeInformation: ThresholdInformation[],
  options: ThresholdOptions
): Types.IImageVolume {
  const annotations = annotationUIDs.map((annotationUID) => {
    return state.getAnnotation(annotationUID);
  });

  _validateAnnotations(annotations);

  let boundsIJK;
  for (let i = 0; i < thresholdVolumeInformation.length; i++) {
    // make sure that the boundsIJK are generated by the correct volume
    const volumeSize =
      thresholdVolumeInformation[i].volume.getScalarData().length;
    if (volumeSize === segmentationVolume.getScalarData().length || i === 0) {
      boundsIJK = getBoundsIJKFromRectangleAnnotations(
        annotations,
        thresholdVolumeInformation[i].volume,
        options
      );
    }
  }

  const outputSegmentationVolume = thresholdVolumeByRange(
    segmentationVolume,
    thresholdVolumeInformation,
    { ...options, boundsIJK }
  );

  outputSegmentationVolume.modified();

  return outputSegmentationVolume;
}

function _validateAnnotations(annotations) {
  const validToolNames = [
    RectangleROIThresholdTool.toolName,
    RectangleROIStartEndThresholdTool.toolName,
  ];

  for (const annotation of annotations) {
    const name = annotation.metadata.toolName;
    if (!validToolNames.includes(name)) {
      throw new Error(
        'rectangleROIThresholdVolumeByRange only supports RectangleROIThreshold and RectangleROIStartEndThreshold annotations'
      );
    }
  }
}

export default rectangleROIThresholdVolumeByRange;
