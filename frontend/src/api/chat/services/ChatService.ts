/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Chat } from '../models/Chat';
import type { ChatWithLastMessage } from '../models/ChatWithLastMessage';
import type { CreateChatRequest } from '../models/CreateChatRequest';
import type { Message } from '../models/Message';
import type { SendMessageRequest } from '../models/SendMessageRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ChatService {
    /**
     * Get user chats
     * @returns ChatWithLastMessage Successful operation
     * @throws ApiError
     */
    public static getUserChats(): CancelablePromise<Array<ChatWithLastMessage>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/chat',
            errors: {
                401: `Unauthorized`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Create new chat
     * @param requestBody
     * @returns Chat Chat created
     * @throws ApiError
     */
    public static createChat(
        requestBody: CreateChatRequest,
    ): CancelablePromise<Chat> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/chat',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Unauthorized`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Get chat messages
     * @param chatId
     * @param limit
     * @param offset
     * @returns Message Successful operation
     * @throws ApiError
     */
    public static getChatMessages(
        chatId: string,
        limit: number = 50,
        offset?: number,
    ): CancelablePromise<Array<Message>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/chat/{chat_id}/messages',
            path: {
                'chat_id': chatId,
            },
            query: {
                'limit': limit,
                'offset': offset,
            },
            errors: {
                401: `Unauthorized`,
                404: `Chat not found`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Send message
     * @param chatId
     * @param requestBody
     * @returns Message Message sent
     * @throws ApiError
     */
    public static sendMessage(
        chatId: string,
        requestBody: SendMessageRequest,
    ): CancelablePromise<Message> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/chat/{chat_id}/messages',
            path: {
                'chat_id': chatId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Unauthorized`,
                404: `Chat not found`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * WebSocket connection for real-time chat
     * @param chatId
     * @returns void
     * @throws ApiError
     */
    public static handleWebSocket(
        chatId: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/chat/{chat_id}/ws',
            path: {
                'chat_id': chatId,
            },
            errors: {
                401: `Unauthorized`,
                404: `Chat not found`,
            },
        });
    }
}
