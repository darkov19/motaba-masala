package main

import (
	"crypto/ed25519"
	"encoding/hex"
	"fmt"
	"io/ioutil"
	"log"
	"masala_inventory_managment/internal/infrastructure/license"
)

func main() {
	// 1. Get the same Hardware ID the app generates
	provider := license.NewHardwareProvider()
	hwID, err := license.GetHardwareID(provider)
	if err != nil {
		log.Fatalf("Failed to get hardware ID: %v", err)
	}
	fmt.Printf("Your Hardware ID: %s\n", hwID)

	// 2. The hardcoded Public Key from cmd/server/main.go
	const publicKeyHex = "d6e8774e14436573e8677c77f0a672727142b781c15f5d379100868f441050e0"

	// 3. To generate a valid license, we need the PRIVATE key matching that public key.
	// Since that public key was a placeholder, I'll generate a NEW keypair
	// and you'll need to update the public key in main.go to match.
	pub, priv, err := ed25519.GenerateKey(nil)
	if err != nil {
		log.Fatalf("Failed to generate keys: %v", err)
	}

	newPublicKeyHex := hex.EncodeToString(pub)
	fmt.Printf("\nNEW Public Key (Copy this to main.go): %s\n", newPublicKeyHex)

	// 4. Sign the Hardware ID
	signature := ed25519.Sign(priv, []byte(hwID))
	licenseKeyHex := hex.EncodeToString(signature)

	// 5. Save to license.key
	err = ioutil.WriteFile("license.key", []byte(licenseKeyHex), 0644)
	if err != nil {
		log.Fatalf("Failed to save license.key: %v", err)
	}

	fmt.Println("\n✅ Successfully generated license.key for your WSL2 environment!")
	fmt.Println("Step 1: Update the 'publicKey' constant in 'cmd/server/main.go' with the NEW key above.")
	fmt.Println("Step 2: Run the app with 'go run cmd/server/main.go'")
}
