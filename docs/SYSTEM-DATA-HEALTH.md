# System Data Health

## Overview

The **System Data Health Center** is a unified dashboard designed to monitor and resolve data integrity issues within the HomePro Manager platform. It actively scans core domains (HR, Projects, Inventory, Purchasing, Production, etc.) for missing, orphaned, or duplicated records.

## Key Metrics

- **Total Modules**: The number of system domains currently under active data health monitoring.
- **Healthy Score**: An aggregated percentage score representing overall data integrity. The score drops dynamically based on the volume and severity of issues detected.
- **Total Issues Found**: The raw count of data inconsistencies.

## Detected Anomalies

The system runs real-time queries to identify anomalies such as:

### 1. Missing Data
Identifies incomplete critical records.
- **Example**: Users or employees who have not been assigned to a specific department or role.

### 2. Orphans
Identifies records that reference entities that no longer exist or were improperly unlinked.
- **Example**: Tasks linked to a deleted or non-existent project ID.

### 3. Broken Links
Detects missing relations in strict dependencies, often caused by soft-deletions or skipped cascading rules.
- **Example**: Purchase Order Items referencing a material ID that cannot be found in the `materials` table.

### 4. Duplicates
Finds violations of unique constraints that somehow bypassed application-level validation.
- **Example**: Multiple material entries sharing the exact same unique code.

## Remediation

Every detected anomaly in the Data Health Center includes a direct **Action Link** pointing to the exact module or record where the data can be rectified. System administrators are encouraged to maintain a 100% Healthy Score.
