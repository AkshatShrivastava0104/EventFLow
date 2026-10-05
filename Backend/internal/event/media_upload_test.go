package event

import (
	"strings"
	"testing"
)

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
