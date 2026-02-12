package app

import (
	"context"
	"fmt"
)

// App struct
type App struct {
	ctx      context.Context
	isServer bool
}

// NewApp creates a new App application struct
func NewApp(isServer bool) *App {
	return &App{
		isServer: isServer,
	}
}

// Startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}
