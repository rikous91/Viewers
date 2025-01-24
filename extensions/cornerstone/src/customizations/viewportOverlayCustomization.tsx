export default {
  'viewportOverlay.topLeft': [
    // Top Left
    {
      id: 'StudyDate',
      inheritsFrom: 'ohif.overlayItem',
      label: '',
      title: 'Study date',
      className: 'overlay-info-dicom',
      condition: ({ referenceInstance }) => referenceInstance?.StudyDate,
      contentF: ({ referenceInstance, formatters: { formatDate } }) =>
        formatDate(referenceInstance.StudyDate),
    },
    {
      id: 'SeriesNumber',
      inheritsFrom: 'ohif.overlayItem',
      label: '',
      title: 'SeriesNumber',
      className: 'overlay-info-dicom',
      condition: ({ referenceInstance }) => {
        return referenceInstance && referenceInstance.SeriesNumber;
      },
      contentF: ({ referenceInstance }) => 'S: ' + referenceInstance.SeriesNumber,
    },
    {
      id: 'SeriesDescription',
      inheritsFrom: 'ohif.overlayItem',
      label: '',
      title: 'Series description',
      className: 'overlay-info-dicom',
      condition: ({ referenceInstance }) => {
        return referenceInstance && referenceInstance.SeriesDescription;
      },
      contentF: ({ referenceInstance }) => referenceInstance.SeriesDescription,
    },
    {
      id: 'StoricoLabel',
      inheritsFrom: 'ohif.overlayItem',
      label: '',
      title: 'Storico Label',
      color: '#81d4fa',
      condition: ({ referenceInstance }) =>
        ((referenceInstance?.StudyInstanceUID &&
          referenceInstance?.StudyInstanceUID !== window.nolexStudyInstanceUIDs) ||
          window.sonoUnoStorico === true) &&
        !window.portableVersion,
      contentF: ({ referenceInstance }) => 'STORICO',
    }
  ],
  //Top Right
  'viewportOverlay.topRight': [
    {
      id: 'PatientName',
      inheritsFrom: 'ohif.overlayItem',
      label: '',
      title: 'PatientName',
      className: 'overlay-info-dicom',
      condition: ({ referenceInstance }) => {
        return (
          referenceInstance && referenceInstance.PatientName && referenceInstance.PatientName.Alphabetic
        );
      },
      contentF: ({ referenceInstance, formatters: { formatPN } }) =>
        `${formatPN(referenceInstance.PatientName.Alphabetic)} ${referenceInstance.PatientSex ? '(' + referenceInstance.PatientSex + ')' : ''}`,
    },
    {
      id: 'PatientID',
      inheritsFrom: 'ohif.overlayItem',
      label: '',
      title: 'PatientID',
      className: 'overlay-info-dicom',
      condition: ({ referenceInstance }) => {
        return referenceInstance && referenceInstance.PatientID;
      },
      contentF: ({ referenceInstance }) => 'ID: ' + referenceInstance.PatientID,
    },
    {
      id: 'Accession',
      inheritsFrom: 'ohif.overlayItem',
      label: '',
      title: 'Accession',
      className: 'overlay-info-dicom',
      condition: ({ referenceInstance }) => {
        return referenceInstance && referenceInstance.AccessionNumber;
      },
      contentF: ({ referenceInstance }) => referenceInstance.AccessionNumber,
    }
  ],
  'viewportOverlay.bottomLeft': [
    //Bottom Left
    {
      id: 'WindowLevel',
      inheritsFrom: 'ohif.overlayItem.windowLevel',
      className: 'overlay-info-dicom'
    },
    {
      id: 'ZoomLevel',
      inheritsFrom: 'ohif.overlayItem.zoomLevel',
      className: 'overlay-info-dicom',
      condition: props => {
        const activeToolName = props.toolGroupService.getActiveToolForViewport(props.viewportId);
        return activeToolName === 'Zoom';
      },
    },
  ],
  'viewportOverlay.bottomRight': [
    //Bottom Right
    {
      id: 'InstanceNumber',
      inheritsFrom: 'ohif.overlayItem.instanceNumber',
      className: 'overlay-info-dicom'
    },
  ],
};
