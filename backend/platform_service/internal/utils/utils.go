package utils

import (
	"database/sql"
	"fmt"
	"github.com/google/uuid"
	"github.com/jackc/pgtype"
)

func StringPtrToNullString(s *string) sql.NullString {
	if s == nil {
		return sql.NullString{}
	}
	return sql.NullString{String: *s, Valid: true}
}

func UUIDArrayToStringArray(arr pgtype.UUIDArray) ([]string, error) {
	result := make([]string, len(arr.Elements))
	for i, element := range arr.Elements {
		// Преобразование [16]byte в UUID-строку
		u, err := uuid.FromBytes(element.Bytes[:])
		if err != nil {
			return nil, fmt.Errorf("invalid UUID at index %d: %w", i, err)
		}
		result[i] = u.String()
	}
	return result, nil
}
