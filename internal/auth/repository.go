package auth

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) CreateUser(user *User) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := r.db.Exec(ctx, `
	INSERT INTO users (name, email, password_hash, role, email_verified, created_at, updated_at)
	VALUES ($1, $2, $3, $4, $5, now(), now())
	`, user.Name, user.Email, user.PasswordHash, user.Role, user.EmailVerified)
	return err
}

func (r *Repository) GetUserByEmail(email string) (*User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	row := r.db.QueryRow(ctx, `
	SELECT id, name, email, password_hash, role, email_verified, created_at, updated_at
	FROM users WHERE email = $1
	`, email)

	var user User
	err := row.Scan(&user.ID, &user.Name, &user.Email, &user.PasswordHash, &user.Role, &user.EmailVerified, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *Repository) GetUserByID(id int64) (*User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	row := r.db.QueryRow(ctx, `
	SELECT id, name, email, password_hash, role, email_verified, created_at, updated_at
	FROM users WHERE id = $1
	`, id)

	var user User
	err := row.Scan(&user.ID, &user.Name, &user.Email, &user.PasswordHash, &user.Role, &user.EmailVerified, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// Organization part-------

func (r *Repository) CreateOrganization(
	ctx context.Context,
	name string,
	description string,
	ownerID int64,
) (int64, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return 0, err
	}

	defer func() {
		if err != nil {
			_ = tx.Rollback(ctx)
		}
	}()

	var organizationID int64
	err = tx.QueryRow(ctx, `
    INSERT INTO organizations (owner_id, name, description, created_at, updated_at)
    VALUES ($1, $2, $3, now(), now())
    RETURNING id
    `, ownerID, name, description).Scan(&organizationID)
	if err != nil {
		_ = tx.Rollback(ctx)
		return 0, err
	}

	_, err = tx.Exec(ctx, `
    INSERT INTO organization_members (organization_id, user_id, role, joined_at)
    VALUES ($1, $2, $3, now())
    `, organizationID, ownerID, "OWNER")
	if err != nil {
		_ = tx.Rollback(ctx)
		return 0, err
	}

	err = tx.Commit(ctx)
	if err != nil {
		_ = tx.Rollback(ctx)
		return 0, err
	}

	return organizationID, nil
}
