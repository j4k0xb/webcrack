import { Bundle } from '../bundle';
import { relativePath } from '../path';
import { convertESM } from './esm';
import { convertDefaultRequire } from './getDefaultExport';
import type { WebpackModule } from './module';

export class WebpackBundle extends Bundle {
  declare modules: Map<string, WebpackModule>;

  constructor(entryId: string, modules: Map<string, WebpackModule>) {
    super('webpack', entryId, modules);
  }

  /**
   * Undoes some of the transformations that Webpack injected into the modules.
   */
  applyTransforms(): void {
    this.modules.forEach((module) => {
      module.replaceRequireCalls((id) => {
        const requiredModule = this.modules.get(id);
        return requiredModule
          ? { path: relativePath(module.path, requiredModule.path) }
          : { path: id, external: true };
      });
      convertESM(module);
    });
    convertDefaultRequire(this);
  }
}
