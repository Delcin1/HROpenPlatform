backend-codegen:
	oapi-codegen --config=./backend/platform_service/oapi-codegen-configs/auth/server_cfg.yaml -o ./backend/platform_service/internal/router/auth/auth.gen.go ./api/auth.yaml
	oapi-codegen --config=./backend/platform_service/oapi-codegen-configs/cv/server_cfg.yaml -o ./backend/platform_service/internal/router/cv/cv.gen.go ./api/cv.yaml
	oapi-codegen --config=./backend/platform_service/oapi-codegen-configs/company/server_cfg.yaml -o ./backend/platform_service/internal/router/company/company.gen.go ./api/company.yaml
	oapi-codegen --config=./backend/platform_service/oapi-codegen-configs/profile/server_cfg.yaml -o ./backend/platform_service/internal/router/profile/profile.gen.go ./api/profile.yaml
	oapi-codegen --config=./backend/platform_service/oapi-codegen-configs/chat/server_cfg.yaml -o ./backend/platform_service/internal/router/chat/chat.gen.go ./api/chat.yaml
	oapi-codegen --config=./backend/platform_service/oapi-codegen-configs/call/server_cfg.yaml -o ./backend/platform_service/internal/router/call/call.gen.go ./api/call.yaml
	oapi-codegen --config=./backend/platform_service/oapi-codegen-configs/job/server_cfg.yaml -o ./backend/platform_service/internal/router/job/job.gen.go ./api/job.yaml

frontend-codegen:
	cd ./frontend && npm run generate-api

sqlcgen:
	cd ./backend/platform_service/internal/repository && sqlc generate

migrate:
	cd ./backend/migrations && goose postgres "host=localhost port=5432 user=postgres password=postgres dbname=hrplatform sslmode=disable" up
