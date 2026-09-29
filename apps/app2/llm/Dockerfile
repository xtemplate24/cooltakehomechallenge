# Stage 1: download the model file (curl lives here, not in the final image)
FROM alpine:3.20 AS model
RUN apk add --no-cache curl
RUN curl -fL -o /model.gguf \
  https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf

# Stage 2: the llama.cpp web server
# TODO: pin by digest. Run `docker pull ghcr.io/ggml-org/llama.cpp:server`
# then `docker inspect --format='{{index .RepoDigests 0}}' ghcr.io/ggml-org/llama.cpp:server`
# and replace the tag below with tag@sha256:...
FROM ghcr.io/ggml-org/llama.cpp:server

COPY --from=model --chmod=0644 /model.gguf /models/model.gguf

USER 101
EXPOSE 8080

ENTRYPOINT ["/app/llama-server"]
CMD ["-m", "/models/model.gguf", "--host", "0.0.0.0", "--port", "8080", "-c", "2048", "-np", "1", "--threads", "4"]