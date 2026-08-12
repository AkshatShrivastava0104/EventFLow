package organization

import (
	"context"
	"time"

	"github.com/AkshatShrivastava0104/EventFlow/internal/auth"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	authRepo *auth.Repository
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{
		authRepo: auth.NewRepository(db),
		db: db,
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
	ownerID int64,
) (int64, error) {
	return r.authRepo.CreateOrganization(ctx, name, description, ownerID)
}


func (r *Repository) GetOrganizationByID(
	ctx context.Context,
	organizationID int64,
	userID int64,
	
) (*Organization, error) {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var organization Organization

	err := r.db.QueryRow(ctx, 
		`SELECT
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



// RBAC


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