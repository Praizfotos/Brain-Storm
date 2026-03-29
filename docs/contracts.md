# Smart Contracts Guide

This guide covers the smart contracts deployed on the Stellar network (Soroban) for the Brain-Storm platform.

## Contract Addresses

| Contract | Network | Address |
|----------|---------|---------|
| Certificate | Testnet | `CDA...` (Replace with actual) |
| Token (BST) | Testnet | `CAS...` (Replace with actual) |
| Analytics | Testnet | `CBZ...` (Replace with actual) |

## Certificate Contract

The Certificate contract manages soulbound NFTs issued to students upon course completion.

### Function Signatures

- `initialize(admin: Address)`: Set the admin of the contract.
- `mint_certificate(admin: Address, recipient: Address, course_id: Symbol, metadata_url: String) -> u64`: Mint a new certificate.
- `get_certificate(id: u64) -> Option<CertificateRecord>`: Get certificate details.
- `get_certificates_by_owner(owner: Address) -> Vec<CertificateRecord>`: Get all certificates for a student.

### Event Schema

| Topic 1 | Topic 2 | Topic 3 | Data |
|---------|---------|---------|------|
| `mint` | `to` | `recipient: Address` | `(id: u64, course_id: Symbol)` |

### CLI Example

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source admin \
  --network testnet \
  -- \
  mint_certificate \
  --admin <ADMIN_ADDRESS> \
  --recipient <STUDENT_ADDRESS> \
  --course_id RUST101 \
  --metadata_url https://api.brain-storm.com/v1/certs/1
```

## Token Contract (BST)

The Brain-Storm Token (BST) is a standard SEP-0041 token with vesting features for instructors.

### Function Signatures

- `mint(to: Address, amount: i128)`: Mint tokens (admin only).
- `transfer(from: Address, to: Address, amount: i128)`: Transfer tokens.
- `create_vesting(admin: Address, beneficiary: Address, total_amount: i128, cliff_ledger: u32, end_ledger: u32)`: Set up a vesting schedule.
- `claim_vesting(beneficiary: Address)`: Claim matured tokens.

### CLI Example

```bash
stellar contract invoke \
  --id <TOKEN_ID> \
  --source admin \
  --network testnet \
  -- \
  mint \
  --to <USER_ADDRESS> \
  --amount 1000000000
```

## Analytics Contract

Tracks student progress on-chain.

### Function Signatures

- `record_progress(caller: Address, student: Address, course_id: Symbol, progress_pct: u32)`: Update progress (0-100).
- `get_progress(student: Address, course_id: Symbol) -> Option<ProgressRecord>`: Read progress.

### Event Schema

| Topic 1 | Topic 2 | Data |
|---------|---------|------|
| `analytics` | `prog_upd` | `(student, course_id, progress_pct)` |
| `analytics` | `completed` | `(student, course_id)` |

---

## TypeScript Integration

Example using `@stellar/stellar-sdk`:

```typescript
import { Contract, Address, xdr } from '@stellar/stellar-sdk';

async function mintCert(studentAddr: string, courseId: string) {
  const contract = new Contract(CERT_CONTRACT_ID);
  
  // Build the call
  const tx = await contract.call(
    'mint_certificate',
    Address.fromString(ADMIN_ADDR).toScVal(),
    Address.fromString(studentAddr).toScVal(),
    xdr.ScVal.scvSymbol(courseId),
    xdr.ScVal.scvString(metadataUrl)
  );
  
  // Submit transaction...
}
```

## End-to-End Credential Issuance Flow

1. **Progress Update**: As a student completes lessons, the backend calls `AnalyticsContract.record_progress`.
2. **Completion Trigger**: When `progress_pct` reaches `100`, the `AnalyticsContract` emits a `completed` event.
3. **Verification**: The backend listens for the `completed` event and verifies the student's eligibility.
4. **Certificate Minting**: The backend calls `CertificateContract.mint_certificate` to issue the Soulbound NFT to the student.
5. **UI Update**: The student's dashboard reflects the new certificate, fetched via `get_certificates_by_owner`.
