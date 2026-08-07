package ui

import "testing"

func TestStatusPrefixes(t *testing.T) {
	unicode := statusPrefixes(true)
	if unicode.success != "✓" || unicode.failure != "✗" || unicode.info != "→" || unicode.warning != "⚠" {
		t.Fatalf("unexpected unicode prefixes: %+v", unicode)
	}

	ascii := statusPrefixes(false)
	if ascii.success != "[OK]" || ascii.failure != "[!!]" || ascii.info != "->" || ascii.warning != "[!]" {
		t.Fatalf("unexpected ascii prefixes: %+v", ascii)
	}
}
