import Sandybox from "sandybox";

const sandbox = await Sandybox.create();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function evalCode(code: string) {
  const fn = await sandbox.addFunction(`() => ${code}`);
  return Promise.race([
    fn(),
    sleep(10_000).then(() => Promise.reject("Sandbox timeout")),
  ]).finally(() => sandbox.removeFunction(fn));
}
