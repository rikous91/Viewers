import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import ThumbnailList from '../ThumbnailList';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../Accordion';
import openStorico from '../../../../app/public/estensioni/aperturaStorico/aperturaStorico.js';

const StudyItem = ({
  studyInstanceUID,
  date,
  description,
  numInstances,
  modalities,
  isActive,
  onClick,
  isExpanded,
  displaySets,
  activeDisplaySetInstanceUIDs,
  onClickThumbnail,
  onDoubleClickThumbnail,
  onClickUntrack,
  viewPreset = 'thumbnails',
  isStorico,
}) => {
  const isStudyUIDDefined =
    studyInstanceUID !== undefined && studyInstanceUID !== null && studyInstanceUID !== '';
  return (
    <Accordion
      type="single"
      collapsible
      onClick={onClick}
      onKeyDown={onClick}
      role="button"
      tabIndex={0}
      defaultValue={isActive ? 'study-item' : undefined}
    >
      <AccordionItem value="study-item">
        <AccordionTrigger className={classnames('hover:bg-accent bg-popover rounded')}>
          <div className="flex h-[40px] flex-1 flex-row">
            <div className="flex w-full flex-row items-center justify-between">
              <div className="flex flex-col items-start text-[13px]">
                <div className="text-white">{date}</div>
                <div className="text-muted-foreground _truncate _whitespace-nowrap max-w-[160px] overflow-hidden">
                  {description}
                </div>
              </div>
              <div className="text-muted-foreground mr-2 flex flex-col items-end text-[12px]">
                <div>{modalities}</div>
                <div>{numInstances}</div>
              </div>
            </div>
          </div>
        </AccordionTrigger>
        {isStorico && isStudyUIDDefined && (
          <div className="open-study-new-tab">
            <button
              style={{
                opacity: 0.2,
              }}
              disabled
              onClick={() => openStorico('stessaScheda', studyInstanceUID)}
            >
              Importa in questa scheda
            </button>
            <button onClick={() => openStorico('nuovaScheda', studyInstanceUID)}>
              Apri in una nuova scheda
            </button>
          </div>
        )}
        <AccordionContent
          onClick={event => {
            event.stopPropagation();
          }}
        >
          {isExpanded && displaySets && (
            <ThumbnailList
              thumbnails={displaySets}
              activeDisplaySetInstanceUIDs={activeDisplaySetInstanceUIDs}
              onThumbnailClick={onClickThumbnail}
              onThumbnailDoubleClick={onDoubleClickThumbnail}
              onClickUntrack={onClickUntrack}
              viewPreset={viewPreset}
            />
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

StudyItem.propTypes = {
  studyInstanceUID: PropTypes.string.isRequired,
  date: PropTypes.string.isRequired,
  description: PropTypes.string,
  modalities: PropTypes.string.isRequired,
  numInstances: PropTypes.number.isRequired,
  trackedSeries: PropTypes.number,
  isActive: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  isExpanded: PropTypes.bool,
  displaySets: PropTypes.array,
  activeDisplaySetInstanceUIDs: PropTypes.array,
  onClickThumbnail: PropTypes.func,
  onDoubleClickThumbnail: PropTypes.func,
  onClickUntrack: PropTypes.func,
  viewPreset: PropTypes.string,
  isStorico: PropTypes.bool,
};

export default StudyItem;
