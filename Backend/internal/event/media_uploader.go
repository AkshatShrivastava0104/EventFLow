package event

import (
	"context"
	"errors"
	"fmt"
	"io"
	"strings"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
)

var ErrEventMediaAuditFailed = errors.New("event media audit logging failed")

type UploadedMedia struct {
	SecureURL string
	PublicID  string
}

type MediaUploader interface {
	Upload(ctx context.Context, file io.Reader, publicID, mediaType string) (UploadedMedia, error)
	Delete(ctx context.Context, publicID, mediaType string) error
}

type cloudinaryMediaUploader struct {
	client *cloudinary.Cloudinary
	folder string
}

func NewCloudinaryMediaUploader(
	cloudName string,
	apiKey string,
	apiSecret string,
	folder string,
) (MediaUploader, error) {
	if strings.TrimSpace(cloudName) == "" ||
		strings.TrimSpace(apiKey) == "" ||
		strings.TrimSpace(apiSecret) == "" {
		return nil, errors.New("cloudinary credentials are not configured")
	}

	client, err := cloudinary.NewFromParams(cloudName, apiKey, apiSecret)
	if err != nil {
		return nil, fmt.Errorf("create cloudinary client: %w", err)
	}

	folder = strings.Trim(folder, "/ ")
	if folder == "" {
		folder = "uploads/events"
	}

	return &cloudinaryMediaUploader{
		client: client,
		folder: folder,
	}, nil
}

func (u *cloudinaryMediaUploader) Upload(
	ctx context.Context,
	file io.Reader,
	publicID string,
	mediaType string,
) (UploadedMedia, error) {
	result, err := u.client.Upload.Upload(ctx, file, uploader.UploadParams{
		Folder:       u.folder,
		PublicID:     publicID,
		ResourceType: mediaType,
	})
	if err != nil {
		return UploadedMedia{}, fmt.Errorf("cloudinary upload: %w", err)
	}
	if result == nil {
		return UploadedMedia{}, errors.New("cloudinary upload returned no result")
	}

	return UploadedMedia{
		SecureURL: result.SecureURL,
		PublicID:  result.PublicID,
	}, nil
}

func (u *cloudinaryMediaUploader) Delete(
	ctx context.Context,
	publicID string,
	mediaType string,
) error {
	result, err := u.client.Upload.Destroy(ctx, uploader.DestroyParams{
		PublicID:     publicID,
		ResourceType: mediaType,
	})
	if err != nil {
		return fmt.Errorf("cloudinary delete: %w", err)
	}
	if result == nil {
		return errors.New("cloudinary delete returned no result")
	}
	if result.Result != "ok" && result.Result != "not found" {
		return fmt.Errorf("cloudinary delete returned result %q", result.Result)
	}

	return nil
}
