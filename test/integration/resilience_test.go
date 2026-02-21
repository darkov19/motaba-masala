package integration

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

func TestMain(m *testing.M) {
	if os.Getenv("RESILIENCE_HELPER_MODE") == "1" {
		os.Exit(runResilienceHelperServer())
	}
	os.Exit(m.Run())
}

func TestWALRecoveryIntegration(t *testing.T) {
	t.Parallel()

	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "wal_recovery.db")
	walPath := dbPath + "-wal"

	port, err := getFreePort()
	if err != nil {
		t.Skipf("skipping WAL recovery integration test in restricted runtime: %v", err)
	}
	cmd := startHelperServer(t, dbPath, port)

	itemName := "wal-recovery-item"
	postJSON(t, fmt.Sprintf("http://127.0.0.1:%d/items", port), map[string]string{
		"name": itemName,
	})

	within(t, 5*time.Second, func() bool {
		info, err := os.Stat(walPath)
		return err == nil && info.Size() > 0
	}, "expected non-empty WAL file before crash")

	if err := cmd.Process.Kill(); err != nil {
		t.Fatalf("failed to kill helper process: %v", err)
	}
	_ = cmd.Wait()

	restartedPort, err := getFreePort()
	if err != nil {
		t.Skipf("skipping WAL recovery restart phase in restricted runtime: %v", err)
	}
	restarted := startHelperServer(t, dbPath, restartedPort)
	t.Cleanup(func() {
		_ = restarted.Process.Kill()
		_ = restarted.Wait()
	})

	items := getItems(t, restartedPort)
	if len(items) == 0 {
		t.Fatal("expected at least one item after restart")
	}
	if !contains(items, itemName) {
		t.Fatalf("expected item %q in response, got %#v", itemName, items)
	}

	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		t.Fatalf("failed to open sqlite db: %v", err)
	}
	defer db.Close()

	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM items WHERE name = ?`, itemName).Scan(&count); err != nil {
		t.Fatalf("failed to query sqlite row: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected one persisted row for %q, got %d", itemName, count)
	}

	var integrity string
	if err := db.QueryRow(`PRAGMA integrity_check`).Scan(&integrity); err != nil {
		t.Fatalf("failed to run integrity_check: %v", err)
	}
	if integrity != "ok" {
		t.Fatalf("expected integrity_check=ok, got %q", integrity)
	}

	if _, err := db.Exec(`PRAGMA wal_checkpoint(TRUNCATE)`); err != nil {
		t.Fatalf("failed to checkpoint WAL after restart: %v", err)
	}

	info, err := os.Stat(walPath)
	if err != nil {
		if !os.IsNotExist(err) {
			t.Fatalf("failed to stat WAL file after checkpoint: %v", err)
		}
	} else if info.Size() != 0 {
		t.Fatalf("expected WAL file to be fully checkpointed (size=0), got %d bytes", info.Size())
	}
}

func TestUDPRediscoveryIntegration(t *testing.T) {
	t.Parallel()

	listenPort, err := getFreePort()
	if err != nil {
		t.Skipf("skipping UDP rediscovery integration test in restricted runtime: %v", err)
	}
	listenAddr := &net.UDPAddr{IP: net.ParseIP("127.0.0.1"), Port: listenPort}
	conn, err := net.ListenUDP("udp", listenAddr)
	if err != nil {
		t.Skipf("skipping UDP rediscovery integration test in restricted runtime: %v", err)
	}
	defer conn.Close()

	client := newMockClientListener(conn)
	client.Start()
	defer client.Stop()

	stopOld := startMockBroadcaster(t, conn.LocalAddr().String(), endpointUpdate{
		Host: "10.0.0.20",
		Port: 8090,
	})
	defer stopOld()

	within(t, 5*time.Second, func() bool {
		target := client.Target()
		return target.Host == "10.0.0.20" && target.Port == 8090
	}, "client did not receive initial discovery target")

	stopOld()

	stopNew := startMockBroadcaster(t, conn.LocalAddr().String(), endpointUpdate{
		Host: "10.0.0.21",
		Port: 9091,
	})
	defer stopNew()

	within(t, 5*time.Second, func() bool {
		target := client.Target()
		return target.Host == "10.0.0.21" && target.Port == 9091
	}, "client did not re-discover server endpoint on changed IP/port")
}

func startHelperServer(t *testing.T, dbPath string, port int) *exec.Cmd {
	t.Helper()

	cmd := exec.Command(os.Args[0], "-test.run", "^TestResilienceHelperServer$")
	cmd.Env = append(os.Environ(),
		"RESILIENCE_HELPER_MODE=1",
		"RESILIENCE_HELPER_DB="+dbPath,
		"RESILIENCE_HELPER_PORT="+strconv.Itoa(port),
	)
	cmd.Stdout = io.Discard
	cmd.Stderr = io.Discard
	if err := cmd.Start(); err != nil {
		t.Fatalf("failed to start helper process: %v", err)
	}
	t.Cleanup(func() {
		_ = cmd.Process.Kill()
		_ = cmd.Wait()
	})

	within(t, 5*time.Second, func() bool {
		resp, err := http.Get(fmt.Sprintf("http://127.0.0.1:%d/health", port))
		if err != nil {
			return false
		}
		defer resp.Body.Close()
		return resp.StatusCode == http.StatusOK
	}, "helper server failed health check")

	return cmd
}

func TestResilienceHelperServer(t *testing.T) {
	if os.Getenv("RESILIENCE_HELPER_MODE") != "1" {
		t.Skip("helper mode only")
	}
}

func runResilienceHelperServer() int {
	dbPath := os.Getenv("RESILIENCE_HELPER_DB")
	portText := os.Getenv("RESILIENCE_HELPER_PORT")
	if strings.TrimSpace(dbPath) == "" || strings.TrimSpace(portText) == "" {
		return 2
	}

	port, err := strconv.Atoi(portText)
	if err != nil {
		return 2
	}

	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return 2
	}
	defer db.Close()

	if _, err := db.Exec(`PRAGMA journal_mode=WAL;`); err != nil {
		return 2
	}
	if _, err := db.Exec(`PRAGMA wal_autocheckpoint=0;`); err != nil {
		return 2
	}
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL);`); err != nil {
		return 2
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	mux.HandleFunc("/items", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			defer r.Body.Close()
			var payload struct {
				Name string `json:"name"`
			}
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				http.Error(w, "invalid json", http.StatusBadRequest)
				return
			}
			if strings.TrimSpace(payload.Name) == "" {
				http.Error(w, "name is required", http.StatusBadRequest)
				return
			}
			if _, err := db.Exec(`INSERT INTO items(name) VALUES(?)`, payload.Name); err != nil {
				http.Error(w, "insert failed", http.StatusInternalServerError)
				return
			}
			w.WriteHeader(http.StatusCreated)
		case http.MethodGet:
			rows, err := db.Query(`SELECT name FROM items ORDER BY id`)
			if err != nil {
				http.Error(w, "query failed", http.StatusInternalServerError)
				return
			}
			defer rows.Close()

			names := make([]string, 0)
			for rows.Next() {
				var name string
				if err := rows.Scan(&name); err != nil {
					http.Error(w, "scan failed", http.StatusInternalServerError)
					return
				}
				names = append(names, name)
			}
			if err := rows.Err(); err != nil {
				http.Error(w, "rows failed", http.StatusInternalServerError)
				return
			}
			_ = json.NewEncoder(w).Encode(struct {
				Items []string `json:"items"`
			}{Items: names})
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	})

	server := &http.Server{
		Addr:              "127.0.0.1:" + strconv.Itoa(port),
		Handler:           mux,
		ReadHeaderTimeout: 2 * time.Second,
	}
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return 1
	}
	return 0
}

func postJSON(t *testing.T, endpoint string, payload any) {
	t.Helper()
	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("failed to marshal request: %v", err)
	}
	resp, err := http.Post(endpoint, "application/json", bytes.NewReader(body))
	if err != nil {
		t.Fatalf("failed to POST %s: %v", endpoint, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusCreated {
		raw, _ := io.ReadAll(resp.Body)
		t.Fatalf("unexpected POST status %d: %s", resp.StatusCode, string(raw))
	}
}

func getItems(t *testing.T, port int) []string {
	t.Helper()
	resp, err := http.Get(fmt.Sprintf("http://127.0.0.1:%d/items", port))
	if err != nil {
		t.Fatalf("failed to GET items: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(resp.Body)
		t.Fatalf("unexpected GET status %d: %s", resp.StatusCode, string(raw))
	}

	var payload struct {
		Items []string `json:"items"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("failed to decode items payload: %v", err)
	}
	return payload.Items
}

func getFreePort() (int, error) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, err
	}
	defer l.Close()
	return l.Addr().(*net.TCPAddr).Port, nil
}

func within(t *testing.T, timeout time.Duration, cond func() bool, failMessage string) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if cond() {
			return
		}
		time.Sleep(100 * time.Millisecond)
	}
	t.Fatal(failMessage)
}

func contains(items []string, expected string) bool {
	for _, item := range items {
		if item == expected {
			return true
		}
	}
	return false
}

type endpointUpdate struct {
	Host string `json:"host"`
	Port int    `json:"port"`
}

type mockClientListener struct {
	conn   *net.UDPConn
	cancel context.CancelFunc

	mu     sync.RWMutex
	target endpointUpdate
}

func newMockClientListener(conn *net.UDPConn) *mockClientListener {
	return &mockClientListener{
		conn: conn,
	}
}

func (m *mockClientListener) Start() {
	ctx, cancel := context.WithCancel(context.Background())
	m.cancel = cancel

	go func() {
		buf := make([]byte, 1024)
		for {
			_ = m.conn.SetReadDeadline(time.Now().Add(500 * time.Millisecond))
			n, _, err := m.conn.ReadFromUDP(buf)
			if err != nil {
				if ne, ok := err.(net.Error); ok && ne.Timeout() {
					select {
					case <-ctx.Done():
						return
					default:
						continue
					}
				}
				select {
				case <-ctx.Done():
					return
				default:
					continue
				}
			}

			var update endpointUpdate
			if err := json.Unmarshal(buf[:n], &update); err != nil {
				continue
			}
			m.mu.Lock()
			m.target = update
			m.mu.Unlock()
		}
	}()
}

func (m *mockClientListener) Stop() {
	if m.cancel != nil {
		m.cancel()
	}
}

func (m *mockClientListener) Target() endpointUpdate {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.target
}

func startMockBroadcaster(t *testing.T, targetAddr string, update endpointUpdate) func() {
	t.Helper()

	remote, err := net.ResolveUDPAddr("udp", targetAddr)
	if err != nil {
		t.Fatalf("failed to resolve target udp addr: %v", err)
	}
	conn, err := net.DialUDP("udp", nil, remote)
	if err != nil {
		t.Fatalf("failed to dial udp addr: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	go func() {
		ticker := time.NewTicker(100 * time.Millisecond)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				payload, _ := json.Marshal(update)
				_, _ = conn.Write(payload)
			}
		}
	}()

	return func() {
		cancel()
		_ = conn.Close()
	}
}
