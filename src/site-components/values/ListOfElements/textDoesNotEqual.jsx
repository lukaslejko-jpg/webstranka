import { caseDoesNotEqual } from '../Text/caseDoesNotEqual';
import { toText } from './toText';
export const textDoesNotEqual = (config) => (value) => caseDoesNotEqual(config)(toText(value));
