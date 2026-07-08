import { caseDoesNotStartWith } from '../Text/caseDoesNotStartWith';
import { toText } from './toText';
export const textDoesNotStartWith = (config) => (value) => caseDoesNotStartWith(config)(toText(value));
