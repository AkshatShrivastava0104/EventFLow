// @title EventFlow API
// @version 1.0
// @description Production-ready event management and registration API.
// @host localhost:8080
// @BasePath /
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	_ "github.com/AkshatShrivastava0104/EventFlow/docs"
	"github.com/AkshatShrivastava0104/EventFlow/internal/cache"
	"github.com/AkshatShrivastava0104/EventFlow/internal/config"
	"github.com/AkshatShrivastava0104/EventFlow/internal/database"
	"github.com/AkshatShrivastava0104/EventFlow/internal/notification"
	"github.com/AkshatShrivastava0104/EventFlow/internal/outbox"
	"github.com/AkshatShrivastava0104/EventFlow/internal/queue"
	"github.com/AkshatShrivastava0104/EventFlow/internal/router"
	"github.com/AkshatShrivastava0104/EventFlow/internal/worker"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// ==================================================
	// Configuration
	// ==================================================
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("failed to load config:", err)
	}

	fmt.Println(cfg.AppName)

	// ==================================================
	// PostgreSQL
	// ==================================================
	db, err := database.New(cfg)
	if err != nil {
		log.Fatal("failed to connect to db:", err)
	}
	defer db.Close()

	log.Println("Database connection established successfully")

	// ==================================================
	// Redis
	// ==================================================
	redisClient := cache.NewRedisClient(cfg.RedisHost, cfg.RedisPort)
	defer redisClient.Close()

	if err := redisClient.Ping(context.Background()); err != nil {
		log.Fatal("failed to connect to Redis:", err)
	}

	log.Println("Redis connection established successfully")

	// ==================================================
	// Application context
	// ==================================================
	workerCtx, stopWorkers := context.WithCancel(context.Background())
	defer stopWorkers()

	// ==================================================
	// Notification Queue + Service + Worker
	// ==================================================
	notificationQueue := queue.NewNotificationQueue(redisClient.Client)

	notificationRepo := notification.NewRepository(db)
	notificationService := notification.NewService(notificationRepo)

	notificationWorker := worker.NewNotificationWorker(redisClient.Client, notificationService)
	go notificationWorker.Start(workerCtx)

	log.Println("Notification worker started")

	// ==================================================
	// Outbox Repo + Service + Worker
	// ==================================================
	outboxRepo := outbox.NewRepository(db)
	outboxService := outbox.NewService(outboxRepo, notificationQueue)

	outboxWorker := outbox.NewWorker(outboxService)
	go outboxWorker.Start(workerCtx)

	log.Println("Outbox worker started")

	// ==================================================
	// Gin router (single, CORS-aware)
	// ==================================================
	// ==================================================
// Gin router
// ==================================================

gin.SetMode(gin.ReleaseMode)

// SetupRouter creates and returns the actual Gin engine
// containing all EventFlow routes.
r := router.SetupRouter(
	db,
	cfg,
	redisClient.Client,
)

// Add CORS middleware to the returned router.
r.Use(cors.New(cors.Config{
	AllowOrigins: []string{
		"http://localhost:5173",
		"http://localhost:4173",
		"http://localhost:3000",`r`n                "https://eventflowak.vercel.app",
	},
	AllowMethods: []string{
		"GET",
		"POST",
		"PUT",
		"PATCH",
		"DELETE",
		"OPTIONS",
	},
	AllowHeaders: []string{
		"Origin",
		"Content-Type",
		"Authorization",
		"Accept",
	},
	ExposeHeaders: []string{
		"Content-Length",
	},
	AllowCredentials: true,
	MaxAge: 12 * time.Hour,
}))

	// ==================================================
	// HTTP Server
	// ==================================================
	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	// ==================================================
	// Start HTTP server
	// ==================================================
	serverErr := make(chan error, 1)
	go func() {
		log.Printf("Server running on port %s", cfg.Port)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErr <- err
			return
		}
		serverErr <- nil
	}()

	// ==================================================
	// Wait for shutdown signal
	// ==================================================
	signalCtx, stopSignal := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stopSignal()

	select {
	case err := <-serverErr:
		if err != nil {
			log.Fatal("HTTP server failed:", err)
		}
	case <-signalCtx.Done():
		log.Println("Shutdown signal received")
	}

	// ==================================================
	// Graceful HTTP shutdown
	// ==================================================
	shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelShutdown()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("HTTP server graceful shutdown failed: %v", err)
		if err := server.Close(); err != nil {
			log.Printf("HTTP server force close failed: %v", err)
		}
	} else {
		log.Println("HTTP server stopped gracefully")
	}

	// ==================================================
	// Stop background workers
	// ==================================================
	log.Println("Stopping background workers...")
	stopWorkers()
	time.Sleep(200 * time.Millisecond)

	log.Println("Application shutdown complete")
}

