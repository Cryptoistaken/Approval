# Crion SDK - AI Integration Prompt

Use this prompt with any AI assistant that has access to your codebase.

---

## Prompt

Copy and paste this:

```
Integrate Crion SDK (@cryptoistaken/crion) into my Node.js script for secure secret management via Telegram approval.

**Instructions:**
1. Read my codebase and understand the folder structure
2. Find all secrets/credentials/API keys (hardcoded values or env vars)
3. Follow the appropriate flow based on what you find

**Flow A - Hardcoded Secrets Found:**
1. Extract all hardcoded secrets into a temporary `.env` file
2. Ask me for a Phase path name OR generate a short simple name based on the script (e.g., `aws-bot`, `telegram-script`)
3. Import to Phase using CLI (NO slash in path):
   ```bash
   phase secrets import .env --env production --path <pathname>
   ```
4. **VERIFY the upload worked** before deleting .env:
   ```bash
   phase secrets list --env production --path <pathname>
   ```
   - Check the secret count matches
   - Check the secret names are correct
   - If verification fails, check if logged in: `phase auth status`
5. Only after verification succeeds, delete .env:
   ```bash
   rm .env
   ```
6. Replace hardcoded values with Crion's `getSecret('/<pathname>')` (WITH slash)

**Flow B - Env-based Secrets Found:**
1. Create a temporary `.env` file from the existing env vars
2. Ask me for a Phase path name OR generate one
3. Import to Phase (NO slash):
   ```bash
   phase secrets import .env --env production --path <pathname>
   ```
4. **VERIFY before deleting:**
   ```bash
   phase secrets list --env production --path <pathname>
   ```
5. Only delete .env after verification
6. Replace `process.env.X` with Crion's `getSecret('/<pathname>')` (WITH slash)

**Flow C - Already using Crion:**
1. Verify the configuration is correct
2. Check error handling is in place

**Final Steps (all flows):**
1. Install SDK if needed: `npm install @cryptoistaken/crion`
2. Add proper error handling with ApprovalError
3. Test by running the script and approving via Telegram

**Rules:**
- NEVER print secrets to console
- No need to configure PHASE_APP_ID (defaults are set)
- ALWAYS verify Phase upload before deleting .env
- Phase CLI: `--path mypath` (no slash)
- SDK getSecret: `getSecret('/mypath')` (with slash)

**Reference Code:**
```javascript
import { getSecret, ApprovalError } from '@cryptoistaken/crion';

async function main() {
    try {
        const secrets = await getSecret('/my-script');
        
        // Use secrets directly - NEVER console.log them!
        await doSomething(secrets.API_KEY, secrets.SECRET);
        
    } catch (error) {
        if (error instanceof ApprovalError) {
            console.error(`Approval failed: ${error.code}`);
        }
        process.exit(1);
    }
}

main();
```

**Phase CLI Reference:**
```bash
# Step 1: Import .env to Phase (NO slash)
phase secrets import .env --env production --path my-script

# Step 2: VERIFY upload worked
phase secrets list --env production --path my-script
# Check: correct count? correct names?

# Step 3: Only delete after verification
rm .env
```

**Troubleshooting:**
```bash
# Not logged in?
phase auth status
phase auth
```

**In Script (WITH slash):**
```javascript
const secrets = await getSecret('/my-script');
```
```

---

## Example Transformation

**Before (hardcoded):**
```javascript
const AWS_KEY = "AKIAEXAMPLE123456789";
const AWS_SECRET = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";

const s3 = new S3Client({ 
    credentials: { accessKeyId: AWS_KEY, secretAccessKey: AWS_SECRET }
});
```

**Step 1 - Create temp .env:**
```
AWS_KEY=AKIAEXAMPLE123456789
AWS_SECRET=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

**Step 2 - Import to Phase (NO slash):**
```bash
phase secrets import .env --env production --path aws-s3
```

**Step 3 - Verify upload:**
```bash
phase secrets list --env production --path aws-s3
# Should show: AWS_KEY, AWS_SECRET (2 secrets)
```

**Step 4 - Delete .env after verification:**
```bash
rm .env
```

**Step 5 - Final code (WITH slash):**
```javascript
import { getSecret } from '@cryptoistaken/crion';

const secrets = await getSecret('/aws-s3');

const s3 = new S3Client({ 
    credentials: { 
        accessKeyId: secrets.AWS_KEY, 
        secretAccessKey: secrets.AWS_SECRET 
    }
});
```
