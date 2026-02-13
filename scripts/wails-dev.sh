#!/bin/sh
# Wails Dev Wrapper for Masala Inventory Management
# This script injects the correct build target (./cmd/server) for the application
# to resolve root directory build archive issues and ensures webkit2_41 tag usage.

# Create a temporary go wrapper
mkdir -p tmp
cat << 'EOF' > tmp/go
#!/bin/sh
# Log all calls for debugging
echo "GO CALL: $@" >> /tmp/wails_go.log

# Check if this is a build-related command (build, install, run)
is_build=0
if echo "$@" | grep -qE "build|install|run"; then
    is_build=1
fi

# Check if we are building the main app (contains 'dev' or 'devtools' tags)
is_main=0
if echo "$@" | grep -qE "\-tags.*dev"; then
    is_main=1
fi

if [ $is_build -eq 1 ] && [ $is_main -eq 1 ]; then
    # Only inject if ./cmd/server isn't already in the arguments
    if ! echo "$@" | grep -q "./cmd/server"; then
        echo "  -> INJECTING ./cmd/server" >> /tmp/wails_go.log
        exec /usr/bin/go "$@" ./cmd/server
    fi
fi

# Pass through unchanged
exec /usr/bin/go "$@"
EOF
chmod +x tmp/go

# Run wails dev with the wrapper in PATH and explicit webkit tag
export PATH=$(pwd)/tmp:$PATH
wails dev -tags webkit2_41 "$@"
