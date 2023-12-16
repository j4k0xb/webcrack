import { Bundle } from '../bundle';
import { BrowserifyModule } from './module';

export class BrowserifyBundle extends Bundle {
  constructor(entryId: string, modules: Map<string, BrowserifyModule>) {
    super('browserify', entryId, modules);
  }
}
