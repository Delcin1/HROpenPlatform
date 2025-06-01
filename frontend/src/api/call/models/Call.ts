/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CallParticipant } from './CallParticipant';
export type Call = {
    id: string;
    participants: Array<CallParticipant>;
    created_at: string;
    ended_at?: string | null;
    status: Call.status;
};
export namespace Call {
    export enum status {
        ACTIVE = 'active',
        ENDED = 'ended',
    }
}

