import dcmjs from 'dcmjs';

const { DicomMetaDictionary } = dcmjs.data;

const DEFAULT_CLASSNAME = 'overlay-info-dicom';

const getTagConfig = overlayConfig => {
  if (overlayConfig && typeof overlayConfig === 'object') {
    return overlayConfig;
  }
  return typeof window !== 'undefined' ? window?.config?.viewportOverlayTags || {} : {};
};

const getCornerConfig = (tagConfig, cornerKey) => {
  return (
    tagConfig?.[cornerKey] ??
    tagConfig?.[`corner${cornerKey[0].toUpperCase()}${cornerKey.slice(1)}`]
  );
};

const hasCornerConfig = (tagConfig, cornerKey) =>
  Array.isArray(getCornerConfig(tagConfig, cornerKey));

const resolveTagDefinition = tagOrKeyword => {
  if (!tagOrKeyword) {
    return null;
  }

  const raw = String(tagOrKeyword).trim();
  if (!raw) {
    return null;
  }

  const nameMapEntry = DicomMetaDictionary?.nameMap?.[raw];
  if (nameMapEntry) {
    return {
      keyword: raw,
      tag: nameMapEntry.tag,
      vr: nameMapEntry.vr,
    };
  }

  const cleaned = raw.replace(/[^0-9A-Fa-f]/g, '');
  const punctuatedTag =
    cleaned.length === 8 ? DicomMetaDictionary?.punctuateTag?.(cleaned) : raw;

  const dictionaryEntry =
    punctuatedTag && DicomMetaDictionary?.dictionary?.[punctuatedTag];

  if (dictionaryEntry) {
    return {
      keyword: dictionaryEntry.name,
      tag: dictionaryEntry.tag,
      vr: dictionaryEntry.vr,
    };
  }

  if (cleaned.length === 8) {
    return {
      keyword: cleaned,
      tag: punctuatedTag,
    };
  }

  return { keyword: raw };
};

const formatFromVR = vr => {
  if (!vr) {
    return null;
  }

  if (vr === 'DA') {
    return 'date';
  }
  if (vr === 'TM') {
    return 'time';
  }
  if (vr === 'PN') {
    return 'pn';
  }
  if (vr === 'DT') {
    return 'dateTime';
  }

  return null;
};

const getTagValue = (props, { attribute, tag, source }) => {
  const instance =
    source === 'instance' ? props.instance : props.referenceInstance ?? props.instance;
  const displaySet = props?.displaySet ?? props?.displaySets?.[0];
  if (!instance) {
    if (!displaySet) {
      return undefined;
    }
  }

  if (attribute && instance[attribute] !== undefined) {
    return instance[attribute];
  }

  if (tag) {
    const cleanedTag = String(tag).replace(/[^0-9A-Fa-f]/g, '');
    if (cleanedTag && instance[cleanedTag] !== undefined) {
      return instance[cleanedTag];
    }
    if (instance[tag] !== undefined) {
      return instance[tag];
    }
  }

  if (!displaySet) {
    return undefined;
  }

  if (attribute && displaySet[attribute] !== undefined) {
    return displaySet[attribute];
  }

  if (tag) {
    const cleanedTag = String(tag).replace(/[^0-9A-Fa-f]/g, '');
    if (cleanedTag && displaySet[cleanedTag] !== undefined) {
      return displaySet[cleanedTag];
    }
    if (displaySet[tag] !== undefined) {
      return displaySet[tag];
    }
  }

  return undefined;
};

const formatTagValue = (value, format, formatters) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (format === 'pn') {
    const pnValue = value?.Alphabetic ?? value;
    return formatters?.formatPN ? formatters.formatPN(pnValue) : pnValue;
  }

  if (format === 'date') {
    return formatters?.formatDate ? formatters.formatDate(value) : value;
  }

  if (format === 'time') {
    return formatters?.formatTime ? formatters.formatTime(value) : value;
  }

  if (format === 'dateTime') {
    const date = formatters?.formatDate ? formatters.formatDate(value) : value;
    const time = formatters?.formatTime ? formatters.formatTime(value) : '';
    return time ? `${date} ${time}` : date;
  }

  if (Array.isArray(value)) {
    return value.join('\\');
  }

  if (typeof value === 'object') {
    if (value.Alphabetic) {
      return formatters?.formatPN ? formatters.formatPN(value.Alphabetic) : value.Alphabetic;
    }
  }

  return String(value);
};

const buildTagItemsFromConfig = configItems => {
  if (!Array.isArray(configItems)) {
    return [];
  }

  return configItems
    .map((item, index) => {
      const definition = typeof item === 'string' ? { tag: item } : item;
      if (!definition) {
        return null;
      }

      const resolved = resolveTagDefinition(
        definition.tag || definition.keyword || definition.attribute
      );
      const suffixResolved = definition.suffixTag
        ? resolveTagDefinition(definition.suffixTag)
        : null;
      const attribute = definition.attribute || resolved?.keyword;
      const format = definition.format || formatFromVR(resolved?.vr);
      const source = definition.source || 'reference';
      const suffixSource = definition.suffixSource || source;
      const suffixFormat = definition.suffixFormat || formatFromVR(suffixResolved?.vr);
      const title = definition.title || resolved?.keyword || resolved?.tag || definition.tag;
      const id = definition.id || attribute || resolved?.tag || `tag_${index}`;

      return {
        id,
        inheritsFrom: 'ohif.overlayItem',
        label: definition.label ?? '',
        title,
        className: definition.className || DEFAULT_CLASSNAME,
        color: definition.color,
        condition: props => {
          const value = getTagValue(props, { attribute, tag: resolved?.tag, source });
          return value !== undefined && value !== null && value !== '';
        },
        contentF: props => {
          const value = getTagValue(props, { attribute, tag: resolved?.tag, source });
          if (value === undefined || value === null || value === '') {
            return null;
          }
          const formatted = formatTagValue(value, format, props.formatters);
          if (formatted === undefined || formatted === null || formatted === '') {
            return null;
          }
          let text = formatted;
          if (definition.prefix) {
            text = `${definition.prefix}${text}`;
          }
          if (suffixResolved) {
            const suffixValue = getTagValue(props, {
              attribute: suffixResolved.keyword,
              tag: suffixResolved.tag,
              source: suffixSource,
            });
            const suffixFormatted = formatTagValue(suffixValue, suffixFormat, props.formatters);
            if (suffixFormatted) {
              const template = definition.suffixTemplate || ' ({value})';
              text = `${text}${template.replace('{value}', suffixFormatted)}`;
            }
          }
          if (definition.suffix) {
            text = `${text}${definition.suffix}`;
          }
          return text;
        },
      };
    })
    .filter(Boolean);
};

const dedupeItems = items => {
  const seen = new Set();
  const result = [];

  items.forEach(item => {
    if (!item) {
      return;
    }
    const key = item.id || item.attribute || item.tag;
    if (key && seen.has(key)) {
      return;
    }
    if (key) {
      seen.add(key);
    }
    result.push(item);
  });

  return result;
};

const baseTopLeftItems = [
  // Top Left
  {
    id: 'StudyDate',
    inheritsFrom: 'ohif.overlayItem',
    label: '',
    title: 'Study date',
    className: DEFAULT_CLASSNAME,
    condition: ({ referenceInstance }) => referenceInstance?.StudyDate,
    contentF: ({ referenceInstance, formatters: { formatDate } }) =>
      formatDate(referenceInstance.StudyDate),
  },
  {
    id: 'SeriesNumber',
    inheritsFrom: 'ohif.overlayItem',
    label: '',
    title: 'SeriesNumber',
    className: DEFAULT_CLASSNAME,
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
    className: DEFAULT_CLASSNAME,
    condition: ({ referenceInstance }) => {
      return referenceInstance && referenceInstance.SeriesDescription;
    },
    contentF: ({ referenceInstance }) => referenceInstance.SeriesDescription,
  },
];

const baseTopRightItems = [
  {
    id: 'PatientName',
    inheritsFrom: 'ohif.overlayItem',
    label: '',
    title: 'PatientName',
    className: DEFAULT_CLASSNAME,
    condition: ({ referenceInstance }) => {
      return (
        referenceInstance &&
        referenceInstance.PatientName &&
        referenceInstance.PatientName.Alphabetic
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
    className: DEFAULT_CLASSNAME,
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
    className: DEFAULT_CLASSNAME,
    condition: ({ referenceInstance }) => {
      return referenceInstance && referenceInstance.AccessionNumber;
    },
    contentF: ({ referenceInstance }) => referenceInstance.AccessionNumber,
  },
];

const storicoLabelItem = {
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
};

const linkedSeriesBadgeItem = {
  id: 'LinkedSeriesBadge',
  inheritsFrom: 'ohif.overlayItem.linkedSeries',
};

const buildViewportOverlayCustomizations = overlayConfig => {
  const tagConfig = getTagConfig(overlayConfig);

  const configuredTopLeftItems = buildTagItemsFromConfig(getCornerConfig(tagConfig, 'topLeft'));
  const configuredTopRightItems = buildTagItemsFromConfig(
    getCornerConfig(tagConfig, 'topRight')
  );
  const configuredBottomLeftItems = buildTagItemsFromConfig(
    getCornerConfig(tagConfig, 'bottomLeft')
  );
  const configuredBottomRightItems = buildTagItemsFromConfig(
    getCornerConfig(tagConfig, 'bottomRight')
  );

  const topLeftItems = dedupeItems(
    [
      linkedSeriesBadgeItem,
      ...(hasCornerConfig(tagConfig, 'topLeft') ? configuredTopLeftItems : baseTopLeftItems),
      storicoLabelItem,
    ].filter(Boolean)
  );

  const topRightItems = dedupeItems(
    hasCornerConfig(tagConfig, 'topRight') ? configuredTopRightItems : baseTopRightItems
  );

  const bottomLeftItems = dedupeItems([
    //Bottom Left
    {
      id: 'WindowLevel',
      inheritsFrom: 'ohif.overlayItem.windowLevel',
      className: DEFAULT_CLASSNAME,
    },
    {
      id: 'ZoomLevel',
      inheritsFrom: 'ohif.overlayItem.zoomLevel',
      className: DEFAULT_CLASSNAME,
    },
    ...configuredBottomLeftItems,
  ]);

  const bottomRightItems = dedupeItems([
    //Bottom Right
    {
      id: 'InstanceNumber',
      inheritsFrom: 'ohif.overlayItem.instanceNumber',
      className: DEFAULT_CLASSNAME,
    },
    ...configuredBottomRightItems,
  ]);

  return {
    'viewportOverlay.topLeft': topLeftItems,
    //Top Right
    'viewportOverlay.topRight': topRightItems,
    'viewportOverlay.bottomLeft': bottomLeftItems,
    'viewportOverlay.bottomRight': bottomRightItems,
  };
};

if (typeof window !== 'undefined') {
  window.nolexBuildViewportOverlayCustomizations = buildViewportOverlayCustomizations;
  window.nolexApplyViewportOverlayIfReady = () => {
    const pending =
      window.nolexViewportOverlayPending || window?.config?.viewportOverlayTags;
    if (!pending) {
      return false;
    }
    const customizationService = window.servicesManager?.services?.customizationService;
    if (!customizationService || typeof buildViewportOverlayCustomizations !== 'function') {
      return false;
    }
    try {
      const customizations = buildViewportOverlayCustomizations(pending);
      const scope =
        customizationService.Scope?.Global || customizationService.Scope?.Mode;
      customizationService.setCustomizations(customizations, scope);
      window.nolexViewportOverlayPending = null;
      return true;
    } catch (err) {
      console.warn('Overlay viewport: impossibile applicare le preferenze', err);
      return false;
    }
  };
  setTimeout(() => {
    window.nolexApplyViewportOverlayIfReady?.();
  }, 0);
}

const defaultCustomizations = buildViewportOverlayCustomizations();

export { buildViewportOverlayCustomizations };
export default defaultCustomizations;
