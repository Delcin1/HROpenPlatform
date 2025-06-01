-- +goose Up
-- +goose StatementBegin

-- Create schema for calls
CREATE SCHEMA IF NOT EXISTS call;

-- Create calls table
CREATE TABLE call.calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended'))
);

-- Create call participants table
CREATE TABLE call.call_participants (
    call_id UUID NOT NULL,
    user_id UUID NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (call_id, user_id)
);

-- Create call transcripts table
CREATE TABLE call.transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL,
    user_id UUID NOT NULL,
    text TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_call_participants_call_id ON call.call_participants(call_id);
CREATE INDEX idx_call_participants_user_id ON call.call_participants(user_id);
CREATE INDEX idx_transcripts_call_id ON call.transcripts(call_id);
CREATE INDEX idx_transcripts_user_id ON call.transcripts(user_id);
CREATE INDEX idx_transcripts_timestamp ON call.transcripts(timestamp);

-- Grant permissions
GRANT USAGE ON SCHEMA call TO backend;
GRANT ALL ON ALL TABLES IN SCHEMA call TO backend;
GRANT ALL ON ALL SEQUENCES IN SCHEMA call TO backend; 

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP INDEX idx_transcripts_timestamp;
DROP INDEX idx_transcripts_user_id;
DROP INDEX idx_transcripts_call_id;
DROP INDEX idx_call_participants_user_id;
DROP INDEX idx_call_participants_call_id;
DROP TABLE call.transcripts;
DROP TABLE call.call_participants;
DROP TABLE call.calls;
DROP SCHEMA call;

-- +goose StatementEnd