import { caseDoesNotContain } from '../Text/caseDoesNotContain';
import { toText } from './toText';
export const textDoesNotContain = (config) => (value) => caseDoesNotContain(config)(toText(value));
