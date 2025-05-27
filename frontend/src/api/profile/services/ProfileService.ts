/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiGetExperience } from '../models/ApiGetExperience';
import type { ApiGetProfile } from '../models/ApiGetProfile';
import type { ApiSearchProfileResp } from '../models/ApiSearchProfileResp';
import type { ApiUpdateProfile } from '../models/ApiUpdateProfile';
import type { Experience } from '../models/Experience';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ProfileService {
    /**
     * Получить данные профиля
     * @returns ApiGetProfile successful operation
     * @throws ApiError
     */
    public static fetchOwnProfile(): CancelablePromise<ApiGetProfile> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/profile',
            errors: {
                401: `Unauthorized`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Изменить данных профиля
     * @param requestBody
     * @returns ApiGetProfile successful operation
     * @throws ApiError
     */
    public static storeOwnProfile(
        requestBody: ApiUpdateProfile,
    ): CancelablePromise<ApiGetProfile> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/profile',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad request`,
                401: `Unauthorized`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Удалить профиль
     * @returns any successful operation
     * @throws ApiError
     */
    public static deleteOwnProfile(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/profile',
            errors: {
                401: `Unauthorized`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Найти данные чужого профиля по части ФИО
     * @param description Часть ФИО
     * @returns ApiSearchProfileResp successful operation
     * @throws ApiError
     */
    public static searchProfileByDescription(
        description: string,
    ): CancelablePromise<ApiSearchProfileResp> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/profile/search',
            query: {
                'description': description,
            },
            errors: {
                401: `Unauthorized`,
                404: `Not found`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Получить данные опыта работы
     * @returns ApiGetExperience successful operation
     * @throws ApiError
     */
    public static fetchOwnExperience(): CancelablePromise<ApiGetExperience> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/profile/experience',
            errors: {
                401: `Unauthorized`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Изменить данные опыта работы
     * @param requestBody
     * @returns ApiGetExperience successful operation
     * @throws ApiError
     */
    public static storeOwnExperience(
        requestBody: Experience,
    ): CancelablePromise<ApiGetExperience> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/profile/experience',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad request`,
                401: `Unauthorized`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Удалить опыт работы
     * @param guid
     * @returns any successful operation
     * @throws ApiError
     */
    public static deleteOwnExperience(
        guid: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/profile/experience',
            query: {
                'guid': guid,
            },
            errors: {
                401: `Unauthorized`,
                500: `Internal Server Error`,
            },
        });
    }
}
