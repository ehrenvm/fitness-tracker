# Scripts Documentation

This directory contains utility scripts for managing the fitness tracker database and user data.

## Prerequisites

All scripts require:
- Node.js installed
- Firebase Admin SDK credentials (`serviceAccountKey.json` in project root)
- Environment variables configured in `.env` file
- Dependencies installed (`npm install`)

## Scripts Overview

### 1. `migrate-to-firstname-lastname.js`

**Purpose:** One-time database migration script that converts existing user data from a single `name` field to separate `firstName` and `lastName` fields.

**What it does:**
- Updates all user documents in the `users` collection to add `firstName` and `lastName` fields
- Splits existing `name` values into first and last name components
- Updates all `results` documents to use the new name format
- Preserves existing data (keeps old `name` field for backward compatibility during transition)

**Usage:**
```bash
npm run migrate:name-to-firstname-lastname
```

Or directly:
```bash
node scripts/migrate-to-firstname-lastname.js
```

**When to use:**
- One-time migration when upgrading from old database schema
- Should only be run once after the codebase has been updated to support firstName/lastName

**Notes:**
- Skips users that have already been migrated
- Uses batched writes for efficiency
- Safe to run multiple times (idempotent)

---

### 2. `csv-to-yaml.js`

**Purpose:** Converts CSV files containing user data into YAML format for bulk upload.

**What it does:**
- Reads a CSV file with user data (firstName, lastName, gender, birthdate)
- Parses and validates the data
- Converts to YAML format matching the upload script requirements
- Writes a new YAML file ready for upload

**Usage:**
```bash
# Specify both input and output files
node scripts/csv-to-yaml.js data/noco_users.csv data/users.yaml

# Auto-generate output filename (replaces .csv with .yaml)
node scripts/csv-to-yaml.js data/noco_users.csv
```

Or using npm script:
```bash
npm run convert:csv-to-yaml data/noco_users.csv data/users.yaml
```

**CSV Format:**
The CSV file should have a header row with columns:
- `firstName` (required)
- `lastName` (optional)
- `gender` (optional: "Male", "Female", "Non-Binary")
- `birthdate` (optional: format MM/DD/YYYY)

**Example CSV:**
```csv
firstName,lastName,gender,birthdate
John,Doe,Male,01/15/1990
Jane,Smith,Female,03/22/1995
```

**Output:**
Creates a YAML file in the format expected by `upload-users.js`

**When to use:**
- When you have user data in CSV format and need to upload it
- First step in the bulk upload workflow

---

### 3. `upload-users.js`

**Purpose:** Bulk uploads users from a YAML file to Firebase.

**What it does:**
- Reads a YAML file containing user data
- Validates user data (requires firstName, validates birthdate format)
- Checks for existing users to avoid duplicates
- Uploads new users to Firebase in batches
- Provides progress feedback and summary

**Usage:**
```bash
node scripts/upload-users.js data/users.yaml
```

Or using npm script:
```bash
npm run upload:users data/users.yaml
```

**YAML Format:**
See `data/users.example.yaml` for the complete format specification.

**Required fields:**
- `firstName` (string)

**Optional fields:**
- `lastName` (string)
- `gender` (string): "Male", "Female", or "Non-Binary"
- `birthdate` (string): Format MM/DD/YYYY (e.g., "01/15/2000")
- `tags` (array of strings)

**Example YAML:**
```yaml
- firstName: John
  lastName: Doe
  gender: Male
  birthdate: "01/15/1990"
  tags:
    - athlete
    - premium

- firstName: Jane
  lastName: Smith
  gender: Female
  birthdate: "03/22/1995"
```

**Features:**
- Automatically skips duplicate users (based on firstName + lastName)
- Validates data before upload
- Shows detailed progress and summary
- Uses batched writes for efficiency

**When to use:**
- Bulk importing users from external sources
- Final step after converting CSV to YAML

---

## Common Workflows

### Workflow 1: Migrate Existing Database
```bash
# 1. Run the migration script (one-time)
npm run migrate:name-to-firstname-lastname
```

### Workflow 2: Bulk Upload from CSV
```bash
# 1. Convert CSV to YAML
node scripts/csv-to-yaml.js data/noco_users.csv data/users.yaml

# 2. Upload to Firebase
npm run upload:users data/users.yaml
```

### Workflow 3: Upload from Existing YAML
```bash
# If you already have a YAML file
npm run upload:users data/users.yaml
```

## Troubleshooting

### "Missing or insufficient permissions" Error
- Ensure `serviceAccountKey.json` exists in the project root
- Verify the service account has proper Firestore permissions

### "CSV file is empty" Error
- Check that the CSV file exists and has content
- Ensure the file path is correct (relative to project root)

### "YAML file must contain an array of users" Error
- Verify the YAML file format matches the example
- Check that the file contains a YAML array (starts with `-`)

### Duplicate Users Skipped
- This is expected behavior - the script prevents duplicate entries
- Check existing users in Firebase if you expect a user to be added

## Dependencies

These scripts use the following npm packages:
- `firebase-admin` - Firebase Admin SDK for server-side operations
- `js-yaml` - YAML parsing and generation

Install dependencies with:
```bash
npm install
```

## Security Notes

- **Never commit `serviceAccountKey.json`** to version control
- The file is already in `.gitignore`
- Keep your service account credentials secure
- Use environment variables for sensitive configuration when possible
