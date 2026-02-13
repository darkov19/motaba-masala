//go:build !bindings

package masala_inventory_managment

import "embed"

//go:embed migrations/*.sql
var MigrationAssets embed.FS
