/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ApiRegister = {
    email: string;
    /**
     * Password must be hashed client-side using SHA-256 before sending
     */
    password: string;
    /**
     * Must match the hashed password
     */
    confirm_password: string;
};

