import { caseEquals } from '../Text/caseEquals';
import { toText } from './toText';
export const textEquals = (config) => (value) => caseEquals(config)(toText(value));
