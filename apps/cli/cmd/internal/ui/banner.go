package ui

import "fmt"

// Banner prints the DockSight ASCII logo and tagline.
func Banner() {

	fmt.Println(`
 ____             _    ____  _       _
|  _ \  ___   ___| | _/ ___|(_) __ _| |__
| | | |/ _ \ / __| |/ /\___ \| |/ _` + "`" + ` | '_ \
| |_| | (_) | (__|   <  ___) | | (_| | | | |
|____/ \___/ \___|_|\_\|____/|_|\__, |_| |_|
                               |___/`)
	fmt.Println("Container monitoring platform")
	fmt.Println()
}
