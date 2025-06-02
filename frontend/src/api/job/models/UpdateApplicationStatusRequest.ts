/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UpdateApplicationStatusRequest = {
    status: UpdateApplicationStatusRequest.status;
};
export namespace UpdateApplicationStatusRequest {
    export enum status {
        PENDING = 'pending',
        REVIEWED = 'reviewed',
        ACCEPTED = 'accepted',
        REJECTED = 'rejected',
    }
}

