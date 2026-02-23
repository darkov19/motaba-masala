package main

import (
	"context"
	"masala_inventory_managment"
	"masala_inventory_managment/internal/app"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func main() {
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
			runtime.EventsOn(ctx, "app:request-hide-to-tray", func(optionalData ...interface{}) {
				// Client uses the same custom title bar event names as server, but on close
				// it should follow the normal quit-confirm flow handled in the frontend.
				runtime.EventsEmit(ctx, "app:before-close")
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
		println("Error:", err.Error())
	}
}
