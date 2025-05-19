/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiCreateCompany } from '../models/ApiCreateCompany';
import type { ApiGetCompany } from '../models/ApiGetCompany';
import type { ApiSearchCompanyResp } from '../models/ApiSearchCompanyResp';
import type { ApiUpdateCompany } from '../models/ApiUpdateCompany';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CompanyService {
    /**
     * Создать компанию
     * @param requestBody
     * @returns ApiGetCompany successful operation
     * @throws ApiError
     */
    public static createCompanyProfile(
        requestBody: ApiCreateCompany,
    ): CancelablePromise<ApiGetCompany> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/company',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad request`,
                401: `Unauthorized`,
                403: `Forbidden`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Получить данные компании
     * @param companyId GUID или уникальное название компании
     * @returns ApiGetCompany successful operation
     * @throws ApiError
     */
    public static fetchCompany(
        companyId: string,
    ): CancelablePromise<ApiGetCompany> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/company/{company_id}',
            path: {
                'company_id': companyId,
            },
            errors: {
                401: `Unauthorized`,
                404: `Not found`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Изменить данные компании
     * @param companyId GUID или уникальное название компании
     * @param requestBody
     * @returns ApiGetCompany successful operation
     * @throws ApiError
     */
    public static updateCompanyProfile(
        companyId: string,
        requestBody: ApiUpdateCompany,
    ): CancelablePromise<ApiGetCompany> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/company/{company_id}',
            path: {
                'company_id': companyId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad request`,
                401: `Unauthorized`,
                403: `Forbidden`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Удалить компанию
     * @param companyId GUID или уникальное название компании
     * @returns any successful operation
     * @throws ApiError
     */
    public static deleteCompany(
        companyId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/company/{company_id}',
            path: {
                'company_id': companyId,
            },
            errors: {
                401: `Unauthorized`,
                403: `Forbidden`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Получить данные чужой компании по названию
     * @param name Часть названия компании
     * @returns ApiSearchCompanyResp successful operation
     * @throws ApiError
     */
    public static searchCompanyByName(
        name: string,
    ): CancelablePromise<ApiSearchCompanyResp> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/company/search',
            query: {
                'name': name,
            },
            errors: {
                401: `Unauthorized`,
                404: `Not found`,
                500: `Internal Server Error`,
            },
        });
    }
}
