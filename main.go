package main

import (
	"fmt"
	"net/http"
	"time"
)

const port = ":8080"

func main() {
	mux := http.NewServeMux()
	mux.Handle("/", defaultHandler)
	mux.HandleFunc("/hub", wsHandler)
	srv := &http.Server{
		Addr:    port,
		Handler: mux,
		//time from when the connection is accepted to when the request body is fully read
		ReadTimeout: 5 * time.Second,
		//time from the end of the request header read to the end of the response write
		WriteTimeout: 10 * time.Second,
	}
	fmt.Printf("starting server at http://localhost%s", port)
	fmt.Println(srv.ListenAndServe())
}
