package config

import (
	"fmt"

	"github.com/spf13/viper"
)

type Config struct {
	AppVersion string

	AccessTokenSecret  string `mapstructure:"ACCESS_TOKEN_SECRET" required:"true" default:"access_token_secret"`
	RefreshTokenSecret string `mapstructure:"REFRESH_TOKEN_SECRET" required:"true" default:"refresh_token_secret"`
	AccessTokenTTL     int    `mapstructure:"ACCESS_TOKEN_TTL" required:"true" default:"3600"`
	RefreshTokenTTL    int    `mapstructure:"REFRESH_TOKEN_TTL" required:"true" default:"86400"`

	ServerAddress     string `mapstructure:"SERVER_ADDRESS" required:"true" default:"http://localhost:8080"`
	ServerFullAddress string `mapstructure:"SERVER_FULL_ADDRESS" required:"true" default:"http://localhost:8080"`
	MonitoringAddress string `mapstructure:"MONITORING_ADDRESS" required:"true" default:"http://localhost:8081"`

	HTTPReadHeaderTimeout int `mapstructure:"HTTP_READ_HEADER_TIMEOUT" required:"true" default:"10"`

	// MinIO configuration
	MinioEndpoint  string `mapstructure:"MINIO_ENDPOINT" required:"true" default:"localhost:9001"`
	MinioAccessKey string `mapstructure:"MINIO_ACCESS_KEY" required:"true" default:"admin"`
	MinioSecretKey string `mapstructure:"MINIO_SECRET_KEY" required:"true" default:"Secure123$"`
	MinioUseSSL    bool   `mapstructure:"MINIO_USE_SSL" required:"true" default:"false"`
	MinioBucket    string `mapstructure:"MINIO_BUCKET" required:"true" default:"cv"`
	MinioInsecure  bool   `mapstructure:"MINIO_INSECURE" required:"true" default:"true"`

	// PSQL DB
	// dbHost - host соединения
	DBHost string `mapstructure:"DB_HOST" required:"true" default:"localhost"`
	// dbPort: port соединения
	DBPort string `mapstructure:"DB_PORT" required:"true" default:"32768"`
	// dbName: dbname - имя базы данных
	DBName string `mapstructure:"DB_NAME" required:"true" default:"afuser"`
	// dbUser: user - пользователь базы данных
	DBUser string `mapstructure:"DB_USERNAME" required:"true" default:"afuser"`
	// dbPassword: password - пароль базы данных
	DBPassword string `mapstructure:"DB_PASSWORD" required:"true" default:"afpassword"`
	// dbSslMode: ssl mode
	DBSslMode string `mapstructure:"DB_SSLMODE" required:"true" default:"disable"`
	// dbDeployMod: deploy mod
	DBDeployMod string `mapstructure:"DB_DEPLOY_MOD" required:"true" default:"localhost"`
	DBMaxConns  int    `mapstructure:"DB_MAX_CONNS" required:"true" default:"0"`
	DBMinConns  int    `mapstructure:"DB_MIN_CONNS" required:"true" default:"0"`
	DBTxTimeout int    `mapstructure:"DB_TX_TIMEOUT_MSEC" required:"true" default:"10000"`

	VictoriaMetricsPushURL      string `mapstructure:"VICTORIA_METRICS_PUSH_URL" default:""`
	VictoriaMetricsExtraLabels  string `mapstructure:"VICTORIA_METRICS_EXTRALABELS" default:"project=platform_service"`
	VictoriaMetricsPushInterval int    `mapstructure:"VICTORIA_METRICS_PUSH_INTERVAL" default:"10"`

	DatasyncParallelCnt int `mapstructure:"DATASYNC_PARALLEL" required:"true" default:"true"`
}

func NewConfig() (*Config, error) {
	viper.SetConfigName(".env")
	viper.SetConfigType("env")
	viper.AddConfigPath(".")

	viper.AutomaticEnv()
	err := viper.ReadInConfig()
	if err != nil {
		return nil, err
	}

	var conf Config
	err = viper.Unmarshal(&conf)
	if err != nil {
		return nil, err
	}

	return &conf, nil
}

func (c *Config) GetServerAddress() string {
	return c.ServerAddress
}

func (c *Config) GetMonitoringAddress() string {
	return c.MonitoringAddress
}

func (c *Config) GetDBConnString() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.DBHost, c.DBPort, c.DBUser, c.DBPassword, c.DBName, c.DBSslMode,
	)
}
