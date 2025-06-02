/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Job } from './Job';
import type { JobApplication } from './JobApplication';
export type JobDetails = {
    job: Job;
    is_author: boolean;
    can_apply: boolean;
    has_applied: boolean;
    applications?: Array<JobApplication> | null;
};

