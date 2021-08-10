package main

import "net/http"

var defaultHandler = (http.FileServer(http.Dir("./www")))
