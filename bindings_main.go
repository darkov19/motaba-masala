//go:build bindings

package main

import (
	"masala_inventory_managment/internal/app"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
)

func main() {
	application := app.NewApp(true)

	// Minimal run configuration for bindings generation
	wails.Run(&options.App{
		Title:            "Masala Inventory Server",
		Width:            1024,
		Height:           768,
		BackgroundColour: &options.RGBA{R: 125, G: 17, B: 17, A: 1},
		OnStartup:        application.Startup,
		Bind: []interface{}{
			application,
		},
	})
}
