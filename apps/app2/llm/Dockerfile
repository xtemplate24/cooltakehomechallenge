# Stage 1: Download both GGUF shards
FROM alpine:3.20 AS model

RUN apk add --no-cache curl

RUN mkdir -p /models

RUN curl -fL --retry 10 --retry-delay 5 \
-o /models/qwen2.5-7b-instruct-q4_k_m-00001-of-00002.gguf \
https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF/resolve/main/qwen2.5-7b-instruct-q4_k_m-00001-of-00002.gguf

RUN curl -fL --retry 10 --retry-delay 5 \
-o /models/qwen2.5-7b-instruct-q4_k_m-00002-of-00002.gguf \
https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF/resolve/main/qwen2.5-7b-instruct-q4_k_m-00002-of-00002.gguf


# Stage 2: llama.cpp server
FROM ghcr.io/ggml-org/llama.cpp:server

USER root

RUN mkdir -p /models && chmod 755 /models

COPY --from=model /models/ /models/

USER 101

EXPOSE 8080

ENTRYPOINT ["/app/llama-server"]

CMD [
"-m",
"/models/qwen2.5-7b-instruct-q4_k_m-00001-of-00002.gguf",
"--host", "0.0.0.0",
"--port", "8080",
"-c", "4096",
"-np", "1",
"--threads", "4"
]