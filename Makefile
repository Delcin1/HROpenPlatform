backend-codegen:
	oapi-codegen --config=./backend/platform_service/oapi-codegen-configs/auth/server_cfg.yaml -o ./backend/platform_service/internal/router/auth/auth.gen.go ./api/auth.yaml
	oapi-codegen --config=./backend/platform_service/oapi-codegen-configs/cv/server_cfg.yaml -o ./backend/platform_service/internal/router/cv/cv.gen.go ./api/cv.yaml
	oapi-codegen --config=./backend/platform_service/oapi-codegen-configs/company/server_cfg.yaml -o ./backend/platform_service/internal/router/company/company.gen.go ./api/company.yaml
	oapi-codegen --config=./backend/platform_service/oapi-codegen-configs/profile/server_cfg.yaml -o ./backend/platform_service/internal/router/profile/profile.gen.go ./api/profile.yaml

sqlcgen:
	cd ./backend/platform_service/internal/repository && sqlc generate