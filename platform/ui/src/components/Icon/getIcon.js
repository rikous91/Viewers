import hpIcon from './../../assets/icons/hp.png';
import logoNolex from './../../assets/icons/logo_nolex.png';
import mprDirect from './../../assets/icons/mpr.png';
import preferiti from './../../assets/icons/preferiti.png';
import preferitiActive from './../../assets/icons/preferiti-active.png';
import { ReactComponent as storicoExpand } from './../../assets/icons/storico-expand.svg';
import { ReactComponent as storicoSameWindow } from './../../assets/icons/storico-same-window.svg';
import { ReactComponent as storicoNewWindow } from './../../assets/icons/storico-new-window.svg';
import { ReactComponent as hideInfoDicom } from './../../assets/icons/tool-hide-info-dicom.svg';
import { ReactComponent as toolStackScroll } from './../../assets/icons/tool-stack-scroll.svg';

import React from 'react';

const ICONS = {
  /** Tools */
  toolStackScroll: toolStackScroll,
  /** Nolex **/
  hideInfoDicom: hideInfoDicom,
  storicoExpand: storicoExpand,
  storicoSameWindow: storicoSameWindow,
  storicoNewWindow: storicoNewWindow,
  preferiti: preferiti,
  preferitiActive: preferitiActive,
  logoNolex: logoNolex,
  hpIcon: hpIcon,
  mprDirect: mprDirect,
};

function addIcon(iconName, iconSVG) {
  if (ICONS[iconName]) {
    console.warn(`Icon ${iconName} already exists.`);
  }

  ICONS[iconName] = iconSVG;
}

/**
 * Return the matching SVG Icon as a React Component.
 * Results in an inlined SVG Element. If there's no match,
 * return `null`
 */
export default function getIcon(key, props) {
  const icon = ICONS[key];

  if (!key || !icon) {
    return React.createElement('div', null, 'Missing Icon ' + key);
  }

  if (typeof icon === 'string' && icon.endsWith('.png')) {
    return React.createElement('img', { src: icon, ...props });
  } else {
    return React.createElement(icon, props);
  }
}

export { getIcon, ICONS, addIcon };
