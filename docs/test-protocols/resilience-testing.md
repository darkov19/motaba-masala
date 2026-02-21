# Resilience Testing Protocols

## Scope

This document defines manual verification steps for resilience scenarios that require physical host interaction.

## Protocol 1: Network Failure Simulation (Pull LAN Cable)

### Objective

Validate that the client shows reconnecting state when network is lost and auto-recovers after connectivity returns.

### Preconditions

1. Server app is running and reachable from client.
2. Client app is logged in and has an active session.
3. A screen with visible online data sync status is open.

### Steps

1. Confirm baseline:
1. Client shows connected status.
1. No reconnect overlay is visible.
1. Start a stopwatch.
1. Physically disconnect network:
1. Unplug LAN cable from client machine.
1. If Wi-Fi is available, disable Wi-Fi to ensure full disconnect.
1. Observe behavior for up to 10 seconds:
1. Confirm client enters disconnected state.
1. Confirm reconnecting overlay appears.
1. Reconnect network:
1. Reinsert LAN cable (and re-enable Wi-Fi only if required by setup).
1. Confirm client auto-reconnects without restart.
1. Record elapsed recovery time from reconnect to connected state.

### Expected Results

1. Reconnecting overlay appears after disconnect.
2. User is not required to restart client.
3. Client reconnects automatically once network is restored.
4. Recovery occurs within 5 seconds in stable LAN conditions.

### Evidence to Capture

1. Screenshot of reconnecting overlay during disconnect.
2. Screenshot of connected status after recovery.
3. Timestamped note of disconnect and reconnect timings.

## Protocol 2: Client Reboot Recovery (Hard Reboot While Draft Open)

### Objective

Validate that an unsaved draft survives client reboot and user is prompted to resume it on startup.

### Preconditions

1. Server app is running and reachable.
2. Client app is open and user is authenticated.
3. Open a form that supports draft auto-save (for example GRN or Batch form).

### Steps

1. Enter non-trivial draft data in the form (multiple fields).
2. Do not submit the form.
3. Perform hard reboot of client machine:
1. Restart from OS menu or power cycle if required by test scenario.
1. Sign in again after reboot.
4. Launch client app and wait for startup completion.
5. Observe whether resume prompt appears.
6. Choose `Resume` and verify draft fields are restored.
7. Repeat once more and choose `Discard` to verify draft clears.

### Expected Results

1. Resume prompt appears after reboot when draft exists.
2. Choosing `Resume` restores the draft content.
3. Choosing `Discard` clears stored draft and starts with empty form.
4. No app crash or unrecoverable state occurs during restart flow.

### Evidence to Capture

1. Screenshot of resume prompt.
2. Screenshot of restored draft data.
3. Screenshot after discard showing empty/new form state.
4. Reboot timestamp and app relaunch timestamp.

