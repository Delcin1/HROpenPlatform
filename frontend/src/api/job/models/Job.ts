/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Job = {
    id: string;
    title: string;
    company_name: string;
    location: string;
    employment_type: Job.employment_type;
    salary_from: number | null;
    salary_to?: number | null;
    description: string;
    requirements: string;
    author_id: string;
    created_at: string;
    updated_at: string;
    status: Job.status;
};
export namespace Job {
    export enum employment_type {
        FULL_TIME = 'full-time',
        PART_TIME = 'part-time',
        CONTRACT = 'contract',
        INTERNSHIP = 'internship',
        REMOTE = 'remote',
    }
    export enum status {
        ACTIVE = 'active',
        PAUSED = 'paused',
        CLOSED = 'closed',
    }
}

