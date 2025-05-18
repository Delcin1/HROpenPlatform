package repository

import (
	"PlatformService/internal/config"
	"PlatformService/internal/repository/auth"
	"PlatformService/internal/repository/client"
	"PlatformService/internal/repository/company"
	"PlatformService/internal/repository/cv"
	"PlatformService/internal/repository/profile"
	"PlatformService/internal/repository/user"
)

type Repositories struct {
	Auth      auth.Querier
	User      user.Querier
	Profile   profile.Querier
	Company   company.Querier
	CV        cv.Querier
	TxManager TransactionManager
}

func NewRepositories(cfg *config.Config, pool client.PostgresClient) *Repositories {
	return &Repositories{
		Auth:      auth.New(),
		User:      user.New(),
		Profile:   profile.New(),
		Company:   company.New(),
		CV:        cv.New(),
		TxManager: NewTransactionManager(cfg, pool),
	}
}
