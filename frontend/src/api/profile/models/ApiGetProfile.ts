/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ApiGetProfile = {
    /**
     * GUID пользователя
     */
    guid: string;
    /**
     * Является ли пользователь HR'ом
     */
    is_hr: boolean;
    /**
     * ФИО пользователя
     */
    description: string;
    /**
     * Номер телефона
     */
    phone: string;
    /**
     * Email пользователя
     */
    email: string;
    /**
     * Дата рождения пользователя
     */
    birthdate: string;
    /**
     * Пол пользователя
     */
    gender: string;
    /**
     * Ссылка на аватар пользователя
     */
    avatar?: string;
    /**
     * Ссылка на резюме пользователя
     */
    cv?: string;
    created_at: string;
    updated_at: string;
    /**
     * Название компании в которой работает пользователь
     */
    company_name?: string;
};

