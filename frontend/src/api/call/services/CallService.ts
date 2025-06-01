/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Call } from '../models/Call';
import type { CallWithTranscript } from '../models/CallWithTranscript';
import type { CreateCallRequest } from '../models/CreateCallRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CallService {
    /**
     * Create new call
     * @param requestBody
     * @returns Call Call created
     * @throws ApiError
     */
    public static createCall(
        requestBody: CreateCallRequest,
    ): CancelablePromise<Call> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/call',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Unauthorized`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * WebSocket connection for real-time video call and speech recognition
     * @param callId
     * @param token
     * @param connection
     * @param upgrade
     * @param secWebSocketVersion
     * @param secWebSocketKey
     * @returns void
     * @throws ApiError
     */
    public static handleWebSocket(
        callId: string,
        token: string,
        connection: 'upgrade',
        upgrade: 'websocket',
        secWebSocketVersion: 13,
        secWebSocketKey: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/call/{call_id}/ws',
            path: {
                'call_id': callId,
            },
            headers: {
                'Connection': connection,
                'Upgrade': upgrade,
                'Sec-WebSocket-Version': secWebSocketVersion,
                'Sec-WebSocket-Key': secWebSocketKey,
            },
            query: {
                'token': token,
            },
            errors: {
                401: `Unauthorized`,
                404: `Call not found`,
            },
        });
    }
    /**
     * Get call history with transcripts
     * @param limit
     * @param offset
     * @returns CallWithTranscript Successful operation
     * @throws ApiError
     */
    public static getCallHistory(
        limit: number = 50,
        offset?: number,
    ): CancelablePromise<Array<CallWithTranscript>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/call/history',
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
}
