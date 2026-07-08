import { isSet } from '../Text/isSet';
import { toText } from './toText';
export const textIsSet = (value) => isSet(toText(value));
