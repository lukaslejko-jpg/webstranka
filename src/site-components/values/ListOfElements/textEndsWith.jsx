import { caseEndsWith } from '../Text/caseEndsWith';
import { toText } from './toText';
export const textEndsWith = (config) => (value) => caseEndsWith(config)(toText(value));
