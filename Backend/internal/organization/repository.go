package organization

import (
	"context"
	"errors"
	"time"

	"github.com/AkshatShrivastava0104/EventFlow/internal/auth"
	apperrors "github.com/AkshatShrivastava0104/EventFlow/internal/errors"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	authRepo *auth.Repository
	db       *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{
		authRepo: auth.NewRepository(db),
		db:       db,
	}
}

func (r *Repository) GetOrganizationsByUserID(
	ctx context.Context,
	userID int64,
) ([]Organization, error) {
	authOrgs, err := r.authRepo.GetOrganizationsByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	orgs := make([]Organization, 0, len(authOrgs))

	for _, authOrg := range authOrgs {
		orgs = append(orgs, Organization{
			ID:          authOrg.ID,
			OwnerID:     authOrg.OwnerID,
			Name:        authOrg.Name,
			Description: authOrg.Description,
			Role:        authOrg.Role,
			CreatedAt:   authOrg.CreatedAt,
			UpdatedAt:   authOrg.UpdatedAt,
		})
	}

	return orgs, nil
}

func (r *Repository) CreateOrganization(
	ctx context.Context,
	name string,
	description string,
	creatorUserID int64,
) (int64, error) {
	return r.authRepo.CreateOrganization(
		ctx,
		name,
		description,
		creatorUserID,
	)
}

func (r *Repository) GetOrganizationByID(
	ctx context.Context,
	organizationID int64,
	userID int64,
) (*Organization, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var organization Organization

	err := r.db.QueryRow(ctx, `
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
		WHERE o.id = $1
		  AND om.user_id = $2
	`,
		organizationID,
		userID,
	).Scan(
		&organization.ID,
		&organization.OwnerID,
		&organization.Name,
		&organization.Description,
		&organization.CreatedAt,
		&organization.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &organization, nil
}

// ==================================================
// RBAC
// ==================================================

func (r *Repository) GetMemberRole(
	ctx context.Context,
	organizationID int64,
	userID int64,
) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var role string

	err := r.db.QueryRow(ctx, `
		SELECT role
		FROM organization_members
		WHERE organization_id = $1
		  AND user_id = $2
	`,
		organizationID,
		userID,
	).Scan(&role)

	if err != nil {
		return "", err
	}

	return role, nil
}

func (r *Repository) UpdateOrganization(
	ctx context.Context,
	organizationID int64,
	name string,
	description string,
) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	_, err := r.db.Exec(ctx, `
		UPDATE organizations
		SET
			name = $1,
			description = $2,
			updated_at = NOW()
		WHERE id = $3
	`,
		name,
		description,
		organizationID,
	)

	return err
}

func (r *Repository) AddMember(
	ctx context.Context,
	organizationID int64,
	userID int64,
	role string,
) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	_, err := r.db.Exec(ctx, `
		INSERT INTO organization_members (
			organization_id,
			user_id,
			role,
			joined_at
		)
		VALUES ($1, $2, $3, NOW())
	`,
		organizationID,
		userID,
		role,
	)

	return err
}

func (r *Repository) GetMembers(
	ctx context.Context,
	organizationID int64,
) ([]OrganizationMember, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	rows, err := r.db.Query(ctx, `
		SELECT
			om.user_id,
			u.name,
			u.email,
			om.role,
			om.joined_at
		FROM organization_members om
		INNER JOIN users u
			ON u.id = om.user_id
		WHERE om.organization_id = $1
		ORDER BY om.joined_at ASC
	`, organizationID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	members := make([]OrganizationMember, 0)

	for rows.Next() {
		var member OrganizationMember

		err := rows.Scan(
			&member.UserID,
			&member.Name,
			&member.Email,
			&member.Role,
			&member.JoinedAt,
		)

		if err != nil {
			return nil, err
		}

		members = append(members, member)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return members, nil
}

func (r *Repository) UpdateMemberRole(
	ctx context.Context,
	organizationID int64,
	userID int64,
	role string,
) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.db.Exec(ctx, `
		UPDATE organization_members
		SET role = $1
		WHERE organization_id = $2
		  AND user_id = $3
	`,
		role,
		organizationID,
		userID,
	)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return errors.New("member not found")
	}

	return nil
}

func (r *Repository) RemoveMember(
	ctx context.Context,
	organizationID int64,
	userID int64,
) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.db.Exec(ctx, `
		DELETE FROM organization_members
		WHERE organization_id = $1
		  AND user_id = $2
	`,
		organizationID,
		userID,
	)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return errors.New("member not found")
	}

	return nil
}

// ==================================================
// Session Management
// ==================================================
//
// Organization role changes must invalidate the target
// user's existing sessions.
//
// auth_version is incremented and all refresh tokens are
// deleted by the auth repository.

func (r *Repository) RevokeUserSessions(
	ctx context.Context,
	userID int64,
) error {
	return r.authRepo.RevokeUserSessions(
		ctx,
		userID,
	)
}

func (r *Repository) DeleteOrganization(
	ctx context.Context,
	organizationID int64,
) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.db.Exec(ctx, `
		DELETE FROM organizations
		WHERE id = $1
	`,
		organizationID,
	)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return apperrors.ErrOrganizationNotFound
	}

	return nil
}