package main

import (
	"bytes"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gobwas/ws"
	"github.com/gobwas/ws/wsutil"
)

type File []byte

type Header struct {
	Name         string    `json:"name"`
	LastModified time.Time `json:"lastModified"`
	MIMEType     string    `json:"mimeType"`
}

type Envelope struct {
	Header Header
	File   File
}

const headerLengthSize = 4

func parseEnvelope(rawBytes []byte) (Envelope, error) {
	if len(rawBytes) < headerLengthSize {
		return Envelope{}, errors.New("invalid envelope: less that 4 bytes provided for header length")
	}
	var headerLength int32
	buf := bytes.NewBuffer(rawBytes[0:headerLengthSize])
	err := binary.Read(buf, binary.LittleEndian, &headerLength)
	if err != nil {
		return Envelope{}, fmt.Errorf("reading header length: %w", err)
	}
	if headerLength < 3 {
		return Envelope{}, fmt.Errorf("header too short: length %d", headerLength)
	}
	headerEnd := headerLengthSize + headerLength
	headerBytes := rawBytes[headerLengthSize:headerEnd]
	var header Header
	err = json.Unmarshal(headerBytes, &header)
	if err != nil {
		return Envelope{}, fmt.Errorf("unmarshalling header: %w", err)
	}
	fileStart := headerLengthSize + headerLength
	return Envelope{
		Header: header,
		File:   rawBytes[fileStart:],
	}, nil
}

var wsHandler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
	fmt.Println("requesting upgrade to websocket")
	conn, _, _, err := ws.UpgradeHTTP(r, w)
	if err != nil {
		panic(err)
	}
	go func() {
		defer conn.Close()

		for {
			msg, op, err := wsutil.ReadClientData(conn)
			var closedError wsutil.ClosedError
			if err != nil && errors.As(err, &closedError) {
				fmt.Println("browser navigated away")
				break
			}
			if errors.Is(err, io.EOF) {
				fmt.Println("got EOF")
				continue
			}
			if err != nil {
				fmt.Println("unexpected (error):", op, "->", err.Error())
				continue
			}
			if op == ws.OpClose {
				fmt.Println("client closed connection")
				break
			}
			if op.IsData() {
				fmt.Printf("received message, length %d\n", len(msg))
				envelope, err := parseEnvelope(msg)
				if err != nil {
					fmt.Printf("parsing envelope failed: %s\n", err)
					continue
				}
				file := filepath.Join("out", envelope.Header.Name)
				err = os.WriteFile(file, envelope.File, 0644)
				if err != nil {
					fmt.Printf("writing file %s failed: %s\n", envelope.Header.Name, err)
					continue
				}
				fmt.Printf("wrote %s, type %s, last modified %v\n",
					envelope.Header.Name, envelope.Header.MIMEType, envelope.Header.LastModified)
			}
		}
		fmt.Println("cleaning up connection")
	}()

})
