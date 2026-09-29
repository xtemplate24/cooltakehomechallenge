# Stage 1: download the model files
FROM alpine:3.20 AS model
RUN apk add --no-cache curl

# Download Part 1
RUN curl -fL -o /model-00001-of-00002.gguf \
  https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF/resolve/main/qwen2.5-7b-instruct-q4_k_m-00001-of-00002.gguf

# Download Part 2
RUN curl -fL -o /model-00002-of-00002.gguf \
  https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF/resolve/main/qwen2.5-7b-instruct-q4_k_m-00002-of-00002.gguf?download=true

# Stage 2: the llama.cpp web server
FROM ghcr.io/ggml-org/llama.cpp:server

# Create the folder with normal permissions
RUN mkdir -p /models && chmod 755 /models

# Copy BOTH model parts into the exact same folder
COPY --from=model /model-00001-of-00002.gguf /models/qwen2.5-7b-instruct-q4_k_m-00001-of-00002.gguf
COPY --from=model /model-00002-of-00002.gguf /models/qwen2.5-7b-instruct-q4_k_m-00002-of-00002.gguf

USER 101
EXPOSE 8080

ENTRYPOINT ["/app/llama-server"]
# Point strictly to the FIRST file (`-00001-of-00002.gguf`). llama.cpp handles the rest.
CMD ["-m", "/models/qwen2.5-7b-instruct-q4_k_m-00001-of-00002.gguf", "--host", "0.0.0.0", "--port", "8080", "-c", "4096", "-np", "1", "--threads", "4"]
