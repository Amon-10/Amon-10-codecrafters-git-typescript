import * as fs from "fs";
import * as zlib from "zlib";
import {createHash} from 'crypto';

const args = process.argv.slice(2);
const command = args[0];

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
    
    // hash gitObject
    const hash = createHash('sha1')
      .update(gitObject) // Input the data that needs hashing
      .digest('hex') // Calculates digest and outs 'hex' format
    
      // Compress content
    const compressedContent = zlib.deflateSync(gitObject);

    // Write hashed content to .git/objects
    // Create paths to input compressed content later
    const hashedDirectoryName = hash.slice(0,2);
    const hashedFileName = hash.slice(2);
    const dirPath = `.git/objects/${hashedDirectoryName}`;
    const filePath = `${dirPath}/${hashedFileName}`;
    
    // Create directories and files
    // input compressed content
    fs.mkdirSync(`${dirPath}`, { recursive: true });
    fs.writeFileSync(filePath, compressedContent);
  
    // Log hash
    console.log(hash);

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

  default:
    throw new Error(`Unknown command ${command}`);
}
