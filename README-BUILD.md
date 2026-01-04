# Build Instructions

## Windows (PowerShell)

Since `make` is not available by default on Windows, use the PowerShell script:

```powershell
# Build frontend only
.\build.ps1 frontend

# Build backend only
.\build.ps1 backend

# Build both
.\build.ps1 all

# Start frontend
.\build.ps1 start-frontend

# Start backend
.\build.ps1 start-backend

# Start both
.\build.ps1 start-all
```

## Linux/macOS (or Windows with make installed)

Use the Makefile:

```bash
# Build frontend only
make build-frontend

# Build backend only
make build-backend

# Build both
make build-all

# Start frontend
make start-frontend

# Start backend
make start-backend

# Start both
make start-all
```

## Installing make on Windows

If you want to use the Makefile on Windows, you can install make via:

1. **Chocolatey**: `choco install make`
2. **Scoop**: `scoop install make`
3. **WSL**: Use Windows Subsystem for Linux
4. **Git Bash**: Comes with make (if you have Git for Windows)

