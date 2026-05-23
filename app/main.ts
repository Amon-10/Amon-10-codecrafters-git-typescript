import * as fs from "fs";
import * as zlib from "zlib";
import {createHash} from 'crypto';

const args = process.argv.slice(2);
const command = args[0];

// return blob
const fileBlob = (filePath: string): {mode: string, name: string, hash: string} => {
  const file = fs.readFileSync(`${filePath}`);          // Read file content
  const header = Buffer.from(`blob ${file.length}\0`);    // Create header
  const gitObject = Buffer.concat([header, file]);        // Join fileContent and header

  // write to .git/objects
  // hash
  const hash = writeToGitObjects(gitObject);
  
  const lastSlashIndex = filePath.lastIndexOf("/");
  const fileName = filePath.slice(lastSlashIndex + 1);

  return {mode: "100644", name: `${fileName}`, hash : `${hash}`};
}

// Write to .git/objects
// Call hash function to hash gitObject and return hash
function writeToGitObjects(gitObject: Buffer) {
  // call hash
  const objectHash: string = hash(gitObject);

  // Compress content
  const compressedContent = zlib.deflateSync(gitObject);

  // Write hashed content to .git/objects
  // Create paths to input compressed content later
  const hashedDirectoryName = objectHash.slice(0,2);
  const hashedFileName = objectHash.slice(2);
  const dirPath = `.git/objects/${hashedDirectoryName}`;
  const filePath = `${dirPath}/${hashedFileName}`;
  
  // Create directories and files
  // input compressed content
  fs.mkdirSync(`${dirPath}`, { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, compressedContent);
  }

  return objectHash;
}

function hash(gitObject: Buffer) {
  // hash gitObject
  const hash = createHash('sha1')
    .update(gitObject) // Input the data that needs hashing
    .digest('hex') // Calculates digest and outs 'hex' format
  
  return hash;
}

switch (command) {
  case "init":
    // You can use print statements as follows for debugging, they'll be visible when running tests.
    console.error("Logs from your program will appear here!");

    // TODO: Uncomment the code below to pass the first stage
    fs.mkdirSync(".git", { recursive: true });
    fs.mkdirSync(".git/objects", { recursive: true });
    fs.mkdirSync(".git/refs", { recursive: true });
    fs.writeFileSync(".git/HEAD", "ref: refs/heads/main\n");
    console.log("Initialized git directory");
    break;
  
  case "cat-file":
    const directory = args[2].slice(0,2);
    const fileName =  args[2].slice(2); 
    
    try {
      // Read blob 
      const content = fs.readFileSync(`.git/objects/${directory}/${fileName}`);

      // Decompress
      // Use .unzipSync when unsure whether header is zlib(buffer) or gzlib(.gz)
      const decompressContent = zlib.unzipSync(content); // we could've used .inflateSync since we are dealing with zlib(buffer)

      // Extract content
      // ignore header(blob <size>\0)
      const realContent = decompressContent.toString().split("\0")[1];
      process.stdout.write(realContent);
      //console.log(decompressContent);
    } catch (err) {
      console.error("Error reading and decompressing blob");
    }

    break;
  
  case "hash-object":
    // Read file content
    const fileContent = fs.readFileSync(args[2]); // buffer
    
    // Create header
    // Prepend \0
    const header = Buffer.from(`blob ${fileContent.length}\0`);
    
    // Join fileContent and header
    const gitObject = Buffer.concat([header, fileContent]);
    
    // Log hash
    console.log(writeToGitObjects(gitObject));
    

    break;
  
  case "ls-tree":
    // Copy directory name and file name from the sha in the command for reading tree object
    const treeDirectory = args[2].slice(0,2);
    const treeFileName = args[2].slice(2);
    
    // Read tree object
    // Decompress tree object
    const compressedtreeObject = fs.readFileSync(`.git/objects/${treeDirectory}/${treeFileName}`);
    const decompressedTreeObject = zlib.inflateSync(compressedtreeObject);
    const nullByteIndex = decompressedTreeObject.indexOf("\0");
    const treeObject = decompressedTreeObject.slice(nullByteIndex + 1); // buffer, no header, just content
    
    // <mode> <name>\0<20_byte_sha>
    // 040000 <dir1>\0<e90864e4ade8aca554f0aa5a3c7398f72a16c2b3>
    
    let byte_shaEndIndex = 0;
    
    while( byte_shaEndIndex < treeObject.length) {
      // Find mode
      let spaceIndex = treeObject.indexOf(" ", byte_shaEndIndex); // the index of space
      let mode = treeObject.slice(byte_shaEndIndex, spaceIndex); // mode: from byte_shaEndIndex to space(' ')
    
      // Find Object file or directory name
      let nullIndex = treeObject.indexOf("\0", spaceIndex); // Find index of null
      let objectFileName = treeObject.slice(spaceIndex + 1, nullIndex); // Name: from space + 1 to \0
    
      // Find file or directory sha
      let sha_start = nullIndex + 1;
      byte_shaEndIndex = nullIndex + 21; 
      let byte_sha = treeObject.slice(sha_start, byte_shaEndIndex);
      
      // convert sha raw bytes to hex string
      let hexString = Buffer.from(byte_sha).toString('hex'); // not required when codecafters submit

      //console.log(`${mode} ${hexString} ${objectFileName}`);
      console.log(`${objectFileName}`);
    }

    break;
  
  case "write-tree":
    function writeTree(dirPath: string): any {
      const items = fs
        .readdirSync(dirPath)
        .filter((itemName: string) => itemName !== ".git")
        .sort();

      const entries = items.map((item) => {
        const fullPath = `${dirPath}/${item}`;
        const stat = fs.statSync(`${fullPath}`);

        if(stat.isDirectory()) {
          let lastSlashIndex = fullPath.lastIndexOf("/");
          let dirName = fullPath.slice(lastSlashIndex + 1);
          const dirTreeSha = writeTree(fullPath);
          let dirEntry = {mode: "40000", name: `${dirName}`, hash: dirTreeSha};
          
          return dirEntry;
        } 
        else {
          return fileBlob(fullPath);
        }
      });

      const entryBuffers = entries.map((entry) => {
        const hashBytes = Buffer.from(entry.hash, 'hex');
        const entryBuffer = Buffer.concat([Buffer.from(`${entry.mode} ${entry.name}\0`), hashBytes])

        return entryBuffer;
      });

      const treeContent = Buffer.concat(entryBuffers);
      const treeHeader = Buffer.from(`tree ${treeContent.length}\0`);
      const treeObject = Buffer.concat([treeHeader, treeContent]);
      
      return writeToGitObjects(treeObject);
    }

    console.log(writeTree('.'));
    break;

    // format = commit-tree <tree_sha> -p <commit_sha> -m <message>
    case "commit-tree":
      const tree_sha = args[1];
      const parent_commit_sha = args[3];
      const message = args[5];
      const commitContentString = Buffer.from(`tree ${tree_sha}\nparent ${parent_commit_sha}\nauthor Jane <JaneDoe@email.com> 1234567890 +0000\ncommitter Jane <JaneDoe@email.com> 1234567890 +0000\n\n${message}\n`);
      const commitContentStringLength = commitContentString.length;
      const commitContentHeader = Buffer.from(`commit ${commitContentStringLength}\0`);
      const commitContent = Buffer.concat([commitContentHeader, commitContentString]);

      console.log(writeToGitObjects(commitContent));

      break;

  default:
    throw new Error(`Unknown command ${command}`);
}
