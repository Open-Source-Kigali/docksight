package docker

import (
	"strconv"

	"github.com/docker/docker/api/types/container"
)

// PortsFromList converts the port entries Docker returns for a listed
// container into the protocol shape: lowerCamelCase keys, the host port as a
// string that is empty when the port is exposed but not published, and the
// bound host interface when Docker reports one. The result is never nil so the
// wire always carries an array, and Docker's order is preserved.
func PortsFromList(ports []container.Port) []Port {
	result := make([]Port, 0, len(ports))
	for _, port := range ports {
		public := ""
		if port.PublicPort != 0 {
			public = strconv.Itoa(int(port.PublicPort))
		}
		result = append(result, Port{
			Private:  int(port.PrivatePort),
			Public:   public,
			Protocol: port.Type,
			IP:       port.IP,
		})
	}
	return result
}
