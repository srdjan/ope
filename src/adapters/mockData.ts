/**
 * Mock dataset for realistic demo responses.
 * Each entry maps keywords to a pre-defined response.
 */

export type MockEntry = {
  readonly keywords: ReadonlyArray<string>;
  readonly domain?: string;
  readonly response: {
    readonly answer: string;
    readonly citations: ReadonlyArray<string>;
  };
};

export const MOCK_DATASET: ReadonlyArray<MockEntry> = [
  // TypeScript (code domain)
  {
    keywords: ["typescript"],
    domain: "code",
    response: {
      answer:
        "TypeScript is a strongly-typed programming language developed by Microsoft that builds on JavaScript. It adds optional static typing, classes, and interfaces, enabling developers to catch errors at compile time rather than runtime. TypeScript code compiles to plain JavaScript, making it compatible with any browser or JavaScript environment.\n\nKey benefits include:\n- **Type Safety**: Catch type errors during development\n- **Better IDE Support**: Enhanced autocomplete, refactoring, and navigation\n- **Modern Features**: Use ES6+ features with backward compatibility\n- **Gradual Adoption**: Add types incrementally to existing JavaScript projects\n\nTypeScript is widely used in large-scale applications where maintainability and developer productivity are priorities.",
      citations: ["https://www.typescriptlang.org/docs/"],
    },
  },

  // Raft consensus (technical domain)
  {
    keywords: ["raft", "consensus algorithm"],
    domain: "technical",
    response: {
      answer:
        "Raft is a consensus algorithm designed for managing replicated logs in distributed systems. It was created as an understandable alternative to Paxos while providing equivalent guarantees.\n\nRaft works through three key mechanisms:\n\n1. **Leader Election**: One server is elected leader and handles all client requests. If the leader fails, a new election occurs.\n\n2. **Log Replication**: The leader receives commands, appends them to its log, and replicates entries to followers. A command is committed once a majority acknowledges it.\n\n3. **Safety**: Raft guarantees that committed entries are durable and all servers eventually agree on the same log.\n\nThe algorithm uses randomized election timeouts to prevent split votes and heartbeats to maintain leadership. This design makes Raft easier to understand and implement than Paxos while being equally correct for building reliable distributed systems.",
      citations: ["https://raft.github.io/"],
    },
  },

  // REST API (code domain)
  {
    keywords: ["rest api", "restful"],
    domain: "code",
    response: {
      answer:
        "REST (Representational State Transfer) is an architectural style for designing networked applications. A REST API uses HTTP methods to perform operations on resources identified by URLs.\n\nCore principles:\n- **Stateless**: Each request contains all information needed; no session state on server\n- **Resource-Based**: URLs identify resources (e.g., `/users/123`)\n- **HTTP Methods**: GET (read), POST (create), PUT (update), DELETE (remove)\n- **Representations**: Resources can be represented as JSON, XML, etc.\n\nExample endpoints:\n```\nGET    /api/users      - List all users\nPOST   /api/users      - Create a user\nGET    /api/users/123  - Get user 123\nPUT    /api/users/123  - Update user 123\nDELETE /api/users/123  - Delete user 123\n```\n\nREST APIs are widely adopted due to their simplicity, scalability, and compatibility with web technologies.",
      citations: [
        "https://developer.mozilla.org/en-US/docs/Glossary/REST",
      ],
    },
  },

  // Docker (technical domain)
  {
    keywords: ["docker", "container"],
    domain: "technical",
    response: {
      answer:
        "Docker is a platform for developing, shipping, and running applications in containers. Containers are lightweight, isolated environments that package an application with all its dependencies.\n\nKey concepts:\n- **Images**: Read-only templates containing the application and its environment\n- **Containers**: Running instances of images, isolated from the host system\n- **Dockerfile**: Script defining how to build an image\n- **Docker Hub**: Public registry for sharing images\n\nDocker vs VMs:\n- **Containers** share the host OS kernel, start in seconds, use less memory\n- **VMs** run full OS copies, take minutes to start, provide stronger isolation\n\nCommon commands:\n```bash\ndocker build -t myapp .    # Build image\ndocker run -p 8080:80 myapp # Run container\ndocker ps                   # List containers\n```\n\nDocker simplifies deployment by ensuring applications run consistently across environments.",
      citations: ["https://docs.docker.com/get-started/"],
    },
  },

  // Machine Learning (educational domain)
  {
    keywords: ["machine learning", "ml"],
    domain: "educational",
    response: {
      answer:
        "Machine Learning (ML) is a subset of artificial intelligence where systems learn patterns from data to make predictions or decisions without explicit programming.\n\nThree main types:\n\n1. **Supervised Learning**: Train on labeled data (input-output pairs)\n   - Classification: Predict categories (spam/not spam)\n   - Regression: Predict continuous values (house prices)\n\n2. **Unsupervised Learning**: Find patterns in unlabeled data\n   - Clustering: Group similar items\n   - Dimensionality reduction: Simplify data\n\n3. **Reinforcement Learning**: Learn through trial and error with rewards\n   - Used in games, robotics, autonomous systems\n\nCommon algorithms include linear regression, decision trees, neural networks, and support vector machines. ML powers recommendation systems, image recognition, natural language processing, and countless other applications transforming industries today.",
      citations: [],
    },
  },

  // Photosynthesis (academic domain)
  {
    keywords: ["photosynthesis"],
    domain: "academic",
    response: {
      answer:
        "Photosynthesis is the biological process by which plants, algae, and some bacteria convert light energy into chemical energy stored in glucose. This process is fundamental to life on Earth, producing oxygen and forming the base of most food chains.\n\nThe process occurs in two stages:\n\n**1. Light-Dependent Reactions** (in thylakoid membranes):\n- Chlorophyll absorbs sunlight\n- Water molecules split, releasing oxygen\n- ATP and NADPH are produced\n\n**2. Calvin Cycle** (in stroma):\n- CO2 is fixed into organic molecules\n- ATP and NADPH power glucose synthesis\n- The cycle regenerates its starting molecule (RuBP)\n\nOverall equation:\n6CO2 + 6H2O + light energy → C6H12O6 + 6O2\n\nPhotosynthesis removes approximately 400 billion tons of CO2 from the atmosphere annually, making it crucial for climate regulation.",
      citations: [
        "https://en.wikipedia.org/wiki/Photosynthesis",
        "https://www.nature.com/scitable/topicpage/photosynthesis-in-higher-plants-14182714/",
      ],
    },
  },

  // Team Productivity (business domain)
  {
    keywords: ["team productivity", "productivity"],
    domain: "business",
    response: {
      answer:
        "Improving team productivity requires a combination of clear processes, effective tools, and healthy team dynamics.\n\nKey strategies:\n\n**1. Clear Goals & Priorities**\n- Define measurable objectives (OKRs, KPIs)\n- Prioritize ruthlessly; say no to low-impact work\n- Align individual tasks with team goals\n\n**2. Effective Communication**\n- Daily standups for synchronization\n- Async communication for deep work\n- Document decisions and context\n\n**3. Reduce Friction**\n- Automate repetitive tasks\n- Minimize unnecessary meetings\n- Provide the right tools and resources\n\n**4. Foster Psychological Safety**\n- Encourage questions and feedback\n- Celebrate failures as learning opportunities\n- Support work-life balance\n\n**5. Continuous Improvement**\n- Regular retrospectives\n- Track metrics and iterate\n- Invest in skill development\n\nRemember: sustainable productivity comes from working smarter, not just harder.",
      citations: [],
    },
  },

  // Python None (code domain)
  {
    keywords: ["python", "return none", "returning none"],
    domain: "code",
    response: {
      answer:
        "A Python function returns `None` when:\n\n**1. No return statement**\n```python\ndef greet(name):\n    print(f\"Hello, {name}\")  # No return\n\nresult = greet(\"Alice\")  # result is None\n```\n\n**2. Empty return**\n```python\ndef process():\n    if condition:\n        return  # Returns None\n```\n\n**3. Explicit return None**\n```python\ndef find_item(lst, target):\n    for item in lst:\n        if item == target:\n            return item\n    return None  # Not found\n```\n\n**4. Not all paths return**\n```python\ndef check(x):\n    if x > 0:\n        return \"positive\"\n    # Missing return for x <= 0!\n```\n\n**Debugging tips:**\n- Add `print()` statements to trace execution\n- Check all code paths return a value\n- Use type hints: `def func() -> str:` to catch issues\n- Verify conditional logic covers all cases",
      citations: ["https://docs.python.org/3/reference/simple_stmts.html#return"],
    },
  },

  // CAP Theorem (technical domain)
  {
    keywords: ["cap theorem", "cap"],
    domain: "technical",
    response: {
      answer:
        "The CAP theorem states that a distributed system can only guarantee two of three properties simultaneously:\n\n**C - Consistency**: Every read receives the most recent write or an error\n\n**A - Availability**: Every request receives a response (success or failure)\n\n**P - Partition Tolerance**: System continues operating despite network failures\n\nSince network partitions are unavoidable in distributed systems, the real choice is between **CP** (consistency over availability) or **AP** (availability over consistency).\n\n**Examples:**\n- **CP Systems** (e.g., MongoDB, HBase): During partition, reject requests to maintain consistency\n- **AP Systems** (e.g., Cassandra, DynamoDB): During partition, serve requests but may return stale data\n\nModern systems often provide tunable consistency, letting developers choose per-operation. The PACELC theorem extends CAP by considering latency vs consistency tradeoffs even without partitions.",
      citations: [],
    },
  },

  // Creative - Haiku (creative domain)
  {
    keywords: ["haiku", "poem", "poetry"],
    domain: "creative",
    response: {
      answer:
        "Here's a haiku about programming:\n\n```\nSilent keystrokes fall\nBugs hide in the logic's depths\nTests bring peace at last\n```\n\nAnd one about debugging:\n\n```\nStack trace whispers clues\nPrint statements light the dark path\nNull was the culprit\n```\n\nOne more, about shipping code:\n\n```\nGreen builds bring joy\nDeploy button waits, patient\nHope floats to production\n```",
      citations: [],
    },
  },

  // ============================================
  // SPECIFICATION DOMAIN - User Story Transformations
  // ============================================

  // Password Reset User Story (specification domain)
  {
    keywords: ["password", "reset", "regain access", "forgot password"],
    domain: "specification",
    response: {
      answer: `# Specification: Password Reset Feature

## API Contracts

### POST /api/v1/auth/password-reset/request
**Purpose**: Initiate password reset flow

**Request Body**:
\`\`\`json
{
  "email": "string (required, valid email format)"
}
\`\`\`

**Responses**:
| Status | Description |
|--------|-------------|
| 200 | Reset email sent (always returns success to prevent email enumeration) |
| 400 | Invalid email format |
| 429 | Too many requests (rate limited) |

**Headers**: \`X-RateLimit-Remaining\`, \`Retry-After\`

---

### POST /api/v1/auth/password-reset/confirm
**Purpose**: Complete password reset with token

**Request Body**:
\`\`\`json
{
  "token": "string (required, from email link)",
  "newPassword": "string (required, min 8 chars, uppercase, lowercase, number)"
}
\`\`\`

**Responses**:
| Status | Description |
|--------|-------------|
| 200 | Password successfully reset |
| 400 | Invalid/expired token or weak password |
| 429 | Too many attempts |

---

## Data Models

### PasswordResetToken
\`\`\`json
{
  "id": "uuid",
  "userId": "uuid (foreign key → User)",
  "tokenHash": "string (bcrypt hash, never store plaintext)",
  "expiresAt": "timestamp (15 minutes from creation)",
  "usedAt": "timestamp | null",
  "createdAt": "timestamp",
  "ipAddress": "string (requester IP for audit)"
}
\`\`\`

### AuditLog Entry
\`\`\`json
{
  "eventType": "PASSWORD_RESET_REQUESTED | PASSWORD_RESET_COMPLETED",
  "userId": "uuid",
  "ipAddress": "string",
  "userAgent": "string",
  "timestamp": "ISO8601"
}
\`\`\`

---

## Acceptance Criteria

1. ✅ User receives reset email within 30 seconds of request
2. ✅ Reset link expires after 15 minutes
3. ✅ Token is single-use (invalidated after successful reset)
4. ✅ Password must meet complexity requirements (8+ chars, mixed case, number)
5. ✅ User is logged out of all active sessions after password change
6. ✅ Audit log captures reset request and completion events
7. ✅ Rate limit: max 5 requests per email per hour

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| **Concurrent reset requests** | Only most recent token is valid; older tokens invalidated |
| **Email not found** | Return 200 anyway (prevent email enumeration attacks) |
| **Token reuse** | Return 400 with "token already used" message |
| **Mid-reset new request** | Invalidate old token, issue new one |
| **Password same as old** | Reject with "cannot reuse previous password" error |
| **Account locked** | Allow reset (unlocks account upon success) |
| **Expired token** | Return 400 with "token expired, request new reset" |

---

## Test Scenarios

| Scenario | Given | When | Then |
|----------|-------|------|------|
| Happy path | Valid user email | Request + confirm with valid token | Password changed, all sessions invalidated |
| Expired token | Token > 15 min old | Confirm reset | 400 error, prompt new request |
| Invalid email format | Malformed email "test@" | Request reset | 400 validation error |
| Rate limiting | 6th request in 1 hour | Request reset | 429 with Retry-After header |
| Weak password | Valid token | Confirm with "password123" | 400 with complexity requirements |
| Token reuse | Previously used token | Confirm reset | 400 "token already used" |
| Non-existent email | fake@example.com | Request reset | 200 (no email sent, no information leaked) |

---

## Security Considerations

- Tokens stored as bcrypt hashes, never plaintext
- Use constant-time comparison for token validation
- Log all reset attempts for fraud detection
- Implement exponential backoff for failed attempts
- Send notification to user's email on successful password change`,
      citations: [
        "https://owasp.org/www-community/Forgot_Password_Cheat_Sheet",
        "https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html",
      ],
    },
  },

  // Shopping Cart User Story (specification domain)
  {
    keywords: ["shopping cart", "add to cart", "cart", "purchase"],
    domain: "specification",
    response: {
      answer: `# Specification: Shopping Cart Feature

## API Contracts

### GET /api/v1/cart
**Purpose**: Retrieve current user's cart

**Response** (200):
\`\`\`json
{
  "id": "uuid",
  "items": [
    {
      "productId": "uuid",
      "name": "Product Name",
      "quantity": 2,
      "unitPrice": 29.99,
      "totalPrice": 59.98
    }
  ],
  "subtotal": 59.98,
  "itemCount": 2,
  "updatedAt": "ISO8601"
}
\`\`\`

---

### POST /api/v1/cart/items
**Purpose**: Add item to cart

**Request Body**:
\`\`\`json
{
  "productId": "uuid (required)",
  "quantity": "integer (required, min: 1, max: 99)"
}
\`\`\`

**Responses**:
| Status | Description |
|--------|-------------|
| 200 | Item added/updated in cart |
| 400 | Invalid product or quantity |
| 404 | Product not found |
| 409 | Insufficient stock |

---

### DELETE /api/v1/cart/items/{productId}
**Purpose**: Remove item from cart

**Responses**:
| Status | Description |
|--------|-------------|
| 204 | Item removed |
| 404 | Item not in cart |

---

## Data Models

### Cart
\`\`\`json
{
  "id": "uuid",
  "userId": "uuid | null (null for guest carts)",
  "sessionId": "string (for guest identification)",
  "items": "CartItem[]",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "expiresAt": "timestamp (30 days for guests)"
}
\`\`\`

### CartItem
\`\`\`json
{
  "productId": "uuid",
  "quantity": "integer",
  "addedAt": "timestamp",
  "priceAtAddition": "decimal (snapshot for price change detection)"
}
\`\`\`

---

## Acceptance Criteria

1. ✅ User can add products to cart without logging in (guest cart)
2. ✅ Cart persists across browser sessions (30 days for guests)
3. ✅ Adding existing item increases quantity instead of duplicating
4. ✅ Cart merges with user account upon login
5. ✅ Stock is validated but not reserved until checkout
6. ✅ Price changes are highlighted if product price changed since addition

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| **Add out-of-stock item** | Return 409 with available quantity |
| **Product discontinued** | Show warning, allow removal only |
| **Price changed** | Show original and new price, prompt acknowledgment |
| **Guest cart + login** | Merge carts, sum quantities, keep lower prices |
| **Quantity exceeds stock** | Cap at available stock with notification |
| **Cart expiration** | Auto-delete after 30 days, email reminder at 25 days |

---

## Test Scenarios

| Scenario | Given | When | Then |
|----------|-------|------|------|
| Add to empty cart | Empty cart | Add product (qty: 1) | Cart has 1 item |
| Increase quantity | Item in cart (qty: 2) | Add same item (qty: 1) | Quantity becomes 3 |
| Remove item | Cart with 2 items | Remove 1 item | Cart has 1 item |
| Guest to user merge | Guest cart with items | User logs in with existing cart | Carts merged |
| Stock check | Item in cart | Stock drops to 0 | Warning shown, checkout blocked |`,
      citations: [],
    },
  },

  // User Registration User Story (specification domain)
  {
    keywords: ["register", "sign up", "create account", "registration"],
    domain: "specification",
    response: {
      answer: `# Specification: User Registration Feature

## API Contracts

### POST /api/v1/auth/register
**Purpose**: Create new user account

**Request Body**:
\`\`\`json
{
  "email": "string (required, valid email, unique)",
  "password": "string (required, min 8 chars, complexity rules)",
  "name": "string (required, 2-100 chars)",
  "acceptedTerms": "boolean (required, must be true)"
}
\`\`\`

**Responses**:
| Status | Description |
|--------|-------------|
| 201 | Account created, verification email sent |
| 400 | Validation error (weak password, invalid email) |
| 409 | Email already registered |
| 429 | Too many registration attempts |

---

### POST /api/v1/auth/verify-email
**Purpose**: Verify email address with token

**Request Body**:
\`\`\`json
{
  "token": "string (from verification email)"
}
\`\`\`

**Responses**:
| Status | Description |
|--------|-------------|
| 200 | Email verified, account activated |
| 400 | Invalid or expired token |

---

## Data Models

### User
\`\`\`json
{
  "id": "uuid",
  "email": "string (unique, indexed)",
  "passwordHash": "string (bcrypt)",
  "name": "string",
  "emailVerified": "boolean (default: false)",
  "emailVerifiedAt": "timestamp | null",
  "acceptedTermsAt": "timestamp",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
\`\`\`

### EmailVerificationToken
\`\`\`json
{
  "id": "uuid",
  "userId": "uuid",
  "tokenHash": "string",
  "expiresAt": "timestamp (24 hours)",
  "usedAt": "timestamp | null"
}
\`\`\`

---

## Acceptance Criteria

1. ✅ User receives verification email within 60 seconds
2. ✅ Password meets complexity requirements
3. ✅ Email uniqueness enforced (case-insensitive)
4. ✅ Terms acceptance is required and timestamped
5. ✅ Unverified accounts can login but have limited access
6. ✅ Verification link expires after 24 hours

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| **Duplicate email** | Return 409, don't reveal if verified or not |
| **Disposable email** | Block known disposable email domains |
| **Resend verification** | Rate limit to 3 per hour, extend expiry |
| **Already verified** | Return 200 with "already verified" message |
| **Login before verify** | Allow login, show verification banner |

---

## Test Scenarios

| Scenario | Given | When | Then |
|----------|-------|------|------|
| Happy path | Valid data | Register + verify | Account active |
| Duplicate email | Email exists | Register | 409 error |
| Weak password | Password "12345678" | Register | 400 with requirements |
| Terms not accepted | acceptedTerms: false | Register | 400 validation error |
| Expired token | Token > 24h old | Verify | 400, prompt resend |`,
      citations: [
        "https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html",
      ],
    },
  },

  // Generic User Story Pattern (specification domain)
  {
    keywords: ["as a", "i want", "so that"],
    domain: "specification",
    response: {
      answer: `# Specification: User Story Analysis

## User Story Breakdown

Your user story has been parsed into structured components. Here's a comprehensive specification template:

---

## API Contracts

### Primary Endpoint
\`\`\`
[METHOD] /api/v1/[resource]
\`\`\`

**Request/Response schemas to be defined based on specific requirements**

---

## Data Models

### Core Entity
\`\`\`json
{
  "id": "uuid",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  // Additional fields based on requirements
}
\`\`\`

---

## Acceptance Criteria

1. ✅ Primary user action is achievable
2. ✅ Error states are handled gracefully
3. ✅ Performance meets SLA requirements
4. ✅ Security considerations addressed
5. ✅ Audit trail maintained

---

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Invalid input | Validation error with specific message |
| Unauthorized access | 401/403 response |
| Resource not found | 404 response |
| Concurrent modifications | Optimistic locking / conflict resolution |
| Rate limiting | 429 response with Retry-After header |

---

## Test Scenarios

| Scenario | Given | When | Then |
|----------|-------|------|------|
| Happy path | Valid preconditions | User performs action | Expected outcome |
| Error case | Invalid input | User performs action | Appropriate error |
| Edge case | Boundary conditions | User performs action | Graceful handling |

---

## Next Steps

To generate a more detailed specification, please provide:
1. Specific user role and permissions
2. Data requirements and relationships
3. Integration points with other systems
4. Performance and scale requirements
5. Security and compliance needs`,
      citations: [],
    },
  },
];

/**
 * Fallback response when no mock matches the prompt
 */
export const FALLBACK_RESPONSE = {
  answer:
    "I can help you with that question. Based on your query, here's what I can tell you:\n\nThis is a demo response from the OPE (Online Prompt Enhancer) system running in mock mode. In production with a real AI model, you would receive a detailed, contextual answer.\n\nThe system has detected and enhanced your prompt, applying domain-specific optimizations and examples to improve the quality of AI responses.\n\nTry asking about: TypeScript, REST APIs, Docker, machine learning, Raft consensus, photosynthesis, or team productivity for pre-configured demo responses.",
  citations: [],
};

/**
 * Find a mock response matching the user prompt
 */
export function findMockResponse(
  userPrompt: string,
): MockEntry["response"] {
  const promptLower = userPrompt.toLowerCase();

  for (const entry of MOCK_DATASET) {
    if (entry.keywords.some((kw) => promptLower.includes(kw.toLowerCase()))) {
      return entry.response;
    }
  }

  return FALLBACK_RESPONSE;
}
