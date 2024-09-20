const openStorico = (modalita, studyInstanceUID) => {
  if (modalita === 'nuovaScheda') {
    const currentUrl = window.location.href;
    const url = new URL(currentUrl);
    const params = new URLSearchParams(url.search);

    params.set('StudyInstanceUIDs', studyInstanceUID);

    const newUrl = `${url.origin}${url.pathname}?${params.toString()}`;

    window.open(newUrl, '_blank');
  }
};

export default openStorico;
