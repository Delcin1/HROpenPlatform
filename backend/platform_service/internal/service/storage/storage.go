package storage

import (
	"PlatformService/internal/config"
	"context"
	"crypto/tls"
	"fmt"
	"io"
	"net/http"
	"path/filepath"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type Service interface {
	UploadFile(ctx context.Context, file io.Reader, filename string) (string, error)
}

type service struct {
	client *minio.Client
	bucket string
}

func NewService(cfg *config.Config) (Service, error) {
	client, err := minio.New(cfg.MinioEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinioAccessKey, cfg.MinioSecretKey, ""),
		Secure: cfg.MinioUseSSL,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: cfg.MinioInsecure,
			},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create minio client: %w", err)
	}

	// Ensure bucket exists
	exists, err := client.BucketExists(context.Background(), cfg.MinioBucket)
	if err != nil {
		return nil, fmt.Errorf("failed to check bucket existence: %w", err)
	}

	if !exists {
		err = client.MakeBucket(context.Background(), cfg.MinioBucket, minio.MakeBucketOptions{})
		if err != nil {
			return nil, fmt.Errorf("failed to create bucket: %w", err)
		}
	}

	return &service{
		client: client,
		bucket: cfg.MinioBucket,
	}, nil
}

func (s *service) UploadFile(ctx context.Context, file io.Reader, filename string) (string, error) {
	// Generate unique filename
	ext := filepath.Ext(filename)
	objectName := fmt.Sprintf("%s%s", uuid.New().String(), ext)

	// Upload file
	_, err := s.client.PutObject(ctx, s.bucket, objectName, file, -1, minio.PutObjectOptions{
		ContentType: "application/octet-stream",
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload file: %w", err)
	}

	// Return public URL
	return fmt.Sprintf("/%s/%s", s.bucket, objectName), nil
}
