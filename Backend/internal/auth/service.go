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
	return &Service{
		repo: repo,
		cfg:  cfg,
	}
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
		AuthVersion:   1,
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

// UpdateProfile changes the signed-in user's name and email.
func (s *Service) UpdateProfile(
	userID int64,
	dto UpdateProfileRequest,
) (*UserResponse, error) {
	if existing, err := s.repo.GetUserByEmail(dto.Email); err == nil && existing.ID != userID {
		return nil, apperrors.ErrConflict
	}

	if err := s.repo.UpdateUserProfile(
		userID,
		dto.Name,
		dto.Email,
	); err != nil {
		return nil, err
	}

	return s.GetUserProfile(userID)
}

// ChangePassword re-authenticates the user with their current password.
//
// UpdatePassword also:
//   - increments auth_version
//   - invalidates all refresh tokens
//
// This forces all existing sessions to authenticate again.
func (s *Service) ChangePassword(
	userID int64,
	dto ChangePasswordRequest,
) error {
	user, err := s.repo.GetUserByID(userID)
	if err != nil {
		return err
	}

	if err := bcrypt.CompareHashAndPassword(
		[]byte(user.PasswordHash),
		[]byte(dto.CurrentPassword),
	); err != nil {
		return apperrors.ErrUnauthorized
	}

	hashed, err := bcrypt.GenerateFromPassword(
		[]byte(dto.NewPassword),
		bcrypt.DefaultCost,
	)
	if err != nil {
		return err
	}

	return s.repo.UpdatePassword(
		userID,
		string(hashed),
	)
}

func (s *Service) generateAccessToken(user *User) (string, error) {
	claims := jwt.MapClaims{
		"user_id": user.ID,
		"email":   user.Email,

		// Platform-level role only.
		// Organization role is resolved from organization_members.
		"role": user.Role,

		// Server-side session version.
		//
		// If this value changes in the database,
		// all existing access tokens become invalid
		// once the middleware detects the mismatch.
		"auth_version": user.AuthVersion,

		"exp": time.Now().Add(time.Hour).Unix(),
	}

	token := jwt.NewWithClaims(
		jwt.SigningMethodHS256,
		claims,
	)

	return token.SignedString(
		[]byte(s.cfg.JWTSecret),
	)
}

func (s *Service) generateRefreshToken(user *User) (string, error) {
	expiresAt := time.Now().Add(7 * 24 * time.Hour)

	claims := jwt.MapClaims{
		"user_id": user.ID,

		// Keep the same session version in the
		// refresh token as well.
		"auth_version": user.AuthVersion,

		"exp": expiresAt.Unix(),
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

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, apperrors.ErrUnauthorized
	}

	userIDFloat, ok := claims["user_id"].(float64)
	if !ok {
		return nil, apperrors.ErrUnauthorized
	}

	tokenUserID := int64(userIDFloat)

	userID, expiresAt, err := s.repo.GetRefreshToken(
		ctx,
		refreshToken,
	)
	if err != nil {
		return nil, apperrors.ErrUnauthorized
	}

	// Make sure the token's user matches the database
	// refresh-token record.
	if tokenUserID != userID {
		return nil, apperrors.ErrUnauthorized
	}

	if time.Now().After(expiresAt) {
		_ = s.repo.DeleteRefreshToken(
			ctx,
			refreshToken,
		)

		return nil, apperrors.ErrUnauthorized
	}

	user, err := s.repo.GetUserByID(userID)
	if err != nil {
		return nil, apperrors.ErrUnauthorized
	}

	// --------------------------------------------------
	// AUTH VERSION CHECK
	//
	// The refresh token contains the auth version that
	// existed when it was issued.
	//
	// If the user's auth_version was incremented
	// afterwards, the refresh token is revoked.
	// --------------------------------------------------

	refreshAuthVersionFloat, ok := claims["auth_version"].(float64)
	if !ok {
		return nil, apperrors.ErrUnauthorized
	}

	refreshAuthVersion := int(refreshAuthVersionFloat)

	if refreshAuthVersion != user.AuthVersion {
		_ = s.repo.DeleteRefreshToken(
			ctx,
			refreshToken,
		)

		return nil, apperrors.ErrUnauthorized
	}

	accessToken, err := s.generateAccessToken(user)
	if err != nil {
		return nil, err
	}

	newRefreshToken, err := s.generateRefreshToken(user)
	if err != nil {
		return nil, err
	}

	// Refresh-token rotation:
	// old refresh token is deleted after a new one
	// has been generated successfully.
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