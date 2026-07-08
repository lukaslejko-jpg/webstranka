import { isNotSet } from '../Text/isNotSet';
import { toText } from './toText';
export const textIsNotSet = (value) => isNotSet(toText(value));
