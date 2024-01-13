import { WebpackModule } from './module';

export class WebpackChunk {
  id: string;
  entryIds: string[];
  modules: Map<string, WebpackModule>;

  constructor(
    id: string,
    entryIds: string[],
    modules: Map<string, WebpackModule>,
  ) {
    this.id = id;
    this.entryIds = entryIds;
    this.modules = modules;
  }
}
