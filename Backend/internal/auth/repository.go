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
		INSERT INTO users (
			name,
			email,
			password_hash,
			role,
			email_verified,
			created_at,
			updated_at
		)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
	`,
		user.Name,
		user.Email,
		user.PasswordHash,
		user.Role,
		user.EmailVerified,
	)

	return err
}

func (r *Repository) GetUserByEmail(email string) (*User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	row := r.db.QueryRow(ctx, `
		SELECT
			id,
			name,
			email,
			password_hash,
			role,
			auth_version,
			email_verified,
			created_at,
			updated_at
		FROM users
		WHERE email = $1
	`, email)

	var user User

	err := row.Scan(
		&user.ID,
		&user.Name,
		&user.Email,
		&user.PasswordHash,
		&user.Role,
		&user.AuthVersion,
		&user.EmailVerified,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (r *Repository) GetUserByID(id int64) (*User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	row := r.db.QueryRow(ctx, `
		SELECT
			id,
			name,
			email,
			password_hash,
			role,
			auth_version,
			email_verified,
			created_at,
			updated_at
		FROM users
		WHERE id = $1
	`, id)

	var user User

	err := row.Scan(
		&user.ID,
		&user.Name,
		&user.Email,
		&user.PasswordHash,
		&user.Role,
		&user.AuthVersion,
		&user.EmailVerified,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &user, nil
}

// UpdateUserProfile changes the display name and email for a user.
func (r *Repository) UpdateUserProfile(
	id int64,
	name string,
	email string,
) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := r.db.Exec(ctx, `
		UPDATE users
		SET
			name = $1,
			email = $2,
			updated_at = NOW()
		WHERE id = $3
	`,
		name,
		email,
		id,
	)

	return err
}

// UpdatePassword replaces the stored bcrypt hash for a user
// and increments auth_version so all existing sessions become invalid.
func (r *Repository) UpdatePassword(
	id int64,
	passwordHash string,
) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := r.db.Exec(ctx, `
		UPDATE users
		SET
			password_hash = $1,
			auth_version = auth_version + 1,
			updated_at = NOW()
		WHERE id = $2
	`,
		passwordHash,
		id,
	)

	if err != nil {
		return err
	}

	// Password changes invalidate all refresh tokens too.
	return r.RevokeRefreshTokens(context.Background(), id)
}

// RevokeUserSessions invalidates all existing sessions for a user.
//
// This is the main server-side session revocation mechanism.
// It is useful when:
//   - a user's organization role changes
//   - a staff member is removed
//   - a password is changed/reset
//   - a security incident occurs
//   - the user is forced to log in again
func (r *Repository) RevokeUserSessions(
	ctx context.Context,
	userID int64,
) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	_, err := r.db.Exec(ctx, `
		UPDATE users
		SET
			auth_version = auth_version + 1,
			updated_at = NOW()
		WHERE id = $1
	`,
		userID,
	)

	if err != nil {
		return err
	}

	return r.RevokeRefreshTokens(ctx, userID)
}

// RevokeRefreshTokens removes every refresh token belonging
// to the user, forcing login again on all devices.
func (r *Repository) RevokeRefreshTokens(
	ctx context.Context,
	userID int64,
) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	_, err := r.db.Exec(ctx, `
		DELETE FROM refresh_tokens
		WHERE user_id = $1
	`,
		userID,
	)

	return err
}

// Organization part

func (r *Repository) CreateOrganization(
	ctx context.Context,
	name string,
	description string,
	creatorUserID int64,
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
		INSERT INTO organizations (
			owner_id,
			name,
			description,
			created_at,
			updated_at
		)
		VALUES ($1, $2, $3, NOW(), NOW())
		RETURNING id
	`,
		creatorUserID,
		name,
		description,
	).Scan(&organizationID)

	if err != nil {
		_ = tx.Rollback(ctx)
		return 0, err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO organization_members (
			organization_id,
			user_id,
			role,
			joined_at
		)
		VALUES ($1, $2, $3, NOW())
	`,
		organizationID,
		creatorUserID,
		"ADMIN",
	)

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
			om.role,
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

	organizations := make([]Organization, 0)

	for rows.Next() {
		var org Organization

		err := rows.Scan(
			&org.ID,
			&org.OwnerID,
			&org.Name,
			&org.Description,
			&org.Role,
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
		SELECT
			user_id,
			expires_at
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