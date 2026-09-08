package docker

import "time"

// Info describes Docker Engine host metadata.
type Info struct {
	Version      string `json:"version"`
	OS           string `json:"os"`
	Architecture string `json:"architecture"`
}

// Container is a read-only discovery summary.
type Container struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Image   string `json:"image"`
	Status  string `json:"status"`
	State   string `json:"state"`
	Ports   []Port `json:"ports"`
	Created int64  `json:"created"`
}

// Port is one port mapping in the protocol's shape, shared by container.listed
// and container.inspected. Public is the host port as a string and is empty
// when the port is exposed but not published; IP is the host interface the
// mapping is bound to and is omitted when unknown.
type Port struct {
	Private  int    `json:"private"`
	Public   string `json:"public"`
	Protocol string `json:"protocol"`
	IP       string `json:"ip,omitempty"`
}
type Mount struct {
	Source string `json:"source"`
	Target string `json:"target"`
	Mode   string `json:"mode"`
}

type State struct {
	Status     string `json:"status"`
	Running    bool   `json:"running"`
	Paused     bool   `json:"paused"`
	Restarting bool   `json:"restarting"`
}

type Network struct {
	Name     string   `json:"name"`
	IP       string   `json:"ip"`
	Gateway  string   `json:"gateway"`
	DNSNames []string `json:"dns"`
}

type ContainerInspect struct {
	ID            string    `json:"id"`
	ShortID       string    `json:"shortId"`
	Name          string    `json:"name"`
	Image         string    `json:"image"`
	State         State     `json:"state"`
	Created       time.Time `json:"created"`
	StartedAt     time.Time `json:"startedAt"`
	Ports         []Port    `json:"ports"`
	Mounts        []Mount   `json:"mounts"`
	Networks      []Network `json:"networks"`
	WorkingDir    string    `json:"workingDir"`
	Cmd           []string  `json:"cmd"`
	RestartPolicy string    `json:"restartPolicy"`
	Entrypoint    []string  `json:"entrypoint"`
	Env           []string  `json:"env"`
}
