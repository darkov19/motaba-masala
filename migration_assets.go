//go:build !bindings

package masala_inventory_managment

import "embed"

//go:embed internal/infrastructure/db/migrations/*.sql
var MigrationAssets embed.FS
