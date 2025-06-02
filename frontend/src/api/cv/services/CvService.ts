/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiUploadCVResp } from '../models/ApiUploadCVResp';
import type { MatchCandidatesResponse } from '../models/MatchCandidatesResponse';
import type { ResumeRecord } from '../models/ResumeRecord';
import type { UploadDatabaseResponse } from '../models/UploadDatabaseResponse';
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
    /**
     * Загрузить архив с базой резюме
     * @param formData
     * @returns UploadDatabaseResponse Архив обработан успешно
     * @throws ApiError
     */
    public static uploadResumeDatabase(
        formData?: {
            /**
             * ZIP архив содержащий PDF, TXT, DOC, DOCX файлы резюме
             */
            archive?: Blob;
        },
    ): CancelablePromise<UploadDatabaseResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/cv/database/upload',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                400: `Bad request`,
                401: `Unauthorized`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Получить базу резюме пользователя
     * @param limit
     * @param offset
     * @returns ResumeRecord successful operation
     * @throws ApiError
     */
    public static getResumeDatabase(
        limit: number = 20,
        offset?: number,
    ): CancelablePromise<Array<ResumeRecord>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/cv/database',
            query: {
                'limit': limit,
                'offset': offset,
            },
            errors: {
                401: `Unauthorized`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Подобрать кандидатов из базы резюме для вакансии
     * @param jobId
     * @returns MatchCandidatesResponse successful operation
     * @throws ApiError
     */
    public static matchCandidatesFromDatabase(
        jobId: string,
    ): CancelablePromise<MatchCandidatesResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/cv/database/match/{job_id}',
            path: {
                'job_id': jobId,
            },
            errors: {
                401: `Unauthorized`,
                403: `Forbidden - not job author`,
                404: `Job not found`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Получить резюме по имени файла
     * @param filename Имя файла резюме
     * @returns binary successful operation
     * @throws ApiError
     */
    public static getCvByFilename(
        filename: string,
    ): CancelablePromise<Blob> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/cv/{filename}',
            path: {
                'filename': filename,
            },
            errors: {
                400: `Bad request`,
                401: `Unauthorized`,
                404: `CV file not found`,
                500: `Internal Server Error`,
            },
        });
    }
}
