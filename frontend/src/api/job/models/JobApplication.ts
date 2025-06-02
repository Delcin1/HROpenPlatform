/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApplicantProfile } from './ApplicantProfile';
export type JobApplication = {
    id: string;
    job_id: string;
    applicant_id: string;
    applicant_profile: ApplicantProfile;
    applied_at: string;
    status: JobApplication.status;
};
export namespace JobApplication {
    export enum status {
        PENDING = 'pending',
        REVIEWED = 'reviewed',
        ACCEPTED = 'accepted',
        REJECTED = 'rejected',
    }
}

