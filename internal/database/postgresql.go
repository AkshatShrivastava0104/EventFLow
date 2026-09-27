package database

import (
	"context"
	"fmt"

	"github.com/AkshatShrivastava0104/EventFlow/internal/config"
	"github.com/jackc/pgx/v5/pgxpool"
)

func New(cfg *config.Config) (*pgxpool.Pool, error) {
    dsn := fmt.Sprintf("postgresql://%s:%s@%s:%s/%s",
        cfg.DBUser,
        cfg.DBPassword,
        cfg.DBHost,
        cfg.DBPort,
        cfg.DBName,
    )

    pool, err := pgxpool.New(context.Background(), dsn)
    if err != nil {
        return nil, err
    }

    return pool, nil
}
