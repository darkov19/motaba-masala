package main

import (
	"fmt"
	"log"
	"masala_inventory_managment"
	"masala_inventory_managment/internal/app"
	"os"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

func main() {
	if err := run(); err != nil {
		log.Printf("Demo application failed to start: %v", err)
		os.Exit(1)
	}
}

func run() error {
	application := app.NewApp(true)
	err := wails.Run(&options.App{
		Title:  "Masala Inventory Demo",
		Width:  1280,
		Height: 900,
		AssetServer: &assetserver.Options{
			Assets: masala_inventory_managment.Assets,
		},
		BackgroundColour: &options.RGBA{R: 248, G: 249, B: 250, A: 1},
		OnStartup:        application.Startup,
		Bind: []interface{}{
			application,
		},
	})

	if err != nil {
		return fmt.Errorf("wails run error: %w", err)
	}

	return nil
}
