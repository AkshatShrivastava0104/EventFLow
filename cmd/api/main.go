package main

import (
	"context"
	"fmt"
	"log"

	"github.com/AkshatShrivastava0104/EventFlow/internal/cache"
	"github.com/AkshatShrivastava0104/EventFlow/internal/config"
	"github.com/AkshatShrivastava0104/EventFlow/internal/database"
	"github.com/AkshatShrivastava0104/EventFlow/internal/router"
)

func main() {

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("failed to load config:", err)
	}

	fmt.Println(cfg.AppName)

	// PostgreSQL
	db, err := database.New(cfg)
	if err != nil {
		log.Fatal("failed to connect to db:", err)
	}
	defer db.Close()

	fmt.Println("Database connection established successfully!")

	// Redis
	redisClient := cache.NewRedisClient(
		cfg.RedisHost,
		cfg.RedisPort,
	)
	defer redisClient.Close()

	// Check Redis connection
	if err := redisClient.Ping(context.Background()); err != nil {
		log.Fatal("failed to connect to Redis:", err)
	}

	fmt.Println("Redis connection established successfully!")

	// Router
	r := router.SetupRouter(db, cfg)

	// Start server
	fmt.Println("Server running on port", cfg.Port)

	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal("failed to start server:", err)
	}
}