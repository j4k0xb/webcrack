import { mergeTransforms } from '../ast-utils';
import * as transforms from './transforms';

export default mergeTransforms({
  name: 'transpile',
  tags: ['safe'],
  transforms: Object.values(transforms),
});
