import { Bundle } from '../bundle';
import { BrowserifyModule } from './module';

export class BrowserifyBundle extends Bundle {
  constructor(entryId: number, modules: Map<number, BrowserifyModule>) {
    super('browserify', entryId, modules);
  }
}
