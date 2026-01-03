#!/bin/bash

# Redis Monitoring Script for Grace Period Debug
# Usage: ./monitor-redis-reconnect.sh <userId>

USER_ID=$1

if [ -z "$USER_ID" ]; then
    echo "❌ Usage: $0 <userId>"
    echo "Example: $0 694b739e57de8d3ec415ba28"
    exit 1
fi

echo "🔍 Monitoring Redis keys for user: $USER_ID"
echo "Press Ctrl+C to stop"
echo ""

while true; do
    clear
    echo "=========================================="
    echo "Redis State Monitor - $(date +%T)"
    echo "User: $USER_ID"
    echo "=========================================="
    echo ""
    
    # Get socket
    SOCKET=$(redis-cli GET "user:${USER_ID}:socket" 2>/dev/null)
    if [ -z "$SOCKET" ] || [ "$SOCKET" = "(nil)" ]; then
        SOCKET="❌ NOT SET"
    fi
    
    # Get connected status
    CONNECTED=$(redis-cli GET "user:${USER_ID}:connected" 2>/dev/null)
    if [ -z "$CONNECTED" ] || [ "$CONNECTED" = "(nil)" ]; then
        CONNECTED="❌ NOT SET"
    elif [ "$CONNECTED" = "true" ]; then
        CONNECTED="✅ true (CONNECTED)"
    else
        CONNECTED="❌ false (DISCONNECTED)"
    fi
    
    # Get disconnect timestamp
    DISCONNECT_AT=$(redis-cli GET "user:${USER_ID}:disconnectAt" 2>/dev/null)
    if [ -z "$DISCONNECT_AT" ] || [ "$DISCONNECT_AT" = "(nil)" ]; then
        DISCONNECT_AT="✅ NOT SET (no disconnect)"
        ELAPSED="N/A"
    else
        NOW=$(date +%s%3N)
        ELAPSED=$((NOW - DISCONNECT_AT))
        DISCONNECT_AT="⏰ $DISCONNECT_AT (${ELAPSED}ms ago)"
    fi
    
    # Get session
    SESSION=$(redis-cli GET "session:${USER_ID}" 2>/dev/null)
    if [ -z "$SESSION" ] || [ "$SESSION" = "(nil)" ]; then
        SESSION="❌ NOT SET"
    else
        SESSION="✅ EXISTS"
    fi
    
    # Display
    echo "📍 Current Socket:"
    echo "   $SOCKET"
    echo ""
    echo "🔌 Connected Status:"
    echo "   $CONNECTED"
    echo ""
    echo "⏱️  Disconnect Timestamp:"
    echo "   $DISCONNECT_AT"
    echo ""
    echo "💾 Session:"
    echo "   $SESSION"
    echo ""
    echo "=========================================="
    echo ""
    
    # Grace period status
    if [ "$CONNECTED" = "❌ false (DISCONNECTED)" ] && [ ! -z "$ELAPSED" ] && [ "$ELAPSED" != "N/A" ]; then
        if [ $ELAPSED -lt 5000 ]; then
            GRACE_STATUS="⏰ GRACE PERIOD ACTIVE (${ELAPSED}ms / 5000ms)"
        else
            GRACE_STATUS="❌ GRACE PERIOD EXPIRED (${ELAPSED}ms > 5000ms)"
        fi
        echo "🚨 Grace Period Status:"
        echo "   $GRACE_STATUS"
        echo ""
    fi
    
    # Check for all disconnect keys
    echo "🔎 All Disconnect Keys:"
    redis-cli --scan --pattern "user:*:disconnectAt" 2>/dev/null | while read key; do
        val=$(redis-cli GET "$key" 2>/dev/null)
        now=$(date +%s%3N)
        elapsed=$((now - val))
        echo "   $key: ${elapsed}ms ago"
    done
    
    sleep 1
done
