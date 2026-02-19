package handler

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"sync"
	"time"
)

type ScanResult struct {
	Port int    `json:"port"`
	Open bool   `json:"open"`
}

type Response struct {
	Target  string       `json:"target"`
	Results []ScanResult `json:"results"`
}

func Handler(w http.ResponseWriter, r *http.Request) {
	target := r.URL.Query().Get("target")
	if target == "" {
		http.Error(w, "Missing target parameter", http.StatusBadRequest)
		return
	}

	// Common ports to scan
	ports := []int{21, 22, 23, 25, 53, 80, 110, 443, 3306, 3389, 8080}
	var results []ScanResult
	var wg sync.WaitGroup
	var mu sync.Mutex

	for _, port := range ports {
		wg.Add(1)
		go func(p int) {
			defer wg.Done()
			address := net.JoinHostPort(target, strconv.Itoa(p))
			conn, err := net.DialTimeout("tcp", address, 2*time.Second)
			
			mu.Lock()
			if err == nil {
				conn.Close()
				results = append(results, ScanResult{Port: p, Open: true})
			} else {
				results = append(results, ScanResult{Port: p, Open: false})
			}
			mu.Unlock()
		}(port)
	}

	wg.Wait()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(Response{
		Target:  target,
		Results: results,
	})
}
