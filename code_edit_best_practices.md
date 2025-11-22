---
description: Best practices for editing code to avoid common errors like accidental deletion or matching failures.
---

# Code Editing Best Practices

This workflow outlines the rules for modifying files to ensure precision and prevent data loss.

## 1. The "Surgical Strike" Principle (Anti-Greedy Matching)

**Rule**: Never include large blocks of unchanged context in your `TargetContent`.

*   **Bad**: Including a 50-line table just to change one row inside it.
*   **Good**: Match ONLY the specific line(s) you want to change, plus 1-2 lines of context if necessary for uniqueness.
*   **Why**: Large context blocks are fragile. A single hidden whitespace difference will cause the match to fail, or worse, a partial match might lead to accidental deletion of the non-matched part.

## 2. Use `multi_replace_file_content` for Dispersed Edits

**Rule**: If you need to change Line 10 and Line 100, DO NOT try to replace Lines 10-100 with a single block.

*   **Action**: Use `multi_replace_file_content` with two separate `ReplacementChunks`.
*   **Chunk 1**: Targets Line 10.
*   **Chunk 2**: Targets Line 100.
*   **Benefit**: The content between Line 10 and 100 remains completely untouched and safe.

## 3. Verify Before You Strike

**Rule**: Always read the file (`view_file`) immediately before editing to ensure you have the latest version and correct line numbers.

## 4. Handling "Missing" Files or Directories

**Rule**: If a tool fails because a directory doesn't exist (e.g., `.agent/workflows`), create it first.


## 5. Recovery Protocol

**Rule**: If an edit results in data loss (file size drops unexpectedly), IMMEDIATELY restore the file using `write_to_file` with the full content from your last successful read, then analyze why the edit failed.

## 6. Google Antigravity AI Specific Practices

### 6.1 The TargetContent Precision Rule

**Critical Rule**: `TargetContent` must match the file content **EXACTLY** - including every space, tab, and line ending.

*   **Problem**: When `TargetContent` doesn't match exactly, the tool will "do its best" to apply changes, often resulting in massive unintended deletions.
*   **Solution**: 
    1. Use `view_file` to see the exact content (with line numbers)
    2. Copy the content **character-for-character** including all whitespace
    3. Pay special attention to `\r\n` (Windows) vs `\n` (Unix) line endings
    4. When in doubt, use `multi_replace_file_content` with smaller chunks

### 6.2 Small, Iterative Changes

**Rule**: Break complex changes into multiple small, testable steps.

*   **Bad**: Trying to refactor an entire file in one edit
*   **Good**: 
    1. First edit: Add CSS file reference (1 line change)
    2. Test and verify
    3. Second edit: Fix HTML structure (5 line change)
    4. Test and verify
*   **Why**: Easier to debug, easier to rollback, less risk of catastrophic failure

### 6.3 Use Git as Safety Net

**Rule**: Before attempting risky edits, verify Git status and be ready to rollback.

*   **Before editing**: Run `git status` to see current changes
*   **After failed edit**: Run `git diff` to see what broke
*   **Quick recovery**: Use `git checkout HEAD -- <file>` to restore
*   **Commit frequently**: Each successful change should be committed

### 6.4 Prefer `multi_replace_file_content` Over `replace_file_content`

**Rule**: When making multiple changes to the same file, always use `multi_replace_file_content`.

*   **Advantages**:
    - Each chunk is independent
    - Smaller TargetContent = less chance of mismatch
    - Unchanged content between chunks is guaranteed safe
*   **Example**: See Step 290 in this session for successful usage

### 6.5 Review Code Diffs Before Applying

**Rule**: Always check the diff output after an edit to verify it did what you intended.

*   **Action**: After any file edit, immediately run `git diff <file>` or use `view_file` to verify
*   **Red flags**: 
    - File size decreased significantly
    - More lines deleted than expected
    - Structural elements (closing tags, braces) missing
*   **Response**: If diff looks wrong, immediately rollback and analyze

### 6.6 Avoid Editing When Uncertain

**Rule**: If you're not 100% sure about the exact content or structure, DON'T edit.

*   **Instead**:
    1. Ask the user to manually make the change
    2. Provide exact instructions with line numbers
    3. Wait for user confirmation before proceeding
*   **Why**: One bad edit can waste hours in a rollback loop

### 6.7 The "Death Loop" Prevention

**Rule**: If you've rolled back the same file 3+ times, STOP and change strategy.

*   **Symptoms**: 
    - Repeatedly fixing the same issue
    - Each fix breaks something else
    - Constant rollbacks to Git HEAD
*   **Solution**:
    1. Stop all editing attempts
    2. Clearly document what needs to change
    3. Ask user to make the change manually
    4. OR use a completely different approach (e.g., create new file instead of editing)

## 7. Lessons from Real Failures

### Case Study: index.html Sheet Selection Bug (2025-11-22)

**Problem**: Needed to change lines 119-124 in a 330-line file.

**Failed Attempts**: 
- Used `replace_file_content` with imprecise TargetContent
- Tool "did its best" and deleted 200+ lines
- Rolled back and tried again 5+ times
- Each attempt had the same failure

**Successful Solution**:
- Used `multi_replace_file_content` with TWO small chunks:
  - Chunk 1: Lines 10-10 (add CSS reference)
  - Chunk 2: Lines 119-124 (fix HTML structure)
- Each chunk had minimal, precise TargetContent
- Success on first try

**Key Lesson**: When `replace_file_content` fails repeatedly, switch to `multi_replace_file_content` with smaller chunks.
