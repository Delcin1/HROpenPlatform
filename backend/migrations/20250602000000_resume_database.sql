-- +goose Up
-- +goose StatementBegin

-- Create resume_database table in cv schema
CREATE TABLE cv.resume_database (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    candidate_name TEXT NOT NULL,
    candidate_age INTEGER,
    experience_years TEXT NOT NULL,
    file_url TEXT NOT NULL,
    analysis TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_resume_database_user_id ON cv.resume_database(user_id);
CREATE INDEX idx_resume_database_candidate_name ON cv.resume_database(candidate_name);
CREATE INDEX idx_resume_database_created_at ON cv.resume_database(created_at);

-- Add full-text search index for analysis (Russian language)
CREATE INDEX idx_resume_database_analysis_search ON cv.resume_database USING gin(to_tsvector('russian', analysis));

-- Grant permissions
GRANT ALL ON cv.resume_database TO backend;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP INDEX IF EXISTS idx_resume_database_analysis_search;
DROP INDEX IF EXISTS idx_resume_database_created_at;
DROP INDEX IF EXISTS idx_resume_database_candidate_name;
DROP INDEX IF EXISTS idx_resume_database_user_id;
DROP TABLE cv.resume_database;

-- +goose StatementEnd 