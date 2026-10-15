package config

import "testing"

func TestLoadReadsCloudinaryConfiguration(t *testing.T) {
	t.Setenv("JWT_SECRET", "test-jwt-secret-that-is-at-least-32-bytes")
	t.Setenv("TRUSTED_PROXIES", "127.0.0.1, 10.0.0.0/8")
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
	if len(cfg.TrustedProxies) != 2 || cfg.TrustedProxies[1] != "10.0.0.0/8" {
		t.Fatalf("Load() TrustedProxies = %v, want configured proxy addresses", cfg.TrustedProxies)
	}
}

func TestLoadRequiresStrongJWTSecret(t *testing.T) {
	for _, secret := range []string{"", "short-secret", "                                "} {
		t.Run(secret, func(t *testing.T) {
			t.Setenv("JWT_SECRET", secret)

			if _, err := Load(); err == nil {
				t.Fatal("Load() succeeded without a JWT secret of at least 32 bytes")
			}
		})
	}
}

func TestLoadAccepts32ByteJWTSecret(t *testing.T) {
	t.Setenv("JWT_SECRET", "01234567890123456789012345678901")
	t.Setenv("TRUSTED_PROXIES", "")

	if _, err := Load(); err != nil {
		t.Fatalf("Load() rejected a 32-byte JWT secret: %v", err)
	}
}

func TestLoadRejectsInvalidTrustedProxy(t *testing.T) {
	t.Setenv("JWT_SECRET", "01234567890123456789012345678901")
	for _, proxy := range []string{"not-an-ip", "0.0.0.0/0", "::/0"} {
		t.Setenv("TRUSTED_PROXIES", proxy)

		if _, err := Load(); err == nil {
			t.Errorf("Load() accepted unsafe trusted proxy %q", proxy)
		}
	}
}
