package auth

import (
	"context"
	"errors"
	"time"

	"github.com/AkshatShrivastava0104/EventFlow/internal/config"
	apperrors "github.com/AkshatShrivastava0104/EventFlow/internal/errors"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	repo *Repository
	cfg  *config.Config   
}

func NewService(repo *Repository, cfg *config.Config) *Service {
	return &Service{repo: repo, cfg: cfg}
}

func (s *Service) Register(dto RegisterRequest) (*AuthResponse, error) {

	_, err := s.repo.GetUserByEmail(dto.Email)

	if err == nil {
		return nil, apperrors.ErrConflict
	}

	hashed, err := bcrypt.GenerateFromPassword(
		[]byte(dto.Password),
		bcrypt.DefaultCost,
	)

	if err != nil {
		return nil, err
	}

	user := &User{
		Name:          dto.Name,
		Email:         dto.Email,
		PasswordHash:  string(hashed),
		Role:          "user",
		EmailVerified: false,
	}

	if err := s.repo.CreateUser(user); err != nil {
		return nil, err
	}

	savedUser, err := s.repo.GetUserByEmail(dto.Email)
	if err != nil {
		return nil, err
	}

	accessToken, err := s.generateAccessToken(savedUser)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.generateRefreshToken(savedUser)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

func (s *Service) Login(dto LoginRequest) (*AuthResponse, error) {

	user, err := s.repo.GetUserByEmail(dto.Email)

	if err != nil {
		return nil, apperrors.ErrUnauthorized
	}

	if err := bcrypt.CompareHashAndPassword(
		[]byte(user.PasswordHash),
		[]byte(dto.Password),
	); err != nil {
		return nil, apperrors.ErrUnauthorized
	}

	accessToken, err := s.generateAccessToken(user)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.generateRefreshToken(user)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}


func (s *Service) GetUserProfile(userID int64) (*UserResponse, error) {
	user, err := s.repo.GetUserByID(userID)
	if err != nil {
		return nil, err
	}

	return &UserResponse{
		ID:            user.ID,
		Name:          user.Name,
		Email:         user.Email,
		Role:          user.Role,
		EmailVerified: user.EmailVerified,
	}, nil
}




func (s *Service) generateAccessToken(user *User) (string, error) {
	claims := jwt.MapClaims{
		"user_id": user.ID,
		"email":   user.Email,
		"role":    user.Role,
		"exp":     time.Now().Add(time.Hour * 1).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}





func (s *Service) generateRefreshToken(user *User) (string, error) {

	expiresAt := time.Now().Add(7 * 24 * time.Hour)

	claims := jwt.MapClaims{
		"user_id": user.ID,
		"exp":     expiresAt.Unix(),
	}

	token := jwt.NewWithClaims(
		jwt.SigningMethodHS256,
		claims,
	)

	refreshToken, err := token.SignedString(
		[]byte(s.cfg.JWTSecret),
	)

	if err != nil {
		return "", err
	}

	// Save refresh token in database.
	err = s.repo.SaveRefreshToken(
		context.Background(),
		user.ID,
		refreshToken,
		expiresAt,
	)

	if err != nil {
		return "", err
	}

	return refreshToken, nil
}




func (s *Service) RefreshAccessToken(
	ctx context.Context,
	refreshToken string,
) (*AuthResponse, error) {

	// Verify JWT signature and expiry.
	token, err := jwt.Parse(
		refreshToken,
		func(token *jwt.Token) (interface{}, error) {

			if token.Method != jwt.SigningMethodHS256 {
				return nil, errors.New("invalid signing method")
			}

			return []byte(s.cfg.JWTSecret), nil
		},
	)

	if err != nil || !token.Valid {
		return nil, apperrors.ErrUnauthorized
	}

	// Get token from database.
	userID, expiresAt, err := s.repo.GetRefreshToken(
		ctx,
		refreshToken,
	)

	if err != nil {
		return nil, apperrors.ErrUnauthorized
	}

	// Check expiration.
	if time.Now().After(expiresAt) {
		_ = s.repo.DeleteRefreshToken(
			ctx,
			refreshToken,
		)

		return nil, apperrors.ErrUnauthorized
	}

	// Get user.
	user, err := s.repo.GetUserByID(userID)

	if err != nil {
		return nil, apperrors.ErrUnauthorized
	}

	// Create new access token.
	accessToken, err := s.generateAccessToken(user)

	if err != nil {
		return nil, err
	}

	// Rotate refresh token.
	newRefreshToken, err := s.generateRefreshToken(user)

	if err != nil {
		return nil, err
	}

	// Revoke old refresh token.
	if err := s.repo.DeleteRefreshToken(
		ctx,
		refreshToken,
	); err != nil {
		return nil, err
	}

	return &AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: newRefreshToken,
	}, nil
}



func (s *Service) Logout(
	ctx context.Context,
	refreshToken string,
) error {

	return s.repo.DeleteRefreshToken(
		ctx,
		refreshToken,
	)
}