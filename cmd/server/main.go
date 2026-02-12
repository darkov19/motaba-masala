package main

import (
	"masala_inventory_managment"
	"masala_inventory_managment/internal/app"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

func main() {
	// Create an instance of the app structure
	application := app.NewApp(true) // Server instance

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "Masala Inventory Server",
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: masala_inventory_managment.Assets,
		},
		BackgroundColour: &options.RGBA{R: 125, G: 17, B: 17, A: 1}, // Motaba Deep Maroon
		OnStartup:        application.Startup,
		Bind: []interface{}{
			application,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
