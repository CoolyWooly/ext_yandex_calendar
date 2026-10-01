/** Страница внутри iframe сообщает сцене, что отрисовалась, и свою высоту. */
export async function reportReady(): Promise<void> {
  await document.fonts.ready;
  await new Promise((resolve) => setTimeout(resolve, 300));
  parent.postMessage({ type: 'ready', name: window.name, height: document.documentElement.scrollHeight }, '*');
}
