package ticket

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{
		db: db,
	}
}

func (r *Repository) CreateTicket(
	ctx context.Context,
	registrationID int64,
	ticketNumber string,
	qrCode string,
) (int64, error) {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var ticketID int64

	err := r.db.QueryRow(ctx, `
		INSERT INTO tickets (
			registration_id,
			qr_code,
			ticket_number,
			created_at
		)
		VALUES (
			$1,
			$2,
			$3,
			NOW()
		)
		RETURNING id
	`,
		registrationID,
		qrCode,
		ticketNumber,
	).Scan(&ticketID)

	if err != nil {
		return 0, err
	}

	return ticketID, nil
}