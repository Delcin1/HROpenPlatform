-- name: CreateJob :one
INSERT INTO job.jobs (
    title, company_name, location, employment_type, 
    salary_from, salary_to, description, requirements, author_id
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
) RETURNING *;

-- name: GetJobByID :one
SELECT * FROM job.jobs WHERE id = $1;

-- name: GetJobs :many
SELECT * FROM job.jobs 
WHERE status = 'active'
AND (
    $1::text IS NULL OR 
    to_tsvector('russian', title || ' ' || company_name || ' ' || description) @@ plainto_tsquery('russian', $1)
)
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: GetJobsByAuthor :many
SELECT j.*, COUNT(ja.id) as applications_count
FROM job.jobs j
LEFT JOIN job.job_applications ja ON j.id = ja.job_id
WHERE j.author_id = $1
GROUP BY j.id
ORDER BY j.created_at DESC
LIMIT $2 OFFSET $3;

-- name: UpdateJob :one
UPDATE job.jobs 
SET title = $2, company_name = $3, location = $4, employment_type = $5,
    salary_from = $6, salary_to = $7, description = $8, requirements = $9, status = $10
WHERE id = $1 AND author_id = $11
RETURNING *;

-- name: DeleteJob :exec
DELETE FROM job.jobs WHERE id = $1 AND author_id = $2;

-- name: CreateJobApplication :one
INSERT INTO job.job_applications (job_id, applicant_id)
VALUES ($1, $2)
RETURNING *;

-- name: GetJobApplication :one
SELECT * FROM job.job_applications 
WHERE job_id = $1 AND applicant_id = $2;

-- name: GetJobApplications :many
SELECT ja.*, p.description as applicant_description, p.email as applicant_email, p.avatar as applicant_avatar
FROM job.job_applications ja
JOIN profile.profiles p ON ja.applicant_id = p.guid
WHERE ja.job_id = $1
ORDER BY ja.applied_at DESC
LIMIT $2 OFFSET $3;

-- name: UpdateJobApplicationStatus :one
UPDATE job.job_applications 
SET status = $3
WHERE job_id = $1 AND applicant_id = $2
RETURNING *;

-- name: GetApplicationsCount :one
SELECT COUNT(*) FROM job.job_applications WHERE job_id = $1;

-- name: CheckJobExists :one
SELECT EXISTS(SELECT 1 FROM job.jobs WHERE id = $1); 