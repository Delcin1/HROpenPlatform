/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiLogin } from '../models/ApiLogin';
import type { ApiLoginResp } from '../models/ApiLoginResp';
import type { ApiRegister } from '../models/ApiRegister';
import type { ApiRestore } from '../models/ApiRestore';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AuthService {
    /**
     * Авторизация
     * @param requestBody
     * @returns ApiLoginResp successful operation
     * @throws ApiError
     */
    public static login(
        requestBody: ApiLogin,
    ): CancelablePromise<ApiLoginResp> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/login',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad request`,
                401: `Unauthorized`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Выход
     * @returns any successful operation
     * @throws ApiError
     */
    public static logout(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/logout',
            errors: {
                401: `Unauthorized`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Обновление токена
     * @returns ApiLoginResp successful operation
     * @throws ApiError
     */
    public static refresh(): CancelablePromise<ApiLoginResp> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/refresh',
            errors: {
                401: `Unauthorized`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Регистрация
     * @param requestBody
     * @returns ApiLoginResp successful operation
     * @throws ApiError
     */
    public static register(
        requestBody: ApiRegister,
    ): CancelablePromise<ApiLoginResp> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/register',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad request`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Восстановление пароля
     * @param requestBody
     * @returns any successful operation
     * @throws ApiError
     */
    public static restore(
        requestBody: ApiRestore,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/restore',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad request`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
}
