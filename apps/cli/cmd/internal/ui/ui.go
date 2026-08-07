package ui

import (
	"fmt"
	"os"
	"runtime"
	"strings"
	"sync"
)

type prefixes struct {
	success string
	failure string
	info    string
	warning string
}

var unicodePrefixes = prefixes{success: "✓", failure: "✗", info: "→", warning: "⚠"}
var asciiPrefixes = prefixes{success: "[OK]", failure: "[!!]", info: "->", warning: "[!]"}

var activePrefixes = sync.OnceValue(func() prefixes {
	if unicodeSafe() {
		return unicodePrefixes
	}
	return asciiPrefixes
})

func Success(message string) {
	p := activePrefixes()
	fmt.Printf("%s %s\n", p.success, message)
}

func Error(message string) {
	p := activePrefixes()
	fmt.Printf("%s %s\n", p.failure, message)
}

func Info(message string) {
	p := activePrefixes()
	fmt.Printf("%s %s\n", p.info, message)
}

func Warning(message string) {
	p := activePrefixes()
	fmt.Printf("%s %s\n", p.warning, message)
}

func unicodeSafe() bool {
	if os.Getenv("NO_UNICODE") != "" {
		return false
	}
	if !isCharDevice(os.Stdout) {
		return false
	}
	if strings.EqualFold(os.Getenv("TERM"), "dumb") {
		return false
	}
	if runtime.GOOS == "windows" {
		term := strings.ToLower(os.Getenv("TERM"))
		if os.Getenv("WT_SESSION") == "" && !strings.Contains(term, "xterm") && os.Getenv("ConEmuANSI") != "ON" {
			return false
		}
	}
	return true
}

func isCharDevice(file *os.File) bool {
	info, err := file.Stat()
	if err != nil {
		return false
	}
	return info.Mode()&os.ModeCharDevice != 0
}

func statusPrefixes(useUnicode bool) prefixes {
	if useUnicode {
		return unicodePrefixes
	}
	return asciiPrefixes
}
