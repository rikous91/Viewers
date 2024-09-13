declare global {
  interface Window {
    erroriFetch: (error: string) => void;
  }
}

window.erroriFetch = error => {
  if (
    error.message &&
    error.message.includes("Couldn't retrieve") &&
    error.message.includes('frames/')
  ) {
    document.body.insertAdjacentHTML(
      'beforeend',
      `
      <div id="error-overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 2em;
        z-index: 9999;
      ">
        <p>Sessione scaduta</p>
      </div>
    `
    );
  }
};

export { };
