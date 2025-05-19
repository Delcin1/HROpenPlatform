/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiUploadCVResp } from '../models/ApiUploadCVResp';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CvService {
    /**
     * Загрузить резюме
     * @param formData
     * @returns ApiUploadCVResp successful operation
     * @throws ApiError
     */
    public static uploadCv(
        formData?: {
            file?: Blob;
        },
    ): CancelablePromise<ApiUploadCVResp> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/cv/upload',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                400: `Bad request`,
                401: `Unauthorized`,
                500: `Internal Server Error`,
            },
        });
    }
}
