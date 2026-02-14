package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	domainBackup "masala_inventory_managment/internal/domain/backup"
	infraBackup "masala_inventory_managment/internal/infrastructure/backup"
	"masala_inventory_managment/internal/infrastructure/db"
)

func main() {
	log.Println("=== Manual Backup Service Test Tool ===")

	// 1. Setup DB
	cwd, _ := os.Getwd()
	dbPath := filepath.Join(cwd, "manual_test.db")
	log.Printf("Using database: %s", dbPath)

	dbManager := db.NewDatabaseManager(dbPath)
	if err := dbManager.Connect(); err != nil {
		log.Fatalf("Failed to connect to DB: %v", err)
	}
	defer dbManager.Close()

	// Initialize schema for testing
	_, err := dbManager.GetDB().Exec("CREATE TABLE IF NOT EXISTS test_data (id INTEGER PRIMARY KEY, timestamp TEXT)")
	if err != nil {
		log.Fatalf("Failed to init schema: %v", err)
	}
	_, _ = dbManager.GetDB().Exec("INSERT INTO test_data (timestamp) VALUES (?)", time.Now().Format(time.RFC3339))

	// 2. Setup Backup Service
	backupDir := filepath.Join(cwd, "manual_backups")
	log.Printf("Backups will be saved to: %s", backupDir)

	config := domainBackup.BackupConfig{
		BackupPath:    backupDir,
		RetentionDays: 7,
		ScheduleCron:  "0 2 * * *", // Ignored for manual trigger
	}

	logInfo := func(format string, v ...interface{}) {
		log.Printf("[INFO] "+format, v...)
	}
	logError := func(format string, v ...interface{}) {
		log.Printf("[ERROR] "+format, v...)
	}

	svc := infraBackup.NewService(dbManager, config, logInfo, logError)

	// 3. Test Menu
	for {
		fmt.Println("\nOptions:")
		fmt.Println("1. Trigger Immediate Backup")
		fmt.Println("2. Check Last Backup Status")
		fmt.Println("3. Prune Old Backups (Simulate)")
		fmt.Println("4. Exit")
		fmt.Print("Enter choice: ")

		var choice int
		fmt.Scanln(&choice)

		switch choice {
		case 1:
			log.Println("Triggering backup...")
			if err := svc.Execute(); err != nil {
				log.Printf("Backup Failed: %v", err)
			} else {
				log.Println("Backup Success!")
			}
		case 2:
			status, _ := svc.GetStatus()
			fmt.Printf("\n--- Status ---\nTime: %v\nPath: %s\nSize: %d bytes\nSuccess: %v\nMessage: %s\nRunning: %v\n--------------\n",
				status.LastBackupTime, status.FilePath, status.Size, status.Success, status.Message, status.IsRunning)
		case 3:
			log.Println("Pruning...")
			count, err := svc.Prune()
			if err != nil {
				log.Printf("Prune Failed: %v", err)
			} else {
				log.Printf("Pruned %d files", count)
			}
		case 4:
			log.Println("Cleaning up...")
			_ = os.Remove(dbPath)
			// _ = os.RemoveAll(backupDir) // Keep backups for verification
			return
		default:
			fmt.Println("Invalid choice")
		}
	}
}
