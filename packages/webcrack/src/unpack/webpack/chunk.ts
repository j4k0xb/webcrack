import type { WebpackModule } from './module';

export class WebpackChunk {
  chunkIds: string[];
  entryIds: string[];
  modules: Map<string, WebpackModule>;

  constructor(
    id: string[],
    entryIds: string[],
    modules: Map<string, WebpackModule>,
  ) {
    this.chunkIds = id;
    this.entryIds = entryIds;
    this.modules = modules;
  }
}
