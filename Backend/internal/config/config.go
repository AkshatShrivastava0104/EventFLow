package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	AppName string
	AppEnv  string
	Port    string

	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string

	RedisHost string
	RedisPort string

	JWTSecret          string
	CORSAllowedOrigins string
}

func Load() (*Config, error) {
	// Load .env when available.
	// In production, environment variables are injected by Docker
	// and a .env file is not required.
	_ = godotenv.Load()

	cfg := &Config{
		AppName:            os.Getenv("APP_NAME"),
		AppEnv:             os.Getenv("APP_ENV"),
		Port:               os.Getenv("PORT"),
		DBHost:             os.Getenv("DB_HOST"),
		DBPort:             os.Getenv("DB_PORT"),
		DBUser:             os.Getenv("DB_USER"),
		DBPassword:         os.Getenv("DB_PASSWORD"),
		DBName:             os.Getenv("DB_NAME"),
		RedisHost:          os.Getenv("REDIS_HOST"),
		RedisPort:          os.Getenv("REDIS_PORT"),
		JWTSecret:          os.Getenv("JWT_SECRET"),
		CORSAllowedOrigins: os.Getenv("CORS_ALLOWED_ORIGINS"),
	}

	return cfg, nil
}
