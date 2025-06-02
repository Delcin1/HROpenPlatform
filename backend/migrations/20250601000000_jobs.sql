-- +goose Up
-- +goose StatementBegin

-- Create schema for jobs
CREATE SCHEMA IF NOT EXISTS job;

-- Create jobs table
CREATE TABLE job.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    company_name TEXT NOT NULL,
    location TEXT NOT NULL,
    employment_type TEXT NOT NULL CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'internship', 'remote')),
    salary_from INTEGER,
    salary_to INTEGER,
    description TEXT NOT NULL,
    requirements TEXT NOT NULL,
    author_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed'))
);

-- Create job applications table
CREATE TABLE job.job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL,
    applicant_id UUID NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected')),
    UNIQUE(job_id, applicant_id)
);

-- Create indexes for efficient querying
CREATE INDEX idx_jobs_author_id ON job.jobs(author_id);
CREATE INDEX idx_jobs_status ON job.jobs(status);
CREATE INDEX idx_jobs_created_at ON job.jobs(created_at DESC);
CREATE INDEX idx_jobs_employment_type ON job.jobs(employment_type);
CREATE INDEX idx_jobs_title_company ON job.jobs USING gin(to_tsvector('russian', title || ' ' || company_name || ' ' || description));

CREATE INDEX idx_job_applications_job_id ON job.job_applications(job_id);
CREATE INDEX idx_job_applications_applicant_id ON job.job_applications(applicant_id);
CREATE INDEX idx_job_applications_status ON job.job_applications(status);
CREATE INDEX idx_job_applications_applied_at ON job.job_applications(applied_at DESC);

-- Create function to update updated_at automatically
CREATE OR REPLACE FUNCTION job.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for jobs table
CREATE TRIGGER update_jobs_updated_at 
    BEFORE UPDATE ON job.jobs 
    FOR EACH ROW 
    EXECUTE FUNCTION job.update_updated_at_column();

-- Grant permissions
GRANT USAGE ON SCHEMA job TO backend;
GRANT ALL ON ALL TABLES IN SCHEMA job TO backend;
GRANT ALL ON ALL SEQUENCES IN SCHEMA job TO backend;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA job TO backend;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TRIGGER update_jobs_updated_at ON job.jobs;
DROP FUNCTION job.update_updated_at_column();

DROP INDEX idx_job_applications_applied_at;
DROP INDEX idx_job_applications_status;
DROP INDEX idx_job_applications_applicant_id;
DROP INDEX idx_job_applications_job_id;

DROP INDEX idx_jobs_title_company;
DROP INDEX idx_jobs_employment_type;
DROP INDEX idx_jobs_created_at;
DROP INDEX idx_jobs_status;
DROP INDEX idx_jobs_author_id;

DROP TABLE job.job_applications;
DROP TABLE job.jobs;
DROP SCHEMA job;

-- +goose StatementEnd 