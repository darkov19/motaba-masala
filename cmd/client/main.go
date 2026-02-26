package main

import (
	"bufio"
	"context"
	"fmt"
	"log"
	"log/slog"
	"masala_inventory_managment"
	"masala_inventory_managment/internal/app"
	"os"
	"strings"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func main() {
	if err := run(); err != nil {
		log.Printf("Application failed to start: %v", err)
		os.Exit(1)
	}
}

func run() error {
	loadEnvFiles(".env", ".env.development")

	// Create an instance of the app structure
	application := app.NewApp(false) // Client instance

	// Create application with options
	err := wails.Run(&options.App{
		Title:             "Masala Inventory Client",
		Width:             1024,
		Height:            768,
		Frameless:         true,
		HideWindowOnClose: false,
		AssetServer: &assetserver.Options{
			Assets: masala_inventory_managment.Assets,
		},
		BackgroundColour: &options.RGBA{R: 125, G: 17, B: 17, A: 1}, // Motaba Deep Maroon
		OnStartup: func(ctx context.Context) {
			application.Startup(ctx)
			runtime.WindowMaximise(ctx)
			runtime.EventsOn(ctx, "app:request-minimize", func(optionalData ...interface{}) {
				runtime.WindowMinimise(ctx)
			})
		},
		OnBeforeClose: func(ctx context.Context) (prevent bool) {
			if application.IsForceQuit() {
				return false
			}

			runtime.EventsEmit(ctx, "app:before-close")
			return true
		},
		Bind: []interface{}{
			application,
		},
	})

	if err != nil {
		return fmt.Errorf("wails run error: %w", err)
	}

	return nil
}

func loadEnvFiles(paths ...string) {
	initialEnv := make(map[string]struct{})
	for _, kv := range os.Environ() {
		key, _, ok := strings.Cut(kv, "=")
		if ok && key != "" {
			initialEnv[key] = struct{}{}
		}
	}

	for _, path := range paths {
		f, err := os.Open(path)
		if err != nil {
			if !os.IsNotExist(err) {
				slog.Warn("Failed to open env file", "path", path, "error", err)
			}
			continue
		}

		scanner := bufio.NewScanner(f)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}

			key, value, ok := strings.Cut(line, "=")
			if !ok {
				continue
			}
			key = strings.TrimSpace(key)
			value = strings.TrimSpace(value)
			value = strings.Trim(value, `"'`)
			if key == "" {
				continue
			}
			if _, exists := initialEnv[key]; exists {
				continue
			}
			_ = os.Setenv(key, value)
		}
		if err := scanner.Err(); err != nil {
			slog.Warn("Failed to parse env file", "path", path, "error", err)
		}
		_ = f.Close()
	}
}
