/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Chat } from './Chat';
import type { Message } from './Message';
export type ChatWithLastMessage = {
    chat: Chat;
    last_message?: Message;
    unread_count: number;
};

