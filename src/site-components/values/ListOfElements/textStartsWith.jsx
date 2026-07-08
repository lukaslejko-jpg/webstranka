import { caseStartsWith } from '../Text/caseStartsWith';
import { toText } from './toText';
export const textStartsWith = (config) => (value) => caseStartsWith(config)(toText(value));
