import React from 'react';
import { FileUploadErrors } from './shared/fileUploadContext';
declare const FormFileUploadErrorMsg: React.ForwardRefExoticComponent<HTMLDivElement & {
    errors: FileUploadErrors;
    className?: string;
} & React.RefAttributes<unknown>>;
export default FormFileUploadErrorMsg;
