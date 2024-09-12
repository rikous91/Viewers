import React, { useState, useEffect, ReactElement } from 'react';
import classNames from 'classnames';

import Icon from '../Icon';
import ProgressLoadingBar from '../ProgressLoadingBar';

/**
 *  A React component that renders a loading indicator.
 * if progress is not provided, it will render an infinite loading indicator
 * if progress is provided, it will render a progress bar
 * Optionally a textBlock can be provided to display a message
 */
function LoadingIndicatorProgress({ className, textBlock, progress }) {
  const [_progress, setProgress] = useState<number | undefined>(0);
  useEffect(() => {
    const updateProgress = () => {
      setProgress(prevProgress => {
        if (prevProgress === undefined) {
          return 0;
        }
        if (prevProgress >= 100) {
          return 100; // Imposta il massimo a 100%
        }
        // Incrementa il progresso con un valore casuale tra 10 e 30
        const randomIncrement = Math.floor(Math.random() * 21) + 10;
        return Math.min(prevProgress + randomIncrement, 100); // Evita di superare il 100%
      });

      // Imposta un intervallo casuale tra 100ms e 500ms per il prossimo aggiornamento
      const randomInterval = Math.floor(Math.random() * 401) + 100;
      setTimeout(updateProgress, randomInterval);
    };

    // Avvia l'aggiornamento del progresso
    updateProgress();

    // Non c'è bisogno di pulire setTimeout come si fa con setInterval
  }, []);

  return (
    <div
      className={classNames(
        'absolute top-0 left-0 z-50 flex flex-col items-center justify-center space-y-5',
        className
      )}
    >
      <Icon
        name="lodading-ohif-mark"
        className="loading-indicator h-12 w-12 text-white"
      />
      <div className="w-48">
        <ProgressLoadingBar progress={_progress} />
      </div>
      {textBlock}
    </div>
  );
}

export default LoadingIndicatorProgress;
