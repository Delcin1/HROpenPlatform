/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ApplicationStatus = {
    has_applied: boolean;
    application_id: string | null;
    status: ApplicationStatus.status | null;
};
export namespace ApplicationStatus {
    export enum status {
        PENDING = 'pending',
        REVIEWED = 'reviewed',
        ACCEPTED = 'accepted',
        REJECTED = 'rejected',
    }
}

