package repository

import (
	"PlatformService/internal/config"
	"PlatformService/internal/repository/client"
	"context"
	"time"

	"github.com/jackc/pgx/v4"
)

// TransactionManager defines methods for transaction management
type TransactionManager interface {
	// WithTransaction executes a function within a transaction
	WithTransaction(ctx context.Context, fn func(ctx context.Context, tx pgx.Tx) error) error
}

// transactionManager implements TransactionManager
type transactionManager struct {
	pool client.PostgresClient
	cfg  *config.Config
}

// NewTransactionManager creates a new transaction manager
func NewTransactionManager(cfg *config.Config, pool client.PostgresClient) TransactionManager {
	return &transactionManager{cfg: cfg, pool: pool}
}

// WithTransaction executes a function within a transaction
func (tm *transactionManager) WithTransaction(ctx context.Context, fn func(ctx context.Context, tx pgx.Tx) error) error {
	clnt, err := tm.pool.GetClient()
	if err != nil {
		return err
	}

	opts := pgx.TxOptions{
		IsoLevel: pgx.ReadCommitted,
	}

	ctx, _ = context.WithTimeout(ctx, time.Duration(tm.cfg.DBTxTimeout)*time.Millisecond)
	tx, err := clnt.BeginTx(ctx, opts)
	if err != nil {
		return err
	}

	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback(ctx)
			panic(p)
		}
	}()

	if err := fn(ctx, tx); err != nil {
		if rbErr := tx.Rollback(ctx); rbErr != nil {
			return rbErr
		}
		return err
	}

	return tx.Commit(ctx)
}
