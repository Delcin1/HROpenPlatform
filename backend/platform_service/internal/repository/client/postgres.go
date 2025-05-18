package client

import (
	"errors"

	"github.com/jackc/pgx/v4/pgxpool"
)

type PostgresClient interface {
	GetClient() (*pgxpool.Pool, error)
}

type postgresClient struct {
	db *pgxpool.Pool
}

func (p *postgresClient) GetClient() (*pgxpool.Pool, error) {
	if p.db == nil {
		return nil, errors.New("pg is nil")
	}
	return p.db, nil
}

func NewPostgresClient(db *pgxpool.Pool) PostgresClient {
	return &postgresClient{
		db: db,
	}
}
