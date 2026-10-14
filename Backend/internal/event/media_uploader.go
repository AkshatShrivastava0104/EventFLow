package event

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"strings"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
)

var ErrEventMediaAuditFailed = errors.New(
	"event media audit logging failed",
)

type UploadedMedia struct {
	SecureURL string
	PublicID  string
}

type MediaUploader interface {
	Upload(
		ctx context.Context,
		file io.Reader,
		publicID string,
		mediaType string,
	) (UploadedMedia, error)

	Delete(
		ctx context.Context,
		publicID string,
		mediaType string,
	) error
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
		return nil, errors.New(
			"cloudinary credentials are not configured",
		)
	}

	client, err := cloudinary.NewFromParams(
		strings.TrimSpace(cloudName),
		strings.TrimSpace(apiKey),
		strings.TrimSpace(apiSecret),
	)
	if err != nil {
		return nil, fmt.Errorf(
			"create cloudinary client: %w",
			err,
		)
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
	if u == nil || u.client == nil {
		return UploadedMedia{}, errors.New(
			"cloudinary uploader is not initialized",
		)
	}

	if file == nil {
		return UploadedMedia{}, errors.New(
			"upload file is required",
		)
	}

	publicID = strings.TrimSpace(publicID)
	if publicID == "" {
		return UploadedMedia{}, errors.New(
			"upload public ID is required",
		)
	}

	mediaType = strings.TrimSpace(strings.ToLower(mediaType))
	if mediaType != "image" && mediaType != "video" {
		return UploadedMedia{}, fmt.Errorf(
			"unsupported cloudinary resource type: %q",
			mediaType,
		)
	}

	result, err := u.client.Upload.Upload(
		ctx,
		file,
		uploader.UploadParams{
			Folder:       u.folder,
			PublicID:     publicID,
			ResourceType: mediaType,
		},
	)
	if err != nil {
		// Preserve the underlying error for server-side diagnosis.
		// Never log API secrets or uploaded file contents.
		return UploadedMedia{}, fmt.Errorf(
			"cloudinary upload: %w",
			err,
		)
	}

	return uploadedMediaFromCloudinaryResult(result, mediaType)
}

func uploadedMediaFromCloudinaryResult(
	result *uploader.UploadResult,
	mediaType string,
) (UploadedMedia, error) {
	if result == nil {
		return UploadedMedia{}, errors.New(
			"cloudinary upload returned no result",
		)
	}

	if message := strings.TrimSpace(result.Error.Message); message != "" {
		return UploadedMedia{}, fmt.Errorf(
			"cloudinary rejected upload: %s",
			message,
		)
	}

	secureURL := strings.TrimSpace(result.SecureURL)
	uploadedPublicID := strings.TrimSpace(result.PublicID)

	log.Printf(
		"Cloudinary upload response: resource_type=%s secure_url_present=%t public_id_present=%t",
		mediaType,
		secureURL != "",
		uploadedPublicID != "",
	)

	if secureURL == "" || uploadedPublicID == "" {
		return UploadedMedia{}, errors.New(
			"cloudinary upload returned incomplete result",
		)
	}

	if !strings.HasPrefix(secureURL, "https://") {
		return UploadedMedia{}, errors.New(
			"cloudinary upload returned an invalid secure URL",
		)
	}

	return UploadedMedia{
		SecureURL: secureURL,
		PublicID:  uploadedPublicID,
	}, nil
}

func (u *cloudinaryMediaUploader) Delete(
	ctx context.Context,
	publicID string,
	mediaType string,
) error {
	if u == nil || u.client == nil {
		return errors.New(
			"cloudinary uploader is not initialized",
		)
	}

	publicID = strings.TrimSpace(publicID)
	if publicID == "" {
		return errors.New(
			"cloudinary public ID is required for deletion",
		)
	}

	mediaType = strings.TrimSpace(strings.ToLower(mediaType))
	if mediaType != "image" && mediaType != "video" {
		return fmt.Errorf(
			"unsupported cloudinary resource type: %q",
			mediaType,
		)
	}

	result, err := u.client.Upload.Destroy(
		ctx,
		uploader.DestroyParams{
			PublicID:     publicID,
			ResourceType: mediaType,
		},
	)
	if err != nil {
		return fmt.Errorf(
			"cloudinary delete: %w",
			err,
		)
	}

	if result == nil {
		return errors.New(
			"cloudinary delete returned no result",
		)
	}

	if result.Result != "ok" && result.Result != "not found" {
		return fmt.Errorf(
			"cloudinary delete returned result %q",
			result.Result,
		)
	}

	return nil
}
