FROM node:20-alpine

RUN npm install -g pnpm

# Install bash, curl, make in one layer
RUN apk add --no-cache bash curl make
RUN apk add --no-cache sudo

# Install gum (for Alpine)
RUN wget https://github.com/charmbracelet/gum/releases/download/v0.14.0/gum_0.14.0_Linux_x86_64.tar.gz && \
    tar -xzf gum_0.14.0_Linux_x86_64.tar.gz && \
    mv gum*/gum /usr/local/bin/ && \
    rm -rf gum* gum_0.14.0_Linux_x86_64.tar.gz

WORKDIR /workspaces/NewWebsite