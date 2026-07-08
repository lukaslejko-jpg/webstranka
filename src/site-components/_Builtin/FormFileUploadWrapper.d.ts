import React from 'react';
import { Props } from './shared/types';
type FileUploadWrapperProps = Props<'div'> & {
    maxSize?: number;
};
export type { FileUploadWrapperProps };
export declare const _FormFileUploadWrapper: React.ForwardRefExoticComponent<import("./shared/types").ElementProps<"div"> & {
    children?: React.ReactNode | undefined;
} & {
    maxSize?: number;
} & React.RefAttributes<unknown>>;
declare const FormFileUploadWrapper: React.ForwardRefExoticComponent<import("./shared/types").ElementProps<"div"> & {
    children?: React.ReactNode | undefined;
} & {
    maxSize?: number;
} & React.RefAttributes<unknown>>;
export default FormFileUploadWrapper;
