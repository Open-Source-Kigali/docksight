package ui

import (
	"fmt"
	"os"
	"runtime"
	"strings"
	"sync"
	"sync/atomic"
)

// Detection runs once. An explicit override (tests / --ascii) is checked first
// so SetUnicode never races with concurrent UseUnicode readers.
var (
	detectOnce      sync.Once
	detectedUnicode bool
	unicodeOverride atomic.Pointer[bool]
)

// UseUnicode reports whether status symbols should be Unicode. Detection runs
// once: NO_UNICODE / DOCKSIGHT_ASCII force ASCII; non-TTY stdout, TERM=dumb,
// and non-UTF-8 Windows consoles also fall back.
func UseUnicode() bool {
	if p := unicodeOverride.Load(); p != nil {
		return *p
	}
	detectOnce.Do(func() {
		detectedUnicode = detectUnicode()
	})
	return detectedUnicode
}

// SetUnicode overrides detection. Intended for tests and an explicit --ascii flag.
// The override is independent of the one-shot detector, so concurrent UseUnicode
// calls remain race-free.
func SetUnicode(enabled bool) {
	v := enabled
	unicodeOverride.Store(&v)
}

// clearUnicodeOverride restores environment-based detection. Test-only.
func clearUnicodeOverride() {
	unicodeOverride.Store(nil)
}

func detectUnicode() bool {
	if envTruthy(os.Getenv("NO_UNICODE")) || envTruthy(os.Getenv("DOCKSIGHT_ASCII")) {
		return false
	}
	if strings.EqualFold(os.Getenv("TERM"), "dumb") {
		return false
	}
	// Piped output often ends up in logs on hosts that cannot render UTF-8.
	if !stdoutIsTerminal() {
		return false
	}
	if runtime.GOOS == "windows" {
		// Prefer Unicode when the environment clearly indicates UTF-8 or when
		// running under Windows Terminal; otherwise fall back to ASCII so
		// legacy code pages do not garble status symbols.
		lang := strings.ToLower(os.Getenv("LANG") + os.Getenv("LC_ALL") + os.Getenv("LC_CTYPE"))
		if strings.Contains(lang, "utf-8") || strings.Contains(lang, "utf8") {
			return true
		}
		if os.Getenv("WT_SESSION") != "" {
			return true
		}
		return false
	}
	return true
}

func envTruthy(v string) bool {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "1", "true", "yes", "y", "on":
		return true
	default:
		return false
	}
}

func stdoutIsTerminal() bool {
	info, err := os.Stdout.Stat()
	if err != nil {
		return false
	}
	return info.Mode()&os.ModeCharDevice != 0
}

// Success prints message with a success symbol (✓ or [OK]).
func Success(message string) {
	if UseUnicode() {
		fmt.Printf("✓ %s\n", message)
		return
	}
	fmt.Printf("[OK] %s\n", message)
}

// Error prints message with an error symbol (✗ or [!!]).
func Error(message string) {
	if UseUnicode() {
		fmt.Printf("✗ %s\n", message)
		return
	}
	fmt.Printf("[!!] %s\n", message)
}

// Info prints message with an info symbol (→ or ->).
func Info(message string) {
	if UseUnicode() {
		fmt.Printf("→ %s\n", message)
		return
	}
	fmt.Printf("-> %s\n", message)
}

// Warning prints message with a warning symbol (⚠ or [!]).
func Warning(message string) {
	if UseUnicode() {
		fmt.Printf("⚠ %s\n", message)
		return
	}
	fmt.Printf("[!] %s\n", message)
}
