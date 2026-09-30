package filesystem

import (
	"os"
)

// TempWorkspace creates a private staging directory for release artifacts,
// unique to this run and readable only by the current user. Unlike a fixed
// path under /tmp it cannot collide with files left by another user.
func TempWorkspace() (string, error) {
	return os.MkdirTemp("", "docksight-")
}

// CreateDirectories creates the installation and data directories if they do not exist.
func CreateDirectories(
	installationDir string,
	dataDir string,
) error {

	directories := []string{
		installationDir,
		dataDir,
	}

	for _, dir := range directories {

		err := os.MkdirAll(
			dir,
			0755,
		)

		if err != nil {
			return err
		}
	}

	return nil
}
