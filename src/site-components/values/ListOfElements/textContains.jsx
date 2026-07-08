import { caseContains } from '../Text/caseContains';
import { toText } from './toText';
export const textContains = (config) => (value) => caseContains(config)(toText(value));
