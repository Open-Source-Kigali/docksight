package ui

import "fmt"

func Success(message string) {
	fmt.Printf("✓ %s\n", message)
}

func Error(message string) {
	fmt.Printf("✗ %s\n", message)
}

func Info(message string) {
	fmt.Printf("→ %s\n", message)
}

func Warning(message string) {
	fmt.Printf("⚠ %s\n", message)
}