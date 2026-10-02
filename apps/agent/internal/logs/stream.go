package logs

import (
	"context"
	"fmt"
	"io"
	"sync"
	"time"

	"docksight-agent/internal/logger"
)

const (
	defaultBatchSize     = 50
	defaultBatchInterval = 200 * time.Millisecond
	defaultTail          = 100
)

// Stream is one active container log subscription keyed by requestId.
type Stream struct {
	RequestID   string
	ContainerID string

	cancel context.CancelFunc
	reader io.ReadCloser

	mu     sync.Mutex
	closed bool
}

func (s *Stream) close() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.closed {
		return
	}
	s.closed = true
	if s.cancel != nil {
		s.cancel()
	}
	if s.reader != nil {
		_ = s.reader.Close()
	}
}

func (s *Stream) run(
	ctx context.Context,
	emit ChunkEmitter,
	batchSize int,
	batchInterval time.Duration,
) {
	defer s.close()

	if batchSize <= 0 {
		batchSize = defaultBatchSize
	}
	if batchInterval <= 0 {
		batchInterval = defaultBatchInterval
	}

	entries := make(chan Entry, batchSize*2)
	errCh := make(chan error, 1)

	go func() {
		defer close(entries)
		err := DecodeLogStream(s.reader, func(entry Entry) error {
			select {
			case <-ctx.Done():
				return ctx.Err()
			case entries <- entry:
				return nil
			}
		})
		if err != nil && ctx.Err() == nil {
			errCh <- err
		}
	}()

	batch := make([]Entry, 0, batchSize)
	ticker := time.NewTicker(batchInterval)
	defer ticker.Stop()

	flush := func() {
		if len(batch) == 0 || emit == nil {
			batch = batch[:0]
			return
		}
		chunk := Chunk{
			RequestID:   s.RequestID,
			ContainerID: s.ContainerID,
			Entries:     append([]Entry(nil), batch...),
		}
		batch = batch[:0]
		if err := emit.EmitLogChunk(chunk); err != nil {
			logger.Warn("emit log chunk failed",
				"requestId", s.RequestID,
				"error", err.Error(),
			)
		}
	}

	for {
		select {
		case <-ctx.Done():
			flush()
			return
		case err := <-errCh:
			flush()
			if err != nil {
				logger.Warn("log stream ended with error",
					"requestId", s.RequestID,
					"containerId", s.ContainerID,
					"error", err.Error(),
				)
			}
			return
		case entry, ok := <-entries:
			if !ok {
				flush()
				return
			}
			batch = append(batch, entry)
			if len(batch) >= batchSize {
				flush()
			}
		case <-ticker.C:
			flush()
		}
	}
}

// newStream opens Docker logs and starts the decode/batch goroutine.
func newStream(
	parent context.Context,
	engine Engine,
	opts SubscribeOptions,
	emit ChunkEmitter,
) (*Stream, error) {
	if opts.RequestID == "" {
		return nil, fmt.Errorf("subscribe: requestId is required")
	}
	if opts.ContainerID == "" {
		return nil, fmt.Errorf("subscribe: containerId is required")
	}

	tail := opts.Tail
	if tail <= 0 {
		tail = defaultTail
	}

	ctx, cancel := context.WithCancel(parent)
	reader, err := engine.ContainerLogs(ctx, opts.ContainerID, fmt.Sprintf("%d", tail), opts.Follow)
	if err != nil {
		cancel()
		return nil, fmt.Errorf("subscribe: %w", err)
	}

	stream := &Stream{
		RequestID:   opts.RequestID,
		ContainerID: opts.ContainerID,
		cancel:      cancel,
		reader:      reader,
	}

	go stream.run(ctx, emit, defaultBatchSize, defaultBatchInterval)
	return stream, nil
}
