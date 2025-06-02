/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApplicationStatus } from '../models/ApplicationStatus';
import type { CreateJobRequest } from '../models/CreateJobRequest';
import type { Job } from '../models/Job';
import type { JobApplication } from '../models/JobApplication';
import type { JobDetails } from '../models/JobDetails';
import type { JobWithApplications } from '../models/JobWithApplications';
import type { UpdateApplicationStatusRequest } from '../models/UpdateApplicationStatusRequest';
import type { UpdateJobRequest } from '../models/UpdateJobRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class JobService {
    /**
     * Get all jobs with search
     * @param search
     * @param limit
     * @param offset
     * @returns Job Successful operation
     * @throws ApiError
     */
    public static getAllJobs(
        search?: string,
        limit: number = 20,
        offset?: number,
    ): CancelablePromise<Array<Job>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/job',
            query: {
                'search': search,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Create new job
     * @param requestBody
     * @returns Job Job created
     * @throws ApiError
     */
    public static createJob(
        requestBody: CreateJobRequest,
    ): CancelablePromise<Job> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/job',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Unauthorized`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Get my published jobs
     * @param limit
     * @param offset
     * @returns JobWithApplications Successful operation
     * @throws ApiError
     */
    public static getMyJobs(
        limit: number = 20,
        offset?: number,
    ): CancelablePromise<Array<JobWithApplications>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/job/my',
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
    /**
     * Get job by ID
     * @param jobId
     * @returns JobDetails Successful operation
     * @throws ApiError
     */
    public static getJobById(
        jobId: string,
    ): CancelablePromise<JobDetails> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/job/{job_id}',
            path: {
                'job_id': jobId,
            },
            errors: {
                404: `Job not found`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Update job
     * @param jobId
     * @param requestBody
     * @returns Job Job updated
     * @throws ApiError
     */
    public static updateJob(
        jobId: string,
        requestBody: UpdateJobRequest,
    ): CancelablePromise<Job> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/job/{job_id}',
            path: {
                'job_id': jobId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Unauthorized`,
                403: `Forbidden`,
                404: `Job not found`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Delete job
     * @param jobId
     * @returns void
     * @throws ApiError
     */
    public static deleteJob(
        jobId: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/job/{job_id}',
            path: {
                'job_id': jobId,
            },
            errors: {
                401: `Unauthorized`,
                403: `Forbidden`,
                404: `Job not found`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Apply to job
     * @param jobId
     * @returns any Application submitted
     * @throws ApiError
     */
    public static applyToJob(
        jobId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/job/{job_id}/apply',
            path: {
                'job_id': jobId,
            },
            errors: {
                400: `Already applied`,
                401: `Unauthorized`,
                404: `Job not found`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Check application status
     * @param jobId
     * @returns ApplicationStatus Application status
     * @throws ApiError
     */
    public static getApplicationStatus(
        jobId: string,
    ): CancelablePromise<ApplicationStatus> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/job/{job_id}/apply',
            path: {
                'job_id': jobId,
            },
            errors: {
                401: `Unauthorized`,
                404: `Job not found`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Get job applications (for job author)
     * @param jobId
     * @param limit
     * @param offset
     * @returns JobApplication Successful operation
     * @throws ApiError
     */
    public static getJobApplications(
        jobId: string,
        limit: number = 20,
        offset?: number,
    ): CancelablePromise<Array<JobApplication>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/job/{job_id}/applications',
            path: {
                'job_id': jobId,
            },
            query: {
                'limit': limit,
                'offset': offset,
            },
            errors: {
                401: `Unauthorized`,
                403: `Forbidden`,
                404: `Job not found`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Update job application status (for job author)
     * @param jobId
     * @param applicantId
     * @param requestBody
     * @returns JobApplication Application status updated
     * @throws ApiError
     */
    public static updateJobApplicationStatus(
        jobId: string,
        applicantId: string,
        requestBody: UpdateApplicationStatusRequest,
    ): CancelablePromise<JobApplication> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/job/{job_id}/applications/{applicant_id}/status',
            path: {
                'job_id': jobId,
                'applicant_id': applicantId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Unauthorized`,
                403: `Forbidden`,
                404: `Job or application not found`,
                500: `Internal Server Error`,
            },
        });
    }
}
