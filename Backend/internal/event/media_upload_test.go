package event

import (
	"strings"
	"testing"

	"github.com/cloudinary/cloudinary-go/v2/api"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
)

func TestUploadedMediaFromCloudinaryResult(t *testing.T) {
	tests := []struct {
		name        string
		result      *uploader.UploadResult
		wantURL     string
		wantPublic  string
		wantErrText string
	}{
		{
			name: "successful response",
			result: &uploader.UploadResult{
				SecureURL: "https://res.cloudinary.com/example/image/upload/cover.webp",
				PublicID:  "uploads/events/cover",
			},
			wantURL:    "https://res.cloudinary.com/example/image/upload/cover.webp",
			wantPublic: "uploads/events/cover",
		},
		{
			name: "Cloudinary rejection",
			result: &uploader.UploadResult{
				Error: api.ErrorResp{Message: "Invalid cloud name"},
			},
			wantErrText: "cloudinary rejected upload: Invalid cloud name",
		},
		{
			name:        "nil response",
			wantErrText: "cloudinary upload returned no result",
		},
		{
			name:        "missing response fields",
			result:      &uploader.UploadResult{},
			wantErrText: "cloudinary upload returned incomplete result",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := uploadedMediaFromCloudinaryResult(test.result, "image")
			if test.wantErrText != "" {
				if err == nil || err.Error() != test.wantErrText {
					t.Fatalf("error = %v, want %q", err, test.wantErrText)
				}
				return
			}

			if err != nil {
				t.Fatalf("uploadedMediaFromCloudinaryResult() error = %v", err)
			}
			if got.SecureURL != test.wantURL {
				t.Errorf("SecureURL = %q, want %q", got.SecureURL, test.wantURL)
			}
			if got.PublicID != test.wantPublic {
				t.Errorf("PublicID = %q, want %q", got.PublicID, test.wantPublic)
			}
		})
	}
}

func TestValidateUploadedMedia(t *testing.T) {
	tests := []struct {
		name      string
		extension string
		content   string
		wantType  string
		wantErr   bool
	}{
		{
			name:      "jpeg",
			extension: ".jpg",
			content:   "\xff\xd8\xff\xe0",
			wantType:  "image",
		},
		{
			name:      "png",
			extension: ".png",
			content:   "\x89PNG\r\n\x1a\n",
			wantType:  "image",
		},
		{
			name:      "webp",
			extension: ".webp",
			content:   "RIFF\x00\x00\x00\x00WEBPVP8 ",
			wantType:  "image",
		},
		{
			name:      "gif",
			extension: ".gif",
			content:   "GIF89a",
			wantType:  "image",
		},
		{
			name:      "mismatched content",
			extension: ".png",
			content:   "not an image",
			wantErr:   true,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			reader := strings.NewReader(test.content)
			gotType, err := validateUploadedMedia(reader, test.extension)
			if test.wantErr {
				if err == nil {
					t.Fatal("expected invalid image content to be rejected")
				}
				return
			}

			if err != nil {
				t.Fatalf("validateUploadedMedia() error = %v", err)
			}
			if gotType != test.wantType {
				t.Fatalf("validateUploadedMedia() = %q, want %q", gotType, test.wantType)
			}
			if reader.Len() != len(test.content) {
				t.Fatal("valid image reader was not reset for upload")
			}
		})
	}
}
