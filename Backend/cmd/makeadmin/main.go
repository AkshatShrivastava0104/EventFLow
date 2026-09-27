// Command makeadmin promotes an existing EventFlow user to the platform
// super-admin role.
//
// Usage:
//
//	go run ./cmd/makeadmin -email someone@example.com
//
// It reuses the same configuration (.env) and database connection as the API
// server, so run it from the module root where the .env file lives.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log"
	"time"

	"github.com/AkshatShrivastava0104/EventFlow/internal/config"
	"github.com/AkshatShrivastava0104/EventFlow/internal/database"
	"github.com/jackc/pgx/v5"
)

func main() {
	email := flag.String("email", "", "email address of the user to promote to admin")
	flag.Parse()

	if *email == "" {
		log.Fatal("usage: makeadmin -email <user@example.com>")
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatal("failed to load config:", err)
	}

	db, err := database.New(cfg)
	if err != nil {
		log.Fatal("failed to connect to db:", err)
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var (
		id   int64
		name string
		role string
	)

	err = db.QueryRow(ctx, `
		UPDATE users
		SET role = 'admin', updated_at = now()
		WHERE email = $1
		RETURNING id, COALESCE(name, ''), role
	`, *email).Scan(&id, &name, &role)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			log.Fatalf("no user found with email %q", *email)
		}
		log.Fatal("failed to promote user:", err)
	}

	fmt.Printf("✓ user #%d (%s <%s>) is now role=%s\n", id, name, *email, role)
}
