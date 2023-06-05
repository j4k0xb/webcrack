import { Bundle } from '../bundle';
import { ParcelModule } from './module';

export class ParcelBundle extends Bundle {
  constructor(entryId: string, modules: Map<string, ParcelModule>) {
    super('parcel', entryId, modules);
  }
}
