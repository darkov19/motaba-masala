package license

import (
	"crypto/ed25519"
	"encoding/hex"
	"fmt"
)

// VerifyLicense checks if the license key is a valid signature of the hardware ID using the provided public key
func VerifyLicense(publicKeyHex, licenseKeyHex, hwID string) error {
	pubKey, err := hex.DecodeString(publicKeyHex)
	if err != nil {
		return fmt.Errorf("invalid public key format: %w", err)
	}

	sig, err := hex.DecodeString(licenseKeyHex)
	if err != nil {
		return fmt.Errorf("invalid license key format: %w", err)
	}

	if len(pubKey) != ed25519.PublicKeySize {
		return fmt.Errorf("invalid public key size")
	}

	if len(sig) != ed25519.SignatureSize {
		return fmt.Errorf("invalid license key size")
	}

	if !ed25519.Verify(pubKey, []byte(hwID), sig) {
		return fmt.Errorf("license key verification failed: signature mismatch for this hardware")
	}

	return nil
}
