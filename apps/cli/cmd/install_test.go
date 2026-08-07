package cmd

import "testing"

func TestInstallSuccessMessage(t *testing.T) {
	tests := []struct {
		port int
		host string
		want string
	}{
		{port: 2002, host: "localhost", want: "DockSight is running on http://localhost:2002"},
		{port: 2002, host: "10.0.0.5", want: "DockSight is running on http://10.0.0.5:2002"},
	}
	for _, tt := range tests {
		got := installSuccessMessage(tt.port, tt.host)
		if got != tt.want {
			t.Errorf("installSuccessMessage(%d, %q) = %q, want %q", tt.port, tt.host, got, tt.want)
		}
	}
}
