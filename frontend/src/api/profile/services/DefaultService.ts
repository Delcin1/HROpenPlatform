/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiGetProfile } from '../models/ApiGetProfile';
import type { Experience } from '../models/Experience';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DefaultService {
    /**
     * Получить данные чужого профиля
     * @param guid
     * @returns ApiGetProfile Successful operation
     * @throws ApiError
     */
    public static getProfileByGuid(
        guid: string,
    ): CancelablePromise<ApiGetProfile> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/profile/{guid}',
            path: {
                'guid': guid,
            },
            errors: {
                401: `Unauthorized`,
                404: `Not found`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Получить данные опыта работы чужого профиля
     * @param guid
     * @returns Experience Successful operation
     * @throws ApiError
     */
    public static getExperienceByGuid(
        guid: string,
    ): CancelablePromise<Array<Experience>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/profile/{guid}/experience',
            path: {
                'guid': guid,
            },
            errors: {
                401: `Unauthorized`,
                404: `Not found`,
                500: `Internal Server Error`,
            },
        });
    }
}
