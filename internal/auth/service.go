package auth

import (
	"errors"
	"time"

	"github.com/AkshatShrivastava0104/EventFlow/internal/config"
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
		return nil, errors.New("email already registered")
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(dto.Password), bcrypt.DefaultCost)
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

	return &AuthResponse{AccessToken: accessToken, RefreshToken: refreshToken}, nil
}

func (s *Service) Login(dto LoginRequest) (*AuthResponse, error) {
	user, err := s.repo.GetUserByEmail(dto.Email)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(dto.Password)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	accessToken, err := s.generateAccessToken(user)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.generateRefreshToken(user)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{AccessToken: accessToken, RefreshToken: refreshToken}, nil
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
	claims := jwt.MapClaims{
		"user_id": user.ID,
		"exp":     time.Now().Add(time.Hour * 24 * 7).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}
