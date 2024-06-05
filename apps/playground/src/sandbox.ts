import Sandybox from 'sandybox';

const sandbox = await Sandybox.create();
const iframe = document.querySelector<HTMLIFrameElement>('.sandybox');
iframe?.contentDocument?.head.insertAdjacentHTML(
  'afterbegin',
  `<meta http-equiv="Content-Security-Policy" content="default-src 'none';">`,
);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function evalCode(code: string) {
  const fn = await sandbox.addFunction(`() => ${code}`);
  return Promise.race([
    fn(),
    sleep(10_000).then(() => Promise.reject(new Error('Sandbox timeout'))),
  ]).finally(() => sandbox.removeFunction(fn));
}
