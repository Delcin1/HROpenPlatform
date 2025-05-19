/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ApiLoginResp = {
    /**
     * JWT access token
     */
    access_token?: string;
    /**
     * JWT refresh token
     */
    refresh_token?: string;
    /**
     * Token expiration time in seconds
     */
    expires_in?: number;
    token_type?: ApiLoginResp.token_type;
};
export namespace ApiLoginResp {
    export enum token_type {
        BEARER = 'Bearer',
    }
}

