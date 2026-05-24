# Git Internals Implementation — TypeScript

A from-scratch implementation of core Git internals built in TypeScript. No Git libraries used — just raw file I/O, zlib compression, SHA-1 hashing, and binary buffer manipulation.

Built as part of the [CodeCrafters "Build Your Own Git" challenge](https://codecrafters.io/challenges/git).

---

## What's Implemented

### `init`
Initializes a `.git` directory with the standard structure:
```
.git/
  objects/
  refs/
  HEAD
```

### `cat-file`
Reads, decompresses, and prints a Git object from `.git/objects`.
```sh
mygit cat-file -p <sha>
```
Handles zlib decompression and strips the object header (`blob <size>\0`) before printing content.

### `hash-object`
Creates a blob object from a file, hashes it, and writes it to `.git/objects`.
```sh
mygit hash-object -w <file>
```
- Constructs the blob format: `blob <size>\0<content>`
- SHA-1 hashes the result
- Compresses with zlib and writes to `.git/objects/xx/yyyy...`

### `ls-tree`
Parses and prints the entries of a Git tree object.
```sh
mygit ls-tree --name-only <tree_sha>
```
Tree objects are stored in a binary format — each entry is `<mode> <name>\0<20_raw_bytes>`. This implementation manually parses the binary buffer without any helpers.

### `write-tree`
Recursively writes the current working directory as a tree object to `.git/objects`.
```sh
mygit write-tree
```
- Recursively traverses directories, writing subtrees bottom-up
- Creates blob objects for files and tree objects for directories
- Sorts entries correctly (directories sorted with trailing `/`)
- Outputs the root tree SHA

### `commit-tree`
Creates a commit object from a tree SHA, parent commit SHA, and message.
```sh
mygit commit-tree <tree_sha> -p <parent_sha> -m <message>
```
Constructs the full commit object format including tree, parent, author, committer, and message fields, then writes it to `.git/objects`.

---

## Key Concepts

### Git Object Storage
All Git objects are stored in `.git/objects/xx/yyyy...` where `xx` is the first 2 hex characters of the SHA-1 hash and `yyyy...` is the remaining 38. Every object is zlib-compressed before writing.

### Object Formats
| Type | Format |
|------|--------|
| Blob | `blob <size>\0<content>` |
| Tree | `tree <size>\0<mode> <name>\0<20_byte_sha>...` |
| Commit | `commit <size>\0tree <sha>\nparent <sha>\nauthor ...\n\n<message>\n` |

### Binary vs Text
Tree objects store SHA hashes as raw 20 bytes (binary), not as 40-character hex strings. This means you can't just concatenate strings — you have to work with `Buffer` and convert with `Buffer.from(hash, 'hex')`.

Commit objects store SHAs as plain 40-character hex strings (text). No binary conversion needed.

---

## Tech Stack

- **Runtime:** Bun 1.3
- **Language:** TypeScript
- **Libraries:** Node.js built-ins only (`fs`, `zlib`, `crypto`) — no Git libraries

---

## Running Locally

Requires [Bun](https://bun.sh) 1.3+.

**Important:** Run in a separate directory to avoid corrupting this repo's own `.git` folder.

```sh
# Set up an alias
alias mygit=/path/to/this/repo/your_program.sh

# Test in a temp directory
mkdir -p /tmp/testing && cd /tmp/testing
mygit init
echo "hello world" > test.txt
mygit hash-object -w test.txt
mygit write-tree
mygit commit-tree <tree_sha> -p <parent_sha> -m "Initial commit"
```

---

## Project Structure

```
app/
  main.ts       # All command implementations
your_program.sh # Entry point script
```