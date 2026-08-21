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



func (r *Repository) GetOrganizationsByUserID(
	ctx context.Context,
	userID int64,
) ([]Organization, error) {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	rows, err := r.db.Query(ctx, `
		SELECT
			o.id,
			o.owner_id,
			o.name,
			o.description,
			o.created_at,
			o.updated_at
		FROM organizations o
		INNER JOIN organization_members om
			ON o.id = om.organization_id
		WHERE om.user_id = $1
		ORDER BY o.created_at DESC
	`, userID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var organizations []Organization

	for rows.Next() {

		var org Organization

		err := rows.Scan(
			&org.ID,
			&org.OwnerID,
			&org.Name,
			&org.Description,
			&org.CreatedAt,
			&org.UpdatedAt,
		)

		if err != nil {
			return nil, err
		}

		organizations = append(organizations, org)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return organizations, nil
}



func (r *Repository) SaveRefreshToken(
	ctx context.Context,
	userID int64,
	token string,
	expiresAt time.Time,
) error {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	_, err := r.db.Exec(ctx, `
		INSERT INTO refresh_tokens (
			user_id,
			token,
			expires_at,
			created_at
		)
		VALUES ($1, $2, $3, NOW())
	`,
		userID,
		token,
		expiresAt,
	)

	return err
}




func (r *Repository) GetRefreshToken(
	ctx context.Context,
	token string,
) (int64, time.Time, error) {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var userID int64
	var expiresAt time.Time

	err := r.db.QueryRow(ctx, `
		SELECT user_id, expires_at
		FROM refresh_tokens
		WHERE token = $1
	`,
		token,
	).Scan(
		&userID,
		&expiresAt,
	)

	if err != nil {
		return 0, time.Time{}, err
	}

	return userID, expiresAt, nil
}



func (r *Repository) DeleteRefreshToken(
	ctx context.Context,
	token string,
) error {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	_, err := r.db.Exec(ctx, `
		DELETE FROM refresh_tokens
		WHERE token = $1
	`,
		token,
	)

	return err
}