package models

import "github.com/golang-jwt/jwt/v5"

type AuthTokens struct {
	AccessToken  string
	RefreshToken string
	ExpiresIn    int
}

type Claims struct {
	UserGUID string `json:"user_guid"`
	jwt.RegisteredClaims
}
