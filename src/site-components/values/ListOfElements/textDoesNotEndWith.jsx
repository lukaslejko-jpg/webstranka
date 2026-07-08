import { caseDoesNotEndWith } from '../Text/caseDoesNotEndWith';
import { toText } from './toText';
export const textDoesNotEndWith = (config) => (value) => caseDoesNotEndWith(config)(toText(value));
