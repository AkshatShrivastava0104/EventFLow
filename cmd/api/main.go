package main

import (
	"fmt"
	"log"

	"github.com/AkshatShrivastava0104/EventFlow/internal/auth"
	"github.com/AkshatShrivastava0104/EventFlow/internal/config"
	"github.com/AkshatShrivastava0104/EventFlow/internal/database"
	"github.com/AkshatShrivastava0104/EventFlow/internal/router"
)

func main() {

	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println(cfg.AppName)

	db, err := database.New(cfg)
	if err != nil {
		log.Fatal("failed to connect to db:", err)
	}
	defer db.Close()

	fmt.Println("Database connection established successfully!")

	authRepo := auth.NewRepository(db)
	authService := auth.NewService(authRepo, cfg)
	authHandler := auth.NewHandler(authService)

	r := router.SetupRouter()

auth.RegisterAuthRoutes(r, authHandler, auth.NewAuthMiddleware(cfg))

	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}