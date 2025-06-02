package repository

import (
	"PlatformService/internal/config"
	"PlatformService/internal/repository/auth"
	"PlatformService/internal/repository/call"
	"PlatformService/internal/repository/chat"
	"PlatformService/internal/repository/client"
	"PlatformService/internal/repository/company"
	"PlatformService/internal/repository/cv"
	"PlatformService/internal/repository/profile"
	"PlatformService/internal/repository/job"
)

type Repositories struct {
	Auth      auth.Querier
	Profile   profile.Querier
	Company   company.Querier
	CV        cv.Querier
	Chat      chat.Querier
	Call      call.Querier
	Job       job.Querier
	TxManager TransactionManager
}

func NewRepositories(cfg *config.Config, pool client.PostgresClient) *Repositories {
	return &Repositories{
		Auth:      auth.New(),
		Profile:   profile.New(),
		Company:   company.New(),
		CV:        cv.New(),
		Chat:      chat.New(),
		Call:      call.New(),
		Job:       job.New(),
		TxManager: NewTransactionManager(cfg, pool),
	}
}
