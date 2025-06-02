/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreateJobRequest = {
    title: string;
    company_name: string;
    location: string;
    employment_type: CreateJobRequest.employment_type;
    salary_from?: number | null;
    salary_to?: number | null;
    description: string;
    requirements: string;
};
export namespace CreateJobRequest {
    export enum employment_type {
        FULL_TIME = 'full-time',
        PART_TIME = 'part-time',
        CONTRACT = 'contract',
        INTERNSHIP = 'internship',
        REMOTE = 'remote',
    }
}

