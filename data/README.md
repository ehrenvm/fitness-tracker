# User Upload Data Format

This directory contains YAML files for bulk uploading users to Firebase.

## YAML File Format

The YAML file must contain an array of user objects. Each user object can have the following fields:

### Required Fields
- **firstName** (string): User's first name

### Optional Fields
- **lastName** (string): User's last name
- **gender** (string): One of: `"Male"`, `"Female"`, `"Non-Binary"`
- **birthdate** (string): Format must be `MM/DD/YYYY` (e.g., `"01/15/2000"`)
- **tags** (array of strings): Tags to associate with the user (e.g., `["athlete", "premium"]`)

## Example YAML File

See `users.example.yaml` for a complete example.

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
  tags:
    - beginner

- firstName: Sam
  # lastName is optional
  gender: Male
  # birthdate is optional
  # tags are optional
```

## Usage

### Method 1: Using npm script
```bash
npm run upload:users data/users.yaml
```

### Method 2: Direct node command
```bash
node scripts/upload-users.js data/users.yaml
```

## Notes

- The script will skip users that already exist (based on firstName + lastName combination)
- Invalid data (missing firstName, invalid birthdate format) will be skipped with a warning
- Duplicate users within the same file will be skipped (only the first occurrence will be added)
- All users are added with a `createdAt` timestamp
- The script uses Firebase Admin SDK, so it requires `serviceAccountKey.json` to be present in the project root
