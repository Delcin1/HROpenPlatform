/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type MatchedCandidate = {
    resume_id: string;
    candidate_name: string;
    file_url: string;
    /**
     * Оценка соответствия от 1 до 100
     */
    match_score: number;
    /**
     * Объяснение почему кандидат подходит для вакансии
     */
    reasoning: string;
};

