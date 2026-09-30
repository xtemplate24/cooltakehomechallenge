# Stage 1: download the model file
FROM alpine:3.20 AS model
RUN apk add --no-cache curl
RUN curl -fL -o /model.gguf \
  https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf

# Stage 2: the llama.cpp web server
FROM ghcr.io/ggml-org/llama.cpp:server

RUN mkdir -p /models && chmod 755 /models
COPY --from=model /model.gguf /models/model.gguf

USER 101
EXPOSE 8080

ENTRYPOINT ["/app/llama-server"]
CMD ["-m", "/models/model.gguf", "--host", "0.0.0.0", "--port", "8080", "-c", "4096", "-np", "1", "--threads", "4"]