package systemhealth

import "time"

type ComponentHealth struct {
	Status      string `json:"status"`
	LatencyMS   int64  `json:"latency_ms"`
	Message     string `json:"message,omitempty"`
	LastChecked time.Time `json:"last_checked"`
}

type SystemHealth struct {
	Status      string                    `json:"status"`
	Environment string                    `json:"environment"`
	AppName     string                    `json:"app_name"`
	Timestamp   time.Time                 `json:"timestamp"`
	Database    ComponentHealth            `json:"database"`
	Redis       ComponentHealth            `json:"redis"`
	API         ComponentHealth            `json:"api"`
}

type HealthResponse struct {
	Health SystemHealth `json:"health"`
}