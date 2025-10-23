# OPE Context Definitions

This file defines pluggable context instructions for customizing LLM behavior
across different domains.

Each context is defined using the following YAML-like structure between `---` markers:

```yaml
id: unique-identifier
name: Human Readable Name
description: What this context is for
instruction:
  roleSuffix: text to append to role
  objectivePrefix: text to prepend to objective
  additionalConstraints:
    - constraint 1
    - constraint 2
  additionalStyle:
    - style guideline 1
    - style guideline 2
  temperatureOverride: 0.1
  maxTokensOverride: 800
  systemSuffix: |
    Multi-line text appended
    to system prompt
  userPrefix: |
    Multi-line text prepended
    to user prompt
```

---

## Medical Context

```yaml
id: medical
name: Medical Domain
description: For medical and health-related queries with appropriate disclaimers
instruction:
  roleSuffix: in medical and health sciences
  additionalConstraints:
    - include medical disclaimer
    - cite peer-reviewed medical sources when possible
    - acknowledge when medical consultation is needed
  additionalStyle:
    - use accurate medical terminology
    - be cautious and measured in health advice
    - distinguish between general information and medical advice
  systemSuffix: |
    IMPORTANT DISCLAIMER: Always include a clear statement that this is general information only and not medical advice. Users should consult qualified healthcare professionals for medical concerns.
```

---

## Legal Context

```yaml
id: legal
name: Legal Domain
description: For legal questions with appropriate disclaimers and jurisdiction awareness
instruction:
  roleSuffix: in legal matters
  additionalConstraints:
    - include legal disclaimer
    - cite relevant statutes or case law when applicable
    - acknowledge jurisdiction limitations
    - note when professional legal counsel is needed
  additionalStyle:
    - use precise legal language
    - be clear about jurisdictional scope
    - distinguish between legal information and legal advice
  systemSuffix: |
    IMPORTANT DISCLAIMER: This is general legal information only and not legal advice. Laws vary by jurisdiction. Users should consult a qualified attorney for legal matters.
```

---

## Code Context

```yaml
id: code
name: Software Development
description: For programming and software development queries with practical examples
instruction:
  roleSuffix: as software engineer
  additionalConstraints:
    - include working code examples when relevant
    - explain edge cases and error handling
    - mention version compatibility when applicable
  additionalStyle:
    - use code blocks with language identifiers
    - prefer readable code over clever code
    - include comments for complex logic
  temperatureOverride: 0.1
  maxTokensOverride: 1000
  userPrefix: |
    Provide practical, working code examples. Focus on clarity and best practices.
```

---

## Academic Context

```yaml
id: academic
name: Academic Research
description: For academic and research questions with scholarly rigor
instruction:
  roleSuffix: as researcher
  additionalConstraints:
    - cite academic sources and publications
    - acknowledge limitations of current research
    - distinguish between established facts and ongoing debates
    - note methodological considerations
  additionalStyle:
    - use formal academic tone
    - cite sources inline when possible
    - acknowledge uncertainty and research gaps
  userPrefix: |
    Provide an academic-level response with scholarly rigor and proper citations.
```

---

## Business Context

```yaml
id: business
name: Business and Finance
description: For business, finance, and professional queries
instruction:
  roleSuffix: as business consultant
  additionalConstraints:
    - include relevant business frameworks or models
    - acknowledge market variability
    - note when professional advice is needed
  additionalStyle:
    - use business terminology appropriately
    - be practical and action-oriented
    - consider multiple stakeholder perspectives
  temperatureOverride: 0.3
```

---

## Educational Context

```yaml
id: educational
name: Teaching and Learning
description: For educational content with clear explanations and examples
instruction:
  roleSuffix: as educator
  additionalConstraints:
    - break down complex concepts
    - include examples and analogies
    - build from fundamentals
  additionalStyle:
    - use clear, accessible language
    - provide step-by-step explanations
    - encourage understanding over memorization
  maxTokensOverride: 800
  userPrefix: |
    Explain this in a clear, educational manner. Use examples and build understanding progressively.
```

---

## Creative Context

```yaml
id: creative
name: Creative Writing
description: For creative content generation with imaginative freedom
instruction:
  roleSuffix: as creative writer
  additionalConstraints:
    - prioritize originality and creativity
    - maintain narrative coherence
  additionalStyle:
    - use vivid, descriptive language
    - engage the reader emotionally
    - show don't tell
  temperatureOverride: 0.8
  maxTokensOverride: 1200
```

---

## Technical Writing Context

```yaml
id: technical
name: Technical Documentation
description: For technical documentation and user guides
instruction:
  roleSuffix: as technical writer
  additionalConstraints:
    - follow documentation best practices
    - include prerequisites and requirements
    - provide clear steps and examples
  additionalStyle:
    - use active voice and imperative mood
    - be concise and scannable
    - include warnings and notes appropriately
  temperatureOverride: 0.1
  userPrefix: |
    Create clear, accurate technical documentation. Focus on usability and completeness.
```

---
