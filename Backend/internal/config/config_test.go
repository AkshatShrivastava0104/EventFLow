package config

import "testing"

func TestLoadReadsCloudinaryConfiguration(t *testing.T) {
	t.Setenv("CLOUDINARY_CLOUD_NAME", "test-cloud")
	t.Setenv("CLOUDINARY_API_KEY", "test-key")
	t.Setenv("CLOUDINARY_API_SECRET", "test-secret")
	t.Setenv("CLOUDINARY_UPLOAD_FOLDER", "eventflow/test-events")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.CloudinaryCloudName != "test-cloud" ||
		cfg.CloudinaryAPIKey != "test-key" ||
		cfg.CloudinaryAPISecret != "test-secret" ||
		cfg.CloudinaryUploadFolder != "eventflow/test-events" {
		t.Fatal("Load() did not read the Cloudinary environment variables")
	}
}
